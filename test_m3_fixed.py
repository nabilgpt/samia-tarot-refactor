# test_m3_simple.py - Simple M3 test using existing database
import os, uuid
import psycopg2
from datetime import datetime

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

def db_exec(sql, params=None):
    """Execute SQL directly"""
    with psycopg2.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(sql, params or ())
        conn.commit()
        return cur.rowcount

def db_fetchone(sql, params=None):
    """Fetch one row"""
    with psycopg2.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()

def db_fetchall(sql, params=None):
    """Fetch all rows"""
    with psycopg2.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()

def test_database_setup():
    """Test that our M3 database structure is ready"""
    print("=== M3 DATABASE VERIFICATION ===")
    
    # Check required tables exist
    tables = db_fetchall("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'phone_verifications', 'audit_log', 'roles', 'services')
        ORDER BY table_name
    """)
    
    print("Required tables present:")
    for table in tables:
        print(f"  * {table[0]}")
    
    # Check roles are seeded
    roles = db_fetchall("SELECT code, label FROM roles ORDER BY id")
    print(f"\nRoles seeded ({len(roles)}):")
    for code, label in roles:
        print(f"  * {code}: {label}")
    
    # Check services are seeded
    services = db_fetchall("SELECT code, name FROM services ORDER BY id")
    print(f"\nServices seeded ({len(services)}):")
    for code, name in services:
        print(f"  * {code}: {name}")

def test_manual_profile_creation():
    """Create a test profile manually for API testing"""
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"
    test_email = "test@samia-tarot.com"
    
    print(f"\n=== MANUAL PROFILE CREATION ===")
    
    # Insert test profile directly (simulating auth sync)
    db_exec("""
        INSERT INTO profiles(id, email, email_verified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            email_verified = EXCLUDED.email_verified,
            updated_at = EXCLUDED.updated_at
    """, (test_user_id, test_email, True, datetime.utcnow(), datetime.utcnow()))
    
    print(f"* Test profile created: {test_user_id}")
    
    # Verify profile exists
    profile = db_fetchone("""
        SELECT id, email, email_verified, phone_verified 
        FROM profiles WHERE id = %s
    """, (test_user_id,))
    
    print(f"* Profile in DB: {profile}")
    return test_user_id

def test_phone_verification_flow():
    """Test phone verification database operations"""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    phone = "+96170123456"
    
    print(f"\n=== PHONE VERIFICATION FLOW TEST ===")
    
    # 1. Start verification (simulate API call)
    db_exec("""
        INSERT INTO phone_verifications(profile_id, phone, status, provider_ref, created_at)
        VALUES (%s, %s, 'sent', %s, %s)
    """, (user_id, phone, f"mock_{uuid.uuid4().hex[:8]}", datetime.utcnow()))
    
    print("* Phone verification started")
    
    # 2. Check verification record
    verification = db_fetchone("""
        SELECT id, profile_id, phone, status, provider_ref
        FROM phone_verifications
        WHERE profile_id = %s AND phone = %s
        ORDER BY id DESC LIMIT 1
    """, (user_id, phone))
    
    print(f"* Verification record: {verification}")
    
    # 3. Verify phone (simulate successful check)
    verification_id = verification[0]
    
    db_exec("UPDATE phone_verifications SET status = 'verified' WHERE id = %s", (verification_id,))
    db_exec("""
        UPDATE profiles 
        SET phone = %s, phone_verified = true, updated_at = %s
        WHERE id = %s
    """, (phone, datetime.utcnow(), user_id))
    
    print("* Phone verification completed")
    
    # 4. Check final state
    profile = db_fetchone("""
        SELECT email_verified, phone_verified, phone
        FROM profiles WHERE id = %s
    """, (user_id,))
    
    print(f"* Final profile state: {profile}")

def test_audit_logging():
    """Test audit logging functionality"""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    print(f"\n=== AUDIT LOGGING TEST ===")
    
    # Write some test audit entries
    audit_entries = [
        ("auth_sync", "profile", user_id, {"email_verified": True}),
        ("phone_verify_start", "phone_verification", "+96170123456", {"channel": "sms"}),
        ("phone_verify_ok", "profile", user_id, {"phone": "+96170123456"})
    ]
    
    for event, entity, entity_id, meta in audit_entries:
        db_exec("""
            INSERT INTO audit_log(actor, event, entity, entity_id, meta, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, event, entity, entity_id, f'{meta}', datetime.utcnow()))
    
    print(f"* {len(audit_entries)} audit entries written")
    
    # Check audit log
    logs = db_fetchall("""
        SELECT event, entity, entity_id, meta, created_at
        FROM audit_log
        WHERE actor = %s
        ORDER BY created_at DESC
        LIMIT 5
    """, (user_id,))
    
    print("* Recent audit entries:")
    for log in logs:
        print(f"  {log[0]} | {log[1]} | {log[2]} | {log[4]}")

def show_final_stats():
    """Show final database statistics"""
    print(f"\n=== FINAL DATABASE STATS ===")
    
    stats = {
        "profiles": db_fetchone("SELECT COUNT(*) FROM profiles")[0],
        "phone_verifications": db_fetchone("SELECT COUNT(*) FROM phone_verifications")[0],
        "audit_log": db_fetchone("SELECT COUNT(*) FROM audit_log")[0],
    }
    
    for table, count in stats.items():
        print(f"{table}: {count} rows")

def show_api_test_commands():
    """Show manual API testing commands"""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    print(f"\n=== API TESTING COMMANDS ===")
    print("1. Start the API server:")
    print("   uvicorn api:app --reload")
    print("")
    print("2. Test endpoints (in separate terminal):")
    print(f"   # Test auth status")
    print(f"   curl 'http://localhost:8000/api/auth/status?user_id={user_id}'")
    print("")
    print(f"   # Test phone verification start")
    print(f"   curl -X POST http://localhost:8000/api/verify/phone/start \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d '{{\"user_id\":\"{user_id}\",\"phone\":\"+96170555999\",\"channel\":\"sms\"}}'")
    print("")
    print(f"   # Test phone verification check (use code: 123456)")
    print(f"   curl -X POST http://localhost:8000/api/verify/phone/check \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d '{{\"user_id\":\"{user_id}\",\"phone\":\"+96170555999\",\"code\":\"123456\"}}'")

if __name__ == "__main__":
    print("M3 TESTING - Auth & Phone Verification")
    print("======================================")
    
    # Test database setup
    test_database_setup()
    
    # Create test profile
    user_id = test_manual_profile_creation()
    
    # Test phone verification flow
    test_phone_verification_flow()
    
    # Test audit logging
    test_audit_logging()
    
    # Show final stats
    show_final_stats()
    
    # Show API test commands
    show_api_test_commands()
    
    print(f"\n✅ M3 Database testing complete!")
    print(f"✅ Test profile ready: {user_id}")
    print(f"✅ Ready for API endpoint testing!")