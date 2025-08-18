#!/usr/bin/env bash
# Backend API Alignment Script — SAMIA TAROT
# Replaces schema-based table names with flat public table names.
# Safety: creates .bak files for every changed file.
set -euo pipefail

DRY=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY=1; fi

declare -A MAP=(
  ["tarot.deck_cards"]="deck_cards"
  ["tarot.deck_uploads"]="deck_uploads"
  ["tarot.client_card_reveals"]="tarot_v2_card_selections"
  ["ai.reader_ai_drafts_audit"]="tarot_v2_audit_logs"
  ["calls.consent_logs"]="call_consent_logs"
  ["calls.emergency_extensions"]="call_emergency_extensions"
  ["ops.reader_availability_windows"]="reader_availability"
  ["ops.reader_emergency_optin"]="reader_emergency_requests"
  ["ops.reader_availability_overrides"]="reader_availability_overrides"
  ["payments.transactions"]="payment_transactions"
  ["payments.wallets"]="user_wallets"
)

FILES=$(git ls-files | grep -E '\.(ts|tsx|js|jsx|sql)$' || true)

for OLD in "${!MAP[@]}"; do
  NEW="${MAP[$OLD]}"
  if [[ $DRY -eq 1 ]]; then
    echo "Would replace: $OLD -> $NEW"
    if [[ -n "$FILES" ]]; then
      echo "$FILES" | xargs -I{} grep -nH --color=always -e "$OLD" "{}" || true
    fi
  else
    echo "Replacing: $OLD -> $NEW"
    if [[ -n "$FILES" ]]; then
      echo "$FILES" | xargs -I{} sed -i.bak "s/\b$OLD\b/$NEW/g" "{}"
    fi
  fi
done

echo "Done. If not dry-run, .bak files were created for review. Use 'git diff' to inspect changes."
