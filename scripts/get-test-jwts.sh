#!/usr/bin/env bash
# SAMIA TAROT — Get JWT tokens for all test accounts
# Generates access tokens for smoke testing with proper role-based authentication
set -euo pipefail

# ==== CONFIG ====
SUPABASE_URL="https://uuseflmielktdcltzwzt.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw"
PASS="${TEST_PASSWORD:-mama2009}"

USERS=(
  "client@test.app"
  "reader@test.app" 
  "monitor@test.app"
  "admin@test.app"
  "sa@test.app"
)

# Check dependencies
command -v jq >/dev/null || { 
  echo "ERROR: jq is required. Install with: apt install jq (Ubuntu) or brew install jq (Mac)"
  exit 1
}

echo "🔑 Getting JWT tokens for SAMIA TAROT test accounts..."
echo "Password: ${PASS}"
echo ""

for email in "${USERS[@]}"; do
  echo -n "Getting token for ${email}... "
  
  response=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"email":"'"${email}"'","password":"'"${PASS}"'"}')
  
  if echo "$response" | jq -e '.error' >/dev/null; then
    echo "❌ ERROR: $(echo "$response" | jq -r '.error_description // .error.message')"
  else
    token=$(echo "$response" | jq -r '.access_token')
    role=$(echo "$response" | jq -r '.user.app_metadata.role // "unknown"')
    expires_in=$(echo "$response" | jq -r '.expires_in')
    
    if [[ "$token" != "null" && -n "$token" ]]; then
      echo "✅"
      echo "export ${email//@/_}_JWT=\"${token}\""
      echo "# Role: ${role}, Expires in: ${expires_in}s"
      echo ""
    else
      echo "❌ No token received"
    fi
  fi
done

echo ""
echo "📋 Usage examples:"
echo ""
echo "# Test Admin Spreads (RLS should show only admin spreads)"
echo 'curl -H "Authorization: Bearer $admin_test_app_JWT" https://your-api/spreads'
echo ""
echo "# Test Client Tarot V2 Reveal (should enforce sequence)"
echo 'curl -X POST -H "Authorization: Bearer $client_test_app_JWT" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"card_position":1}'"'"' https://your-api/readings/<id>/reveals'
echo ""
echo "# Test Reader AI Draft Access (should work + audit log)"
echo 'curl -H "Authorization: Bearer $reader_test_app_JWT" https://your-api/readings/<id>/draft'
echo ""
echo "# Test Call Consent Logging (IP required)"
echo 'curl -X POST -H "Authorization: Bearer $reader_test_app_JWT" \'
echo '  -d '"'"'{"sessionId":"test","clientIp":"1.2.3.4","consentGiven":true}'"'"' \'
echo '  https://your-api/calls/<booking_id>/start'
echo ""
echo "💡 Remember: These JWTs expire. Re-run this script to get fresh tokens."