#!/usr/bin/env bash
# scripts/cloudflare_upsert_dns.sh
# Idempotent helper to upsert a DNS record in Cloudflare

set -euo pipefail

: "${CF_API_TOKEN?}"
: "${CF_ZONE_ID?}"

NAME=$1; TYPE=$2; CONTENT=$3; TTL=${4:-3600}; PROXIED=${5:-false}

existing_id=$(curl -sS -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?type=$TYPE&name=$NAME" | jq -r '.result[0].id // empty')

if [ -n "$existing_id" ]; then
  METHOD=PUT URL="https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$existing_id"
else
  METHOD=POST URL="https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records"
fi

curl -sS -X "$METHOD" "$URL" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data "{\"type\":\"$TYPE\",\"name\":\"$NAME\",\"content\":\"$CONTENT\",\"ttl\":$TTL,\"proxied\":$PROXIED}"