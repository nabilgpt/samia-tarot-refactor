# M42 Operational Runbooks & Disaster Recovery

## Overview

This directory contains operational runbooks for SAMIA TAROT production systems. All procedures are designed for minimal downtime and maximum security.

## Quick Reference

| System | Runbook | Emergency Contact |
|--------|---------|------------------|
| **Siren/Alerting** | [siren-oncall.md](./siren-oncall.md) | M40 escalation policy |
| **Incidents** | [incident-response.md](./incident-response.md) | Predefined RACI matrix |
| **Backups** | [backup-restore.md](./backup-restore.md) | Automated verification |
| **Security** | [key-rotation.md](./key-rotation.md) | M35 rotation schedule |
| **Legal/Compliance** | [legal-compliance.md](./legal-compliance.md) | M38 consent/age-gate |
| **Performance** | [performance-monitoring.md](./performance-monitoring.md) | M36 CI budgets |
| **WhatsApp** | [whatsapp-operations.md](./whatsapp-operations.md) | M41 24h/templates |

## Critical Scripts

```bash
# Daily operations
./scripts/ops/backup_verify.sh          # Backup integrity check
./scripts/ops/audit_snapshot.sql        # Security posture audit
./scripts/ops/performance_check.sh      # Core Web Vitals check

# Emergency procedures
./scripts/ops/emergency_rollback.sh     # Fast rollback
./scripts/ops/siren_silence.sh          # Emergency alert silence
./scripts/ops/key_rotation_emergency.sh # Emergency key rotation
```

## Automation

- **Nightly Audit**: Runs `audit_snapshot.sql` and creates GitHub issues on failures
- **Backup Verification**: Daily restore test with signed evidence
- **Performance Monitoring**: Core Web Vitals tracking with budget enforcement
- **Siren Integration**: Auto-escalation based on M40 policies

## Compliance

- **RLS Enforcement**: All tables FORCE RLS enabled
- **Audit Trails**: Complete activity logging
- **Key Rotation**: M35 automated schedule
- **Legal Compliance**: M38 age-gate and consent tracking
- **Data Retention**: Automated cleanup based on policies

## Emergency Contacts

```
Primary On-Call: M40 Siren Escalation Policy
Secondary: GitHub Issues with @team mentions
Escalation: Email/SMS via Twilio Verify integration
```

## Last Updated

This documentation is automatically updated with each system deployment.