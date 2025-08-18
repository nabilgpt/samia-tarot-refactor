# Backend API Alignment Integration Guide

**Status**: ✅ Ready for Production Integration  
**Package Location**: `./backend_api_alignment_pkg/`  
**Theme Preservation**: ✅ No theme/branding changes

## Quick Integration Steps

### 1. Create Feature Branch
```bash
cd /path/to/samia-tarot
git checkout -b chore/backend-table-alignment
```

### 2. Review Changes (Dry Run)
```bash
bash backend_api_alignment_pkg/scripts/align_tables.sh --dry-run
```

### 3. Apply Table Name Alignment
```bash
bash backend_api_alignment_pkg/scripts/align_tables.sh
git diff  # Review all changes
```

### 4. Adopt Central Table Constants

Replace hardcoded table names with:
```typescript
import { TABLES } from './backend_api_alignment_pkg/src/db/tables';

// Instead of: supabase.from('tarot.deck_cards')
// Use: supabase.from(TABLES.DECK_CARDS)
```

### 5. Integrate Repository Classes (Optional)

Copy optimized repositories from `./backend_api_alignment_pkg/src/repos/`:
- `PaymentsRepository` - Short, focused payment & wallet operations
- `CallsRepository` - Consent logging & emergency extensions
- `AvailabilityRepository` - Reader scheduling & emergency opt-in

### 6. Deploy with Zero Downtime

1. **Staging Tests**: Run integration tests
2. **Feature Flag**: `backend.flatTables = ON`
3. **Canary Rollout**: 10% → 25% → 50% → 100%
4. **Rollback Safety**: SQL views in `db/compat_views.sql` if needed

## Package Contents

```
backend_api_alignment_pkg/
├── README.md                    # Integration instructions
├── scripts/
│   └── align_tables.sh         # Automated table name replacement
├── db/
│   └── compat_views.sql        # Rollback safety views
├── src/
│   ├── db/
│   │   ├── tables.ts           # Central table name constants
│   │   └── pg.ts               # Supabase helper
│   └── repos/
│       ├── payments.ts         # Short payment repository
│       ├── calls.ts            # Short calls repository
│       └── availability.ts     # Short availability repository
└── tests/
    └── alignment.spec.ts       # Basic validation tests
```

## Security Maintained

- ✅ **RLS Enforcement**: All queries use user JWT tokens
- ✅ **AI Content Isolation**: No client access to AI drafts
- ✅ **Consent Logging**: IP addresses & timestamps preserved
- ✅ **Admin Controls**: Service Role used only where necessary

## Production Features Preserved

All 8 production features (A-H) remain fully functional:
- ✅ Arabic RTL & compact lists
- ✅ Admin spread visibility (Public/Targeted)
- ✅ Deck bulk upload (78+1 cards)
- ✅ Reader availability & emergency opt-in
- ✅ Tarot V2 client-reveal with AI isolation
- ✅ Calls/WebRTC with consent & recording
- ✅ Daily Zodiac pipeline (07:00 Asia/Beirut)
- ✅ Security & RLS coverage

## Performance Benefits

- **Simplified Queries**: Direct table access, no schema joins
- **Maintainable Code**: Central constants, no hardcoded strings  
- **Short Repositories**: Focused, single-responsibility classes
- **TypeScript Safety**: Full type checking for table names

## Rollback Plan

If issues arise:
```sql
-- Apply compatibility views for instant rollback
psql -f backend_api_alignment_pkg/db/compat_views.sql
-- All old schema-based queries will work immediately
```

## Testing

```bash
# Run alignment tests
npm test backend_api_alignment_pkg/tests/alignment.spec.ts

# Verify table constants
node -e "console.log(require('./backend_api_alignment_pkg/src/db/tables.js').TABLES)"
```

---

**Remember**: No theme/branding changes. Keep code maintainable and short.