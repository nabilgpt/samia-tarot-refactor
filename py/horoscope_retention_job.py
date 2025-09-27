#!/usr/bin/env python3
"""
Horoscope Retention Job - 60-day cleanup
Deletes horoscopes older than 60 days from both DB and Supabase Storage
Run daily via cron/n8n automation
"""

import os
import sys
import logging
from datetime import datetime, timedelta
import psycopg2
import requests

# Database connection
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ciwddvprfhlqidfzklaq.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "audio")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_expired_horoscopes():
    """Get horoscopes older than 60 days"""
    cutoff_date = datetime.now().date() - timedelta(days=60)

    query = """
    SELECT h.id, h.ref_date, h.zodiac, h.scope,
           ma.url as audio_url, ma.sha256 as audio_hash
    FROM horoscopes h
    LEFT JOIN media_assets ma ON h.audio_media_id = ma.id
    WHERE h.ref_date < %s
    ORDER BY h.ref_date ASC
    """

    with psycopg2.connect(DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (cutoff_date,))
            results = cur.fetchall()

    return [
        {
            'id': row[0],
            'ref_date': row[1],
            'zodiac': row[2],
            'scope': row[3],
            'audio_url': row[4],
            'audio_hash': row[5]
        }
        for row in results
    ]

def delete_storage_files(expired_horoscopes):
    """Delete audio files from Supabase Storage using REST API"""
    if not SUPABASE_SERVICE_KEY:
        logger.warning("SUPABASE_SERVICE_KEY not set - skipping storage cleanup")
        return

    deleted_count = 0

    for horoscope in expired_horoscopes:
        if not horoscope['audio_url']:
            continue

        try:
            # Extract storage path from URL
            # URL format: https://.../storage/v1/object/public/audio/path/to/file.mp3
            url_parts = horoscope['audio_url'].split(f'/{SUPABASE_BUCKET}/')
            if len(url_parts) < 2:
                logger.warning(f"Cannot parse storage path from: {horoscope['audio_url']}")
                continue

            storage_path = url_parts[1]

            # Delete using Supabase REST API
            delete_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
            headers = {
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'Content-Type': 'application/json'
            }

            response = requests.delete(delete_url, headers=headers)

            if response.status_code == 200:
                logger.info(f"Deleted storage file: {storage_path}")
                deleted_count += 1
            else:
                logger.warning(f"Failed to delete storage file {storage_path}: {response.status_code}")

        except Exception as e:
            logger.error(f"Error deleting storage file for horoscope {horoscope['id']}: {e}")

    return deleted_count

def delete_database_records(expired_horoscopes):
    """Delete horoscope records from database"""
    if not expired_horoscopes:
        return 0

    horoscope_ids = [h['id'] for h in expired_horoscopes]

    delete_query = """
    DELETE FROM horoscopes
    WHERE id = ANY(%s)
    RETURNING id, ref_date, zodiac, scope
    """

    with psycopg2.connect(DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(delete_query, (horoscope_ids,))
            deleted_records = cur.fetchall()
            conn.commit()

    return len(deleted_records)

def log_retention_activity(deleted_db_count, deleted_storage_count, total_processed):
    """Log retention job activity to audit trail"""
    audit_query = """
    INSERT INTO audit_log (
        actor, actor_role, event, entity, entity_id, meta, created_at
    ) VALUES (
        'system', 'automation', 'horoscope_retention_cleanup', 'horoscopes', 'batch',
        %s, NOW()
    )
    """

    metadata = {
        'deleted_db_records': deleted_db_count,
        'deleted_storage_files': deleted_storage_count,
        'total_processed': total_processed,
        'cutoff_date': (datetime.now().date() - timedelta(days=60)).isoformat(),
        'job_run_at': datetime.now().isoformat()
    }

    try:
        with psycopg2.connect(DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(audit_query, (metadata,))
                conn.commit()
        logger.info("Retention activity logged to audit trail")
    except Exception as e:
        logger.error(f"Failed to log retention activity: {e}")

def main():
    """Main retention job execution"""
    logger.info("Starting horoscope retention job (60-day cleanup)")

    try:
        # Get expired horoscopes
        expired_horoscopes = get_expired_horoscopes()
        total_count = len(expired_horoscopes)

        if total_count == 0:
            logger.info("No expired horoscopes found - job complete")
            return

        logger.info(f"Found {total_count} expired horoscopes to process")

        # Delete storage files first
        deleted_storage_count = delete_storage_files(expired_horoscopes)

        # Delete database records
        deleted_db_count = delete_database_records(expired_horoscopes)

        # Log activity
        log_retention_activity(deleted_db_count, deleted_storage_count, total_count)

        logger.info(f"Retention job completed successfully:")
        logger.info(f"  - Database records deleted: {deleted_db_count}")
        logger.info(f"  - Storage files deleted: {deleted_storage_count}")
        logger.info(f"  - Total processed: {total_count}")

    except Exception as e:
        logger.error(f"Retention job failed: {e}")

        # Log failure to audit trail
        try:
            audit_query = """
            INSERT INTO audit_log (
                actor, actor_role, event, entity, entity_id, meta, created_at
            ) VALUES (
                'system', 'automation', 'horoscope_retention_failure', 'horoscopes', 'batch',
                %s, NOW()
            )
            """

            error_metadata = {
                'error_message': str(e),
                'job_failed_at': datetime.now().isoformat()
            }

            with psycopg2.connect(DSN) as conn:
                with conn.cursor() as cur:
                    cur.execute(audit_query, (error_metadata,))
                    conn.commit()
        except:
            pass  # Don't fail on logging failure

        sys.exit(1)

if __name__ == "__main__":
    main()