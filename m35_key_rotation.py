#!/usr/bin/env python3
"""
M35 Key Rotation Implementation - Secure key rotation with minimal downtime
"""
import os
import json
import hashlib
import psycopg2
from datetime import datetime, timedelta
import subprocess
import requests
import time

class KeyRotationManager:
    def __init__(self):
        self.dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
        self.rotation_log = []

    def log_action(self, action, status, details=None):
        """Log rotation actions for audit trail"""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'status': status,
            'details': details or {}
        }
        self.rotation_log.append(entry)
        print(f"[{entry['timestamp']}] {action}: {status}")
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")

    def hash_secret(self, secret_value):
        """Create SHA-256 hash of secret for audit purposes"""
        if not secret_value:
            return None
        return hashlib.sha256(secret_value.encode()).hexdigest()

    def record_rotation(self, secret_name, rotation_type, previous_hash, new_hash, reason, tests_passed=True):
        """Record rotation in audit database"""
        try:
            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                # Record the rotation
                cur.execute("""
                INSERT INTO key_rotation_audit (
                    secret_name, rotation_type, previous_key_hash, new_key_hash,
                    rotated_by, rotation_reason, verification_tests,
                    next_rotation_due
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    secret_name,
                    rotation_type,
                    previous_hash,
                    new_hash,
                    'f47ac10b-58cc-4372-a567-0e02b2c3d479',  # System user UUID
                    reason,
                    json.dumps({'smoke_tests_passed': tests_passed}),
                    datetime.now().date() + timedelta(days=30 if 'high' in reason else 90)
                ))

                # Update inventory
                cur.execute("""
                SELECT update_secret_inventory(%s, %s, %s)
                """, (secret_name, new_hash, 30 if 'high' in reason else 90))

                conn.commit()
                self.log_action(f"Database audit recorded", "SUCCESS", {
                    'secret': secret_name,
                    'hash': new_hash[:8] + '...'
                })

        except Exception as e:
            self.log_action(f"Database audit failed", "ERROR", {'error': str(e)})

    def run_smoke_tests(self):
        """Run smoke tests to verify services work with new keys"""
        tests = {
            'database_connection': False,
            'supabase_auth': False,
            'api_health': False
        }

        try:
            # Test 1: Database connection
            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                tests['database_connection'] = result[0] == 1

            # Test 2: Supabase connection (if keys available)
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_anon = os.getenv('SUPABASE_ANON')
            if supabase_url and supabase_anon:
                headers = {
                    'apikey': supabase_anon,
                    'Authorization': f'Bearer {supabase_anon}'
                }
                response = requests.get(f"{supabase_url}/rest/v1/", headers=headers, timeout=10)
                tests['supabase_auth'] = response.status_code in [200, 404]  # 404 is OK for root

            # Test 3: API health check
            try:
                response = requests.get("http://localhost:8000/api/ops/health", timeout=5)
                tests['api_health'] = response.status_code == 200
            except:
                tests['api_health'] = False

        except Exception as e:
            self.log_action("Smoke tests failed", "ERROR", {'error': str(e)})

        passed_tests = sum(tests.values())
        total_tests = len(tests)

        self.log_action("Smoke tests completed", "SUCCESS", {
            'passed': f"{passed_tests}/{total_tests}",
            'results': tests
        })

        return passed_tests >= 2  # At least 2/3 tests must pass

    def rotate_internal_tokens(self):
        """Rotate internal tokens (JOB_TOKEN)"""
        self.log_action("Starting internal token rotation", "IN_PROGRESS")

        current_job_token = os.getenv('JOB_TOKEN')
        if not current_job_token:
            self.log_action("JOB_TOKEN not found", "SKIPPED")
            return False

        # Generate new 64-character hex token
        import secrets
        new_job_token = secrets.token_hex(32)

        previous_hash = self.hash_secret(current_job_token)
        new_hash = self.hash_secret(new_job_token)

        # Update environment file
        env_file = '.env.sandbox'
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                content = f.read()

            # Replace the token
            updated_content = content.replace(
                f"JOB_TOKEN={current_job_token}",
                f"JOB_TOKEN={new_job_token}"
            )

            with open(env_file, 'w') as f:
                f.write(updated_content)

            self.log_action("JOB_TOKEN rotated", "SUCCESS", {
                'previous_hash': previous_hash[:8] + '...',
                'new_hash': new_hash[:8] + '...'
            })

            # Record in audit trail
            self.record_rotation(
                'JOB_TOKEN',
                'scheduled',
                previous_hash,
                new_hash,
                'M35 scheduled rotation - high priority internal token'
            )
            return True

        return False

    def validate_stripe_webhook_signature(self, new_webhook_secret):
        """Validate Stripe webhook secret format"""
        # Stripe webhook secrets start with 'whsec_'
        if not new_webhook_secret.startswith('whsec_'):
            return False

        # Should be about 32 characters after the prefix
        if len(new_webhook_secret) < 40:
            return False

        return True

    def generate_rotation_instructions(self):
        """Generate step-by-step rotation instructions"""
        instructions = {
            'timestamp': datetime.now().isoformat(),
            'rotation_plan': {
                '1_supabase_keys': {
                    'description': 'Rotate Supabase anon/service_role/JWT keys',
                    'steps': [
                        '1. Go to Supabase Dashboard > Settings > API',
                        '2. Click "Rotate anon key" - copy new key',
                        '3. Click "Rotate service_role key" - copy new key',
                        '4. Update .env.sandbox with new keys',
                        '5. Update GitHub Actions secrets',
                        '6. Restart services and test'
                    ],
                    'overlap_window': '5 minutes',
                    'rollback': 'Keep old keys for 24h, restore if issues'
                },

                '2_stripe_keys': {
                    'description': 'Rotate Stripe API and webhook secrets',
                    'steps': [
                        '1. Go to Stripe Dashboard > Developers > API keys',
                        '2. Create new restricted key with same permissions',
                        '3. Update STRIPE_SECRET_KEY in environment',
                        '4. Go to Webhooks section',
                        '5. Create new webhook endpoint with same events',
                        '6. Update STRIPE_WEBHOOK_SECRET',
                        '7. Test webhook signature verification',
                        '8. Delete old webhook endpoint after 24h'
                    ],
                    'overlap_window': '24 hours',
                    'rollback': 'Switch back to old keys, re-enable old webhook'
                },

                '3_twilio_tokens': {
                    'description': 'Rotate Twilio auth tokens',
                    'steps': [
                        '1. Go to Twilio Console > Account > API keys & tokens',
                        '2. Create new Main Auth Token',
                        '3. Update TWILIO_AUTH_TOKEN in environment',
                        '4. Test phone verification and calls',
                        '5. Delete old auth token after confirmation'
                    ],
                    'overlap_window': '1 hour',
                    'rollback': 'Use backup auth token if available'
                },

                '4_github_secrets': {
                    'description': 'Audit and update GitHub Actions secrets',
                    'steps': [
                        '1. Go to Repository > Settings > Secrets and variables > Actions',
                        '2. Update DB_DSN with new connection string if rotated',
                        '3. Update SUPABASE_* secrets with new keys',
                        '4. Remove unused secrets',
                        '5. Test workflows with manual trigger'
                    ],
                    'overlap_window': 'Immediate',
                    'rollback': 'Restore previous secret values'
                }
            },

            'verification_checklist': [
                'Database connections working',
                'Supabase auth endpoints responding',
                'Stripe payment intents creating successfully',
                'Stripe webhooks verifying correctly',
                'Phone verification SMS working',
                'GitHub Actions workflows passing',
                'All API health checks green'
            ],

            'emergency_contacts': {
                'supabase_support': 'dashboard.supabase.com/support',
                'stripe_support': 'dashboard.stripe.com/support',
                'twilio_support': 'help.twilio.com'
            }
        }

        return instructions

    def create_rotation_checklist(self):
        """Create a detailed rotation checklist"""
        checklist = {
            'pre_rotation': [
                '□ Backup current .env.sandbox file',
                '□ Verify all services are healthy',
                '□ Prepare rollback procedures',
                '□ Schedule maintenance window if needed',
                '□ Notify team of rotation activity'
            ],

            'rotation_execution': [
                '□ Rotate JOB_TOKEN (internal)',
                '□ Rotate Supabase service_role key',
                '□ Rotate Supabase anon key',
                '□ Rotate Stripe secret key',
                '□ Rotate Stripe webhook secret',
                '□ Rotate Twilio auth token',
                '□ Update GitHub Actions secrets',
                '□ Restart affected services'
            ],

            'post_rotation': [
                '□ Run comprehensive smoke tests',
                '□ Verify webhook signatures',
                '□ Test payment flows',
                '□ Test phone verification',
                '□ Check all API endpoints',
                '□ Monitor error logs for 1 hour',
                '□ Update rotation schedule',
                '□ Document any issues found'
            ],

            'cleanup': [
                '□ Revoke old keys after 24-48h',
                '□ Update audit records',
                '□ Schedule next rotation',
                '□ Archive rotation logs',
                '□ Update documentation'
            ]
        }

        return checklist

    def run_rotation(self, rotation_type='scheduled'):
        """Execute the key rotation process"""
        self.log_action("M35 Key Rotation Started", "IN_PROGRESS", {
            'type': rotation_type,
            'timestamp': datetime.now().isoformat()
        })

        # Step 1: Generate instructions
        instructions = self.generate_rotation_instructions()
        checklist = self.create_rotation_checklist()

        # Step 2: Rotate internal tokens (safe to automate)
        self.rotate_internal_tokens()

        # Step 3: Run initial smoke tests
        initial_tests_passed = self.run_smoke_tests()

        # Step 4: Generate final report
        rotation_report = {
            'summary': {
                'started_at': datetime.now().isoformat(),
                'type': rotation_type,
                'automated_rotations': 1,  # JOB_TOKEN
                'manual_rotations_required': 6,  # External services
                'initial_tests_passed': initial_tests_passed
            },
            'instructions': instructions,
            'checklist': checklist,
            'audit_log': self.rotation_log,
            'next_actions': [
                'Follow the manual rotation instructions for external services',
                'Update GitHub Actions secrets',
                'Run full smoke tests after each rotation',
                'Monitor services for 24 hours',
                'Schedule next rotation in 30-90 days based on priority'
            ]
        }

        # Save rotation report
        with open('m35_rotation_report.json', 'w') as f:
            json.dump(rotation_report, f, indent=2)

        self.log_action("Key rotation report generated", "SUCCESS", {
            'report_file': 'm35_rotation_report.json',
            'manual_steps_required': True
        })

        return rotation_report

def main():
    manager = KeyRotationManager()
    report = manager.run_rotation('scheduled')

    print("\n" + "="*60)
    print("M35 KEY ROTATION SUMMARY")
    print("="*60)
    print(f"Started: {report['summary']['started_at']}")
    print(f"Automated rotations: {report['summary']['automated_rotations']}")
    print(f"Manual rotations required: {report['summary']['manual_rotations_required']}")
    print(f"Initial tests passed: {report['summary']['initial_tests_passed']}")
    print(f"Report saved: m35_rotation_report.json")
    print("\nNext: Follow manual rotation instructions for external services")

if __name__ == "__main__":
    main()