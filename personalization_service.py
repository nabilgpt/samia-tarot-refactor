"""
M25 Personalization Service - Internal AI Only
Privacy-first ranking with no PII in features; strict opt-out enforcement
"""
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from dataclasses import dataclass

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

@dataclass
class UserFeatures:
    user_id: str
    engagement_score: float  # 0-1
    notification_ctr: float  # 0-1
    session_count_7d: int
    session_count_30d: int
    avg_session_duration_sec: int
    preferred_time_slot: Optional[int]  # 0-23
    device_type: Optional[str]
    country_code: Optional[str]
    timezone_offset: Optional[int]

@dataclass
class RankedItem:
    item_id: str
    score: float
    confidence: float
    rationale_tags: List[str]

class PersonalizationService:
    """Internal AI personalization - no client-visible AI text"""
    
    def __init__(self):
        self.model_version = "rule_v1"
    
    def extract_features(self, user_id: str) -> Optional[UserFeatures]:
        """Extract privacy-safe features (no PII)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Check opt-out first
                cur.execute("""
                    select personalization_enabled, data_sharing_consent
                    from personalization_settings 
                    where user_id = %s
                """, (user_id,))
                
                settings = cur.fetchone()
                if settings and not settings[0]:  # opted out
                    return None
                
                # Extract engagement metrics (privacy-safe)
                cur.execute("""
                    select 
                        p.country_code,
                        p.created_at::date,
                        extract(hour from now() at time zone coalesce(p.country, 'UTC')) as current_hour,
                        -- Engagement metrics (last 30 days)
                        count(o.id) filter (where o.created_at > now() - interval '7 days') as sessions_7d,
                        count(o.id) filter (where o.created_at > now() - interval '30 days') as sessions_30d,
                        coalesce(avg(case 
                            when o.delivered_at is not null then 1.0 else 0.0 
                        end), 0) as completion_rate,
                        coalesce(avg(extract(epoch from (
                            o.delivered_at - o.created_at
                        ))), 0) as avg_duration,
                        -- Notification engagement (if available)
                        0.5 as notification_ctr  -- placeholder, would come from M22
                    from profiles p
                    left join orders o on p.id = o.user_id
                        and o.created_at > now() - interval '30 days'
                    where p.id = %s
                    group by p.id, p.country_code, p.created_at
                """, (user_id,))
                
                row = cur.fetchone()
                if not row:
                    return None
                
                return UserFeatures(
                    user_id=user_id,
                    engagement_score=min(1.0, row[5]),  # completion_rate capped at 1.0
                    notification_ctr=row[7],
                    session_count_7d=row[3],
                    session_count_30d=row[4],
                    avg_session_duration_sec=int(row[6]),
                    preferred_time_slot=int(row[2]) if row[2] else None,
                    device_type='mobile',  # would extract from request headers
                    country_code=row[0],
                    timezone_offset=None  # would calculate from country
                )
        finally:
            POOL.putconn(conn)
    
    def generate_rankings(self, user_id: str, scope: str, limit: int = 10) -> List[RankedItem]:
        """Generate personalized rankings (rule-based for now)"""
        features = self.extract_features(user_id)
        if not features:
            return []  # opt-out respected
        
        # Rule-based ranking algorithm (no ML models yet)
        if scope == 'daily_horoscopes':
            return self._rank_horoscopes(features, limit)
        elif scope == 'notifications':
            return self._rank_notifications(features, limit)
        elif scope == 'content_feed':
            return self._rank_content(features, limit)
        else:
            return []
    
    def _rank_horoscopes(self, features: UserFeatures, limit: int) -> List[RankedItem]:
        """Rank daily horoscope candidates"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get user's zodiac and recent engagement
                cur.execute("""
                    select zodiac from profiles where id = %s
                """, (features.user_id,))
                
                user_zodiac = cur.fetchone()
                if not user_zodiac:
                    return []
                
                user_zodiac = user_zodiac[0]
                
                # Get available horoscopes for today
                cur.execute("""
                    select h.id, h.zodiac, h.ref_date, h.approved_at
                    from horoscopes h
                    where h.scope = 'daily'
                      and h.ref_date = current_date
                      and h.approved_at is not null
                    order by 
                        case when h.zodiac = %s then 0 else 1 end,  -- user's sign first
                        h.approved_at desc
                    limit %s
                """, (user_zodiac, limit))
                
                horoscopes = cur.fetchall()
                rankings = []
                
                for i, (h_id, zodiac, ref_date, approved_at) in enumerate(horoscopes):
                    # Score based on relevance and engagement
                    base_score = 1.0 if zodiac == user_zodiac else 0.7
                    engagement_boost = features.engagement_score * 0.2
                    recency_boost = 0.1 if approved_at and (datetime.now() - approved_at.replace(tzinfo=None)).days == 0 else 0
                    
                    score = base_score + engagement_boost + recency_boost
                    confidence = 0.9 if zodiac == user_zodiac else 0.6
                    
                    rationale = ['user_zodiac'] if zodiac == user_zodiac else ['related_sign']
                    if features.engagement_score > 0.7:
                        rationale.append('high_engagement')
                    
                    rankings.append(RankedItem(
                        item_id=str(h_id),
                        score=min(1.0, score),
                        confidence=confidence,
                        rationale_tags=rationale
                    ))
                
                return rankings
        finally:
            POOL.putconn(conn)
    
    def _rank_notifications(self, features: UserFeatures, limit: int) -> List[RankedItem]:
        """Rank notification candidates based on engagement patterns"""
        rankings = []
        
        # Rule-based notification ranking
        notification_types = [
            ('daily_horoscope', 0.8, ['daily_habit'] if features.session_count_7d > 3 else ['engagement_building']),
            ('order_updates', 0.9, ['high_priority']),
            ('community_activity', 0.4, ['social'] if features.engagement_score > 0.5 else []),
            ('promotions', 0.3, ['low_engagement'] if features.engagement_score < 0.3 else [])
        ]
        
        for i, (notif_type, base_score, tags) in enumerate(notification_types):
            if i >= limit:
                break
            
            # Adjust score based on user patterns
            score = base_score
            if features.preferred_time_slot and 6 <= features.preferred_time_slot <= 22:
                score += 0.1  # active during reasonable hours
            
            if features.notification_ctr > 0.5:
                score += 0.1
                tags.append('responsive_user')
            
            rankings.append(RankedItem(
                item_id=notif_type,
                score=min(1.0, score),
                confidence=0.7,
                rationale_tags=tags
            ))
        
        return sorted(rankings, key=lambda x: x.score, reverse=True)
    
    def _rank_content(self, features: UserFeatures, limit: int) -> List[RankedItem]:
        """Rank general content feed items"""
        # Placeholder for content ranking
        return []
    
    def cache_rankings(self, user_id: str, scope: str, rankings: List[RankedItem], 
                      valid_hours: int = 24) -> bool:
        """Cache rankings with expiration"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                ranked_items = [
                    {
                        'id': r.item_id,
                        'score': float(r.score),
                        'confidence': float(r.confidence)
                    }
                    for r in rankings
                ]
                
                rationale_tags = list(set().union(*[r.rationale_tags for r in rankings]))
                
                cur.execute("""
                    insert into personalization_ranks 
                    (user_id, scope, ranked_items, rationale_tags, model_version, valid_until)
                    values (%s, %s, %s, %s, %s, %s)
                    on conflict (user_id, scope, created_at) do update set
                        ranked_items = excluded.ranked_items,
                        rationale_tags = excluded.rationale_tags,
                        valid_until = excluded.valid_until
                """, (
                    user_id,
                    scope,
                    json.dumps(ranked_items),
                    rationale_tags,
                    self.model_version,
                    datetime.now() + timedelta(hours=valid_hours)
                ))
                conn.commit()
                return True
        except Exception:
            return False
        finally:
            POOL.putconn(conn)
    
    def get_cached_rankings(self, user_id: str, scope: str) -> Optional[List[RankedItem]]:
        """Get cached rankings if still valid"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select ranked_items, rationale_tags
                    from personalization_ranks
                    where user_id = %s 
                      and scope = %s 
                      and valid_until > now()
                    order by created_at desc
                    limit 1
                """, (user_id, scope))
                
                row = cur.fetchone()
                if not row:
                    return None
                
                ranked_items, rationale_tags = row
                rankings = []
                
                for item in ranked_items:
                    rankings.append(RankedItem(
                        item_id=item['id'],
                        score=item['score'],
                        confidence=item['confidence'],
                        rationale_tags=rationale_tags or []
                    ))
                
                return rankings
        finally:
            POOL.putconn(conn)
    
    def update_user_features(self, user_id: str) -> bool:
        """Update user feature vector"""
        features = self.extract_features(user_id)
        if not features:
            return False
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into personalization_features 
                    (user_id, engagement_score, notification_ctr, session_count_7d, 
                     session_count_30d, avg_session_duration_sec, preferred_time_slot,
                     device_type, country_code, timezone_offset, last_activity_at)
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                    on conflict (user_id, feature_version) do update set
                        engagement_score = excluded.engagement_score,
                        notification_ctr = excluded.notification_ctr,
                        session_count_7d = excluded.session_count_7d,
                        session_count_30d = excluded.session_count_30d,
                        avg_session_duration_sec = excluded.avg_session_duration_sec,
                        preferred_time_slot = excluded.preferred_time_slot,
                        device_type = excluded.device_type,
                        country_code = excluded.country_code,
                        timezone_offset = excluded.timezone_offset,
                        last_activity_at = now(),
                        computed_at = now()
                """, (
                    user_id,
                    features.engagement_score,
                    features.notification_ctr,
                    features.session_count_7d,
                    features.session_count_30d,
                    features.avg_session_duration_sec,
                    features.preferred_time_slot,
                    features.device_type,
                    features.country_code,
                    features.timezone_offset
                ))
                conn.commit()
                return True
        except Exception:
            return False
        finally:
            POOL.putconn(conn)

# Nightly job functions
def refresh_all_features():
    """Nightly job to refresh user features"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            # Get active users (activity in last 30 days)
            cur.execute("""
                select distinct o.user_id
                from orders o
                where o.created_at > now() - interval '30 days'
                  and exists (
                    select 1 from personalization_settings ps
                    where ps.user_id = o.user_id 
                      and ps.personalization_enabled = true
                  )
            """)
            
            active_users = [row[0] for row in cur.fetchall()]
            
        service = PersonalizationService()
        for user_id in active_users:
            service.update_user_features(str(user_id))
            
    finally:
        POOL.putconn(conn)

def cleanup_expired_data():
    """Clean up expired rankings and old features"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("select cleanup_expired_rankings()")
            conn.commit()
    finally:
        POOL.putconn(conn)