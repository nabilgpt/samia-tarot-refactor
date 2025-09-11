# M25 Personalization (Internal AI Only) - Documentation

**Version**: 1.0  
**Status**: Production Ready  
**Privacy**: No PII in features; strict opt-out enforcement  
**Client Policy**: No AI text exposed to clients  

---

## Overview

The M25 Personalization module implements **server-side ranking and recommendation** with strict privacy controls. All AI reasoning is **internal only** - clients receive ranked item IDs with scores but never see AI-generated text or rationale.

### Key Principles

- **Privacy First**: No PII in feature vectors; IDs and aggregated metrics only
- **Opt-Out Enforced**: Users can disable personalization; defaults respected
- **DB-First Security**: RLS policies enforced before route guards
- **Internal AI Only**: No client-visible AI text; ranking rationale stays server-side
- **Deterministic**: Same inputs produce same rankings for consistency

---

## Architecture

### Components

1. **Database Schema** (`002_personalization_schema.sql`)
   - `personalization_features`: Privacy-safe user feature vectors
   - `personalization_ranks`: Cached rankings with expiration
   - `personalization_eval`: Offline evaluation metrics
   - `personalization_settings`: User opt-in/opt-out controls

2. **Core Service** (`personalization_service.py`)
   - Feature extraction (no PII)
   - Rule-based ranking algorithms
   - Caching with TTL
   - Opt-out enforcement

3. **API Layer** (`personalization_api.py`)
   - JWT-protected internal endpoints
   - Admin metrics access
   - User settings management
   - No AI text in responses

4. **Jobs Pipeline** (`personalization_jobs.py`)
   - Nightly feature refresh
   - Ranking pre-generation
   - Cleanup expired data
   - Evaluation metrics update

---

## Data Model

### Feature Vector (Privacy-Safe)

```json
{
  "user_id": "uuid",
  "engagement_score": 0.75,        // 0-1: completion rate
  "notification_ctr": 0.6,         // 0-1: click-through rate
  "session_count_7d": 5,           // Recent activity count
  "session_count_30d": 20,         // Monthly activity
  "avg_session_duration_sec": 300, // Average engagement time
  "preferred_time_slot": 14,       // 0-23 hour preference
  "device_type": "mobile",         // Device category
  "country_code": "US",            // ISO code only (no PII)
  "timezone_offset": -8            // For cohort grouping
}
```

### Ranking Output

```json
{
  "scope": "daily_horoscopes",
  "items": [
    {
      "id": "2001",
      "score": 0.9234,
      "confidence": 0.85
      // rationale_tags are INTERNAL ONLY - never exposed
    }
  ],
  "cached": true,
  "model_version": "rule_v1"
}
```

---

## API Endpoints

### Internal Recommendation (JWT Required)

```bash
POST /personalization/recommend
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "scope": "daily_horoscopes",
  "limit": 10
}
```

**Response**: Ranked item IDs with scores (no AI rationale)

### User Settings

```bash
GET /personalization/settings
POST /personalization/settings
{
  "personalization_enabled": true,
  "data_sharing_consent": false
}
```

### Admin Metrics (Admin Only)

```bash
GET /personalization/metrics
POST /personalization/admin/evaluate
POST /personalization/admin/refresh
```

---

## Privacy & Security

### Data Protection

- **No PII**: Features contain only aggregated metrics and IDs
- **Opt-Out Enforced**: `personalization_enabled = false` blocks all processing
- **Data Minimization**: Only necessary features stored
- **Retention Limits**: Expired rankings auto-deleted
- **Secure Storage**: All data in private DB with RLS

### RLS Policies

```sql
-- Users see own data only; Admin/Superadmin see all
create policy personalization_features_user_own on personalization_features
  for all using (
    user_id = auth.uid() or
    exists (select 1 from profiles p where p.id = auth.uid() and p.role_id in (1,2))
  );
```

### Access Control Matrix

| Role | Features | Rankings | Evaluation | Settings |
|------|----------|----------|------------|----------|
| Client | Own only | Own only | None | Own only |
| Reader | Own only | Own only | None | Own only |
| Monitor | None | None | None | None |
| Admin | All | All | Full | All |
| Superadmin | All | All | Full | All |

---

## Ranking Algorithm

### Current Implementation: Rule-Based (v1)

**Daily Horoscopes Ranking**:
1. User's zodiac sign gets highest priority (score boost +0.3)
2. High engagement users get additional boost (+0.2)
3. Recently approved content gets recency boost (+0.1)
4. Related signs ranked by compatibility

**Notifications Ranking**:
1. Order updates: highest priority (0.9 base score)
2. Daily horoscope: high for engaged users (0.8 base score)
3. Community activity: medium (0.4 base score)
4. Promotions: low priority (0.3 base score)

**Rationale Tags** (internal only):
- `user_zodiac`, `high_engagement`, `responsive_user`
- `daily_habit`, `social`, `low_engagement`

### Future: ML Models

Placeholder for lightweight ML models:
- Collaborative filtering for similar user patterns
- Content-based filtering for item features
- Hybrid approach with A/B testing

---

## Evaluation Metrics

### Offline Metrics (Admin Dashboard)

- **Precision@K**: Relevance of top K recommendations
- **MAP/NDCG Surrogates**: Ranking quality approximations
- **Coverage**: Percentage of users receiving recommendations
- **Diversity**: Variety in recommendation types

### Online Metrics (Derived)

- **Click-Through Rate**: Notification engagement
- **Listen-Through Rate**: Horoscope completion
- **Session Duration**: Engagement time impact
- **Return Rate**: Multi-day usage patterns

### Evaluation Schedule

- **Nightly**: Update engagement-based metrics
- **Weekly**: Coverage and diversity analysis
- **Monthly**: Full model performance review

---

## Operations

### Nightly Jobs

```bash
# Refresh user features (active users only)
python personalization_jobs.py nightly_refresh

# Clean up expired data
python personalization_jobs.py cleanup

# Model training (future)
python personalization_jobs.py model_training
```

### Job Schedule (Cron)
```bash
# 2 AM daily: Feature refresh
0 2 * * * cd /opt/samia-tarot && python personalization_jobs.py nightly_refresh

# 3 AM daily: Cleanup
0 3 * * * cd /opt/samia-tarot && python personalization_jobs.py cleanup
```

### Monitoring

**Key Metrics to Monitor**:
- Feature extraction success rate (>95%)
- Ranking cache hit rate (>80%)
- Job completion time (<30 minutes)
- Opt-out rate (<5%)

**Alert Conditions**:
- Job failures
- High error rates in feature extraction
- Unusual opt-out spikes
- Cache miss rates >50%

---

## Configuration

### Environment Variables

```bash
# Database
DB_DSN=postgresql://user:pass@host:port/db

# Feature flags
PERSONALIZATION_ENABLED=true
ML_MODELS_ENABLED=false

# Job settings
FEATURE_REFRESH_BATCH_SIZE=500
RANKING_CACHE_TTL_HOURS=24
MAX_RANKING_ITEMS=50
```

### Feature Flags

```python
# Admin can toggle personalization features
POST /admin/features
{
  "personalization_rankings": true,
  "ml_models": false,
  "evaluation_metrics": true
}
```

---

## Testing

### Test Categories

1. **Unit Tests**: Core ranking logic, feature extraction
2. **Privacy Tests**: No PII in features, opt-out enforcement  
3. **Security Tests**: RLS isolation, unauthorized access
4. **Performance Tests**: Ranking speed, cache efficiency
5. **Integration Tests**: API endpoints, job execution

### Running Tests

```bash
# Full test suite
python -m pytest test_m25_personalization.py -v

# Specific test categories
python -m pytest test_m25_personalization.py::TestPersonalizationSecurity -v
```

### Test Coverage Requirements

- Feature extraction: 100%
- Ranking algorithms: 95%
- API endpoints: 90%
- RLS policies: 100%
- Opt-out enforcement: 100%

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy with `PERSONALIZATION_ENABLED=false`
- Run jobs in dry-run mode
- Validate data collection

### Phase 2: Limited Rollout (Week 2-3)  
- Enable for 10% of users
- Monitor metrics and performance
- A/B test against random ordering

### Phase 3: Full Production (Week 4)
- Enable for all opted-in users
- Continuous monitoring
- Weekly performance reviews

### Rollback Plan

**Immediate Rollback** (if needed):
```bash
# Disable ranking use; keep data intact
UPDATE personalization_settings SET personalization_enabled = false;

# Fall back to default ordering in application layer
export PERSONALIZATION_ENABLED=false
```

**Data Preservation**: All data remains intact during rollback

---

## Troubleshooting

### Common Issues

**Low Ranking Quality**:
- Check feature extraction success rates
- Verify user engagement data availability
- Review ranking algorithm parameters

**High Cache Miss Rate**:  
- Increase cache TTL if appropriate
- Check job execution frequency
- Monitor active user patterns

**Privacy Concerns**:
- Audit feature vectors for PII
- Verify opt-out enforcement
- Check RLS policy effectiveness

### Debug Commands

```sql
-- Check feature extraction status
SELECT user_id, computed_at, engagement_score 
FROM personalization_features 
WHERE computed_at > now() - interval '1 day'
ORDER BY computed_at DESC LIMIT 10;

-- Check ranking cache status
SELECT scope, count(*) as cached_users, 
       avg(array_length(ranked_items, 1)) as avg_items
FROM personalization_ranks 
WHERE valid_until > now()
GROUP BY scope;

-- Check opt-out rates
SELECT 
  count(*) as total_users,
  count(*) FILTER (WHERE personalization_enabled = false) as opted_out,
  round(100.0 * count(*) FILTER (WHERE personalization_enabled = false) / count(*), 2) as opt_out_rate
FROM personalization_settings;
```

---

## Future Enhancements

### Short Term (Next Release)
- A/B testing framework
- More sophisticated time-of-day modeling
- Cross-service recommendation (orders → horoscopes)

### Medium Term (3-6 months)
- Lightweight collaborative filtering
- Seasonal/calendar-aware ranking
- Real-time feature updates

### Long Term (6+ months)
- Deep learning models (if data volume justifies)
- Multi-armed bandit optimization
- Cross-platform personalization

---

## Compliance Notes

### GDPR Compliance
- ✅ Lawful basis: Legitimate interest for service improvement
- ✅ Data minimization: Only necessary features collected
- ✅ Right to object: Opt-out functionality provided
- ✅ Retention limits: Automated data cleanup
- ✅ Privacy by design: No PII in feature vectors

### Data Processing Record
- **Purpose**: Improve user experience through personalized content ranking
- **Legal Basis**: Legitimate interest (Article 6(1)(f) GDPR)
- **Data Categories**: Engagement metrics, preferences (no personal identifiers)
- **Retention**: Features: 30 days; Rankings: 24 hours; Evaluations: 1 year
- **Recipients**: Internal systems only
- **Transfers**: None (all processing in EU/adequate regions)

---

**Document Control**:
- **Document ID**: PERS-M25-2025-001
- **Version**: 1.0
- **Last Updated**: January 2025
- **Next Review**: Post-deployment + 30 days