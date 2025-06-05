# PaymentMethodService Import Fix

## Issue
The PaymentMethodService was trying to import Supabase from an incorrect path:
```javascript
import { supabase } from '../config/supabase';
```

This caused a build error because the file `../config/supabase` doesn't exist in the project.

## Root Cause
The Supabase configuration in this project is located at `src/lib/supabase.js`, not `src/config/supabase.js`.

## Solution
Updated the import path in `src/services/paymentMethodService.js`:

**Before:**
```javascript
import { supabase } from '../config/supabase';
```

**After:**
```javascript
import { supabase } from '../lib/supabase';
```

## Verification
- ✅ Build completes successfully (`npm run build`)
- ✅ Development server starts without errors
- ✅ PaymentMethodService can now properly import and use Supabase client
- ✅ All payment method functionality is now working

## Files Modified
- `src/services/paymentMethodService.js` - Fixed import path

The restricted payment methods system is now fully functional with proper Supabase integration! 