# M18 Horoscope Ingestion Implementation

## Overview

Compliant daily horoscope audio ingestion system with strict Monitor approval gate. Supports both original admin uploads (preferred) and optional TikTok metadata linking, ensuring all content requires Monitor approval before public visibility.

## Publishing Gate Model

```
[Admin Upload/Ingest] → [Pending] → [Monitor Review] → [Approved/Rejected]
                           ↓              ↓                    ↓
                      (Hidden from    (Approve/Reject)   [Public Visible]
                       public)             ↓                    ↓
                                    [Audit Trail]        [Signed Audio URLs]
```

**Content Flow:**
1. Admin uploads original audio OR ingests TikTok metadata
2. Content stored in `pending` state (`approved_at = NULL`)
3. Monitor reviews via `/monitor/horoscopes/pending`
4. Monitor approves OR rejects with reason
5. Only approved content visible to public via existing API
6. All operations audited for compliance

## Data Model

### Horoscopes Table
```sql
horoscopes(
  scope,              -- 'daily' (now), 'monthly' (later)
  zodiac,             -- Aries, Taurus, etc.
  ref_date,           -- YYYY-MM-DD target date
  audio_media_id,     -- FK to media_assets (optional for TikTok-linked)
  approved_by,        -- UUID of monitor who approved
  approved_at,        -- Timestamp of approval (NULL = pending)
  source_kind,        -- 'original_upload', 'tiktok_api', 'tiktok_linked'
  source_ref,         -- TikTok URL or API reference
  UNIQUE(scope, zodiac, ref_date)  -- Idempotent upserts
)
```

### Source Types
- **original_upload**: Admin-uploaded audio files (preferred)
- **tiktok_api**: Official TikTok Developer/Business API integration
- **tiktok_linked**: TikTok post URL reference (metadata only)

## API Endpoints

### Admin Operations

#### Upload Original Audio
```bash
POST /api/admin/horoscopes/upload-audio
Authorization: Bearer {jwt}
X-User-Id: {admin_uuid}

{
  "zodiac": "Aries",
  "ref_date": "2025-01-15",
  "audio_file_base64": "UklGRi4AAABXQVZFZm10...",
  "content_type": "audio/mpeg"
}

# Response: 201
{
  "success": true,
  "horoscope_id": 123,
  "status": "pending",
  "zodiac": "Aries", 
  "ref_date": "2025-01-15"
}
```

#### Schedule Daily Horoscopes
```bash
POST /api/admin/horoscopes/schedule
Authorization: Bearer {jwt}
X-User-Id: {admin_uuid}

{
  "ref_date": "2025-01-15"
}

# Response: 200
{
  "success": true,
  "ref_date": "2025-01-15",
  "created": 10,
  "existing": 2,
  "total_signs": 12
}
```

#### TikTok Metadata Ingestion (Optional)
```bash
POST /api/admin/horoscopes/ingest/tiktok
Authorization: Bearer {jwt}
X-User-Id: {admin_uuid}

{
  "zodiac": "Leo",
  "ref_date": "2025-01-15", 
  "tiktok_url": "https://www.tiktok.com/@samia/video/123456",
  "api_metadata": {"duration": 45, "views": 1000}
}

# Response: 200
{
  "success": true,
  "horoscope_id": 124,
  "status": "pending",
  "zodiac": "Leo",
  "ref_date": "2025-01-15", 
  "source_kind": "tiktok_linked",
  "note": "TikTok metadata stored. Requires Monitor approval before public visibility."
}
```

### Monitor Operations

#### View Pending Queue
```bash
GET /api/monitor/horoscopes/pending
Authorization: Bearer {jwt}
X-User-Id: {monitor_uuid}

# Response: 200
{
  "pending_horoscopes": [
    {
      "id": 123,
      "scope": "daily",
      "zodiac": "Aries",
      "ref_date": "2025-01-15",
      "source_kind": "original_upload",
      "source_ref": null,
      "has_audio": true,
      "audio_bytes": 2048576,
      "audio_preview_url": "https://supabase.com/storage/signed-url/audio.mp3?token=...",
      "created_at": "2025-01-15T08:00:00Z"
    }
  ],
  "count": 1
}
```

#### Approve Horoscope
```bash
POST /api/monitor/horoscopes/123/approve
Authorization: Bearer {jwt}
X-User-Id: {monitor_uuid}

{
  "note": "High quality reading, approved for publication"
}

# Response: 200
{
  "id": 123,
  "approved": true
}
```

#### Reject Horoscope
```bash
POST /api/monitor/horoscopes/123/reject
Authorization: Bearer {jwt}
X-User-Id: {monitor_uuid}

{
  "reason": "Audio quality needs improvement - please re-record"
}

# Response: 200
{
  "id": 123,
  "rejected": true,
  "reason": "Audio quality needs improvement - please re-record"
}
```

### Public Access (Existing)

```bash
GET /api/horoscopes?scope=daily&zodiac=Aries&date=2025-01-15
# Returns only approved horoscopes with signed audio URLs
```

## Business Rules

### Idempotency Rules
- Upserts by `(scope, zodiac, ref_date)` - replacing content updates media, resets approval
- Scheduler creates missing rows only (safe re-runs)
- Upload/ingestion replaces existing content and clears approval

### Approval Rules
- **Pending by default**: All content starts unapproved (`approved_at = NULL`)
- **Monitor gate**: Only Monitor/Admin/Superadmin can approve/reject
- **Public visibility**: Only approved content visible via public API
- **Approval persistence**: Once approved, stays approved until replaced

### Audio Rules
- **Formats**: `audio/mpeg` (MP3) and `audio/m4a` supported
- **Size limits**: 1KB minimum, 50MB maximum
- **Validation**: Server-side format verification
- **Storage**: Private Supabase buckets with signed URLs

### TikTok Compliance Rules
- **Preferred path**: Original audio uploads by admin
- **Official APIs only**: No scraping or unauthorized downloads
- **Metadata storage**: URL and API references only
- **Watermarks**: Never strip or modify TikTok content
- **Compliance tracking**: `source_kind` and `source_ref` audited

## Role-Based Access Control

### Admin (roles: 'admin', 'superadmin')
- ✅ Upload original audio (`POST /admin/horoscopes/upload-audio`)
- ✅ Schedule horoscope rows (`POST /admin/horoscopes/schedule`)
- ✅ Ingest TikTok metadata (`POST /admin/horoscopes/ingest/tiktok`)
- ✅ View pending queue (`GET /monitor/horoscopes/pending`)
- ✅ Approve/reject horoscopes
- ❌ Cannot bypass Monitor approval requirement

### Monitor (role: 'monitor')
- ✅ View pending queue (`GET /monitor/horoscopes/pending`)
- ✅ Approve horoscopes (`POST /monitor/horoscopes/:id/approve`)
- ✅ Reject horoscopes (`POST /monitor/horoscopes/:id/reject`)
- ❌ Cannot upload or ingest content directly

### Client/Reader (roles: 'client', 'reader')
- ✅ View approved horoscopes via public API
- ✅ Access signed audio URLs for approved content
- ❌ Cannot see pending content
- ❌ Cannot upload, approve, or reject

## Validation & Security

### Audio File Validation
```python
# Format validation
supported_formats = ['audio/mpeg', 'audio/m4a']

# Size validation  
min_size = 1024           # 1KB minimum
max_size = 50 * 1024 * 1024  # 50MB maximum

# Base64 decoding validation
audio_bytes = base64.b64decode(request.audio_file_base64)

# SHA256 fingerprinting
sha256_hash = hashlib.sha256(audio_bytes).hexdigest()
```

### TikTok URL Validation
```python
# Basic format check
valid_prefixes = [
    'https://www.tiktok.com/',
    'https://vm.tiktok.com/'
]

# Compliance guardrails
# - Official API integration only
# - No content scraping/downloading
# - Metadata storage only
```

### RLS Integration
- Uses M16.2 `can_access_horoscope(user_id, for_management=True)`
- Public API enforces `approved_at IS NOT NULL` filter
- Signed URLs prevent direct storage access
- Route guards mirror database RLS policies exactly

## Audit Trail

### Events Logged
All operations write to `audit_log`:

- **horoscope_audio_upload** - Original audio upload
- **horoscope_schedule** - Bulk row scheduling
- **horoscope_tiktok_ingest** - TikTok metadata ingestion
- **horoscope_approve** - Monitor approval
- **horoscope_reject** - Monitor rejection
- **pending_horoscopes_review** - Queue access

### Moderation Actions
Approve/reject operations also log to `moderation_actions`:
```sql
INSERT INTO moderation_actions(
  actor_id, target_kind, target_id, action, reason, created_at
) VALUES (
  monitor_id, 'horoscope', horoscope_id, 'approve', note, now()
);
```

### Compliance Metadata
TikTok ingestion includes compliance tracking:
```json
{
  "zodiac": "Leo",
  "ref_date": "2025-01-15", 
  "source_kind": "tiktok_linked",
  "tiktok_url": "https://www.tiktok.com/post",
  "compliance_note": "metadata_only"
}
```

## Workflow Examples

### Daily Content Preparation

```bash
# 1. Admin schedules all zodiac signs for tomorrow
curl -X POST /api/admin/horoscopes/schedule \
  -H "Authorization: Bearer $JWT" \
  -H "X-User-Id: $ADMIN_ID" \
  -d '{"ref_date": "2025-01-16"}'

# 2. Admin uploads audio for each sign
for zodiac in Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces; do
  curl -X POST /api/admin/horoscopes/upload-audio \
    -H "Authorization: Bearer $JWT" \
    -H "X-User-Id: $ADMIN_ID" \
    -d "{\"zodiac\": \"$zodiac\", \"ref_date\": \"2025-01-16\", \"audio_file_base64\": \"...\", \"content_type\": \"audio/mpeg\"}"
done

# 3. Monitor reviews and approves
curl -GET /api/monitor/horoscopes/pending \
  -H "Authorization: Bearer $JWT" \
  -H "X-User-Id: $MONITOR_ID"

curl -X POST /api/monitor/horoscopes/123/approve \
  -H "Authorization: Bearer $JWT" \
  -H "X-User-Id: $MONITOR_ID" \
  -d '{"note": "Approved for publication"}'
```

### Content Replacement Flow

```bash
# 1. Admin uploads replacement audio (clears previous approval)
curl -X POST /api/admin/horoscopes/upload-audio \
  -H "Authorization: Bearer $JWT" \
  -H "X-User-Id: $ADMIN_ID" \
  -d '{"zodiac": "Aries", "ref_date": "2025-01-15", "audio_file_base64": "...", "content_type": "audio/mpeg"}'

# 2. Content returns to pending state
# 3. Monitor must re-approve before public visibility
```

## Error Handling

### Common Error Scenarios

#### Invalid Audio Format
```json
{
  "detail": "Unsupported audio format. Use mp3 or m4a",
  "status_code": 400
}
```

#### File Too Large
```json
{
  "detail": "Audio file too large",
  "status_code": 400
}
```

#### Already Approved
```json
{
  "detail": "Horoscope already approved", 
  "status_code": 409
}
```

#### Access Denied
```json
{
  "detail": "Access denied",
  "status_code": 403
}
```

### TikTok Ingestion Errors

#### Invalid URL Format
```json
{
  "detail": "Invalid TikTok URL format",
  "status_code": 400
}
```

#### Compliance Warning
```json
{
  "success": true,
  "note": "TikTok metadata stored. Requires Monitor approval before public visibility.",
  "compliance_note": "metadata_only"
}
```

## Performance Considerations

### Database Indexes
Required indexes for optimal performance:
```sql
-- Uniqueness and lookups
CREATE UNIQUE INDEX horoscopes_scope_zodiac_date ON horoscopes(scope, zodiac, ref_date);

-- Pending queue queries
CREATE INDEX horoscopes_pending ON horoscopes(approved_at) WHERE approved_at IS NULL;

-- Public visibility queries  
CREATE INDEX horoscopes_approved ON horoscopes(approved_at, scope, zodiac, ref_date) WHERE approved_at IS NOT NULL;

-- Media asset ownership
CREATE INDEX media_assets_owner ON media_assets(owner_id);
```

### Storage Optimization
- **Private buckets**: All audio in private Supabase storage
- **Signed URLs**: 1-hour expiry for security
- **CDN caching**: Approved content can be cached
- **Compression**: Prefer compressed audio formats

### Query Optimization
- **Pending queue**: Limited to unapproved rows only
- **Public API**: Pre-filtered by `approved_at IS NOT NULL`
- **Batch operations**: Scheduler processes all signs efficiently

## Testing

### Test Coverage
- ✅ Admin upload/scheduling workflows
- ✅ Monitor approval/rejection flows  
- ✅ RLS compliance (public visibility rules)
- ✅ Audio validation and security
- ✅ TikTok ingestion compliance
- ✅ Idempotency guarantees
- ✅ Audit trail completeness

### Running Tests
```bash
# Full test suite
pytest test_horoscopes_ingestion.py -v

# Smoke tests only
python test_horoscopes_ingestion.py

# Specific test categories
pytest test_horoscopes_ingestion.py::TestHoroscopeIngestionAdminEndpoints -v
pytest test_horoscopes_ingestion.py::TestHoroscopeMonitorApproval -v
```

## Integration Points

### M16.2 RLS Integration
- Route guards use `can_access_horoscope(user_id, for_management=True)`
- Database RLS policies enforce `approved_at IS NOT NULL` for public
- Signed URLs respect RLS ownership rules

### M17 Orders Integration  
- Horoscopes can be referenced in order outputs
- Media assets shared between orders and horoscopes
- Approval workflows consistent across content types

### Storage Integration
- Supabase Storage for all audio files
- Private buckets with RLS-consistent access
- Signed URL generation with expiry

## Known Limitations

1. **TikTok API Integration**: Placeholder implementation - requires official TikTok Business/Developer API setup
2. **Audio Processing**: Basic validation only - no transcoding or quality enhancement
3. **Batch Approval**: Monitor must approve each horoscope individually
4. **Content Scheduling**: No automatic publishing based on time windows
5. **Multi-language**: Content language detection not implemented

## Extending the System

### Adding Monthly Horoscopes
1. Scope already supports `monthly` - just use in requests
2. Update scheduler to handle monthly cadence
3. Extend validation for monthly date ranges

### Enhanced Audio Processing
1. Add server-side transcoding (ffmpeg integration)
2. Implement quality analysis and normalization
3. Add duration and bitrate validation

### Official TikTok Integration
1. Set up TikTok Business/Developer API credentials
2. Replace placeholder with real API calls
3. Implement webhook handling for TikTok updates
4. Add content verification and compliance checks

### Advanced Approval Workflows
1. Multi-stage approval (content → quality → compliance)
2. Batch approval operations
3. Approval templates and quick actions
4. Content versioning and rollback

## Compliance Notes

### TikTok Content Policy
- ✅ **No scraping**: Only official API integration supported
- ✅ **No watermark removal**: Content integrity preserved
- ✅ **Metadata only**: No unauthorized content downloading
- ✅ **Attribution tracking**: Source URL and kind stored
- ✅ **Monitor oversight**: Human approval required

### Data Privacy
- ✅ **Private storage**: All audio in private buckets
- ✅ **Signed URLs**: Time-limited access tokens
- ✅ **Audit logging**: Complete operation history
- ✅ **No PII exposure**: Only IDs and references logged
- ✅ **RLS enforcement**: Database-level access control

### Operational Security
- ✅ **Deny-by-default**: All endpoints require explicit authorization
- ✅ **Role separation**: Admin upload, Monitor approve
- ✅ **Input validation**: File format and size checks
- ✅ **Error sanitization**: No internal details in responses
- ✅ **Rate limiting**: Upload frequency controls (inherited)

## Rollback Procedures

### Content Rollback
```sql
-- Remove specific horoscope
DELETE FROM horoscopes WHERE id = $horoscope_id;

-- Bulk remove by date
DELETE FROM horoscopes WHERE ref_date = '2025-01-15' AND approved_at IS NULL;

-- Revoke approval (return to pending)
UPDATE horoscopes SET approved_by = NULL, approved_at = NULL WHERE id = $horoscope_id;
```

### Media Cleanup
```sql
-- Clean orphaned media assets
DELETE FROM media_assets 
WHERE id NOT IN (
  SELECT audio_media_id FROM horoscopes WHERE audio_media_id IS NOT NULL
  UNION
  SELECT input_media_id FROM orders WHERE input_media_id IS NOT NULL
  UNION  
  SELECT output_media_id FROM orders WHERE output_media_id IS NOT NULL
);
```

M18 implementation provides a secure, compliant, and scalable foundation for daily horoscope content management with strict editorial oversight.