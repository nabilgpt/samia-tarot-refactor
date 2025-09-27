"""
Database utilities for SAMIA-TAROT
Simple psycopg2 wrapper functions
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection string
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DSN)

def db_exec(query, params=None):
    """Execute a query without returning results"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            conn.commit()
            return cur.rowcount

def db_fetch_one(query, params=None):
    """Fetch one row"""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return cur.fetchone()

def db_fetch_all(query, params=None):
    """Fetch all rows"""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return cur.fetchall()

def db_fetch_many(query, params=None, size=100):
    """Fetch many rows"""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return cur.fetchmany(size)

# Test connection
if __name__ == "__main__":
    try:
        result = db_fetch_one("SELECT 1 as test")
        print(f"Database connection successful: {result}")
    except Exception as e:
        print(f"Database connection failed: {e}")