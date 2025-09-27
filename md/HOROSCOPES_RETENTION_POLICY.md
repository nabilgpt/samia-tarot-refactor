# Daily Horoscopes Retention Policy

## Overview
Strict retention policy for daily horoscopes to comply with privacy requirements and storage optimization.

## Policy Rules

### 1. Public Access (Unauthenticated)
- **Scope:** `scope = 'daily'` only
- **Date:** Today's date only (`DATE(ref_date) = CURRENT_DATE`)
- **Approval:** `approved_at IS NOT NULL` and `approved_by` is set
- **RLS:** Enforced at database level

**SQL Policy:**
```sql
CREATE POLICY horoscopes_public_read ON horoscopes
  FOR SELECT
  TO anon
  USING (
    scope = 'daily'
    AND DATE(ref_date) = CURRENT_DATE
    AND approved_at IS NOT NULL
  );
```

### 2. Internal Access (Reader/Admin/Superadmin)
- **Scope:** All scopes (daily, monthly, special)
- **Date Range:** Up to 60 days from today
- **Approval:** Not required (can view unapproved for review)
- **Access:** Via Signed URLs only (15 minute TTL)

**SQL Policy:**
```sql
CREATE POLICY horoscopes_internal_read ON horoscopes
  FOR SELECT
  TO authenticated
  USING (
    (
      get_user_role() IN ('reader', 'admin', 'superadmin', 'monitor')
    )
    AND (
      ref_date >= CURRENT_DATE - INTERVAL '60 days'
    )
  );
```

### 3. Hard Deletion (Automated)
- **Trigger:** Records older than 60 days
- **Frequency:** Daily at 02:00 UTC
- **Actions:**
  1. Delete from `horoscopes` table
  2. Delete associated media from Supabase Storage
  3. Log deletion in audit_log
  4. Cannot be recovered

**Scheduled Job (n8n):**
```javascript
// Daily cleanup at 02:00 UTC
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 60);

const { data: oldHoroscopes } = await supabase
  .from('horoscopes')
  .select('id, media_path')
  .lt('ref_date', cutoffDate.toISOString());

for (const horoscope of oldHoroscopes) {
  // Delete media from storage
  if (horoscope.media_path) {
    await supabase.storage
      .from('private-horoscopes')
      .remove([horoscope.media_path]);
  }

  // Delete from database
  await supabase
    .from('horoscopes')
    .delete()
    .eq('id', horoscope.id);

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      action: 'horoscope_purged',
      resource_type: 'horoscope',
      resource_id: horoscope.id,
      metadata: { ref_date: horoscope.ref_date, reason: 'retention_policy' }
    });
}
```

## Frontend Implementation

### GET /api/horoscopes/daily (Public)
```javascript
// Returns only today's approved horoscopes
const getDailyHoroscopes = async () => {
  const response = await fetch('/api/horoscopes/daily');
  const data = await ensureOk(response);

  // Backend MUST filter to today only
  // Frontend displays as-is (no additional filtering)
  return Array.isArray(data?.horoscopes) ? data.horoscopes : [];
};
```

### GET /api/horoscopes/{id}/media (Internal)
```javascript
// Returns short-lived Signed URL
const getHoroscopeMedia = async (horoscopeId) => {
  const response = await fetch(`/api/horoscopes/${horoscopeId}/media`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });

  const data = await ensureOk(response);

  return {
    signedUrl: data.signedUrl,  // ≤15 minute TTL
    expiresAt: data.expiresAt,
    mediaType: data.mediaType
  };
};
```

## Backend Validation

### Route: GET /api/horoscopes/daily
```python
@router.get("/horoscopes/daily")
async def get_daily_horoscopes():
    """
    Public endpoint - returns only today's approved horoscopes
    RLS enforced at DB level
    """
    today = datetime.utcnow().date()

    query = """
        SELECT id, zodiac, scope, content_preview, ref_date
        FROM horoscopes
        WHERE scope = 'daily'
          AND DATE(ref_date) = %s
          AND approved_at IS NOT NULL
        ORDER BY zodiac
    """

    results = await db.fetch_all(query, [today])

    return {
        "horoscopes": results,
        "date": today.isoformat(),
        "count": len(results)
    }
```

### Route: GET /api/horoscopes/{id}/media
```python
@router.get("/horoscopes/{horoscope_id}/media")
async def get_horoscope_media(
    horoscope_id: str,
    user: User = Depends(require_auth)
):
    """
    Internal only - requires authentication
    Returns short-lived Signed URL (15 minutes)
    """
    # Check user role
    if user.role not in ['reader', 'admin', 'superadmin', 'monitor']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Fetch horoscope (RLS filters by date automatically)
    horoscope = await db.fetch_one(
        "SELECT id, media_path, ref_date FROM horoscopes WHERE id = %s",
        [horoscope_id]
    )

    if not horoscope:
        raise HTTPException(status_code=404, detail="Horoscope not found or expired")

    # Generate short-lived Signed URL
    signed_url = await storage.create_signed_url(
        bucket='private-horoscopes',
        path=horoscope['media_path'],
        expires_in=900  # 15 minutes
    )

    return {
        "signedUrl": signed_url,
        "expiresAt": (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
        "mediaType": "audio/mpeg"
    }
```

## Testing Checklist

- [ ] Public endpoint returns only today's approved horoscopes
- [ ] Public endpoint does NOT return yesterday's horoscopes
- [ ] Public endpoint does NOT return unapproved horoscopes
- [ ] Internal endpoint requires authentication
- [ ] Internal endpoint returns Signed URLs with 15min TTL
- [ ] Internal endpoint respects 60-day window
- [ ] Signed URLs expire after 15 minutes
- [ ] Automated cleanup job runs daily
- [ ] Deleted horoscopes cannot be accessed
- [ ] Audit log captures all deletions

## Monitoring

**Alerts:**
- Alert if public endpoint returns non-today dates
- Alert if Signed URLs have TTL > 15 minutes
- Alert if cleanup job fails
- Alert if storage usage exceeds threshold

**Metrics:**
```
horoscopes_public_requests_total
horoscopes_internal_requests_total
horoscopes_purged_total
horoscopes_storage_bytes
```

## Compliance

- ✅ No horoscopes older than 60 days stored
- ✅ Public access limited to current day only
- ✅ All media access requires Signed URLs
- ✅ No caching of Signed URLs on client
- ✅ Audit trail for all deletions