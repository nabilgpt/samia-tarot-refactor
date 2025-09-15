#!/usr/bin/env python3
import os
import psycopg2

def check_table_columns():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    tables_to_check = ['payment_events', 'invoices', 'refunds', 'deletion_requests', 'assist_drafts', 'assist_sessions']

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                for table in tables_to_check:
                    print(f"\n{table.upper()} COLUMNS:")
                    cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = %s
                    AND table_schema = 'public'
                    ORDER BY ordinal_position;
                    """, (table,))

                    columns = cur.fetchall()
                    for col, dtype in columns:
                        print(f"  {col}: {dtype}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_table_columns()