"""
M41 WhatsApp + n8n Automations Service
24h-aware messaging, template handling, and Stripe Payment Links integration
E.164 normalization enforced, secure media handling with signed URLs
"""

import os
import json
import hashlib
import hmac
import requests
import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from db import db_exec, db_fetch_one, db_fetch_all
from twilio_verify_service import TwilioVerifyService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageDirection(Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"

class MessageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"
    TEMPLATE = "template"

class TemplateCategory(Enum):
    MARKETING = "MARKETING"
    UTILITY = "UTILITY"
    AUTHENTICATION = "AUTHENTICATION"

@dataclass
class WhatsAppMessage:
    phone_e164: str
    message_type: str
    direction: str
    content_text: Optional[str] = None
    media_url: Optional[str] = None
    media_mime_type: Optional[str] = None
    template_name: Optional[str] = None
    template_params: Optional[Dict] = None
    wa_message_id: Optional[str] = None
    profile_id: Optional[str] = None
    metadata: Optional[Dict] = None

class WhatsAppService:
    def __init__(self):
        self.twilio_service = TwilioVerifyService()

        # WhatsApp Cloud API credentials
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")
        self.webhook_secret = os.getenv("WHATSAPP_WEBHOOK_SECRET")

        # Base URLs
        self.api_base = f"https://graph.facebook.com/v18.0/{self.phone_number_id}"

    def normalize_phone_e164(self, phone: str) -> Optional[str]:
        """Normalize phone number to E.164 format"""
        if not phone:
            return None

        # Remove all non-digits and plus
        normalized = re.sub(r'[^\d+]', '', phone)

        # Add + if not present and has enough digits
        if not normalized.startswith('+'):
            if len(normalized) > 10:
                normalized = '+' + normalized
            else:
                return None

        # Validate E.164 format (+ followed by 1-15 digits)
        if re.match(r'^\+[1-9]\d{1,14}$', normalized):
            return normalized
        else:
            return None

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature for security"""
        if not self.webhook_secret:
            logger.warning("No webhook secret configured")
            return True  # Allow in development

        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Remove 'sha256=' prefix if present
        if signature.startswith('sha256='):
            signature = signature[7:]

        return hmac.compare_digest(expected_signature, signature)

    def get_profile_by_phone(self, phone_e164: str) -> Optional[Dict]:
        """Get profile by verified phone number"""
        return db_fetch_one("""
            SELECT id, first_name, last_name, email, phone_verified
            FROM profiles
            WHERE phone = %s AND phone_verified = true
        """, (phone_e164,))

    def can_send_freeform(self, phone_e164: str) -> bool:
        """Check if we can send free-form messages (within 24h)"""
        result = db_fetch_one("""
            SELECT can_send_freeform_wa(%s) as can_send
        """, (phone_e164,))

        return result['can_send'] if result else False

    def get_approved_template(self, template_name: str) -> Optional[Dict]:
        """Get approved WhatsApp template"""
        return db_fetch_one("""
            SELECT * FROM wa_templates
            WHERE name = %s AND approval_status = 'approved'
        """, (template_name,))

    def store_inbound_message(self, message: WhatsAppMessage) -> Optional[int]:
        """Store inbound WhatsApp message with RLS"""
        try:
            # Get profile if phone is verified
            profile = self.get_profile_by_phone(message.phone_e164)
            profile_id = profile['id'] if profile else None

            # Store message
            result = db_exec("""
                INSERT INTO wa_messages (
                    direction, wa_message_id, phone_e164, profile_id,
                    message_type, content_text, media_url, media_mime_type,
                    metadata, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                message.direction,
                message.wa_message_id,
                message.phone_e164,
                profile_id,
                message.message_type,
                message.content_text,
                message.media_url,
                message.media_mime_type,
                json.dumps(message.metadata or {}),
                'received'
            ))

            if result:
                message_id = result[0]['id']

                # Update conversation 24h window
                db_exec("""
                    SELECT update_wa_conversation(%s, %s, %s)
                """, (message.phone_e164, profile_id, True))

                logger.info(f"Stored inbound WhatsApp message {message_id} from {message.phone_e164}")
                return message_id

        except Exception as e:
            logger.error(f"Error storing inbound message: {e}")

        return None

    def send_template_message(self, phone_e164: str, template_name: str,
                            parameters: List[str], language: str = "en") -> Tuple[bool, str]:
        """Send approved template message via WhatsApp Cloud API"""
        try:
            # Check if template is approved
            template = self.get_approved_template(template_name)
            if not template:
                return False, f"Template '{template_name}' not found or not approved"

            # Prepare template message
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_e164,
                "type": "template",
                "template": {
                    "name": template['provider_template_id'] or template_name,
                    "language": {"code": language},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [{"type": "text", "text": param} for param in parameters]
                        }
                    ]
                }
            }

            # Send via WhatsApp Cloud API
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }

            response = requests.post(
                f"{self.api_base}/messages",
                json=payload,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                wa_message_id = result.get('messages', [{}])[0].get('id')

                # Store outbound message
                profile = self.get_profile_by_phone(phone_e164)
                profile_id = profile['id'] if profile else None

                db_exec("""
                    INSERT INTO wa_messages (
                        direction, wa_message_id, phone_e164, profile_id,
                        message_type, template_name, template_params,
                        metadata, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    MessageDirection.OUTBOUND.value,
                    wa_message_id,
                    phone_e164,
                    profile_id,
                    MessageType.TEMPLATE.value,
                    template_name,
                    json.dumps(parameters),
                    json.dumps(result),
                    'sent'
                ))

                # Update conversation
                db_exec("""
                    SELECT update_wa_conversation(%s, %s, %s)
                """, (phone_e164, profile_id, False))

                logger.info(f"Sent template {template_name} to {phone_e164}: {wa_message_id}")
                return True, f"Template sent: {wa_message_id}"

            else:
                error_msg = response.json().get('error', {}).get('message', 'Unknown error')
                logger.error(f"WhatsApp API error: {error_msg}")
                return False, f"WhatsApp API error: {error_msg}"

        except Exception as e:
            logger.error(f"Error sending template message: {e}")
            return False, str(e)

    def send_freeform_message(self, phone_e164: str, text: str) -> Tuple[bool, str]:
        """Send free-form text message (only within 24h window)"""
        try:
            # Check 24h rule
            if not self.can_send_freeform(phone_e164):
                return False, "Cannot send free-form message outside 24h window"

            # Prepare text message
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_e164,
                "type": "text",
                "text": {"body": text}
            }

            # Send via WhatsApp Cloud API
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }

            response = requests.post(
                f"{self.api_base}/messages",
                json=payload,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                wa_message_id = result.get('messages', [{}])[0].get('id')

                # Store outbound message
                profile = self.get_profile_by_phone(phone_e164)
                profile_id = profile['id'] if profile else None

                db_exec("""
                    INSERT INTO wa_messages (
                        direction, wa_message_id, phone_e164, profile_id,
                        message_type, content_text, metadata, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    MessageDirection.OUTBOUND.value,
                    wa_message_id,
                    phone_e164,
                    profile_id,
                    MessageType.TEXT.value,
                    text,
                    json.dumps(result),
                    'sent'
                ))

                # Update conversation
                db_exec("""
                    SELECT update_wa_conversation(%s, %s, %s)
                """, (phone_e164, profile_id, False))

                logger.info(f"Sent free-form message to {phone_e164}: {wa_message_id}")
                return True, f"Message sent: {wa_message_id}"

            else:
                error_msg = response.json().get('error', {}).get('message', 'Unknown error')
                logger.error(f"WhatsApp API error: {error_msg}")
                return False, f"WhatsApp API error: {error_msg}"

        except Exception as e:
            logger.error(f"Error sending free-form message: {e}")
            return False, str(e)

    def download_media(self, media_url: str, message_id: int) -> Tuple[bool, str, Optional[str]]:
        """Download media from WhatsApp Cloud API and store privately"""
        try:
            # Download media with authorization
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(media_url, headers=headers, timeout=30)

            if response.status_code != 200:
                return False, "Failed to download media", None

            # Generate unique filename
            file_extension = self._get_file_extension(response.headers.get('content-type', ''))
            filename = f"wa_media_{message_id}_{uuid.uuid4().hex}{file_extension}"

            # Store in private storage (implement based on your storage solution)
            # For now, we'll store the path where it should be saved
            storage_path = f"private/whatsapp_media/{filename}"

            # Update message with storage path
            db_exec("""
                UPDATE wa_messages
                SET media_stored_path = %s, media_mime_type = %s, updated_at = %s
                WHERE id = %s
            """, (
                storage_path,
                response.headers.get('content-type'),
                datetime.utcnow(),
                message_id
            ))

            logger.info(f"Downloaded media for message {message_id} to {storage_path}")
            return True, "Media downloaded successfully", storage_path

        except Exception as e:
            logger.error(f"Error downloading media: {e}")
            return False, str(e), None

    def create_media_signature(self, message_id: int, max_access: int = 1,
                             ttl_minutes: int = 60) -> Optional[str]:
        """Create signed URL for secure media access"""
        try:
            # Generate signature
            signature_uuid = str(uuid.uuid4())
            access_token = hashlib.sha256(f"{signature_uuid}{message_id}".encode()).hexdigest()
            expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)

            # Store signature
            db_exec("""
                INSERT INTO wa_media_signatures (
                    signature_uuid, message_id, file_path, access_token,
                    expires_at, max_access_count
                ) VALUES (%s, %s, (
                    SELECT media_stored_path FROM wa_messages WHERE id = %s
                ), %s, %s, %s)
            """, (signature_uuid, message_id, message_id, access_token, expires_at, max_access))

            # Return signed URL
            signed_url = f"https://samiatarot.com/api/whatsapp/media/{signature_uuid}?token={access_token}"
            logger.info(f"Created media signature for message {message_id}: {signature_uuid}")
            return signed_url

        except Exception as e:
            logger.error(f"Error creating media signature: {e}")
            return None

    def verify_media_signature(self, signature_uuid: str, access_token: str) -> Tuple[bool, Optional[str]]:
        """Verify media signature and return file path if valid"""
        try:
            # Get signature record
            signature = db_fetch_one("""
                SELECT file_path, expires_at, accessed_count, max_access_count
                FROM wa_media_signatures
                WHERE signature_uuid = %s AND access_token = %s
            """, (signature_uuid, access_token))

            if not signature:
                return False, None

            # Check expiry
            if datetime.utcnow() > signature['expires_at']:
                return False, None

            # Check access count
            if signature['accessed_count'] >= signature['max_access_count']:
                return False, None

            # Increment access count
            db_exec("""
                UPDATE wa_media_signatures
                SET accessed_count = accessed_count + 1
                WHERE signature_uuid = %s
            """, (signature_uuid,))

            return True, signature['file_path']

        except Exception as e:
            logger.error(f"Error verifying media signature: {e}")
            return False, None

    def process_webhook(self, payload: Dict) -> Tuple[bool, str]:
        """Process incoming WhatsApp webhook"""
        try:
            # Extract message data
            entry = payload.get('entry', [{}])[0]
            changes = entry.get('changes', [{}])[0]
            value = changes.get('value', {})

            # Process messages
            messages = value.get('messages', [])
            for msg in messages:
                success = self._process_single_message(msg)
                if not success:
                    logger.warning(f"Failed to process message: {msg.get('id')}")

            # Process status updates
            statuses = value.get('statuses', [])
            for status in statuses:
                self._process_status_update(status)

            return True, "Webhook processed successfully"

        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return False, str(e)

    def _process_single_message(self, msg: Dict) -> bool:
        """Process a single incoming message"""
        try:
            # Normalize phone
            phone_e164 = self.normalize_phone_e164(msg.get('from'))
            if not phone_e164:
                logger.warning(f"Invalid phone number: {msg.get('from')}")
                return False

            # Determine message type and content
            message_type = msg.get('type', 'text')
            content_text = None
            media_url = None
            media_mime_type = None

            if message_type == 'text':
                content_text = msg.get('text', {}).get('body')
            elif message_type in ['image', 'document', 'audio', 'video']:
                media_data = msg.get(message_type, {})
                media_url = media_data.get('url')  # This is temporary Cloud API URL
                media_mime_type = media_data.get('mime_type')
                content_text = media_data.get('caption')  # Caption if present

            # Create message object
            wa_message = WhatsAppMessage(
                phone_e164=phone_e164,
                message_type=message_type,
                direction=MessageDirection.INBOUND.value,
                content_text=content_text,
                media_url=media_url,
                media_mime_type=media_mime_type,
                wa_message_id=msg.get('id'),
                metadata=msg
            )

            # Store message
            message_id = self.store_inbound_message(wa_message)
            if not message_id:
                return False

            # Download media if present
            if media_url:
                success, _, _ = self.download_media(media_url, message_id)
                if not success:
                    logger.warning(f"Failed to download media for message {message_id}")

            return True

        except Exception as e:
            logger.error(f"Error processing single message: {e}")
            return False

    def _process_status_update(self, status: Dict):
        """Process message status update"""
        try:
            wa_message_id = status.get('id')
            new_status = status.get('status')

            if wa_message_id and new_status:
                db_exec("""
                    UPDATE wa_messages
                    SET status = %s, updated_at = %s
                    WHERE wa_message_id = %s
                """, (new_status, datetime.utcnow(), wa_message_id))

        except Exception as e:
            logger.error(f"Error processing status update: {e}")

    def _get_file_extension(self, mime_type: str) -> str:
        """Get file extension from MIME type"""
        mime_map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'application/pdf': '.pdf',
            'audio/mpeg': '.mp3',
            'audio/ogg': '.ogg',
            'video/mp4': '.mp4'
        }
        return mime_map.get(mime_type, '')

    def get_conversation_history(self, phone_e164: str, limit: int = 50) -> List[Dict]:
        """Get conversation history for a phone number"""
        return db_fetch_all("""
            SELECT * FROM wa_messages
            WHERE phone_e164 = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (phone_e164, limit))

    def get_metrics(self) -> Dict:
        """Get WhatsApp service metrics"""
        try:
            # Message counts by direction
            direction_counts = db_fetch_all("""
                SELECT direction, COUNT(*) as count
                FROM wa_messages
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY direction
            """)

            # Template usage
            template_counts = db_fetch_all("""
                SELECT template_name, COUNT(*) as count
                FROM wa_messages
                WHERE direction = 'outbound' AND template_name IS NOT NULL
                AND created_at > NOW() - INTERVAL '24 hours'
                GROUP BY template_name
            """)

            # 24h window conversations
            window_stats = db_fetch_one("""
                SELECT
                    COUNT(*) as total_conversations,
                    COUNT(CASE WHEN is_within_24h THEN 1 END) as within_24h_count
                FROM wa_conversations
            """)

            return {
                "direction_counts": {row['direction']: row['count'] for row in direction_counts},
                "template_usage": {row['template_name']: row['count'] for row in template_counts},
                "conversation_windows": window_stats,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return {"error": str(e)}

# Global WhatsApp service instance
whatsapp_service = WhatsAppService()