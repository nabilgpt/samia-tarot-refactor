"""
M40 Emergency/Siren Escalation Service
Backend-only incident management with policy-driven escalation
Deduplication, cooldown, ACK/RESOLVE functionality with full audit trail
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from db import db_exec, db_fetch_one, db_fetch_all
from twilio_verify_service import TwilioVerifyService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IncidentSeverity(Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    INFO = 5

class IncidentStatus(Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    VOICE = "voice"

@dataclass
class EscalationStep:
    delay_s: int
    channel: str
    template_id: int
    targets: List[str]

@dataclass
class SirenIncident:
    id: Optional[int]
    incident_uuid: str
    type: str
    severity: int
    source: str
    status: str
    root_hash: str
    policy_id: int
    context: Dict
    variables: Dict
    created_by: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SirenService:
    def __init__(self):
        self.twilio_service = TwilioVerifyService()

    def generate_root_hash(self, incident_type: str, source: str, context: Dict) -> str:
        """Generate SHA256 hash for deduplication"""
        # Create consistent string representation for hashing
        hash_data = {
            'type': incident_type,
            'source': source,
            'context': {k: v for k, v in sorted(context.items()) if k != 'timestamp'}
        }
        hash_string = json.dumps(hash_data, sort_keys=True)
        return hashlib.sha256(hash_string.encode()).hexdigest()

    def check_deduplication(self, root_hash: str, policy_id: int) -> Optional[int]:
        """Check if incident exists within deduplication window"""
        # Get policy dedup window
        policy = db_fetch_one("""
            SELECT dedupe_window_seconds FROM siren_policies
            WHERE id = %s AND enabled = true
        """, (policy_id,))

        if not policy:
            return None

        dedupe_window = policy['dedupe_window_seconds']
        cutoff_time = datetime.utcnow() - timedelta(seconds=dedupe_window)

        # Check for existing incident within window
        existing = db_fetch_one("""
            SELECT id FROM siren_incidents
            WHERE root_hash = %s
            AND status IN ('open', 'acknowledged')
            AND created_at > %s
        """, (root_hash, cutoff_time))

        return existing['id'] if existing else None

    def check_cooldown(self, policy_id: int) -> bool:
        """Check if policy is in cooldown period"""
        policy = db_fetch_one("""
            SELECT cooldown_seconds FROM siren_policies
            WHERE id = %s AND enabled = true
        """, (policy_id,))

        if not policy:
            return True  # Block if policy not found

        cooldown_seconds = policy['cooldown_seconds']
        cutoff_time = datetime.utcnow() - timedelta(seconds=cooldown_seconds)

        # Check for recent incidents with this policy
        recent = db_fetch_one("""
            SELECT id FROM siren_incidents
            WHERE policy_id = %s
            AND created_at > %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (policy_id, cutoff_time))

        return recent is not None  # True = in cooldown, False = ready

    def get_policy_by_name(self, policy_name: str) -> Optional[Dict]:
        """Get escalation policy by name"""
        return db_fetch_one("""
            SELECT * FROM siren_policies
            WHERE name = %s AND enabled = true
        """, (policy_name,))

    def trigger_incident(self,
                        incident_type: str,
                        severity: int,
                        source: str,
                        policy_name: str,
                        context: Dict,
                        variables: Dict,
                        created_by: str,
                        force: bool = False) -> Tuple[bool, str, Optional[int]]:
        """
        Trigger new incident with deduplication and cooldown checks
        Returns: (success, message, incident_id)
        """
        try:
            # Validate severity
            if severity not in range(1, 6):
                return False, "Invalid severity: must be 1-5", None

            # Get policy
            policy = self.get_policy_by_name(policy_name)
            if not policy:
                return False, f"Policy '{policy_name}' not found or disabled", None

            # Generate root hash for deduplication
            root_hash = self.generate_root_hash(incident_type, source, context)

            # Check deduplication unless forced
            if not force:
                existing_id = self.check_deduplication(root_hash, policy['id'])
                if existing_id:
                    logger.info(f"Incident deduplicated - existing incident {existing_id}")
                    return False, f"Duplicate incident detected (ID: {existing_id})", existing_id

                # Check cooldown
                if self.check_cooldown(policy['id']):
                    logger.info(f"Policy {policy_name} in cooldown period")
                    return False, f"Policy '{policy_name}' in cooldown period", None

            # Create incident
            result = db_exec("""
                INSERT INTO siren_incidents
                (type, severity, source, root_hash, policy_id, context, variables, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, incident_uuid
            """, (incident_type, severity, source, root_hash, policy['id'],
                  json.dumps(context), json.dumps(variables), created_by))

            if not result:
                return False, "Failed to create incident", None

            incident_id = result[0]['id']
            incident_uuid = result[0]['incident_uuid']

            # Schedule escalation events
            self._schedule_escalation_events(incident_id, policy['steps'], variables)

            logger.info(f"Incident {incident_id} ({incident_uuid}) created successfully")
            return True, f"Incident {incident_uuid} created", incident_id

        except Exception as e:
            logger.error(f"Error triggering incident: {e}")
            return False, f"Internal error: {str(e)}", None

    def _schedule_escalation_events(self, incident_id: int, steps_json: str, variables: Dict):
        """Schedule all escalation events for an incident"""
        try:
            steps = json.loads(steps_json)
            base_time = datetime.utcnow()

            for i, step in enumerate(steps):
                step_number = i + 1
                scheduled_time = base_time + timedelta(seconds=step['delay_s'])

                for target in step['targets']:
                    db_exec("""
                        INSERT INTO siren_events
                        (incident_id, step_number, channel, target, template_id, scheduled_for)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (incident_id, step_number, step['channel'], target,
                          step['template_id'], scheduled_time))

        except Exception as e:
            logger.error(f"Error scheduling escalation events: {e}")

    def acknowledge_incident(self, incident_id: int, acknowledged_by: str) -> Tuple[bool, str]:
        """Acknowledge an incident and cancel pending notifications"""
        try:
            # Check if incident exists and is open
            incident = db_fetch_one("""
                SELECT status FROM siren_incidents WHERE id = %s
            """, (incident_id,))

            if not incident:
                return False, "Incident not found"

            if incident['status'] != 'open':
                return False, f"Incident already {incident['status']}"

            # Update incident status
            db_exec("""
                UPDATE siren_incidents
                SET status = 'acknowledged', acknowledged_by = %s, acknowledged_at = %s, updated_at = %s
                WHERE id = %s
            """, (acknowledged_by, datetime.utcnow(), datetime.utcnow(), incident_id))

            # Cancel pending events
            db_exec("""
                UPDATE siren_events
                SET status = 'cancelled'
                WHERE incident_id = %s AND status = 'pending'
            """, (incident_id,))

            logger.info(f"Incident {incident_id} acknowledged by {acknowledged_by}")
            return True, "Incident acknowledged successfully"

        except Exception as e:
            logger.error(f"Error acknowledging incident: {e}")
            return False, f"Internal error: {str(e)}"

    def resolve_incident(self, incident_id: int, resolved_by: str) -> Tuple[bool, str]:
        """Resolve an incident and cancel all pending notifications"""
        try:
            # Check if incident exists
            incident = db_fetch_one("""
                SELECT status FROM siren_incidents WHERE id = %s
            """, (incident_id,))

            if not incident:
                return False, "Incident not found"

            if incident['status'] == 'resolved':
                return False, "Incident already resolved"

            # Update incident status
            db_exec("""
                UPDATE siren_incidents
                SET status = 'resolved', resolved_by = %s, resolved_at = %s, updated_at = %s
                WHERE id = %s
            """, (resolved_by, datetime.utcnow(), datetime.utcnow(), incident_id))

            # Cancel all pending events
            db_exec("""
                UPDATE siren_events
                SET status = 'cancelled'
                WHERE incident_id = %s AND status = 'pending'
            """, (incident_id,))

            logger.info(f"Incident {incident_id} resolved by {resolved_by}")
            return True, "Incident resolved successfully"

        except Exception as e:
            logger.error(f"Error resolving incident: {e}")
            return False, f"Internal error: {str(e)}"

    def get_pending_events(self, limit: int = 100) -> List[Dict]:
        """Get pending notification events ready to be sent"""
        return db_fetch_all("""
            SELECT e.*, i.type as incident_type, i.severity, i.source, i.variables, i.context,
                   t.subject, t.body, t.whatsapp_template_id
            FROM siren_events e
            JOIN siren_incidents i ON e.incident_id = i.id
            JOIN siren_templates t ON e.template_id = t.id
            WHERE e.status = 'pending'
            AND e.scheduled_for <= %s
            ORDER BY e.scheduled_for ASC
            LIMIT %s
        """, (datetime.utcnow(), limit))

    def mark_event_sent(self, event_id: int) -> bool:
        """Mark an event as successfully sent"""
        try:
            db_exec("""
                UPDATE siren_events
                SET status = 'sent', sent_at = %s
                WHERE id = %s
            """, (datetime.utcnow(), event_id))
            return True
        except Exception as e:
            logger.error(f"Error marking event {event_id} as sent: {e}")
            return False

    def mark_event_failed(self, event_id: int, error_message: str) -> bool:
        """Mark an event as failed with error message"""
        try:
            db_exec("""
                UPDATE siren_events
                SET status = 'failed', error_message = %s, retry_count = retry_count + 1
                WHERE id = %s
            """, (error_message, event_id))
            return True
        except Exception as e:
            logger.error(f"Error marking event {event_id} as failed: {e}")
            return False

    def get_incidents(self, status: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get incidents with optional status filter"""
        if status:
            return db_fetch_all("""
                SELECT * FROM siren_incidents
                WHERE status = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (status, limit))
        else:
            return db_fetch_all("""
                SELECT * FROM siren_incidents
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))

    def get_incident_events(self, incident_id: int) -> List[Dict]:
        """Get all events for a specific incident"""
        return db_fetch_all("""
            SELECT e.*, t.name as template_name, t.channel
            FROM siren_events e
            LEFT JOIN siren_templates t ON e.template_id = t.id
            WHERE e.incident_id = %s
            ORDER BY e.step_number, e.id
        """, (incident_id,))

    def test_escalation_policy(self, policy_name: str, test_user: str) -> Tuple[bool, str]:
        """Test an escalation policy with dummy incident"""
        test_context = {
            'test': True,
            'timestamp': datetime.utcnow().isoformat()
        }
        test_variables = {
            'incident_type': 'TEST_ESCALATION',
            'severity': '1',
            'source': 'SIREN_TEST',
            'context': 'This is a test escalation'
        }

        success, message, incident_id = self.trigger_incident(
            incident_type='test_escalation',
            severity=1,
            source='siren_test',
            policy_name=policy_name,
            context=test_context,
            variables=test_variables,
            created_by=test_user,
            force=True  # Bypass dedup/cooldown for tests
        )

        if success and incident_id:
            # Auto-resolve test incident
            self.resolve_incident(incident_id, test_user)
            return True, f"Test escalation successful - incident {incident_id} created and resolved"

        return success, message

# Global siren service instance
siren_service = SirenService()