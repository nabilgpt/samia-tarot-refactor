#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
On-Call Escalation Service
Manages 24/7 on-call rotation and escalation policies for Samia Tarot Platform
"""
import os
import sys
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
import psycopg2
from psycopg2.pool import SimpleConnectionPool

# Force UTF-8 encoding for stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configuration
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class SeverityLevel(Enum):
    SEV_1 = "SEV-1"
    SEV_2 = "SEV-2" 
    SEV_3 = "SEV-3"

class EscalationLevel(Enum):
    MONITOR = "monitor"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class OnCallRotation:
    """Represents an on-call rotation schedule"""
    
    def __init__(self, name: str, timezone: str = "Asia/Beirut"):
        self.name = name
        self.timezone = timezone
        self.schedule = {}
        
    def set_schedule(self, day_of_week: int, primary: str, secondary: str):
        """Set primary/secondary for a day of week (0=Monday, 6=Sunday)"""
        self.schedule[day_of_week] = {
            'primary': primary,
            'secondary': secondary
        }
    
    def get_current_on_call(self) -> Tuple[str, str]:
        """Get current primary/secondary on-call"""
        current_day = datetime.now().weekday()
        if current_day in self.schedule:
            return (
                self.schedule[current_day]['primary'],
                self.schedule[current_day]['secondary']
            )
        return ("", "")

class EscalationPolicy:
    """Manages incident escalation policies"""
    
    def __init__(self):
        self.policies = {
            SeverityLevel.SEV_1: {
                'immediate_response_time': 5,  # minutes
                'escalation_levels': [
                    {'level': EscalationLevel.MONITOR, 'timeout': 5},
                    {'level': EscalationLevel.ADMIN, 'timeout': 5}, 
                    {'level': EscalationLevel.SUPER_ADMIN, 'timeout': 5}
                ],
                'emergency_call_override': True
            },
            SeverityLevel.SEV_2: {
                'immediate_response_time': 15,  # minutes
                'escalation_levels': [
                    {'level': EscalationLevel.MONITOR, 'timeout': 15},
                    {'level': EscalationLevel.ADMIN, 'timeout': 15}
                ],
                'emergency_call_override': False
            },
            SeverityLevel.SEV_3: {
                'immediate_response_time': 60,  # minutes
                'escalation_levels': [
                    {'level': EscalationLevel.MONITOR, 'timeout': 60}
                ],
                'emergency_call_override': False
            }
        }
    
    def get_escalation_timeline(self, severity: SeverityLevel) -> List[Dict]:
        """Get escalation timeline for a severity level"""
        if severity not in self.policies:
            return []
        
        policy = self.policies[severity]
        timeline = []
        
        current_time = 0
        for level_info in policy['escalation_levels']:
            timeline.append({
                'level': level_info['level'],
                'escalate_at_minutes': current_time,
                'timeout_minutes': level_info['timeout']
            })
            current_time += level_info['timeout']
        
        return timeline

class OnCallService:
    """Main on-call management service"""
    
    def __init__(self):
        self.rotation = OnCallRotation("samia-tarot-rotation")
        self.escalation_policy = EscalationPolicy()
        self.setup_default_rotation()
    
    @staticmethod
    def generate_uuid() -> str:
        """Generate a properly formatted UUID string"""
        return str(uuid.uuid4())
    
    @staticmethod
    def is_valid_uuid(uuid_string: str) -> bool:
        """Validate UUID format"""
        try:
            uuid.UUID(uuid_string)
            return True
        except ValueError:
            return False
    
    def setup_default_rotation(self):
        """Setup default on-call rotation"""
        # Example rotation - should be configured based on actual team
        self.rotation.set_schedule(0, "monitor_user_1", "monitor_user_2")  # Monday
        self.rotation.set_schedule(1, "monitor_user_2", "monitor_user_3")  # Tuesday
        self.rotation.set_schedule(2, "monitor_user_3", "monitor_user_1")  # Wednesday
        self.rotation.set_schedule(3, "monitor_user_1", "monitor_user_2")  # Thursday
        self.rotation.set_schedule(4, "monitor_user_2", "monitor_user_3")  # Friday
        self.rotation.set_schedule(5, "monitor_user_3", "monitor_user_1")  # Saturday
        self.rotation.set_schedule(6, "monitor_user_1", "monitor_user_2")  # Sunday
    
    def trigger_incident_escalation(self, incident_id: str, severity: SeverityLevel, 
                                  description: str, emergency_call: bool = False) -> Dict:
        """Trigger incident escalation based on severity"""
        
        escalation_log = {
            'incident_id': incident_id,
            'severity': severity.value,
            'description': description,
            'emergency_call': emergency_call,
            'started_at': datetime.now().isoformat(),
            'escalation_steps': [],
            'notifications_sent': []
        }
        
        # Get escalation timeline
        timeline = self.escalation_policy.get_escalation_timeline(severity)
        
        # Get current on-call personnel
        primary, secondary = self.rotation.get_current_on_call()
        
        # Execute escalation steps
        for step in timeline:
            escalation_step = self._execute_escalation_step(
                incident_id, step, primary, secondary, emergency_call
            )
            escalation_log['escalation_steps'].append(escalation_step)
            
            # Record notification in database
            self._record_escalation_notification(incident_id, escalation_step)
        
        # Store escalation log
        self._store_escalation_log(escalation_log)
        
        return escalation_log
    
    def _execute_escalation_step(self, incident_id: str, step: Dict, 
                                primary: str, secondary: str, emergency_call: bool) -> Dict:
        """Execute a single escalation step"""
        
        escalation_step = {
            'level': step['level'].value,
            'escalated_at': datetime.now().isoformat(),
            'timeout_minutes': step['timeout_minutes'],
            'contacts_notified': [],
            'notification_methods': []
        }
        
        # Determine who to notify based on escalation level
        if step['level'] == EscalationLevel.MONITOR:
            contacts = [primary, secondary]
            methods = ['slack', 'email']
            if emergency_call:
                methods.append('phone')
        elif step['level'] == EscalationLevel.ADMIN:
            contacts = self._get_admin_contacts()
            methods = ['slack', 'email', 'phone']
        elif step['level'] == EscalationLevel.SUPER_ADMIN:
            contacts = self._get_super_admin_contacts()
            methods = ['slack', 'email', 'phone', 'emergency_sms']
        
        # Send notifications
        for contact in contacts:
            for method in methods:
                notification_result = self._send_notification(
                    contact, method, incident_id, step['level'], emergency_call
                )
                escalation_step['contacts_notified'].append(contact)
                escalation_step['notification_methods'].append({
                    'contact': contact,
                    'method': method,
                    'sent_at': datetime.now().isoformat(),
                    'success': notification_result
                })
        
        return escalation_step
    
    def _send_notification(self, contact: str, method: str, incident_id: str, 
                          level: EscalationLevel, emergency_call: bool) -> bool:
        """Send notification via specified method"""
        
        message = self._format_notification_message(incident_id, level, emergency_call)
        
        try:
            if method == 'slack':
                return self._send_slack_notification(contact, message)
            elif method == 'email':
                return self._send_email_notification(contact, message)
            elif method == 'phone':
                return self._send_phone_notification(contact, message)
            elif method == 'emergency_sms':
                return self._send_emergency_sms(contact, message)
            else:
                print(f"Unknown notification method: {method}")
                return False
        except Exception as e:
            print(f"Failed to send {method} notification to {contact}: {e}")
            return False
    
    def _format_notification_message(self, incident_id: str, level: EscalationLevel, 
                                   emergency_call: bool) -> str:
        """Format notification message based on escalation level"""
        
        urgency = "[EMERGENCY]" if emergency_call else "[URGENT]" if level == EscalationLevel.SUPER_ADMIN else "[ALERT]"
        
        message = f"""
{urgency} INCIDENT ESCALATION

Incident ID: {incident_id}
Escalation Level: {level.value}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z')}

{'EMERGENCY CALL FEATURE AFFECTED - IMMEDIATE RESPONSE REQUIRED' if emergency_call else 'Incident requires immediate attention'}

Actions Required:
1. Acknowledge this page within 5 minutes
2. Join #samia-incident-response channel  
3. Review incident details and take action

Runbooks: https://github.com/samia-tarot/runbooks
Status: https://status.samia-tarot.com
        """.strip()
        
        return message
    
    def _send_slack_notification(self, contact: str, message: str) -> bool:
        """Send Slack notification (implementation depends on Slack integration)"""
        # In production, this would integrate with Slack API
        print(f"[SLACK] Notify {contact}: {message[:100]}...")
        return True
    
    def _send_email_notification(self, contact: str, message: str) -> bool:
        """Send email notification (implementation depends on email service)"""
        # In production, this would integrate with email service
        print(f"[EMAIL] Notify {contact}: {message[:100]}...")
        return True
    
    def _send_phone_notification(self, contact: str, message: str) -> bool:
        """Send phone notification (implementation depends on phone service)"""
        # In production, this would integrate with Twilio or similar
        print(f"[PHONE] Call {contact}: Incident escalation")
        return True
    
    def _send_emergency_sms(self, contact: str, message: str) -> bool:
        """Send emergency SMS (implementation depends on SMS service)"""
        # In production, this would integrate with Twilio SMS
        print(f"[EMERGENCY_SMS] Text {contact}: {message[:100]}...")
        return True
    
    def _get_admin_contacts(self) -> List[str]:
        """Get list of admin contacts from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select id from profiles 
                    where role_id = 2  -- admin role
                    and id is not null
                """)
                return [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"Error getting admin contacts: {e}")
            return ["admin_fallback"]
        finally:
            POOL.putconn(conn)
    
    def _get_super_admin_contacts(self) -> List[str]:
        """Get list of super admin contacts from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select id from profiles 
                    where role_id = 1  -- superadmin role
                    and id is not null
                """)
                return [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"Error getting super admin contacts: {e}")
            return ["superadmin_fallback"]
        finally:
            POOL.putconn(conn)
    
    def _record_escalation_notification(self, incident_id: str, escalation_step: Dict):
        """Record escalation notification in audit log"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Use NULL for actor since 'system' is not a valid UUID
                cur.execute("""
                    insert into audit_log (
                        actor, actor_role, event, entity, entity_id, meta, created_at
                    ) values (
                        %s, %s, %s, %s, %s, %s, now()
                    )
                """, (None, 'system', 'incident_escalation', 'incident', incident_id, json.dumps(escalation_step)))
        except Exception as e:
            print(f"Error recording escalation notification: {e}")
        finally:
            POOL.putconn(conn)
    
    def _store_escalation_log(self, escalation_log: Dict):
        """Store complete escalation log"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Use NULL for actor since 'system' is not a valid UUID
                cur.execute("""
                    insert into audit_log (
                        actor, actor_role, event, entity, entity_id, meta, created_at
                    ) values (
                        %s, %s, %s, %s, %s, %s, now()
                    )
                """, (None, 'system', 'escalation_complete', 'incident', escalation_log['incident_id'], json.dumps(escalation_log)))
        except Exception as e:
            print(f"Error storing escalation log: {e}")
        finally:
            POOL.putconn(conn)
    
    def get_escalation_status(self, incident_id: str) -> Dict:
        """Get current escalation status for an incident"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select meta, created_at from audit_log 
                    where entity = 'incident' and entity_id = %s 
                    and event in ('incident_escalation', 'escalation_complete')
                    order by created_at desc
                """, (incident_id,))
                
                logs = cur.fetchall()
                if logs:
                    latest_log = logs[0]
                    return {
                        'incident_id': incident_id,
                        'status': json.loads(latest_log[0]),
                        'last_updated': latest_log[1].isoformat()
                    }
                else:
                    return {'incident_id': incident_id, 'status': 'no_escalation'}
        except Exception as e:
            print(f"Error getting escalation status: {e}")
            return {'incident_id': incident_id, 'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    def test_escalation_policy(self, test_incident_id: str) -> Dict:
        """Test escalation policy with a simulated incident"""
        
        print(f"Testing escalation policy with incident: {test_incident_id}")
        
        # Test SEV-1 escalation
        result = self.trigger_incident_escalation(
            incident_id=test_incident_id,
            severity=SeverityLevel.SEV_1,
            description="Test SEV-1 incident for escalation policy validation",
            emergency_call=True
        )
        
        return result

def setup_on_call_schema():
    """Setup database schema for on-call management"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            # Create on-call related tables if needed
            cur.execute("""
                create table if not exists on_call_schedules (
                    id bigserial primary key,
                    rotation_name text not null,
                    day_of_week smallint not null check (day_of_week between 0 and 6),
                    primary_contact uuid references profiles(id),
                    secondary_contact uuid references profiles(id),
                    timezone text default 'Asia/Beirut',
                    created_at timestamptz default now(),
                    unique (rotation_name, day_of_week)
                );
                
                create table if not exists escalation_logs (
                    id bigserial primary key,
                    incident_id text not null,
                    severity text not null,
                    escalation_data jsonb not null,
                    created_at timestamptz default now()
                );
                
                create index if not exists idx_escalation_logs_incident 
                on escalation_logs(incident_id);
                
                create index if not exists idx_escalation_logs_created 
                on escalation_logs(created_at desc);
            """)
            
            # Insert default rotation if not exists
            cur.execute("""
                insert into on_call_schedules (rotation_name, day_of_week, timezone)
                select 'samia-tarot-rotation', day_of_week, 'Asia/Beirut'
                from generate_series(0, 6) as day_of_week
                on conflict (rotation_name, day_of_week) do nothing;
            """)
            
        print("On-call schema setup completed")
        
    except Exception as e:
        print(f"Error setting up on-call schema: {e}")
    finally:
        POOL.putconn(conn)

def main():
    """Main function for on-call service operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python on_call_escalation_service.py setup           # Setup database schema")
        print("  python on_call_escalation_service.py test            # Test escalation policy")
        print("  python on_call_escalation_service.py escalate <incident_id> <severity> [emergency]")
        print("                                                        # Trigger escalation")
        print("  python on_call_escalation_service.py status <incident_id>  # Check escalation status")
        return False
    
    command = sys.argv[1].lower()
    service = OnCallService()
    
    if command == 'setup':
        setup_on_call_schema()
        print("On-call escalation service setup completed")
        return True
    
    elif command == 'test':
        test_incident_id = f"TEST-{int(time.time())}"
        result = service.test_escalation_policy(test_incident_id)
        
        print("Escalation Policy Test Results:")
        print(f"Incident ID: {result['incident_id']}")
        print(f"Severity: {result['severity']}")
        print(f"Emergency Call: {result['emergency_call']}")
        print(f"Escalation Steps: {len(result['escalation_steps'])}")
        
        for i, step in enumerate(result['escalation_steps']):
            print(f"  Step {i+1}: {step['level']} - {len(step['contacts_notified'])} contacts notified")
        
        return True
    
    elif command == 'escalate':
        if len(sys.argv) < 4:
            print("Usage: escalate <incident_id> <severity> [emergency]")
            return False
        
        incident_id = sys.argv[2]
        severity_str = sys.argv[3].upper().replace('-', '_')
        emergency_call = len(sys.argv) > 4 and sys.argv[4].lower() == 'emergency'
        
        try:
            severity = SeverityLevel(severity_str)
        except ValueError:
            print(f"Invalid severity: {severity_str}. Use SEV-1, SEV-2, or SEV-3")
            return False
        
        result = service.trigger_incident_escalation(
            incident_id=incident_id,
            severity=severity,
            description=f"Manual escalation for {incident_id}",
            emergency_call=emergency_call
        )
        
        print(f"Escalation triggered for incident {incident_id}")
        print(f"Severity: {severity.value}")
        print(f"Emergency Call: {emergency_call}")
        print(f"Escalation steps: {len(result['escalation_steps'])}")
        
        return True
    
    elif command == 'status':
        if len(sys.argv) < 3:
            print("Usage: status <incident_id>")
            return False
        
        incident_id = sys.argv[2]
        status = service.get_escalation_status(incident_id)
        
        print(f"Escalation Status for {incident_id}:")
        print(json.dumps(status, indent=2))
        
        return True
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)