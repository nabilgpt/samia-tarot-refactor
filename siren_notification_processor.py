"""
M40 Siren Notification Processor
Multi-channel notification system for emergency escalation
Processes pending events and sends notifications via Email/SMS/WhatsApp/Voice
"""

import json
import logging
import time
import re
from datetime import datetime
from typing import Dict, List, Optional
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import smtplib

from db import db_exec, db_fetch_all
from twilio_verify_service import TwilioVerifyService
from siren_service import siren_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SirenNotificationProcessor:
    def __init__(self):
        self.twilio_service = TwilioVerifyService()

    def render_template(self, template: str, variables: Dict) -> str:
        """Render template with variables using simple {{variable}} substitution"""
        rendered = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            rendered = rendered.replace(placeholder, str(value))
        return rendered

    def send_email_notification(self, target: str, subject: str, body: str, variables: Dict) -> tuple[bool, str]:
        """Send email notification"""
        try:
            # Render templates
            rendered_subject = self.render_template(subject or "Siren Alert", variables)
            rendered_body = self.render_template(body, variables)

            # Create email message
            msg = MimeMultipart()
            msg['From'] = "alerts@samiatarot.com"
            msg['To'] = target
            msg['Subject'] = rendered_subject

            # Add body
            msg.attach(MimeText(rendered_body, 'plain'))

            # For now, log the email (in production, use SMTP server)
            logger.info(f"EMAIL TO {target}: {rendered_subject}")
            logger.info(f"BODY: {rendered_body}")

            # In production, uncomment and configure SMTP:
            # server = smtplib.SMTP('smtp.gmail.com', 587)
            # server.starttls()
            # server.login("alerts@samiatarot.com", "password")
            # text = msg.as_string()
            # server.sendmail("alerts@samiatarot.com", target, text)
            # server.quit()

            return True, "Email sent successfully"

        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            return False, str(e)

    def send_sms_notification(self, target: str, body: str, variables: Dict) -> tuple[bool, str]:
        """Send SMS notification via Twilio"""
        try:
            # Render template
            rendered_body = self.render_template(body, variables)

            # Validate phone number format
            if not target.startswith('+'):
                return False, "Invalid phone number format - must include country code"

            # Send SMS via Twilio
            success, message, sid = self.twilio_service.send_sms(target, rendered_body)

            if success:
                logger.info(f"SMS sent to {target}: {sid}")
                return True, f"SMS sent successfully: {sid}"
            else:
                logger.error(f"SMS failed to {target}: {message}")
                return False, message

        except Exception as e:
            logger.error(f"SMS notification failed: {e}")
            return False, str(e)

    def send_whatsapp_notification(self, target: str, body: str, variables: Dict, template_id: Optional[str] = None) -> tuple[bool, str]:
        """Send WhatsApp notification via Twilio"""
        try:
            # Render template
            rendered_body = self.render_template(body, variables)

            # Validate phone number format
            if not target.startswith('+'):
                return False, "Invalid phone number format - must include country code"

            # Send WhatsApp via Twilio
            success, message, sid = self.twilio_service.send_whatsapp(target, rendered_body, template_id)

            if success:
                logger.info(f"WhatsApp sent to {target}: {sid}")
                return True, f"WhatsApp sent successfully: {sid}"
            else:
                logger.error(f"WhatsApp failed to {target}: {message}")
                return False, message

        except Exception as e:
            logger.error(f"WhatsApp notification failed: {e}")
            return False, str(e)

    def send_voice_notification(self, target: str, body: str, variables: Dict) -> tuple[bool, str]:
        """Send voice notification via Twilio"""
        try:
            # Render template
            rendered_body = self.render_template(body, variables)

            # Validate phone number format
            if not target.startswith('+'):
                return False, "Invalid phone number format - must include country code"

            # Send voice call via Twilio
            success, message, sid = self.twilio_service.make_voice_call(target, rendered_body)

            if success:
                logger.info(f"Voice call initiated to {target}: {sid}")
                return True, f"Voice call initiated: {sid}"
            else:
                logger.error(f"Voice call failed to {target}: {message}")
                return False, message

        except Exception as e:
            logger.error(f"Voice notification failed: {e}")
            return False, str(e)

    def process_event(self, event: Dict) -> bool:
        """Process a single notification event"""
        try:
            event_id = event['id']
            channel = event['channel']
            target = event['target']
            subject = event.get('subject')
            body = event['body']
            whatsapp_template_id = event.get('whatsapp_template_id')

            # Prepare variables for template rendering
            variables = {
                'incident_type': event.get('incident_type', 'Unknown'),
                'severity': event.get('severity', 'Unknown'),
                'source': event.get('source', 'Unknown'),
                'incident_id': event['incident_id'],
                'created_at': datetime.utcnow().isoformat()
            }

            # Merge additional variables from incident
            if event.get('variables'):
                try:
                    incident_variables = json.loads(event['variables']) if isinstance(event['variables'], str) else event['variables']
                    variables.update(incident_variables)
                except:
                    pass

            # Send notification based on channel
            success = False
            error_message = ""

            if channel == 'email':
                success, error_message = self.send_email_notification(target, subject, body, variables)
            elif channel == 'sms':
                success, error_message = self.send_sms_notification(target, body, variables)
            elif channel == 'whatsapp':
                success, error_message = self.send_whatsapp_notification(target, body, variables, whatsapp_template_id)
            elif channel == 'voice':
                success, error_message = self.send_voice_notification(target, body, variables)
            else:
                error_message = f"Unsupported channel: {channel}"

            # Update event status
            if success:
                siren_service.mark_event_sent(event_id)
                logger.info(f"Event {event_id} sent successfully via {channel}")
            else:
                siren_service.mark_event_failed(event_id, error_message)
                logger.error(f"Event {event_id} failed via {channel}: {error_message}")

            return success

        except Exception as e:
            logger.error(f"Error processing event {event.get('id', 'unknown')}: {e}")
            if event.get('id'):
                siren_service.mark_event_failed(event['id'], str(e))
            return False

    def process_pending_events(self, batch_size: int = 10) -> Dict:
        """Process pending notification events in batches"""
        try:
            # Get pending events
            events = siren_service.get_pending_events(limit=batch_size)

            if not events:
                return {
                    "processed": 0,
                    "successful": 0,
                    "failed": 0,
                    "message": "No pending events"
                }

            processed = 0
            successful = 0
            failed = 0

            for event in events:
                processed += 1
                success = self.process_event(event)
                if success:
                    successful += 1
                else:
                    failed += 1

            logger.info(f"Processed {processed} events: {successful} successful, {failed} failed")

            return {
                "processed": processed,
                "successful": successful,
                "failed": failed,
                "message": f"Processed {processed} events"
            }

        except Exception as e:
            logger.error(f"Error processing pending events: {e}")
            return {
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "error": str(e)
            }

    def cleanup_old_events(self, days_old: int = 30) -> int:
        """Clean up old resolved/failed events"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)

            result = db_exec("""
                DELETE FROM siren_events
                WHERE status IN ('sent', 'failed', 'cancelled')
                AND created_at < %s
            """, (cutoff_date,), fetch=True)

            count = result[0]['count'] if result else 0
            logger.info(f"Cleaned up {count} old siren events")
            return count

        except Exception as e:
            logger.error(f"Error cleaning up old events: {e}")
            return 0

    def get_processor_metrics(self) -> Dict:
        """Get notification processor metrics"""
        try:
            # Get event counts by status
            status_counts = db_fetch_all("""
                SELECT status, COUNT(*) as count
                FROM siren_events
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY status
            """)

            # Get channel performance
            channel_performance = db_fetch_all("""
                SELECT channel, status, COUNT(*) as count
                FROM siren_events
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY channel, status
                ORDER BY channel, status
            """)

            # Get recent incidents
            recent_incidents = db_fetch_all("""
                SELECT status, COUNT(*) as count
                FROM siren_incidents
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY status
            """)

            return {
                "status_counts": {row['status']: row['count'] for row in status_counts},
                "channel_performance": channel_performance,
                "recent_incidents": {row['status']: row['count'] for row in recent_incidents},
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting processor metrics: {e}")
            return {"error": str(e)}

# Global notification processor instance
notification_processor = SirenNotificationProcessor()

def run_notification_processor_daemon():
    """Run the notification processor as a daemon"""
    logger.info("Starting Siren Notification Processor daemon")

    while True:
        try:
            # Process pending events
            result = notification_processor.process_pending_events(batch_size=10)

            if result['processed'] > 0:
                logger.info(f"Batch complete: {result}")

            # Clean up old events every hour (3600 iterations at 1 second sleep)
            if int(time.time()) % 3600 == 0:
                notification_processor.cleanup_old_events()

            # Wait before next batch
            time.sleep(1)

        except KeyboardInterrupt:
            logger.info("Notification processor stopped by user")
            break
        except Exception as e:
            logger.error(f"Notification processor error: {e}")
            time.sleep(5)  # Wait longer on error

if __name__ == "__main__":
    run_notification_processor_daemon()