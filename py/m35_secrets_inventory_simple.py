#!/usr/bin/env python3
"""
M35 Secrets Inventory - Simple and maintainable version
"""
import os
import json
from datetime import datetime

def inventory_secrets():
    """Simple secrets inventory without file scanning"""
    print("M35 SECRETS INVENTORY")
    print("=" * 30)

    # Define expected secrets from context document
    secrets_catalog = {
        # Database
        'DB_DSN': {
            'type': 'database',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Supabase',
            'usage': 'Database connection string'
        },

        # Supabase
        'SUPABASE_URL': {
            'type': 'supabase_url',
            'priority': 'low',
            'rotation_days': 365,
            'owner': 'Supabase',
            'usage': 'API endpoint'
        },
        'SUPABASE_ANON': {
            'type': 'supabase_anon',
            'priority': 'medium',
            'rotation_days': 90,
            'owner': 'Supabase',
            'usage': 'Anonymous client access'
        },
        'SUPABASE_SERVICE': {
            'type': 'supabase_service',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Supabase',
            'usage': 'Server-side admin access'
        },

        # Stripe
        'STRIPE_PUBLISHABLE_KEY': {
            'type': 'stripe_publishable',
            'priority': 'low',
            'rotation_days': 365,
            'owner': 'Stripe',
            'usage': 'Client-side payments'
        },
        'STRIPE_SECRET_KEY': {
            'type': 'stripe_secret',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Stripe',
            'usage': 'Server-side payments API'
        },
        'STRIPE_WEBHOOK_SECRET': {
            'type': 'stripe_webhook',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Stripe',
            'usage': 'Webhook HMAC verification'
        },

        # Twilio
        'TWILIO_ACCOUNT_SID': {
            'type': 'twilio_sid',
            'priority': 'medium',
            'rotation_days': 90,
            'owner': 'Twilio',
            'usage': 'Account identifier'
        },
        'TWILIO_AUTH_TOKEN': {
            'type': 'twilio_auth',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Twilio',
            'usage': 'API authentication'
        },
        'TWILIO_VERIFY_SID': {
            'type': 'twilio_verify',
            'priority': 'medium',
            'rotation_days': 90,
            'owner': 'Twilio',
            'usage': 'Phone verification service'
        },

        # Notifications
        'FCM_SERVICE_ACCOUNT_JSON': {
            'type': 'fcm_service',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Google/Firebase',
            'usage': 'Push notifications'
        },
        'SMTP_HOST': {
            'type': 'smtp_host',
            'priority': 'low',
            'rotation_days': 365,
            'owner': 'SMTP Provider',
            'usage': 'Email server'
        },
        'SMTP_USER': {
            'type': 'smtp_user',
            'priority': 'medium',
            'rotation_days': 90,
            'owner': 'SMTP Provider',
            'usage': 'Email authentication'
        },
        'SMTP_PASS': {
            'type': 'smtp_password',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'SMTP Provider',
            'usage': 'Email password'
        },

        # GitHub Actions
        'LHCI_GITHUB_APP_TOKEN': {
            'type': 'github_app',
            'priority': 'medium',
            'rotation_days': 90,
            'owner': 'GitHub',
            'usage': 'Lighthouse CI status checks'
        },

        # Security & Operations
        'JOB_TOKEN': {
            'type': 'job_token',
            'priority': 'high',
            'rotation_days': 30,
            'owner': 'Internal',
            'usage': 'Background job authentication'
        },
        'PUBLIC_WEBHOOK_BASE': {
            'type': 'webhook_url',
            'priority': 'low',
            'rotation_days': 365,
            'owner': 'ngrok/Domain',
            'usage': 'Public webhook endpoint'
        }
    }

    # Check which secrets are actually set
    env_status = {}
    for secret_name in secrets_catalog.keys():
        value = os.getenv(secret_name)
        env_status[secret_name] = {
            'present': value is not None,
            'has_value': bool(value and value.strip()),
            'length': len(value) if value else 0,
            'is_placeholder': value and any(placeholder in value.lower()
                                          for placeholder in ['[', 'replace', 'your_', 'example']) if value else False
        }

    # Generate rotation schedule
    rotation_schedule = {
        'immediate': [],
        '30_days': [],
        '90_days': [],
        '365_days': []
    }

    present_secrets = 0
    configured_secrets = 0
    placeholder_secrets = 0

    print("SECRET STATUS:")
    print("-" * 50)

    for secret_name, config in secrets_catalog.items():
        status = env_status[secret_name]
        present = status['present']
        has_value = status['has_value']
        is_placeholder = status['is_placeholder']

        if present:
            present_secrets += 1
        if has_value and not is_placeholder:
            configured_secrets += 1
        if is_placeholder:
            placeholder_secrets += 1

        # Status indicator
        if not present:
            indicator = "MISSING"
        elif is_placeholder:
            indicator = "PLACEHOLDER"
        elif has_value:
            indicator = "CONFIGURED"
        else:
            indicator = "EMPTY"

        print(f"{secret_name:25} | {indicator:12} | {config['priority']:6} | {config['owner']}")

        # Add to rotation schedule if configured
        if has_value and not is_placeholder:
            rotation_days = config['rotation_days']
            if rotation_days <= 30:
                rotation_schedule['30_days'].append(secret_name)
            elif rotation_days <= 90:
                rotation_schedule['90_days'].append(secret_name)
            else:
                rotation_schedule['365_days'].append(secret_name)

    # Summary
    print(f"\nSUMMARY:")
    print(f"  Total secrets defined: {len(secrets_catalog)}")
    print(f"  Present in environment: {present_secrets}")
    print(f"  Properly configured: {configured_secrets}")
    print(f"  Placeholder values: {placeholder_secrets}")
    print(f"  Missing secrets: {len(secrets_catalog) - present_secrets}")

    # Rotation schedule
    print(f"\nROTATION SCHEDULE:")
    print(f"  30 days (high-risk): {len(rotation_schedule['30_days'])}")
    for secret in rotation_schedule['30_days']:
        print(f"    - {secret}")

    print(f"  90 days (medium-risk): {len(rotation_schedule['90_days'])}")
    for secret in rotation_schedule['90_days']:
        print(f"    - {secret}")

    print(f"  365 days (low-risk): {len(rotation_schedule['365_days'])}")
    for secret in rotation_schedule['365_days']:
        print(f"    - {secret}")

    # Generate GitHub Actions secrets check
    print(f"\nGITHUB ACTIONS SECRETS NEEDED:")
    github_secrets = ['DB_DSN', 'SUPABASE_URL', 'SUPABASE_ANON', 'SUPABASE_SERVICE']
    for secret in github_secrets:
        print(f"  - {secret}")

    # Security recommendations
    print(f"\nSECURITY RECOMMENDATIONS:")
    if placeholder_secrets > 0:
        print(f"  - Replace {placeholder_secrets} placeholder values")
    if len(secrets_catalog) - present_secrets > 0:
        print(f"  - Configure {len(secrets_catalog) - present_secrets} missing secrets")
    print(f"  - Set up automated rotation for high-priority secrets")
    print(f"  - Use GitHub Repository Secrets (not environment files in production)")
    print(f"  - Enable expiry tracking for PATs and service accounts")

    # Create audit record
    audit_record = {
        'timestamp': datetime.now().isoformat(),
        'total_secrets': len(secrets_catalog),
        'configured_secrets': configured_secrets,
        'rotation_schedule': rotation_schedule,
        'next_rotation_due': datetime.now().strftime('%Y-%m-%d'),
        'audit_completed_by': 'M35_implementation'
    }

    # Save audit record
    with open('secrets_audit_record.json', 'w') as f:
        json.dump(audit_record, f, indent=2)

    print(f"\nAudit record saved to secrets_audit_record.json")
    return audit_record

if __name__ == "__main__":
    inventory_secrets()