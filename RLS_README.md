# M16.2 Row Level Security (RLS) Implementation

## Overview

This document describes the RLS implementation for SAMIA-TAROT platform, providing end-to-end security enforcement at both database and API layers.

## Applied Tables

RLS is enabled on the following tables:
- `profiles` - User profile data
- `orders` - Service orders and assignments
- `media_assets` - Uploaded media files 
- `horoscopes` - Daily horoscope content
- `calls` - Voice call sessions
- `moderation_actions` - Moderation log
- `audit_log` - System audit trail
- `payment_intents` - Payment processing
- `payment_attempts` - Payment retry logic (new)
- `wallets` - User wallet balances (new)
- `wallet_ledger` - Wallet transaction history (new)

## Policy Model

### Profiles
- **User**: Can select/update own profile only
- **Admin/Superadmin**: Can select all profiles
- **Delete**: Superadmin only

### Orders
- **Client**: Can select/insert/update own orders
- **Reader**: Can select/update orders where `assigned_reader = auth.uid()`
- **Monitor/Admin/Superadmin**: Full access

### Media Assets
- **Owner**: Can select own assets
- **Reader**: Can select if asset is referenced by an assigned order
- **Admin/Monitor**: Full access

### Horoscopes
- **Public**: Select only when `approved_at IS NOT NULL`
- **Create/Update**: Monitor/Admin/Superadmin only

### Calls
- **Client/Reader**: Can select calls for orders they're involved in
- **Monitor/Admin**: Full access

### Admin-Only Tables
The following tables are restricted to Monitor/Admin/Superadmin roles:
- `moderation_actions`
- `audit_log` 
- `payment_intents`
- `payment_attempts`

### Wallets & Ledger
- **Owner**: Can select own wallet/ledger
- **Monitor/Admin/Superadmin**: Full access

## Route Guards

API endpoints include matching route guards that mirror RLS policies:

```python
# Example usage in API endpoint
@app.get("/orders/{order_id}")
def get_order(order_id: int, x_user_id: str = Header(...)):
    user_id = x_user_id
    
    # Route guard mirrors RLS policy
    if not can_access_order(user_id, order_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Query will also be filtered by RLS at DB level
    return db_fetchone("SELECT * FROM orders WHERE id = %s", (order_id,))
```

## Helper Functions

### Database Function
- `public.get_user_role(user_id UUID)` - Returns user role code or 'user' default

### API Route Guards
- `can_access_profile(user_id, target_id)` - Profile access check
- `can_delete_profile(user_id)` - Profile deletion check (superadmin only)
- `can_access_order(user_id, order_id)` - Order access check
- `can_access_media_asset(user_id, asset_id)` - Media asset access check
- `can_access_horoscope(user_id, horoscope_id, for_management)` - Horoscope access check
- `can_access_call(user_id, call_id, order_id)` - Call access check
- `can_access_admin_data(user_id)` - Admin-only data check
- `can_access_wallet(user_id, target_user_id)` - Wallet access check

## Security Model

### Defense in Depth
1. **Database Level**: RLS policies prevent unauthorized data access at the source
2. **API Level**: Route guards provide early rejection of unauthorized requests
3. **Application Level**: Business logic enforces additional constraints

### Role Hierarchy
```
superadmin > admin > monitor > reader > user
```

### Default Deny
- All policies use deny-by-default approach
- Explicit allow rules for each role level
- No data leakage between user contexts

## Performance Considerations

### Indexes Added
The following indexes support RLS policy performance:
- `idx_orders_user_id` on `orders(user_id)`
- `idx_orders_assigned_reader` on `orders(assigned_reader)`
- `idx_media_assets_owner_id` on `media_assets(owner_id)`
- `idx_wallets_user_id` on `wallets(user_id)`
- `idx_payment_attempts_order_id` on `payment_attempts(order_id)`
- `idx_wallet_ledger_wallet_id` on `wallet_ledger(wallet_id)`

### Query Optimization
- RLS policies use indexed columns for filtering
- Role function is cached per transaction
- Policies avoid expensive joins where possible

## Testing

### Auth Matrix Tests
Run `python test_rls_auth_matrix.py` to verify:
- ✅ Role-based access control
- ✅ Cross-tenant isolation 
- ✅ Route guards match DB policies
- ✅ Privilege escalation prevention

### Smoke Tests
```bash
# Run basic functionality tests
python test_rls_auth_matrix.py

# Full test suite (requires pytest)
pytest test_rls_auth_matrix.py -v
```

## Migration

### Applied
- `010_rls.sql` - Enables RLS and creates all policies (idempotent)

### Rollback
If rollback needed:
```sql
-- Disable RLS (preserves data)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Drop helper function
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
```

## Known Limitations

1. **Supabase Auth Integration**: Currently uses custom `get_user_role()` function instead of built-in Supabase auth helpers
2. **Policy Complexity**: Some policies with EXISTS clauses may impact performance on large datasets
3. **Admin Override**: Superadmin role bypasses most restrictions - use carefully
4. **Cross-Schema**: Cannot access `auth` schema directly, uses `public.get_user_role()` bridge function

## Extending RLS

### Adding New Tables
1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create policies following the established pattern
3. Add route guards in `api.py`
4. Add tests in `test_rls_auth_matrix.py`
5. Document in this file

### Adding New Roles
1. Update `roles` table with new role
2. Modify `get_user_role()` function if needed
3. Update all relevant policies
4. Update route guards to include new role
5. Test privilege boundaries

## Compliance

This RLS implementation supports:
- **Data Privacy**: Users can only access their own data
- **Role Separation**: Clear boundaries between user types
- **Audit Compliance**: All access attempts are logged
- **Multi-tenancy**: Automatic tenant isolation
- **Least Privilege**: Minimal required access per role