#!/bin/bash

# Backend API Alignment Script - SAMIA TAROT
# Automatically replaces schema-based table names with flat public table names
# Safety: Creates .bak files for all modifications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run]"
            exit 1
            ;;
    esac
done

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Backend API Alignment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📋 DRY RUN MODE - No files will be modified${NC}"
else
    echo -e "${GREEN}⚡ LIVE MODE - Files will be modified (.bak created)${NC}"
fi

echo ""

# Define replacement patterns
declare -A REPLACEMENTS=(
    # Tarot schema replacements
    ["'tarot\.deck_cards'"]="'deck_cards'"
    ["\"tarot\.deck_cards\""]="\"deck_cards\""
    ["\`tarot\.deck_cards\`"]="\`deck_cards\`"
    ["from('tarot.deck_cards')"]="from('deck_cards')"
    ["from(\"tarot.deck_cards\")"]="from(\"deck_cards\")"
    
    ["'tarot\.deck_uploads'"]="'deck_uploads'"
    ["\"tarot\.deck_uploads\""]="\"deck_uploads\""
    ["\`tarot\.deck_uploads\`"]="\`deck_uploads\`"
    ["from('tarot.deck_uploads')"]="from('deck_uploads')"
    ["from(\"tarot.deck_uploads\")"]="from(\"deck_uploads\")"
    
    ["'tarot\.v2_card_selections'"]="'tarot_v2_card_selections'"
    ["\"tarot\.v2_card_selections\""]="\"tarot_v2_card_selections\""
    ["\`tarot\.v2_card_selections\`"]="\`tarot_v2_card_selections\`"
    ["from('tarot.v2_card_selections')"]="from('tarot_v2_card_selections')"
    ["from(\"tarot.v2_card_selections\")"]="from(\"tarot_v2_card_selections\")"
    
    ["'tarot\.v2_audit_logs'"]="'tarot_v2_audit_logs'"
    ["\"tarot\.v2_audit_logs\""]="\"tarot_v2_audit_logs\""
    ["\`tarot\.v2_audit_logs\`"]="\`tarot_v2_audit_logs\`"
    ["from('tarot.v2_audit_logs')"]="from('tarot_v2_audit_logs')"
    ["from(\"tarot.v2_audit_logs\")"]="from(\"tarot_v2_audit_logs\")"
    
    # Calls schema replacements
    ["'calls\.consent_logs'"]="'call_consent_logs'"
    ["\"calls\.consent_logs\""]="\"call_consent_logs\""
    ["\`calls\.consent_logs\`"]="\`call_consent_logs\`"
    ["from('calls.consent_logs')"]="from('call_consent_logs')"
    ["from(\"calls.consent_logs\")"]="from(\"call_consent_logs\")"
    
    ["'calls\.emergency_extensions'"]="'call_emergency_extensions'"
    ["\"calls\.emergency_extensions\""]="\"call_emergency_extensions\""
    ["\`calls\.emergency_extensions\`"]="\`call_emergency_extensions\`"
    ["from('calls.emergency_extensions')"]="from('call_emergency_extensions')"
    ["from(\"calls.emergency_extensions\")"]="from(\"call_emergency_extensions\")"
    
    # Readers schema replacements
    ["'readers\.availability'"]="'reader_availability'"
    ["\"readers\.availability\""]="\"reader_availability\""
    ["\`readers\.availability\`"]="\`reader_availability\`"
    ["from('readers.availability')"]="from('reader_availability')"
    ["from(\"readers.availability\")"]="from(\"reader_availability\")"
    
    ["'readers\.emergency_requests'"]="'reader_emergency_requests'"
    ["\"readers\.emergency_requests\""]="\"reader_emergency_requests\""
    ["\`readers\.emergency_requests\`"]="\`reader_emergency_requests\`"
    ["from('readers.emergency_requests')"]="from('reader_emergency_requests')"
    ["from(\"readers.emergency_requests\")"]="from(\"reader_emergency_requests\")"
    
    ["'readers\.availability_overrides'"]="'reader_availability_overrides'"
    ["\"readers\.availability_overrides\""]="\"reader_availability_overrides\""
    ["\`readers\.availability_overrides\`"]="\`reader_availability_overrides\`"
    ["from('readers.availability_overrides')"]="from('reader_availability_overrides')"
    ["from(\"readers.availability_overrides\")"]="from(\"reader_availability_overrides\")"
    
    # Payments schema replacements
    ["'payments\.transactions'"]="'payment_transactions'"
    ["\"payments\.transactions\""]="\"payment_transactions\""
    ["\`payments\.transactions\`"]="\`payment_transactions\`"
    ["from('payments.transactions')"]="from('payment_transactions')"
    ["from(\"payments.transactions\")"]="from(\"payment_transactions\")"
    
    # Users schema replacements
    ["'users\.wallets'"]="'user_wallets'"
    ["\"users\.wallets\""]="\"user_wallets\""
    ["\`users\.wallets\`"]="\`user_wallets\`"
    ["from('users.wallets')"]="from('user_wallets')"
    ["from(\"users.wallets\")"]="from(\"user_wallets\")"
)

# Find files to process (exclude node_modules, .git, dist, build)
find_files() {
    find "$PROJECT_ROOT" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.next/*" \
        -not -path "*/coverage/*" \
        -not -path "*/.bak"
}

# Count files that would be affected
affected_files=0
total_replacements=0

echo -e "${BLUE}🔍 Scanning for files with schema references...${NC}"

for file in $(find_files); do
    file_has_matches=false
    file_replacement_count=0
    
    for pattern in "${!REPLACEMENTS[@]}"; do
        if grep -l "$pattern" "$file" >/dev/null 2>&1; then
            if [ "$file_has_matches" = false ]; then
                affected_files=$((affected_files + 1))
                file_has_matches=true
                if [ "$DRY_RUN" = true ]; then
                    echo -e "${YELLOW}📄 Would modify: ${file#$PROJECT_ROOT/}${NC}"
                fi
            fi
            
            count=$(grep -o "$pattern" "$file" | wc -l)
            file_replacement_count=$((file_replacement_count + count))
            
            if [ "$DRY_RUN" = true ] && [ "$count" -gt 0 ]; then
                echo -e "   ${BLUE}📍 $count× ${pattern} → ${REPLACEMENTS[$pattern]}${NC}"
            fi
        fi
    done
    
    total_replacements=$((total_replacements + file_replacement_count))
done

echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "   Files affected: $affected_files"
echo -e "   Total replacements: $total_replacements"
echo ""

if [ "$affected_files" -eq 0 ]; then
    echo -e "${GREEN}✅ No schema references found - backend already aligned!${NC}"
    exit 0
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📋 Dry run complete. Use without --dry-run to apply changes.${NC}"
    exit 0
fi

# Confirm before proceeding
echo -e "${YELLOW}⚠️  This will modify $affected_files files with $total_replacements replacements.${NC}"
echo -e "${YELLOW}   Backup files (.bak) will be created for safety.${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborted by user${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Applying replacements...${NC}"

# Apply replacements
processed_files=0
for file in $(find_files); do
    file_modified=false
    
    for pattern in "${!REPLACEMENTS[@]}"; do
        if grep -l "$pattern" "$file" >/dev/null 2>&1; then
            if [ "$file_modified" = false ]; then
                # Create backup
                cp "$file" "$file.bak"
                file_modified=true
                processed_files=$((processed_files + 1))
                echo -e "${BLUE}🔧 Processing: ${file#$PROJECT_ROOT/}${NC}"
            fi
            
            # Apply replacement
            replacement="${REPLACEMENTS[$pattern]}"
            sed -i.tmp "s|$pattern|$replacement|g" "$file"
            rm "$file.tmp" 2>/dev/null || true
        fi
    done
done

echo ""
echo -e "${GREEN}✅ Alignment complete!${NC}"
echo -e "${GREEN}   Processed: $processed_files files${NC}"
echo -e "${GREEN}   Applied: $total_replacements replacements${NC}"
echo ""

# Verify no schema references remain
echo -e "${BLUE}🔍 Verifying no schema references remain...${NC}"

remaining_refs=0
for schema in "tarot\." "calls\." "readers\." "payments\." "users\.wallets"; do
    count=$(find_files | xargs grep -l "$schema" 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        remaining_refs=$((remaining_refs + count))
        echo -e "${RED}⚠️  Found $count files still containing '$schema'${NC}"
        find_files | xargs grep -l "$schema" 2>/dev/null | head -5 | while read file; do
            echo -e "   ${YELLOW}📄 ${file#$PROJECT_ROOT/}${NC}"
        done
    fi
done

if [ "$remaining_refs" -eq 0 ]; then
    echo -e "${GREEN}✅ No schema references remaining - perfect alignment!${NC}"
else
    echo -e "${YELLOW}⚠️  $remaining_refs files may need manual review${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo -e "   1. Review changes: ${YELLOW}git diff${NC}"
echo -e "   2. Run tests: ${YELLOW}npm test${NC}"
echo -e "   3. Import table constants: ${YELLOW}src/db/tables.ts${NC}"
echo -e "   4. Adopt repository pattern: ${YELLOW}src/repos/${NC}"
echo ""
echo -e "${GREEN}🎉 Backend API alignment ready for production!${NC}"