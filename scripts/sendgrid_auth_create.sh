#!/usr/bin/env bash
# scripts/sendgrid_auth_create.sh
# Creates an Authenticated Domain in SendGrid with Automated Security (CNAME-only)

set -euo pipefail

: "${SENDGRID_API_KEY?}"
: "${SENDING_DOMAIN?}"
SUBDOMAIN="${SENDGRID_SUBDOMAIN:-em}"

api() {
  curl -sS https://api.sendgrid.com/v3/whitelabel/domains \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"domain\":\"$SENDING_DOMAIN\",\"subdomain\":\"$SUBDOMAIN\",\"automatic_security\":true,\"default\":true}"
}

RESP=$(api)
ID=$(echo "$RESP" | jq -r '.id')
MAIL_HOST=$(echo "$RESP" | jq -r '.dns.mail_cname.host')
MAIL_DATA=$(echo "$RESP" | jq -r '.dns.mail_cname.data')
DKIM1_HOST=$(echo "$RESP" | jq -r '.dns.dkim1.host')
DKIM1_DATA=$(echo "$RESP" | jq -r '.dns.dkim1.data')
DKIM2_HOST=$(echo "$RESP" | jq -r '.dns.dkim2.host')
DKIM2_DATA=$(echo "$RESP" | jq -r '.dns.dkim2.data')

cat <<EOF
SENDGRID_DOMAIN_ID=$ID
# Create these CNAMEs in Cloudflare:
$MAIL_HOST CNAME $MAIL_DATA
$DKIM1_HOST CNAME $DKIM1_DATA
$DKIM2_HOST CNAME $DKIM2_DATA
EOF