#!/bin/bash
# smoke_readonly.sh - SAMIA-TAROT Read-Only Smoke Tests  
# Usage: ./smoke_readonly.sh "https://api.domain.com" "<admin-uuid>"

set -euo pipefail

BASE_URL="${1:-}"
ADMIN_USER_ID="${2:-}"
TIMEOUT=${3:-30}

if [[ -z "$BASE_URL" || -z "$ADMIN_USER_ID" ]]; then
    echo "Usage: $0 <base_url> <admin_user_id> [timeout_seconds]"
    echo "Example: $0 https://api.domain.com 00000000-0000-0000-0000-000000000000"
    exit 1
fi

echo "SAMIA-TAROT Read-Only Smoke Tests"
echo "================================="
echo "Base URL: $BASE_URL"
echo "Admin User: $ADMIN_USER_ID"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

test_endpoint() {
    local name="$1"
    local url="$2" 
    local expected_status="${3:-200}"
    local headers="${4:-}"
    
    local status_code
    if [[ -n "$headers" ]]; then
        status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -H "$headers" "$url" || echo "ERROR")
    else
        status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "ERROR")
    fi
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "\033[32m[PASS]\033[0m $name ($status_code)"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "\033[31m[FAIL]\033[0m $name (Expected: $expected_status, Got: $status_code)"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Test 1: Health Check (Admin)
test_endpoint "Health Check" "$BASE_URL/api/ops/health" 200 "X-User-ID: $ADMIN_USER_ID"

# Test 2: Countries Metadata
test_endpoint "Countries List" "$BASE_URL/api/meta/countries?sort=dial_code" 200

# Test 3: Zodiac Signs  
test_endpoint "Zodiac Signs" "$BASE_URL/api/meta/zodiacs" 200

# Test 4: Daily Horoscope (404 acceptable if no content yet)
status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL/api/horoscopes/daily?zodiac=Leo&country=LB" || echo "ERROR")
if [[ "$status_code" == "200" ]]; then
    echo -e "\033[32m[PASS]\033[0m Daily Horoscope (200 - Content Available)"
    ((PASS_COUNT++))
elif [[ "$status_code" == "404" ]]; then
    echo -e "\033[33m[PASS]\033[0m Daily Horoscope (404 - No Content Yet, Acceptable)"
    ((PASS_COUNT++))
else
    echo -e "\033[31m[FAIL]\033[0m Daily Horoscope ($status_code - Unexpected Error)"
    ((FAIL_COUNT++))
fi

# Test 5: System Metrics (Admin)
test_endpoint "System Metrics" "$BASE_URL/api/ops/metrics?days=1" 200 "X-User-ID: $ADMIN_USER_ID"

# Test 6: Database connectivity check via snapshot  
test_endpoint "Database Snapshot" "$BASE_URL/api/ops/snapshot?days=1" 200 "X-User-ID: $ADMIN_USER_ID"

echo ""
echo -e "\033[36mTest Results Summary:\033[0m"
echo "==================="
echo -e "\033[32mPASSED: $PASS_COUNT\033[0m"
echo -e "\033[31mFAILED: $FAIL_COUNT\033[0m"
echo -e "\033[37mTOTAL:  $((PASS_COUNT + FAIL_COUNT))\033[0m"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo ""
    echo -e "\033[32m🎉 ALL SMOKE TESTS PASSED - SYSTEM READY FOR PRODUCTION\033[0m"
    exit 0
else
    echo ""
    echo -e "\033[31m❌ $FAIL_COUNT TEST(S) FAILED - INVESTIGATE BEFORE PROCEEDING\033[0m"
    exit 1
fi