#!/usr/bin/env bash
# SAMIA TAROT — Test Accounts Setup (creates/updates + set password)
# Creates test accounts for all roles with secure password management
set -euo pipefail

# ==== CONFIG ====
SUPABASE_URL="https://uuseflmielktdcltzwzt.supabase.co"
# NOTE: SERVICE_ROLE_KEY must be provided via environment for security
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
PASS="${TEST_PASSWORD:-mama2009}"  # default for tests, override via env

if [[ -z "$SERVICE_ROLE_KEY" ]]; then
  echo "ERROR: SERVICE_ROLE_KEY environment variable required"
  echo "Usage: SERVICE_ROLE_KEY=<service_key> ./setup-test-accounts.sh"
  exit 1
fi

declare -A ROLES=(
  ["client@test.app"]="client"
  ["reader@test.app"]="reader"
  ["monitor@test.app"]="monitor"
  ["admin@test.app"]="admin"
  ["sa@test.app"]="super_admin"
)

# Check dependencies
need_jq(){ 
  command -v jq >/dev/null || { 
    echo "ERROR: jq is required. Install with: apt install jq (Ubuntu) or brew install jq (Mac)"
    exit 1
  }
}
need_jq

get_user(){
  local email="$1"
  curl -s "${SUPABASE_URL}/auth/v1/admin/users?email=${email}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
}

create_user(){
  local email="$1" role="$2"
  echo "Creating test account: ${email} (${role})"
  
  response=$(curl -sX POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'"${email}"'",
      "password": "'"${PASS}"'",
      "email_confirm": true,
      "app_metadata": { "role": "'"${role}"'" },
      "user_metadata": { 
        "display_name": "'"${role^} Test Account"'", 
        "is_test": true,
        "created_for": "backend_api_alignment_testing"
      }
    }')
  
  if echo "$response" | jq -e '.error' >/dev/null; then
    echo "ERROR creating ${email}: $(echo "$response" | jq -r '.error.message')"
    return 1
  else
    echo "✅ Created: ${email}"
  fi
}

update_user(){
  local id="$1" email="$2" role="$3"
  echo "Updating test account: ${email} (${role})"
  
  response=$(curl -sX PATCH "${SUPABASE_URL}/auth/v1/admin/users/${id}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "password": "'"${PASS}"'",
      "email_confirm": true,
      "app_metadata": { "role": "'"${role}"'" },
      "user_metadata": { 
        "is_test": true,
        "updated_for": "backend_api_alignment_testing"
      }
    }')
  
  if echo "$response" | jq -e '.error' >/dev/null; then
    echo "ERROR updating ${email}: $(echo "$response" | jq -r '.error.message')"
    return 1
  else
    echo "✅ Updated: ${email}"
  fi
}

echo "🚀 Setting up SAMIA TAROT test accounts..."
echo "Password: ${PASS}"
echo ""

for email in "${!ROLES[@]}"; do
  role="${ROLES[$email]}"
  
  # Check if user exists
  user_response=$(get_user "$email")
  uid=$(echo "$user_response" | jq -r '.[0].id // empty')
  
  if [[ -z "$uid" ]]; then
    create_user "$email" "$role"
  else
    echo "User exists: ${email} (ID: ${uid})"
    update_user "$uid" "$email" "$role"
  fi
done

echo ""
echo "✅ Test accounts setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: ./get-test-jwts.sh to get JWT tokens"
echo "2. Use tokens in your curl tests for role-based testing"
echo "3. Remember: These are TEST accounts only (is_test=true)"