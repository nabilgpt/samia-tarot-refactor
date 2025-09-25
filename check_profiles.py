#!/usr/bin/env python3
import os
import psycopg2

dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
    # Check profiles table columns
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'profiles' AND table_schema = 'public'
        ORDER BY ordinal_position
    """)
    columns = [row[0] for row in cur.fetchall()]
    print("Profiles columns:", columns)