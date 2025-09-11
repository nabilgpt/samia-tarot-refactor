# migrate.py  (run: python migrate.py up|down|audit)
import os, sys, hashlib, time
import psycopg2
from psycopg2.pool import SimpleConnectionPool

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

def load_migration_file(filename):
    """Load migration SQL from file if exists"""
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        raise FileNotFoundError(f"Migration file {filename} not found")

MIGRATIONS = [
    ("001_core.sql", load_migration_file("001_core.sql")),
    ("002_personalization_schema.sql", load_migration_file("002_personalization_schema.sql")),
    ("003_ar_i18n_schema.sql", load_migration_file("003_ar_i18n_schema.sql")),
    ("002_ops.sql", load_migration_file("002_ops.sql")),
    ("003_astro.sql", load_migration_file("003_astro.sql")),
    ("004_calls.sql", load_migration_file("004_calls.sql")),
    ("005_security.sql", load_migration_file("005_security.sql")),
    ("006_ai.sql", load_migration_file("006_ai.sql")),
    ("007_payments.sql", load_migration_file("007_payments.sql")),
    ("008_notifications.sql", load_migration_file("008_notifications.sql")),
    ("009_privacy.sql", load_migration_file("009_privacy.sql")),
    ("010_rls.sql", load_migration_file("010_rls.sql")),
]

def exec_sql(sql: str):
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql)
    finally:
        POOL.putconn(conn)

def query_one(sql: str, params=None):
    """Execute query and return first row"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        POOL.putconn(conn)

def query_all(sql: str, params=None):
    """Execute query and return all rows"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        POOL.putconn(conn)

def ensure_table():
    exec_sql("""
      create table if not exists _migrations (
        id serial primary key,
        name text unique not null,
        checksum text not null,
        applied_at timestamptz default now()
      );
    """)

def up():
    """Apply migrations idempotently"""
    ensure_table()
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            for name, body in MIGRATIONS:
                checksum = hashlib.sha256(body.encode("utf-8")).hexdigest()
                cur.execute("select 1 from _migrations where name=%s and checksum=%s", (name, checksum))
                if cur.fetchone():
                    print(f"[=] skip {name} (already applied)")
                    continue
                print(f"[+] apply {name}")
                cur.execute(body)
                cur.execute("insert into _migrations(name,checksum) values (%s,%s)", (name, checksum))
                print(f"[*] {name} applied successfully")
    finally:
        POOL.putconn(conn)

def down():  
    """Simplistic demo: truncate created tables safely if needed"""
    print("[!] down not implemented (use targeted SQL rollback)")

def audit():
    """Show database health stats"""
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            # List public tables
            cur.execute("select table_name from information_schema.tables where table_schema='public' order by 1;")
            tables = [r[0] for r in cur.fetchall()]
            print("Public tables:", tables)
            
            # Basic counts for key tables
            for table in ['roles', 'services', 'orders', 'media_assets', 'horoscopes', 'moderation_actions', 'profiles']:
                if table in tables:
                    cur.execute(f"select count(*) from {table};")
                    count = cur.fetchone()[0]
                    print(f"{table} count: {count}")
            
            # Show applied migrations
            cur.execute("select name, applied_at from _migrations order by applied_at;")
            migrations = cur.fetchall()
            print("Applied migrations:")
            for name, applied_at in migrations:
                print(f"  {name} -> {applied_at}")
                
    finally:
        POOL.putconn(conn)

def test_zodiac():
    """Test zodiac calculation function"""
    test_cases = [
        ('1992-08-12', 'Leo'),
        ('1995-03-25', 'Aries'), 
        ('1990-12-25', 'Capricorn')
    ]
    
    print("Testing zodiac calculation:")
    for test_date, expected in test_cases:
        result = query_one(f"select calc_zodiac(date '{test_date}');")
        zodiac = result[0] if result else None
        status = "OK" if zodiac == expected else "FAIL"
        print(f"  {test_date} -> {zodiac} {status} (expected: {expected})")

if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv)>1 else "up").lower()
    if cmd == "up":
        up()
    elif cmd == "down":
        down()
    elif cmd == "audit":
        audit()
    elif cmd == "test-zodiac":
        test_zodiac()
    else:
        print("Usage: python migrate.py [up|down|audit|test-zodiac]")
        sys.exit(1)