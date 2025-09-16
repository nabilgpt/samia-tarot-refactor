#!/usr/bin/env python3
"""
M35 Secrets Inventory - Comprehensive audit of all secrets and their owners
"""
import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

class SecretsInventory:
    def __init__(self):
        self.inventory = {
            'timestamp': datetime.now().isoformat(),
            'secrets': {},
            'risks': [],
            'recommendations': []
        }

    def scan_environment_files(self):
        """Scan for secrets in environment files"""
        env_files = ['.env', '.env.example', '.env.sandbox', '.env.production']

        for env_file in env_files:
            if os.path.exists(env_file):
                print(f"Scanning {env_file}...")
                with open(env_file, 'r') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip()

                            if self.is_secret(key):
                                self.add_secret(key, {
                                    'type': self.classify_secret(key),
                                    'location': env_file,
                                    'line': line_num,
                                    'has_value': bool(value and value != ''),
                                    'is_placeholder': self.is_placeholder(value),
                                    'rotation_priority': self.get_rotation_priority(key)
                                })

    def scan_github_workflows(self):
        """Scan GitHub workflows for secret references"""
        workflow_dir = Path('.github/workflows')
        if workflow_dir.exists():
            print("Scanning GitHub workflows...")
            for workflow_file in workflow_dir.glob('*.yml'):
                with open(workflow_file, 'r') as f:
                    content = f.read()

                # Find secret references
                secret_refs = re.findall(r'\$\{\{\s*secrets\.([A-Z_]+)\s*\}\}', content)
                for secret_name in secret_refs:
                    self.add_secret(f"GH_SECRETS.{secret_name}", {
                        'type': 'github_actions',
                        'location': str(workflow_file),
                        'has_value': 'unknown',
                        'is_placeholder': False,
                        'rotation_priority': 'medium'
                    })

    def scan_code_for_hardcoded_secrets(self):
        """Scan code files for potential hardcoded secrets"""
        print("Scanning code for hardcoded secrets...")
        patterns = [
            (r'sk_[a-zA-Z0-9_]+', 'stripe_secret'),
            (r'pk_[a-zA-Z0-9_]+', 'stripe_publishable'),
            (r'whsec_[a-zA-Z0-9_]+', 'stripe_webhook'),
            (r'eyJ[a-zA-Z0-9_-]+', 'jwt_token'),
            (r'postgres://[^/\s]+:[^@\s]+@[^\s]+', 'database_dsn')
        ]

        code_files = list(Path('.').glob('**/*.py'))
        code_files.extend(Path('.').glob('**/*.js'))
        code_files.extend(Path('.').glob('**/*.json'))

        for file_path in code_files:
            if '.git' in str(file_path) or 'node_modules' in str(file_path):
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                for pattern, secret_type in patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        self.risks.append(f"Potential hardcoded {secret_type} in {file_path}")
            except:
                continue

    def is_secret(self, key):
        """Determine if a key represents a secret"""
        secret_keywords = [
            'key', 'secret', 'token', 'password', 'pass', 'auth', 'credential',
            'dsn', 'url', 'webhook', 'api', 'sid', 'account'
        ]
        return any(keyword.lower() in key.lower() for keyword in secret_keywords)

    def classify_secret(self, key):
        """Classify secret type based on key name"""
        key_lower = key.lower()

        if 'supabase' in key_lower:
            if 'anon' in key_lower:
                return 'supabase_anon'
            elif 'service' in key_lower:
                return 'supabase_service'
            else:
                return 'supabase_other'
        elif 'stripe' in key_lower:
            if 'webhook' in key_lower:
                return 'stripe_webhook'
            elif 'publishable' in key_lower or 'pk_' in key_lower:
                return 'stripe_publishable'
            else:
                return 'stripe_secret'
        elif 'twilio' in key_lower:
            return 'twilio'
        elif 'fcm' in key_lower:
            return 'fcm'
        elif 'smtp' in key_lower:
            return 'smtp'
        elif 'db' in key_lower or 'database' in key_lower:
            return 'database'
        elif 'github' in key_lower or 'lhci' in key_lower:
            return 'github'
        elif 'ngrok' in key_lower:
            return 'ngrok'
        else:
            return 'other'

    def is_placeholder(self, value):
        """Check if value appears to be a placeholder"""
        placeholders = ['[', 'your_', 'replace_', 'change_', 'example']
        return any(placeholder in value.lower() for placeholder in placeholders)

    def get_rotation_priority(self, key):
        """Determine rotation priority based on secret type"""
        key_lower = key.lower()

        # High priority: Production keys with broad access
        if any(term in key_lower for term in ['service', 'webhook', 'secret']):
            return 'high'

        # Medium priority: API keys and tokens
        if any(term in key_lower for term in ['api', 'token', 'auth']):
            return 'medium'

        # Low priority: Read-only or public keys
        if any(term in key_lower for term in ['anon', 'publishable', 'public']):
            return 'low'

        return 'medium'

    def add_secret(self, name, details):
        """Add secret to inventory"""
        self.inventory['secrets'][name] = details

    def generate_rotation_schedule(self):
        """Generate recommended rotation schedule"""
        schedule = {
            'immediate': [],  # Hardcoded or compromised
            '30_days': [],    # High-risk production keys
            '90_days': [],    # Medium-risk API keys
            '365_days': []    # Low-risk or JWT signing keys
        }

        for name, details in self.inventory['secrets'].items():
            priority = details.get('rotation_priority', 'medium')
            secret_type = details.get('type', 'other')

            if not details.get('has_value') or details.get('is_placeholder'):
                continue

            if priority == 'high' or 'webhook' in secret_type:
                schedule['30_days'].append(name)
            elif priority == 'medium':
                schedule['90_days'].append(name)
            else:
                schedule['365_days'].append(name)

        return schedule

    def run_inventory(self):
        """Run complete secrets inventory"""
        print("M35 SECRETS INVENTORY")
        print("=" * 30)

        self.scan_environment_files()
        self.scan_github_workflows()
        self.scan_code_for_hardcoded_secrets()

        # Generate summary
        total_secrets = len(self.inventory['secrets'])
        high_priority = len([s for s in self.inventory['secrets'].values()
                           if s.get('rotation_priority') == 'high'])

        print(f"\nSUMMARY:")
        print(f"  Total secrets found: {total_secrets}")
        print(f"  High priority secrets: {high_priority}")
        print(f"  Security risks: {len(self.risks)}")

        # Show secret breakdown by type
        types = {}
        for secret in self.inventory['secrets'].values():
            secret_type = secret.get('type', 'unknown')
            types[secret_type] = types.get(secret_type, 0) + 1

        print(f"\nSECRETS BY TYPE:")
        for secret_type, count in sorted(types.items()):
            print(f"  {secret_type}: {count}")

        # Show rotation schedule
        schedule = self.generate_rotation_schedule()
        print(f"\nROTATION SCHEDULE:")
        print(f"  30 days (high-risk): {len(schedule['30_days'])}")
        print(f"  90 days (medium-risk): {len(schedule['90_days'])}")
        print(f"  365 days (low-risk): {len(schedule['365_days'])}")

        # Show risks
        if self.risks:
            print(f"\nSECURITY RISKS:")
            for risk in self.risks:
                print(f"  - {risk}")

        # Generate recommendations
        self.generate_recommendations()

        if self.recommendations:
            print(f"\nRECOMMENDATIONS:")
            for rec in self.recommendations:
                print(f"  - {rec}")

        return self.inventory

    def generate_recommendations(self):
        """Generate security recommendations"""
        # Check for hardcoded secrets
        if self.risks:
            self.recommendations.append("Remove hardcoded secrets from code")

        # Check for missing GitHub secrets
        github_refs = [name for name in self.inventory['secrets'].keys()
                      if name.startswith('GH_SECRETS')]
        if github_refs:
            self.recommendations.append("Verify all GitHub secrets are configured")

        # Check for high-priority secrets
        high_priority = [name for name, details in self.inventory['secrets'].items()
                        if details.get('rotation_priority') == 'high']
        if high_priority:
            self.recommendations.append(f"Rotate {len(high_priority)} high-priority secrets immediately")

        # Check for placeholders in production files
        prod_placeholders = [name for name, details in self.inventory['secrets'].items()
                           if details.get('is_placeholder') and 'production' in details.get('location', '')]
        if prod_placeholders:
            self.recommendations.append("Replace placeholder values in production environment files")

    def save_inventory(self, filename='secrets_inventory.json'):
        """Save inventory to file"""
        with open(filename, 'w') as f:
            json.dump(self.inventory, f, indent=2)
        print(f"\nInventory saved to {filename}")

def main():
    inventory = SecretsInventory()
    result = inventory.run_inventory()
    inventory.save_inventory()
    return result

if __name__ == "__main__":
    main()