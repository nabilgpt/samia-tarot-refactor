#!/usr/bin/env bash
# scripts/sendgrid_auth_validate.sh
# Validates the authenticated domain after DNS propagates

set -euo pipefail

: "${SENDGRID_API_KEY?}"
: "${SENDGRID_DOMAIN_ID?}"

curl -sS -X POST \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  https://api.sendgrid.com/v3/whitelabel/domains/$SENDGRID_DOMAIN_ID/validate | jq .