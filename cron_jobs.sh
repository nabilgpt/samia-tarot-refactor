#!/bin/bash
# Cron jobs configuration for SAMIA-TAROT platform
# Add to crontab with: crontab cron_jobs.sh

# Daily horoscope retention job (run at 2 AM daily)
0 2 * * * cd /app && python horoscope_retention_job.py >> /var/log/horoscope_retention.log 2>&1

# Weekly storage audit (run Sundays at 3 AM)
0 3 * * 0 cd /app && python storage_audit.py >> /var/log/storage_audit.log 2>&1

# Daily invoice cleanup (run at 1 AM daily)
0 1 * * * cd /app && python -c "
import psycopg2
import os
from datetime import datetime, timedelta

DSN = os.getenv('DB_DSN', 'postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres')

# Clean up temporary invoice access records older than 7 days
with psycopg2.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute('''
            DELETE FROM invoice_access_audit
            WHERE created_at < NOW() - INTERVAL '7 days'
        ''')
        deleted = cur.rowcount
        if deleted > 0:
            print(f'Cleaned {deleted} old invoice access records')
        conn.commit()
" >> /var/log/invoice_cleanup.log 2>&1

# Monthly key rotation check (1st day of month at 4 AM)
0 4 1 * * cd /app && python -c "
import psycopg2
import os
from datetime import datetime, timedelta

DSN = os.getenv('DB_DSN', 'postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres')

# Check for keys older than 90 days
with psycopg2.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT secret_name, last_rotated_at
            FROM secret_inventory
            WHERE last_rotated_at < NOW() - INTERVAL '90 days'
            AND is_active = true
        ''')
        old_keys = cur.fetchall()

        if old_keys:
            print(f'WARNING: {len(old_keys)} keys need rotation:')
            for name, date in old_keys:
                print(f'  - {name}: last rotated {date}')
        else:
            print('All keys are within 90-day rotation policy')
" >> /var/log/key_rotation_check.log 2>&1

# Rate limit counters reset (every 15 minutes)
*/15 * * * * cd /app && python -c "
import psycopg2
import os

DSN = os.getenv('DB_DSN', 'postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres')

# Reset sliding window rate limit counters
with psycopg2.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute('''
            UPDATE api_rate_limits
            SET current_count = GREATEST(0, current_count - (window_size / 4))
            WHERE last_reset < NOW() - INTERVAL '15 minutes'
        ''')
        cur.execute('UPDATE api_rate_limits SET last_reset = NOW()')
        conn.commit()
" >> /var/log/rate_limit_reset.log 2>&1