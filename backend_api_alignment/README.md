# Backend API Alignment Package - SAMIA TAROT

## 🎯 **PURPOSE**

This package provides automated tools to align backend API queries with the production flat table schema without modifying any theme/UI elements. All database tables now use direct names (e.g., `deck_cards` instead of `tarot.deck_cards`).

---

## 📦 **PACKAGE CONTENTS**

```
backend_api_alignment/
├── README.md                           # This file
├── scripts/
│   └── align_tables.sh                # Automated table name replacement
├── db/
│   └── compat_views.sql               # SQL views for rollback compatibility
├── src/
│   ├── db/
│   │   ├── tables.ts                  # Table name constants
│   │   └── pg.ts                      # PostgreSQL connection helper
│   └── repos/                         # Repository pattern examples
│       ├── tarotV2.ts                 # Tarot V2 operations
│       ├── deck.ts                    # Deck management
│       ├── calls.ts                   # Call system
│       ├── availability.ts            # Reader availability
│       └── payments.ts                # Payments & wallets
└── tests/
    └── alignment.spec.ts              # Basic alignment tests
```

---

## 🚀 **QUICK START**

### 1. Create Feature Branch
```bash
git checkout -b chore/backend-table-alignment
```

### 2. Run Dry-Run Check
```bash
# See what would be changed without modifying files
bash scripts/align_tables.sh --dry-run
```

### 3. Execute Alignment
```bash
# Perform actual replacements (creates .bak files)
bash scripts/align_tables.sh
git diff  # Review changes
```

### 4. Adopt Table Constants
```typescript
// Replace hardcoded table names
import { TABLES } from './db/tables';

// Instead of:
const { data } = await supabase.from('deck_cards').select('*');

// Use:
const { data } = await supabase.from(TABLES.DECK_CARDS).select('*');
```

### 5. Migrate to Repository Pattern
```typescript
// Use provided repository examples
import { DeckRepository } from './repos/deck';
import { TarotV2Repository } from './repos/tarotV2';

const deckRepo = new DeckRepository(supabase);
const cards = await deckRepo.listDeckCards(deckTypeId);
```

---

## 🔧 **AFFECTED TABLES**

| Old Reference | New Table Name | Purpose |
|--------------|----------------|---------|
| `tarot.deck_cards` | `deck_cards` | Card assets |
| `tarot.deck_uploads` | `deck_uploads` | Upload tracking |
| `calls.consent_logs` | `call_consent_logs` | Legal consent |
| `calls.emergency_extensions` | `call_emergency_extensions` | Call extensions |
| `readers.availability` | `reader_availability` | Scheduling |
| `readers.emergency_requests` | `reader_emergency_requests` | Emergency workflow |
| `readers.availability_overrides` | `reader_availability_overrides` | Schedule exceptions |
| `tarot.v2_card_selections` | `tarot_v2_card_selections` | Progressive reveal |
| `tarot.v2_audit_logs` | `tarot_v2_audit_logs` | Security logging |
| `payments.transactions` | `payment_transactions` | Transaction history |
| `users.wallets` | `user_wallets` | Wallet balances |

---

## 🛡️ **SAFETY MEASURES**

### Backup Strategy
- Script creates `.bak` files for all modified files
- Git branch isolation prevents main branch impact
- Rollback SQL views available if needed

### Zero Theme Impact
- **NO UI/theme files will be touched**
- Only backend query modifications
- API contracts remain unchanged
- Frontend completely unaffected

### Validation
```bash
# Check for any remaining schema references
grep -r "tarot\." src/api/
grep -r "calls\." src/api/
grep -r "readers\." src/api/
grep -r "payments\." src/api/
grep -r "users\.wallets" src/api/

# Should return NO results after alignment
```

---

## 📊 **TESTING**

### Unit Tests
```bash
npm test -- src/tests/alignment.spec.ts
```

### Integration Tests
```bash
# Test all new table operations
npm run test:integration:tables
```

### Manual Verification
```bash
# Test each repository
node -e "
const { DeckRepository } = require('./src/repos/deck');
const repo = new DeckRepository(supabase);
repo.listDeckCards('test-deck-id').then(console.log);
"
```

---

## 🔄 **ROLLBACK PLAN**

### Option 1: Git Rollback
```bash
git checkout main
git branch -D chore/backend-table-alignment
```

### Option 2: SQL Views Compatibility
```bash
# Create views that mimic old schema structure
psql -f db/compat_views.sql
```

### Option 3: Restore from Backups
```bash
# Restore specific files from .bak files
find . -name "*.bak" -exec bash -c 'mv "$1" "${1%.bak}"' _ {} \;
```

---

## 🚦 **DEPLOYMENT STRATEGY**

### Phase 1: Staging (Week 1)
- Deploy to staging environment
- Run full test suite
- Performance benchmarking

### Phase 2: Canary (Week 2)
- 10% production traffic
- Monitor error rates
- Gradual increase: 25% → 50%

### Phase 3: Full Production (Week 3)
- 100% traffic migration
- Monitor for 48 hours
- Remove fallback views

---

## 📋 **CHECKLIST**

### Pre-Deployment
- [ ] All tests passing
- [ ] No hardcoded table names remaining
- [ ] Repository pattern adopted
- [ ] API contracts unchanged
- [ ] Theme/UI completely untouched

### Post-Deployment
- [ ] All endpoints responding correctly
- [ ] RLS policies functioning
- [ ] Performance metrics normal
- [ ] Error rates within acceptable range
- [ ] Security audit logs clean

---

## 🔍 **TROUBLESHOOTING**

### Common Issues

#### "Table not found" errors
```bash
# Check if table exists in public schema
psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%deck%';"
```

#### RLS policy violations
```bash
# Verify RLS policies active
psql -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;"
```

#### Performance degradation
```bash
# Check for missing indexes
psql -c "EXPLAIN ANALYZE SELECT * FROM deck_cards WHERE deck_type_id = 'test';"
```

---

## 📞 **SUPPORT**

- **Technical Issues**: Backend team lead
- **Database Questions**: DevOps team
- **Security Concerns**: Security team
- **Rollback Decisions**: Tech lead approval required

---

*Backend API Alignment Package v1.0*  
*Compatible with SAMIA TAROT Production Database*  
*Zero Theme Impact Guarantee*

**🚀 ALIGN BACKEND QUERIES FOR PRODUCTION READINESS**