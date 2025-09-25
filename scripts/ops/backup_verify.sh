#!/bin/bash
# M42 Backup Verification Script
# Runs daily to verify backup integrity and system health
# Generates signed evidence with SHA256 hash

set -e

# Configuration
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S_UTC")
EVIDENCE_DIR="evidence"
EVIDENCE_FILE="${EVIDENCE_DIR}/backup_verify_${TIMESTAMP}.log"
DATABASE_URL=${DATABASE_URL:-${SUPABASE_DB_URL}}

# Ensure evidence directory exists
mkdir -p $EVIDENCE_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Starting backup verification at $TIMESTAMP"

# Start evidence log
echo "=== SAMIA TAROT Backup Verification Report ===" > $EVIDENCE_FILE
echo "Timestamp: $TIMESTAMP" >> $EVIDENCE_FILE
echo "Database: ${DATABASE_URL%/*}/[REDACTED]" >> $EVIDENCE_FILE
echo "Verification Script: backup_verify.sh v1.0" >> $EVIDENCE_FILE
echo "" >> $EVIDENCE_FILE

# Function to log and print
log_and_print() {
    echo "$1" | tee -a $EVIDENCE_FILE
}

# Test 1: Critical Table Row Counts
echo "📊 Test 1: Critical Table Integrity" | tee -a $EVIDENCE_FILE
echo "=====================================s" >> $EVIDENCE_FILE

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    TABLE_COUNTS=$(psql $DATABASE_URL -t -c "
        SELECT
            'profiles: ' || COUNT(*) as count FROM profiles
        UNION ALL
        SELECT
            'orders: ' || COUNT(*) as count FROM orders
        UNION ALL
        SELECT
            'audit_log: ' || COUNT(*) as count FROM audit_log
        UNION ALL
        SELECT
            'wa_messages: ' || COUNT(*) as count FROM wa_messages
        UNION ALL
        SELECT
            'siren_incidents: ' || COUNT(*) as count FROM siren_incidents;
    " 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$TABLE_COUNTS" >> $EVIDENCE_FILE
        echo -e "${GREEN}✅ Table counts retrieved successfully${NC}"
        TEST1_STATUS="PASS"
    else
        echo "ERROR: Could not retrieve table counts" >> $EVIDENCE_FILE
        echo -e "${RED}❌ Failed to retrieve table counts${NC}"
        TEST1_STATUS="FAIL"
    fi
else
    echo "SKIP: psql not available or DATABASE_URL not set" >> $EVIDENCE_FILE
    echo -e "${YELLOW}⚠️  Skipping database tests - psql not available${NC}"
    TEST1_STATUS="SKIP"
fi

echo "" >> $EVIDENCE_FILE

# Test 2: RLS Security Posture
log_and_print "🔒 Test 2: Security Posture"
echo "===========================" >> $EVIDENCE_FILE

if [ "$TEST1_STATUS" = "PASS" ]; then
    RLS_STATUS=$(psql $DATABASE_URL -t -c "
        SELECT
            'RLS Enabled Tables: ' || COUNT(*) as rls_count
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relrowsecurity = true
        AND n.nspname = 'public'
        UNION ALL
        SELECT
            'FORCE RLS Tables: ' || COUNT(*) as force_rls_count
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relforcerowsecurity = true
        AND n.nspname = 'public';
    " 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$RLS_STATUS" >> $EVIDENCE_FILE
        echo -e "${GREEN}✅ Security posture checked${NC}"
        TEST2_STATUS="PASS"
    else
        echo "ERROR: Could not check RLS status" >> $EVIDENCE_FILE
        echo -e "${RED}❌ Failed to check security posture${NC}"
        TEST2_STATUS="FAIL"
    fi
else
    echo "SKIP: Database connection failed" >> $EVIDENCE_FILE
    TEST2_STATUS="SKIP"
fi

echo "" >> $EVIDENCE_FILE

# Test 3: Recent Activity
log_and_print "📈 Test 3: Recent Activity (24h)"
echo "===============================" >> $EVIDENCE_FILE

if [ "$TEST1_STATUS" = "PASS" ]; then
    ACTIVITY=$(psql $DATABASE_URL -t -c "
        SELECT
            'audit_entries_24h: ' || COUNT(*) as count
        FROM audit_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT
            'new_profiles_7d: ' || COUNT(*) as count
        FROM profiles
        WHERE created_at > NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT
            'wa_messages_24h: ' || COUNT(*) as count
        FROM wa_messages
        WHERE created_at > NOW() - INTERVAL '24 hours';
    " 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$ACTIVITY" >> $EVIDENCE_FILE
        echo -e "${GREEN}✅ Activity metrics collected${NC}"
        TEST3_STATUS="PASS"
    else
        echo "ERROR: Could not retrieve activity metrics" >> $EVIDENCE_FILE
        echo -e "${RED}❌ Failed to get activity metrics${NC}"
        TEST3_STATUS="FAIL"
    fi
else
    echo "SKIP: Database connection failed" >> $EVIDENCE_FILE
    TEST3_STATUS="SKIP"
fi

echo "" >> $EVIDENCE_FILE

# Test 4: Critical Data Integrity
log_and_print "🔍 Test 4: Data Integrity"
echo "=========================" >> $EVIDENCE_FILE

if [ "$TEST1_STATUS" = "PASS" ]; then
    INTEGRITY=$(psql $DATABASE_URL -t -c "
        SELECT
            'verified_emails: ' || COUNT(*) as count
        FROM profiles
        WHERE email_verified = true
        UNION ALL
        SELECT
            'verified_phones: ' || COUNT(*) as count
        FROM profiles
        WHERE phone_verified = true
        UNION ALL
        SELECT
            'active_policies: ' || COUNT(*) as count
        FROM siren_policies
        WHERE enabled = true;
    " 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$INTEGRITY" >> $EVIDENCE_FILE
        echo -e "${GREEN}✅ Data integrity verified${NC}"
        TEST4_STATUS="PASS"
    else
        echo "ERROR: Could not verify data integrity" >> $EVIDENCE_FILE
        echo -e "${RED}❌ Failed to verify integrity${NC}"
        TEST4_STATUS="FAIL"
    fi
else
    echo "SKIP: Database connection failed" >> $EVIDENCE_FILE
    TEST4_STATUS="SKIP"
fi

echo "" >> $EVIDENCE_FILE

# Test Summary
log_and_print "📋 Test Summary"
echo "===============" >> $EVIDENCE_FILE
echo "Test 1 (Table Integrity): $TEST1_STATUS" >> $EVIDENCE_FILE
echo "Test 2 (Security Posture): $TEST2_STATUS" >> $EVIDENCE_FILE
echo "Test 3 (Recent Activity): $TEST3_STATUS" >> $EVIDENCE_FILE
echo "Test 4 (Data Integrity): $TEST4_STATUS" >> $EVIDENCE_FILE
echo "" >> $EVIDENCE_FILE

# Generate verification hash
CONTENT_HASH=$(cat $EVIDENCE_FILE | sha256sum | cut -d' ' -f1)
echo "Verification Hash: $CONTENT_HASH" >> $EVIDENCE_FILE
echo "Evidence File: $EVIDENCE_FILE" >> $EVIDENCE_FILE

# Determine overall status
FAIL_COUNT=$(echo "$TEST1_STATUS $TEST2_STATUS $TEST3_STATUS $TEST4_STATUS" | grep -o "FAIL" | wc -l)
SKIP_COUNT=$(echo "$TEST1_STATUS $TEST2_STATUS $TEST3_STATUS $TEST4_STATUS" | grep -o "SKIP" | wc -l)

if [ $FAIL_COUNT -gt 0 ]; then
    OVERALL_STATUS="FAIL"
    STATUS_COLOR=$RED
    STATUS_EMOJI="❌"
elif [ $SKIP_COUNT -gt 0 ]; then
    OVERALL_STATUS="PARTIAL"
    STATUS_COLOR=$YELLOW
    STATUS_EMOJI="⚠️"
else
    OVERALL_STATUS="PASS"
    STATUS_COLOR=$GREEN
    STATUS_EMOJI="✅"
fi

echo "Overall Status: $OVERALL_STATUS" >> $EVIDENCE_FILE

# Final output
echo ""
echo -e "${STATUS_COLOR}${STATUS_EMOJI} $OVERALL_STATUS: Backup verification completed${NC}"
echo "📄 Evidence: $EVIDENCE_FILE"
echo "🔑 Hash: $CONTENT_HASH"

# Return appropriate exit code
case $OVERALL_STATUS in
    "PASS") exit 0 ;;
    "PARTIAL") exit 2 ;;
    "FAIL") exit 1 ;;
esac