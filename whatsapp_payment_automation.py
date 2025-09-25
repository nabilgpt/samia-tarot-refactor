"""
M41 WhatsApp Payment Links Automation
Stripe Payment Links + WhatsApp follow-up with 24h-aware templates
Automated reminders, retry logic, and success confirmations
"""

import os
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import stripe
from db import db_exec, db_fetch_one, db_fetch_all
from whatsapp_service import whatsapp_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class FlowStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class FlowType(Enum):
    PAYMENT_REMINDER = "payment_reminder"
    PAYMENT_FOLLOW_UP = "payment_follow_up"
    ORDER_UPDATE = "order_update"

@dataclass
class PaymentLinkData:
    amount: int  # in cents
    currency: str
    description: str
    customer_name: str
    customer_phone: str
    order_id: Optional[str] = None
    customer_email: Optional[str] = None
    metadata: Optional[Dict] = None

class WhatsAppPaymentAutomation:
    def __init__(self):
        self.base_url = os.getenv("BASE_URL", "https://samiatarot.com")

    def create_payment_link(self, payment_data: PaymentLinkData) -> Tuple[bool, str, Optional[str]]:
        """Create Stripe Payment Link with WhatsApp automation metadata"""
        try:
            # Normalize phone number
            phone_e164 = whatsapp_service.normalize_phone_e164(payment_data.customer_phone)
            if not phone_e164:
                return False, "Invalid phone number format", None

            # Create Stripe Payment Link
            payment_link = stripe.PaymentLink.create(
                line_items=[{
                    'price_data': {
                        'currency': payment_data.currency,
                        'product_data': {
                            'name': payment_data.description,
                        },
                        'unit_amount': payment_data.amount,
                    },
                    'quantity': 1,
                }],
                metadata={
                    'customer_name': payment_data.customer_name,
                    'customer_phone': phone_e164,
                    'order_id': payment_data.order_id or '',
                    'whatsapp_automation': 'true',
                    **(payment_data.metadata or {})
                },
                after_completion={
                    'type': 'redirect',
                    'redirect': {
                        'url': f"{self.base_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
                    }
                },
                allow_promotion_codes=True,
                billing_address_collection='auto',
                shipping_address_collection={
                    'allowed_countries': ['US', 'CA', 'GB', 'AU', 'LB', 'AE']
                } if payment_data.order_id else None
            )

            # Create automation flow
            flow_id = self._create_automation_flow(
                phone_e164=phone_e164,
                flow_type=FlowType.PAYMENT_REMINDER.value,
                trigger_data={
                    'payment_link_id': payment_link.id,
                    'payment_link_url': payment_link.url,
                    'amount': payment_data.amount,
                    'currency': payment_data.currency,
                    'customer_name': payment_data.customer_name,
                    'description': payment_data.description,
                    'order_id': payment_data.order_id
                }
            )

            if flow_id:
                # Schedule initial reminder (immediate if within 24h, template if outside)
                self._schedule_payment_reminder(flow_id, phone_e164, payment_data, payment_link.url)

                logger.info(f"Created payment link {payment_link.id} with automation flow {flow_id}")
                return True, "Payment link created with automation", payment_link.url

            return True, "Payment link created without automation", payment_link.url

        except Exception as e:
            logger.error(f"Error creating payment link: {e}")
            return False, str(e), None

    def _create_automation_flow(self, phone_e164: str, flow_type: str,
                               trigger_data: Dict) -> Optional[int]:
        """Create automation flow record"""
        try:
            # Get profile if exists
            profile = whatsapp_service.get_profile_by_phone(phone_e164)
            profile_id = profile['id'] if profile else None

            # Create flow
            result = db_exec("""
                INSERT INTO wa_automation_flows (
                    phone_e164, profile_id, flow_type, trigger_data,
                    current_step, next_action_at, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                phone_e164,
                profile_id,
                flow_type,
                json.dumps(trigger_data),
                'initial',
                datetime.utcnow() + timedelta(minutes=5),  # First action in 5 minutes
                profile_id or 'system'
            ))

            return result[0]['id'] if result else None

        except Exception as e:
            logger.error(f"Error creating automation flow: {e}")
            return None

    def _schedule_payment_reminder(self, flow_id: int, phone_e164: str,
                                 payment_data: PaymentLinkData, payment_url: str):
        """Schedule initial payment reminder"""
        try:
            # Check if within 24h window
            can_send_freeform = whatsapp_service.can_send_freeform(phone_e164)

            if can_send_freeform:
                # Send free-form message
                message = f"Hi {payment_data.customer_name}! Your payment link is ready: {payment_url}"
                success, result = whatsapp_service.send_freeform_message(phone_e164, message)

                if success:
                    self._update_flow_step(flow_id, 'initial_sent', 'waiting_payment')
                else:
                    logger.error(f"Failed to send initial reminder: {result}")

            else:
                # Send template message
                success, result = whatsapp_service.send_template_message(
                    phone_e164=phone_e164,
                    template_name='PAYMENT_REMINDER',
                    parameters=[
                        payment_data.customer_name,
                        f"{payment_data.currency.upper()} {payment_data.amount/100:.2f}",
                        payment_data.order_id or 'N/A',
                        payment_url
                    ]
                )

                if success:
                    self._update_flow_step(flow_id, 'template_sent', 'waiting_payment')
                else:
                    logger.error(f"Failed to send template reminder: {result}")

        except Exception as e:
            logger.error(f"Error scheduling payment reminder: {e}")

    def _update_flow_step(self, flow_id: int, completed_step: str, next_step: str,
                         next_action_delay_hours: int = 24):
        """Update automation flow step"""
        try:
            # Get current steps
            flow = db_fetch_one("SELECT steps_completed FROM wa_automation_flows WHERE id = %s", (flow_id,))
            if not flow:
                return

            steps_completed = json.loads(flow['steps_completed']) if flow['steps_completed'] else []
            steps_completed.append({
                'step': completed_step,
                'completed_at': datetime.utcnow().isoformat()
            })

            # Update flow
            db_exec("""
                UPDATE wa_automation_flows
                SET current_step = %s,
                    steps_completed = %s,
                    next_action_at = %s,
                    updated_at = %s
                WHERE id = %s
            """, (
                next_step,
                json.dumps(steps_completed),
                datetime.utcnow() + timedelta(hours=next_action_delay_hours),
                datetime.utcnow(),
                flow_id
            ))

        except Exception as e:
            logger.error(f"Error updating flow step: {e}")

    def process_stripe_webhook(self, event: Dict) -> Tuple[bool, str]:
        """Process Stripe webhook events for payment automation"""
        try:
            event_type = event.get('type')

            if event_type == 'checkout.session.completed':
                return self._handle_payment_success(event['data']['object'])
            elif event_type == 'checkout.session.expired':
                return self._handle_payment_expired(event['data']['object'])
            else:
                return True, f"Ignored event type: {event_type}"

        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {e}")
            return False, str(e)

    def _handle_payment_success(self, session: Dict) -> Tuple[bool, str]:
        """Handle successful payment completion"""
        try:
            # Get payment link metadata
            payment_link_id = session.get('payment_link')
            if not payment_link_id:
                return True, "No payment link in session"

            # Get payment link details
            payment_link = stripe.PaymentLink.retrieve(payment_link_id)
            metadata = payment_link.metadata

            if not metadata.get('whatsapp_automation'):
                return True, "WhatsApp automation not enabled"

            phone_e164 = metadata.get('customer_phone')
            customer_name = metadata.get('customer_name')
            order_id = metadata.get('order_id')

            if not phone_e164:
                return False, "No phone number in metadata"

            # Generate invoice signed URL (from M37)
            invoice_url = self._generate_invoice_url(session.get('id'), order_id)

            # Send success template
            success, result = whatsapp_service.send_template_message(
                phone_e164=phone_e164,
                template_name='PAYMENT_SUCCESS',
                parameters=[
                    customer_name or 'Valued Customer',
                    f"{session.get('currency', 'USD').upper()} {session.get('amount_total', 0)/100:.2f}",
                    invoice_url or f"{self.base_url}/invoice/{session.get('id')}"
                ]
            )

            if success:
                # Complete automation flow
                self._complete_flow_by_trigger_data('payment_link_id', payment_link_id)
                logger.info(f"Sent payment success message to {phone_e164}")
                return True, "Payment success notification sent"
            else:
                logger.error(f"Failed to send success notification: {result}")
                return False, f"Failed to send notification: {result}"

        except Exception as e:
            logger.error(f"Error handling payment success: {e}")
            return False, str(e)

    def _handle_payment_expired(self, session: Dict) -> Tuple[bool, str]:
        """Handle expired payment session"""
        try:
            # Mark flow as failed
            payment_link_id = session.get('payment_link')
            if payment_link_id:
                self._fail_flow_by_trigger_data('payment_link_id', payment_link_id)

            return True, "Payment session expired, flow marked as failed"

        except Exception as e:
            logger.error(f"Error handling payment expired: {e}")
            return False, str(e)

    def _generate_invoice_url(self, session_id: str, order_id: Optional[str]) -> Optional[str]:
        """Generate signed URL for invoice (using M37 service)"""
        try:
            # This would integrate with your M37 invoice service
            # For now, return a simple URL
            return f"{self.base_url}/api/invoice/download/{session_id}?signed=true"

        except Exception as e:
            logger.error(f"Error generating invoice URL: {e}")
            return None

    def _complete_flow_by_trigger_data(self, key: str, value: str):
        """Complete automation flow by trigger data key"""
        try:
            db_exec("""
                UPDATE wa_automation_flows
                SET status = %s, updated_at = %s
                WHERE trigger_data->%s = %s AND status = 'active'
            """, (FlowStatus.COMPLETED.value, datetime.utcnow(), key, f'"{value}"'))

        except Exception as e:
            logger.error(f"Error completing flow: {e}")

    def _fail_flow_by_trigger_data(self, key: str, value: str):
        """Fail automation flow by trigger data key"""
        try:
            db_exec("""
                UPDATE wa_automation_flows
                SET status = %s, updated_at = %s
                WHERE trigger_data->%s = %s AND status = 'active'
            """, (FlowStatus.FAILED.value, datetime.utcnow(), key, f'"{value}"'))

        except Exception as e:
            logger.error(f"Error failing flow: {e}")

    def process_pending_flows(self, batch_size: int = 20) -> Dict:
        """Process pending automation flows"""
        try:
            # Get flows ready for next action
            flows = db_fetch_all("""
                SELECT * FROM wa_automation_flows
                WHERE status = 'active'
                AND next_action_at <= %s
                ORDER BY next_action_at ASC
                LIMIT %s
            """, (datetime.utcnow(), batch_size))

            processed = 0
            successful = 0
            failed = 0

            for flow in flows:
                processed += 1
                success = self._process_single_flow(flow)
                if success:
                    successful += 1
                else:
                    failed += 1

            return {
                "processed": processed,
                "successful": successful,
                "failed": failed,
                "message": f"Processed {processed} automation flows"
            }

        except Exception as e:
            logger.error(f"Error processing pending flows: {e}")
            return {"error": str(e)}

    def _process_single_flow(self, flow: Dict) -> bool:
        """Process a single automation flow"""
        try:
            flow_id = flow['id']
            flow_type = flow['flow_type']
            current_step = flow['current_step']
            phone_e164 = flow['phone_e164']
            trigger_data = json.loads(flow['trigger_data']) if flow['trigger_data'] else {}

            if flow_type == FlowType.PAYMENT_REMINDER.value:
                return self._process_payment_reminder_flow(flow_id, current_step, phone_e164, trigger_data)
            else:
                logger.warning(f"Unknown flow type: {flow_type}")
                return False

        except Exception as e:
            logger.error(f"Error processing single flow {flow.get('id')}: {e}")
            return False

    def _process_payment_reminder_flow(self, flow_id: int, current_step: str,
                                     phone_e164: str, trigger_data: Dict) -> bool:
        """Process payment reminder flow steps"""
        try:
            if current_step == 'waiting_payment':
                # Send retry reminder
                success, result = whatsapp_service.send_template_message(
                    phone_e164=phone_e164,
                    template_name='PAYMENT_RETRY',
                    parameters=[
                        trigger_data.get('customer_name', 'Valued Customer'),
                        f"{trigger_data.get('currency', 'USD').upper()} {trigger_data.get('amount', 0)/100:.2f}",
                        trigger_data.get('payment_link_url', '')
                    ]
                )

                if success:
                    self._update_flow_step(flow_id, 'retry_sent', 'final_wait', 48)  # Wait 48h for final attempt
                    return True
                else:
                    logger.error(f"Failed to send retry reminder: {result}")
                    return False

            elif current_step == 'final_wait':
                # Final attempt or mark as failed
                self._fail_flow_by_trigger_data('payment_link_id', trigger_data.get('payment_link_id', ''))
                logger.info(f"Payment reminder flow {flow_id} marked as failed after final wait")
                return True

            return False

        except Exception as e:
            logger.error(f"Error processing payment reminder flow: {e}")
            return False

    def get_flow_metrics(self) -> Dict:
        """Get automation flow metrics"""
        try:
            # Flow counts by status
            status_counts = db_fetch_all("""
                SELECT status, COUNT(*) as count
                FROM wa_automation_flows
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY status
            """)

            # Flow types
            type_counts = db_fetch_all("""
                SELECT flow_type, COUNT(*) as count
                FROM wa_automation_flows
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY flow_type
            """)

            # Success rate
            success_rate = db_fetch_one("""
                SELECT
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::float /
                    COUNT(*)::float * 100 as success_rate
                FROM wa_automation_flows
                WHERE created_at > NOW() - INTERVAL '7 days'
                AND status IN ('completed', 'failed')
            """)

            return {
                "status_counts": {row['status']: row['count'] for row in status_counts},
                "type_counts": {row['flow_type']: row['count'] for row in type_counts},
                "success_rate": success_rate['success_rate'] if success_rate else 0,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting flow metrics: {e}")
            return {"error": str(e)}

# Global payment automation instance
payment_automation = WhatsAppPaymentAutomation()

def run_payment_automation_daemon():
    """Run payment automation processor as daemon"""
    logger.info("Starting WhatsApp Payment Automation daemon")

    while True:
        try:
            # Process pending flows
            result = payment_automation.process_pending_flows(batch_size=20)

            if result.get('processed', 0) > 0:
                logger.info(f"Automation batch complete: {result}")

            # Wait before next batch
            time.sleep(30)  # Check every 30 seconds

        except KeyboardInterrupt:
            logger.info("Payment automation stopped by user")
            break
        except Exception as e:
            logger.error(f"Payment automation error: {e}")
            time.sleep(60)  # Wait longer on error

if __name__ == "__main__":
    run_payment_automation_daemon()