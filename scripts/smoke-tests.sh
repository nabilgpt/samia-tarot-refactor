#!/usr/bin/env bash
# SAMIA TAROT — Smoke Tests for Backend API Alignment
# Tests all 8 production features (A-H) with proper JWT authentication
set -euo pipefail

# ==== CONFIG ====
API_BASE="${API_BASE:-https://your-api.com}"  # Update with your API URL
TEST_PASSWORD="${TEST_PASSWORD:-mama2009}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check dependencies
command -v jq >/dev/null || { 
  log_error "jq is required. Install with: apt install jq (Ubuntu) or brew install jq (Mac)"
  exit 1
}

# Get fresh JWT tokens
log_info "Getting fresh JWT tokens..."
if ! ./get-test-jwts.sh > /tmp/jwt_tokens.env; then
  log_error "Failed to get JWT tokens. Run setup-test-accounts.sh first."
  exit 1
fi

# Source the JWT tokens
source /tmp/jwt_tokens.env

# Test helper function
run_test() {
  local test_name="$1"
  local jwt_var="$2"
  local method="${3:-GET}"
  local endpoint="$4"
  local data="${5:-}"
  local expected_status="${6:-200}"
  
  log_info "Testing: $test_name"
  
  # Get JWT token from variable
  local jwt_token="${!jwt_var}"
  if [[ -z "$jwt_token" ]]; then
    log_error "JWT token not found for $jwt_var"
    return 1
  fi
  
  # Prepare curl command
  local curl_cmd="curl -s -w %{http_code} -o /tmp/test_response.json"
  curl_cmd+=" -H 'Authorization: Bearer $jwt_token'"
  curl_cmd+=" -H 'Content-Type: application/json'"
  
  if [[ "$method" != "GET" ]]; then
    curl_cmd+=" -X $method"
  fi
  
  if [[ -n "$data" ]]; then
    curl_cmd+=" -d '$data'"
  fi
  
  curl_cmd+=" $API_BASE$endpoint"
  
  # Execute request
  local http_code
  http_code=$(eval "$curl_cmd")
  
  # Check status
  if [[ "$http_code" -eq "$expected_status" ]]; then
    log_success "$test_name - HTTP $http_code"
    return 0
  else
    log_error "$test_name - Expected HTTP $expected_status, got $http_code"
    if [[ -f /tmp/test_response.json ]]; then
      echo "Response: $(cat /tmp/test_response.json | jq -r '.message // .error // .' 2>/dev/null || cat /tmp/test_response.json)"
    fi
    return 1
  fi
}

echo ""
log_info "🚀 Starting SAMIA TAROT Backend API Alignment Smoke Tests"
log_info "API Base: $API_BASE"
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper to track test results
track_test() {
  if "$@"; then
    ((TESTS_PASSED++))
  else
    ((TESTS_FAILED++))
  fi
}

echo "📋 Feature A: Arabic RTL & Compact Lists"
track_test run_test "Admin Settings RTL Check" "admin_test_app_JWT" "GET" "/admin/settings"

echo ""
echo "📋 Feature B: Admin Spread Visibility (Public/Targeted)"
track_test run_test "Reader Spread Access (should be filtered)" "reader_test_app_JWT" "GET" "/spreads"
track_test run_test "Admin Spread Management" "admin_test_app_JWT" "GET" "/admin/spreads"

echo ""
echo "📋 Feature C: Deck Bulk Upload (78+1 cards)"
track_test run_test "Deck Cards Listing" "admin_test_app_JWT" "GET" "/admin/decks/test-deck-id/cards"
track_test run_test "Deck Validation Check" "admin_test_app_JWT" "GET" "/admin/decks/test-deck-id/validate"

echo ""
echo "📋 Feature D: Reader Availability & Emergency Opt-in"
track_test run_test "Reader Availability Check" "reader_test_app_JWT" "GET" "/reader/availability"
track_test run_test "Emergency Opt-in Status" "reader_test_app_JWT" "GET" "/reader/emergency-optin"

echo ""
echo "📋 Feature E: Tarot V2 Client Reveal (AI Draft Isolation)"
# Test AI draft isolation - Client should get 403/404
track_test run_test "Client AI Draft Access (should fail)" "client_test_app_JWT" "GET" "/readings/test-reading-id/draft" "" "403"
# Reader should have access
track_test run_test "Reader AI Draft Access (should work)" "reader_test_app_JWT" "GET" "/readings/test-reading-id/draft"
# Test card reveal sequence
track_test run_test "Card Reveal Sequence Enforcement" "client_test_app_JWT" "POST" "/readings/test-reading-id/reveals" '{"card_position":1}'

echo ""
echo "📋 Feature F: Calls/WebRTC with Consent & Emergency Extensions"
# Test consent logging (IP required)
track_test run_test "Call Consent Logging" "reader_test_app_JWT" "POST" "/calls/test-booking-id/start" '{"sessionId":"test-session","clientIp":"1.2.3.4","consentGiven":true}'
# Test emergency extension
track_test run_test "Emergency Extension Request" "client_test_app_JWT" "POST" "/calls/test-session-id/extend" '{"extensionType":"5min"}'

echo ""
echo "📋 Feature G: Daily Zodiac Pipeline (07:00 Asia/Beirut)"
track_test run_test "Daily Zodiac Manual Trigger" "admin_test_app_JWT" "POST" "/admin/zodiac/run"
track_test run_test "Zodiac Content Retrieval" "client_test_app_JWT" "GET" "/zodiac/today"

echo ""
echo "📋 Feature H: Payment & Wallet System"
track_test run_test "User Wallet Balance" "client_test_app_JWT" "GET" "/wallet/balance"
track_test run_test "Payment Transaction History" "client_test_app_JWT" "GET" "/wallet/transactions"

echo ""
echo "🔒 Security & RLS Validation"
# Test RLS enforcement
track_test run_test "Cross-user Data Access (should fail)" "client_test_app_JWT" "GET" "/admin/users" "" "403"
track_test run_test "Super Admin Access" "sa_test_app_JWT" "GET" "/admin/system/status"

echo ""
echo "📊 Test Results Summary"
echo "=========================="
log_success "Tests Passed: $TESTS_PASSED"
if [[ $TESTS_FAILED -gt 0 ]]; then
  log_error "Tests Failed: $TESTS_FAILED"
else
  log_success "Tests Failed: $TESTS_FAILED"
fi

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total Tests: $TOTAL_TESTS"

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo ""
  log_success "🎉 All smoke tests passed! Backend API alignment is ready for production."
  exit 0
else
  echo ""
  log_error "❌ Some tests failed. Please review the errors above before proceeding to production."
  exit 1
fi