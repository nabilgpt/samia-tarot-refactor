"""
M40: Siren & Availability Service
Emergency escalation using M15 notification providers
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class SirenService:
    """Emergency escalation and reader availability service"""
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.notification_service = NotificationService(db_config)
        
    def get_db_connection(self):
        return psycopg2.connect(**self.db_config)
    
    async def trigger_siren(self, config_name: str, trigger_context: Dict[str, Any]) -> bool:
        """
        Trigger emergency siren escalation
        Returns True if escalation started successfully
        """
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get siren configuration
            cur.execute("""
                SELECT * FROM siren_configs 
                WHERE name = %s AND is_active = TRUE
            """, (config_name,))
            
            config = cur.fetchone()
            if not config:
                logger.error(f"Siren config '{config_name}' not found or inactive")
                return False
            
            # Start escalation chain
            await self._start_escalation_chain(config, trigger_context)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to trigger siren {config_name}: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()
    
    async def _start_escalation_chain(self, config: Dict, trigger_context: Dict):
        """Start the escalation chain with scheduled alerts"""
        escalation_minutes = config['escalation_minutes']
        
        for level, delay_minutes in enumerate(escalation_minutes):
            if delay_minutes == 0:
                # Send immediately
                await self._send_escalation_alert(config, trigger_context, level)
            else:
                # Schedule delayed alert
                asyncio.create_task(
                    self._delayed_escalation_alert(config, trigger_context, level, delay_minutes)
                )
    
    async def _delayed_escalation_alert(self, config: Dict, trigger_context: Dict, level: int, delay_minutes: int):
        """Send escalation alert after delay"""
        await asyncio.sleep(delay_minutes * 60)
        await self._send_escalation_alert(config, trigger_context, level)
    
    async def _send_escalation_alert(self, config: Dict, trigger_context: Dict, level: int):
        """Send escalation alert to all channels and recipients"""
        channels = config['channels']
        recipients = config['recipients']
        
        # Prepare alert message
        message = self._format_alert_message(config['name'], trigger_context, level)
        
        for channel in channels:
            for recipient in recipients:
                try:
                    # Use M15 notification service
                    success = await self._send_via_channel(channel, recipient, message)
                    
                    # Log escalation event
                    await self._log_escalation_event(
                        config['name'], trigger_context, level, channel, 
                        recipient, 'sent' if success else 'failed'
                    )
                    
                except Exception as e:
                    logger.error(f"Failed to send {channel} alert to {recipient}: {e}")
                    await self._log_escalation_event(
                        config['name'], trigger_context, level, channel, 
                        recipient, 'failed', {'error': str(e)}
                    )
    
    def _format_alert_message(self, config_name: str, trigger_context: Dict, level: int) -> str:
        """Format escalation alert message"""
        escalation_labels = ["URGENT", "CRITICAL", "EMERGENCY"]
        severity = escalation_labels[min(level, len(escalation_labels) - 1)]
        
        context_summary = ""
        if 'order_id' in trigger_context:
            context_summary = f" Order #{trigger_context['order_id'][:8]}"
        elif 'alert_type' in trigger_context:
            context_summary = f" {trigger_context['alert_type']}"
        
        return f"🚨 {severity}: {config_name.replace('_', ' ').title()}{context_summary}. Level {level + 1} escalation. Immediate attention required."
    
    async def _send_via_channel(self, channel: str, recipient: str, message: str) -> bool:
        """Send alert via specific notification channel"""
        try:
            if channel == 'email':
                return await self.notification_service.send_email(
                    recipient, "SIREN: Emergency Alert", message
                )
            elif channel == 'sms':
                return await self.notification_service.send_sms(recipient, message)
            elif channel == 'whatsapp':
                return await self.notification_service.send_whatsapp(recipient, message)
            else:
                logger.error(f"Unknown notification channel: {channel}")
                return False
                
        except Exception as e:
            logger.error(f"Channel {channel} send failed: {e}")
            return False
    
    async def _log_escalation_event(self, config_name: str, trigger_context: Dict, 
                                   level: int, channel: str, recipient: str, 
                                   status: str, metadata: Optional[Dict] = None):
        """Log escalation event to audit trail"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO siren_events 
                (config_name, trigger_context, escalation_level, channel, recipient, delivery_status, response_metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                config_name, json.dumps(trigger_context), level, 
                channel, recipient, status, json.dumps(metadata or {})
            ))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"Failed to log escalation event: {e}")
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_reader_availability(self, reader_id: str, date: datetime) -> List[Dict]:
        """Get reader availability windows for specific date"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            day_of_week = date.weekday() + 1  # Convert to 1=Monday format
            if day_of_week == 7:
                day_of_week = 0  # Sunday = 0
            
            cur.execute("""
                SELECT * FROM reader_availability 
                WHERE reader_id = %s AND day_of_week = %s AND is_active = TRUE
                ORDER BY start_time
            """, (reader_id, day_of_week))
            
            return cur.fetchall()
            
        except Exception as e:
            logger.error(f"Failed to get reader availability: {e}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()
    
    def check_reader_available_now(self, reader_id: str) -> bool:
        """Check if reader is available right now"""
        now = datetime.now()
        availability_windows = self.get_reader_availability(reader_id, now)
        
        current_time = now.time()
        
        for window in availability_windows:
            if window['start_time'] <= current_time <= window['end_time']:
                return True
        
        return False
    
    def get_available_readers(self, datetime_slot: datetime) -> List[str]:
        """Get list of reader IDs available at specific datetime"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor()
            
            day_of_week = datetime_slot.weekday() + 1
            if day_of_week == 7:
                day_of_week = 0
            
            slot_time = datetime_slot.time()
            
            cur.execute("""
                SELECT DISTINCT ra.reader_id 
                FROM reader_availability ra
                JOIN profiles p ON ra.reader_id = p.id
                WHERE ra.day_of_week = %s 
                  AND ra.is_active = TRUE
                  AND p.role = 'reader'
                  AND ra.start_time <= %s 
                  AND ra.end_time >= %s
            """, (day_of_week, slot_time, slot_time))
            
            return [row[0] for row in cur.fetchall()]
            
        except Exception as e:
            logger.error(f"Failed to get available readers: {e}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()
    
    def set_reader_availability(self, reader_id: str, day_of_week: int, 
                               start_time: time, end_time: time, 
                               timezone: str = 'UTC') -> bool:
        """Set or update reader availability window"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO reader_availability 
                (reader_id, day_of_week, start_time, end_time, timezone)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (reader_id, day_of_week) 
                DO UPDATE SET 
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    timezone = EXCLUDED.timezone,
                    updated_at = NOW()
            """, (reader_id, day_of_week, start_time, end_time, timezone))
            
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to set reader availability: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_siren_metrics(self) -> Dict[str, int]:
        """Get siren metrics for ops dashboard"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor()
            
            # Count alerts in last 24 hours by status
            cur.execute("""
                SELECT delivery_status, COUNT(*) 
                FROM siren_events 
                WHERE sent_at > NOW() - INTERVAL '24 hours'
                GROUP BY delivery_status
            """)
            
            metrics = {
                'siren_alerts_sent_24h': 0,
                'siren_alerts_failed_24h': 0,
                'siren_alerts_pending_24h': 0
            }
            
            for status, count in cur.fetchall():
                metrics[f'siren_alerts_{status}_24h'] = count
            
            # Count active reader availability windows
            cur.execute("""
                SELECT COUNT(*) FROM reader_availability WHERE is_active = TRUE
            """)
            metrics['active_availability_windows'] = cur.fetchone()[0]
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get siren metrics: {e}")
            return {}
        finally:
            if 'conn' in locals():
                conn.close()