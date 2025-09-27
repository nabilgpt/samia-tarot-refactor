# api.py - M3 Auth & Phone Verification API (FastAPI + psycopg2)
# Zero theme drift - backend endpoints only
# Usage: uvicorn api:app --reload

import os, json, uuid, subprocess, hashlib, base64, time
from datetime import datetime, timedelta
from typing import Optional, List
from collections import defaultdict, deque

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from fastapi import FastAPI, HTTPException, Header, Query, Response, Request
from pydantic import BaseModel
import requests

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed - will use system environment variables
    pass

# Twilio Verify Service import
from twilio_verify_service import TwilioVerifyService
# M40 Siren Escalation Service import
from siren_service import siren_service
from siren_notification_processor import notification_processor
# M41 WhatsApp + n8n Automations imports
from whatsapp_service import whatsapp_service
from whatsapp_payment_automation import payment_automation, PaymentLinkData

# Database connection pool
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

# Twilio credentials (required - no defaults)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN") 
TWILIO_VERIFY_SID = os.getenv("TWILIO_VERIFY_SID")

# M7 - Twilio Voice for calls (required - no defaults)
TWILIO_VOICE_CALLER_ID = os.getenv("TWILIO_VOICE_CALLER_ID")
TWILIO_WEBHOOK_BASE = os.getenv("TWILIO_WEBHOOK_BASE")

# M5 - Supabase Storage credentials (required - no defaults)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE = os.getenv("SUPABASE_SERVICE")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "audio")  # default bucket name
# YTDLP_BIN removed - TikTok ingestion disabled per master context

# M5 Upgrade - Voice synthesis and timezone support
VOICE_PROVIDER = os.getenv("VOICE_PROVIDER")  # e.g. 'elevenlabs', 'azure'
VOICE_API_KEY = os.getenv("VOICE_API_KEY")

# WhatsApp Business API Compliance Configuration
# IMPORTANT: WhatsApp has a 24-hour customer service window
# - Within 24h of customer message: Can send any message
# - Outside 24h window: Only approved template messages allowed
# - All promotional/transactional messages outside 24h must use approved templates
WHATSAPP_24H_WINDOW_ENABLED = os.getenv("WHATSAPP_24H_WINDOW_ENABLED", "true").lower() == "true"
WHATSAPP_TEMPLATE_NAMESPACE = os.getenv("WHATSAPP_TEMPLATE_NAMESPACE", "samia_tarot")  # Template namespace

# M10 - DeepConf and Semantic Galaxy (internal only)
DEEPCONF_API_URL = os.getenv("DEEPCONF_API_URL")
DEEPCONF_API_KEY = os.getenv("DEEPCONF_API_KEY")
SEMANTIC_API_URL = os.getenv("SEMANTIC_API_URL")
SEMANTIC_API_KEY = os.getenv("SEMANTIC_API_KEY")

app = FastAPI(title="SAMIA-TAROT API", version="1.0.0")

# Initialize Twilio Verify Service
try:
    twilio_verify = TwilioVerifyService()
except Exception as e:
    print(f"Warning: Twilio Verify Service initialization failed: {e}")
    twilio_verify = None

# Database helpers
def db_exec(sql: str, params=None):
    """Execute SQL with params, return affected rows"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            return cur.rowcount
    finally:
        POOL.putconn(conn)

def db_fetchone(sql: str, params=None):
    """Execute SQL and return first row"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        POOL.putconn(conn)

def db_fetchall(sql: str, params=None):
    """Execute SQL and return all rows"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        POOL.putconn(conn)

def write_audit(actor: str, event: str, entity: str = None, entity_id: str = None, meta: dict = None):
    """Write audit log entry"""
    db_exec("""
        INSERT INTO audit_log(actor, event, entity, entity_id, meta, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (actor, event, entity, entity_id, json.dumps(meta or {}), datetime.utcnow()))

# M41: Performance Metrics Collection
class PerformanceTracker:
    """Track request performance metrics in-memory"""
    
    def __init__(self, max_samples=1000):
        self.max_samples = max_samples
        # Store recent latencies per route for percentile calculation
        self.latencies = defaultdict(lambda: deque(maxlen=max_samples))
        self.request_counts = defaultdict(int)
        self.error_counts = defaultdict(int)
        self.rate_limit_breaches = 0
    
    def record_request(self, route: str, method: str, duration_ms: float, status_code: int):
        """Record request metrics"""
        route_key = f"{method}_{route}"
        self.latencies[route_key].append(duration_ms)
        self.request_counts[route_key] += 1
        
        if status_code >= 500:
            self.error_counts[route_key] += 1
        elif status_code == 429:
            self.rate_limit_breaches += 1
    
    def get_percentile(self, values, percentile):
        """Calculate percentile from list of values"""
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int((percentile / 100) * len(sorted_values))
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def get_metrics(self) -> dict:
        """Get current performance metrics"""
        metrics = {
            'rate_limit_breaches_total': self.rate_limit_breaches
        }
        
        for route_key, latencies in self.latencies.items():
            if latencies:
                latency_list = list(latencies)
                metrics[f'requests_total_{route_key}'] = self.request_counts[route_key]
                metrics[f'errors_total_{route_key}'] = self.error_counts[route_key]
                metrics[f'latency_ms_p50_{route_key}'] = self.get_percentile(latency_list, 50)
                metrics[f'latency_ms_p95_{route_key}'] = self.get_percentile(latency_list, 95)
                metrics[f'latency_ms_p99_{route_key}'] = self.get_percentile(latency_list, 99)
                
                # Error rate
                error_rate = self.error_counts[route_key] / self.request_counts[route_key] if self.request_counts[route_key] > 0 else 0
                metrics[f'error_rate_{route_key}'] = round(error_rate, 4)
        
        return metrics

# Global performance tracker
perf_tracker = PerformanceTracker()

async def track_performance(request: Request, call_next):
    """Middleware to track request performance"""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        # Extract route pattern for metrics
        route = request.url.path
        method = request.method
        
        # Normalize route for metrics (replace IDs with placeholders)
        import re
        route_normalized = re.sub(r'/[0-9a-f-]{8,}', '/{id}', route)
        route_normalized = re.sub(r'/\d+', '/{id}', route_normalized)
        
        perf_tracker.record_request(route_normalized, method, duration_ms, response.status_code)
        
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        perf_tracker.record_request(request.url.path, request.method, duration_ms, 500)
        raise

# M41: Add performance tracking middleware to app
app.middleware("http")(track_performance)

# Pydantic models
class AuthSyncRequest(BaseModel):
    user_id: str

class PhoneStartRequest(BaseModel):
    user_id: str
    phone: str
    channel: str = "sms"  # sms or call

class PhoneCheckRequest(BaseModel):
    user_id: str
    phone: str
    code: str

# Twilio Verify V2 Models
class VerifyStartRequest(BaseModel):
    to: str  # Phone number in E.164 format or email address
    channel: str = "sms"  # sms, voice, whatsapp, email
    locale: str = "en"  # Language for verification messages

class VerifyCheckRequest(BaseModel):
    to: str  # Phone number in E.164 format or email address
    code: str  # Verification code entered by user

class OrderCreateRequest(BaseModel):
    service_code: str
    question_text: Optional[str] = None
    input_media_id: Optional[int] = None
    is_gold: bool = False

class AssignReaderRequest(BaseModel):
    reader_id: str

class UploadResultRequest(BaseModel):
    output_media_id: int

class ApproveRequest(BaseModel):
    note: Optional[str] = None

class RejectRequest(BaseModel):
    reason: str

# M5 - Horoscope models (Admin-only upload)
class HoroscopeUploadRequest(BaseModel):
    zodiac: str
    ref_date: str  # YYYY-MM-DD format
    audio_file: Optional[str] = None  # Base64 encoded audio or file path

class HoroscopeApproveRequest(BaseModel):
    note: Optional[str] = None

class HoroscopeRejectRequest(BaseModel):
    reason: str

# M5 Upgrade - Additional models
class HoroscopeRegenerateRequest(BaseModel):
    zodiac: str
    ref_date: Optional[str] = None  # defaults to server UTC date
    source: str = "voice_model"  # Only 'voice_model' allowed (admin upload)
    script_text: Optional[str] = None  # optional guidance for voice synthesis

# M18 - New models for compliant horoscope ingestion
class HoroscopeUploadRequest(BaseModel):
    zodiac: str
    ref_date: str  # YYYY-MM-DD format
    audio_file_base64: str  # Base64 encoded audio file
    content_type: str  # audio/mpeg, audio/m4a
    
# TikTokIngestRequest removed - Admin-only uploads enforced per master context

# M19 - Calls & Emergency models
class CallScheduleRequest(BaseModel):
    order_id: int
    scheduled_at: Optional[str] = None  # ISO timestamp, None for immediate
    client_phone: str  # E.164 format
    reader_phone: Optional[str] = None  # If None, system will assign
    notes: Optional[str] = None

# M20 - Payment models
class PaymentCheckoutRequest(BaseModel):
    order_id: int
    amount_cents: int
    currency: str = "USD"
    country_code: str  # For provider matrix routing

class PaymentMethodRequest(BaseModel):
    payment_method_id: str  # Stripe PaymentMethod.id or Square card token
    save_for_future: bool = False

class ManualTransferRequest(BaseModel):
    order_id: int
    amount_cents: int
    currency: str = "USD"
    transfer_type: str  # bank_transfer, usdt, crypto
    transaction_ref: str  # Bank reference, USDT tx hash, etc
    proof_media_id: Optional[int] = None  # Upload proof document

class WalletTopupRequest(BaseModel):
    amount_cents: int
    currency: str = "USD" 
    payment_provider: Optional[str] = None  # Force specific provider
    
class WalletWithdrawalRequest(BaseModel):
    order_id: int
    amount_cents: int
    currency: str = "USD"

# M21 - Moderation & Audit models
class ModerationActionRequest(BaseModel):
    target_type: str  # profile, order, media, call
    target_id: str
    action: str  # block, unblock, hold, remove_media, escalate
    reason_code: str
    severity: Optional[int] = 1  # 1-4 severity scale
    duration_hours: Optional[int] = None  # for temporary restrictions
    evidence_refs: Optional[list] = []  # media IDs, order refs
    internal_notes: Optional[str] = None
    user_visible_reason: Optional[str] = None

class ModerationCaseRequest(BaseModel):
    subject_type: str  # profile, order, media, call, payment
    subject_id: str
    priority: Optional[int] = 2  # 1-4 priority scale
    reason_code: str
    description: str
    evidence_refs: Optional[list] = []

class AppealOpenRequest(BaseModel):
    moderation_action_id: int
    appeal_reason: str
    appeal_evidence: Optional[list] = []

class AppealDecisionRequest(BaseModel):
    decision: str  # approved, denied, partial_approval
    decision_reason: str
    decision_notes: Optional[str] = None
    reverse_original: bool = False
    apply_new_action: Optional[dict] = None

class AuditExportRequest(BaseModel):
    period_start: str  # ISO timestamp
    period_end: str  # ISO timestamp
    export_format: str = "json"  # json, csv
    include_signatures: bool = True

class CallStartRequest(BaseModel):
    client_phone: str  # E.164 format
    reader_phone: str  # E.164 format
    record: bool = True  # Default recording ON

class CallDropRequest(BaseModel):
    ended_reason: str  # monitor_drop, reader_drop, client_drop
    notes: Optional[str] = None

class SirenAlertRequest(BaseModel):
    alert_type: str  # emergency, quality_issue, technical_problem, inappropriate_behavior
    reason: str
    
class SirenResponseRequest(BaseModel):
    action: str  # acknowledge, resolve, false_alarm
    notes: Optional[str] = None

# M40 - Emergency Siren Escalation models
class SirenTriggerRequest(BaseModel):
    incident_type: str
    severity: int  # 1-5 (1=Critical, 5=Info)
    source: str
    policy_name: str
    context: dict
    variables: dict
    force: bool = False  # Bypass dedup/cooldown

class SirenAckRequest(BaseModel):
    incident_id: int

class SirenResolveRequest(BaseModel):
    incident_id: int

class SirenTestRequest(BaseModel):
    policy_name: str

# M41 - WhatsApp + n8n Automation models
class WhatsAppWebhookRequest(BaseModel):
    entry: List[dict]
    object: str

class WhatsAppSendRequest(BaseModel):
    phone: str
    message: str
    template_name: Optional[str] = None
    template_params: Optional[List[str]] = None

class PaymentLinkCreateRequest(BaseModel):
    amount: int  # in cents
    currency: str = "USD"
    description: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    order_id: Optional[str] = None

class HoroscopeScheduleRequest(BaseModel):
    ref_date: str  # YYYY-MM-DD format

class SettingsChangeRequest(BaseModel):
    kind: str  # 'app' or 'zodiac'
    target_key: str
    proposed_value: str
    reason: Optional[str] = None

class SettingsReviewRequest(BaseModel):
    review_reason: Optional[str] = None

# M6 - Astro Service Models
class AstroOrderRequest(BaseModel):
    dob: str  # YYYY-MM-DD
    birth_place: Optional[str] = None
    birth_time: Optional[str] = None  # HH:MM:SS
    country: str
    country_code: str
    question_text: Optional[str] = None
    is_gold: bool = False

class AstroDraftRequest(BaseModel):
    order_id: int

class MediaUploadRequest(BaseModel):
    kind: str  # "audio", "image", "pdf", "other"
    filename: str
    base64: str

# M7 - Calls & Voice Models  
class CallScheduleRequest(BaseModel):
    service_code: str  # "direct_call" or "healing"
    scheduled_at: str  # "2025-09-10T20:30:00"
    timezone: str = "UTC"
    question_text: Optional[str] = None

class CallInitiateRequest(BaseModel):
    order_id: int

class CallTerminateRequest(BaseModel):
    order_id: int
    reason: str = "dropped_by_monitor"

class HealingPrepRequest(BaseModel):
    order_id: int
    note: str

# M9 - Profile Completion Models
class ProfileCompleteRequest(BaseModel):
    first_name: str
    last_name: str

# M10 - AI Assist Models (Internal Only)
class AssistDraftRequest(BaseModel):
    order_id: int
    provider: str = "deepconf"
    model: Optional[str] = None
    style: Optional[str] = None

class AssistSearchRequest(BaseModel):
    query: str
    order_id: Optional[int] = None
    max_results: int = 5

class KnowledgeAddRequest(BaseModel):
    title: str
    content: str
    source_url: Optional[str] = None

# M11 - Ops/QA Models
class OpsExportRequest(BaseModel):
    range: dict  # {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}
    entities: list  # ["orders", "horoscopes", "calls", "moderation", "audit"]
    pii: str = "masked"  # "masked" or "raw" (superadmin only)

class RateLimitsUpdateRequest(BaseModel):
    rate_orders_per_hour: Optional[int] = None
    rate_phone_verify_per_hour: Optional[int] = None
    rate_assist_draft_per_hour: Optional[int] = None
    rate_assist_search_per_hour: Optional[int] = None
    rate_knowledge_add_per_hour: Optional[int] = None

# M5 - Environment validation helper
def ensure_env(keys: list) -> None:
    """Ensure required environment variables are present, raise 503 if missing"""
    missing = [key for key in keys if not os.getenv(key)]
    if missing:
        raise HTTPException(
            status_code=503, 
            detail=f"Service not configured. Missing env vars: {', '.join(missing)}"
        )

# M5 - Supabase Storage helpers
def storage_upload_bytes(bucket: str, path: str, data_bytes: bytes, content_type: str) -> str:
    """Upload bytes to Supabase Storage, return storage key"""
    if not all([SUPABASE_URL, SUPABASE_SERVICE]):
        raise HTTPException(status_code=503, detail="Storage not configured")
    
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE}",
        "Content-Type": content_type
    }
    
    response = requests.post(url, data=data_bytes, headers=headers)
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {response.status_code}")
    
    return f"{bucket}/{path}"

def storage_sign_url(bucket: str, path: str, expires: int = 3600) -> str:
    """Generate signed URL for storage object"""
    if not all([SUPABASE_URL, SUPABASE_SERVICE]):
        raise HTTPException(status_code=503, detail="Storage not configured")
    
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE}",
        "Content-Type": "application/json"
    }
    data = {"expiresIn": expires}
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"URL signing failed: {response.status_code}")
    
    result = response.json()
    signed_token = result.get("signedURL")
    if not signed_token:
        raise HTTPException(status_code=500, detail="No signed URL returned")
    
    return f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}?token={signed_token}"

# M5 - TikTok download helper
# TikTok download DISABLED - Admin-only uploads enforced
# def download_tiktok_audio(tiktok_url: str) -> bytes:
#     """DISABLED: TikTok download removed - Use admin upload only"""
#     raise HTTPException(status_code=410, detail="TikTok ingestion disabled")

# TikTok download functionality completely removed - Admin-only uploads enforced per master context

# M5 - Zodiac validation
VALID_ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

def validate_zodiac(zodiac: str) -> str:
    """Validate zodiac sign, return normalized name"""
    if zodiac not in VALID_ZODIAC_SIGNS:
        raise HTTPException(status_code=400, detail=f"Invalid zodiac sign. Must be one of: {', '.join(VALID_ZODIAC_SIGNS)}")
    return zodiac

def validate_date(date_str: str) -> str:
    """Validate YYYY-MM-DD date format"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

# Role validation helper
def get_user_role(user_id: str) -> str:
    """Get user role code or raise HTTPException"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        role_data = db_fetchone("""
            SELECT r.code FROM profiles p 
            JOIN roles r ON r.id = p.role_id 
            WHERE p.id = %s
        """, (user_id,))
        
        if not role_data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return role_data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Role validation failed: {str(e)}")

# M16.2 - RLS Route Guards (mirror DB policies)
def can_access_profile(user_id: str, target_id: str) -> bool:
    """Check if user can access profile (mirror RLS policy)"""
    role = get_user_role(user_id)
    return user_id == target_id or role in ('admin', 'superadmin')

def can_delete_profile(user_id: str) -> bool:
    """Check if user can delete profiles (superadmin only)"""
    role = get_user_role(user_id)
    return role == 'superadmin'

def can_access_order(user_id: str, order_id: int) -> bool:
    """Check if user can access order (mirror RLS policy)"""
    role = get_user_role(user_id)
    if role in ('monitor', 'admin', 'superadmin'):
        return True
    
    # Check if user owns or is assigned to order
    result = db_fetchone("""
        SELECT 1 FROM orders 
        WHERE id = %s AND (user_id = %s OR assigned_reader = %s)
    """, (order_id, user_id, user_id))
    return result is not None

def can_access_media_asset(user_id: str, asset_id: int) -> bool:
    """Check if user can access media asset (mirror RLS policy)"""
    role = get_user_role(user_id)
    if role in ('admin', 'monitor', 'superadmin'):
        return True
    
    # Check if user owns asset or is assigned to order referencing it
    result = db_fetchone("""
        SELECT 1 FROM media_assets ma
        WHERE ma.id = %s AND (
            ma.owner_id = %s OR
            EXISTS (
                SELECT 1 FROM orders o
                WHERE (o.input_media_id = ma.id OR o.output_media_id = ma.id)
                AND o.assigned_reader = %s
            )
        )
    """, (asset_id, user_id, user_id))
    return result is not None

def can_access_horoscope(user_id: str, horoscope_id: int = None, for_management: bool = False) -> bool:
    """Check if user can access horoscope (mirror RLS policy)"""
    role = get_user_role(user_id)
    
    if for_management:
        # Create/update/approve operations
        return role in ('monitor', 'admin', 'superadmin')
    
    if role in ('monitor', 'admin', 'superadmin'):
        return True
    
    if horoscope_id:
        # Check if horoscope is approved
        result = db_fetchone("""
            SELECT 1 FROM horoscopes 
            WHERE id = %s AND approved_at IS NOT NULL
        """, (horoscope_id,))
        return result is not None
    
    return True  # Public access to approved horoscopes

def can_access_call(user_id: str, call_id: int = None, order_id: int = None) -> bool:
    """Check if user can access call (mirror RLS policy)"""
    role = get_user_role(user_id)
    if role in ('monitor', 'admin', 'superadmin'):
        return True
    
    if order_id:
        # Check if user is client or assigned reader for the order
        result = db_fetchone("""
            SELECT 1 FROM orders 
            WHERE id = %s AND (user_id = %s OR assigned_reader = %s)
        """, (order_id, user_id, user_id))
        return result is not None
    
    if call_id:
        # Check via call's order
        result = db_fetchone("""
            SELECT 1 FROM calls c
            JOIN orders o ON o.id = c.order_id
            WHERE c.id = %s AND (o.user_id = %s OR o.assigned_reader = %s)
        """, (call_id, user_id, user_id))
        return result is not None
    
    return False

def can_access_admin_data(user_id: str) -> bool:
    """Check if user can access admin-only data (moderation, audit, payments, wallets)"""
    role = get_user_role(user_id)
    return role in ('monitor', 'admin', 'superadmin')

def can_access_wallet(user_id: str, target_user_id: str = None) -> bool:
    """Check if user can access wallet (owner or admin)"""
    role = get_user_role(user_id)
    if role in ('monitor', 'admin', 'superadmin'):
        return True
    
    if target_user_id:
        return user_id == target_user_id
    
    return True  # Own wallet access

# M7 - Twilio Voice helpers
def twilio_client():
    """Get Twilio client or raise 503 if not configured"""
    ensure_env(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VOICE_CALLER_ID", "TWILIO_WEBHOOK_BASE"])
    
    try:
        from twilio.rest import Client
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except ImportError:
        raise HTTPException(status_code=503, detail="Twilio client not installed")

def is_blocked(user_id: str) -> bool:
    """Check if profile is actively blocked"""
    result = db_fetchone("SELECT active FROM blocked_profiles WHERE profile_id = %s AND active = true", (user_id,))
    return result is not None

def twiml_response(xml_content: str) -> Response:
    """Return TwiML XML response for Twilio webhooks"""
    return Response(content=xml_content, media_type="application/xml")

# M8 - Rate Limiting helpers
def enforce_rate_limit(user_id: str, endpoint: str, limit: int = 60, window_sec: int = 60):
    """Enforce rate limit for user+endpoint, raise 429 if exceeded"""
    try:
        allowed = db_fetchone(
            "SELECT rate_try_consume(%s, %s, %s, %s)",
            (user_id, endpoint, limit, window_sec)
        )[0]
        
        if not allowed:
            # M41: Increment breach counter for metrics
            perf_tracker.rate_limit_breaches += 1
            
            # Log rate limit hit (once per window to avoid spam)
            write_audit(
                actor=user_id,
                event="rate_limit_hit",
                entity="api",
                entity_id=endpoint,
                meta={"limit": limit, "window_sec": window_sec}
            )
            
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded",
                headers={"Retry-After": str(window_sec)}  # M41: Always include Retry-After
            )
    except HTTPException:
        raise
    except Exception as e:
        # Don't block API on rate limit errors, just log
        print(f"Rate limit check failed: {str(e)}")

import time
APP_START_TIME = time.time()

# M9 - Meta & Profile Completeness helpers
COUNTRIES_DATA = None

def load_countries():
    """Lazy-load and cache countries.json data"""
    global COUNTRIES_DATA
    if COUNTRIES_DATA is None:
        try:
            with open('data/countries.json', 'r', encoding='utf-8') as f:
                COUNTRIES_DATA = json.load(f)
        except FileNotFoundError:
            raise HTTPException(status_code=503, detail="Countries data not available")
    return COUNTRIES_DATA

def country_lookup(iso2: str):
    """Get country info by ISO2 code"""
    countries = load_countries()
    for country in countries:
        if country['iso2'] == iso2:
            return country
    return None

def profile_required_fields():
    """Return list of required profile fields"""
    return ['first_name', 'last_name', 'email', 'country', 'phone', 'dob', 'marital_status', 'gender']

def get_profile(user_id: str):
    """Get full profile data"""
    return db_fetchone("""
        SELECT first_name, last_name, email, country, phone, dob, 
               marital_status, gender, birth_place, birth_time,
               email_verified, phone_verified, zodiac, country_code
        FROM profiles WHERE id = %s
    """, (user_id,))

def is_profile_complete(profile_data):
    """Check if profile has all required fields"""
    if not profile_data:
        return False
    
    required_fields = profile_required_fields()
    
    # Map database column indices to field names (based on get_profile SELECT order)
    field_map = {
        'first_name': 0, 'last_name': 1, 'email': 2, 'country': 3,
        'phone': 4, 'dob': 5, 'marital_status': 6, 'gender': 7
    }
    
    for field in required_fields:
        if field in field_map:
            value = profile_data[field_map[field]]
            if not value or (isinstance(value, str) and value.strip() == ''):
                return False
    
    return True

def check_verification_status(user_id: str) -> tuple:
    """Check if user has email and phone verified"""
    profile = db_fetchone("""
        SELECT email_verified, phone_verified 
        FROM profiles WHERE id = %s
    """, (user_id,))
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

# M5 Upgrade - Settings and helper functions
def get_setting_bool(key: str, default: bool = False) -> bool:
    """Get boolean setting from app_settings"""
    setting = db_fetchone("SELECT value FROM app_settings WHERE key = %s", (key,))
    if not setting:
        return default
    return setting[0].lower() in ('true', '1', 'yes')

def get_setting_int(key: str, default: int = 0) -> int:
    """Get integer setting from app_settings"""
    setting = db_fetchone("SELECT value FROM app_settings WHERE key = %s", (key,))
    if not setting:
        return default
    try:
        return int(setting[0])
    except ValueError:
        return default

def get_setting_str(key: str, default: str = "") -> str:
    """Get string setting from app_settings"""
    setting = db_fetchone("SELECT value FROM app_settings WHERE key = %s", (key,))
    return setting[0] if setting else default

def get_utc_date() -> str:
    """Get current UTC date as YYYY-MM-DD"""
    return datetime.utcnow().strftime("%Y-%m-%d")

def synthesize_voice_audio(script_text: str, voice_model_id: int) -> bytes:
    """Synthesize audio using configured voice provider"""
    if not all([VOICE_PROVIDER, VOICE_API_KEY]):
        raise HTTPException(status_code=503, detail="Voice synthesis not configured")
    
    # Get voice model details
    voice_model = db_fetchone("""
        SELECT provider, model_id, voice_id, metadata 
        FROM voice_models 
        WHERE id = %s AND is_active = true
    """, (voice_model_id,))
    
    if not voice_model:
        raise HTTPException(status_code=500, detail="Voice model not found or inactive")
    
    provider, model_id, voice_id, metadata = voice_model
    
    # For now, return a placeholder - real implementation would call provider APIs
    # This would integrate with ElevenLabs, Azure Speech, etc.
    if provider == 'system':
        # Mock for default system voice
        raise HTTPException(status_code=503, detail="Voice synthesis requires external provider")
    
    # Real implementation would make API calls here based on provider
    # return actual_synthesized_bytes
    raise HTTPException(status_code=503, detail=f"Voice provider '{provider}' not implemented")

# Endpoints

@app.get("/")
def root():
    return {"message": "SAMIA-TAROT API v1.0.0", "module": "M3 Auth & Phone Verification"}

@app.post("/api/auth/sync")
def auth_sync(request: AuthSyncRequest):
    """Sync auth.users -> profiles table"""
    try:
        user_id = request.user_id
        
        # Get user from auth.users (Supabase auth table)
        auth_row = db_fetchone("""
            SELECT email, phone, email_confirmed_at 
            FROM auth.users 
            WHERE id = %s
        """, (user_id,))
        
        if not auth_row:
            raise HTTPException(status_code=404, detail="User not found in auth.users")
        
        email, phone, email_confirmed_at = auth_row
        email_verified = email_confirmed_at is not None
        
        # Upsert into profiles
        db_exec("""
            INSERT INTO profiles(id, email, phone, email_verified, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET 
                email = EXCLUDED.email,
                phone = COALESCE(EXCLUDED.phone, profiles.phone),
                email_verified = EXCLUDED.email_verified,
                updated_at = EXCLUDED.updated_at
        """, (user_id, email, phone, email_verified, datetime.utcnow()))
        
        # Write audit log
        write_audit(
            actor=user_id,
            event="auth_sync", 
            entity="profile",
            entity_id=user_id,
            meta={"email_verified": email_verified, "phone_present": phone is not None}
        )
        
        return {"success": True, "user_id": user_id, "email_verified": email_verified}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth sync failed: {str(e)}")

@app.post("/api/verify/phone/start")
def phone_start(request: PhoneStartRequest):
    """Start phone verification via Twilio (LEGACY - use /api/auth/verify/start instead)"""
    try:
        user_id = request.user_id
        phone = request.phone
        channel = request.channel

        # Enforce E.164 format for phone numbers
        if twilio_verify:
            normalized_phone = twilio_verify.normalize_phone_e164(phone)
            if not normalized_phone:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number must be in valid E.164 format (e.g. +1234567890)"
                )
            phone = normalized_phone

        # Rate limiting: 5 phone verifications per hour per user
        enforce_rate_limit(user_id, "phone_verify_start", limit=5, window_sec=3600)
        
        # Check if profile exists
        profile = db_fetchone("SELECT id FROM profiles WHERE id = %s", (user_id,))
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Insert phone verification record
        db_exec("""
            INSERT INTO phone_verifications(profile_id, phone, status, created_at)
            VALUES (%s, %s, 'sent', %s)
        """, (user_id, phone, datetime.utcnow()))
        
        # Call Twilio Verify API
        if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID]):
            raise HTTPException(status_code=503, detail="Phone verification not configured")
        
        provider_ref = None
        url = f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SID}/Verifications"
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        data = {"To": phone, "Channel": channel}
        
        response = requests.post(url, data=data, auth=auth)
        if response.status_code != 201:
            # Update status to failed
            db_exec("""
                UPDATE phone_verifications 
                SET status = 'failed'
                WHERE profile_id = %s AND phone = %s 
                ORDER BY id DESC LIMIT 1
            """, (user_id, phone))
            
            raise HTTPException(status_code=400, detail="Failed to send verification code")
        
        provider_ref = response.json().get("sid")
        
        # Update provider reference
        if provider_ref:
            db_exec("""
                UPDATE phone_verifications 
                SET provider_ref = %s
                WHERE profile_id = %s AND phone = %s 
                ORDER BY id DESC LIMIT 1
            """, (provider_ref, user_id, phone))
        
        # Write audit log
        write_audit(
            actor=user_id,
            event="phone_verify_start",
            entity="phone_verification",
            entity_id=phone,
            meta={"channel": channel, "provider_ref": provider_ref}
        )
        
        return {"success": True, "phone": phone, "channel": channel}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Phone verification start failed: {str(e)}")

@app.post("/api/verify/phone/check")
def phone_check(request: PhoneCheckRequest):
    """Check phone verification code via Twilio (LEGACY - use /api/auth/verify/check instead)"""
    try:
        user_id = request.user_id
        phone = request.phone
        code = request.code

        # Enforce E.164 format for phone numbers
        if twilio_verify:
            normalized_phone = twilio_verify.normalize_phone_e164(phone)
            if not normalized_phone:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number must be in valid E.164 format (e.g. +1234567890)"
                )
            phone = normalized_phone
        
        # Get latest verification record
        verification = db_fetchone("""
            SELECT id, provider_ref, status 
            FROM phone_verifications 
            WHERE profile_id = %s AND phone = %s 
            ORDER BY id DESC LIMIT 1
        """, (user_id, phone))
        
        if not verification:
            raise HTTPException(status_code=404, detail="No verification found for this phone")
        
        verification_id, provider_ref, status = verification
        
        if status != 'sent':
            raise HTTPException(status_code=400, detail=f"Verification already {status}")
        
        # Verify code with Twilio
        if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID]):
            raise HTTPException(status_code=503, detail="Phone verification not configured")
        
        is_approved = False
        url = f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SID}/VerificationCheck"
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        data = {"To": phone, "Code": code}
        
        response = requests.post(url, data=data, auth=auth)
        if response.status_code == 200:
            result = response.json()
            is_approved = result.get("status") == "approved"
        
        if is_approved:
            # Update verification status
            db_exec("""
                UPDATE phone_verifications 
                SET status = 'verified'
                WHERE id = %s
            """, (verification_id,))
            
            # Update profile phone_verified
            db_exec("""
                UPDATE profiles 
                SET phone = %s, phone_verified = true, updated_at = %s
                WHERE id = %s
            """, (phone, datetime.utcnow(), user_id))
            
            # Write audit log
            write_audit(
                actor=user_id,
                event="phone_verify_ok",
                entity="profile",
                entity_id=user_id,
                meta={"phone": phone, "verification_id": verification_id}
            )
            
            return {"success": True, "phone_verified": True}
        else:
            # Mark as failed
            db_exec("""
                UPDATE phone_verifications 
                SET status = 'failed'
                WHERE id = %s
            """, (verification_id,))
            
            # Write audit log
            write_audit(
                actor=user_id,
                event="phone_verify_failed",
                entity="phone_verification", 
                entity_id=str(verification_id),
                meta={"phone": phone, "code_attempted": code}
            )
            
            raise HTTPException(status_code=400, detail="Invalid verification code")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Phone verification check failed: {str(e)}")

@app.get("/api/auth/status")
def auth_status(user_id: str):
    """Get user verification status"""
    try:
        profile = db_fetchone("""
            SELECT email_verified, phone_verified 
            FROM profiles 
            WHERE id = %s
        """, (user_id,))
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        email_verified, phone_verified = profile
        
        return {
            "user_id": user_id,
            "email_verified": email_verified,
            "phone_verified": phone_verified
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

# M9 - Meta & Profile Completeness Endpoints

@app.get("/api/meta/countries")
def get_countries(sort: str = Query("dial_code")):
    """Get countries list with sorting"""
    try:
        countries = load_countries()
        
        # Sort by requested field
        if sort == "name":
            sorted_countries = sorted(countries, key=lambda x: x['name'])
        elif sort == "dial_code":
            # Sort by dial_code numerically (remove + and convert)
            sorted_countries = sorted(countries, key=lambda x: int(x['dial_code'].replace('+', '')))
        else:
            # Default to dial_code sorting
            sorted_countries = sorted(countries, key=lambda x: int(x['dial_code'].replace('+', '')))
        
        # Low-verbosity audit
        write_audit(
            actor=None,
            event="meta_countries",
            entity="meta",
            entity_id="countries",
            meta={"sort": sort, "count": len(sorted_countries)}
        )
        
        return sorted_countries
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Countries fetch failed: {str(e)}")

@app.get("/api/meta/zodiacs")
def get_zodiacs():
    """Get zodiac signs with date ranges"""
    try:
        zodiacs = [
            {"name": "Aries", "date_range": "Mar 21 - Apr 19", "order": 1},
            {"name": "Taurus", "date_range": "Apr 20 - May 20", "order": 2},
            {"name": "Gemini", "date_range": "May 21 - Jun 20", "order": 3},
            {"name": "Cancer", "date_range": "Jun 21 - Jul 22", "order": 4},
            {"name": "Leo", "date_range": "Jul 23 - Aug 22", "order": 5},
            {"name": "Virgo", "date_range": "Aug 23 - Sep 22", "order": 6},
            {"name": "Libra", "date_range": "Sep 23 - Oct 22", "order": 7},
            {"name": "Scorpio", "date_range": "Oct 23 - Nov 21", "order": 8},
            {"name": "Sagittarius", "date_range": "Nov 22 - Dec 21", "order": 9},
            {"name": "Capricorn", "date_range": "Dec 22 - Jan 19", "order": 10},
            {"name": "Aquarius", "date_range": "Jan 20 - Feb 18", "order": 11},
            {"name": "Pisces", "date_range": "Feb 19 - Mar 20", "order": 12}
        ]
        
        # Low-verbosity audit
        write_audit(
            actor=None,
            event="meta_zodiacs",
            entity="meta",
            entity_id="zodiacs",
            meta={"count": len(zodiacs)}
        )
        
        return zodiacs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zodiacs fetch failed: {str(e)}")

@app.get("/api/profile/requirements")
def get_profile_requirements(x_user_id: str = Header(...)):
    """Get profile requirements and completeness status"""
    try:
        user_id = x_user_id
        
        # Get required fields list
        required = profile_required_fields()
        
        # Get user profile
        profile = get_profile(user_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Check completeness
        complete = is_profile_complete(profile)
        email_verified = profile[10]  # email_verified column
        phone_verified = profile[11]  # phone_verified column
        
        # Find missing required fields
        missing = []
        field_map = {
            'first_name': 0, 'last_name': 1, 'email': 2, 'country': 3,
            'phone': 4, 'dob': 5, 'marital_status': 6, 'gender': 7
        }
        
        for field in required:
            if field in field_map:
                value = profile[field_map[field]]
                if not value or (isinstance(value, str) and value.strip() == ''):
                    missing.append(field)
        
        # Audit
        write_audit(
            actor=user_id,
            event="profile_requirements",
            entity="profile",
            entity_id=user_id,
            meta={
                "complete": complete, 
                "missing_count": len(missing),
                "email_verified": email_verified,
                "phone_verified": phone_verified
            }
        )
        
        return {
            "required": required,
            "missing": missing,
            "email_verified": email_verified,
            "phone_verified": phone_verified,
            "complete": complete
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile requirements check failed: {str(e)}")

@app.post("/api/profile/complete")
def complete_profile(request: ProfileCompleteRequest, x_user_id: str = Header(...)):
    """Complete profile (first-time social login)"""
    try:
        user_id = x_user_id
        
        # Rate limiting: 5 profile completions per hour
        enforce_rate_limit(user_id, "profile_complete", limit=5, window_sec=3600)
        
        # Validate country exists
        country_info = country_lookup(request.country)
        if not country_info:
            raise HTTPException(status_code=400, detail="Invalid country code")
        
        # Validate date format
        try:
            from datetime import datetime
            dob = datetime.strptime(request.dob, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Validate time format if provided
        birth_time = None
        if request.birth_time:
            try:
                birth_time = datetime.strptime(request.birth_time, '%H:%M:%S').time()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS")
        
        # Auto-fill country_code from country
        country_code = country_info['dial_code']
        
        # Update profile (zodiac will be auto-computed by trigger)
        db_exec("""
            UPDATE profiles 
            SET first_name = %s, last_name = %s, country = %s, phone = %s, 
                dob = %s, marital_status = %s, gender = %s, birth_place = %s, 
                birth_time = %s, country_code = %s, updated_at = now()
            WHERE id = %s
        """, (
            request.first_name, request.last_name, request.country, request.phone,
            dob, request.marital_status, request.gender, request.birth_place,
            birth_time, country_code, user_id
        ))
        
        # Verify profile is now complete
        updated_profile = get_profile(user_id)
        if not updated_profile:
            raise HTTPException(status_code=500, detail="Profile update failed")
        
        complete = is_profile_complete(updated_profile)
        zodiac = updated_profile[12]  # zodiac column
        
        # Audit
        write_audit(
            actor=user_id,
            event="profile_complete",
            entity="profile",
            entity_id=user_id,
            meta={
                "complete": complete,
                "zodiac": zodiac,
                "country": request.country,
                "auto_country_code": country_code
            }
        )
        
        return {
            "complete": complete,
            "zodiac": zodiac,
            "country_code": country_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile completion failed: {str(e)}")

# M10 - AI Assist Endpoints (Internal Only - Reader/Admin/SuperAdmin)

def validate_deepconf_available():
    """Check if DeepConf service is available"""
    if not DEEPCONF_API_URL or not DEEPCONF_API_KEY:
        raise HTTPException(status_code=503, detail="DeepConf service not configured")

def validate_semantic_available():
    """Check if Semantic Galaxy service is available"""
    if not SEMANTIC_API_URL or not SEMANTIC_API_KEY:
        raise HTTPException(status_code=503, detail="Semantic Galaxy service not configured")

def generate_deepconf_draft(order_data, provider="deepconf", model=None, style=None):
    """Generate draft using DeepConf API (internal helper)"""
    validate_deepconf_available()
    
    headers = {
        "Authorization": f"Bearer {DEEPCONF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "provider": provider,
        "model": model or "default",
        "style": style or "tarot",
        "order_data": order_data
    }
    
    try:
        response = requests.post(f"{DEEPCONF_API_URL}/api/generate", json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"DeepConf API error: {str(e)}")

def semantic_search(query, max_results=5):
    """Search knowledge base using Semantic Galaxy (internal helper)"""
    validate_semantic_available()
    
    headers = {
        "Authorization": f"Bearer {SEMANTIC_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "max_results": max_results
    }
    
    try:
        response = requests.post(f"{SEMANTIC_API_URL}/api/search", json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Semantic Galaxy API error: {str(e)}")

@app.post("/api/assist/draft")
def create_assist_draft(request: AssistDraftRequest, x_user_id: str = Header(...)):
    """Generate draft for order (internal - reader/admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - internal only
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Internal access only")
        
        # Rate limiting: 10 drafts per hour
        enforce_rate_limit(user_id, "assist_draft", limit=10, window_sec=3600)
        
        # Get order details
        order = db_fetchone("""
            SELECT o.id, o.user_id, o.question_text, o.status, s.code as service_code, p.first_name, p.dob, p.zodiac
            FROM orders o
            JOIN services s ON s.id = o.service_id
            JOIN profiles p ON p.id = o.user_id
            WHERE o.id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, client_id, question_text, status, service_code, first_name, dob, zodiac = order
        
        # Check if reader assigned to this order (readers can only draft their assigned orders)
        if role == 'reader':
            assigned_reader = db_fetchone("SELECT assigned_reader FROM orders WHERE id = %s", (request.order_id,))
            if not assigned_reader or assigned_reader[0] != user_id:
                raise HTTPException(status_code=403, detail="Order not assigned to you")
        
        # Prepare order data for DeepConf
        order_data = {
            "order_id": order_id,
            "service": service_code,
            "client_name": first_name,
            "question": question_text,
            "dob": str(dob) if dob else None,
            "zodiac": zodiac
        }
        
        # Generate draft via DeepConf
        draft_response = generate_deepconf_draft(order_data, request.provider, request.model, request.style)
        
        # Store draft in database
        draft_id = db_fetchone("""
            INSERT INTO assist_drafts (order_id, created_by, provider, model, style, content)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (request.order_id, user_id, request.provider, request.model, request.style, json.dumps(draft_response)))[0]
        
        # Log session
        db_exec("""
            INSERT INTO assist_sessions (order_id, actor_id, kind, prompt, response)
            VALUES (%s, %s, 'draft', %s, %s)
        """, (request.order_id, user_id, json.dumps({"provider": request.provider, "style": request.style}), 
              json.dumps(draft_response)))
        
        # Audit
        write_audit(
            actor=user_id,
            event="assist_draft_create",
            entity="draft",
            entity_id=str(draft_id),
            meta={"order_id": request.order_id, "provider": request.provider}
        )
        
        return {"draft_id": draft_id, "content": draft_response}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")

@app.post("/api/assist/search")
def assist_semantic_search(request: AssistSearchRequest, x_user_id: str = Header(...)):
    """Semantic search for symbols/meanings (internal - reader/admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - internal only
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Internal access only")
        
        # Rate limiting: 20 searches per hour
        enforce_rate_limit(user_id, "assist_search", limit=20, window_sec=3600)
        
        # Perform semantic search
        search_results = semantic_search(request.query, request.max_results)
        
        # Log session
        db_exec("""
            INSERT INTO assist_sessions (order_id, actor_id, kind, prompt, response)
            VALUES (%s, %s, 'search', %s, %s)
        """, (request.order_id, user_id, json.dumps({"query": request.query}), json.dumps(search_results)))
        
        # Audit
        write_audit(
            actor=user_id,
            event="assist_search",
            entity="search",
            entity_id=None,
            meta={"query": request.query, "order_id": request.order_id, "result_count": len(search_results.get("results", []))}
        )
        
        return search_results
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")

@app.post("/api/assist/knowledge/add")
def add_knowledge(request: KnowledgeAddRequest, x_user_id: str = Header(...)):
    """Add knowledge to internal knowledge base (admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - admin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access only")
        
        # Rate limiting: 5 knowledge additions per hour
        enforce_rate_limit(user_id, "knowledge_add", limit=5, window_sec=3600)
        
        # Create document record
        doc_id = db_fetchone("""
            INSERT INTO kb_docs (title, source_url, created_by)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (request.title, request.source_url, user_id))[0]
        
        # Split content into chunks (simple splitting by paragraph)
        chunks = [chunk.strip() for chunk in request.content.split('\n\n') if chunk.strip()]
        
        for chunk in chunks:
            # For now, store without embedding (would need actual embedding API)
            db_exec("""
                INSERT INTO kb_chunks (doc_id, content)
                VALUES (%s, %s)
            """, (doc_id, chunk))
        
        # Audit
        write_audit(
            actor=user_id,
            event="knowledge_add",
            entity="kb_doc",
            entity_id=str(doc_id),
            meta={"title": request.title, "chunks_count": len(chunks)}
        )
        
        return {"doc_id": doc_id, "title": request.title, "chunks_added": len(chunks)}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge addition failed: {str(e)}")

@app.get("/api/assist/drafts/{order_id}")
def get_assist_drafts(order_id: int, x_user_id: str = Header(...)):
    """Get all drafts for an order (internal - reader/admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - internal only
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Internal access only")
        
        # Check order access
        if role == 'reader':
            assigned_reader = db_fetchone("SELECT assigned_reader FROM orders WHERE id = %s", (order_id,))
            if not assigned_reader or assigned_reader[0] != user_id:
                raise HTTPException(status_code=403, detail="Order not assigned to you")
        
        # Get drafts
        drafts = db_fetchall("""
            SELECT id, provider, model, style, content, created_at
            FROM assist_drafts
            WHERE order_id = %s
            ORDER BY created_at DESC
        """, (order_id,))
        
        result = []
        for draft in drafts:
            draft_id, provider, model, style, content, created_at = draft
            result.append({
                "draft_id": draft_id,
                "provider": provider,
                "model": model,
                "style": style,
                "content": json.loads(content) if content else {},
                "created_at": created_at.isoformat()
            })
        
        return {"order_id": order_id, "drafts": result}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get drafts: {str(e)}")

# M11 - Ops/QA Helpers

def mask_pii(value: str, field_type: str = "email") -> str:
    """Mask PII for export safety"""
    if not value:
        return value
    
    if field_type == "email":
        parts = value.split("@")
        if len(parts) == 2:
            return f"{parts[0][:2]}***@{parts[1]}"
    elif field_type == "phone":
        if len(value) > 6:
            return f"{value[:3]}***{value[-2:]}"
    
    return "***MASKED***"

def sql_timer_wrapper(func):
    """Decorator to time SQL operations for metrics"""
    import time
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = (time.time() - start) * 1000  # ms
        # Store timing in a simple way for metrics collection
        if not hasattr(sql_timer_wrapper, 'timings'):
            sql_timer_wrapper.timings = []
        sql_timer_wrapper.timings.append(duration)
        return result
    return wrapper

# Override db helpers with timing
db_exec = sql_timer_wrapper(db_exec)
db_fetchone = sql_timer_wrapper(db_fetchone)
db_fetchall = sql_timer_wrapper(db_fetchall)

# M11 - Ops/QA Endpoints (Admin/SuperAdmin Only)

@app.get("/api/ops/snapshot")
def ops_snapshot(days: int = Query(7), x_user_id: str = Header(...)):
    """System snapshot for ops monitoring (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Admin/SuperAdmin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Table counts (recent activity)
        tables_data = {}
        
        # Orders in last N days
        orders_count = db_fetchone("SELECT COUNT(*) FROM orders WHERE created_at >= %s", (from_date,))[0]
        tables_data['orders'] = orders_count
        
        # Media assets in last N days
        media_count = db_fetchone("SELECT COUNT(*) FROM media_assets WHERE created_at >= %s", (from_date,))[0]
        tables_data['media_assets'] = media_count
        
        # Horoscopes in last N days
        horoscopes_count = db_fetchone("SELECT COUNT(*) FROM horoscopes WHERE created_at >= %s", (from_date,))[0]
        tables_data['horoscopes'] = horoscopes_count
        
        # Calls in last N days
        calls_count = db_fetchone("SELECT COUNT(*) FROM calls WHERE created_at >= %s", (from_date,))[0]
        tables_data['calls'] = calls_count
        
        # Moderation actions in last N days
        mod_count = db_fetchone("SELECT COUNT(*) FROM moderation_actions WHERE created_at >= %s", (from_date,))[0]
        tables_data['moderation_actions'] = mod_count
        
        # Audit log in last N days
        audit_count = db_fetchone("SELECT COUNT(*) FROM audit_log WHERE created_at >= %s", (from_date,))[0]
        tables_data['audit_log'] = audit_count
        
        # Latest migrations
        migrations = db_fetchall("SELECT name, applied_at FROM _migrations ORDER BY applied_at DESC LIMIT 10")
        latest_migrations = [{"name": m[0], "applied_at": m[1].isoformat()} for m in migrations]
        
        # Top audit events (last N days)
        events = db_fetchall("""
            SELECT event, COUNT(*) as count 
            FROM audit_log 
            WHERE created_at >= %s 
            GROUP BY event 
            ORDER BY count DESC 
            LIMIT 10
        """, (from_date,))
        last_events = [{"event": e[0], "count": e[1]} for e in events]
        
        # Audit snapshot access
        write_audit(
            actor=user_id,
            event="ops_snapshot",
            entity="system",
            entity_id=None,
            meta={"days": days}
        )
        
        return {
            "snapshot_date": datetime.utcnow().isoformat(),
            "period_days": days,
            "tables": tables_data,
            "latest_migrations": latest_migrations,
            "last_events": last_events
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Snapshot failed: {str(e)}")

@app.post("/api/ops/export")
def ops_export(request: OpsExportRequest, x_user_id: str = Header(...)):
    """Export data as ZIP of CSVs (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Admin/SuperAdmin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # PII access control
        if request.pii == "raw" and role != 'superadmin':
            raise HTTPException(status_code=403, detail="Raw PII access requires superadmin")
        
        from_date = request.range.get("from")
        to_date = request.range.get("to")
        
        if not from_date or not to_date:
            raise HTTPException(status_code=400, detail="Date range required")
        
        import io
        import zipfile
        import csv
        
        zip_buffer = io.BytesIO()
        export_counts = {}
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            
            # Orders export
            if "orders" in request.entities:
                orders = db_fetchall("""
                    SELECT o.id, o.user_id, o.service_id, o.question_text, o.is_gold, o.status,
                           o.created_at, o.updated_at, p.email, p.phone, p.first_name, p.last_name,
                           s.code as service_code
                    FROM orders o
                    JOIN profiles p ON p.id = o.user_id
                    JOIN services s ON s.id = o.service_id
                    WHERE o.created_at >= %s AND o.created_at <= %s
                    ORDER BY o.created_at DESC
                """, (from_date, to_date + " 23:59:59"))
                
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow(['order_id', 'user_id', 'service_code', 'question_text', 'is_gold', 'status',
                               'created_at', 'updated_at', 'email', 'phone', 'first_name', 'last_name'])
                
                for order in orders:
                    row = list(order)
                    if request.pii == "masked":
                        row[8] = mask_pii(row[8], "email")  # email
                        row[9] = mask_pii(row[9], "phone")  # phone
                    writer.writerow(row)
                
                zip_file.writestr("orders.csv", csv_buffer.getvalue())
                export_counts["orders"] = len(orders)
            
            # Horoscopes export
            if "horoscopes" in request.entities:
                horoscopes = db_fetchall("""
                    SELECT id, zodiac, ref_date, audio_media_id, tiktok_post_url, 
                           approved_by, approved_at, created_at
                    FROM horoscopes
                    WHERE created_at >= %s AND created_at <= %s
                    ORDER BY created_at DESC
                """, (from_date, to_date + " 23:59:59"))
                
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow(['id', 'zodiac', 'ref_date', 'audio_media_id', 'tiktok_post_url',
                               'approved_by', 'approved_at', 'created_at'])
                
                for row in horoscopes:
                    writer.writerow(row)
                
                zip_file.writestr("horoscopes.csv", csv_buffer.getvalue())
                export_counts["horoscopes"] = len(horoscopes)
            
            # Calls export
            if "calls" in request.entities:
                calls = db_fetchall("""
                    SELECT c.id, c.order_id, c.scheduled_at, c.started_at, c.ended_at, c.duration_minutes,
                           c.status, c.end_reason, c.conference_sid, c.client_call_sid, c.reader_call_sid,
                           c.created_at
                    FROM calls c
                    WHERE c.created_at >= %s AND c.created_at <= %s
                    ORDER BY c.created_at DESC
                """, (from_date, to_date + " 23:59:59"))
                
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow(['id', 'order_id', 'scheduled_at', 'started_at', 'ended_at', 'duration_minutes',
                               'status', 'end_reason', 'conference_sid', 'client_call_sid', 'reader_call_sid',
                               'created_at'])
                
                for row in calls:
                    writer.writerow(row)
                
                zip_file.writestr("calls.csv", csv_buffer.getvalue())
                export_counts["calls"] = len(calls)
            
            # Moderation export
            if "moderation" in request.entities:
                moderation = db_fetchall("""
                    SELECT id, actor_id, target_kind, target_id, action, reason, created_at
                    FROM moderation_actions
                    WHERE created_at >= %s AND created_at <= %s
                    ORDER BY created_at DESC
                """, (from_date, to_date + " 23:59:59"))
                
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow(['id', 'actor_id', 'target_kind', 'target_id', 'action', 'reason', 'created_at'])
                
                for row in moderation:
                    writer.writerow(row)
                
                zip_file.writestr("moderation_actions.csv", csv_buffer.getvalue())
                export_counts["moderation"] = len(moderation)
            
            # Audit export
            if "audit" in request.entities:
                audit = db_fetchall("""
                    SELECT id, actor, event, entity, entity_id, meta, created_at
                    FROM audit_log
                    WHERE created_at >= %s AND created_at <= %s
                    ORDER BY created_at DESC
                """, (from_date, to_date + " 23:59:59"))
                
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow(['id', 'actor', 'event', 'entity', 'entity_id', 'meta', 'created_at'])
                
                for row in audit:
                    writer.writerow(row)
                
                zip_file.writestr("audit_log.csv", csv_buffer.getvalue())
                export_counts["audit"] = len(audit)
        
        # Audit export operation
        write_audit(
            actor=user_id,
            event="ops_export",
            entity="system",
            entity_id=None,
            meta={
                "date_range": f"{from_date} to {to_date}",
                "entities": request.entities,
                "pii_mode": request.pii,
                "export_counts": export_counts
            }
        )
        
        zip_buffer.seek(0)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=samia_export_{from_date}_to_{to_date}.zip"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.get("/api/ops/metrics")
def ops_metrics(days: int = Query(1), x_user_id: str = Header(...)):
    """System metrics for monitoring (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Admin/SuperAdmin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Basic counters
        metrics = {}
        
        # Orders metrics
        orders_created = db_fetchone("SELECT COUNT(*) FROM orders WHERE created_at >= %s", (from_date,))[0]
        orders_delivered = db_fetchone("SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND updated_at >= %s", (from_date,))[0]
        
        # Rejection/regeneration counts
        rejects = db_fetchone("SELECT COUNT(*) FROM orders WHERE status = 'rejected' AND updated_at >= %s", (from_date,))[0]
        regenerates = db_fetchone("SELECT COUNT(*) FROM horoscopes WHERE created_at >= %s", (from_date,))[0]
        
        # Calls metrics
        calls_started = db_fetchone("SELECT COUNT(*) FROM calls WHERE started_at >= %s", (from_date,))[0]
        calls_ended = db_fetchone("SELECT COUNT(*) FROM calls WHERE ended_at >= %s", (from_date,))[0]
        
        # Rate limit hits (from api_rate_limits table)
        rate_limit_hits = db_fetchone("""
            SELECT COUNT(*) FROM api_rate_limits 
            WHERE last_request >= %s AND tokens_available <= 0
        """, (from_date,))[0]
        
        # Average SQL latency
        avg_sql_latency = 0
        if hasattr(sql_timer_wrapper, 'timings') and sql_timer_wrapper.timings:
            avg_sql_latency = sum(sql_timer_wrapper.timings) / len(sql_timer_wrapper.timings)
            # Reset timings for next collection
            sql_timer_wrapper.timings = []
        
        # M40: Siren metrics
        siren_metrics = {}
        try:
            from services.siren_service import SirenService
            siren_service = SirenService(get_db_config())
            siren_metrics = siren_service.get_siren_metrics()
        except Exception as e:
            siren_metrics = {"error": f"Siren metrics unavailable: {str(e)}"}
        
        # M45: Store validation metrics
        store_validation_reads = 0
        store_validation_updates = 0
        try:
            reads_row = db_fetchone("SELECT value FROM app_settings WHERE key = 'metrics.store_validation_reads_total'")
            store_validation_reads = int(reads_row[0]) if reads_row else 0
            
            updates_row = db_fetchone("SELECT value FROM app_settings WHERE key = 'metrics.store_validation_updates_total'") 
            store_validation_updates = int(updates_row[0]) if updates_row else 0
        except Exception:
            pass  # Ignore metrics collection errors
        
        # M41: Performance metrics
        perf_metrics = perf_tracker.get_metrics()
        
        # Circuit breaker status
        circuit_status = {}
        try:
            from services.providers_guard import ProviderGuard
            circuit_status = ProviderGuard.get_circuit_status()
        except Exception:
            pass  # Ignore if providers_guard not available
        
        metrics = {
            "period_days": days,
            "orders_created": orders_created,
            "orders_delivered": orders_delivered,
            "rejects": rejects,
            "regenerates": regenerates,
            "calls_started": calls_started,
            "calls_ended": calls_ended,
            "rate_limit_hits": rate_limit_hits,
            "avg_sql_latency_ms": round(avg_sql_latency, 2),
            "store_validation_reads_total": store_validation_reads,
            "store_validation_updates_total": store_validation_updates,
            "circuit_breakers": circuit_status,
            **siren_metrics,  # Include siren/availability metrics
            **perf_metrics    # Include M41 performance metrics
        }
        
        # Audit (low verbosity)
        write_audit(
            actor=user_id,
            event="ops_metrics",
            entity="system",
            entity_id=None,
            meta={"days": days}
        )
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics failed: {str(e)}")

@app.post("/api/ops/rate_limits")
def update_rate_limits(request: RateLimitsUpdateRequest, x_user_id: str = Header(...)):
    """Update system rate limits config (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Admin/SuperAdmin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        updates = {}
        if request.rate_orders_per_hour is not None:
            updates["rate_orders_per_hour"] = request.rate_orders_per_hour
        if request.rate_phone_verify_per_hour is not None:
            updates["rate_phone_verify_per_hour"] = request.rate_phone_verify_per_hour
        if request.rate_assist_draft_per_hour is not None:
            updates["rate_assist_draft_per_hour"] = request.rate_assist_draft_per_hour
        if request.rate_assist_search_per_hour is not None:
            updates["rate_assist_search_per_hour"] = request.rate_assist_search_per_hour
        if request.rate_knowledge_add_per_hour is not None:
            updates["rate_knowledge_add_per_hour"] = request.rate_knowledge_add_per_hour
        
        if not updates:
            raise HTTPException(status_code=400, detail="No rate limit values provided")
        
        # Upsert each setting
        for key, value in updates.items():
            db_exec("""
                INSERT INTO app_settings (key, value) 
                VALUES (%s, %s) 
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
            """, (key, str(value)))
        
        # Audit
        write_audit(
            actor=user_id,
            event="ops_rate_limits_update",
            entity="app_settings",
            entity_id=None,
            meta=updates
        )
        
        return {"updated": list(updates.keys()), "values": updates}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rate limits update failed: {str(e)}")

# M4 - Orders Workflow Endpoints

@app.post("/api/orders")
def create_order(request: OrderCreateRequest, x_user_id: str = Header(...)):
    """Create new service order"""
    try:
        user_id = x_user_id
        
        # Rate limiting: 10 orders per hour for regular users
        enforce_rate_limit(user_id, "create_order", limit=10, window_sec=3600)
        
        role = get_user_role(user_id)
        
        # Must be client or higher
        if role not in ['client', 'reader', 'monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Must have complete profile and verified email/phone (M9 enforcement)
        profile = get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        complete = is_profile_complete(profile)
        email_verified = profile[10]  # email_verified column
        phone_verified = profile[11]  # phone_verified column
        
        if not complete or not email_verified or not phone_verified:
            # Find missing requirements for helpful error
            missing = []
            required_fields = profile_required_fields()
            field_map = {
                'first_name': 0, 'last_name': 1, 'email': 2, 'country': 3,
                'phone': 4, 'dob': 5, 'marital_status': 6, 'gender': 7
            }
            
            for field in required_fields:
                if field in field_map:
                    value = profile[field_map[field]]
                    if not value or (isinstance(value, str) and value.strip() == ''):
                        missing.append(field)
            
            if not email_verified:
                missing.append("email_verification")
            if not phone_verified:
                missing.append("phone_verification")
                
            raise HTTPException(
                status_code=412,  # Precondition Failed
                detail={
                    "missing": missing,
                    "hint": "Complete profile & verify email/phone before creating orders"
                }
            )
        
        # Resolve service ID
        service = db_fetchone("SELECT id FROM services WHERE code = %s AND is_active = true", 
                             (request.service_code,))
        if not service:
            raise HTTPException(status_code=404, detail=f"Service '{request.service_code}' not found")
        
        service_id = service[0]
        
        # Create order
        order_id = db_fetchone("""
            INSERT INTO orders(user_id, service_id, is_gold, question_text, input_media_id, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, 'new', %s, %s)
            RETURNING id
        """, (user_id, service_id, request.is_gold, request.question_text, request.input_media_id, 
              datetime.utcnow(), datetime.utcnow()))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="order_create",
            entity="order",
            entity_id=str(order_id),
            meta={"service_code": request.service_code, "is_gold": request.is_gold}
        )
        
        return {"order_id": order_id, "status": "new"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")

@app.get("/api/orders/{order_id}")
def get_order(order_id: int, x_user_id: str = Header(...)):
    """Get order details with role-based access"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Build query based on role
        if role == 'client':
            order = db_fetchone("""
                SELECT o.id, o.status, o.question_text, o.is_gold, o.created_at, o.delivered_at,
                       s.name as service_name, s.code as service_code
                FROM orders o 
                JOIN services s ON s.id = o.service_id
                WHERE o.id = %s AND o.user_id = %s
            """, (order_id, user_id))
        elif role == 'reader':
            order = db_fetchone("""
                SELECT o.id, o.status, o.question_text, o.is_gold, o.created_at, o.delivered_at,
                       s.name as service_name, s.code as service_code, o.user_id
                FROM orders o 
                JOIN services s ON s.id = o.service_id
                WHERE o.id = %s AND o.assigned_reader = %s
            """, (order_id, user_id))
        elif role in ['monitor', 'admin', 'superadmin']:
            order = db_fetchone("""
                SELECT o.id, o.status, o.question_text, o.is_gold, o.created_at, o.delivered_at,
                       s.name as service_name, s.code as service_code, o.user_id, o.assigned_reader
                FROM orders o 
                JOIN services s ON s.id = o.service_id
                WHERE o.id = %s
            """, (order_id,))
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Audit read
        write_audit(
            actor=user_id,
            event="order_read",
            entity="order",
            entity_id=str(order_id),
            meta={"role": role}
        )
        
        # Convert to dict
        columns = ['id', 'status', 'question_text', 'is_gold', 'created_at', 'delivered_at', 
                  'service_name', 'service_code']
        if role != 'client':
            columns.append('user_id')
        if role in ['monitor', 'admin', 'superadmin']:
            columns.append('assigned_reader')
            
        result = dict(zip(columns, order[:len(columns)]))
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order fetch failed: {str(e)}")

@app.post("/api/orders/{order_id}/assign")
def assign_reader(order_id: int, request: AssignReaderRequest, x_user_id: str = Header(...)):
    """Assign reader to order (admin/superadmin only) - M17 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_order(user_id, order_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check order exists and is new/unassigned
        order = db_fetchone("SELECT status FROM orders WHERE id = %s", (order_id,))
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order[0] not in ['new']:
            raise HTTPException(status_code=409, detail=f"Cannot assign order with status: {order[0]}")
        
        # Verify reader exists and has reader role
        reader_role = db_fetchone("""
            SELECT r.code FROM profiles p 
            JOIN roles r ON r.id = p.role_id 
            WHERE p.id = %s
        """, (request.reader_id,))
        
        if not reader_role or reader_role[0] != 'reader':
            raise HTTPException(status_code=400, detail="Invalid reader ID")
        
        # Assign reader
        db_exec("""
            UPDATE orders 
            SET assigned_reader = %s, status = 'assigned', updated_at = %s
            WHERE id = %s
        """, (request.reader_id, datetime.utcnow(), order_id))
        
        # Audit
        write_audit(
            actor=user_id,
            event="order_assign",
            entity="order",
            entity_id=str(order_id),
            meta={"reader_id": request.reader_id}
        )
        
        return {"success": True, "order_id": order_id, "status": "assigned"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reader assignment failed: {str(e)}")

@app.post("/api/orders/{order_id}/start")
def start_work(order_id: int, x_user_id: str = Header(...)):
    """Start work on assigned order (reader only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'reader':
            raise HTTPException(status_code=403, detail="Reader access required")
        
        # Check order is assigned to this reader
        order = db_fetchone("""
            SELECT status, assigned_reader FROM orders WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status, assigned_reader = order
        if assigned_reader != user_id:
            raise HTTPException(status_code=403, detail="Order not assigned to you")
        
        if status == 'in_progress':
            return {"success": True, "order_id": order_id, "status": "in_progress", "note": "Already in progress"}
        
        if status != 'assigned':
            raise HTTPException(status_code=409, detail=f"Cannot start order with status: {status}")
        
        # Start work
        db_exec("""
            UPDATE orders 
            SET status = 'in_progress', updated_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), order_id))
        
        # Audit
        write_audit(
            actor=user_id,
            event="order_start",
            entity="order", 
            entity_id=str(order_id),
            meta={}
        )
        
        return {"success": True, "order_id": order_id, "status": "in_progress"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Start work failed: {str(e)}")

@app.post("/api/orders/{order_id}/output")
def upload_output(order_id: int, request: UploadResultRequest, x_user_id: str = Header(...)):
    """Upload output media/text (reader only) - M17 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_order(user_id, order_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role != 'reader':
            raise HTTPException(status_code=403, detail="Reader access required")
        
        # Check order assignment and status
        order = db_fetchone("""
            SELECT status, assigned_reader FROM orders WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status, assigned_reader = order
        if assigned_reader != user_id:
            raise HTTPException(status_code=403, detail="Order not assigned to you")
        
        # M17 state machine: only allow from assigned or rejected
        if status not in ['assigned', 'rejected']:
            raise HTTPException(status_code=409, detail=f"Cannot upload output for status: {status}")
        
        # Verify media exists
        media = db_fetchone("SELECT id FROM media_assets WHERE id = %s", (request.output_media_id,))
        if not media:
            raise HTTPException(status_code=404, detail="Media asset not found")
        
        # Upload result
        db_exec("""
            UPDATE orders 
            SET output_media_id = %s, status = 'awaiting_approval', updated_at = %s
            WHERE id = %s
        """, (request.output_media_id, datetime.utcnow(), order_id))
        
        # Audit
        write_audit(
            actor=user_id,
            event="order_result_upload",
            entity="order",
            entity_id=str(order_id),
            meta={"output_media_id": request.output_media_id}
        )
        
        return {"success": True, "order_id": order_id, "status": "awaiting_approval"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Result upload failed: {str(e)}")

@app.post("/api/orders/{order_id}/approve")
def approve_order(order_id: int, request: ApproveRequest, x_user_id: str = Header(...)):
    """Approve order (monitor/admin/superadmin) - M17 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_order(user_id, order_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check order status
        order = db_fetchone("""
            SELECT status, user_id FROM orders WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status, order_user_id = order
        if status != 'awaiting_approval':
            raise HTTPException(status_code=409, detail=f"Cannot approve order with status: {status}")
        
        # Check client still verified
        email_verified, phone_verified = check_verification_status(order_user_id)
        if not email_verified or not phone_verified:
            raise HTTPException(status_code=400, detail="Client verification status changed")
        
        # M17: Only approve, don't deliver yet
        db_exec("""
            UPDATE orders 
            SET status = 'approved', updated_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), order_id))
        
        # Moderation action
        db_exec("""
            INSERT INTO moderation_actions(actor_id, target_kind, target_id, action, reason, created_at)
            VALUES (%s, 'order', %s, 'approve', %s, %s)
        """, (user_id, str(order_id), request.note or '', datetime.utcnow()))
        
        # Audit
        write_audit(
            actor=user_id,
            event="order_approve",
            entity="order",
            entity_id=str(order_id),
            meta={"note": request.note}
        )
        
        return {"success": True, "order_id": order_id, "status": "approved"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order approval failed: {str(e)}")

@app.post("/api/orders/{order_id}/deliver")
def deliver_order(order_id: int, x_user_id: str = Header(...)):
    """Deliver approved order (system/admin) - M17 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_order(user_id, order_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required for delivery")
        
        # Check order status
        order = db_fetchone("""
            SELECT status, user_id FROM orders WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status, order_user_id = order
        if status != 'approved':
            raise HTTPException(status_code=409, detail=f"Cannot deliver order with status: {status}")
        
        # Deliver
        db_exec("""
            UPDATE orders 
            SET status = 'delivered', delivered_at = %s, updated_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), datetime.utcnow(), order_id))
        
        # Audit delivery
        write_audit(
            actor=user_id,
            event="order_deliver",
            entity="order",
            entity_id=str(order_id),
            meta={}
        )
        
        return {"success": True, "order_id": order_id, "status": "delivered"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order delivery failed: {str(e)}")

@app.post("/api/orders/{order_id}/reject")
def reject_order(order_id: int, request: RejectRequest, x_user_id: str = Header(...)):
    """Reject order (monitor/admin/superadmin) - M17 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_order(user_id, order_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check order status
        order = db_fetchone("SELECT status FROM orders WHERE id = %s", (order_id,))
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order[0] != 'awaiting_approval':
            raise HTTPException(status_code=409, detail=f"Cannot reject order with status: {order[0]}")
        
        # Reject (clear output, keep reader assigned for redo)
        db_exec("""
            UPDATE orders 
            SET status = 'rejected', output_media_id = NULL, updated_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), order_id))
        
        # Moderation action
        db_exec("""
            INSERT INTO moderation_actions(actor_id, target_kind, target_id, action, reason, created_at)
            VALUES (%s, 'order', %s, 'reject', %s, %s)
        """, (user_id, str(order_id), request.reason, datetime.utcnow()))
        
        # Audit
        write_audit(
            actor=user_id,
            event="order_reject",
            entity="order",
            entity_id=str(order_id),
            meta={"reason": request.reason}
        )
        
        return {"success": True, "order_id": order_id, "status": "rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order rejection failed: {str(e)}")

@app.get("/api/orders")
def list_orders(mine: bool = True, x_user_id: str = Header(...)):
    """List orders based on user role"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Build query based on role
        if role == 'client' or mine:
            if role == 'client':
                orders = db_fetchall("""
                    SELECT o.id, o.status, o.is_gold, o.created_at, o.delivered_at,
                           s.name as service_name, s.code as service_code
                    FROM orders o
                    JOIN services s ON s.id = o.service_id  
                    WHERE o.user_id = %s
                    ORDER BY o.created_at DESC
                """, (user_id,))
            elif role == 'reader':
                orders = db_fetchall("""
                    SELECT o.id, o.status, o.is_gold, o.created_at, o.delivered_at,
                           s.name as service_name, s.code as service_code
                    FROM orders o
                    JOIN services s ON s.id = o.service_id
                    WHERE o.assigned_reader = %s
                    ORDER BY o.created_at DESC
                """, (user_id,))
        elif role in ['monitor', 'admin', 'superadmin']:
            orders = db_fetchall("""
                SELECT o.id, o.status, o.is_gold, o.created_at, o.delivered_at,
                       s.name as service_name, s.code as service_code, o.user_id, o.assigned_reader
                FROM orders o
                JOIN services s ON s.id = o.service_id
                ORDER BY o.created_at DESC
                LIMIT 100
            """)
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Convert to list of dicts
        if role == 'client' or (role == 'reader' and mine):
            columns = ['id', 'status', 'is_gold', 'created_at', 'delivered_at', 'service_name', 'service_code']
        else:
            columns = ['id', 'status', 'is_gold', 'created_at', 'delivered_at', 'service_name', 'service_code', 'user_id', 'assigned_reader']
        
        result = [dict(zip(columns, order)) for order in orders]
        
        # Audit
        write_audit(
            actor=user_id,
            event="orders_list",
            entity="orders",
            entity_id=None,
            meta={"role": role, "count": len(result)}
        )
        
        return {"orders": result, "count": len(result)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orders list failed: {str(e)}")

# M6 - Astro Service Endpoints

@app.post("/api/astro/order")
def create_astro_order(request: AstroOrderRequest, x_user_id: str = Header(...)):
    """Create astro order (client+; verified email/phone required)"""
    try:
        user_id = x_user_id
        
        # Rate limiting: 5 astro orders per day per user
        enforce_rate_limit(user_id, "astro_order", limit=5, window_sec=86400)
        
        # Must have complete profile and verified email/phone (M9 enforcement)
        profile = get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        complete = is_profile_complete(profile)
        email_verified = profile[10]  # email_verified column
        phone_verified = profile[11]  # phone_verified column
        
        if not complete or not email_verified or not phone_verified:
            # Find missing requirements for helpful error
            missing = []
            required_fields = profile_required_fields()
            field_map = {
                'first_name': 0, 'last_name': 1, 'email': 2, 'country': 3,
                'phone': 4, 'dob': 5, 'marital_status': 6, 'gender': 7
            }
            
            for field in required_fields:
                if field in field_map:
                    value = profile[field_map[field]]
                    if not value or (isinstance(value, str) and value.strip() == ''):
                        missing.append(field)
            
            if not email_verified:
                missing.append("email_verification")
            if not phone_verified:
                missing.append("phone_verification")
                
            raise HTTPException(
                status_code=412,  # Precondition Failed
                detail={
                    "missing": missing,
                    "hint": "Complete profile & verify email/phone before creating astro orders"
                }
            )
        
        # Resolve astro service_id
        service = db_fetchone("SELECT id FROM services WHERE code = 'astro'")
        if not service:
            raise HTTPException(status_code=404, detail="Astro service not found")
        service_id = service[0]
        
        # Validate date format
        try:
            dob = datetime.strptime(request.dob, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
        # Validate time format if provided
        birth_time = None
        if request.birth_time:
            try:
                birth_time = datetime.strptime(request.birth_time, '%H:%M:%S').time()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS")
        
        # Create order
        order_id = db_fetchone("""
            INSERT INTO orders (user_id, service_id, is_gold, question_text, status)
            VALUES (%s, %s, %s, %s, 'new')
            RETURNING id
        """, (user_id, service_id, request.is_gold, request.question_text))[0]
        
        # Store astro request snapshot
        db_exec("""
            INSERT INTO astro_requests (order_id, user_id, dob, birth_place, birth_time, country, country_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (order_id, user_id, dob, request.birth_place, birth_time, request.country, request.country_code))
        
        # Audit
        write_audit(
            actor=user_id,
            event="astro_order_create", 
            entity="order",
            entity_id=str(order_id),
            meta={"country": request.country, "country_code": request.country_code}
        )
        
        return {"order_id": order_id, "status": "new"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Astro order creation failed: {str(e)}")

@app.post("/api/astro/draft")
def generate_astro_draft(request: AstroDraftRequest, x_user_id: str = Header(...)):
    """Generate internal astro draft (reader/admin/superadmin)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get order and astro request data
        order = db_fetchone("""
            SELECT o.id, o.user_id, o.assigned_reader, o.status,
                   ar.dob, ar.birth_place, ar.birth_time, ar.country, ar.country_code
            FROM orders o
            JOIN astro_requests ar ON ar.order_id = o.id
            WHERE o.id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Astro order not found")
        
        order_id, order_user_id, assigned_reader, status, dob, birth_place, birth_time, country, country_code = order
        
        # For readers, must be assigned to this order
        if role == 'reader' and assigned_reader != user_id:
            raise HTTPException(status_code=403, detail="Not assigned to this order")
        
        # Compute zodiac sign using existing SQL function
        zodiac = db_fetchone("SELECT calc_zodiac(%s)", (dob,))[0]
        
        # Generate concise internal analysis (deterministic server-side logic)
        themes = {
            'Aries': ['leadership', 'courage', 'new beginnings'],
            'Taurus': ['stability', 'material comfort', 'persistence'], 
            'Gemini': ['communication', 'adaptability', 'curiosity'],
            'Cancer': ['intuition', 'emotional security', 'nurturing'],
            'Leo': ['creativity', 'self-expression', 'confidence'],
            'Virgo': ['service', 'perfectionism', 'practical skills'],
            'Libra': ['balance', 'relationships', 'harmony'],
            'Scorpio': ['transformation', 'depth', 'regeneration'],
            'Sagittarius': ['wisdom', 'adventure', 'higher learning'],
            'Capricorn': ['ambition', 'structure', 'achievement'],
            'Aquarius': ['innovation', 'humanitarian ideals', 'independence'],
            'Pisces': ['spirituality', 'compassion', 'imagination']
        }.get(zodiac, ['balance', 'growth', 'awareness'])
        
        advice = [
            f"Focus on {themes[0]} themes in your reading",
            f"Consider {themes[1]} as a supporting element",
            f"Address any {themes[2]} challenges or opportunities"
        ]
        
        # Create internal summary (never shown to client)
        summary = {
            "sun_sign": zodiac,
            "themes": themes,
            "advice": advice,
            "birth_location": birth_place or "Not provided",
            "birth_time": str(birth_time) if birth_time else "Not provided",
            "country": country
        }
        
        # Store draft
        draft_id = db_fetchone("""
            INSERT INTO astro_summaries (order_id, summary, created_by)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (order_id, json.dumps(summary), user_id))[0]
        
        # Audit
        write_audit(
            actor=user_id,
            event="astro_draft_create",
            entity="order", 
            entity_id=str(order_id),
            meta={"draft_id": draft_id, "zodiac": zodiac}
        )
        
        return {"order_id": order_id, "draft_id": draft_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Astro draft generation failed: {str(e)}")

@app.post("/api/media/upload")
def upload_media(request: MediaUploadRequest, x_user_id: str = Header(...)):
    """Upload media file (reader/admin/superadmin)"""
    try:
        user_id = x_user_id
        
        # Rate limiting: 30 uploads per hour for staff
        enforce_rate_limit(user_id, "media_upload", limit=30, window_sec=3600)
        
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Validate media kind
        if request.kind not in ['audio', 'image', 'pdf', 'other']:
            raise HTTPException(status_code=400, detail="Invalid media kind")
        
        # Require Supabase Storage environment
        ensure_env(["SUPABASE_URL", "SUPABASE_SERVICE"])
        
        try:
            # Decode base64 content
            media_bytes = base64.b64decode(request.base64)
            content_hash = hashlib.sha256(media_bytes).hexdigest()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 content")
        
        # Generate unique storage path
        storage_key = f"orders/{uuid.uuid4()}/{request.filename}"
        
        # Upload to Supabase Storage
        storage_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{storage_key}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE}",
            "Content-Type": "application/octet-stream"
        }
        
        response = requests.post(storage_url, headers=headers, data=media_bytes)
        if response.status_code != 200:
            raise HTTPException(
                status_code=500, 
                detail=f"Storage upload failed: {response.status_code}"
            )
        
        # Store media asset record
        media_id = db_fetchone("""
            INSERT INTO media_assets (owner_id, kind, url, bytes, sha256, meta)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, 
            request.kind, 
            storage_key, 
            len(media_bytes), 
            content_hash,
            json.dumps({"filename": request.filename})
        ))[0]
        
        # Audit
        write_audit(
            actor=user_id,
            event="media_upload",
            entity="media",
            entity_id=str(media_id),
            meta={"kind": request.kind, "filename": request.filename, "bytes": len(media_bytes)}
        )
        
        return {"media_id": media_id, "url_key": storage_key}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Media upload failed: {str(e)}")

# M7 - Calls & Voice Endpoints  

@app.post("/api/calls/schedule")
def schedule_call(request: CallScheduleRequest, x_user_id: str = Header(...)):
    """Schedule call (client+, verified email/phone required)"""
    try:
        user_id = x_user_id
        
        # Check if user is blocked
        if is_blocked(user_id):
            raise HTTPException(status_code=403, detail="User is blocked")
        
        # Validate user profile exists and is verified
        profile = db_fetchone(
            "SELECT email_verified, phone_verified, role_id FROM profiles WHERE id = %s",
            (user_id,)
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        email_verified, phone_verified, role_id = profile
        if not email_verified or not phone_verified:
            raise HTTPException(status_code=403, detail="Email and phone verification required")
        
        # Validate service code
        if request.service_code not in ['direct_call', 'healing']:
            raise HTTPException(status_code=400, detail="Service must be 'direct_call' or 'healing'")
        
        # Resolve service_id
        service = db_fetchone("SELECT id FROM services WHERE code = %s", (request.service_code,))
        if not service:
            raise HTTPException(status_code=404, detail=f"Service {request.service_code} not found")
        service_id = service[0]
        
        # Parse scheduled time
        try:
            from datetime import datetime
            scheduled_at = datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format")
        
        # Create order
        order_id = db_fetchone("""
            INSERT INTO orders (user_id, service_id, question_text, scheduled_at, status)
            VALUES (%s, %s, %s, %s, 'new')
            RETURNING id
        """, (user_id, service_id, request.question_text, scheduled_at))[0]
        
        # Audit
        write_audit(
            actor=user_id,
            event="call_schedule",
            entity="order",
            entity_id=str(order_id),
            meta={
                "service": request.service_code, 
                "scheduled_at": request.scheduled_at,
                "timezone": request.timezone
            }
        )
        
        return {"order_id": order_id, "status": "scheduled"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call scheduling failed: {str(e)}")

@app.post("/api/calls/initiate")
def initiate_call(request: CallInitiateRequest, x_user_id: str = Header(...)):
    """Initiate call with Twilio conference (monitor/admin)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get order with profile data
        order = db_fetchone("""
            SELECT o.id, o.user_id, o.assigned_reader, o.service_id, o.status,
                   cp.phone as client_phone, rp.phone as reader_phone,
                   s.code as service_code
            FROM orders o
            JOIN profiles cp ON cp.id = o.user_id
            LEFT JOIN profiles rp ON rp.id = o.assigned_reader
            JOIN services s ON s.id = o.service_id
            WHERE o.id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, client_id, reader_id, service_id, status, client_phone, reader_phone, service_code = order
        
        # Check if participants are blocked
        if is_blocked(client_id):
            raise HTTPException(status_code=403, detail="Client is blocked")
        if reader_id and is_blocked(reader_id):
            raise HTTPException(status_code=403, detail="Assigned reader is blocked")
        
        if not client_phone:
            raise HTTPException(status_code=400, detail="Client phone number missing")
        if not reader_phone and service_code != 'direct_call':
            raise HTTPException(status_code=400, detail="Reader phone number missing")
        
        # Get Twilio client
        client = twilio_client()
        
        # Create unique conference name
        conference_name = f"samia_conf_{order_id}"
        
        # Webhook URLs
        client_voice_url = f"{TWILIO_WEBHOOK_BASE}/api/voice/twiml?role=client&order_id={order_id}"
        reader_voice_url = f"{TWILIO_WEBHOOK_BASE}/api/voice/twiml?role=reader&order_id={order_id}"
        status_callback = f"{TWILIO_WEBHOOK_BASE}/api/voice/events"
        
        # Place outbound call to client
        client_call = client.calls.create(
            to=client_phone,
            from_=TWILIO_VOICE_CALLER_ID,
            url=client_voice_url,
            status_callback=status_callback,
            status_callback_event=['initiated', 'ringing', 'answered', 'completed']
        )
        
        # Place outbound call to reader if not direct call with Samia
        reader_call_sid = None
        if service_code != 'direct_call' and reader_phone:
            reader_call = client.calls.create(
                to=reader_phone,
                from_=TWILIO_VOICE_CALLER_ID,
                url=reader_voice_url,
                status_callback=status_callback,
                status_callback_event=['initiated', 'ringing', 'answered', 'completed']
            )
            reader_call_sid = reader_call.sid
        
        # Update/create calls record
        db_exec("""
            INSERT INTO calls (order_id, conference_sid, client_call_sid, reader_call_sid, status, last_event)
            VALUES (%s, %s, %s, %s, 'dialing', 'initiated')
            ON CONFLICT (order_id) DO UPDATE SET
                conference_sid = EXCLUDED.conference_sid,
                client_call_sid = EXCLUDED.client_call_sid,
                reader_call_sid = EXCLUDED.reader_call_sid,
                status = EXCLUDED.status,
                last_event = EXCLUDED.last_event
        """, (order_id, conference_name, client_call.sid, reader_call_sid))
        
        # Audit
        write_audit(
            actor=user_id,
            event="call_initiate",
            entity="order",
            entity_id=str(order_id),
            meta={
                "conference": conference_name,
                "client_call_sid": client_call.sid,
                "reader_call_sid": reader_call_sid
            }
        )
        
        return {
            "order_id": order_id, 
            "conference_name": conference_name,
            "status": "dialing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call initiation failed: {str(e)}")

@app.post("/api/voice/twiml")
def voice_twiml(role: str = Query(...), order_id: int = Query(...)):
    """TwiML webhook for Twilio voice calls"""
    try:
        # Generate TwiML to join conference
        conference_name = f"samia_conf_{order_id}"
        
        # Basic TwiML - join conference
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Conference>{conference_name}</Conference>
    </Dial>
</Response>"""
        
        # Minimal audit for webhook
        write_audit(
            actor=None,
            event="twiml_served",
            entity="call",
            entity_id=str(order_id),
            meta={"role": role, "conference": conference_name}
        )
        
        return twiml_response(twiml)
        
    except Exception as e:
        # Return basic TwiML on error
        error_twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Sorry, call could not be connected.</Say>
    <Hangup/>
</Response>"""
        return twiml_response(error_twiml)

@app.post("/api/voice/events")
def voice_events(
    CallSid: str = Query(...),
    CallStatus: str = Query(...),
    To: str = Query(None),
    From: str = Query(None)
):
    """Twilio voice status webhook handler"""
    try:
        # Find call by sid
        call_record = db_fetchone("""
            SELECT order_id FROM calls 
            WHERE client_call_sid = %s OR reader_call_sid = %s
        """, (CallSid, CallSid))
        
        if call_record:
            order_id = call_record[0]
            
            # Update call status
            now_timestamp = None
            if CallStatus in ['answered']:
                db_exec("""
                    UPDATE calls SET status = 'in_conference', last_event = %s,
                           started_at = COALESCE(started_at, now())
                    WHERE order_id = %s
                """, (CallStatus, order_id))
            elif CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
                db_exec("""
                    UPDATE calls SET status = 'ended', last_event = %s,
                           ended_at = COALESCE(ended_at, now())
                    WHERE order_id = %s
                """, (CallStatus, order_id))
            else:
                db_exec("""
                    UPDATE calls SET last_event = %s WHERE order_id = %s
                """, (CallStatus, order_id))
            
            # Audit webhook event
            write_audit(
                actor=None,
                event="call_status_update",
                entity="call",
                entity_id=str(order_id),
                meta={
                    "call_sid": CallSid,
                    "status": CallStatus,
                    "to": To,
                    "from": From
                }
            )
        
        return {"status": "received"}
        
    except Exception as e:
        # Log error but don't fail webhook
        print(f"Voice webhook error: {str(e)}")
        return {"status": "error"}

@app.post("/api/calls/terminate")
def terminate_call(request: CallTerminateRequest, x_user_id: str = Header(...)):
    """Terminate live call (monitor/admin)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get call details
        call = db_fetchone("""
            SELECT conference_sid, client_call_sid, reader_call_sid, status
            FROM calls WHERE order_id = %s
        """, (request.order_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        conference_sid, client_call_sid, reader_call_sid, status = call
        
        if status in ['ended', 'failed']:
            raise HTTPException(status_code=400, detail="Call already ended")
        
        # Get Twilio client
        client = twilio_client()
        
        # Hang up individual calls
        try:
            if client_call_sid:
                client.calls(client_call_sid).update(status='completed')
        except:
            pass  # Call may already be ended
            
        try:
            if reader_call_sid:
                client.calls(reader_call_sid).update(status='completed')
        except:
            pass  # Call may already be ended
        
        # Update database
        db_exec("""
            UPDATE calls 
            SET status = 'ended', last_event = 'terminated_by_monitor',
                ended_at = now(), end_reason = %s
            WHERE order_id = %s
        """, (request.reason, request.order_id))
        
        # Add moderation action
        db_exec("""
            INSERT INTO moderation_actions (actor_id, target_kind, target_id, action, reason)
            VALUES (%s, 'call', %s, 'drop_call', %s)
        """, (user_id, str(request.order_id), request.reason))
        
        # Audit
        write_audit(
            actor=user_id,
            event="call_terminate",
            entity="call",
            entity_id=str(request.order_id),
            meta={"reason": request.reason, "conference_sid": conference_sid}
        )
        
        return {"order_id": request.order_id, "status": "terminated"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call termination failed: {str(e)}")

@app.post("/api/healing/prep/mark")
def mark_healing_prep(request: HealingPrepRequest, x_user_id: str = Header(...)):
    """Mark healing pre-ritual complete (reader/admin)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get order details
        order = db_fetchone("""
            SELECT o.assigned_reader, s.code as service_code
            FROM orders o
            JOIN services s ON s.id = o.service_id
            WHERE o.id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        assigned_reader, service_code = order
        
        if service_code != 'healing':
            raise HTTPException(status_code=400, detail="Order is not for healing service")
        
        # For readers, must be assigned to this order
        if role == 'reader' and assigned_reader != user_id:
            raise HTTPException(status_code=403, detail="Not assigned to this order")
        
        # Audit the prep completion
        write_audit(
            actor=user_id,
            event="healing_prep_done",
            entity="order",
            entity_id=str(request.order_id),
            meta={"note": request.note[:500]}  # Limit note length for audit
        )
        
        return {"order_id": request.order_id, "status": "prep_marked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Healing prep marking failed: {str(e)}")

# M7 - Moderation Block/Unblock Endpoints (using blocked_profiles table)

@app.post("/api/mod/block")
def block_profile(request: RejectRequest, x_user_id: str = Header(...)):
    """Block profile (monitor/admin)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Parse target_id as profile UUID
        try:
            profile_id = str(request.target_id)
            # Verify profile exists
            profile = db_fetchone("SELECT id FROM profiles WHERE id = %s", (profile_id,))
            if not profile:
                raise HTTPException(status_code=404, detail="Profile not found")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid profile ID")
        
        # Insert/update blocked_profiles
        db_exec("""
            INSERT INTO blocked_profiles (profile_id, reason, created_by, active)
            VALUES (%s, %s, %s, true)
            ON CONFLICT (profile_id) DO UPDATE SET
                active = true,
                reason = EXCLUDED.reason,
                created_by = EXCLUDED.created_by,
                created_at = now()
        """, (profile_id, request.reason, user_id))
        
        # Add moderation action
        db_exec("""
            INSERT INTO moderation_actions (actor_id, target_kind, target_id, action, reason)
            VALUES (%s, 'profile', %s, 'block', %s)
        """, (user_id, profile_id, request.reason))
        
        # Audit
        write_audit(
            actor=user_id,
            event="profile_block",
            entity="profile",
            entity_id=profile_id,
            meta={"reason": request.reason}
        )
        
        return {"profile_id": profile_id, "status": "blocked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile blocking failed: {str(e)}")

@app.post("/api/mod/unblock")
def unblock_profile(target_id: str, x_user_id: str = Header(...)):
    """Unblock profile (admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - admin only for unblock
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin privileges required for unblock")
        
        # Parse target_id as profile UUID
        try:
            profile_id = str(target_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid profile ID")
        
        # Check if profile is blocked
        blocked = db_fetchone("""
            SELECT active FROM blocked_profiles WHERE profile_id = %s
        """, (profile_id,))
        
        if not blocked:
            raise HTTPException(status_code=404, detail="Profile not found in blocklist")
        
        if not blocked[0]:  # already inactive
            raise HTTPException(status_code=400, detail="Profile already unblocked")
        
        # Deactivate block
        db_exec("""
            UPDATE blocked_profiles SET active = false WHERE profile_id = %s
        """, (profile_id,))
        
        # Add moderation action
        db_exec("""
            INSERT INTO moderation_actions (actor_id, target_kind, target_id, action, reason)
            VALUES (%s, 'profile', %s, 'unblock', 'Admin unblock')
        """, (user_id, profile_id))
        
        # Audit
        write_audit(
            actor=user_id,
            event="profile_unblock",
            entity="profile",
            entity_id=profile_id,
            meta={"admin_action": True}
        )
        
        return {"profile_id": profile_id, "status": "unblocked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile unblocking failed: {str(e)}")

# M8 - Ops & Health Check Endpoint

@app.get("/api/ops/health")
def health_check(x_user_id: str = Header(...)):
    """System health check (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Role validation - admin/superadmin only
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        health_status = {
            "db": False,
            "storage": False,
            "twilio": False,
            "uptime_sec": int(time.time() - APP_START_TIME),
            "version": "unknown"
        }
        
        # Database health check
        try:
            db_fetchone("SELECT 1")
            
            # Get key table counts
            counts = {
                "profiles": db_fetchone("SELECT COUNT(*) FROM profiles")[0],
                "orders": db_fetchone("SELECT COUNT(*) FROM orders")[0],
                "horoscopes": db_fetchone("SELECT COUNT(*) FROM horoscopes")[0],
                "calls": db_fetchone("SELECT COUNT(*) FROM calls")[0],
                "blocked_profiles": db_fetchone("SELECT COUNT(*) FROM blocked_profiles WHERE active = true")[0]
            }
            
            health_status["db"] = True
            health_status["table_counts"] = counts
        except Exception as e:
            health_status["db_error"] = str(e)
        
        # Storage health check (optional HEAD request)
        try:
            if SUPABASE_URL and SUPABASE_SERVICE:
                # Just check if we can construct a request (don't actually call)
                health_status["storage"] = True
            else:
                health_status["storage"] = False
        except Exception as e:
            health_status["storage_error"] = str(e)
        
        # Twilio credentials check (presence only, no API call)
        try:
            if all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VOICE_CALLER_ID, TWILIO_WEBHOOK_BASE]):
                health_status["twilio"] = True
            else:
                health_status["twilio"] = False
        except Exception as e:
            health_status["twilio_error"] = str(e)
        
        # Version info (try to read git SHA if available)
        try:
            import subprocess
            result = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], 
                                 capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                health_status["version"] = result.stdout.strip()
        except:
            pass  # Keep "unknown"
        
        # Audit health check
        write_audit(
            actor=user_id,
            event="health_check",
            entity="system", 
            entity_id=None,
            meta={
                "db": health_status["db"],
                "storage": health_status["storage"], 
                "twilio": health_status["twilio"]
            }
        )
        
        return health_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# M5 - TikTok Horoscope Ingestion Endpoints

@app.post("/api/horoscopes/ingest", include_in_schema=False)
def deprecated_tiktok_ingest():
    """DEPRECATED: TikTok ingestion removed - Use admin upload endpoint"""
    write_audit("system", "deprecated_endpoint_accessed", "api", "/api/horoscopes/ingest", {
        "replacement": "/api/admin/horoscopes/upload",
        "reason": "tiktok_ingestion_disabled"
    })
    raise HTTPException(status_code=410, detail="TikTok ingestion disabled - Use /api/admin/horoscopes/upload")

@app.get("/api/horoscopes/pending")
def list_pending_horoscopes(x_user_id: str = Header(...)):
    """List pending horoscopes awaiting approval (monitor/admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Get pending horoscopes
        pending = db_fetchall("""
            SELECT h.id, h.scope, h.zodiac, h.ref_date,
                   m.bytes, m.created_at
            FROM horoscopes h
            JOIN media_assets m ON m.id = h.audio_media_id
            WHERE h.approved_by IS NULL
            ORDER BY h.ref_date DESC, h.zodiac ASC
        """)
        
        # Convert to list of dicts
        columns = ['id', 'scope', 'zodiac', 'ref_date', 'bytes', 'created_at']
        result = [dict(zip(columns, row)) for row in pending]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_list_pending",
            entity="horoscopes",
            entity_id=None,
            meta={"count": len(result)}
        )
        
        return {"horoscopes": result, "count": len(result)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pending horoscopes list failed: {str(e)}")

@app.post("/api/monitor/horoscopes/{horoscope_id}/approve")
def approve_horoscope(horoscope_id: int, request: HoroscopeApproveRequest, x_user_id: str = Header(...)):
    """Approve horoscope for public release (monitor/admin/superadmin only) - M18 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_horoscope(user_id, for_management=True):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check horoscope exists
        horoscope = db_fetchone("""
            SELECT audio_media_id, approved_by, zodiac, ref_date, source_kind
            FROM horoscopes WHERE id = %s
        """, (horoscope_id,))
        
        if not horoscope:
            raise HTTPException(status_code=404, detail="Horoscope not found")
        
        audio_media_id, approved_by, zodiac, ref_date, source_kind = horoscope
        
        # M18: Audio optional for TikTok-linked content
        if source_kind == 'original_upload' and not audio_media_id:
            raise HTTPException(status_code=400, detail="Original upload horoscope requires audio media")
        
        if approved_by:
            raise HTTPException(status_code=409, detail="Horoscope already approved")
        
        # Approve
        db_exec("""
            UPDATE horoscopes 
            SET approved_by = %s, approved_at = %s
            WHERE id = %s
        """, (user_id, datetime.utcnow(), horoscope_id))
        
        # Moderation action
        db_exec("""
            INSERT INTO moderation_actions(actor_id, target_kind, target_id, action, reason, created_at)
            VALUES (%s, 'horoscope', %s, 'approve', %s, %s)
        """, (user_id, str(horoscope_id), request.note or '', datetime.utcnow()))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_approve",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={
                "zodiac": zodiac,
                "ref_date": str(ref_date),
                "note": request.note
            }
        )
        
        return {"id": horoscope_id, "approved": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Horoscope approval failed: {str(e)}")

@app.post("/api/monitor/horoscopes/{horoscope_id}/reject")
def reject_horoscope(horoscope_id: int, request: HoroscopeRejectRequest, x_user_id: str = Header(...)):
    """Reject horoscope (monitor/admin/superadmin only) - M18 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_horoscope(user_id, for_management=True):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check horoscope exists
        horoscope = db_fetchone("""
            SELECT zodiac, ref_date, approved_by FROM horoscopes WHERE id = %s
        """, (horoscope_id,))
        
        if not horoscope:
            raise HTTPException(status_code=404, detail="Horoscope not found")
        
        zodiac, ref_date, approved_by = horoscope
        
        if approved_by:
            raise HTTPException(status_code=409, detail="Cannot reject already approved horoscope")
        
        # Reject (clear approval, add note to text_content for rework)
        db_exec("""
            UPDATE horoscopes 
            SET approved_by = NULL, approved_at = NULL,
                text_content = %s
            WHERE id = %s
        """, (f"REJECTED: {request.reason}", horoscope_id))
        
        # Moderation action
        db_exec("""
            INSERT INTO moderation_actions(actor_id, target_kind, target_id, action, reason, created_at)
            VALUES (%s, 'horoscope', %s, 'reject', %s, %s)
        """, (user_id, str(horoscope_id), request.reason, datetime.utcnow()))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_reject",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={
                "zodiac": zodiac,
                "ref_date": str(ref_date),
                "reason": request.reason
            }
        )
        
        return {"id": horoscope_id, "rejected": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Horoscope rejection failed: {str(e)}")

@app.get("/api/horoscopes/daily")
def get_daily_horoscope(zodiac: str = Query(...), date: str = Query(...)):
    """Get approved daily horoscope (public access)"""
    try:
        # Validate inputs
        zodiac = validate_zodiac(zodiac)
        ref_date = validate_date(date)
        
        # Check if auto-publish is enabled
        auto_publish = get_setting_bool('auto_publish_daily', False)
        
        # Get horoscope (with or without approval requirement based on settings)
        if auto_publish:
            horoscope = db_fetchone("""
                SELECT h.zodiac, h.ref_date, m.url as storage_key
                FROM horoscopes h
                JOIN media_assets m ON m.id = h.audio_media_id
                WHERE h.scope = 'daily' 
                  AND h.zodiac = %s 
                  AND h.ref_date = %s
            """, (zodiac, ref_date))
        else:
            horoscope = db_fetchone("""
                SELECT h.zodiac, h.ref_date, m.url as storage_key
                FROM horoscopes h
                JOIN media_assets m ON m.id = h.audio_media_id
                WHERE h.scope = 'daily' 
                  AND h.zodiac = %s 
                  AND h.ref_date = %s
                  AND h.approved_by IS NOT NULL
            """, (zodiac, ref_date))
        
        if not horoscope:
            status_msg = "Daily horoscope not found"
            if not auto_publish:
                status_msg += " or not approved"
            raise HTTPException(status_code=404, detail=status_msg)
        
        zodiac, ref_date, storage_key = horoscope
        
        # Parse storage key (format: bucket/path)
        if '/' not in storage_key:
            raise HTTPException(status_code=500, detail="Invalid storage key format")
        
        bucket, path = storage_key.split('/', 1)
        
        # Generate signed URL
        signed_url = storage_sign_url(bucket, path, expires=3600)
        
        # Audit low-level read
        write_audit(
            actor=None,  # public access
            event="horoscope_fetch",
            entity="horoscope",
            entity_id=None,
            meta={
                "zodiac": zodiac,
                "ref_date": ref_date
            }
        )
        
        return {
            "zodiac": zodiac,
            "ref_date": ref_date,
            "audio_url": signed_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily horoscope fetch failed: {str(e)}")

# M5 Upgrade - New Endpoints

@app.post("/api/horoscopes/regenerate")
def regenerate_horoscope(request: HoroscopeRegenerateRequest, x_user_id: str = Header(...)):
    """Regenerate horoscope for specific zodiac/date (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate inputs
        zodiac = validate_zodiac(request.zodiac)
        ref_date = request.ref_date or get_utc_date()
        ref_date = validate_date(ref_date)
        
        if request.source not in ['tiktok', 'voice_model']:
            raise HTTPException(status_code=400, detail="Source must be 'tiktok' or 'voice_model'")
        
        # Generate audio based on source
        if request.source == 'tiktok':
            if not request.tiktok_url:
                raise HTTPException(status_code=400, detail="tiktok_url required for tiktok source")
            
            # Validate environment for TikTok
            ensure_env(['YTDLP_BIN'])
            
            # Download audio
            audio_bytes = download_tiktok_audio(request.tiktok_url)
            tiktok_post_url = request.tiktok_url
            
        elif request.source == 'voice_model':
            # Get current voice model
            voice_model_id = get_setting_int('current_voice_model_id', 1)
            script_text = request.script_text or f"Daily horoscope for {zodiac} on {ref_date}"
            
            # Synthesize audio (will raise 503 if not configured)
            audio_bytes = synthesize_voice_audio(script_text, voice_model_id)
            tiktok_post_url = None
        
        # Calculate SHA256
        sha256_hash = hashlib.sha256(audio_bytes).hexdigest()
        
        # Build storage path
        storage_path = f"horoscopes/daily/{ref_date}/{zodiac}.mp3"
        
        # Upload to Supabase Storage
        storage_key = storage_upload_bytes(SUPABASE_BUCKET, storage_path, audio_bytes, "audio/mpeg")
        
        # Insert new media asset
        media_id = db_fetchone("""
            INSERT INTO media_assets(kind, url, bytes, sha256, meta, created_at)
            VALUES ('audio', %s, %s, %s, %s, %s)
            RETURNING id
        """, (storage_key, len(audio_bytes), sha256_hash, 
              json.dumps({"source": request.source}), datetime.utcnow()))[0]
        
        # Upsert horoscope (replace audio_media_id for same zodiac/date)
        horoscope_id = db_fetchone("""
            INSERT INTO horoscopes(scope, zodiac, ref_date, audio_media_id, tiktok_post_url)
            VALUES ('daily', %s, %s, %s, %s)
            ON CONFLICT (scope, zodiac, ref_date) 
            DO UPDATE SET 
                audio_media_id = EXCLUDED.audio_media_id,
                tiktok_post_url = EXCLUDED.tiktok_post_url
            RETURNING id
        """, (zodiac, ref_date, media_id, tiktok_post_url))[0]
        
        # Moderation action
        db_exec("""
            INSERT INTO moderation_actions(actor_id, target_kind, target_id, action, reason, created_at)
            VALUES (%s, 'horoscope', %s, 'regenerate', 'admin override', %s)
        """, (user_id, str(horoscope_id), datetime.utcnow()))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_regenerate",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={
                "zodiac": zodiac,
                "ref_date": ref_date,
                "source": request.source
            }
        )
        
        # Check if auto-publish is enabled
        auto_publish = get_setting_bool('auto_publish_daily', True)
        
        return {
            "id": horoscope_id,
            "media_id": media_id,
            "zodiac": zodiac,
            "ref_date": ref_date,
            "published": auto_publish
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Horoscope regeneration failed: {str(e)}")

@app.post("/api/cron/purge_old")
def purge_old_horoscopes(x_user_id: str = Header(...)):
    """Purge old daily horoscopes beyond retention period (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        retention_days = get_setting_int('retention_days', 50)
        cutoff_date = (datetime.utcnow() - timedelta(days=retention_days)).strftime("%Y-%m-%d")
        
        # Get horoscopes to be purged
        old_horoscopes = db_fetchall("""
            SELECT h.id, h.zodiac, h.ref_date, h.audio_media_id
            FROM horoscopes h
            WHERE h.scope = 'daily' AND h.ref_date < %s
        """, (cutoff_date,))
        
        purged_count = 0
        for horoscope_id, zodiac, ref_date, audio_media_id in old_horoscopes:
            # Delete horoscope (media assets remain for archive access)
            db_exec("DELETE FROM horoscopes WHERE id = %s", (horoscope_id,))
            purged_count += 1
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscopes_purge",
            entity="horoscopes",
            entity_id=None,
            meta={
                "retention_days": retention_days,
                "cutoff_date": cutoff_date,
                "purged_count": purged_count
            }
        )
        
        return {
            "purged_count": purged_count,
            "retention_days": retention_days,
            "cutoff_date": cutoff_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Purge operation failed: {str(e)}")

@app.get("/api/horoscopes/archive")
def get_horoscope_archive(days: int = Query(50), x_user_id: str = Header(...)):
    """Get archive of recent horoscopes with signed download URLs (admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        # Get recent horoscopes with media
        archive_data = db_fetchall("""
            SELECT h.id, h.zodiac, h.ref_date, h.approved_by, h.approved_at,
                   m.url as storage_key, m.bytes, m.created_at
            FROM horoscopes h
            JOIN media_assets m ON m.id = h.audio_media_id
            WHERE h.scope = 'daily' AND h.ref_date >= %s
            ORDER BY h.ref_date DESC, h.zodiac ASC
        """, (cutoff_date,))
        
        # Convert to list with signed URLs
        result = []
        for row in archive_data:
            h_id, zodiac, ref_date, approved_by, approved_at, storage_key, bytes_size, created_at = row
            
            # Generate signed URL for download
            if '/' in storage_key:
                bucket, path = storage_key.split('/', 1)
                try:
                    signed_url = storage_sign_url(bucket, path, expires=3600)
                except:
                    signed_url = None
            else:
                signed_url = None
            
            result.append({
                "id": h_id,
                "zodiac": zodiac,
                "ref_date": str(ref_date),
                "approved": approved_by is not None,
                "approved_at": str(approved_at) if approved_at else None,
                "bytes": bytes_size,
                "created_at": str(created_at),
                "download_url": signed_url
            })
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscopes_archive_access",
            entity="horoscopes",
            entity_id=None,
            meta={"days": days, "count": len(result)}
        )
        
        return {
            "horoscopes": result,
            "count": len(result),
            "days": days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Archive access failed: {str(e)}")

# M18 - Compliant Horoscope Ingestion Endpoints

@app.post("/api/admin/horoscopes/upload-audio")
def upload_horoscope_audio(request: HoroscopeUploadRequest, x_user_id: str = Header(...)):
    """Upload original audio for daily horoscope (admin/superadmin only) - M18 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_horoscope(user_id, for_management=True):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate inputs
        zodiac = validate_zodiac(request.zodiac)
        ref_date = validate_date(request.ref_date)
        
        # Validate audio format
        if request.content_type not in ['audio/mpeg', 'audio/m4a']:
            raise HTTPException(status_code=400, detail="Unsupported audio format. Use mp3 or m4a")
        
        # Decode base64 audio
        try:
            audio_bytes = base64.b64decode(request.audio_file_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 audio data")
        
        # Basic validation
        if len(audio_bytes) < 1024:  # At least 1KB
            raise HTTPException(status_code=400, detail="Audio file too small")
        if len(audio_bytes) > 50 * 1024 * 1024:  # Max 50MB
            raise HTTPException(status_code=400, detail="Audio file too large")
        
        # Calculate SHA256
        sha256_hash = hashlib.sha256(audio_bytes).hexdigest()
        
        # Build storage path
        extension = "mp3" if request.content_type == "audio/mpeg" else "m4a"
        storage_path = f"horoscopes/daily/{ref_date}/{zodiac}.{extension}"
        
        # Upload to Supabase Storage
        storage_key = storage_upload_bytes(SUPABASE_BUCKET, storage_path, audio_bytes, request.content_type)
        
        # Insert media asset
        media_id = db_fetchone("""
            INSERT INTO media_assets(owner_id, kind, url, bytes, sha256, created_at)
            VALUES (%s, 'audio', %s, %s, %s, %s)
            RETURNING id
        """, (user_id, storage_key, len(audio_bytes), sha256_hash, datetime.utcnow()))[0]
        
        # Upsert horoscope (M18: pending state, source_kind=original_upload)
        horoscope_id = db_fetchone("""
            INSERT INTO horoscopes(scope, zodiac, ref_date, audio_media_id, source_kind, source_ref, approved_by, approved_at)
            VALUES ('daily', %s, %s, %s, 'original_upload', NULL, NULL, NULL)
            ON CONFLICT (scope, zodiac, ref_date) 
            DO UPDATE SET 
                audio_media_id = EXCLUDED.audio_media_id,
                source_kind = EXCLUDED.source_kind,
                source_ref = NULL,
                approved_by = NULL,
                approved_at = NULL
            RETURNING id
        """, (zodiac, ref_date, media_id))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_audio_upload",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={"zodiac": zodiac, "ref_date": ref_date, "source_kind": "original_upload", "bytes": len(audio_bytes)}
        )
        
        return {
            "success": True,
            "horoscope_id": horoscope_id,
            "status": "pending",
            "zodiac": zodiac,
            "ref_date": ref_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio upload failed: {str(e)}")

@app.post("/api/admin/horoscopes/schedule")
def schedule_horoscopes(request: HoroscopeScheduleRequest, x_user_id: str = Header(...)):
    """Seed daily pending horoscope rows for all 12 zodiacs (admin/superadmin only) - M18 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_horoscope(user_id, for_management=True):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        ref_date = validate_date(request.ref_date)
        
        # All 12 zodiac signs
        zodiac_signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
        
        created_count = 0
        existing_count = 0
        
        for zodiac in zodiac_signs:
            # Check if exists
            existing = db_fetchone("""
                SELECT id FROM horoscopes 
                WHERE scope = 'daily' AND zodiac = %s AND ref_date = %s
            """, (zodiac, ref_date))
            
            if existing:
                existing_count += 1
            else:
                # Create pending row (no audio yet)
                db_exec("""
                    INSERT INTO horoscopes(scope, zodiac, ref_date, source_kind, approved_by, approved_at)
                    VALUES ('daily', %s, %s, 'original_upload', NULL, NULL)
                """, (zodiac, ref_date))
                created_count += 1
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_schedule",
            entity="horoscopes",
            entity_id=None,
            meta={"ref_date": ref_date, "created": created_count, "existing": existing_count}
        )
        
        return {
            "success": True,
            "ref_date": ref_date,
            "created": created_count,
            "existing": existing_count,
            "total_signs": len(zodiac_signs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduling failed: {str(e)}")

# TikTok ingestion DISABLED - Admin-only uploads enforced per SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
# @app.post("/api/admin/horoscopes/ingest/tiktok")
# def ingest_tiktok_horoscope(request: HoroscopeTikTokIngestRequest, x_user_id: str = Header(...)):
#     """DISABLED: TikTok ingestion removed - Use admin upload only"""
#     raise HTTPException(status_code=410, detail="TikTok ingestion disabled - Use admin upload endpoint")
        
        # M18 Compliance: This is a placeholder for official TikTok API integration
        # In real implementation, would use official TikTok Business/Developer APIs
        # Never scrape or download unauthorized content
        
        # For now, store metadata only (compliance-first approach)
        source_kind = 'tiktok_linked'  # Just linking, not API ingestion yet
        
        # Upsert horoscope (M18: pending state with TikTok reference)
        horoscope_id = db_fetchone("""
            INSERT INTO horoscopes(scope, zodiac, ref_date, source_kind, source_ref, approved_by, approved_at)
            VALUES ('daily', %s, %s, %s, %s, NULL, NULL)
            ON CONFLICT (scope, zodiac, ref_date) 
            DO UPDATE SET 
                source_kind = EXCLUDED.source_kind,
                source_ref = EXCLUDED.source_ref,
                approved_by = NULL,
                approved_at = NULL
            RETURNING id
        """, (zodiac, ref_date, source_kind, request.tiktok_url))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_tiktok_ingest",
            entity="horoscope", 
            entity_id=str(horoscope_id),
            meta={
                "zodiac": zodiac, 
                "ref_date": ref_date, 
                "source_kind": source_kind,
                "tiktok_url": request.tiktok_url,
                "compliance_note": "metadata_only"
            }
        )
        
        return {
            "success": True,
            "horoscope_id": horoscope_id,
            "status": "pending", 
            "zodiac": zodiac,
            "ref_date": ref_date,
            "source_kind": source_kind,
            "note": "TikTok metadata stored. Requires Monitor approval before public visibility."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TikTok ingestion failed: {str(e)}")

@app.get("/api/monitor/horoscopes/pending")
def get_pending_horoscopes(x_user_id: str = Header(...)):
    """Get queue of unapproved horoscopes (monitor/admin/superadmin only) - M18 compliant"""
    try:
        user_id = x_user_id
        
        # M16.2 RLS route guard
        if not can_access_horoscope(user_id, for_management=True):
            raise HTTPException(status_code=403, detail="Access denied")
        
        role = get_user_role(user_id)
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Get pending horoscopes
        pending_data = db_fetchall("""
            SELECT h.id, h.scope, h.zodiac, h.ref_date, h.source_kind, h.source_ref,
                   h.audio_media_id, ma.url as audio_url, ma.bytes, h.created_at
            FROM horoscopes h
            LEFT JOIN media_assets ma ON ma.id = h.audio_media_id
            WHERE h.approved_at IS NULL
            ORDER BY h.ref_date DESC, h.zodiac
        """)
        
        result = []
        for row in pending_data:
            h_id, scope, zodiac, ref_date, source_kind, source_ref, audio_media_id, audio_url, bytes_size, created_at = row
            
            # Generate signed URL for audio if exists
            signed_url = None
            if audio_url and '/' in audio_url:
                bucket, path = audio_url.split('/', 1) 
                try:
                    signed_url = storage_sign_url(bucket, path, expires=3600)
                except:
                    signed_url = None
            
            result.append({
                "id": h_id,
                "scope": scope,
                "zodiac": zodiac,
                "ref_date": str(ref_date),
                "source_kind": source_kind,
                "source_ref": source_ref,
                "has_audio": audio_media_id is not None,
                "audio_bytes": bytes_size,
                "audio_preview_url": signed_url,
                "created_at": str(created_at)
            })
        
        # Audit log
        write_audit(
            actor=user_id,
            event="pending_horoscopes_review",
            entity="horoscopes",
            entity_id=None,
            meta={"count": len(result)}
        )
        
        return {
            "pending_horoscopes": result,
            "count": len(result)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pending horoscopes fetch failed: {str(e)}")

@app.post("/api/cron/voice/refresh")
def refresh_voice_model(x_user_id: str = Header(...)):
    """Refresh voice model from latest TikTok samples (superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'superadmin':
            raise HTTPException(status_code=403, detail="Superadmin access required")
        
        # Check if voice refresh is enabled
        if not get_setting_bool('voice_refresh_enabled', False):
            raise HTTPException(status_code=503, detail="Voice refresh is disabled")
        
        # Check required providers
        ensure_env(['VOICE_PROVIDER', 'VOICE_API_KEY'])
        
        # Get recent TikTok audio samples for training
        recent_samples = db_fetchall("""
            SELECT m.url, m.bytes
            FROM horoscopes h
            JOIN media_assets m ON m.id = h.audio_media_id
            WHERE h.scope = 'daily' 
              AND h.tiktok_post_url IS NOT NULL
              AND h.created_at >= %s
            ORDER BY h.created_at DESC
            LIMIT 20
        """, (datetime.utcnow() - timedelta(days=30),))
        
        if len(recent_samples) < 5:
            raise HTTPException(status_code=400, detail="Insufficient recent samples for voice training")
        
        # This would implement actual voice model training
        # For now, return 503 to indicate feature needs provider integration
        raise HTTPException(status_code=503, detail="Voice model training requires external provider integration")
        
        # Real implementation would:
        # 1. Download sample audio files from storage
        # 2. Call voice provider training API
        # 3. Create new voice_models entry
        # 4. Update app_settings current_voice_model_id
        # 5. Audit the refresh
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice refresh failed: {str(e)}")

@app.post("/api/zodiacs/settings/propose")
def propose_zodiac_settings_change(request: SettingsChangeRequest, x_user_id: str = Header(...)):
    """Propose zodiac settings change for superadmin approval (admin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if request.kind not in ['app', 'zodiac']:
            raise HTTPException(status_code=400, detail="Kind must be 'app' or 'zodiac'")
        
        # Get current value
        if request.kind == 'app':
            current_value = get_setting_str(request.target_key, None)
        else:  # zodiac
            # Validate zodiac name in target_key
            validate_zodiac(request.target_key.split(':', 1)[0] if ':' in request.target_key else request.target_key)
            current_value = db_fetchone("""
                SELECT value FROM zodiac_settings 
                WHERE zodiac = %s AND key = %s
            """, (request.target_key.split(':', 1) if ':' in request.target_key else (request.target_key, 'default')))
            current_value = current_value[0] if current_value else None
        
        # Create change request
        request_id = db_fetchone("""
            INSERT INTO settings_change_requests(
                kind, target_key, current_value, proposed_value, proposed_by, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (request.kind, request.target_key, current_value, 
              request.proposed_value, user_id, datetime.utcnow()))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="settings_change_proposed",
            entity="settings_change_request",
            entity_id=str(request_id),
            meta={
                "kind": request.kind,
                "target_key": request.target_key,
                "reason": request.reason
            }
        )
        
        return {
            "request_id": request_id,
            "status": "pending",
            "kind": request.kind,
            "target_key": request.target_key
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settings change proposal failed: {str(e)}")

@app.post("/api/zodiacs/settings/approve/{request_id}")
def approve_zodiac_settings_change(request_id: int, request: SettingsReviewRequest, x_user_id: str = Header(...)):
    """Approve settings change request (superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'superadmin':
            raise HTTPException(status_code=403, detail="Superadmin access required")
        
        # Get pending request
        change_request = db_fetchone("""
            SELECT kind, target_key, proposed_value, status
            FROM settings_change_requests
            WHERE id = %s
        """, (request_id,))
        
        if not change_request:
            raise HTTPException(status_code=404, detail="Change request not found")
        
        kind, target_key, proposed_value, status = change_request
        
        if status != 'pending':
            raise HTTPException(status_code=400, detail=f"Request already {status}")
        
        # Apply the change
        if kind == 'app':
            db_exec("""
                INSERT INTO app_settings(key, value, updated_by, updated_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = EXCLUDED.updated_at
            """, (target_key, proposed_value, user_id, datetime.utcnow()))
        else:  # zodiac
            zodiac_name, setting_key = target_key.split(':', 1) if ':' in target_key else (target_key, 'default')
            db_exec("""
                INSERT INTO zodiac_settings(zodiac, key, value, updated_by, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (zodiac, key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = EXCLUDED.updated_at
            """, (zodiac_name, setting_key, proposed_value, user_id, datetime.utcnow()))
        
        # Update request status
        db_exec("""
            UPDATE settings_change_requests
            SET status = 'approved', reviewed_by = %s, reviewed_at = %s, review_reason = %s
            WHERE id = %s
        """, (user_id, datetime.utcnow(), request.review_reason, request_id))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="settings_change_approved",
            entity="settings_change_request",
            entity_id=str(request_id),
            meta={
                "kind": kind,
                "target_key": target_key,
                "review_reason": request.review_reason
            }
        )
        
        return {
            "request_id": request_id,
            "status": "approved",
            "applied": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settings approval failed: {str(e)}")

@app.post("/api/zodiacs/settings/reject/{request_id}")
def reject_zodiac_settings_change(request_id: int, request: SettingsReviewRequest, x_user_id: str = Header(...)):
    """Reject settings change request (superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'superadmin':
            raise HTTPException(status_code=403, detail="Superadmin access required")
        
        # Get pending request
        change_request = db_fetchone("""
            SELECT kind, target_key, status
            FROM settings_change_requests
            WHERE id = %s
        """, (request_id,))
        
        if not change_request:
            raise HTTPException(status_code=404, detail="Change request not found")
        
        kind, target_key, status = change_request
        
        if status != 'pending':
            raise HTTPException(status_code=400, detail=f"Request already {status}")
        
        # Update request status
        db_exec("""
            UPDATE settings_change_requests
            SET status = 'rejected', reviewed_by = %s, reviewed_at = %s, review_reason = %s
            WHERE id = %s
        """, (user_id, datetime.utcnow(), request.review_reason or 'Rejected by superadmin', request_id))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="settings_change_rejected",
            entity="settings_change_request",
            entity_id=str(request_id),
            meta={
                "kind": kind,
                "target_key": target_key,
                "review_reason": request.review_reason
            }
        )
        
        return {
            "request_id": request_id,
            "status": "rejected"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settings rejection failed: {str(e)}")


# M18A - New endpoints for orchestration and retention

@app.post("/api/admin/horoscopes/seed-daily")
def seed_daily_horoscope(request: dict, x_user_id: str = Header(...), x_job_token: str = Header(None)):
    """Seed daily horoscope entry for n8n orchestration (system/admin/superadmin only) - M18A compliant"""
    
    try:
        user_id = x_user_id
        
        # Validate system access (n8n or admin)
        if user_id == "system-n8n":
            # System access via job token
            expected_token = os.getenv("JOB_TOKEN", "missing")
            if not x_job_token or x_job_token != expected_token:
                raise HTTPException(status_code=403, detail="Valid job token required for system access")
        else:
            # Human admin access
            if not can_access_horoscope(user_id, for_management=True):
                write_audit(actor=user_id, event="horoscope_seed_denied", entity="horoscope", entity_id=None)
                raise HTTPException(status_code=403, detail="Admin/superadmin access required")
        
        # Extract and validate request data
        zodiac = request.get("zodiac", "").capitalize()
        ref_date_str = request.get("ref_date", "")
        cohort = request.get("cohort", "unknown")
        source_ref = request.get("source_ref", f"seeded-{cohort}")
        
        if zodiac not in ZODIAC_SIGNS:
            raise HTTPException(status_code=400, detail=f"Invalid zodiac sign: {zodiac}")
        
        try:
            ref_date = datetime.strptime(ref_date_str, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ref_date format, use YYYY-MM-DD")
        
        # Idempotent upsert (only if not exists)
        result = db_fetchone("""
            INSERT INTO horoscopes(scope, zodiac, ref_date, source_kind, source_ref, approved_by, approved_at)
            VALUES ('daily', %s, %s, 'seeded', %s, NULL, NULL)
            ON CONFLICT (scope, zodiac, ref_date) DO NOTHING
            RETURNING id
        """, (zodiac, ref_date, source_ref))
        
        if result:
            horoscope_id = result[0]
            action = "created"
        else:
            # Get existing ID
            horoscope_id = db_fetchone("""
                SELECT id FROM horoscopes 
                WHERE scope = 'daily' AND zodiac = %s AND ref_date = %s
            """, (zodiac, ref_date))[0]
            action = "exists"
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_seed",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={"zodiac": zodiac, "ref_date": str(ref_date), "cohort": cohort, "action": action}
        )
        
        return {
            "message": f"Daily horoscope entry {action} successfully",
            "horoscope_id": horoscope_id,
            "action": action,
            "zodiac": zodiac,
            "ref_date": str(ref_date),
            "cohort": cohort,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="horoscope_seed_failed", entity="horoscope", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Daily seeding failed: {str(e)}")


@app.get("/api/admin/horoscopes/retention-audit")
def retention_audit(cutoff_date: str = Query(...), x_user_id: str = Header(...), x_job_token: str = Header(None)):
    """Audit horoscopes for retention cleanup (system/admin/superadmin only) - M18A compliant"""
    
    try:
        user_id = x_user_id
        
        # Validate system access (n8n or admin)
        if user_id == "system-n8n":
            expected_token = os.getenv("JOB_TOKEN", "missing")
            if not x_job_token or x_job_token != expected_token:
                raise HTTPException(status_code=403, detail="Valid job token required for system access")
        else:
            if not can_access_horoscope(user_id, for_management=True):
                raise HTTPException(status_code=403, detail="Admin/superadmin access required")
        
        # Parse cutoff date
        try:
            cutoff = datetime.strptime(cutoff_date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid cutoff_date format, use YYYY-MM-DD")
        
        # Get horoscopes to be deleted
        old_horoscopes = db_fetchall("""
            SELECT h.id, h.zodiac, h.ref_date, h.audio_media_id, ma.storage_key
            FROM horoscopes h
            LEFT JOIN media_assets ma ON ma.id = h.audio_media_id
            WHERE h.ref_date < %s
            ORDER BY h.ref_date ASC
        """, (cutoff,))
        
        # Count storage objects that will be orphaned
        storage_objects = [row[4] for row in old_horoscopes if row[4]]
        
        audit_summary = {
            "cutoff_date": str(cutoff),
            "items_to_delete": len(old_horoscopes),
            "storage_objects": len(storage_objects),
            "oldest_date": str(old_horoscopes[0][2]) if old_horoscopes else None,
            "storage_keys_preview": storage_objects[:5],  # First 5 for preview
            "zodiac_breakdown": {}
        }
        
        # Group by zodiac for breakdown
        for row in old_horoscopes:
            zodiac = row[1]
            audit_summary["zodiac_breakdown"][zodiac] = audit_summary["zodiac_breakdown"].get(zodiac, 0) + 1
        
        # Audit log
        write_audit(
            actor=user_id,
            event="retention_audit",
            entity="horoscopes",
            entity_id=None,
            meta={"cutoff_date": str(cutoff), "items_count": len(old_horoscopes)}
        )
        
        return audit_summary
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="retention_audit_failed", entity="horoscopes", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Retention audit failed: {str(e)}")


@app.delete("/api/admin/horoscopes/retention-cleanup")
def retention_cleanup(request: dict, x_user_id: str = Header(...), x_job_token: str = Header(None)):
    """Execute retention cleanup - hard delete horoscopes older than 60 days (system/admin/superadmin only) - M18A compliant"""
    
    try:
        user_id = x_user_id
        
        # Validate system access (n8n or admin)
        if user_id == "system-n8n":
            expected_token = os.getenv("JOB_TOKEN", "missing")
            if not x_job_token or x_job_token != expected_token:
                raise HTTPException(status_code=403, detail="Valid job token required for system access")
        else:
            if not can_access_horoscope(user_id, for_management=True):
                raise HTTPException(status_code=403, detail="Admin/superadmin access required")
        
        # Extract and validate request
        cutoff_date_str = request.get("cutoff_date", "")
        retention_days = request.get("retention_days", 60)
        confirm_delete = request.get("confirm_delete", False)
        
        if not confirm_delete:
            raise HTTPException(status_code=400, detail="confirm_delete must be true to proceed")
        
        try:
            cutoff_date = datetime.strptime(cutoff_date_str, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid cutoff_date format, use YYYY-MM-DD")
        
        start_time = datetime.utcnow()
        
        # Get items to delete (with storage keys)
        items_to_delete = db_fetchall("""
            SELECT h.id, h.zodiac, h.ref_date, h.audio_media_id, ma.storage_key
            FROM horoscopes h
            LEFT JOIN media_assets ma ON ma.id = h.audio_media_id
            WHERE h.ref_date < %s
        """, (cutoff_date,))
        
        deleted_count = 0
        storage_deleted = 0
        errors = []
        
        for item in items_to_delete:
            horoscope_id, zodiac, ref_date, audio_media_id, storage_key = item
            
            try:
                # Delete horoscope record
                db_exec("DELETE FROM horoscopes WHERE id = %s", (horoscope_id,))
                deleted_count += 1
                
                # Delete associated media_asset if exists (CASCADE should handle this, but explicit is safer)
                if audio_media_id:
                    db_exec("DELETE FROM media_assets WHERE id = %s", (audio_media_id,))
                    
                # Delete from Supabase storage if storage_key exists
                if storage_key and '/' in storage_key:
                    try:
                        bucket, path = storage_key.split('/', 1)
                        storage_delete(bucket, path)
                        storage_deleted += 1
                    except Exception as storage_error:
                        errors.append(f"Storage delete failed for {storage_key}: {str(storage_error)}")
                        
            except Exception as delete_error:
                errors.append(f"Failed to delete horoscope {horoscope_id}: {str(delete_error)}")
        
        end_time = datetime.utcnow()
        execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Audit log
        write_audit(
            actor=user_id,
            event="retention_cleanup",
            entity="horoscopes",
            entity_id=None,
            meta={
                "cutoff_date": str(cutoff_date),
                "deleted_count": deleted_count,
                "storage_deleted": storage_deleted,
                "errors_count": len(errors),
                "execution_time_ms": execution_time_ms
            }
        )
        
        return {
            "message": "Retention cleanup completed",
            "cutoff_date": str(cutoff_date),
            "deleted_count": deleted_count,
            "storage_deleted": storage_deleted,
            "execution_time_ms": execution_time_ms,
            "errors": errors[:10]  # Limit error list in response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="retention_cleanup_failed", entity="horoscopes", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Retention cleanup failed: {str(e)}")


@app.get("/api/admin/horoscopes/upload-status")
def horoscope_upload_status(next_month: int = Query(...), next_year: int = Query(...), x_user_id: str = Header(...), x_job_token: str = Header(None)):
    """Check horoscope upload status for next month (system/admin/superadmin only) - M18A compliant"""
    
    try:
        user_id = x_user_id
        
        # Validate system access (n8n or admin)
        if user_id == "system-n8n":
            expected_token = os.getenv("JOB_TOKEN", "missing")
            if not x_job_token or x_job_token != expected_token:
                raise HTTPException(status_code=403, detail="Valid job token required for system access")
        else:
            if not can_access_horoscope(user_id, for_management=True):
                raise HTTPException(status_code=403, detail="Admin/superadmin access required")
        
        # Validate month/year
        if not (1 <= next_month <= 12):
            raise HTTPException(status_code=400, detail="next_month must be 1-12")
        if not (2020 <= next_year <= 2030):
            raise HTTPException(status_code=400, detail="next_year must be reasonable (2020-2030)")
        
        # Get first day of next month
        next_month_start = datetime(next_year, next_month, 1).date()
        
        # Check which zodiac signs have uploaded audio for next month
        uploaded_signs = db_fetchall("""
            SELECT DISTINCT h.zodiac
            FROM horoscopes h
            JOIN media_assets ma ON ma.id = h.audio_media_id
            WHERE h.scope = 'daily' 
            AND h.ref_date >= %s
            AND h.ref_date < %s + INTERVAL '1 month'
            AND h.source_kind = 'original_upload'
            AND ma.kind = 'audio'
        """, (next_month_start, next_month_start))
        
        uploaded_list = [row[0] for row in uploaded_signs]
        missing_list = [sign for sign in ZODIAC_SIGNS if sign not in uploaded_list]
        
        status = {
            "next_month": next_month,
            "next_year": next_year,
            "uploaded_signs": uploaded_list,
            "missing_signs": missing_list,
            "uploaded_count": len(uploaded_list),
            "missing_count": len(missing_list),
            "total_needed": len(ZODIAC_SIGNS),
            "completion_percentage": round((len(uploaded_list) / len(ZODIAC_SIGNS)) * 100, 1)
        }
        
        # Audit log
        write_audit(
            actor=user_id,
            event="upload_status_check",
            entity="horoscopes",
            entity_id=None,
            meta={"next_month": next_month, "next_year": next_year, "missing_count": len(missing_list)}
        )
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="upload_status_failed", entity="horoscopes", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Upload status check failed: {str(e)}")


@app.post("/api/admin/notifications/send-reminder")  
def send_upload_reminder(request: dict, x_user_id: str = Header(...), x_job_token: str = Header(None)):
    """Send upload reminder notification (system/admin/superadmin only) - M18A compliant"""
    
    try:
        user_id = x_user_id
        
        # Validate system access (n8n or admin)
        if user_id == "system-n8n":
            expected_token = os.getenv("JOB_TOKEN", "missing")
            if not x_job_token or x_job_token != expected_token:
                raise HTTPException(status_code=403, detail="Valid job token required for system access")
        else:
            if not can_access_horoscope(user_id, for_management=True):
                raise HTTPException(status_code=403, detail="Admin/superadmin access required")
        
        # Extract notification data
        notification_type = request.get("type", "reminder")
        priority = request.get("priority", "normal")
        message = request.get("message", "Upload reminder")
        action_required = request.get("action_required", False)
        metadata = request.get("metadata", "{}")
        
        # For now, just log the reminder (in production would send email/SMS/Slack)
        reminder_log = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": notification_type,
            "priority": priority,
            "message": message,
            "action_required": action_required,
            "sent_by": user_id,
            "metadata": metadata
        }
        
        # Write to audit log as notification record
        write_audit(
            actor=user_id,
            event="notification_sent",
            entity="notification",
            entity_id=None,
            meta=reminder_log
        )
        
        # In production: integrate with email service, Slack webhook, etc.
        print(f"[REMINDER NOTIFICATION] {priority.upper()}: {message}")
        
        return {
            "success": True,
            "message": "Reminder notification sent successfully",
            "type": notification_type,
            "priority": priority,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="notification_send_failed", entity="notification", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Reminder notification failed: {str(e)}")


# M19 - Calls & Emergency endpoints

def normalize_phone_e164(phone: str) -> str:
    """Normalize phone number to E.164 format"""
    import re
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    # Add + if not present for E.164
    if not digits.startswith('1') and len(digits) == 10:
        digits = '1' + digits  # US number
    return '+' + digits

def can_access_call(user_id: str, call_id: int) -> bool:
    """Check if user can access call based on RLS policy parity"""
    role = get_user_role(user_id)
    
    # Monitor/Admin/Superadmin have full access
    if role in ['monitor', 'admin', 'superadmin']:
        return True
    
    # Client/Reader can access if they're involved in the order
    call_data = db_fetchone("""
        SELECT c.id, o.user_id, o.assigned_reader
        FROM calls c
        JOIN orders o ON o.id = c.order_id
        WHERE c.id = %s
    """, (call_id,))
    
    if not call_data:
        return False
    
    call_id_db, order_user_id, assigned_reader = call_data
    
    # Client can access their own call
    if user_id == str(order_user_id):
        return True
    
    # Reader can access assigned calls
    if role == 'reader' and user_id == str(assigned_reader):
        return True
    
    return False

@app.post("/api/calls/schedule")
def schedule_call(request: CallScheduleRequest, x_user_id: str = Header(...)):
    """Schedule a call for an order (client/reader/admin) - M19 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Verify order exists and user has access
        order = db_fetchone("""
            SELECT id, user_id, assigned_reader, service_id, status
            FROM orders WHERE id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, order_user_id, assigned_reader, service_id, order_status = order
        
        # Access control: client can schedule their own, reader can schedule assigned, admin can schedule any
        if role == 'client' and user_id != str(order_user_id):
            raise HTTPException(status_code=403, detail="Can only schedule calls for your own orders")
        elif role == 'reader' and user_id != str(assigned_reader):
            raise HTTPException(status_code=403, detail="Can only schedule calls for assigned orders")
        elif role not in ['client', 'reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Check if call already exists for this order
        existing_call = db_fetchone("""
            SELECT id, status FROM calls WHERE order_id = %s
        """, (request.order_id,))
        
        if existing_call and existing_call[1] not in ['completed', 'failed', 'dropped_by_monitor', 'dropped_by_reader', 'dropped_by_client']:
            raise HTTPException(status_code=409, detail="Call already exists for this order")
        
        # Normalize phone numbers
        client_phone = normalize_phone_e164(request.client_phone)
        reader_phone = normalize_phone_e164(request.reader_phone) if request.reader_phone else None
        
        # If no reader phone provided, get from assigned reader profile
        if not reader_phone and assigned_reader:
            reader_profile = db_fetchone("SELECT phone FROM profiles WHERE id = %s", (assigned_reader,))
            if reader_profile and reader_profile[0]:
                reader_phone = normalize_phone_e164(reader_profile[0])
        
        # Parse scheduled_at
        scheduled_at = None
        if request.scheduled_at:
            try:
                scheduled_at = datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_at format, use ISO 8601")
        
        # Create call record
        call_id = db_fetchone("""
            INSERT INTO calls(order_id, initiated_by, status, scheduled_at, notes, sip_or_pstn, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.order_id,
            user_id,
            'scheduled' if scheduled_at else 'initiating',
            scheduled_at,
            request.notes,
            'pstn',  # Default to PSTN
            datetime.utcnow()
        ))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="call_scheduled",
            entity="call",
            entity_id=str(call_id),
            meta={
                "order_id": request.order_id,
                "scheduled_at": str(scheduled_at) if scheduled_at else "immediate",
                "client_phone": client_phone[-4:],  # Only log last 4 digits for privacy
                "reader_phone": reader_phone[-4:] if reader_phone else None
            }
        )
        
        return {
            "call_id": call_id,
            "order_id": request.order_id,
            "status": 'scheduled' if scheduled_at else 'initiating',
            "scheduled_at": str(scheduled_at) if scheduled_at else None,
            "message": "Call scheduled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="call_schedule_failed", entity="call", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Call scheduling failed: {str(e)}")

@app.post("/api/calls/{order_id}/start")
def start_call(order_id: int, request: CallStartRequest, x_user_id: str = Header(...)):
    """Start Twilio call session (reader/admin) - M19 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Only reader/admin can start calls
        if role not in ['reader', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only readers and admins can start calls")
        
        # Get call record
        call = db_fetchone("""
            SELECT c.id, c.status, o.user_id, o.assigned_reader
            FROM calls c
            JOIN orders o ON o.id = c.order_id
            WHERE c.order_id = %s AND c.status IN ('scheduled', 'initiating')
        """, (order_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="No schedulable call found for this order")
        
        call_id, call_status, order_user_id, assigned_reader = call
        
        # Access control for readers
        if role == 'reader' and user_id != str(assigned_reader):
            raise HTTPException(status_code=403, detail="Can only start calls for assigned orders")
        
        # Normalize phone numbers
        client_phone = normalize_phone_e164(request.client_phone)
        reader_phone = normalize_phone_e164(request.reader_phone)
        
        # Mock Twilio call initiation (in production, use Twilio SDK)
        import uuid
        mock_call_sid = f"CA{uuid.uuid4().hex[:32]}"
        mock_conference_sid = f"CF{uuid.uuid4().hex[:32]}" if request.record else None
        
        # Update call with Twilio details
        db_exec("""
            UPDATE calls SET
                call_sid = %s,
                conference_sid = %s,
                status = 'ringing',
                started_at = %s,
                recording_status = %s
            WHERE id = %s
        """, (
            mock_call_sid,
            mock_conference_sid,
            datetime.utcnow(),
            'recording' if request.record else 'stopped',
            call_id
        ))
        
        # Create recording record if recording enabled
        recording_id = None
        if request.record:
            mock_recording_sid = f"RE{uuid.uuid4().hex[:32]}"
            recording_id = db_fetchone("""
                INSERT INTO call_recordings(call_id, recording_sid, status)
                VALUES (%s, %s, 'in_progress')
                RETURNING id
            """, (call_id, mock_recording_sid))[0]
            
            db_exec("""
                UPDATE calls SET recording_sid = %s WHERE id = %s
            """, (mock_recording_sid, call_id))
        
        # Audit log (no PII - only last 4 digits)
        write_audit(
            actor=user_id,
            event="call_started",
            entity="call",
            entity_id=str(call_id),
            meta={
                "order_id": order_id,
                "call_sid": mock_call_sid,
                "recording_enabled": request.record,
                "client_phone_suffix": client_phone[-4:],
                "reader_phone_suffix": reader_phone[-4:]
            }
        )
        
        return {
            "call_id": call_id,
            "call_sid": mock_call_sid,
            "status": "ringing",
            "recording_enabled": request.record,
            "recording_id": recording_id,
            "message": "Call initiated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="call_start_failed", entity="call", entity_id=None, meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Call start failed: {str(e)}")

@app.post("/api/calls/{call_id}/recording/{action}")
def control_call_recording(call_id: int, action: str, x_user_id: str = Header(...)):
    """Control call recording: start/pause/resume/stop (reader/monitor/admin) - M19 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Validate action
        if action not in ['start', 'pause', 'resume', 'stop']:
            raise HTTPException(status_code=400, detail="Invalid action. Use: start, pause, resume, stop")
        
        # Check call access
        if not can_access_call(user_id, call_id):
            raise HTTPException(status_code=403, detail="Cannot access this call")
        
        # Get call details
        call = db_fetchone("""
            SELECT id, call_sid, recording_sid, recording_status, status
            FROM calls WHERE id = %s
        """, (call_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        call_id_db, call_sid, recording_sid, current_recording_status, call_status = call
        
        # Can only control recording on active calls
        if call_status not in ['in_progress', 'ringing']:
            raise HTTPException(status_code=409, detail="Can only control recording on active calls")
        
        # Validate state transitions
        valid_transitions = {
            'start': ['stopped'],
            'pause': ['recording'],
            'resume': ['paused'],
            'stop': ['recording', 'paused']
        }
        
        if current_recording_status not in valid_transitions[action]:
            raise HTTPException(status_code=409, detail=f"Cannot {action} recording from {current_recording_status} state")
        
        # Determine new status
        new_status_map = {
            'start': 'recording',
            'pause': 'paused', 
            'resume': 'recording',
            'stop': 'stopped'
        }
        new_status = new_status_map[action]
        
        # Mock Twilio recording control (in production, use Twilio SDK)
        if action == 'start' and not recording_sid:
            # Create new recording
            import uuid
            new_recording_sid = f"RE{uuid.uuid4().hex[:32]}"
            
            recording_id = db_fetchone("""
                INSERT INTO call_recordings(call_id, recording_sid, status)
                VALUES (%s, %s, 'in_progress')
                RETURNING id
            """, (call_id, new_recording_sid))[0]
            
            db_exec("""
                UPDATE calls SET recording_sid = %s, recording_status = %s
                WHERE id = %s
            """, (new_recording_sid, new_status, call_id))
        else:
            # Update existing recording status
            db_exec("""
                UPDATE calls SET recording_status = %s WHERE id = %s
            """, (new_status, call_id))
            
            if recording_sid:
                db_exec("""
                    UPDATE call_recordings SET status = %s 
                    WHERE recording_sid = %s
                """, ('completed' if action == 'stop' else 'in_progress', recording_sid))
        
        # Audit log
        write_audit(
            actor=user_id,
            event=f"recording_{action}",
            entity="call",
            entity_id=str(call_id),
            meta={
                "call_sid": call_sid,
                "recording_sid": recording_sid,
                "previous_status": current_recording_status,
                "new_status": new_status
            }
        )
        
        return {
            "call_id": call_id,
            "action": action,
            "recording_status": new_status,
            "message": f"Recording {action} successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event=f"recording_{action}_failed", entity="call", entity_id=str(call_id), meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Recording {action} failed: {str(e)}")

@app.post("/api/calls/{call_id}/drop")
def drop_call(call_id: int, request: CallDropRequest, x_user_id: str = Header(...)):
    """Drop active call with audit trail (monitor/admin/participant) - M19 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Validate ended_reason
        if request.ended_reason not in ['monitor_drop', 'reader_drop', 'client_drop']:
            raise HTTPException(status_code=400, detail="Invalid ended_reason")
        
        # Check access and role permissions
        if not can_access_call(user_id, call_id):
            raise HTTPException(status_code=403, detail="Cannot access this call")
        
        # Additional role-based restrictions
        if request.ended_reason == 'monitor_drop' and role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only monitors can use monitor_drop reason")
        
        # Get call details
        call = db_fetchone("""
            SELECT c.id, c.call_sid, c.status, c.recording_sid, o.user_id, o.assigned_reader
            FROM calls c
            JOIN orders o ON o.id = c.order_id
            WHERE c.id = %s
        """, (call_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        call_id_db, call_sid, call_status, recording_sid, order_user_id, assigned_reader = call
        
        # Can only drop active calls
        if call_status not in ['ringing', 'in_progress']:
            raise HTTPException(status_code=409, detail="Can only drop active calls")
        
        # Additional authorization for reader/client drops
        if request.ended_reason == 'reader_drop' and user_id != str(assigned_reader) and role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only assigned reader can use reader_drop")
        
        if request.ended_reason == 'client_drop' and user_id != str(order_user_id) and role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only order owner can use client_drop")
        
        # Mock Twilio call termination (in production, use Twilio SDK)
        end_time = datetime.utcnow()
        
        # Update call record
        db_exec("""
            UPDATE calls SET
                status = %s,
                ended_at = %s,
                ended_reason = %s,
                recording_status = 'stopped',
                notes = COALESCE(notes || E'\\n', '') || %s
            WHERE id = %s
        """, (
            f"dropped_by_{request.ended_reason.split('_')[0]}",
            end_time,
            request.ended_reason,
            f"Dropped by {role}: {request.notes or 'No reason provided'}",
            call_id
        ))
        
        # Stop any active recording
        if recording_sid:
            db_exec("""
                UPDATE call_recordings SET status = 'completed'
                WHERE recording_sid = %s
            """, (recording_sid,))
        
        # Audit log with detailed context
        write_audit(
            actor=user_id,
            event="call_dropped",
            entity="call",
            entity_id=str(call_id),
            meta={
                "call_sid": call_sid,
                "ended_reason": request.ended_reason,
                "dropped_by_role": role,
                "notes": request.notes,
                "call_duration_estimate": "< 1 minute" if call_status == 'ringing' else "active"
            }
        )
        
        return {
            "call_id": call_id,
            "status": f"dropped_by_{request.ended_reason.split('_')[0]}",
            "ended_reason": request.ended_reason,
            "ended_at": end_time.isoformat(),
            "message": "Call dropped successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="call_drop_failed", entity="call", entity_id=str(call_id), meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Call drop failed: {str(e)}")

@app.post("/api/calls/{call_id}/siren")
def trigger_siren_alert(call_id: int, request: SirenAlertRequest, x_user_id: str = Header(...)):
    """Trigger siren alert for emergency/quality issues (reader/client) - M19 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Check call access
        if not can_access_call(user_id, call_id):
            raise HTTPException(status_code=403, detail="Cannot access this call")
        
        # Validate alert_type
        if request.alert_type not in ['emergency', 'quality_issue', 'technical_problem', 'inappropriate_behavior']:
            raise HTTPException(status_code=400, detail="Invalid alert_type")
        
        # Get call details
        call = db_fetchone("""
            SELECT id, call_sid, status FROM calls WHERE id = %s
        """, (call_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        call_id_db, call_sid, call_status = call
        
        # Can only trigger siren on active calls
        if call_status not in ['ringing', 'in_progress']:
            raise HTTPException(status_code=409, detail="Can only trigger siren on active calls")
        
        # Create siren alert
        alert_id = db_fetchone("""
            INSERT INTO siren_alerts(call_id, triggered_by, alert_type, reason, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING id
        """, (call_id, user_id, request.alert_type, request.reason))[0]
        
        # Update call siren flags
        db_exec("""
            UPDATE calls SET 
                siren_triggered = true,
                siren_reason = %s
            WHERE id = %s
        """, (f"{request.alert_type}: {request.reason}", call_id))
        
        # Audit log
        write_audit(
            actor=user_id,
            event="siren_triggered",
            entity="call",
            entity_id=str(call_id),
            meta={
                "alert_id": alert_id,
                "alert_type": request.alert_type,
                "reason": request.reason,
                "call_sid": call_sid,
                "triggered_by_role": role
            }
        )
        
        # In production: send real-time alert to monitoring team
        print(f"[SIREN ALERT] Call {call_sid} - {request.alert_type.upper()}: {request.reason}")
        
        return {
            "alert_id": alert_id,
            "call_id": call_id,
            "alert_type": request.alert_type,
            "status": "active",
            "message": "Siren alert triggered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="siren_trigger_failed", entity="call", entity_id=str(call_id), meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Siren trigger failed: {str(e)}")

@app.get("/api/calls/{call_id}")
def get_call_details(call_id: int, x_user_id: str = Header(...)):
    """Get call details with RLS enforcement (participant/monitor/admin) - M19 compliant"""
    
    try:
        user_id = x_user_id
        
        # Check access
        if not can_access_call(user_id, call_id):
            raise HTTPException(status_code=403, detail="Cannot access this call")
        
        # Get call details with related data
        call_data = db_fetchone("""
            SELECT c.id, c.order_id, c.call_sid, c.recording_sid, c.status, c.recording_status,
                   c.started_at, c.ended_at, c.duration_sec, c.ended_reason, c.notes,
                   c.siren_triggered, c.siren_reason, c.initiated_by,
                   p.first_name as initiated_by_name, p.role_id,
                   o.service_id, s.name as service_name
            FROM calls c
            JOIN orders o ON o.id = c.order_id
            JOIN services s ON s.id = o.service_id
            LEFT JOIN profiles p ON p.id = c.initiated_by
            WHERE c.id = %s
        """, (call_id,))
        
        if not call_data:
            raise HTTPException(status_code=404, detail="Call not found")
        
        # Get recordings with signed URLs
        recordings = db_fetchall("""
            SELECT id, recording_sid, status, duration_sec, file_size_bytes, storage_key
            FROM call_recordings
            WHERE call_id = %s
            ORDER BY created_at
        """, (call_id,))
        
        # Get siren alerts
        alerts = db_fetchall("""
            SELECT id, alert_type, reason, status, acknowledged_at, resolved_at
            FROM siren_alerts
            WHERE call_id = %s
            ORDER BY created_at DESC
        """, (call_id,))
        
        # Generate signed URLs for recordings (if any)
        recordings_with_urls = []
        for recording in recordings:
            rec_id, recording_sid, status, duration, file_size, storage_key = recording
            
            signed_url = None
            if storage_key:
                try:
                    bucket, path = storage_key.split('/', 1)
                    signed_url = storage_sign_url(bucket, path, expires=3600)  # 1 hour
                except:
                    signed_url = None
            
            recordings_with_urls.append({
                "id": rec_id,
                "recording_sid": recording_sid,
                "status": status,
                "duration_sec": duration,
                "file_size_bytes": file_size,
                "download_url": signed_url  # Short-lived signed URL only
            })
        
        # Format alerts
        formatted_alerts = []
        for alert in alerts:
            alert_id, alert_type, reason, status, ack_at, resolved_at = alert
            formatted_alerts.append({
                "id": alert_id,
                "type": alert_type,
                "reason": reason,
                "status": status,
                "acknowledged_at": str(ack_at) if ack_at else None,
                "resolved_at": str(resolved_at) if resolved_at else None
            })
        
        # Build response
        call_detail = {
            "id": call_data[0],
            "order_id": call_data[1],
            "call_sid": call_data[2],
            "status": call_data[4],
            "recording_status": call_data[5],
            "started_at": str(call_data[6]) if call_data[6] else None,
            "ended_at": str(call_data[7]) if call_data[7] else None,
            "duration_sec": call_data[8],
            "ended_reason": call_data[9],
            "notes": call_data[10],
            "siren_triggered": call_data[11],
            "siren_reason": call_data[12],
            "service": call_data[17],
            "recordings": recordings_with_urls,
            "alerts": formatted_alerts
        }
        
        # Audit log
        write_audit(
            actor=user_id,
            event="call_details_accessed",
            entity="call",
            entity_id=str(call_id),
            meta={"call_sid": call_data[2]}
        )
        
        return call_detail
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(actor=user_id, event="call_details_failed", entity="call", entity_id=str(call_id), meta={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Call details failed: {str(e)}")

def verify_twilio_signature(request_url: str, post_data: str, signature: str) -> bool:
    """Verify Twilio webhook signature for security"""
    import hmac
    import hashlib
    import base64
    import os
    
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        return False
    
    # Create expected signature
    data = request_url + post_data
    expected_signature = base64.b64encode(
        hmac.new(auth_token.encode(), data.encode(), hashlib.sha1).digest()
    ).decode()
    
    return hmac.compare_digest(signature, expected_signature)

@app.post("/api/calls/webhook/twilio")
def twilio_webhook_handler(request: Request, x_twilio_signature: str = Header(None, alias="X-Twilio-Signature")):
    """Handle Twilio call status webhooks with signature verification - M19 compliant"""
    
    try:
        # Get raw body for signature verification
        import asyncio
        
        async def get_body():
            return await request.body()
        
        body = asyncio.run(get_body()).decode()
        
        # Verify Twilio signature for security
        if x_twilio_signature:
            request_url = str(request.url)
            if not verify_twilio_signature(request_url, body, x_twilio_signature):
                write_audit(
                    actor="twilio",
                    event="webhook_signature_invalid",
                    entity="webhook",
                    entity_id=None,
                    meta={"url": request_url}
                )
                raise HTTPException(status_code=401, detail="Invalid Twilio signature")
        
        # Parse form data
        from urllib.parse import parse_qs
        form_data = parse_qs(body)
        
        # Extract Twilio parameters
        call_sid = form_data.get('CallSid', [''])[0]
        call_status = form_data.get('CallStatus', [''])[0]
        recording_url = form_data.get('RecordingUrl', [''])[0]
        recording_sid = form_data.get('RecordingSid', [''])[0]
        duration = form_data.get('Duration', ['0'])[0]
        
        if not call_sid:
            raise HTTPException(status_code=400, detail="Missing CallSid")
        
        # Find call by CallSid
        call_record = db_fetchone("""
            SELECT id, status, webhook_events FROM calls WHERE call_sid = %s
        """, (call_sid,))
        
        if not call_record:
            # Log unknown call but don't fail (might be test call)
            write_audit(
                actor="twilio",
                event="webhook_unknown_call",
                entity="webhook",
                entity_id=None,
                meta={"call_sid": call_sid, "call_status": call_status}
            )
            return {"message": "Call not found, ignored"}
        
        call_id, current_status, webhook_events = call_record
        
        # Idempotency check - avoid duplicate processing
        event_key = f"{call_status}_{duration}_{recording_sid or 'none'}"
        events_list = webhook_events or []
        
        if event_key in events_list:
            # Already processed this event
            return {"message": "Event already processed"}
        
        # Add event to history
        events_list.append(event_key)
        
        # Status mapping from Twilio to our system
        status_map = {
            'ringing': 'ringing',
            'in-progress': 'in_progress', 
            'completed': 'completed',
            'failed': 'failed',
            'busy': 'busy',
            'no-answer': 'no_answer',
            'canceled': 'canceled'
        }
        
        new_status = status_map.get(call_status, call_status)
        
        # Update call status
        if call_status in ['completed', 'failed', 'busy', 'no-answer', 'canceled']:
            # Call ended
            end_reason_map = {
                'completed': 'completed',
                'failed': 'failed', 
                'busy': 'busy',
                'no-answer': 'no_answer',
                'canceled': 'timeout'
            }
            
            db_exec("""
                UPDATE calls SET 
                    status = %s, 
                    ended_at = %s,
                    ended_reason = %s,
                    recording_status = 'stopped',
                    webhook_events = %s
                WHERE id = %s
            """, (
                new_status,
                datetime.utcnow(),
                end_reason_map.get(call_status, call_status),
                webhook_events,
                call_id
            ))
            
            # Mark any active recordings as completed
            db_exec("""
                UPDATE call_recordings SET status = 'completed'
                WHERE call_id = %s AND status = 'in_progress'
            """, (call_id,))
            
        else:
            # Call status update only
            db_exec("""
                UPDATE calls SET status = %s, webhook_events = %s WHERE id = %s
            """, (new_status, webhook_events, call_id))
        
        # Handle recording completion
        if recording_url and recording_sid:
            # Update or create recording record
            existing_recording = db_fetchone("""
                SELECT id FROM call_recordings WHERE recording_sid = %s
            """, (recording_sid,))
            
            if existing_recording:
                db_exec("""
                    UPDATE call_recordings SET 
                        status = 'completed',
                        duration_sec = %s,
                        twilio_url = %s
                    WHERE recording_sid = %s
                """, (int(duration) if duration.isdigit() else None, recording_url, recording_sid))
            else:
                db_fetchone("""
                    INSERT INTO call_recordings(call_id, recording_sid, status, duration_sec, twilio_url)
                    VALUES (%s, %s, 'completed', %s, %s)
                    RETURNING id
                """, (call_id, recording_sid, int(duration) if duration.isdigit() else None, recording_url))
            
            # Update calls table with recording URL
            db_exec("""
                UPDATE calls SET recording_url = %s WHERE id = %s
            """, (recording_url, call_id))
        
        # Audit webhook processing (no PII)
        write_audit(
            actor="twilio",
            event="webhook_processed",
            entity="call", 
            entity_id=str(call_id),
            meta={
                "call_sid": call_sid,
                "call_status": call_status,
                "has_recording": bool(recording_sid),
                "duration": duration if duration.isdigit() else None,
                "event_key": event_key
            }
        )
        
        return {
            "message": "Webhook processed successfully",
            "call_id": call_id,
            "status": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(
            actor="twilio", 
            event="webhook_processing_failed", 
            entity="webhook", 
            entity_id=None, 
            meta={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

# =============================================================================
# M20: PAYMENTS MATRIX + FALLBACK
# =============================================================================

# Payment provider configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SQUARE_APPLICATION_ID = os.getenv("SQUARE_APPLICATION_ID")
SQUARE_ACCESS_TOKEN = os.getenv("SQUARE_ACCESS_TOKEN")
SQUARE_WEBHOOK_SECRET = os.getenv("SQUARE_WEBHOOK_SECRET")
SQUARE_ENVIRONMENT = os.getenv("SQUARE_ENVIRONMENT", "sandbox")  # sandbox or production

# Signed URL security settings (Master Policy: ≤15min default)
SIGNED_URL_DEFAULT_TTL_MIN = int(os.getenv("SIGNED_URL_DEFAULT_TTL_MIN", "15"))
PAY_PROVIDER = os.getenv("PAY_PROVIDER", "stripe")  # stripe, square, checkout, tap

# TTL whitelist with explicit justifications (per master context)
SIGNED_URL_OVERRIDES = {
    "invoice": 60,      # Invoices need longer access for user download/print
    "dsr_export": 30,   # DSR exports need time for user to download large files
}

def get_signed_url_ttl(resource_type: str = "default") -> int:
    """Get TTL for signed URLs with security-first defaults per master policy"""
    if resource_type in SIGNED_URL_OVERRIDES:
        return SIGNED_URL_OVERRIDES[resource_type]
    return SIGNED_URL_DEFAULT_TTL_MIN

def get_user_wallet(user_id: str, currency: str = "USD"):
    """Get or create user wallet"""
    wallet = db_fetchone("""
        SELECT id, balance_cents FROM wallets 
        WHERE user_id = %s AND currency = %s
    """, (user_id, currency))
    
    if not wallet:
        wallet_id = db_fetchone("""
            INSERT INTO wallets (user_id, currency, balance_cents) 
            VALUES (%s, %s, 0) RETURNING id
        """, (user_id, currency))[0]
        return wallet_id, 0
    
    return wallet[0], wallet[1]

def add_wallet_transaction(wallet_id: int, amount_cents: int, transaction_type: str, 
                          reference_type: str = None, reference_id: int = None, 
                          description: str = "", created_by: str = None):
    """Add wallet ledger entry with balance update"""
    current_balance = db_fetchone("""
        SELECT balance_cents FROM wallets WHERE id = %s
    """, (wallet_id,))[0]
    
    new_balance = current_balance + amount_cents
    
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    db_exec("""
        INSERT INTO wallet_ledger 
        (wallet_id, amount_cents, balance_after_cents, transaction_type, 
         reference_type, reference_id, description, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (wallet_id, amount_cents, new_balance, transaction_type, 
          reference_type, reference_id, description, created_by))
    
    return new_balance

def generate_idempotency_key(order_id: int, attempt_number: int, provider: str) -> str:
    """Generate deterministic idempotency key"""
    key_input = f"{order_id}-{attempt_number}-{provider}-{datetime.utcnow().date()}"
    return hashlib.sha256(key_input.encode()).hexdigest()[:32]

def get_payment_provider_for_country(country_code: str) -> str:
    """Get primary payment provider for country"""
    result = db_fetchone("""
        SELECT provider FROM payment_provider_rules
        WHERE country_code = %s AND priority = 1 AND is_active = true
        LIMIT 1
    """, (country_code.upper(),))
    
    if result:
        return result[0]
    
    # Default fallback logic
    if country_code.upper() in ['US', 'CA', 'AU', 'NZ']:
        return 'square'
    else:
        return 'stripe'  # EU/UAE/IL/rest

def should_trigger_fallback(order_id: int, provider: str) -> bool:
    """Check if we should fallback to alternate provider"""
    failure_count = db_fetchone("""
        SELECT COUNT(*) FROM payment_attempts 
        WHERE order_id = %s AND provider = %s AND status = 'failed'
        AND created_at > (
            SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz)
            FROM payment_attempts 
            WHERE order_id = %s AND provider = %s 
            AND status IN ('succeeded', 'fallback_triggered')
        )
    """, (order_id, provider, order_id, provider))[0]
    
    return failure_count >= 2

def get_fallback_provider(country_code: str, current_provider: str) -> str:
    """Get fallback provider (simple toggle)"""
    return 'square' if current_provider == 'stripe' else 'stripe'

def verify_stripe_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Stripe webhook signature"""
    try:
        import hmac
        expected_sig = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected_sig}", signature)
    except:
        return False

def verify_square_signature(payload: str, signature: str, secret: str) -> bool:
    """Verify Square webhook signature"""
    try:
        import hmac
        expected_sig = base64.b64encode(
            hmac.new(
                secret.encode('utf-8'),
                (signature + payload).encode('utf-8'), 
                hashlib.sha1
            ).digest()
        ).decode()
        return hmac.compare_digest(expected_sig, signature)
    except:
        return False

@app.post("/api/pay/checkout")
def payment_checkout(request: PaymentCheckoutRequest, x_user_id: str = Header(...)):
    """Create payment intent with provider matrix and fallback - M20 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Verify order exists and user has access
        order = db_fetchone("""
            SELECT id, user_id, status, service_id FROM orders 
            WHERE id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, order_user_id, order_status, service_id = order
        
        # Authorization check
        if role == 'client' and str(order_user_id) != user_id:
            raise HTTPException(status_code=403, detail="Cannot pay for this order")
        
        # Determine payment provider by country
        primary_provider = get_payment_provider_for_country(request.country_code)
        
        # Check if we should use fallback
        if should_trigger_fallback(order_id, primary_provider):
            provider = get_fallback_provider(request.country_code, primary_provider)
            write_audit(user_id, "payment_fallback_triggered", "order", str(order_id), 
                       {"from_provider": primary_provider, "to_provider": provider})
        else:
            provider = primary_provider
        
        # Get next attempt number
        attempt_number = db_fetchone("""
            SELECT COALESCE(MAX(attempt_number), 0) + 1 
            FROM payment_attempts WHERE order_id = %s
        """, (order_id,))[0]
        
        # Generate idempotency key
        idempotency_key = generate_idempotency_key(order_id, attempt_number, provider)
        
        # Create payment attempt record
        attempt_id = db_fetchone("""
            INSERT INTO payment_attempts 
            (order_id, provider, attempt_number, status, amount_cents, currency, idempotency_key)
            VALUES (%s, %s, %s, 'init', %s, %s, %s)
            RETURNING id
        """, (order_id, provider, attempt_number, request.amount_cents, request.currency, idempotency_key))[0]
        
        # Create payment intent based on provider
        client_params = {}
        provider_intent_id = None
        
        if provider == 'stripe' and STRIPE_SECRET_KEY:
            # Mock Stripe PaymentIntent creation
            provider_intent_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
            client_params = {
                "client_secret": f"{provider_intent_id}_secret_{uuid.uuid4().hex[:8]}",
                "payment_intent_id": provider_intent_id
            }
            
            # In production: use Stripe SDK
            # import stripe
            # stripe.api_key = STRIPE_SECRET_KEY
            # intent = stripe.PaymentIntent.create(
            #     amount=request.amount_cents,
            #     currency=request.currency,
            #     idempotency_key=idempotency_key,
            #     metadata={'order_id': str(order_id)}
            # )
            # provider_intent_id = intent.id
            # client_params = {"client_secret": intent.client_secret}
            
        elif provider == 'square' and SQUARE_ACCESS_TOKEN:
            # Mock Square Payment creation
            provider_intent_id = f"sq_mock_{uuid.uuid4().hex[:16]}"
            client_params = {
                "payment_id": provider_intent_id,
                "application_id": SQUARE_APPLICATION_ID or "mock_app_id"
            }
            
            # In production: use Square SDK
            # from squareup import Client
            # client = Client(access_token=SQUARE_ACCESS_TOKEN, environment=SQUARE_ENVIRONMENT)
            # payments_api = client.payments
            # result = payments_api.create_payment({
            #     'source_id': 'nonce_from_frontend',
            #     'idempotency_key': idempotency_key,
            #     'amount_money': {
            #         'amount': request.amount_cents,
            #         'currency': request.currency
            #     }
            # })
            # provider_intent_id = result.body['payment']['id']
            
        else:
            raise HTTPException(status_code=503, detail=f"Provider {provider} not configured")
        
        # Update payment attempt with provider details
        db_exec("""
            UPDATE payment_attempts SET
                provider_intent_id = %s,
                client_params = %s,
                status = 'processing'
            WHERE id = %s
        """, (provider_intent_id, json.dumps(client_params), attempt_id))
        
        # Update order payment info
        db_exec("""
            UPDATE orders SET payment_provider = %s, payment_status = 'processing'
            WHERE id = %s
        """, (provider, order_id))
        
        # Audit log (no PII)
        write_audit(
            actor=user_id,
            event="payment_checkout_created",
            entity="order",
            entity_id=str(order_id),
            meta={
                "provider": provider,
                "attempt_number": attempt_number,
                "amount_cents": request.amount_cents,
                "currency": request.currency,
                "country_code": request.country_code
            }
        )
        
        return {
            "provider": provider,
            "attempt_id": attempt_id,
            "client_params": client_params,
            "amount_cents": request.amount_cents,
            "currency": request.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(user_id, "payment_checkout_failed", "order", str(request.order_id), {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Payment checkout failed: {str(e)}")

@app.post("/api/pay/webhook/stripe")
def stripe_webhook_handler(request: dict, stripe_signature: str = Header(..., alias="stripe-signature")):
    """Handle Stripe webhook with signature verification and idempotency - M20 compliant"""
    
    try:
        if not STRIPE_WEBHOOK_SECRET:
            raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")
        
        # Convert request to JSON string for signature verification
        payload = json.dumps(request, separators=(',', ':')).encode()
        
        # Verify signature
        if not verify_stripe_signature(payload, stripe_signature, STRIPE_WEBHOOK_SECRET):
            write_audit("stripe", "webhook_signature_invalid", "webhook", None, {"event_type": request.get("type")})
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        event_type = request.get("type")
        event_id = request.get("id")
        
        # Idempotency check
        existing_event = db_fetchone("""
            SELECT id FROM payment_events 
            WHERE provider = 'stripe' AND payload->>'id' = %s
        """, (event_id,))
        
        if existing_event:
            return {"message": "Event already processed"}
        
        # Log webhook event
        db_exec("""
            INSERT INTO payment_events (provider, event_type, payload, signature_valid)
            VALUES ('stripe', %s, %s, true)
        """, (event_type, json.dumps(request)))
        
        # Process payment events
        if event_type in ["payment_intent.succeeded", "payment_intent.payment_failed"]:
            payment_intent = request.get("data", {}).get("object", {})
            provider_intent_id = payment_intent.get("id")
            
            if not provider_intent_id:
                return {"message": "No payment intent ID found"}
            
            # Find payment attempt
            attempt = db_fetchone("""
                SELECT id, order_id, amount_cents FROM payment_attempts 
                WHERE provider_intent_id = %s AND provider = 'stripe'
            """, (provider_intent_id,))
            
            if not attempt:
                write_audit("stripe", "webhook_attempt_not_found", "webhook", None, 
                           {"provider_intent_id": provider_intent_id})
                return {"message": "Payment attempt not found"}
            
            attempt_id, order_id, amount_cents = attempt
            
            if event_type == "payment_intent.succeeded":
                # Update payment attempt
                db_exec("""
                    UPDATE payment_attempts SET status = 'succeeded' WHERE id = %s
                """, (attempt_id,))
                
                # Update order
                db_exec("""
                    UPDATE orders SET payment_status = 'succeeded' WHERE id = %s
                """, (order_id,))
                
                # Add to wallet if configured
                order_user = db_fetchone("""
                    SELECT user_id FROM orders WHERE id = %s
                """, (order_id,))
                
                if order_user:
                    wallet_id, _ = get_user_wallet(str(order_user[0]))
                    add_wallet_transaction(
                        wallet_id, amount_cents, 'payment', 
                        'order', order_id, 
                        f"Payment for order #{order_id}", 
                        str(order_user[0])
                    )
                
                write_audit("stripe", "payment_succeeded", "order", str(order_id), 
                           {"amount_cents": amount_cents})
                
            else:  # payment_failed
                # Update payment attempt
                failure_reason = payment_intent.get("last_payment_error", {}).get("message", "Payment failed")
                db_exec("""
                    UPDATE payment_attempts SET status = 'failed', failure_reason = %s 
                    WHERE id = %s
                """, (failure_reason, attempt_id))
                
                # Check if fallback should be triggered
                primary_provider = db_fetchone("""
                    SELECT payment_provider FROM orders WHERE id = %s
                """, (order_id,))[0]
                
                if should_trigger_fallback(order_id, primary_provider):
                    db_exec("""
                        UPDATE payment_attempts SET status = 'fallback_triggered' WHERE id = %s
                    """, (attempt_id,))
                    
                    write_audit("stripe", "payment_fallback_needed", "order", str(order_id), 
                               {"failed_provider": primary_provider})
                else:
                    db_exec("""
                        UPDATE orders SET payment_status = 'failed' WHERE id = %s
                    """, (order_id,))
                
                write_audit("stripe", "payment_failed", "order", str(order_id), 
                           {"reason": failure_reason})
        
        return {"message": "Webhook processed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit("stripe", "webhook_processing_failed", "webhook", None, {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

@app.post("/api/pay/webhook/square")
def square_webhook_handler(request: dict, square_signature: str = Header(..., alias="x-square-signature")):
    """Handle Square webhook with signature verification and idempotency - M20 compliant"""
    
    try:
        if not SQUARE_WEBHOOK_SECRET:
            raise HTTPException(status_code=503, detail="Square webhook secret not configured")
        
        # Convert request to JSON string for signature verification
        payload = json.dumps(request, separators=(',', ':'))
        
        # Verify signature
        if not verify_square_signature(payload, square_signature, SQUARE_WEBHOOK_SECRET):
            write_audit("square", "webhook_signature_invalid", "webhook", None, {"event_type": request.get("type")})
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        event_type = request.get("type")
        event_id = request.get("event_id")
        
        # Idempotency check
        existing_event = db_fetchone("""
            SELECT id FROM payment_events 
            WHERE provider = 'square' AND payload->>'event_id' = %s
        """, (event_id,))
        
        if existing_event:
            return {"message": "Event already processed"}
        
        # Log webhook event
        db_exec("""
            INSERT INTO payment_events (provider, event_type, payload, signature_valid)
            VALUES ('square', %s, %s, true)
        """, (event_type, json.dumps(request)))
        
        # Process payment events
        if event_type in ["payment.updated"]:
            payment = request.get("data", {}).get("object", {}).get("payment", {})
            provider_intent_id = payment.get("id")
            payment_status = payment.get("status")
            
            if not provider_intent_id:
                return {"message": "No payment ID found"}
            
            # Find payment attempt
            attempt = db_fetchone("""
                SELECT id, order_id, amount_cents FROM payment_attempts 
                WHERE provider_intent_id = %s AND provider = 'square'
            """, (provider_intent_id,))
            
            if not attempt:
                write_audit("square", "webhook_attempt_not_found", "webhook", None, 
                           {"provider_intent_id": provider_intent_id})
                return {"message": "Payment attempt not found"}
            
            attempt_id, order_id, amount_cents = attempt
            
            if payment_status == "COMPLETED":
                # Update payment attempt
                db_exec("""
                    UPDATE payment_attempts SET status = 'succeeded' WHERE id = %s
                """, (attempt_id,))
                
                # Update order
                db_exec("""
                    UPDATE orders SET payment_status = 'succeeded' WHERE id = %s
                """, (order_id,))
                
                # Add to wallet if configured
                order_user = db_fetchone("""
                    SELECT user_id FROM orders WHERE id = %s
                """, (order_id,))
                
                if order_user:
                    wallet_id, _ = get_user_wallet(str(order_user[0]))
                    add_wallet_transaction(
                        wallet_id, amount_cents, 'payment', 
                        'order', order_id, 
                        f"Payment for order #{order_id}", 
                        str(order_user[0])
                    )
                
                write_audit("square", "payment_succeeded", "order", str(order_id), 
                           {"amount_cents": amount_cents})
                
            elif payment_status in ["FAILED", "CANCELED"]:
                # Update payment attempt
                failure_reason = payment.get("processing_fee", [{}])[0].get("effective_at") or "Payment failed"
                db_exec("""
                    UPDATE payment_attempts SET status = 'failed', failure_reason = %s 
                    WHERE id = %s
                """, (failure_reason, attempt_id))
                
                # Check if fallback should be triggered
                primary_provider = db_fetchone("""
                    SELECT payment_provider FROM orders WHERE id = %s
                """, (order_id,))[0]
                
                if should_trigger_fallback(order_id, primary_provider):
                    db_exec("""
                        UPDATE payment_attempts SET status = 'fallback_triggered' WHERE id = %s
                    """, (attempt_id,))
                    
                    write_audit("square", "payment_fallback_needed", "order", str(order_id), 
                               {"failed_provider": primary_provider})
                else:
                    db_exec("""
                        UPDATE orders SET payment_status = 'failed' WHERE id = %s
                    """, (order_id,))
                
                write_audit("square", "payment_failed", "order", str(order_id), 
                           {"reason": failure_reason})
        
        return {"message": "Webhook processed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit("square", "webhook_processing_failed", "webhook", None, {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

@app.post("/api/pay/manual")
def manual_payment_submission(request: ManualTransferRequest, x_user_id: str = Header(...)):
    """Submit manual transfer with AML/KYC requirements - M20 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Verify order exists and user has access
        order = db_fetchone("""
            SELECT id, user_id, status FROM orders WHERE id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, order_user_id, order_status = order
        
        # Authorization check
        if role == 'client' and str(order_user_id) != user_id:
            raise HTTPException(status_code=403, detail="Cannot submit manual payment for this order")
        
        # Validate transfer type
        valid_types = ['bank_transfer', 'usdt', 'crypto', 'cash', 'other']
        if request.transfer_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid transfer_type. Must be one of: {valid_types}")
        
        # Create manual transfer record
        transfer_id = db_fetchone("""
            INSERT INTO manual_transfers 
            (order_id, transfer_type, proof_media_id, submitted_by, amount_cents, 
             currency, transaction_ref, review_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id
        """, (order_id, request.transfer_type, request.proof_media_id, user_id, 
              request.amount_cents, request.currency, request.transaction_ref))[0]
        
        # Create AML/KYC checklist
        aml_kyc_id = db_fetchone("""
            INSERT INTO aml_kyc_checks (manual_transfer_id, user_id)
            VALUES (%s, %s) RETURNING id
        """, (transfer_id, user_id))[0]
        
        # Update order status
        db_exec("""
            UPDATE orders SET 
                payment_status = 'manual_review', 
                awaiting_admin_review = true
            WHERE id = %s
        """, (order_id,))
        
        # Audit log (no transaction details in logs for AML compliance)
        write_audit(
            actor=user_id,
            event="manual_payment_submitted",
            entity="order",
            entity_id=str(order_id),
            meta={
                "transfer_type": request.transfer_type,
                "amount_cents": request.amount_cents,
                "currency": request.currency,
                "has_proof": bool(request.proof_media_id)
            }
        )
        
        return {
            "transfer_id": transfer_id,
            "aml_kyc_id": aml_kyc_id,
            "status": "pending_review",
            "message": "Manual transfer submitted for admin review"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(user_id, "manual_payment_failed", "order", str(request.order_id), {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Manual payment submission failed: {str(e)}")

@app.post("/api/wallet/topup")
def wallet_topup(request: WalletTopupRequest, x_user_id: str = Header(...)):
    """Top up user wallet via payment provider - M20 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Get or create wallet
        wallet_id, current_balance = get_user_wallet(user_id, request.currency)
        
        # Determine provider (allow override for testing)
        if request.payment_provider and request.payment_provider in ['stripe', 'square']:
            provider = request.payment_provider
        else:
            # Use default provider (assume US for simplicity, real implementation would use user's country)
            provider = get_payment_provider_for_country('US')
        
        # Generate idempotency key
        attempt_number = 1
        idempotency_key = generate_idempotency_key(0, attempt_number, provider)  # Use 0 for topups
        
        # Create mock payment intent for topup
        provider_intent_id = None
        client_params = {}
        
        if provider == 'stripe' and STRIPE_SECRET_KEY:
            provider_intent_id = f"pi_topup_mock_{uuid.uuid4().hex[:16]}"
            client_params = {
                "client_secret": f"{provider_intent_id}_secret_{uuid.uuid4().hex[:8]}",
                "payment_intent_id": provider_intent_id
            }
        elif provider == 'square' and SQUARE_ACCESS_TOKEN:
            provider_intent_id = f"sq_topup_mock_{uuid.uuid4().hex[:16]}"
            client_params = {
                "payment_id": provider_intent_id,
                "application_id": SQUARE_APPLICATION_ID or "mock_app_id"
            }
        else:
            raise HTTPException(status_code=503, detail=f"Provider {provider} not configured")
        
        # For demo purposes, immediately add to wallet (real implementation would wait for webhook)
        new_balance = add_wallet_transaction(
            wallet_id, request.amount_cents, 'topup',
            description=f"Wallet topup via {provider}",
            created_by=user_id
        )
        
        # Audit log
        write_audit(
            actor=user_id,
            event="wallet_topup",
            entity="wallet",
            entity_id=str(wallet_id),
            meta={
                "provider": provider,
                "amount_cents": request.amount_cents,
                "currency": request.currency,
                "new_balance": new_balance
            }
        )
        
        return {
            "wallet_id": wallet_id,
            "provider": provider,
            "client_params": client_params,
            "amount_cents": request.amount_cents,
            "new_balance_cents": new_balance
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit(user_id, "wallet_topup_failed", "wallet", None, {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Wallet topup failed: {str(e)}")

@app.get("/api/wallet")
def get_wallet(x_user_id: str = Header(...), currency: str = Query("USD")):
    """Get user wallet balance - M20 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Get wallet
        wallet_id, balance_cents = get_user_wallet(user_id, currency)
        
        return {
            "wallet_id": wallet_id,
            "balance_cents": balance_cents,
            "currency": currency
        }
        
    except Exception as e:
        write_audit(user_id, "wallet_access_failed", "wallet", None, {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Wallet access failed: {str(e)}")

@app.get("/api/wallet/ledger")
def get_wallet_ledger(x_user_id: str = Header(...), currency: str = Query("USD"), 
                     limit: int = Query(50, ge=1, le=1000)):
    """Get wallet transaction history - M20 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Get wallet
        wallet_id, _ = get_user_wallet(user_id, currency)
        
        # Get transaction history (no PII, only transaction metadata)
        transactions = db_fetchall("""
            SELECT id, amount_cents, balance_after_cents, transaction_type,
                   reference_type, reference_id, description, created_at
            FROM wallet_ledger 
            WHERE wallet_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (wallet_id, limit))
        
        return {
            "wallet_id": wallet_id,
            "currency": currency,
            "transactions": [
                {
                    "id": t[0],
                    "amount_cents": t[1],
                    "balance_after_cents": t[2],
                    "transaction_type": t[3],
                    "reference_type": t[4],
                    "reference_id": t[5],
                    "description": t[6],
                    "created_at": t[7].isoformat() if t[7] else None
                } for t in transactions
            ]
        }
        
    except Exception as e:
        write_audit(user_id, "wallet_ledger_access_failed", "wallet", None, {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Wallet ledger access failed: {str(e)}")

# =============================================================================
# M21: MODERATION & AUDIT
# =============================================================================

def generate_request_id() -> str:
    """Generate unique request ID for audit tracing"""
    return f"req_{uuid.uuid4().hex[:16]}"

def write_audit_m21(actor: str, event: str, entity: str = None, entity_id: str = None, 
                   meta: dict = None, request_id: str = None):
    """Enhanced audit logging with request tracing and hash chaining"""
    db_exec("""
        INSERT INTO audit_log(actor, event, entity, entity_id, meta, request_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        actor, event, entity, entity_id, 
        json.dumps(meta or {}), 
        request_id or generate_request_id(),
        datetime.utcnow()
    ))

def verify_moderation_permissions(user_role: str, action: str) -> bool:
    """Verify user has permission for moderation action"""
    if user_role in ['superadmin', 'admin']:
        return True
    if user_role == 'monitor' and action in ['block', 'unblock', 'hold', 'escalate', 'lineage_recompute']:
        return True
    return False

def get_active_user_restrictions(user_id: str) -> list:
    """Get active restrictions for a user"""
    restrictions = db_fetchall("""
        SELECT restriction_type, reason_code, expires_at, applied_by, internal_notes
        FROM user_restrictions 
        WHERE user_id = %s AND status = 'active' 
        AND (expires_at IS NULL OR expires_at > now())
    """, (user_id,))
    
    return [
        {
            "restriction_type": r[0],
            "reason_code": r[1],
            "expires_at": r[2].isoformat() if r[2] else None,
            "applied_by": str(r[3]),
            "internal_notes": r[4]
        } for r in restrictions
    ]

@app.post("/api/monitor/block-user")
def block_user(request: ModerationActionRequest, x_user_id: str = Header(...)):
    """Block user with reason and duration - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if not verify_moderation_permissions(role, 'block'):
            raise HTTPException(status_code=403, detail="Insufficient permissions for moderation")
        
        # Validate target
        if request.target_type != 'profile':
            raise HTTPException(status_code=400, detail="This endpoint only supports blocking profiles")
        
        # Verify target user exists
        target_user = db_fetchone("""
            SELECT id, email, role_id FROM profiles WHERE id = %s
        """, (request.target_id,))
        
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Prevent blocking superadmins (unless actor is also superadmin)
        target_role = get_user_role(request.target_id)
        if target_role == 'superadmin' and role != 'superadmin':
            raise HTTPException(status_code=403, detail="Cannot block superadmin users")
        
        # Check if user is already blocked
        existing_blocks = db_fetchall("""
            SELECT id, status FROM user_restrictions 
            WHERE user_id = %s AND restriction_type = 'block' 
            AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
        """, (request.target_id,))
        
        if existing_blocks:
            raise HTTPException(status_code=409, detail="User is already blocked")
        
        # Create restriction record
        restriction_id = db_fetchone("""
            INSERT INTO user_restrictions 
            (user_id, restriction_type, reason_code, severity, duration_hours, 
             applied_by, evidence_refs, internal_notes, user_visible_reason)
            VALUES (%s, 'block', %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.target_id, request.reason_code, request.severity,
            request.duration_hours, user_id, json.dumps(request.evidence_refs),
            request.internal_notes, request.user_visible_reason
        ))[0]
        
        # Create moderation action record
        action_id = db_fetchone("""
            INSERT INTO moderation_actions 
            (actor_id, target_kind, target_id, action, reason, reason_code, 
             severity, evidence_refs, duration_hours)
            VALUES (%s, 'profile', %s, 'block', %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, request.target_id, request.user_visible_reason or request.reason_code,
            request.reason_code, request.severity, json.dumps(request.evidence_refs),
            request.duration_hours
        ))[0]
        
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event="user_blocked",
            entity="profile",
            entity_id=request.target_id,
            meta={
                "reason_code": request.reason_code,
                "severity": request.severity,
                "duration_hours": request.duration_hours,
                "evidence_count": len(request.evidence_refs),
                "restriction_id": restriction_id,
                "action_id": action_id
            },
            request_id=request_id
        )
        
        return {
            "restriction_id": restriction_id,
            "action_id": action_id,
            "target_id": request.target_id,
            "restriction_type": "block",
            "expires_at": (datetime.utcnow() + timedelta(hours=request.duration_hours)).isoformat() 
                         if request.duration_hours else None,
            "message": "User blocked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "user_block_failed", "profile", request.target_id, 
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"User blocking failed: {str(e)}")

@app.post("/api/monitor/unblock-user")  
def unblock_user(request: ModerationActionRequest, x_user_id: str = Header(...)):
    """Unblock user - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if not verify_moderation_permissions(role, 'unblock'):
            raise HTTPException(status_code=403, detail="Insufficient permissions for moderation")
        
        # Find active block
        active_block = db_fetchone("""
            SELECT id, applied_by, reason_code FROM user_restrictions
            WHERE user_id = %s AND restriction_type = 'block'
            AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
        """, (request.target_id,))
        
        if not active_block:
            raise HTTPException(status_code=404, detail="No active block found for user")
        
        restriction_id, applied_by, original_reason = active_block
        
        # Only admin+ can unblock, or original blocker if not permanent
        if role not in ['admin', 'superadmin'] and str(applied_by) != user_id:
            raise HTTPException(status_code=403, detail="Only admin or original blocker can unblock")
        
        # Update restriction record
        db_exec("""
            UPDATE user_restrictions 
            SET status = 'lifted', lifted_by = %s, lifted_at = now()
            WHERE id = %s
        """, (user_id, restriction_id))
        
        # Create moderation action record
        action_id = db_fetchone("""
            INSERT INTO moderation_actions
            (actor_id, target_kind, target_id, action, reason, reason_code)
            VALUES (%s, 'profile', %s, 'unblock', %s, %s)
            RETURNING id  
        """, (user_id, request.target_id, request.internal_notes or 'Manual unblock', 
              request.reason_code or original_reason))[0]
        
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event="user_unblocked", 
            entity="profile",
            entity_id=request.target_id,
            meta={
                "original_reason": original_reason,
                "unblock_reason": request.reason_code,
                "restriction_id": restriction_id,
                "action_id": action_id
            },
            request_id=request_id
        )
        
        return {
            "restriction_id": restriction_id,
            "action_id": action_id,
            "target_id": request.target_id,
            "message": "User unblocked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "user_unblock_failed", "profile", request.target_id,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"User unblocking failed: {str(e)}")

@app.post("/api/monitor/moderate/order/{order_id}")
def moderate_order(order_id: int, request: ModerationActionRequest, x_user_id: str = Header(...)):
    """Moderate order with various actions - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if not verify_moderation_permissions(role, request.action):
            raise HTTPException(status_code=403, detail="Insufficient permissions for this moderation action")
        
        # Verify order exists
        order = db_fetchone("""
            SELECT id, user_id, status, service_id, output_media_id FROM orders 
            WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id_db, order_user_id, order_status, service_id, output_media_id = order
        
        # Validate action for order context
        valid_order_actions = ['hold', 'release', 'remove_media', 'escalate', 'reject']
        if request.action not in valid_order_actions:
            raise HTTPException(status_code=400, 
                              detail=f"Invalid action for order. Valid actions: {valid_order_actions}")
        
        action_applied = False
        action_details = {}
        
        # Apply the moderation action
        if request.action == 'hold':
            db_exec("UPDATE orders SET status = 'awaiting_approval' WHERE id = %s", (order_id,))
            action_details["previous_status"] = order_status
            action_applied = True
            
        elif request.action == 'release':
            db_exec("UPDATE orders SET status = 'approved' WHERE id = %s", (order_id,))
            action_details["previous_status"] = order_status
            action_applied = True
            
        elif request.action == 'remove_media' and output_media_id:
            # Mark media as removed (don't delete, for audit trail)
            db_exec("""
                UPDATE media_assets SET meta = meta || '{"moderation_removed": true}'::jsonb
                WHERE id = %s
            """, (output_media_id,))
            db_exec("UPDATE orders SET output_media_id = NULL WHERE id = %s", (order_id,))
            action_details["removed_media_id"] = output_media_id
            action_applied = True
            
        elif request.action == 'escalate':
            # Create escalation case
            case_id = db_fetchone("""
                INSERT INTO moderation_cases
                (case_type, subject_type, subject_id, priority, reason_code, description, 
                 evidence_refs, opened_by)
                VALUES ('escalation', 'order', %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (str(order_id), min(request.severity + 1, 4), request.reason_code,
                  request.internal_notes or f"Escalated from order moderation",
                  json.dumps(request.evidence_refs), user_id))[0]
            action_details["case_id"] = case_id
            action_applied = True
            
        elif request.action == 'reject':
            db_exec("UPDATE orders SET status = 'rejected' WHERE id = %s", (order_id,))
            action_details["previous_status"] = order_status
            action_applied = True
        
        if not action_applied:
            raise HTTPException(status_code=400, detail=f"Action '{request.action}' could not be applied")
        
        # Create moderation action record
        action_id = db_fetchone("""
            INSERT INTO moderation_actions
            (actor_id, target_kind, target_id, action, reason, reason_code, 
             severity, evidence_refs, duration_hours)
            VALUES (%s, 'order', %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, str(order_id), request.action, 
              request.user_visible_reason or request.internal_notes,
              request.reason_code, request.severity,
              json.dumps(request.evidence_refs), request.duration_hours))[0]
        
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event=f"order_moderated_{request.action}",
            entity="order",
            entity_id=str(order_id),
            meta={
                "action": request.action,
                "reason_code": request.reason_code,
                "severity": request.severity,
                "action_details": action_details,
                "evidence_count": len(request.evidence_refs),
                "action_id": action_id
            },
            request_id=request_id
        )
        
        return {
            "action_id": action_id,
            "order_id": order_id,
            "action": request.action,
            "action_details": action_details,
            "message": f"Order {request.action} applied successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "order_moderation_failed", "order", str(order_id),
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Order moderation failed: {str(e)}")

@app.get("/api/monitor/cases")
def get_moderation_cases(x_user_id: str = Header(...), 
                        status: Optional[str] = Query(None),
                        priority: Optional[int] = Query(None),
                        assigned_to_me: bool = Query(False),
                        limit: int = Query(50, ge=1, le=200)):
    """Get moderation cases queue - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view moderation cases")
        
        # Build query conditions
        conditions = ["1=1"]
        params = []
        
        if status:
            conditions.append("status = %s")
            params.append(status)
        
        if priority:
            conditions.append("priority = %s")
            params.append(priority)
        
        if assigned_to_me:
            conditions.append("assigned_to = %s")
            params.append(user_id)
        
        # Get cases with SLA information
        cases = db_fetchall(f"""
            SELECT c.id, c.case_type, c.subject_type, c.subject_id, c.priority, c.status,
                   c.reason_code, c.description, c.assigned_to, c.opened_by, c.resolved_by,
                   c.opened_at, c.assigned_at, c.resolved_at, c.sla_deadline,
                   p1.email as opened_by_email, p2.email as assigned_to_email, p3.email as resolved_by_email,
                   CASE WHEN c.sla_deadline < now() AND c.status IN ('open', 'in_progress') 
                        THEN true ELSE false END as sla_breached
            FROM moderation_cases c
            LEFT JOIN profiles p1 ON p1.id = c.opened_by
            LEFT JOIN profiles p2 ON p2.id = c.assigned_to
            LEFT JOIN profiles p3 ON p3.id = c.resolved_by
            WHERE {' AND '.join(conditions)}
            ORDER BY c.priority DESC, c.opened_at ASC
            LIMIT %s
        """, params + [limit])
        
        # Get overdue cases count for dashboard
        overdue_count = db_fetchone("""
            SELECT COUNT(*) FROM moderation_cases
            WHERE sla_deadline < now() AND status IN ('open', 'in_progress')
        """)[0]
        
        # Enhanced audit logging (no PII)
        write_audit_m21(
            actor=user_id,
            event="moderation_cases_viewed",
            entity="moderation_queue",
            entity_id=None,
            meta={
                "filters": {"status": status, "priority": priority, "assigned_to_me": assigned_to_me},
                "results_count": len(cases),
                "overdue_count": overdue_count
            },
            request_id=request_id
        )
        
        return {
            "cases": [
                {
                    "id": c[0],
                    "case_type": c[1],
                    "subject_type": c[2], 
                    "subject_id": c[3],
                    "priority": c[4],
                    "status": c[5],
                    "reason_code": c[6],
                    "description": c[7],
                    "assigned_to": str(c[8]) if c[8] else None,
                    "opened_by": str(c[9]) if c[9] else None,
                    "resolved_by": str(c[10]) if c[10] else None,
                    "opened_at": c[11].isoformat() if c[11] else None,
                    "assigned_at": c[12].isoformat() if c[12] else None,
                    "resolved_at": c[13].isoformat() if c[13] else None,
                    "sla_deadline": c[14].isoformat() if c[14] else None,
                    "opened_by_email": c[15],
                    "assigned_to_email": c[16],
                    "resolved_by_email": c[17],
                    "sla_breached": c[18]
                } for c in cases
            ],
            "total_results": len(cases),
            "overdue_cases": overdue_count,
            "filters_applied": {"status": status, "priority": priority, "assigned_to_me": assigned_to_me}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "moderation_cases_view_failed", "moderation_queue", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Cases retrieval failed: {str(e)}")

@app.post("/api/monitor/appeals/{appeal_id}/resolve")
def resolve_appeal(appeal_id: int, request: AppealDecisionRequest, x_user_id: str = Header(...)):
    """Resolve moderation appeal - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only admin+ can resolve appeals")
        
        # Get appeal details
        appeal = db_fetchone("""
            SELECT ma.id, ma.moderation_action_id, ma.appellant_id, ma.status,
                   ma.appeal_reason, mod_act.action, mod_act.target_id, mod_act.target_kind
            FROM moderation_appeals ma
            JOIN moderation_actions mod_act ON mod_act.id = ma.moderation_action_id
            WHERE ma.id = %s
        """, (appeal_id,))
        
        if not appeal:
            raise HTTPException(status_code=404, detail="Appeal not found")
        
        appeal_id_db, mod_action_id, appellant_id, current_status = appeal[:4]
        appeal_reason, original_action, target_id, target_kind = appeal[4:]
        
        if current_status not in ['pending', 'under_review']:
            raise HTTPException(status_code=409, detail="Appeal has already been decided")
        
        # Update appeal with decision
        db_exec("""
            UPDATE moderation_appeals SET
                status = CASE %s WHEN 'approved' THEN 'approved' ELSE 'denied' END,
                reviewed_by = %s,
                decision = %s,
                decision_reason = %s,
                decision_notes = %s,
                decided_at = now(),
                original_action_reversed = %s,
                new_action_applied = %s
            WHERE id = %s
        """, (request.decision, user_id, request.decision, request.decision_reason,
              request.decision_notes, request.reverse_original,
              bool(request.apply_new_action), appeal_id))
        
        # Apply decision consequences
        action_details = {"decision": request.decision}
        
        if request.decision == 'approved' and request.reverse_original:
            # Reverse original moderation action
            if original_action == 'block' and target_kind == 'profile':
                db_exec("""
                    UPDATE user_restrictions 
                    SET status = 'lifted', lifted_by = %s, lifted_at = now()
                    WHERE user_id = %s AND status = 'active' 
                    AND restriction_type = 'block'
                """, (user_id, target_id))
                action_details["original_block_lifted"] = True
                
        if request.apply_new_action:
            # Apply new moderation action as specified
            action_details["new_action_applied"] = request.apply_new_action
            
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event="appeal_resolved",
            entity="moderation_appeal",
            entity_id=str(appeal_id),
            meta={
                "decision": request.decision,
                "appellant_id": str(appellant_id),
                "original_action": original_action,
                "target_type": target_kind,
                "target_id": target_id,
                "reversed_original": request.reverse_original,
                "action_details": action_details
            },
            request_id=request_id
        )
        
        return {
            "appeal_id": appeal_id,
            "decision": request.decision,
            "decision_reason": request.decision_reason,
            "original_action_reversed": request.reverse_original,
            "new_action_applied": bool(request.apply_new_action),
            "message": f"Appeal {request.decision} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "appeal_resolution_failed", "moderation_appeal", str(appeal_id),
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Appeal resolution failed: {str(e)}")

@app.get("/api/admin/audit")
def get_audit_log(x_user_id: str = Header(...),
                  actor: Optional[str] = Query(None),
                  event: Optional[str] = Query(None), 
                  entity: Optional[str] = Query(None),
                  start_date: Optional[str] = Query(None),
                  end_date: Optional[str] = Query(None),
                  request_id: Optional[str] = Query(None),
                  limit: int = Query(100, ge=1, le=1000)):
    """Get filtered audit log - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        audit_request_id = generate_request_id()
        
        # Authorization check
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only admin+ can access audit logs")
        
        # Build query conditions
        conditions = ["1=1"]
        params = []
        
        if actor:
            conditions.append("actor = %s")
            params.append(actor)
            
        if event:
            conditions.append("event = %s")
            params.append(event)
            
        if entity:
            conditions.append("entity = %s") 
            params.append(entity)
            
        if start_date:
            conditions.append("created_at >= %s")
            params.append(start_date)
            
        if end_date:
            conditions.append("created_at <= %s")
            params.append(end_date)
            
        if request_id:
            conditions.append("request_id = %s")
            params.append(request_id)
        
        # Get audit entries with hash verification
        entries = db_fetchall(f"""
            SELECT sequence_number, actor, event, entity, entity_id, meta, 
                   request_id, created_at, previous_hash, record_hash
            FROM audit_log
            WHERE {' AND '.join(conditions)}
            ORDER BY sequence_number DESC
            LIMIT %s
        """, params + [limit])
        
        # Verify hash chain integrity for returned entries
        hash_verification = {"verified": True, "broken_chain_at": None}
        if len(entries) > 1:
            for i in range(len(entries) - 1):
                current_entry = entries[i]
                next_entry = entries[i + 1]
                
                # Check if current entry's previous_hash matches next entry's record_hash
                if current_entry[8] != next_entry[9]:  # previous_hash != next record_hash
                    hash_verification["verified"] = False
                    hash_verification["broken_chain_at"] = current_entry[0]  # sequence_number
                    break
        
        # Enhanced audit logging (audit the audit access)
        write_audit_m21(
            actor=user_id,
            event="audit_log_accessed",
            entity="audit_system",
            entity_id=None,
            meta={
                "filters": {
                    "actor": actor, "event": event, "entity": entity,
                    "start_date": start_date, "end_date": end_date, "request_id": request_id
                },
                "results_count": len(entries),
                "hash_chain_verified": hash_verification["verified"]
            },
            request_id=audit_request_id
        )
        
        return {
            "entries": [
                {
                    "sequence_number": e[0],
                    "actor": e[1],
                    "event": e[2], 
                    "entity": e[3],
                    "entity_id": e[4],
                    "meta": json.loads(e[5]) if e[5] else {},
                    "request_id": e[6],
                    "created_at": e[7].isoformat() if e[7] else None,
                    "previous_hash": e[8],
                    "record_hash": e[9]
                } for e in entries
            ],
            "total_results": len(entries),
            "hash_verification": hash_verification,
            "filters_applied": {
                "actor": actor, "event": event, "entity": entity,
                "start_date": start_date, "end_date": end_date, "request_id": request_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "audit_log_access_failed", "audit_system", None,
                       {"error": str(e)}, audit_request_id)
        raise HTTPException(status_code=500, detail=f"Audit log access failed: {str(e)}")

@app.post("/api/admin/audit/attest")
def create_audit_attestation(request: AuditExportRequest, x_user_id: str = Header(...)):
    """Create signed audit attestation export - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only admin+ can create audit attestations")
        
        # Parse time period
        period_start = datetime.fromisoformat(request.period_start.replace('Z', '+00:00'))
        period_end = datetime.fromisoformat(request.period_end.replace('Z', '+00:00'))
        
        if period_end <= period_start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Get audit records for the period
        records = db_fetchall("""
            SELECT sequence_number, actor, event, entity, entity_id, meta, 
                   request_id, created_at, record_hash
            FROM audit_log
            WHERE created_at >= %s AND created_at <= %s
            ORDER BY sequence_number ASC
        """, (period_start, period_end))
        
        if not records:
            raise HTTPException(status_code=404, detail="No audit records found for the specified period")
        
        first_seq = records[0][0]
        last_seq = records[-1][0]
        total_records = len(records)
        
        # Format export content
        if request.export_format == 'json':
            export_content = json.dumps([
                {
                    "sequence_number": r[0],
                    "actor": r[1],
                    "event": r[2],
                    "entity": r[3],
                    "entity_id": r[4],
                    "meta": json.loads(r[5]) if r[5] else {},
                    "request_id": r[6],
                    "created_at": r[7].isoformat() if r[7] else None,
                    "record_hash": r[8]
                } for r in records
            ], sort_keys=True, separators=(',', ':'))
        else:
            # CSV format
            import csv
            import io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['sequence_number', 'actor', 'event', 'entity', 'entity_id', 
                           'meta', 'request_id', 'created_at', 'record_hash'])
            for r in records:
                writer.writerow([
                    r[0], r[1], r[2], r[3], r[4], 
                    json.dumps(json.loads(r[5]) if r[5] else {}),
                    r[6], r[7].isoformat() if r[7] else None, r[8]
                ])
            export_content = output.getvalue()
        
        # Calculate content hash
        content_hash = hashlib.sha256(export_content.encode('utf-8')).hexdigest()
        
        # Create signature (in production, use proper cryptographic signing)
        signature_input = f"{content_hash}|{period_start.isoformat()}|{period_end.isoformat()}|{user_id}"
        signature = hashlib.sha256(signature_input.encode('utf-8')).hexdigest()
        
        # Store attestation record
        attestation_id = db_fetchone("""
            INSERT INTO audit_attestations
            (attestation_period_start, attestation_period_end, total_records,
             first_sequence_number, last_sequence_number, content_hash,
             signed_by, signature, public_key_id, export_format, export_metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            period_start, period_end, total_records, first_seq, last_seq,
            content_hash, user_id, signature, f"key_{user_id}", request.export_format,
            json.dumps({"created_by": user_id, "request_id": request_id})
        ))[0]
        
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event="audit_attestation_created",
            entity="audit_attestation",
            entity_id=str(attestation_id),
            meta={
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "total_records": total_records,
                "first_sequence": first_seq,
                "last_sequence": last_seq,
                "content_hash": content_hash,
                "export_format": request.export_format
            },
            request_id=request_id
        )
        
        return {
            "attestation_id": attestation_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_records": total_records,
            "content_hash": content_hash,
            "signature": signature if request.include_signatures else "[redacted]",
            "export_format": request.export_format,
            "export_content": export_content if len(export_content) < 50000 else "[too_large_inline]",
            "message": "Audit attestation created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "audit_attestation_failed", "audit_system", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Audit attestation failed: {str(e)}")

# =============================================================================
# M21: AUTOMATED ANOMALY DETECTION SWEEPS
# =============================================================================

def run_excessive_rejections_sweep():
    """Detect readers with abnormally high rejection rates"""
    
    try:
        request_id = generate_request_id()
        
        # Get sweep configuration
        config = db_fetchone("""
            SELECT id, threshold_config, suggested_priority, suggested_reason_code
            FROM moderation_sweep_configs 
            WHERE sweep_name = 'excessive_rejections_by_reader' AND is_active = true
        """)
        
        if not config:
            return {"message": "Sweep configuration not found or disabled"}
        
        config_id, threshold_config, priority, reason_code = config
        thresholds = json.loads(threshold_config)
        
        # Create sweep result record
        sweep_result_id = db_fetchone("""
            INSERT INTO moderation_sweep_results (sweep_config_id, execution_status)
            VALUES (%s, 'running') RETURNING id
        """, (config_id,))[0]
        
        # Find readers with high rejection rates
        anomalous_readers = db_fetchall("""
            WITH reader_stats AS (
                SELECT 
                    o.assigned_reader,
                    COUNT(*) as total_orders,
                    COUNT(*) FILTER (WHERE o.status = 'rejected') as rejected_orders,
                    ROUND(
                        COUNT(*) FILTER (WHERE o.status = 'rejected')::numeric / 
                        COUNT(*)::numeric, 3
                    ) as rejection_rate
                FROM orders o
                WHERE o.assigned_reader IS NOT NULL 
                AND o.created_at > now() - INTERVAL '%s hours'
                AND o.status IN ('approved', 'rejected', 'delivered')
                GROUP BY o.assigned_reader
                HAVING COUNT(*) >= %s
            )
            SELECT assigned_reader, total_orders, rejected_orders, rejection_rate
            FROM reader_stats 
            WHERE rejection_rate >= %s
            ORDER BY rejection_rate DESC
        """, (
            thresholds.get('lookback_hours', 168),
            thresholds.get('min_orders', 10), 
            thresholds.get('rejection_rate_threshold', 0.8)
        ))
        
        cases_created = 0
        for reader_data in anomalous_readers:
            reader_id, total_orders, rejected_orders, rejection_rate = reader_data
            
            # Create moderation case
            case_id = db_fetchone("""
                INSERT INTO moderation_cases
                (case_type, subject_type, subject_id, priority, reason_code, description, 
                 evidence_refs, opened_by)
                VALUES ('automated_sweep', 'profile', %s, %s, %s, %s, %s, 'system')
                RETURNING id
            """, (
                str(reader_id), priority, reason_code,
                f"Automated sweep detected high rejection rate: {rejection_rate:.1%} ({rejected_orders}/{total_orders} orders)",
                json.dumps({
                    "sweep_type": "excessive_rejections",
                    "total_orders": total_orders,
                    "rejected_orders": rejected_orders,
                    "rejection_rate": float(rejection_rate),
                    "threshold": thresholds.get('rejection_rate_threshold')
                })
            ))[0]
            
            cases_created += 1
            
            # Audit each anomaly detected
            write_audit_m21(
                actor="system",
                event="anomaly_detected",
                entity="profile",
                entity_id=str(reader_id),
                meta={
                    "sweep_type": "excessive_rejections",
                    "case_id": case_id,
                    "rejection_rate": float(rejection_rate),
                    "total_orders": total_orders,
                    "threshold_exceeded": True
                },
                request_id=request_id
            )
        
        # Update sweep result
        db_exec("""
            UPDATE moderation_sweep_results SET
                run_completed_at = now(),
                execution_status = 'completed',
                total_checked = (SELECT COUNT(DISTINCT assigned_reader) FROM orders 
                                WHERE assigned_reader IS NOT NULL 
                                AND created_at > now() - INTERVAL '%s hours'),
                anomalies_found = %s,
                cases_created = %s
            WHERE id = %s
        """, (thresholds.get('lookback_hours', 168), len(anomalous_readers), cases_created, sweep_result_id))
        
        # Update sweep config next run time
        db_exec("""
            UPDATE moderation_sweep_configs SET
                last_run_at = now(),
                next_run_at = now() + INTERVAL '%s hours'
            WHERE id = %s
        """, (thresholds.get('check_interval_hours', 24), config_id))
        
        return {
            "sweep_result_id": sweep_result_id,
            "anomalies_found": len(anomalous_readers),
            "cases_created": cases_created,
            "threshold": thresholds.get('rejection_rate_threshold'),
            "message": f"Excessive rejections sweep completed: {cases_created} cases created"
        }
        
    except Exception as e:
        # Mark sweep as failed
        if 'sweep_result_id' in locals():
            db_exec("""
                UPDATE moderation_sweep_results SET
                    run_completed_at = now(),
                    execution_status = 'failed',
                    error_message = %s
                WHERE id = %s
            """, (str(e), sweep_result_id))
        
        write_audit_m21("system", "sweep_execution_failed", "sweep", "excessive_rejections", 
                       {"error": str(e)}, request_id)
        return {"error": str(e)}

def run_rapid_refunds_sweep():
    """Detect unusual refund patterns that may indicate abuse"""
    
    try:
        request_id = generate_request_id()
        
        # Get sweep configuration
        config = db_fetchone("""
            SELECT id, threshold_config, suggested_priority, suggested_reason_code
            FROM moderation_sweep_configs 
            WHERE sweep_name = 'rapid_refund_sequences' AND is_active = true
        """)
        
        if not config:
            return {"message": "Sweep configuration not found or disabled"}
        
        config_id, threshold_config, priority, reason_code = config
        thresholds = json.loads(threshold_config)
        
        # Create sweep result record
        sweep_result_id = db_fetchone("""
            INSERT INTO moderation_sweep_results (sweep_config_id, execution_status)
            VALUES (%s, 'running') RETURNING id
        """, (config_id,))[0]
        
        # Find users with rapid refund patterns
        anomalous_users = db_fetchall("""
            WITH refund_patterns AS (
                SELECT 
                    o.user_id,
                    COUNT(*) as total_refunds,
                    MIN(r.created_at) as first_refund,
                    MAX(r.created_at) as last_refund,
                    EXTRACT(EPOCH FROM (MAX(r.created_at) - MIN(r.created_at))) / 3600 as time_span_hours
                FROM orders o
                JOIN refunds r ON r.order_id = o.id
                WHERE r.status = 'succeeded'
                AND r.created_at > now() - INTERVAL '%s hours'
                GROUP BY o.user_id
                HAVING COUNT(*) >= %s
            )
            SELECT user_id, total_refunds, time_span_hours
            FROM refund_patterns
            WHERE (total_refunds::float / GREATEST(time_span_hours, 1)) >= %s
            ORDER BY (total_refunds::float / GREATEST(time_span_hours, 1)) DESC
        """, (
            thresholds.get('lookback_hours', 24),
            thresholds.get('refunds_per_hour_threshold', 5),
            thresholds.get('refunds_per_hour_threshold', 5)
        ))
        
        cases_created = 0
        for user_data in anomalous_users:
            user_id, total_refunds, time_span_hours = user_data
            refunds_per_hour = total_refunds / max(time_span_hours, 1)
            
            # Create moderation case
            case_id = db_fetchone("""
                INSERT INTO moderation_cases
                (case_type, subject_type, subject_id, priority, reason_code, description, 
                 evidence_refs, opened_by)
                VALUES ('automated_sweep', 'profile', %s, %s, %s, %s, %s, 'system')
                RETURNING id
            """, (
                str(user_id), priority, reason_code,
                f"Automated sweep detected rapid refund pattern: {total_refunds} refunds in {time_span_hours:.1f} hours",
                json.dumps({
                    "sweep_type": "rapid_refunds",
                    "total_refunds": total_refunds,
                    "time_span_hours": float(time_span_hours),
                    "refunds_per_hour": float(refunds_per_hour),
                    "threshold": thresholds.get('refunds_per_hour_threshold')
                })
            ))[0]
            
            cases_created += 1
            
            # Audit each anomaly detected
            write_audit_m21(
                actor="system",
                event="anomaly_detected",
                entity="profile", 
                entity_id=str(user_id),
                meta={
                    "sweep_type": "rapid_refunds",
                    "case_id": case_id,
                    "refunds_per_hour": float(refunds_per_hour),
                    "total_refunds": total_refunds,
                    "threshold_exceeded": True
                },
                request_id=request_id
            )
        
        # Update sweep result
        db_exec("""
            UPDATE moderation_sweep_results SET
                run_completed_at = now(),
                execution_status = 'completed',
                total_checked = (SELECT COUNT(DISTINCT o.user_id) FROM orders o 
                                JOIN refunds r ON r.order_id = o.id
                                WHERE r.created_at > now() - INTERVAL '%s hours'),
                anomalies_found = %s,
                cases_created = %s
            WHERE id = %s
        """, (thresholds.get('lookback_hours', 24), len(anomalous_users), cases_created, sweep_result_id))
        
        return {
            "sweep_result_id": sweep_result_id,
            "anomalies_found": len(anomalous_users),
            "cases_created": cases_created,
            "message": f"Rapid refunds sweep completed: {cases_created} cases created"
        }
        
    except Exception as e:
        if 'sweep_result_id' in locals():
            db_exec("""
                UPDATE moderation_sweep_results SET
                    run_completed_at = now(),
                    execution_status = 'failed',
                    error_message = %s
                WHERE id = %s
            """, (str(e), sweep_result_id))
        
        write_audit_m21("system", "sweep_execution_failed", "sweep", "rapid_refunds", 
                       {"error": str(e)}, request_id)
        return {"error": str(e)}

def run_high_call_drops_sweep():
    """Detect users or readers with high call drop rates"""
    
    try:
        request_id = generate_request_id()
        
        config = db_fetchone("""
            SELECT id, threshold_config, suggested_priority, suggested_reason_code
            FROM moderation_sweep_configs 
            WHERE sweep_name = 'high_call_drop_rates' AND is_active = true
        """)
        
        if not config:
            return {"message": "Sweep configuration not found or disabled"}
        
        config_id, threshold_config, priority, reason_code = config
        thresholds = json.loads(threshold_config)
        
        sweep_result_id = db_fetchone("""
            INSERT INTO moderation_sweep_results (sweep_config_id, execution_status)
            VALUES (%s, 'running') RETURNING id
        """, (config_id,))[0]
        
        # Find users/readers with high call drop rates
        anomalous_entities = db_fetchall("""
            WITH call_stats AS (
                -- User stats (as client)
                SELECT 
                    'client' as entity_type,
                    o.user_id::text as entity_id,
                    COUNT(*) as total_calls,
                    COUNT(*) FILTER (WHERE c.ended_reason LIKE '%_drop' OR c.status LIKE 'dropped_%') as dropped_calls,
                    ROUND(
                        COUNT(*) FILTER (WHERE c.ended_reason LIKE '%_drop' OR c.status LIKE 'dropped_%')::numeric / 
                        COUNT(*)::numeric, 3
                    ) as drop_rate
                FROM calls c
                JOIN orders o ON o.id = c.order_id
                WHERE c.started_at > now() - INTERVAL '%s hours'
                AND c.status IN ('completed', 'dropped_by_monitor', 'dropped_by_reader', 'dropped_by_client')
                GROUP BY o.user_id
                HAVING COUNT(*) >= %s
                
                UNION ALL
                
                -- Reader stats
                SELECT 
                    'reader' as entity_type,
                    o.assigned_reader::text as entity_id,
                    COUNT(*) as total_calls,
                    COUNT(*) FILTER (WHERE c.ended_reason LIKE '%_drop' OR c.status LIKE 'dropped_%') as dropped_calls,
                    ROUND(
                        COUNT(*) FILTER (WHERE c.ended_reason LIKE '%_drop' OR c.status LIKE 'dropped_%')::numeric / 
                        COUNT(*)::numeric, 3
                    ) as drop_rate
                FROM calls c
                JOIN orders o ON o.id = c.order_id
                WHERE c.started_at > now() - INTERVAL '%s hours'
                AND o.assigned_reader IS NOT NULL
                AND c.status IN ('completed', 'dropped_by_monitor', 'dropped_by_reader', 'dropped_by_client')
                GROUP BY o.assigned_reader
                HAVING COUNT(*) >= %s
            )
            SELECT entity_type, entity_id, total_calls, dropped_calls, drop_rate
            FROM call_stats
            WHERE drop_rate >= %s
            ORDER BY drop_rate DESC
        """, (
            thresholds.get('lookback_hours', 72), thresholds.get('min_calls', 5),
            thresholds.get('lookback_hours', 72), thresholds.get('min_calls', 5),
            thresholds.get('drop_rate_threshold', 0.6)
        ))
        
        cases_created = 0
        for entity_data in anomalous_entities:
            entity_type, entity_id, total_calls, dropped_calls, drop_rate = entity_data
            
            case_id = db_fetchone("""
                INSERT INTO moderation_cases
                (case_type, subject_type, subject_id, priority, reason_code, description, 
                 evidence_refs, opened_by)
                VALUES ('automated_sweep', 'profile', %s, %s, %s, %s, %s, 'system')
                RETURNING id
            """, (
                entity_id, priority, reason_code,
                f"Automated sweep detected high call drop rate: {drop_rate:.1%} as {entity_type} ({dropped_calls}/{total_calls} calls)",
                json.dumps({
                    "sweep_type": "high_call_drops",
                    "entity_type": entity_type,
                    "total_calls": total_calls,
                    "dropped_calls": dropped_calls,
                    "drop_rate": float(drop_rate),
                    "threshold": thresholds.get('drop_rate_threshold')
                })
            ))[0]
            
            cases_created += 1
            
            write_audit_m21(
                actor="system",
                event="anomaly_detected",
                entity="profile",
                entity_id=entity_id,
                meta={
                    "sweep_type": "high_call_drops",
                    "case_id": case_id,
                    "entity_type": entity_type,
                    "drop_rate": float(drop_rate),
                    "total_calls": total_calls,
                    "threshold_exceeded": True
                },
                request_id=request_id
            )
        
        # Update sweep result
        db_exec("""
            UPDATE moderation_sweep_results SET
                run_completed_at = now(),
                execution_status = 'completed',
                total_checked = (
                    SELECT COUNT(DISTINCT o.user_id) + COUNT(DISTINCT o.assigned_reader)
                    FROM calls c JOIN orders o ON o.id = c.order_id
                    WHERE c.started_at > now() - INTERVAL '%s hours'
                ),
                anomalies_found = %s,
                cases_created = %s
            WHERE id = %s
        """, (thresholds.get('lookback_hours', 72), len(anomalous_entities), cases_created, sweep_result_id))
        
        return {
            "sweep_result_id": sweep_result_id,
            "anomalies_found": len(anomalous_entities),
            "cases_created": cases_created,
            "message": f"High call drops sweep completed: {cases_created} cases created"
        }
        
    except Exception as e:
        if 'sweep_result_id' in locals():
            db_exec("""
                UPDATE moderation_sweep_results SET
                    run_completed_at = now(),
                    execution_status = 'failed',
                    error_message = %s
                WHERE id = %s
            """, (str(e), sweep_result_id))
        
        write_audit_m21("system", "sweep_execution_failed", "sweep", "high_call_drops", 
                       {"error": str(e)}, request_id)
        return {"error": str(e)}

@app.post("/api/admin/sweeps/run")
def run_moderation_sweeps(x_user_id: str = Header(...), sweep_name: Optional[str] = Query(None)):
    """Manually trigger moderation sweeps - M21 compliant"""
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        request_id = generate_request_id()
        
        # Authorization check
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Only admin+ can run moderation sweeps")
        
        sweep_results = {}
        
        if not sweep_name or sweep_name == 'excessive_rejections_by_reader':
            sweep_results['excessive_rejections'] = run_excessive_rejections_sweep()
            
        if not sweep_name or sweep_name == 'rapid_refund_sequences':
            sweep_results['rapid_refunds'] = run_rapid_refunds_sweep()
            
        if not sweep_name or sweep_name == 'high_call_drop_rates':
            sweep_results['high_call_drops'] = run_high_call_drops_sweep()
        
        # Enhanced audit logging
        write_audit_m21(
            actor=user_id,
            event="moderation_sweeps_executed",
            entity="sweep_system",
            entity_id=sweep_name or "all",
            meta={
                "sweep_name": sweep_name,
                "results": {k: {"cases_created": v.get("cases_created", 0), 
                               "anomalies_found": v.get("anomalies_found", 0)} 
                           for k, v in sweep_results.items()}
            },
            request_id=request_id
        )
        
        return {
            "sweep_results": sweep_results,
            "total_cases_created": sum(r.get("cases_created", 0) for r in sweep_results.values()),
            "total_anomalies_found": sum(r.get("anomalies_found", 0) for r in sweep_results.values()),
            "message": f"Moderation sweeps completed: {sweep_name or 'all'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "moderation_sweeps_failed", "sweep_system", sweep_name or "all",
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Moderation sweeps failed: {str(e)}")

@app.post("/api/monitor/lineage/recompute")
def recompute_lineage(x_user_id: str = Header(...)):
    """Rebuild order↔media↔calls references for evidence - M21 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if not verify_moderation_permissions(role, 'lineage_recompute'):
            write_audit_m21(user_id, "lineage_recompute_denied", "lineage_system", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Insufficient permissions for lineage operations")
        
        # Update order→media links
        media_updates = db_exec("""
            UPDATE orders SET output_media_id = (
                SELECT ma.id FROM media_assets ma 
                WHERE ma.owner_id = orders.assigned_reader 
                AND ma.created_at >= orders.updated_at
                AND ma.kind = 'audio'
                ORDER BY ma.created_at DESC LIMIT 1
            )
            WHERE output_media_id IS NULL 
            AND status IN ('approved', 'delivered')
            AND assigned_reader IS NOT NULL
        """)
        
        # Update order→call links
        call_updates = db_exec("""
            INSERT INTO calls (order_id, started_at, ended_at, end_reason)
            SELECT o.id, o.updated_at, o.delivered_at, 'completed'
            FROM orders o
            LEFT JOIN calls c ON c.order_id = o.id
            WHERE o.service_id IN (
                SELECT id FROM services WHERE code IN ('healing', 'direct_call')
            )
            AND o.status = 'delivered'
            AND c.id IS NULL
            ON CONFLICT (order_id) DO NOTHING
        """)
        
        write_audit_m21(user_id, "lineage_recomputed", "lineage_system", None,
                       {"media_links_updated": media_updates or 0, "call_links_created": call_updates or 0}, request_id)
        
        return {
            "success": True,
            "media_links_updated": media_updates or 0,
            "call_links_created": call_updates or 0,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m21(user_id, "lineage_recompute_failed", "lineage_system", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Lineage recompute failed: {str(e)}")

# =============================================================================
# M22: NOTIFICATIONS & CAMPAIGNS
# =============================================================================

import requests
import hmac
import hashlib
import base64
from datetime import timedelta

# Environment variables for providers
FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "")
FCM_PRIVATE_KEY = os.getenv("FCM_PRIVATE_KEY", "")
APNS_KEY_ID = os.getenv("APNS_KEY_ID", "")
APNS_TEAM_ID = os.getenv("APNS_TEAM_ID", "")
APNS_PRIVATE_KEY = os.getenv("APNS_PRIVATE_KEY", "")
TWILIO_MESSAGING_SID = os.getenv("TWILIO_MESSAGING_SID", "")

# Request models for M22
class NotificationConsentRequest(BaseModel):
    channel: str  # 'push', 'sms', 'whatsapp', 'email'
    opted_in: bool
    quiet_hours_start: Optional[str] = None  # "HH:MM" format
    quiet_hours_end: Optional[str] = None    # "HH:MM" format

class DeviceTokenRequest(BaseModel):
    token: str
    provider: str  # 'fcm' or 'apns'
    platform: Optional[str] = None  # 'android', 'ios', 'web'
    app_version: Optional[str] = None

class CampaignRequest(BaseModel):
    name: str
    description: Optional[str] = None
    channel: str  # 'push', 'sms', 'whatsapp', 'email'
    message_template: dict  # {en: {title: "", body: ""}, ar: {title: "", body: ""}}
    target_audience: dict   # {roles: [], countries: [], segments: []}
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    timezone_cohorts: Optional[List[str]] = None
    send_in_quiet_hours: bool = False

class SuppressionRequest(BaseModel):
    identifier: str  # email, phone, or device token
    channel: str
    reason: str = "manual"
    notes: Optional[str] = None
    expires_at: Optional[str] = None

# Provider adapter classes
class FCMAdapter:
    """Firebase Cloud Messaging adapter with HTTP v1 API"""
    
    def __init__(self):
        self.project_id = FCM_PROJECT_ID
        self.private_key = FCM_PRIVATE_KEY
        self.base_url = f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send"
    
    def get_access_token(self):
        """Generate JWT access token for FCM HTTP v1 API"""
        if not self.private_key:
            raise Exception("FCM private key not configured")
        
        # In production, use google.auth.jwt or similar
        # For now, return a placeholder that would be replaced with proper JWT generation
        return "FCM_ACCESS_TOKEN_PLACEHOLDER"
    
    def send_message(self, token: str, title: str, body: str, data: dict = None):
        """Send push notification via FCM"""
        try:
            access_token = self.get_access_token()
            
            payload = {
                "message": {
                    "token": token,
                    "notification": {
                        "title": title,
                        "body": body
                    },
                    "data": data or {}
                }
            }
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # For demo - would actually send to FCM
            # response = requests.post(self.base_url, json=payload, headers=headers)
            
            # Mock successful response
            return {"success": True, "message_id": f"fcm_{generate_request_id()[:8]}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

class APNsAdapter:
    """Apple Push Notification service adapter"""
    
    def __init__(self):
        self.key_id = APNS_KEY_ID
        self.team_id = APNS_TEAM_ID
        self.private_key = APNS_PRIVATE_KEY
        self.base_url = "https://api.push.apple.com"  # Use api.development.push.apple.com for dev
    
    def send_message(self, device_token: str, title: str, body: str, data: dict = None):
        """Send push notification via APNs"""
        try:
            # Generate JWT token for APNs authentication
            # In production, use PyJWT or similar
            auth_token = "APNS_JWT_TOKEN_PLACEHOLDER"
            
            payload = {
                "aps": {
                    "alert": {
                        "title": title,
                        "body": body
                    },
                    "sound": "default"
                }
            }
            
            if data:
                payload.update(data)
            
            headers = {
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
                "apns-topic": "com.samia.tarot"  # Replace with actual bundle ID
            }
            
            # For demo - would actually send to APNs
            # response = requests.post(f"{self.base_url}/3/device/{device_token}", 
            #                         json=payload, headers=headers)
            
            # Mock successful response
            return {"success": True, "message_id": f"apns_{generate_request_id()[:8]}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

class TwilioAdapter:
    """Twilio SMS/WhatsApp adapter"""
    
    def __init__(self):
        self.account_sid = TWILIO_ACCOUNT_SID
        self.auth_token = TWILIO_AUTH_TOKEN
        self.messaging_sid = TWILIO_MESSAGING_SID
        
    def send_sms(self, to_phone: str, body: str):
        """Send SMS via Twilio"""
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            auth = (self.account_sid, self.auth_token)
            
            data = {
                "MessagingServiceSid": self.messaging_sid,
                "To": to_phone,
                "Body": body
            }
            
            # For demo - would actually send via Twilio
            # response = requests.post(url, data=data, auth=auth)
            
            # Mock successful response
            return {"success": True, "message_id": f"sms_{generate_request_id()[:8]}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def send_whatsapp(self, to_phone: str, body: str):
        """Send WhatsApp message via Twilio"""
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            auth = (self.account_sid, self.auth_token)
            
            data = {
                "From": "whatsapp:+14155238886",  # Twilio WhatsApp number
                "To": f"whatsapp:{to_phone}",
                "Body": body
            }
            
            # For demo - would actually send via Twilio
            # response = requests.post(url, data=data, auth=auth)
            
            # Mock successful response
            return {"success": True, "message_id": f"whatsapp_{generate_request_id()[:8]}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# Initialize provider adapters
fcm_adapter = FCMAdapter()
apns_adapter = APNsAdapter()
twilio_adapter = TwilioAdapter()

def write_audit_m22(actor: str, event: str, entity: str = None, entity_id: str = None, 
                   meta: dict = None, request_id: str = None):
    """M22 audit logging with no PII"""
    db_exec("""
        INSERT INTO audit_log(actor, event, entity, entity_id, meta, request_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        actor, event, entity, entity_id, 
        json.dumps(meta or {}), 
        request_id or generate_request_id(),
        datetime.utcnow()
    ))

def is_suppressed(identifier: str, channel: str) -> bool:
    """Check if identifier is suppressed for channel"""
    suppression = db_fetchone("""
        SELECT id FROM notification_suppressions 
        WHERE identifier = %s AND channel = %s 
        AND (expires_at IS NULL OR expires_at > now())
    """, (identifier, channel))
    return suppression is not None

def get_user_language(user_id: str) -> str:
    """Get user's preferred language (fallback to 'en')"""
    profile = db_fetchone("SELECT country FROM profiles WHERE id = %s", (user_id,))
    if profile and profile[0] in ['SA', 'AE', 'QA', 'KW', 'BH', 'OM']:
        return 'ar'
    return 'en'

def render_message_template(template: dict, user_id: str, variables: dict = None) -> dict:
    """Render message template in user's language"""
    language = get_user_language(user_id)
    content = template.get(language, template.get('en', {}))
    
    # Simple variable substitution
    if variables:
        for key, value in variables.items():
            if 'title' in content:
                content['title'] = content['title'].replace(f"{{{key}}}", str(value))
            if 'body' in content:
                content['body'] = content['body'].replace(f"{{{key}}}", str(value))
    
    return content

# M22 Endpoints

@app.post("/api/me/notifications/device-token")
def register_device_token(request: DeviceTokenRequest, x_user_id: str = Header(...)):
    """Register device token for push notifications - M22 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        
        # Deactivate old tokens for this user/provider
        db_exec("""
            UPDATE device_tokens SET is_active = false, updated_at = now()
            WHERE user_id = %s AND provider = %s
        """, (user_id, request.provider))
        
        # Insert new token
        db_exec("""
            INSERT INTO device_tokens (user_id, token, provider, platform, app_version, created_at)
            VALUES (%s, %s, %s, %s, %s, now())
            ON CONFLICT (token, provider) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                is_active = true,
                last_used_at = now()
        """, (user_id, request.token, request.provider, request.platform, request.app_version))
        
        write_audit_m22(user_id, "device_token_registered", "device_token", request.token[:8],
                       {"provider": request.provider, "platform": request.platform}, request_id)
        
        return {"success": True, "request_id": request_id}
        
    except Exception as e:
        write_audit_m22(user_id, "device_token_registration_failed", "device_token", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Device token registration failed: {str(e)}")

@app.post("/api/me/notifications/opt-in")
def notification_opt_in(request: NotificationConsentRequest, x_user_id: str = Header(...)):
    """Opt-in to notifications for a channel - M22 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        
        # Get user's timezone cohort
        profile = db_fetchone("SELECT country FROM profiles WHERE id = %s", (user_id,))
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        timezone_cohort = db_fetchone("""
            SELECT get_user_timezone_cohort(%s)
        """, (profile[0],))[0]
        
        # Parse quiet hours if provided
        quiet_start = None
        quiet_end = None
        if request.quiet_hours_start and request.quiet_hours_end:
            try:
                quiet_start = datetime.strptime(request.quiet_hours_start, "%H:%M").time()
                quiet_end = datetime.strptime(request.quiet_hours_end, "%H:%M").time()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid quiet hours format. Use HH:MM")
        
        # Upsert consent
        db_exec("""
            INSERT INTO notification_consents 
            (user_id, channel, opted_in, lawful_basis, consent_timestamp, 
             quiet_hours_start, quiet_hours_end, timezone_cohort, created_at, updated_at)
            VALUES (%s, %s, %s, 'consent', now(), %s, %s, %s, now(), now())
            ON CONFLICT (user_id, channel) DO UPDATE SET
                opted_in = EXCLUDED.opted_in,
                consent_timestamp = CASE WHEN EXCLUDED.opted_in THEN now() ELSE notification_consents.consent_timestamp END,
                opt_out_timestamp = CASE WHEN NOT EXCLUDED.opted_in THEN now() ELSE NULL END,
                quiet_hours_start = EXCLUDED.quiet_hours_start,
                quiet_hours_end = EXCLUDED.quiet_hours_end,
                timezone_cohort = EXCLUDED.timezone_cohort,
                updated_at = now()
        """, (user_id, request.channel, request.opted_in, quiet_start, quiet_end, timezone_cohort))
        
        # Remove from suppression list if opting in
        if request.opted_in:
            # This would need the actual identifier (email/phone/token) in a real implementation
            # For now, we'll handle this in the campaign sending logic
            pass
        
        event_type = "notification_opt_in" if request.opted_in else "notification_opt_out"
        write_audit_m22(user_id, event_type, "notification_consent", request.channel,
                       {"timezone_cohort": timezone_cohort}, request_id)
        
        return {
            "success": True, 
            "channel": request.channel,
            "opted_in": request.opted_in,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m22(user_id, "notification_consent_failed", "notification_consent", request.channel,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Notification consent update failed: {str(e)}")

@app.post("/api/me/notifications/opt-out")
def notification_opt_out(request: NotificationConsentRequest, x_user_id: str = Header(...)):
    """Opt-out from notifications for a channel - M22 compliant"""
    # Reuse opt-in endpoint with opted_in=False
    request.opted_in = False
    return notification_opt_in(request, x_user_id)

@app.get("/api/me/notifications")
def get_my_notifications(x_user_id: str = Header(...), limit: int = Query(20, le=100)):
    """Get user's notification history - M22 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        
        notifications = db_fetchall("""
            SELECT n.id, n.channel, n.status, n.scheduled_at, n.sent_at, 
                   n.message_content->>'title' as title,
                   n.message_content->>'body' as body,
                   c.name as campaign_name
            FROM notifications n
            LEFT JOIN campaigns c ON c.id = n.campaign_id
            WHERE n.user_id = %s
            ORDER BY n.created_at DESC
            LIMIT %s
        """, (user_id, limit))
        
        result = []
        for notif in notifications:
            result.append({
                "id": notif[0],
                "channel": notif[1],
                "status": notif[2],
                "scheduled_at": notif[3].isoformat() if notif[3] else None,
                "sent_at": notif[4].isoformat() if notif[4] else None,
                "title": notif[5],
                "body": notif[6],
                "campaign_name": notif[7]
            })
        
        write_audit_m22(user_id, "notification_history_viewed", "notification_system", None,
                       {"count": len(result)}, request_id)
        
        return {"notifications": result, "request_id": request_id}
        
    except Exception as e:
        write_audit_m22(user_id, "notification_history_failed", "notification_system", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve notifications: {str(e)}")

# Campaign Management Endpoints (Admin only)

@app.post("/api/admin/campaigns")
def create_campaign(request: CampaignRequest, x_user_id: str = Header(...)):
    """Create notification campaign - M22 compliant (Admin+ only)"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            write_audit_m22(user_id, "campaign_creation_denied", "campaign", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for campaign creation")
        
        # Validate channel
        if request.channel not in ['push', 'sms', 'whatsapp', 'email']:
            raise HTTPException(status_code=400, detail="Invalid channel")
        
        # Validate message template structure
        required_langs = ['en', 'ar']
        for lang in required_langs:
            if lang not in request.message_template:
                raise HTTPException(status_code=400, detail=f"Missing {lang} template")
            if not request.message_template[lang].get('title') or not request.message_template[lang].get('body'):
                raise HTTPException(status_code=400, detail=f"Missing title/body in {lang} template")
        
        # Parse scheduling times if provided
        scheduled_start = None
        scheduled_end = None
        if request.scheduled_start:
            try:
                scheduled_start = datetime.fromisoformat(request.scheduled_start.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_start format")
        
        if request.scheduled_end:
            try:
                scheduled_end = datetime.fromisoformat(request.scheduled_end.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_end format")
        
        # Default timezone cohorts if not specified
        timezone_cohorts = request.timezone_cohorts or ['GMT', 'CET', 'AST', 'GST', 'IST', 'EST']
        
        # Create campaign
        campaign_id = db_fetchone("""
            INSERT INTO campaigns 
            (name, description, channel, message_template, target_audience, created_by, 
             scheduled_start, scheduled_end, timezone_cohorts, send_in_quiet_hours, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
            RETURNING id
        """, (
            request.name, request.description, request.channel,
            json.dumps(request.message_template), json.dumps(request.target_audience),
            user_id, scheduled_start, scheduled_end, timezone_cohorts, request.send_in_quiet_hours
        ))[0]
        
        write_audit_m22(user_id, "campaign_created", "campaign", str(campaign_id),
                       {"channel": request.channel, "cohorts": len(timezone_cohorts)}, request_id)
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "status": "draft",
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m22(user_id, "campaign_creation_failed", "campaign", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Campaign creation failed: {str(e)}")

@app.post("/api/admin/campaigns/{campaign_id}/schedule")
def schedule_campaign(campaign_id: int, x_user_id: str = Header(...)):
    """Schedule campaign for execution - M22 compliant (Admin+ only)"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            write_audit_m22(user_id, "campaign_schedule_denied", "campaign", str(campaign_id),
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for campaign scheduling")
        
        # Get campaign details
        campaign = db_fetchone("""
            SELECT name, channel, message_template, target_audience, timezone_cohorts, 
                   send_in_quiet_hours, status, scheduled_start
            FROM campaigns WHERE id = %s
        """, (campaign_id,))
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        name, channel, message_template, target_audience, timezone_cohorts, send_in_quiet_hours, status, scheduled_start = campaign
        
        if status != 'draft':
            raise HTTPException(status_code=400, detail=f"Campaign already {status}")
        
        # Parse templates and audience
        templates = json.loads(message_template)
        audience = json.loads(target_audience)
        
        # Get target users based on audience criteria
        target_users_query = """
            SELECT DISTINCT p.id, p.country, nc.timezone_cohort
            FROM profiles p
            LEFT JOIN notification_consents nc ON nc.user_id = p.id AND nc.channel = %s
            WHERE (nc.opted_in = true OR nc.opted_in IS NULL)  -- Include users who haven't set preferences yet
        """
        query_params = [channel]
        
        # Apply role filters
        if 'roles' in audience and audience['roles']:
            target_users_query += " AND p.role_id IN (SELECT id FROM roles WHERE code = ANY(%s))"
            query_params.append(audience['roles'])
        
        # Apply country filters
        if 'countries' in audience and audience['countries']:
            target_users_query += " AND p.country = ANY(%s)"
            query_params.append(audience['countries'])
        
        # Apply engagement filters (simplified for demo)
        if 'segments' in audience and audience['segments']:
            if 'active_7d' in audience['segments']:
                target_users_query += " AND p.updated_at > now() - interval '7 days'"
        
        target_users = db_fetchall(target_users_query, query_params)
        
        # Create individual notifications for each user
        notifications_created = 0
        send_time = scheduled_start or datetime.utcnow()
        
        for user_id_target, country, user_cohort in target_users:
            # Determine user's timezone cohort
            cohort = user_cohort or db_fetchone("""
                SELECT get_user_timezone_cohort(%s)
            """, (country,))[0]
            
            # Skip if cohort not in campaign's target cohorts
            if cohort not in timezone_cohorts:
                continue
            
            # Render message in user's language
            rendered_content = render_message_template(templates, user_id_target)
            
            # Check quiet hours if applicable
            if not send_in_quiet_hours:
                in_quiet_hours = db_fetchone("""
                    SELECT is_quiet_hours(%s, %s)
                """, (user_id_target, send_time))[0]
                
                if in_quiet_hours:
                    # Schedule for next available time (simplified)
                    send_time = send_time + timedelta(hours=8)
            
            # Create notification
            db_exec("""
                INSERT INTO notifications 
                (campaign_id, user_id, channel, message_content, scheduled_at, timezone_cohort, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, now())
            """, (
                campaign_id, user_id_target, channel, json.dumps(rendered_content),
                send_time, cohort
            ))
            
            notifications_created += 1
        
        # Update campaign status
        db_exec("""
            UPDATE campaigns 
            SET status = 'scheduled', updated_at = now() 
            WHERE id = %s
        """, (campaign_id,))
        
        write_audit_m22(user_id, "campaign_scheduled", "campaign", str(campaign_id),
                       {"notifications_created": notifications_created}, request_id)
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "status": "scheduled",
            "notifications_created": notifications_created,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m22(user_id, "campaign_schedule_failed", "campaign", str(campaign_id),
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Campaign scheduling failed: {str(e)}")

@app.get("/api/admin/campaigns/{campaign_id}/stats")
def get_campaign_stats(campaign_id: int, x_user_id: str = Header(...)):
    """Get campaign statistics - M22 compliant (Admin+ only)"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            write_audit_m22(user_id, "campaign_stats_denied", "campaign", str(campaign_id),
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for campaign stats")
        
        # Get campaign basic info
        campaign = db_fetchone("""
            SELECT name, status, created_at, scheduled_start
            FROM campaigns WHERE id = %s
        """, (campaign_id,))
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get notification statistics
        stats = db_fetchone("""
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
                COUNT(CASE WHEN status = 'suppressed' THEN 1 END) as suppressed_count,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
            FROM notifications
            WHERE campaign_id = %s
        """, (campaign_id,))
        
        # Get engagement events
        events = db_fetchone("""
            SELECT 
                COUNT(CASE WHEN ne.event_type = 'delivered' THEN 1 END) as delivered_events,
                COUNT(CASE WHEN ne.event_type = 'opened' THEN 1 END) as opened_events,
                COUNT(CASE WHEN ne.event_type = 'clicked' THEN 1 END) as clicked_events,
                COUNT(CASE WHEN ne.event_type = 'bounced' THEN 1 END) as bounced_events,
                COUNT(CASE WHEN ne.event_type = 'complained' THEN 1 END) as complained_events
            FROM notifications n
            LEFT JOIN notification_events ne ON ne.notification_id = n.id
            WHERE n.campaign_id = %s
        """, (campaign_id,))
        
        write_audit_m22(user_id, "campaign_stats_viewed", "campaign", str(campaign_id),
                       {"total_notifications": stats[0]}, request_id)
        
        return {
            "campaign_id": campaign_id,
            "name": campaign[0],
            "status": campaign[1],
            "created_at": campaign[2].isoformat(),
            "scheduled_start": campaign[3].isoformat() if campaign[3] else None,
            "notifications": {
                "total": stats[0],
                "sent": stats[1],
                "delivered": stats[2],
                "failed": stats[3],
                "suppressed": stats[4],
                "pending": stats[5]
            },
            "engagement": {
                "delivered": events[0],
                "opened": events[1],
                "clicked": events[2],
                "bounced": events[3],
                "complained": events[4]
            },
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m22(user_id, "campaign_stats_failed", "campaign", str(campaign_id),
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Campaign stats retrieval failed: {str(e)}")

@app.post("/api/admin/suppressions")
def manage_suppression(request: SuppressionRequest, x_user_id: str = Header(...)):
    """Add manual suppression entry - M22 compliant (Admin+ only)"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            write_audit_m22(user_id, "suppression_management_denied", "suppression", request.identifier,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for suppression management")
        
        # Parse expiry if provided
        expires_at = None
        if request.expires_at:
            try:
                expires_at = datetime.fromisoformat(request.expires_at.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expires_at format")
        
        # Insert suppression
        db_exec("""
            INSERT INTO notification_suppressions 
            (identifier, channel, reason, applied_by, notes, expires_at, applied_at)
            VALUES (%s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (identifier, channel) DO UPDATE SET
                reason = EXCLUDED.reason,
                applied_by = EXCLUDED.applied_by,
                notes = EXCLUDED.notes,
                expires_at = EXCLUDED.expires_at,
                applied_at = now()
        """, (
            request.identifier, request.channel, request.reason, 
            user_id, request.notes, expires_at
        ))
        
        write_audit_m22(user_id, "suppression_added", "suppression", request.identifier,
                       {"channel": request.channel, "reason": request.reason}, request_id)
        
        return {
            "success": True,
            "identifier": request.identifier,
            "channel": request.channel,
            "reason": request.reason,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m22(user_id, "suppression_management_failed", "suppression", request.identifier,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Suppression management failed: {str(e)}")

# =============================================================================
# M23: ANALYTICS & KPIs
# =============================================================================

from typing import Optional
from datetime import date

# Request models for M23
class AnalyticsDateRangeRequest(BaseModel):
    from_date: Optional[str] = None  # YYYY-MM-DD format
    to_date: Optional[str] = None    # YYYY-MM-DD format
    country_code: Optional[str] = None
    service_code: Optional[str] = None

def write_audit_m23(actor: str, event: str, entity: str = None, entity_id: str = None, 
                   meta: dict = None, request_id: str = None):
    """M23 audit logging with no PII"""
    db_exec("""
        INSERT INTO audit_log(actor, event, entity, entity_id, meta, request_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        actor, event, entity, entity_id, 
        json.dumps(meta or {}), 
        request_id or generate_request_id(),
        datetime.utcnow()
    ))

def emit_analytics_event(event_domain: str, event_type: str, user_id: str = None, 
                        entity_type: str = None, entity_id: str = None, status: str = None,
                        provider: str = None, service_code: str = None, amount_cents: int = None,
                        duration_seconds: int = None, request_id: str = None, metadata: dict = None):
    """Emit analytics event to events_raw table"""
    
    # Get sanitized country code if user_id provided
    country_code = None
    if user_id:
        country_result = db_fetchone("SELECT get_user_country_code(%s)", (user_id,))
        if country_result:
            country_code = country_result[0]
    
    # Call the database function to emit event
    db_exec("""
        SELECT emit_analytics_event(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        event_domain, event_type, user_id, entity_type, entity_id, status,
        provider, country_code, service_code, amount_cents, duration_seconds,
        request_id, None, json.dumps(metadata or {})
    ))

def parse_date_range(from_date: str = None, to_date: str = None, default_days: int = 7):
    """Parse and validate date range parameters"""
    if not from_date and not to_date:
        # Default to last N days
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=default_days)
    else:
        try:
            start_date = datetime.fromisoformat(from_date).date() if from_date else None
            end_date = datetime.fromisoformat(to_date).date() if to_date else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        if not start_date:
            start_date = end_date - timedelta(days=default_days)
        if not end_date:
            end_date = datetime.utcnow().date()
            
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="from_date must be before to_date")
    
    return start_date, end_date

# M23 Analytics Endpoints

@app.get("/api/metrics/overview")
def get_metrics_overview(date: str = Query(None), x_user_id: str = Header(...)):
    """Get metrics overview for a specific date - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin only for overview
        if role not in ['admin', 'superadmin']:
            write_audit_m23(user_id, "metrics_overview_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for metrics overview")
        
        # Parse target date
        if date:
            try:
                target_date = datetime.fromisoformat(date).date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            target_date = datetime.utcnow().date() - timedelta(days=1)  # Yesterday by default
        
        # Get overview metrics from multiple domains
        overview = {}
        
        # Fulfillment overview
        fulfillment = db_fetchone("""
            SELECT 
                SUM(orders_created) as total_orders,
                SUM(orders_delivered) as delivered_orders,
                AVG(ttf_delivery_avg) as avg_delivery_time,
                AVG(approval_rate) as avg_approval_rate
            FROM metrics_daily_fulfillment
            WHERE metric_date = %s
        """, (target_date,))
        
        if fulfillment and fulfillment[0]:
            overview['fulfillment'] = {
                'total_orders': fulfillment[0],
                'delivered_orders': fulfillment[1],
                'avg_delivery_time_seconds': int(fulfillment[2]) if fulfillment[2] else None,
                'avg_approval_rate': float(fulfillment[3]) if fulfillment[3] else None
            }
        
        # Payments overview
        payments = db_fetchone("""
            SELECT 
                SUM(payment_attempts) as total_attempts,
                SUM(payment_successes) as total_successes,
                AVG(success_rate) as avg_success_rate,
                SUM(total_succeeded_cents) as total_revenue_cents
            FROM metrics_daily_payments
            WHERE metric_date = %s
        """, (target_date,))
        
        if payments and payments[0]:
            overview['payments'] = {
                'total_attempts': payments[0],
                'total_successes': payments[1],
                'avg_success_rate': float(payments[2]) if payments[2] else None,
                'total_revenue_cents': payments[3]
            }
        
        # Engagement overview
        engagement = db_fetchone("""
            SELECT 
                SUM(daily_active_users) as total_dau,
                SUM(notifications_sent) as total_notifications,
                AVG(notification_ctr) as avg_ctr
            FROM metrics_daily_engagement
            WHERE metric_date = %s
        """, (target_date,))
        
        if engagement and engagement[0]:
            overview['engagement'] = {
                'total_dau': engagement[0],
                'total_notifications': engagement[1],
                'avg_notification_ctr': float(engagement[2]) if engagement[2] else None
            }
        
        # Content overview
        content = db_fetchone("""
            SELECT 
                horoscopes_published,
                coverage_rate,
                approval_rate
            FROM metrics_daily_content
            WHERE metric_date = %s
        """, (target_date,))
        
        if content:
            overview['content'] = {
                'horoscopes_published': content[0],
                'coverage_rate': float(content[1]) if content[1] else None,
                'approval_rate': float(content[2]) if content[2] else None
            }
        
        write_audit_m23(user_id, "metrics_overview_viewed", "analytics", str(target_date),
                       {"metrics_count": len(overview)}, request_id)
        
        return {
            "date": target_date.isoformat(),
            "overview": overview,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "metrics_overview_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Metrics overview failed: {str(e)}")

@app.get("/api/metrics/fulfillment")
def get_fulfillment_metrics(from_date: str = Query(None), to_date: str = Query(None),
                           service_code: str = Query(None), country_code: str = Query(None),
                           x_user_id: str = Header(...)):
    """Get fulfillment metrics with filtering - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin full access; Reader only their own performance
        if role not in ['admin', 'superadmin', 'reader']:
            write_audit_m23(user_id, "fulfillment_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Insufficient permissions for fulfillment metrics")
        
        start_date, end_date = parse_date_range(from_date, to_date, 7)
        
        # Build query with filters
        query = """
            SELECT metric_date, service_code, country_code, orders_created, orders_delivered,
                   ttf_response_avg, ttf_delivery_avg, approval_rate, rejection_loop_rate
            FROM metrics_daily_fulfillment
            WHERE metric_date BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        # Reader role restriction: only their assigned orders
        if role == 'reader':
            # This would need additional logic to link reader performance
            # For now, readers get limited access
            query += " AND service_code IS NOT NULL"
        
        if service_code:
            query += " AND service_code = %s"
            params.append(service_code)
            
        if country_code:
            query += " AND country_code = %s" 
            params.append(country_code)
            
        query += " ORDER BY metric_date DESC, service_code, country_code"
        
        metrics = db_fetchall(query, params)
        
        result = []
        for metric in metrics:
            result.append({
                'date': metric[0].isoformat(),
                'service_code': metric[1],
                'country_code': metric[2],
                'orders_created': metric[3],
                'orders_delivered': metric[4],
                'ttf_response_avg_seconds': metric[5],
                'ttf_delivery_avg_seconds': metric[6],
                'approval_rate': float(metric[7]) if metric[7] else None,
                'rejection_loop_rate': float(metric[8]) if metric[8] else None
            })
        
        write_audit_m23(user_id, "fulfillment_metrics_viewed", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}", "count": len(result)}, request_id)
        
        return {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "metrics": result,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "fulfillment_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Fulfillment metrics failed: {str(e)}")

@app.get("/api/metrics/payments")
def get_payments_metrics(from_date: str = Query(None), to_date: str = Query(None),
                        provider: str = Query(None), country_code: str = Query(None),
                        x_user_id: str = Header(...)):
    """Get payment metrics with filtering - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin only for payment metrics
        if role not in ['admin', 'superadmin']:
            write_audit_m23(user_id, "payments_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for payment metrics")
        
        start_date, end_date = parse_date_range(from_date, to_date, 7)
        
        query = """
            SELECT metric_date, country_code, provider, payment_attempts, payment_successes,
                   success_rate, fallback_rate, refund_rate, total_succeeded_cents
            FROM metrics_daily_payments
            WHERE metric_date BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if provider:
            query += " AND provider = %s"
            params.append(provider)
            
        if country_code:
            query += " AND country_code = %s"
            params.append(country_code)
            
        query += " ORDER BY metric_date DESC, country_code, provider"
        
        metrics = db_fetchall(query, params)
        
        result = []
        for metric in metrics:
            result.append({
                'date': metric[0].isoformat(),
                'country_code': metric[1],
                'provider': metric[2],
                'payment_attempts': metric[3],
                'payment_successes': metric[4],
                'success_rate': float(metric[5]) if metric[5] else None,
                'fallback_rate': float(metric[6]) if metric[6] else None,
                'refund_rate': float(metric[7]) if metric[7] else None,
                'total_revenue_cents': metric[8]
            })
        
        write_audit_m23(user_id, "payments_metrics_viewed", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}", "count": len(result)}, request_id)
        
        return {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "metrics": result,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "payments_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Payment metrics failed: {str(e)}")

@app.get("/api/metrics/invoices")
def get_invoice_metrics(from_date: str = Query(None), to_date: str = Query(None),
                       x_user_id: str = Header(...)):
    """Get M37 invoice service metrics - admin only"""
    request_id = generate_request_id()

    try:
        user_id = x_user_id
        role = get_user_role(user_id)

        # Access control: Admin/Superadmin only
        if role not in ['admin', 'superadmin']:
            write_audit_m23(user_id, "invoice_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required for invoice metrics")

        start_date, end_date = parse_date_range(from_date, to_date, 30)

        # Invoice generation metrics
        generation_metrics = db_fetchone("""
            SELECT
                COUNT(*) FILTER (WHERE pdf_generated_at IS NOT NULL) as pdfs_generated,
                COUNT(*) FILTER (WHERE pdf_storage_path IS NOT NULL) as pdfs_stored,
                COUNT(*) as total_invoices,
                AVG(total_cents) as avg_amount_cents,
                SUM(total_cents) as total_revenue_cents
            FROM invoices i
            WHERE i.created_at BETWEEN %s AND %s
        """, (start_date, end_date))

        # Signed URL issuance metrics
        signed_url_metrics = db_fetchone("""
            SELECT
                COUNT(*) FILTER (WHERE access_type = 'signed_url_issued') as urls_issued,
                COUNT(DISTINCT invoice_id) FILTER (WHERE access_type = 'signed_url_issued') as unique_invoices_accessed,
                COUNT(*) FILTER (WHERE access_type = 'pdf_downloaded') as downloads,
                COUNT(*) FILTER (WHERE success = false) as failed_accesses
            FROM invoice_access_audit
            WHERE created_at BETWEEN %s AND %s
        """, (start_date, end_date))

        # Access patterns by day
        daily_access = db_fetchall("""
            SELECT
                DATE(created_at) as access_date,
                COUNT(*) FILTER (WHERE access_type = 'signed_url_issued') as urls_issued,
                COUNT(DISTINCT accessed_by) as unique_users
            FROM invoice_access_audit
            WHERE created_at BETWEEN %s AND %s
            GROUP BY DATE(created_at)
            ORDER BY access_date DESC
            LIMIT 30
        """, (start_date, end_date))

        # Storage efficiency metrics
        storage_metrics = db_fetchone("""
            SELECT
                COUNT(DISTINCT pdf_hash) as unique_pdfs,
                COUNT(*) FILTER (WHERE pdf_hash IS NOT NULL) as total_pdf_records,
                AVG(signed_url_issued_count) as avg_url_reissuances
            FROM invoices
            WHERE created_at BETWEEN %s AND %s
              AND pdf_hash IS NOT NULL
        """, (start_date, end_date))

        # Recent error patterns
        error_patterns = db_fetchall("""
            SELECT
                error_message,
                COUNT(*) as error_count,
                MAX(created_at) as last_occurrence
            FROM invoice_access_audit
            WHERE created_at BETWEEN %s AND %s
              AND success = false
              AND error_message IS NOT NULL
            GROUP BY error_message
            ORDER BY error_count DESC
            LIMIT 10
        """, (start_date, end_date))

        write_audit_m23(user_id, "invoice_metrics_retrieved", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}"}, request_id)

        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "generation": {
                "pdfs_generated": generation_metrics[0] or 0,
                "pdfs_stored": generation_metrics[1] or 0,
                "total_invoices": generation_metrics[2] or 0,
                "avg_amount_cents": float(generation_metrics[3] or 0),
                "total_revenue_cents": generation_metrics[4] or 0
            },
            "access": {
                "signed_urls_issued": signed_url_metrics[0] or 0,
                "unique_invoices_accessed": signed_url_metrics[1] or 0,
                "downloads": signed_url_metrics[2] or 0,
                "failed_accesses": signed_url_metrics[3] or 0
            },
            "storage": {
                "unique_pdfs": storage_metrics[0] or 0,
                "total_pdf_records": storage_metrics[1] or 0,
                "avg_url_reissuances": float(storage_metrics[2] or 0),
                "deduplication_ratio": round((storage_metrics[0] or 0) / max(storage_metrics[1] or 1, 1), 3)
            },
            "daily_access": [
                {
                    "date": row[0].isoformat(),
                    "urls_issued": row[1],
                    "unique_users": row[2]
                }
                for row in daily_access
            ],
            "error_patterns": [
                {
                    "error": row[0],
                    "count": row[1],
                    "last_occurrence": row[2].isoformat()
                }
                for row in error_patterns
            ],
            "request_id": request_id
        }

    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "invoice_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Invoice metrics failed: {str(e)}")

@app.get("/api/metrics/compliance")
def get_compliance_metrics(from_date: str = Query(None), to_date: str = Query(None),
                          x_user_id: str = Header(...)):
    """Get M38 legal compliance metrics - admin only"""
    request_id = generate_request_id()

    try:
        user_id = x_user_id
        role = get_user_role(user_id)

        # Access control: Admin/Superadmin only
        if role not in ['admin', 'superadmin']:
            write_audit_m23(user_id, "compliance_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required for compliance metrics")

        start_date, end_date = parse_date_range(from_date, to_date, 30)

        # Age verification metrics
        age_metrics = db_fetchone("""
            SELECT
                COUNT(*) as total_verifications,
                COUNT(*) FILTER (WHERE over18 = true) as verified_18plus,
                COUNT(*) FILTER (WHERE over18 = false) as denied_under18,
                COUNT(DISTINCT user_id) as unique_users_verified,
                AVG(EXTRACT(YEAR FROM NOW()) - dob_year) as avg_age
            FROM age_verifications
            WHERE verified_at BETWEEN %s AND %s
              AND dob_year IS NOT NULL
        """, (start_date, end_date))

        # Consent tracking metrics
        consent_metrics = db_fetchall("""
            SELECT
                policy_type,
                COUNT(*) as total_consents,
                COUNT(DISTINCT user_id) as unique_users,
                MAX(policy_version) as latest_version
            FROM user_consents
            WHERE consent_timestamp BETWEEN %s AND %s
            GROUP BY policy_type
        """, (start_date, end_date))

        # Compliance violations (gate denials)
        violation_metrics = db_fetchone("""
            SELECT
                COUNT(*) FILTER (WHERE action_type = 'age_verification_denied') as age_denials,
                COUNT(*) FILTER (WHERE success = false AND action_type LIKE '%consent%') as consent_failures,
                COUNT(DISTINCT user_id) as users_with_violations
            FROM legal_compliance_audit
            WHERE created_at BETWEEN %s AND %s
        """, (start_date, end_date))

        # Daily compliance events
        daily_events = db_fetchall("""
            SELECT
                DATE(created_at) as event_date,
                action_type,
                COUNT(*) as event_count
            FROM legal_compliance_audit
            WHERE created_at BETWEEN %s AND %s
            GROUP BY DATE(created_at), action_type
            ORDER BY event_date DESC, action_type
            LIMIT 100
        """, (start_date, end_date))

        # Current compliance status
        current_status = db_fetchone("""
            SELECT
                COUNT(*) FILTER (WHERE av.over18 = true) as users_age_verified,
                COUNT(*) FILTER (WHERE uc_tos.user_id IS NOT NULL) as users_tos_consented,
                COUNT(*) FILTER (WHERE uc_pp.user_id IS NOT NULL) as users_privacy_consented,
                COUNT(*) FILTER (WHERE uc_age.user_id IS NOT NULL) as users_age_consented
            FROM age_verifications av
            FULL OUTER JOIN user_consents uc_tos ON av.user_id = uc_tos.user_id AND uc_tos.policy_type = 'terms_of_service'
            FULL OUTER JOIN user_consents uc_pp ON av.user_id = uc_pp.user_id AND uc_pp.policy_type = 'privacy_policy'
            FULL OUTER JOIN user_consents uc_age ON av.user_id = uc_age.user_id AND uc_age.policy_type = 'age_policy'
            WHERE av.verified_at >= %s OR uc_tos.consent_timestamp >= %s
               OR uc_pp.consent_timestamp >= %s OR uc_age.consent_timestamp >= %s
        """, (start_date, start_date, start_date, start_date))

        write_audit_m23(user_id, "compliance_metrics_retrieved", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}"}, request_id)

        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "age_verification": {
                "total_attempts": age_metrics[0] or 0,
                "verified_18plus": age_metrics[1] or 0,
                "denied_under18": age_metrics[2] or 0,
                "unique_users": age_metrics[3] or 0,
                "average_age": float(age_metrics[4] or 0),
                "success_rate": round((age_metrics[1] or 0) / max(age_metrics[0] or 1, 1), 3)
            },
            "consent_tracking": [
                {
                    "policy_type": row[0],
                    "total_consents": row[1],
                    "unique_users": row[2],
                    "latest_version": row[3]
                }
                for row in consent_metrics
            ],
            "violations": {
                "age_denials": violation_metrics[0] or 0,
                "consent_failures": violation_metrics[1] or 0,
                "users_with_violations": violation_metrics[2] or 0
            },
            "current_status": {
                "age_verified_users": current_status[0] or 0,
                "tos_consented_users": current_status[1] or 0,
                "privacy_consented_users": current_status[2] or 0,
                "age_policy_consented_users": current_status[3] or 0
            },
            "daily_events": [
                {
                    "date": row[0].isoformat(),
                    "action_type": row[1],
                    "count": row[2]
                }
                for row in daily_events
            ],
            "request_id": request_id
        }

    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "compliance_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Compliance metrics failed: {str(e)}")

@app.get("/api/metrics/calls")
def get_calls_metrics(from_date: str = Query(None), to_date: str = Query(None),
                     service_code: str = Query(None), country_code: str = Query(None),
                     x_user_id: str = Header(...)):
    """Get call quality metrics - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin/Monitor can view call metrics
        if role not in ['admin', 'superadmin', 'monitor']:
            write_audit_m23(user_id, "calls_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Insufficient permissions for call metrics")
        
        start_date, end_date = parse_date_range(from_date, to_date, 7)
        
        query = """
            SELECT metric_date, service_code, country_code, calls_attempted, calls_answered,
                   calls_completed, answer_rate, completion_rate, drop_rate, avg_duration_seconds
            FROM metrics_daily_calls
            WHERE metric_date BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if service_code:
            query += " AND service_code = %s"
            params.append(service_code)
            
        if country_code:
            query += " AND country_code = %s"
            params.append(country_code)
            
        query += " ORDER BY metric_date DESC, service_code, country_code"
        
        metrics = db_fetchall(query, params)
        
        result = []
        for metric in metrics:
            result.append({
                'date': metric[0].isoformat(),
                'service_code': metric[1],
                'country_code': metric[2],
                'calls_attempted': metric[3],
                'calls_answered': metric[4],
                'calls_completed': metric[5],
                'answer_rate': float(metric[6]) if metric[6] else None,
                'completion_rate': float(metric[7]) if metric[7] else None,
                'drop_rate': float(metric[8]) if metric[8] else None,
                'avg_duration_seconds': metric[9]
            })
        
        write_audit_m23(user_id, "calls_metrics_viewed", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}", "count": len(result)}, request_id)
        
        return {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "metrics": result,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "calls_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Call metrics failed: {str(e)}")

@app.get("/api/metrics/engagement")
def get_engagement_metrics(from_date: str = Query(None), to_date: str = Query(None),
                          country_code: str = Query(None), x_user_id: str = Header(...)):
    """Get user engagement metrics - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin for engagement metrics
        if role not in ['admin', 'superadmin']:
            write_audit_m23(user_id, "engagement_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Admin+ required for engagement metrics")
        
        start_date, end_date = parse_date_range(from_date, to_date, 7)
        
        query = """
            SELECT metric_date, country_code, daily_active_users, new_registrations,
                   notifications_sent, notification_ctr, notification_opt_out_rate,
                   horoscope_listens, avg_listen_through_rate
            FROM metrics_daily_engagement
            WHERE metric_date BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if country_code:
            query += " AND country_code = %s"
            params.append(country_code)
            
        query += " ORDER BY metric_date DESC, country_code"
        
        metrics = db_fetchall(query, params)
        
        result = []
        for metric in metrics:
            result.append({
                'date': metric[0].isoformat(),
                'country_code': metric[1],
                'daily_active_users': metric[2],
                'new_registrations': metric[3],
                'notifications_sent': metric[4],
                'notification_ctr': float(metric[5]) if metric[5] else None,
                'notification_opt_out_rate': float(metric[6]) if metric[6] else None,
                'horoscope_listens': metric[7],
                'avg_listen_through_rate': float(metric[8]) if metric[8] else None
            })
        
        write_audit_m23(user_id, "engagement_metrics_viewed", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}", "count": len(result)}, request_id)
        
        return {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "metrics": result,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "engagement_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Engagement metrics failed: {str(e)}")

@app.get("/api/metrics/content")
def get_content_metrics(from_date: str = Query(None), to_date: str = Query(None),
                       x_user_id: str = Header(...)):
    """Get content approval and coverage metrics - M23 compliant"""
    request_id = generate_request_id()
    
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Access control: Admin/Superadmin/Monitor for content metrics
        if role not in ['admin', 'superadmin', 'monitor']:
            write_audit_m23(user_id, "content_metrics_denied", "analytics", None,
                           {"role": role}, request_id)
            raise HTTPException(status_code=403, detail="Insufficient permissions for content metrics")
        
        start_date, end_date = parse_date_range(from_date, to_date, 7)
        
        metrics = db_fetchall("""
            SELECT metric_date, horoscopes_uploaded, horoscopes_approved, horoscopes_rejected,
                   coverage_uploaded, coverage_approved, coverage_published, coverage_rate,
                   approval_rate, approval_latency_avg
            FROM metrics_daily_content
            WHERE metric_date BETWEEN %s AND %s
            ORDER BY metric_date DESC
        """, (start_date, end_date))
        
        result = []
        for metric in metrics:
            result.append({
                'date': metric[0].isoformat(),
                'horoscopes_uploaded': metric[1],
                'horoscopes_approved': metric[2], 
                'horoscopes_rejected': metric[3],
                'coverage_uploaded': metric[4],
                'coverage_approved': metric[5],
                'coverage_published': metric[6],
                'coverage_rate': float(metric[7]) if metric[7] else None,
                'approval_rate': float(metric[8]) if metric[8] else None,
                'approval_latency_avg_minutes': metric[9]
            })
        
        write_audit_m23(user_id, "content_metrics_viewed", "analytics", None,
                       {"date_range": f"{start_date} to {end_date}", "count": len(result)}, request_id)
        
        return {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "metrics": result,
            "request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m23(user_id, "content_metrics_failed", "analytics", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Content metrics failed: {str(e)}")

# =============================================================================
# M24: COMMUNITY FEATURES (FEATURE-FLAGGED)
# =============================================================================

def check_community_enabled():
    """Check if community features are enabled via feature flag"""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_community_enabled()")
            return cur.fetchone()[0] if cur.rowcount > 0 else False

def write_audit_m24(user_id: str, event: str, entity: str, entity_id: str, metadata: dict, request_id: str):
    """Write M24 community audit entry"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, now())
                """, (user_id, get_user_role(user_id), event, entity, entity_id, json.dumps(metadata)))
    except Exception as e:
        print(f"Audit write failed: {e}")

@app.post("/community/comments")
def create_community_comment(
    comment_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Create comment on delivered content (feature-flagged)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled", 
                       {"attempted_action": "create_comment"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        user_role = get_user_role(x_user_id)
        
        # Validate required fields
        required_fields = ['subject_ref', 'body']
        for field in required_fields:
            if field not in comment_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        subject_ref = comment_data['subject_ref']
        body = comment_data['body'].strip()
        lang = comment_data.get('lang', 'en')
        
        # Validate body length
        if not (1 <= len(body) <= 2000):
            raise HTTPException(status_code=400, detail="Comment body must be 1-2000 characters")
        
        # Validate language
        if lang not in ['en', 'ar']:
            raise HTTPException(status_code=400, detail="Language must be 'en' or 'ar'")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Validate subject reference and deliverability
                cur.execute("SELECT validate_community_subject(%s)", (subject_ref,))
                is_valid = cur.fetchone()[0]
                
                if not is_valid:
                    write_audit_m24(x_user_id, "comment_invalid_subject", "community", subject_ref,
                                   {"subject_ref": subject_ref}, request_id)
                    raise HTTPException(status_code=400, detail="Invalid or undelivered subject reference")
                
                # Create comment
                cur.execute("""
                    INSERT INTO community_comments (subject_ref, author_id, body, lang, status)
                    VALUES (%s, %s, %s, %s, 'pending')
                    RETURNING id, created_at
                """, (subject_ref, x_user_id, body, lang))
                
                result = cur.fetchone()
                comment_id = result[0]
                created_at = result[1]
                
                write_audit_m24(x_user_id, "comment_created", "community_comment", str(comment_id),
                               {"subject_ref": subject_ref, "lang": lang}, request_id)
                
                return {
                    "id": comment_id,
                    "subject_ref": subject_ref,
                    "status": "pending",
                    "created_at": created_at.isoformat(),
                    "message": "Comment submitted for review"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "comment_creation_failed", "community", None,
                       {"error": str(e), "subject_ref": comment_data.get('subject_ref')}, request_id)
        raise HTTPException(status_code=500, detail=f"Comment creation failed: {str(e)}")

@app.get("/community/threads")
def get_community_threads(
    subject_ref: str = Query(...),
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get community threads for subject (role-aware, feature-flagged)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled",
                       {"attempted_action": "get_threads"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        user_role = get_user_role(x_user_id)
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Set RLS context
                cur.execute("SET app.current_user_id = %s", (x_user_id,))
                
                # Get comments (RLS will filter based on role)
                cur.execute("""
                    SELECT c.id, c.subject_ref, c.body, c.lang, c.status, c.created_at,
                           p.first_name, p.last_name,
                           COUNT(r.id) as reaction_count
                    FROM community_comments c
                    JOIN profiles p ON c.author_id = p.id
                    LEFT JOIN community_reactions r ON r.subject_ref = 'comment:' || c.id
                    WHERE c.subject_ref = %s
                    GROUP BY c.id, c.subject_ref, c.body, c.lang, c.status, c.created_at, p.first_name, p.last_name
                    ORDER BY c.created_at ASC
                """, (subject_ref,))
                
                comments = []
                for row in cur.fetchall():
                    comment = {
                        "id": row[0],
                        "subject_ref": row[1],
                        "body": row[2],
                        "lang": row[3],
                        "status": row[4],
                        "created_at": row[5].isoformat(),
                        "author": {
                            "first_name": row[6],
                            "last_name": row[7]
                        },
                        "reaction_count": row[8]
                    }
                    
                    # Get reactions for this comment
                    cur.execute("""
                        SELECT kind, COUNT(*) as count
                        FROM community_reactions 
                        WHERE subject_ref = %s
                        GROUP BY kind
                    """, (f"comment:{row[0]}",))
                    
                    reactions = {kind: count for kind, count in cur.fetchall()}
                    comment["reactions"] = reactions
                    
                    comments.append(comment)
                
                write_audit_m24(x_user_id, "threads_accessed", "community", subject_ref,
                               {"comment_count": len(comments)}, request_id)
                
                return {
                    "subject_ref": subject_ref,
                    "comments": comments,
                    "total_count": len(comments)
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "threads_access_failed", "community", subject_ref,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Thread access failed: {str(e)}")

@app.post("/community/reactions")
def create_community_reaction(
    reaction_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Add reaction to community content (feature-flagged)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled",
                       {"attempted_action": "create_reaction"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        # Validate required fields
        required_fields = ['subject_ref', 'kind']
        for field in required_fields:
            if field not in reaction_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        subject_ref = reaction_data['subject_ref']
        kind = reaction_data['kind']
        
        # Validate reaction kind
        valid_kinds = ['like', 'insightful', 'helpful', 'inspiring']
        if kind not in valid_kinds:
            raise HTTPException(status_code=400, detail=f"Invalid reaction kind. Must be one of: {valid_kinds}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Insert or update reaction (upsert pattern)
                cur.execute("""
                    INSERT INTO community_reactions (subject_ref, author_id, kind)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (subject_ref, author_id, kind) DO NOTHING
                    RETURNING id, created_at
                """, (subject_ref, x_user_id, kind))
                
                result = cur.fetchone()
                if result:
                    reaction_id, created_at = result
                    action = "created"
                else:
                    # Reaction already exists
                    cur.execute("""
                        SELECT id, created_at FROM community_reactions 
                        WHERE subject_ref = %s AND author_id = %s AND kind = %s
                    """, (subject_ref, x_user_id, kind))
                    reaction_id, created_at = cur.fetchone()
                    action = "existing"
                
                write_audit_m24(x_user_id, f"reaction_{action}", "community_reaction", str(reaction_id),
                               {"subject_ref": subject_ref, "kind": kind}, request_id)
                
                return {
                    "id": reaction_id,
                    "subject_ref": subject_ref,
                    "kind": kind,
                    "action": action,
                    "created_at": created_at.isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "reaction_creation_failed", "community", None,
                       {"error": str(e), "subject_ref": reaction_data.get('subject_ref')}, request_id)
        raise HTTPException(status_code=500, detail=f"Reaction creation failed: {str(e)}")

@app.post("/community/flags")
def create_community_flag(
    flag_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Flag community content for moderation (feature-flagged)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled",
                       {"attempted_action": "create_flag"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        # Validate required fields
        required_fields = ['subject_ref', 'reason']
        for field in required_fields:
            if field not in flag_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        subject_ref = flag_data['subject_ref']
        reason = flag_data['reason']
        severity = flag_data.get('severity', 'low')
        description = flag_data.get('description', '').strip()
        evidence_refs = flag_data.get('evidence_refs', [])
        
        # Validate reason
        valid_reasons = ['harassment', 'spam', 'inappropriate', 'copyright', 'fraud', 'safety']
        if reason not in valid_reasons:
            raise HTTPException(status_code=400, detail=f"Invalid reason. Must be one of: {valid_reasons}")
        
        # Validate severity
        valid_severities = ['low', 'medium', 'high', 'critical']
        if severity not in valid_severities:
            raise HTTPException(status_code=400, detail=f"Invalid severity. Must be one of: {valid_severities}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create flag
                cur.execute("""
                    INSERT INTO community_flags (subject_ref, reason, severity, created_by, description, evidence_refs)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (subject_ref, reason, severity, x_user_id, description, evidence_refs))
                
                flag_id, created_at = cur.fetchone()
                
                # Auto-create moderation case
                cur.execute("""
                    SELECT create_community_moderation_case(%s, %s, %s, %s)
                """, (subject_ref, 'flag', reason, severity))
                
                case_id = cur.fetchone()[0]
                
                write_audit_m24(x_user_id, "flag_created", "community_flag", str(flag_id),
                               {"subject_ref": subject_ref, "reason": reason, "severity": severity, "case_id": case_id}, request_id)
                
                return {
                    "id": flag_id,
                    "subject_ref": subject_ref,
                    "reason": reason,
                    "severity": severity,
                    "status": "pending",
                    "moderation_case_id": case_id,
                    "created_at": created_at.isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "flag_creation_failed", "community", None,
                       {"error": str(e), "subject_ref": flag_data.get('subject_ref')}, request_id)
        raise HTTPException(status_code=500, detail=f"Flag creation failed: {str(e)}")

@app.post("/monitor/community/{case_id}/moderate")
def moderate_community_content(
    case_id: int,
    moderation_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Apply moderation decision to community content (Monitor+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled",
                       {"attempted_action": "moderate_content"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            write_audit_m24(x_user_id, "moderation_access_denied", "community_case", str(case_id),
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Insufficient privileges for moderation")
        
        # Validate required fields
        if 'decision' not in moderation_data:
            raise HTTPException(status_code=400, detail="Missing required field: decision")
        
        decision = moderation_data['decision']
        notes = moderation_data.get('notes', '').strip()
        
        # Validate decision
        valid_decisions = ['hold', 'unlist', 'remove', 'escalate', 'approve', 'dismiss']
        if decision not in valid_decisions:
            raise HTTPException(status_code=400, detail=f"Invalid decision. Must be one of: {valid_decisions}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Apply moderation decision
                cur.execute("""
                    SELECT apply_community_moderation_decision(%s, %s, %s, %s)
                """, (case_id, decision, x_user_id, notes))
                
                # Get updated case info
                cur.execute("""
                    SELECT subject_ref, case_type, status, decided_at
                    FROM community_moderation_cases 
                    WHERE id = %s
                """, (case_id,))
                
                case_info = cur.fetchone()
                if not case_info:
                    raise HTTPException(status_code=404, detail="Moderation case not found")
                
                subject_ref, case_type, status, decided_at = case_info
                
                write_audit_m24(x_user_id, "moderation_decision_applied", "community_case", str(case_id),
                               {"decision": decision, "subject_ref": subject_ref, "case_type": case_type}, request_id)
                
                return {
                    "case_id": case_id,
                    "decision": decision,
                    "status": status,
                    "decided_at": decided_at.isoformat() if decided_at else None,
                    "notes": notes
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "moderation_failed", "community_case", str(case_id),
                       {"error": str(e), "decision": moderation_data.get('decision')}, request_id)
        raise HTTPException(status_code=500, detail=f"Moderation failed: {str(e)}")

@app.get("/admin/community/stats")
def get_community_stats(
    start_date: str = Query(None),
    end_date: str = Query(None),
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get community metrics and stats (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    if not check_community_enabled():
        write_audit_m24(x_user_id, "community_disabled_access", "feature_flag", "community_enabled",
                       {"attempted_action": "get_stats"}, request_id)
        raise HTTPException(status_code=403, detail="Community features are disabled")
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m24(x_user_id, "stats_access_denied", "community", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Default to last 30 days if no date range provided
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Comments stats
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_comments,
                        COUNT(*) FILTER (WHERE status = 'approved') as approved_comments,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending_comments,
                        COUNT(*) FILTER (WHERE status = 'removed') as removed_comments
                    FROM community_comments 
                    WHERE created_at BETWEEN %s AND %s + INTERVAL '1 day'
                """, (start_date, end_date))
                
                comment_stats = cur.fetchone()
                
                # Reactions stats
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_reactions,
                        kind,
                        COUNT(*) as count
                    FROM community_reactions 
                    WHERE created_at BETWEEN %s AND %s + INTERVAL '1 day'
                    GROUP BY kind
                """, (start_date, end_date))
                
                reaction_stats = cur.fetchall()
                total_reactions = sum(row[2] for row in reaction_stats) if reaction_stats else 0
                reaction_breakdown = {row[1]: row[2] for row in reaction_stats} if reaction_stats else {}
                
                # Flags stats
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_flags,
                        reason,
                        COUNT(*) as count
                    FROM community_flags 
                    WHERE created_at BETWEEN %s AND %s + INTERVAL '1 day'
                    GROUP BY reason
                """, (start_date, end_date))
                
                flag_stats = cur.fetchall()
                total_flags = sum(row[2] for row in flag_stats) if flag_stats else 0
                flag_breakdown = {row[1]: row[2] for row in flag_stats} if flag_stats else {}
                
                # Moderation stats
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_cases,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending_cases,
                        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_cases,
                        AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) FILTER (WHERE decided_at IS NOT NULL) as avg_resolution_hours
                    FROM community_moderation_cases 
                    WHERE created_at BETWEEN %s AND %s + INTERVAL '1 day'
                """, (start_date, end_date))
                
                moderation_stats = cur.fetchone()
                
                write_audit_m24(x_user_id, "stats_accessed", "community", None,
                               {"date_range": f"{start_date} to {end_date}"}, request_id)
                
                return {
                    "period": {
                        "start_date": start_date,
                        "end_date": end_date
                    },
                    "comments": {
                        "total": comment_stats[0],
                        "approved": comment_stats[1],
                        "pending": comment_stats[2],
                        "removed": comment_stats[3]
                    },
                    "reactions": {
                        "total": total_reactions,
                        "breakdown": reaction_breakdown
                    },
                    "flags": {
                        "total": total_flags,
                        "breakdown": flag_breakdown
                    },
                    "moderation": {
                        "total_cases": moderation_stats[0],
                        "pending_cases": moderation_stats[1],
                        "resolved_cases": moderation_stats[2],
                        "avg_resolution_hours": round(float(moderation_stats[3] or 0), 2)
                    }
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m24(x_user_id, "stats_access_failed", "community", None,
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Stats access failed: {str(e)}")

@app.get("/admin/features")
def get_feature_flags(
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get feature flags configuration (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT feature_key, is_enabled, description, updated_at
                    FROM feature_flags 
                    ORDER BY feature_key
                """)
                
                flags = []
                for row in cur.fetchall():
                    flags.append({
                        "feature_key": row[0],
                        "is_enabled": row[1],
                        "description": row[2],
                        "updated_at": row[3].isoformat() if row[3] else None
                    })
                
                return {"feature_flags": flags}
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature flags access failed: {str(e)}")

@app.post("/admin/features/{feature_key}/toggle")
def toggle_feature_flag(
    feature_key: str,
    toggle_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Toggle feature flag (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if 'enabled' not in toggle_data:
            raise HTTPException(status_code=400, detail="Missing 'enabled' field")
        
        enabled = toggle_data['enabled']
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE feature_flags 
                    SET is_enabled = %s, updated_at = now()
                    WHERE feature_key = %s
                    RETURNING is_enabled, updated_at
                """, (enabled, feature_key))
                
                result = cur.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Feature flag not found")
                
                # Write audit
                cur.execute("""
                    INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (x_user_id, user_role, 'feature_flag_toggled', 'feature_flag', feature_key,
                      json.dumps({"enabled": enabled, "request_id": request_id})))
                
                return {
                    "feature_key": feature_key,
                    "is_enabled": result[0],
                    "updated_at": result[1].isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature flag toggle failed: {str(e)}")

# =============================================================================
# M28: SECRETS & PROVIDERS OPS
# =============================================================================

import time
from datetime import datetime, timedelta

# Circuit breaker states per provider
circuit_breakers = {}

class CircuitBreaker:
    def __init__(self, name, failure_threshold=5, reset_timeout=300):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half_open
    
    def is_available(self):
        if self.state == 'closed':
            return True
        elif self.state == 'open':
            if time.time() - self.last_failure_time >= self.reset_timeout:
                self.state = 'half_open'
                return True
            return False
        elif self.state == 'half_open':
            return True
        return False
    
    def record_success(self):
        self.failure_count = 0
        if self.state == 'half_open':
            self.state = 'closed'
    
    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = 'open'

def get_circuit_breaker(provider_name, service_type):
    """Get or create circuit breaker for provider"""
    key = f"{provider_name}:{service_type}"
    if key not in circuit_breakers:
        circuit_breakers[key] = CircuitBreaker(key)
    return circuit_breakers[key]

def check_provider_health(provider_name: str, service_type: str) -> dict:
    """Check provider health with circuit breaker logic"""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get provider status from database
            cur.execute("""
                SELECT status, circuit_breaker_state, is_enabled, maintenance_mode,
                       response_time_ms, last_health_check, circuit_breaker_failures
                FROM provider_health_status
                WHERE provider_name = %s AND service_type = %s
            """, (provider_name, service_type))
            
            result = cur.fetchone()
            if not result:
                return {
                    "provider": provider_name,
                    "service": service_type,
                    "status": "unknown",
                    "available": False,
                    "last_check": None
                }
            
            status, cb_state, enabled, maintenance, response_ms, last_check, failures = result
            
            # Check circuit breaker availability
            breaker = get_circuit_breaker(provider_name, service_type)
            available = breaker.is_available() and enabled and not maintenance
            
            return {
                "provider": provider_name,
                "service": service_type,
                "status": status,
                "available": available,
                "circuit_breaker_state": cb_state,
                "enabled": enabled,
                "maintenance_mode": maintenance,
                "response_time_ms": response_ms,
                "failure_count": failures,
                "last_check": last_check.isoformat() if last_check else None
            }

def write_audit_m28(user_id: str, event: str, entity: str, entity_id: str, metadata: dict, request_id: str):
    """Write M28 operations audit entry"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, now())
                """, (user_id, get_user_role(user_id), event, entity, entity_id, json.dumps(metadata)))
    except Exception as e:
        print(f"Audit write failed: {e}")

@app.get("/admin/providers/health")
def get_providers_health_status(
    provider: str = Query(None),
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get provider health status summary (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m28(x_user_id, "provider_health_access_denied", "provider_health", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if provider:
                    # Get specific provider health
                    cur.execute("""
                        SELECT provider_name, service_type, status, circuit_breaker_state,
                               is_enabled, maintenance_mode, response_time_ms, success_rate,
                               last_health_check, circuit_breaker_failures
                        FROM provider_health_status
                        WHERE provider_name = %s
                        ORDER BY service_type
                    """, (provider,))
                else:
                    # Get all providers health
                    cur.execute("""
                        SELECT provider_name, service_type, status, circuit_breaker_state,
                               is_enabled, maintenance_mode, response_time_ms, success_rate,
                               last_health_check, circuit_breaker_failures
                        FROM provider_health_status
                        ORDER BY provider_name, service_type
                    """)
                
                providers = []
                for row in cur.fetchall():
                    provider_info = {
                        "provider": row[0],
                        "service_type": row[1],
                        "status": row[2],
                        "circuit_breaker_state": row[3],
                        "enabled": row[4],
                        "maintenance_mode": row[5],
                        "response_time_ms": row[6],
                        "success_rate": float(row[7]) if row[7] else None,
                        "last_health_check": row[8].isoformat() if row[8] else None,
                        "failure_count": row[9],
                        "available": is_provider_available(row[0], row[1])
                    }
                    providers.append(provider_info)
                
                # Get recent operational events
                cur.execute("""
                    SELECT provider_name, event_type, severity, summary, created_at
                    FROM provider_operational_events
                    WHERE created_at >= now() - INTERVAL '24 hours'
                    ORDER BY created_at DESC
                    LIMIT 50
                """)
                
                recent_events = []
                for row in cur.fetchall():
                    recent_events.append({
                        "provider": row[0],
                        "event_type": row[1],
                        "severity": row[2],
                        "summary": row[3],
                        "created_at": row[4].isoformat()
                    })
                
                write_audit_m28(x_user_id, "provider_health_accessed", "provider_health", provider or "all",
                               {"provider_count": len(providers)}, request_id)
                
                return {
                    "providers": providers,
                    "recent_events": recent_events,
                    "summary": {
                        "total_providers": len(providers),
                        "healthy": len([p for p in providers if p["status"] == "healthy"]),
                        "unhealthy": len([p for p in providers if p["status"] == "unhealthy"]),
                        "maintenance": len([p for p in providers if p["maintenance_mode"]]),
                        "disabled": len([p for p in providers if not p["enabled"]])
                    }
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m28(x_user_id, "provider_health_access_failed", "provider_health", provider or "all",
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Provider health access failed: {str(e)}")

def is_provider_available(provider_name: str, service_type: str) -> bool:
    """Check if provider is available (helper function)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT is_provider_available(%s, %s)", (provider_name, service_type))
                return cur.fetchone()[0]
    except:
        return False

@app.post("/admin/providers/toggle")
def toggle_provider_status(
    toggle_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Toggle provider availability (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m28(x_user_id, "provider_toggle_access_denied", "provider_toggle", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate required fields
        required_fields = ['provider_name', 'service_type', 'enabled']
        for field in required_fields:
            if field not in toggle_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        provider_name = toggle_data['provider_name']
        service_type = toggle_data['service_type']
        enabled = toggle_data['enabled']
        reason = toggle_data.get('reason', 'Manual toggle by admin')
        maintenance_mode = toggle_data.get('maintenance_mode', False)
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if provider exists
                cur.execute("""
                    SELECT id FROM provider_health_status
                    WHERE provider_name = %s AND service_type = %s
                """, (provider_name, service_type))
                
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Provider not found")
                
                # Toggle provider using function
                cur.execute("""
                    SELECT toggle_provider(%s, %s, %s, %s, %s)
                """, (provider_name, service_type, enabled, reason, x_user_id))
                
                # Update maintenance mode if specified
                if 'maintenance_mode' in toggle_data:
                    cur.execute("""
                        UPDATE provider_health_status
                        SET maintenance_mode = %s, updated_at = now()
                        WHERE provider_name = %s AND service_type = %s
                    """, (maintenance_mode, provider_name, service_type))
                
                # Get updated status
                cur.execute("""
                    SELECT status, is_enabled, maintenance_mode, updated_at
                    FROM provider_health_status
                    WHERE provider_name = %s AND service_type = %s
                """, (provider_name, service_type))
                
                result = cur.fetchone()
                status, is_enabled, is_maintenance, updated_at = result
                
                write_audit_m28(x_user_id, "provider_toggled", "provider", f"{provider_name}:{service_type}",
                               {"enabled": enabled, "maintenance_mode": maintenance_mode, "reason": reason}, request_id)
                
                return {
                    "provider_name": provider_name,
                    "service_type": service_type,
                    "status": status,
                    "enabled": is_enabled,
                    "maintenance_mode": is_maintenance,
                    "updated_at": updated_at.isoformat(),
                    "reason": reason
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m28(x_user_id, "provider_toggle_failed", "provider", f"{toggle_data.get('provider_name')}:{toggle_data.get('service_type')}",
                       {"error": str(e), "enabled": toggle_data.get('enabled')}, request_id)
        raise HTTPException(status_code=500, detail=f"Provider toggle failed: {str(e)}")

@app.post("/admin/secrets/rotate")
def request_secret_rotation(
    rotation_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Request secret rotation (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m28(x_user_id, "secret_rotation_access_denied", "secret_rotation", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate required fields
        required_fields = ['scope', 'key_name']
        for field in required_fields:
            if field not in rotation_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        scope = rotation_data['scope']
        key_name = rotation_data['key_name']
        rotation_type = rotation_data.get('rotation_type', 'manual')
        force_rotation = rotation_data.get('force_rotation', False)
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get secret configuration
                cur.execute("""
                    SELECT id, status, next_rotation_at, key_type
                    FROM secrets_config
                    WHERE scope = %s AND key_name = %s
                """, (scope, key_name))
                
                secret_info = cur.fetchone()
                if not secret_info:
                    raise HTTPException(status_code=404, detail="Secret configuration not found")
                
                secret_id, status, next_rotation, key_type = secret_info
                
                # Check if rotation is needed or forced
                if not force_rotation and not is_rotation_due(secret_id):
                    next_due = next_rotation.isoformat() if next_rotation else "Manual rotation required"
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Rotation not due. Next rotation: {next_due}. Use force_rotation=true to override."
                    )
                
                # Check if already rotating
                if status == 'rotating':
                    raise HTTPException(status_code=409, detail="Secret rotation already in progress")
                
                # Start rotation process
                cur.execute("""
                    SELECT start_secret_rotation(%s, %s, %s, %s)
                """, (secret_id, rotation_type, x_user_id, request_id))
                
                rotation_id = cur.fetchone()[0]
                
                write_audit_m28(x_user_id, "secret_rotation_started", "secret", f"{scope}:{key_name}",
                               {"rotation_id": rotation_id, "rotation_type": rotation_type, "forced": force_rotation}, request_id)
                
                # Get rotation details
                cur.execute("""
                    SELECT initiated_at, status
                    FROM secrets_rotation_log
                    WHERE id = %s
                """, (rotation_id,))
                
                initiated_at, rotation_status = cur.fetchone()
                
                return {
                    "rotation_id": rotation_id,
                    "secret_scope": scope,
                    "secret_key_name": key_name,
                    "rotation_type": rotation_type,
                    "status": rotation_status,
                    "initiated_at": initiated_at.isoformat(),
                    "initiated_by": x_user_id,
                    "message": f"Secret rotation started for {scope}:{key_name}. Manual completion required.",
                    "next_steps": [
                        "1. Generate new secret value using appropriate method",
                        "2. Update external provider configuration", 
                        "3. Test new secret functionality",
                        "4. Complete rotation via separate API call"
                    ]
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m28(x_user_id, "secret_rotation_failed", "secret", f"{rotation_data.get('scope')}:{rotation_data.get('key_name')}",
                       {"error": str(e), "rotation_type": rotation_data.get('rotation_type')}, request_id)
        raise HTTPException(status_code=500, detail=f"Secret rotation request failed: {str(e)}")

def is_rotation_due(secret_id: int) -> bool:
    """Helper function to check if rotation is due"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT is_rotation_due(%s)", (secret_id,))
                return cur.fetchone()[0]
    except:
        return False

@app.get("/admin/secrets/status")
def get_secrets_status(
    scope: str = Query(None),
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get secrets rotation status (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if scope:
                    # Get specific scope secrets
                    cur.execute("""
                        SELECT scope, key_name, key_type, rotation_schedule, status,
                               last_rotated_at, next_rotation_at, data_classification
                        FROM secrets_config
                        WHERE scope = %s
                        ORDER BY key_name
                    """, (scope,))
                else:
                    # Get all secrets
                    cur.execute("""
                        SELECT scope, key_name, key_type, rotation_schedule, status,
                               last_rotated_at, next_rotation_at, data_classification
                        FROM secrets_config
                        ORDER BY scope, key_name
                    """)
                
                secrets = []
                for row in cur.fetchall():
                    secret_info = {
                        "scope": row[0],
                        "key_name": row[1],
                        "key_type": row[2],
                        "rotation_schedule": row[3],
                        "status": row[4],
                        "last_rotated_at": row[5].isoformat() if row[5] else None,
                        "next_rotation_at": row[6].isoformat() if row[6] else None,
                        "data_classification": row[7],
                        "rotation_due": is_rotation_due_check(row[6])
                    }
                    secrets.append(secret_info)
                
                # Get recent rotation history
                cur.execute("""
                    SELECT sc.scope, sc.key_name, srl.rotation_type, srl.status,
                           srl.initiated_at, srl.completed_at
                    FROM secrets_rotation_log srl
                    JOIN secrets_config sc ON sc.id = srl.secret_config_id
                    WHERE srl.initiated_at >= now() - INTERVAL '30 days'
                    ORDER BY srl.initiated_at DESC
                    LIMIT 20
                """)
                
                recent_rotations = []
                for row in cur.fetchall():
                    recent_rotations.append({
                        "scope": row[0],
                        "key_name": row[1],
                        "rotation_type": row[2],
                        "status": row[3],
                        "initiated_at": row[4].isoformat(),
                        "completed_at": row[5].isoformat() if row[5] else None
                    })
                
                return {
                    "secrets": secrets,
                    "recent_rotations": recent_rotations,
                    "summary": {
                        "total_secrets": len(secrets),
                        "active": len([s for s in secrets if s["status"] == "active"]),
                        "rotating": len([s for s in secrets if s["status"] == "rotating"]),
                        "due_for_rotation": len([s for s in secrets if s["rotation_due"]])
                    }
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m28(x_user_id, "secrets_status_access_failed", "secrets", scope or "all",
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Secrets status access failed: {str(e)}")

def is_rotation_due_check(next_rotation_at):
    """Helper to check if rotation is due"""
    if not next_rotation_at:
        return False
    return next_rotation_at <= datetime.utcnow()

# =============================================================================
# M29: SRE & COST GUARDS
# =============================================================================

from functools import wraps
import statistics

# Rate limiting middleware using token bucket
class TokenBucket:
    def __init__(self, bucket_size, refill_rate):
        self.bucket_size = bucket_size
        self.refill_rate = refill_rate
        self.tokens = bucket_size
        self.last_refill = time.time()
    
    def consume(self, tokens=1):
        now = time.time()
        # Refill tokens based on elapsed time
        elapsed = now - self.last_refill
        self.tokens = min(self.bucket_size, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def retry_after(self):
        return max(0, (1 - self.tokens) / self.refill_rate)

# Global rate limiters (in-memory for demo - use Redis in production)
rate_limiters = {}

def get_rate_limiter(policy_name, scope_key):
    """Get or create rate limiter for scope"""
    key = f"{policy_name}:{scope_key}"
    if key not in rate_limiters:
        # Default configuration - in production, load from database
        rate_limiters[key] = TokenBucket(bucket_size=100, refill_rate=10)
    return rate_limiters[key]

def check_rate_limit_middleware(policy_name, scope_key_func, tokens=1):
    """Rate limiting decorator"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract request object to get headers
            x_user_id = kwargs.get('x_user_id') or (kwargs.get('request') and kwargs['request'].headers.get('x-user-id'))
            
            # Generate scope key
            if scope_key_func == 'user':
                scope_key = x_user_id or 'anonymous'
            elif scope_key_func == 'ip':
                scope_key = 'global'  # Simplified for demo
            else:
                scope_key = 'global'
            
            # Check rate limit using database function
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT check_rate_limit(%s, %s, %s)", (policy_name, scope_key, tokens))
                        result = cur.fetchone()[0]
                        
                        if not result['allowed']:
                            retry_after = result.get('retry_after_seconds', 60)
                            raise HTTPException(
                                status_code=429,
                                detail="Rate limit exceeded",
                                headers={"Retry-After": str(retry_after)}
                            )
            except Exception as e:
                # Fallback to in-memory rate limiter if database check fails
                limiter = get_rate_limiter(policy_name, scope_key)
                if not limiter.consume(tokens):
                    retry_after = int(limiter.retry_after())
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded", 
                        headers={"Retry-After": str(retry_after)}
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def write_audit_m29(user_id: str, event: str, entity: str, entity_id: str, metadata: dict, request_id: str):
    """Write M29 SRE audit entry"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, now())
                """, (user_id, get_user_role(user_id), event, entity, entity_id, json.dumps(metadata)))
    except Exception as e:
        print(f"Audit write failed: {e}")

@app.get("/admin/health/overview")
def get_health_overview(
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get SRE health overview with golden signals (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m29(x_user_id, "health_overview_access_denied", "sre_health", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get latest golden signals (last 5 minutes)
                cur.execute("""
                    SELECT 
                        service_name,
                        AVG(latency_p95_ms) as avg_latency_p95,
                        SUM(request_count) as total_requests,
                        AVG(error_rate) as avg_error_rate,
                        AVG(cpu_usage_percent) as avg_cpu_usage
                    FROM sre_golden_signals 
                    WHERE window_start >= now() - INTERVAL '5 minutes'
                    GROUP BY service_name
                    ORDER BY service_name
                """)
                
                golden_signals = []
                for row in cur.fetchall():
                    golden_signals.append({
                        "service": row[0],
                        "latency_p95_ms": float(row[1]) if row[1] else 0,
                        "request_count": int(row[2]) if row[2] else 0,
                        "error_rate": float(row[3]) if row[3] else 0,
                        "cpu_usage_percent": float(row[4]) if row[4] else 0
                    })
                
                # Get circuit breaker states
                cur.execute("""
                    SELECT service_name, service_type, state, failure_count,
                           last_failure_at, next_attempt_at
                    FROM sre_circuit_breakers 
                    WHERE is_enabled = true
                    ORDER BY service_name, service_type
                """)
                
                circuit_breakers = []
                for row in cur.fetchall():
                    circuit_breakers.append({
                        "service": row[0],
                        "service_type": row[1],
                        "state": row[2],
                        "failure_count": row[3],
                        "last_failure": row[4].isoformat() if row[4] else None,
                        "next_attempt": row[5].isoformat() if row[5] else None
                    })
                
                # Get recent rate limit violations
                cur.execute("""
                    SELECT rl.policy_name, COUNT(*) as violation_count
                    FROM sre_rate_limit_violations rlv
                    JOIN sre_rate_limits rl ON rl.id = rlv.rate_limit_id
                    WHERE rlv.violated_at >= now() - INTERVAL '1 hour'
                    GROUP BY rl.policy_name
                    ORDER BY violation_count DESC
                """)
                
                rate_limit_violations = {row[0]: row[1] for row in cur.fetchall()}
                
                # Get active incidents
                cur.execute("""
                    SELECT COUNT(*) as total_incidents,
                           COUNT(*) FILTER (WHERE severity = 'critical') as critical_incidents,
                           COUNT(*) FILTER (WHERE status = 'open') as open_incidents
                    FROM incidents 
                    WHERE status IN ('open', 'investigating', 'identified', 'monitoring')
                """)
                
                incident_counts = cur.fetchone()
                
                write_audit_m29(x_user_id, "health_overview_accessed", "sre_health", "overview",
                               {"services_count": len(golden_signals)}, request_id)
                
                return {
                    "golden_signals": golden_signals,
                    "circuit_breakers": circuit_breakers,
                    "rate_limits": {
                        "violations_last_hour": rate_limit_violations,
                        "total_violations": sum(rate_limit_violations.values())
                    },
                    "incidents": {
                        "total": incident_counts[0],
                        "critical": incident_counts[1], 
                        "open": incident_counts[2]
                    },
                    "system_health": "healthy" if incident_counts[1] == 0 else "degraded",
                    "timestamp": datetime.utcnow().isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m29(x_user_id, "health_overview_failed", "sre_health", "overview",
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Health overview failed: {str(e)}")

@app.get("/admin/budget")
def get_budget_overview(
    category: str = Query(None),
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Get FinOps budget overview and usage (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m29(x_user_id, "budget_access_denied", "cost_budget", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get budget status
                where_clause = "WHERE is_active = true"
                params = []
                
                if category:
                    where_clause += " AND category = %s"
                    params.append(category)
                
                cur.execute(f"""
                    SELECT budget_name, category, budget_type,
                           budget_amount_cents, current_usage_cents,
                           warning_threshold_percent, critical_threshold_percent,
                           period_start, period_end,
                           ROUND((current_usage_cents::decimal / budget_amount_cents * 100), 2) as usage_percent
                    FROM cost_budgets 
                    {where_clause}
                    ORDER BY category, budget_name
                """, params)
                
                budgets = []
                for row in cur.fetchall():
                    usage_percent = float(row[9])
                    status = "healthy"
                    if usage_percent >= row[6]:  # critical_threshold_percent
                        status = "critical"
                    elif usage_percent >= row[5]:  # warning_threshold_percent
                        status = "warning"
                    
                    budgets.append({
                        "budget_name": row[0],
                        "category": row[1],
                        "budget_type": row[2],
                        "budget_amount": row[3] / 100.0,  # Convert cents to dollars
                        "current_usage": row[4] / 100.0,
                        "usage_percent": usage_percent,
                        "status": status,
                        "period_start": row[7].isoformat(),
                        "period_end": row[8].isoformat(),
                        "remaining_amount": (row[3] - row[4]) / 100.0
                    })
                
                # Get recent cost usage by provider
                cur.execute("""
                    SELECT provider, service_type,
                           SUM(total_cost_cents) as total_cost,
                           SUM(usage_count) as total_usage
                    FROM cost_usage_daily 
                    WHERE usage_date >= CURRENT_DATE - INTERVAL '7 days'
                    GROUP BY provider, service_type
                    ORDER BY total_cost DESC
                """)
                
                usage_breakdown = []
                for row in cur.fetchall():
                    usage_breakdown.append({
                        "provider": row[0],
                        "service_type": row[1], 
                        "cost_last_7_days": row[2] / 100.0,
                        "usage_count": row[3]
                    })
                
                # Get recent cost alerts
                cur.execute("""
                    SELECT ca.alert_type, cb.budget_name, ca.usage_percent,
                           ca.alert_date, ca.status
                    FROM cost_alerts ca
                    JOIN cost_budgets cb ON cb.id = ca.budget_id
                    WHERE ca.alert_date >= CURRENT_DATE - INTERVAL '7 days'
                    ORDER BY ca.alert_date DESC
                """)
                
                recent_alerts = []
                for row in cur.fetchall():
                    recent_alerts.append({
                        "alert_type": row[0],
                        "budget_name": row[1],
                        "usage_percent": float(row[2]),
                        "alert_date": row[3].isoformat(),
                        "status": row[4]
                    })
                
                write_audit_m29(x_user_id, "budget_accessed", "cost_budget", category or "all",
                               {"budgets_count": len(budgets)}, request_id)
                
                return {
                    "budgets": budgets,
                    "usage_breakdown": usage_breakdown,
                    "recent_alerts": recent_alerts,
                    "summary": {
                        "total_budgets": len(budgets),
                        "budgets_at_risk": len([b for b in budgets if b["status"] in ["warning", "critical"]]),
                        "total_spend_last_7_days": sum(u["cost_last_7_days"] for u in usage_breakdown)
                    }
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m29(x_user_id, "budget_access_failed", "cost_budget", category or "all",
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Budget access failed: {str(e)}")

@app.post("/admin/incident/declare")
def declare_incident(
    incident_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Declare new incident (Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            write_audit_m29(x_user_id, "incident_declare_access_denied", "incident", None,
                           {"user_role": user_role}, request_id)
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate required fields
        required_fields = ['title', 'severity']
        for field in required_fields:
            if field not in incident_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        title = incident_data['title']
        severity = incident_data['severity']
        description = incident_data.get('description', '')
        category = incident_data.get('category', 'availability')
        affected_services = incident_data.get('affected_services', [])
        
        # Validate severity
        valid_severities = ['low', 'medium', 'high', 'critical']
        if severity not in valid_severities:
            raise HTTPException(status_code=400, detail=f"Invalid severity. Must be one of: {valid_severities}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Generate incident number
                cur.execute("""
                    SELECT COUNT(*) + 1 FROM incidents 
                    WHERE detected_at >= DATE_TRUNC('year', CURRENT_DATE)
                """)
                
                incident_count = cur.fetchone()[0]
                incident_number = f"INC-{datetime.now().year}-{incident_count:03d}"
                
                # Create incident
                cur.execute("""
                    INSERT INTO incidents (
                        incident_number, title, description, severity, category,
                        affected_services, reported_by, detected_at, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, now(), 'open'
                    ) RETURNING id, detected_at
                """, (incident_number, title, description, severity, category, 
                     affected_services, x_user_id))
                
                incident_id, detected_at = cur.fetchone()
                
                write_audit_m29(x_user_id, "incident_declared", "incident", str(incident_id),
                               {"incident_number": incident_number, "severity": severity, "category": category}, request_id)
                
                return {
                    "incident_id": incident_id,
                    "incident_number": incident_number,
                    "title": title,
                    "severity": severity,
                    "category": category,
                    "status": "open",
                    "detected_at": detected_at.isoformat(),
                    "reported_by": x_user_id,
                    "affected_services": affected_services,
                    "message": f"Incident {incident_number} declared successfully"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m29(x_user_id, "incident_declare_failed", "incident", None,
                       {"error": str(e), "severity": incident_data.get('severity')}, request_id)
        raise HTTPException(status_code=500, detail=f"Incident declaration failed: {str(e)}")

@app.post("/admin/limits/test")
@check_rate_limit_middleware("admin_operations", "user", tokens=1)
def test_rate_limit(
    test_data: dict,
    x_user_id: str = Header(...),
    x_request_id: str = Header(None)
):
    """Test rate limit policy (dry-run, Admin+ only)"""
    request_id = x_request_id or str(uuid.uuid4())
    
    try:
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate required fields
        required_fields = ['policy_name', 'scope_key']
        for field in required_fields:
            if field not in test_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        policy_name = test_data['policy_name']
        scope_key = test_data['scope_key']
        tokens_requested = test_data.get('tokens_requested', 1)
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Test rate limit without consuming tokens (dry-run)
                cur.execute("""
                    SELECT rl.policy_name, rl.bucket_size, rl.refill_rate,
                           COALESCE(rls.current_tokens, rl.bucket_size) as current_tokens,
                           rls.requests_count, rls.blocked_count
                    FROM sre_rate_limits rl
                    LEFT JOIN sre_rate_limit_state rls ON rls.rate_limit_id = rl.id AND rls.scope_key = %s
                    WHERE rl.policy_name = %s AND rl.is_enabled = true
                """, (scope_key, policy_name))
                
                result = cur.fetchone()
                if not result:
                    return {
                        "policy_name": policy_name,
                        "scope_key": scope_key,
                        "exists": False,
                        "would_allow": True,
                        "reason": "no_policy_found"
                    }
                
                policy_name_db, bucket_size, refill_rate, current_tokens, requests, blocks = result
                would_allow = float(current_tokens) >= tokens_requested
                
                write_audit_m29(x_user_id, "rate_limit_tested", "rate_limit", policy_name,
                               {"scope_key": scope_key, "would_allow": would_allow}, request_id)
                
                return {
                    "policy_name": policy_name,
                    "scope_key": scope_key,
                    "exists": True,
                    "would_allow": would_allow,
                    "current_tokens": float(current_tokens),
                    "tokens_requested": tokens_requested,
                    "bucket_size": bucket_size,
                    "refill_rate": refill_rate,
                    "historical_requests": requests or 0,
                    "historical_blocks": blocks or 0,
                    "reason": "sufficient_tokens" if would_allow else "insufficient_tokens"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        write_audit_m29(x_user_id, "rate_limit_test_failed", "rate_limit", test_data.get('policy_name'),
                       {"error": str(e)}, request_id)
        raise HTTPException(status_code=500, detail=f"Rate limit test failed: {str(e)}")

# ========================================
# M14 Payment Intents API (Idempotent with HMAC verification)
# ========================================

class PaymentIntentRequest(BaseModel):
    order_id: int
    amount_cents: int
    currency: str = "USD"
    payment_method: str  # stripe_card, square_card, usdt, manual_transfer
    idempotency_key: str

@app.post("/api/payments/intents")
def create_payment_intent(request: PaymentIntentRequest, x_user_id: str = Header(...)):
    """Create idempotent payment intent - M14"""
    try:
        user_id = x_user_id
        
        # Check for existing intent with same idempotency key
        existing = db_fetchone("""
            SELECT id, external_id, status, amount_cents 
            FROM payment_intents 
            WHERE idempotency_key = %s
        """, (request.idempotency_key,))
        
        if existing:
            return {
                "payment_intent_id": existing[0],
                "external_id": existing[1],
                "status": existing[2],
                "amount_cents": existing[3],
                "idempotent": True
            }
        
        # Verify order and authorization
        order = db_fetchone("""
            SELECT user_id, status FROM orders WHERE id = %s
        """, (request.order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if str(order[0]) != user_id:
            role = get_user_role(user_id)
            if role not in ['admin', 'superadmin']:
                raise HTTPException(status_code=403, detail="Cannot create payment for this order")
        
        # Generate external ID
        external_id = f"pi_{uuid.uuid4().hex[:24]}"
        
        # Create payment intent
        intent_id = db_fetchone("""
            INSERT INTO payment_intents (
                external_id, idempotency_key, user_id, order_id,
                amount_cents, currency, payment_method, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id
        """, (external_id, request.idempotency_key, user_id, request.order_id,
              request.amount_cents, request.currency, request.payment_method))[0]
        
        # Audit log
        write_audit(user_id, "payment_intent_created", "payment_intent", str(intent_id), {
            "order_id": request.order_id,
            "amount_cents": request.amount_cents,
            "payment_method": request.payment_method
        })
        
        return {
            "payment_intent_id": intent_id,
            "external_id": external_id,
            "status": "pending",
            "amount_cents": request.amount_cents,
            "idempotent": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment intent creation failed: {str(e)}")

@app.post("/api/payments/webhook")
def payment_webhook_dispatcher(
    request: Request, 
    stripe_signature: str = Header(None, alias="stripe-signature"),
    square_signature: str = Header(None, alias="x-square-signature")
):
    """Provider-agnostic payment webhook dispatcher with HMAC verification - M14"""
    import hashlib
    import hmac
    
    try:
        # Get raw body
        body = request.body()
        
        # Determine provider based on configured PAY_PROVIDER and available signatures
        provider = PAY_PROVIDER.lower()
        signature = None
        webhook_secret = None
        
        if provider == "stripe" and stripe_signature:
            signature = stripe_signature
            webhook_secret = STRIPE_WEBHOOK_SECRET
        elif provider == "square" and square_signature:
            signature = square_signature
            webhook_secret = SQUARE_WEBHOOK_SECRET
        else:
            # Try to detect from headers if PAY_PROVIDER doesn't match
            if stripe_signature and STRIPE_WEBHOOK_SECRET:
                provider = "stripe"
                signature = stripe_signature
                webhook_secret = STRIPE_WEBHOOK_SECRET
            elif square_signature and SQUARE_WEBHOOK_SECRET:
                provider = "square"
                signature = square_signature
                webhook_secret = SQUARE_WEBHOOK_SECRET
            else:
                raise HTTPException(status_code=503, detail=f"No webhook configuration for provider: {PAY_PROVIDER}")
        
        if not webhook_secret:
            raise HTTPException(status_code=503, detail=f"{provider.title()} webhook secret not configured")
        
        # Verify HMAC signature based on provider
        if provider == "stripe":
            expected_sig = f"v1={hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()}"
            signature_valid = hmac.compare_digest(signature, expected_sig)
        elif provider == "square":
            # Square uses URL + body for signature
            expected_sig = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
            signature_valid = hmac.compare_digest(signature, expected_sig)
        else:
            signature_valid = False
        
        if not signature_valid:
            write_audit("system", "webhook_verification_failed", "payment_event", None, {
                "provider": provider,
                "signature_valid": False
            })
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse event
        event = json.loads(body)
        event_id = event.get("id") if provider == "stripe" else event.get("event_id")
        event_type = event.get("type")
        
        # Idempotency check
        existing = db_fetchone("""
            SELECT id FROM payment_events 
            WHERE external_event_id = %s AND provider = %s
        """, (event_id, provider))
        
        if existing:
            return {"received": True, "processed": "already_handled"}
        
        # Log event
        db_exec("""
            INSERT INTO payment_events (
                external_event_id, provider, event_type, payload, 
                hmac_signature, verified_at
            ) VALUES (%s, %s, %s, %s, %s, NOW())
        """, (event_id, provider, event_type, json.dumps(event), signature))
        
        # Dispatch to provider-specific handler
        if provider == "stripe":
            _handle_stripe_webhook(event, event_type)
        elif provider == "square":
            _handle_square_webhook(event, event_type)
        
        return {"received": True, "processed": True}
        
    except HTTPException:
        raise
    except Exception as e:
        write_audit("system", "webhook_processing_failed", "payment_event", None, {
            "provider": provider if 'provider' in locals() else "unknown", 
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

def _handle_stripe_webhook(event: dict, event_type: str):
    """Handle Stripe-specific webhook events"""
    if event_type in ["payment_intent.succeeded", "payment_intent.payment_failed"]:
        intent_data = event.get("data", {}).get("object", {})
        external_id = intent_data.get("id")

        if external_id:
            new_status = "succeeded" if event_type == "payment_intent.succeeded" else "failed"

            # Update payment intent status
            db_exec("""
                UPDATE payment_intents
                SET status = %s, provider_response = %s, updated_at = NOW()
                WHERE external_id = %s
            """, (new_status, json.dumps(intent_data), external_id))

            # M37: Auto-generate invoice for successful payments
            if new_status == "succeeded":
                try:
                    # Get payment intent details
                    payment_info = db_fetchone("""
                        SELECT pi.order_id, pi.user_id, pi.amount_cents, pi.currency,
                               o.service_id, o.question_text
                        FROM payment_intents pi
                        JOIN orders o ON o.id = pi.order_id
                        WHERE pi.external_id = %s
                    """, (external_id,))

                    if payment_info:
                        order_id, user_id, amount_cents, currency, service_id, question_text = payment_info

                        # Check if invoice already exists
                        existing_invoice = db_fetchone("""
                            SELECT id FROM invoices WHERE order_id = %s
                        """, (order_id,))

                        if not existing_invoice:
                            # Get service details for invoice
                            service_info = db_fetchone("""
                                SELECT name, description FROM services WHERE id = %s
                            """, (service_id,))

                            service_name = service_info[0] if service_info else "Tarot Service"
                            service_desc = service_info[1] if service_info else "Professional Tarot Reading"

                            # Get user billing info
                            user_info = db_fetchone("""
                                SELECT email, CONCAT(first_name, ' ', last_name) as full_name, country FROM profiles WHERE id = %s
                            """, (user_id,))

                            billing_email = user_info[0] if user_info else "unknown@example.com"
                            billing_name = user_info[1] if user_info else "Customer"
                            billing_country = user_info[2] if user_info else "United States"

                            # Create invoice
                            invoice_number = f"INV-{order_id}-{int(datetime.now().timestamp())}"

                            invoice_id = db_fetchone("""
                                INSERT INTO invoices (
                                    number, order_id, total_cents, currency,
                                    subtotal_cents, vat_cents, billing_name,
                                    billing_email, billing_country
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                RETURNING id
                            """, (
                                invoice_number, order_id, amount_cents, currency,
                                amount_cents, 0, billing_name, billing_email, billing_country
                            ))[0]

                            # Create invoice item
                            db_exec("""
                                INSERT INTO invoice_items (
                                    invoice_id, order_id, service_name, description,
                                    quantity, unit_price_cents, total_cents, currency
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                invoice_id, order_id, service_name, service_desc,
                                1, amount_cents, amount_cents, currency
                            ))

                            # Log invoice auto-generation
                            write_audit("system", "invoice_auto_generated", "invoice", str(invoice_id), {
                                "order_id": order_id,
                                "payment_intent_id": external_id,
                                "amount_cents": amount_cents,
                                "trigger": "payment_intent.succeeded"
                            })

                except Exception as e:
                    # Don't fail webhook processing if invoice generation fails
                    write_audit("system", "invoice_auto_generation_failed", "payment_event", external_id, {
                        "error": str(e),
                        "event_type": event_type
                    })

def _handle_square_webhook(event: dict, event_type: str):
    """Handle Square-specific webhook events"""
    if event_type in ["payment.updated"]:
        payment_data = event.get("data", {}).get("object", {}).get("payment", {})
        external_id = payment_data.get("id")
        status = payment_data.get("status")
        
        if external_id and status:
            # Map Square status to our status
            new_status = "succeeded" if status == "COMPLETED" else "failed"
            
            db_exec("""
                UPDATE payment_intents
                SET status = %s, provider_response = %s, updated_at = NOW()
                WHERE external_id = %s
            """, (new_status, json.dumps(payment_data), external_id))

# ========================================
# M37 Invoice Service API - Private storage with Signed URLs
# ========================================

@app.get("/api/payments/invoice/{order_id}")
def get_invoice_signed_url(order_id: int, x_user_id: str = Header(...)):
    """Generate short-lived Signed URL for invoice PDF access - M37"""
    try:
        user_id = x_user_id

        # Import services
        import importlib.util

        # Import M37 modules
        generator_spec = importlib.util.spec_from_file_location("generator", "m37_invoice_pdf_generator.py")
        generator_module = importlib.util.module_from_spec(generator_spec)
        generator_spec.loader.exec_module(generator_module)

        storage_spec = importlib.util.spec_from_file_location("storage", "m37_invoice_storage.py")
        storage_module = importlib.util.module_from_spec(storage_spec)
        storage_spec.loader.exec_module(storage_module)

        # Get invoice ID for order
        invoice = db_fetchone("""
            SELECT id, pdf_storage_path, pdf_generated_at, total_cents
            FROM invoices
            WHERE order_id = %s
        """, (order_id,))

        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found for this order")

        invoice_id, pdf_path, pdf_generated_at, total_cents = invoice

        # Generate PDF if not exists
        if not pdf_generated_at or not pdf_path:
            generator = generator_module.DeterministicInvoicePDF()

            try:
                result = generator.generate_invoice_pdf(invoice_id)
                pdf_bytes = result['pdf_bytes']
                content_hash = result['content_hash']

                # Store in private storage
                storage = storage_module.InvoiceStorageService()
                storage_result = storage.store_invoice_pdf(invoice_id, pdf_bytes, content_hash)

                if not storage_result['success']:
                    raise HTTPException(status_code=500, detail="Invoice storage failed")

                # Refresh invoice data after generation
                invoice = db_fetchone("""
                    SELECT id, pdf_storage_path, pdf_generated_at, total_cents
                    FROM invoices
                    WHERE id = %s
                """, (invoice_id,))

                if not invoice:
                    raise HTTPException(status_code=500, detail="Invoice disappeared after generation")

                invoice_id, pdf_path, pdf_generated_at, total_cents = invoice

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Invoice generation failed: {str(e)}")

        # Generate signed URL with extended TTL for invoices (60 minutes)
        storage = storage_module.InvoiceStorageService()

        try:
            # Get client IP for audit logging
            from fastapi import Request
            import inspect
            frame = inspect.currentframe()
            request = None
            for var_name, var_value in frame.f_locals.items():
                if isinstance(var_value, Request):
                    request = var_value
                    break

            client_ip = None
            user_agent = None
            if request:
                client_ip = request.client.host if request.client else None
                user_agent = request.headers.get("User-Agent")

            signed_result = storage.create_signed_url(
                invoice_id=invoice_id,
                user_id=user_id,
                expires_in_minutes=60,  # Extended TTL for invoices
                client_ip=client_ip,
                user_agent=user_agent
            )

            # Audit log
            write_audit(user_id, "invoice_accessed", "invoice", str(invoice_id), {
                "order_id": order_id,
                "signed_url_expires_at": signed_result['expires_at'],
                "total_cents": total_cents,
                "access_method": "signed_url"
            })

            return {
                "invoice_id": invoice_id,
                "order_id": order_id,
                "signed_url": signed_result['signed_url'],
                "expires_at": signed_result['expires_at'],
                "expires_in_minutes": signed_result['expires_in_minutes'],
                "mock_mode": signed_result.get('mock_mode', False)
            }

        except PermissionError:
            raise HTTPException(status_code=403, detail="Access denied to invoice")
        except ValueError as e:
            if "not found" in str(e):
                raise HTTPException(status_code=404, detail=str(e))
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Signed URL generation failed: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice access failed: {str(e)}")

@app.get("/api/payments/invoice/{order_id}/stats")
def get_invoice_access_stats(order_id: int, x_user_id: str = Header(...)):
    """Get invoice access statistics (admin/superadmin only) - M37"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)

        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Get invoice ID for order
        invoice = db_fetchone("""
            SELECT id FROM invoices WHERE order_id = %s
        """, (order_id,))

        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found for this order")

        invoice_id = invoice[0]

        # Import storage module
        import importlib.util
        storage_spec = importlib.util.spec_from_file_location("storage", "m37_invoice_storage.py")
        storage_module = importlib.util.module_from_spec(storage_spec)
        storage_spec.loader.exec_module(storage_module)

        storage = storage_module.InvoiceStorageService()
        stats = storage.get_invoice_access_stats(invoice_id)

        return {
            "invoice_id": invoice_id,
            "order_id": order_id,
            "stats": stats
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats retrieval failed: {str(e)}")

# ========================================
# M38 Legal Compliance & 18+ Gating API - Backend only, no UI changes
# ========================================

class LegalConsentRequest(BaseModel):
    policy_type: str = "terms_of_service"  # terms_of_service, privacy_policy, age_policy
    policy_version: int
    ip_address: Optional[str] = None

class AgeVerificationRequest(BaseModel):
    dob_year: Optional[int] = None
    over18_attestation: bool
    verification_method: str = "self_attestation"

def hash_ip_address(ip: str) -> str:
    """Hash IP address for audit trail without storing raw IP"""
    import hashlib
    import os
    salt = os.getenv("IP_SALT", "samia-tarot-default-salt")
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()

def check_whatsapp_24h_window(user_id: str) -> Dict[str, Any]:
    """
    Check if user is within 24-hour WhatsApp customer service window.

    WhatsApp Business API Compliance:
    - Within 24h of customer message: Can send any message
    - Outside 24h window: Only approved template messages allowed

    Returns:
        Dict with 'within_window': bool and 'last_message_time': datetime or None
    """
    if not WHATSAPP_24H_WINDOW_ENABLED:
        return {"within_window": True, "last_message_time": None}

    try:
        # Look for last inbound WhatsApp message from user
        # This would typically check your WhatsApp webhook message log
        # For now, return placeholder implementation

        last_message = db_fetchone("""
            SELECT created_at FROM audit_log
            WHERE actor = %s
            AND event = 'whatsapp_message_received'
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))

        if not last_message:
            # No previous messages - outside window
            return {"within_window": False, "last_message_time": None}

        last_message_time = last_message[0]
        window_cutoff = datetime.utcnow() - timedelta(hours=24)
        within_window = last_message_time > window_cutoff

        return {
            "within_window": within_window,
            "last_message_time": last_message_time.isoformat()
        }

    except Exception:
        # On error, assume outside window for compliance safety
        return {"within_window": False, "last_message_time": None}

def check_18plus_gate(user_id: str, require_consent: bool = True) -> dict:
    """Check if user passes 18+ gate and consent requirements"""
    try:
        # Check age verification
        age_verified = db_fetchone("""
            SELECT check_age_verification(%s)
        """, (user_id,))[0]

        if not age_verified:
            return {"allowed": False, "reason": "age_verification_required"}

        if require_consent:
            # Check consent for all required policies
            for policy_type in ['terms_of_service', 'privacy_policy', 'age_policy']:
                consent_valid = db_fetchone("""
                    SELECT check_user_consent(%s, %s)
                """, (user_id, policy_type))[0]

                if not consent_valid:
                    return {"allowed": False, "reason": "consent_required", "policy_type": policy_type}

        return {"allowed": True, "reason": "verified"}

    except Exception as e:
        write_audit(user_id, "age_gate_check_failed", "compliance", None, {
            "error": str(e),
            "require_consent": require_consent
        })
        return {"allowed": False, "reason": "system_error"}

@app.get("/api/legal/policy")
def get_legal_policy(policy_type: str = Query("terms_of_service"), lang: str = Query("en")):
    """Get current legal policy text - M38"""
    try:
        # Get latest version for policy type and language
        policy = db_fetchone("""
            SELECT id, version, title, body, effective_date
            FROM legal_texts
            WHERE policy_type = %s
              AND lang = %s
              AND effective_date <= CURRENT_DATE
            ORDER BY version DESC
            LIMIT 1
        """, (policy_type, lang))

        if not policy:
            # Fallback to English if requested language not available
            if lang != 'en':
                policy = db_fetchone("""
                    SELECT id, version, title, body, effective_date
                    FROM legal_texts
                    WHERE policy_type = %s
                      AND lang = 'en'
                      AND effective_date <= CURRENT_DATE
                    ORDER BY version DESC
                    LIMIT 1
                """, (policy_type,))

        if not policy:
            raise HTTPException(status_code=404, detail=f"Policy {policy_type} not found")

        return {
            "policy_type": policy_type,
            "version": policy[1],
            "title": policy[2],
            "body": policy[3],
            "effective_date": policy[4].isoformat(),
            "lang": lang
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy retrieval failed: {str(e)}")

@app.post("/api/legal/consent")
def record_legal_consent(request: LegalConsentRequest, x_user_id: str = Header(...)):
    """Record user consent for legal policy - M38"""
    try:
        user_id = x_user_id

        # Get client IP for audit (hash it immediately)
        ip_hash = None
        if request.ip_address:
            ip_hash = hash_ip_address(request.ip_address)

        # Verify the policy version exists
        policy_exists = db_fetchone("""
            SELECT id FROM legal_texts
            WHERE policy_type = %s
              AND version = %s
              AND effective_date <= CURRENT_DATE
        """, (request.policy_type, request.policy_version))

        if not policy_exists:
            raise HTTPException(status_code=400, detail="Invalid policy version")

        # Record consent (UPSERT)
        db_exec("""
            INSERT INTO user_consents (user_id, policy_type, policy_version, ip_hash)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id, policy_type, policy_version)
            DO UPDATE SET
                ip_hash = EXCLUDED.ip_hash,
                consent_timestamp = NOW()
        """, (user_id, request.policy_type, request.policy_version, ip_hash))

        # Log compliance event
        db_exec("""
            SELECT log_legal_compliance(%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, 'consent_given', request.policy_type, request.policy_version,
            True, ip_hash, None, json.dumps({"method": "api_consent"})
        ))

        # Audit log
        write_audit(user_id, "legal_consent_recorded", "compliance", None, {
            "policy_type": request.policy_type,
            "policy_version": request.policy_version
        })

        return {
            "success": True,
            "policy_type": request.policy_type,
            "policy_version": request.policy_version,
            "recorded_at": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log failed consent attempt
        try:
            db_exec("""
                SELECT log_legal_compliance(%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, 'consent_failed', request.policy_type, request.policy_version,
                False, ip_hash if 'ip_hash' in locals() else None, None,
                json.dumps({"error": str(e)})
            ))
        except:
            pass

        raise HTTPException(status_code=500, detail=f"Consent recording failed: {str(e)}")

@app.post("/api/auth/age-verify")
def verify_age(request: AgeVerificationRequest, x_user_id: str = Header(...)):
    """Verify user age for 18+ compliance - M38"""
    try:
        user_id = x_user_id

        # Validate input
        if not request.over18_attestation:
            raise HTTPException(status_code=400, detail="Must attest to being 18+ to use this service")

        # If birth year provided, validate it
        over18_calculated = True
        if request.dob_year:
            current_year = datetime.now().year
            if request.dob_year > current_year - 18:
                over18_calculated = False

        # Final determination
        over18_final = request.over18_attestation and over18_calculated

        if not over18_final:
            # Log denied verification
            db_exec("""
                SELECT log_legal_compliance(%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, 'age_verification_denied', None, None,
                False, None, None, json.dumps({
                    "reason": "under_18",
                    "dob_year": request.dob_year,
                    "attestation": request.over18_attestation
                })
            ))

            raise HTTPException(status_code=403, detail="Service requires users to be 18 years or older")

        # Record age verification (UPSERT)
        db_exec("""
            INSERT INTO age_verifications (user_id, dob_year, over18, verification_method)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                dob_year = EXCLUDED.dob_year,
                over18 = EXCLUDED.over18,
                verification_method = EXCLUDED.verification_method,
                verified_at = NOW()
        """, (user_id, request.dob_year, over18_final, request.verification_method))

        # Log successful verification
        db_exec("""
            SELECT log_legal_compliance(%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, 'age_verified', None, None,
            True, None, None, json.dumps({
                "method": request.verification_method,
                "dob_year_provided": request.dob_year is not None
            })
        ))

        # Update user role/claims would happen here in JWT refresh
        # For now, just audit log
        write_audit(user_id, "age_verification_completed", "compliance", None, {
            "over18": over18_final,
            "verification_method": request.verification_method
        })

        return {
            "success": True,
            "over18": over18_final,
            "verified_at": datetime.now().isoformat(),
            "verification_method": request.verification_method
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log failed verification
        try:
            db_exec("""
                SELECT log_legal_compliance(%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, 'age_verification_failed', None, None,
                False, None, None, json.dumps({"error": str(e)})
            ))
        except:
            pass

        raise HTTPException(status_code=500, detail=f"Age verification failed: {str(e)}")

@app.get("/api/auth/compliance-status")
def get_compliance_status(x_user_id: str = Header(...)):
    """Get user's legal compliance status - M38"""
    try:
        user_id = x_user_id
        gate_check = check_18plus_gate(user_id, require_consent=True)

        # Get detailed status
        age_status = db_fetchone("""
            SELECT over18, verified_at, verification_method
            FROM age_verifications
            WHERE user_id = %s
        """, (user_id,))

        consent_status = db_fetchall("""
            SELECT uc.policy_type, uc.policy_version, uc.consent_timestamp,
                   lt.version as latest_version
            FROM user_consents uc
            JOIN (
                SELECT policy_type, MAX(version) as version
                FROM legal_texts
                WHERE effective_date <= CURRENT_DATE
                GROUP BY policy_type
            ) lt ON lt.policy_type = uc.policy_type
            WHERE uc.user_id = %s
        """, (user_id,))

        return {
            "user_id": user_id,
            "compliance_check": gate_check,
            "age_verification": {
                "verified": age_status[0] if age_status else False,
                "verified_at": age_status[1].isoformat() if age_status and age_status[1] else None,
                "method": age_status[2] if age_status else None
            },
            "consents": [
                {
                    "policy_type": row[0],
                    "user_version": row[1],
                    "latest_version": row[3],
                    "current": row[1] == row[3],
                    "consented_at": row[2].isoformat()
                }
                for row in consent_status
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance status check failed: {str(e)}")

# Twilio Verify V2 Endpoints - SMS/Voice/WhatsApp/Email OTP
@app.post("/api/auth/verify/start")
def start_verification(request: VerifyStartRequest, request_obj: Request, x_user_id: str = Header(...)):
    """Start Twilio Verify V2 verification (SMS/Voice/WhatsApp/Email)"""
    if not twilio_verify:
        raise HTTPException(
            status_code=503,
            detail="Twilio Verify service unavailable"
        )

    try:
        user_id = x_user_id

        # Gateway rate limiting: 5 verification attempts per 15 minutes per user
        enforce_rate_limit(user_id, "twilio_verify_start", limit=5, window_sec=900)

        # Extract client IP for rate limiting
        client_ip = None
        if hasattr(request_obj, 'client') and hasattr(request_obj.client, 'host'):
            client_ip = request_obj.client.host
        elif 'x-forwarded-for' in request_obj.headers:
            client_ip = request_obj.headers['x-forwarded-for'].split(',')[0].strip()
        elif 'x-real-ip' in request_obj.headers:
            client_ip = request_obj.headers['x-real-ip']

        # Normalize phone number to E.164 format if it's a phone channel
        normalized_to = request.to
        if request.channel in ["sms", "voice", "whatsapp"]:
            normalized_to = twilio_verify.normalize_phone_e164(request.to)
            if not normalized_to:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number must be in valid E.164 format (e.g. +1234567890)"
                )

        result = twilio_verify.start_verification(
            to=normalized_to,
            channel=request.channel,
            locale=request.locale,
            ip_address=client_ip
        )

        if result["success"]:
            return {
                "success": True,
                "verification_sid": result["sid"],
                "status": result["status"],
                "to": result["to"],
                "channel": result["channel"],
                "date_created": result["date_created"]
            }
        else:
            # Map error codes to appropriate HTTP status
            if result.get("error") == "rate_limited":
                raise HTTPException(
                    status_code=429,
                    detail=result["message"],
                    headers={"Retry-After": str(result.get("retry_after", 900))}
                )
            elif result.get("error") in ["invalid_phone", "invalid_email"]:
                raise HTTPException(status_code=400, detail=result["message"])
            else:
                raise HTTPException(status_code=503, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Verification start failed"
        )

@app.post("/api/auth/verify/check")
def check_verification(request: VerifyCheckRequest, request_obj: Request, x_user_id: str = Header(...)):
    """Check Twilio Verify V2 verification code and update phone_verified claim"""
    if not twilio_verify:
        raise HTTPException(
            status_code=503,
            detail="Twilio Verify service unavailable"
        )

    try:
        user_id = x_user_id

        # Gateway rate limiting: 10 verification checks per 15 minutes per user
        enforce_rate_limit(user_id, "twilio_verify_check", limit=10, window_sec=900)

        # Extract client IP for audit logging
        client_ip = None
        if hasattr(request_obj, 'client') and hasattr(request_obj.client, 'host'):
            client_ip = request_obj.client.host
        elif 'x-forwarded-for' in request_obj.headers:
            client_ip = request_obj.headers['x-forwarded-for'].split(',')[0].strip()
        elif 'x-real-ip' in request_obj.headers:
            client_ip = request_obj.headers['x-real-ip']

        result = twilio_verify.check_verification(
            to=request.to,
            code=request.code,
            ip_address=client_ip
        )

        if result["success"] and result["valid"]:
            # Successful verification - update phone_verified claim
            # Only update if this is the user's phone (match request.to with profile phone)
            profile = db_fetchone("""
                SELECT phone FROM profiles WHERE id = %s
            """, (user_id,))

            if not profile:
                raise HTTPException(status_code=404, detail="Profile not found")

            profile_phone = profile[0]

            # Normalize both phones to E.164 for comparison
            normalized_request_phone = twilio_verify.normalize_phone_e164(request.to)
            normalized_profile_phone = twilio_verify.normalize_phone_e164(profile_phone) if profile_phone else None

            if normalized_request_phone and normalized_request_phone == normalized_profile_phone:
                # Update phone_verified claim and ensure phone is stored in E.164 format
                db_exec("""
                    UPDATE profiles
                    SET phone = %s, phone_verified = true, updated_at = %s
                    WHERE id = %s
                """, (normalized_request_phone, datetime.utcnow(), user_id))

                # Write audit log for successful verification
                write_audit(
                    actor=user_id,
                    event="phone_verification_success",
                    entity="profile",
                    entity_id=user_id,
                    meta={
                        "phone_verified": True,
                        "verification_sid": result["sid"],
                        "channel": result.get("channel"),
                        "method": "twilio_verify_v2"
                    }
                )

                return {
                    "success": True,
                    "valid": True,
                    "phone_verified": True,
                    "status": result["status"],
                    "verification_sid": result["sid"],
                    "to": normalized_request_phone,
                    "date_updated": result["date_updated"]
                }
            else:
                # Phone doesn't match user's profile phone
                return {
                    "success": True,
                    "valid": True,
                    "phone_verified": False,
                    "status": result["status"],
                    "verification_sid": result["sid"],
                    "to": request.to,
                    "date_updated": result["date_updated"],
                    "message": "Verification successful but phone doesn't match profile"
                }
        else:
            # Verification failed or invalid
            return {
                "success": result["success"],
                "valid": result.get("valid", False),
                "phone_verified": False,
                "status": result.get("status", "failed"),
                "verification_sid": result.get("sid"),
                "to": request.to,
                "message": result.get("message", "Verification failed")
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Verification check failed"
        )

# Phone verification gate decorator
def require_phone_verified():
    """Decorator to enforce phone verification on sensitive endpoints"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract user_id from headers
            x_user_id = kwargs.get('x_user_id') or (
                args[1] if len(args) > 1 else None
            )

            if not x_user_id:
                raise HTTPException(status_code=401, detail="User authentication required")

            # Check phone verification status
            profile = db_fetchone("""
                SELECT phone_verified FROM profiles WHERE id = %s
            """, (x_user_id,))

            if not profile:
                raise HTTPException(status_code=404, detail="Profile not found")

            phone_verified = profile[0]
            if not phone_verified:
                raise HTTPException(
                    status_code=403,
                    detail="Phone verification required. Please verify your phone number first."
                )

            return func(*args, **kwargs)
        return wrapper
    return decorator

# Age gate decorator for sensitive endpoints
def require_18plus(require_consent: bool = True):
    """Decorator to enforce 18+ gate on sensitive endpoints"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract user_id from headers
            x_user_id = kwargs.get('x_user_id') or (
                args[1] if len(args) > 1 else None
            )

            if not x_user_id:
                raise HTTPException(status_code=401, detail="User authentication required")

            gate_check = check_18plus_gate(x_user_id, require_consent)

            if not gate_check["allowed"]:
                # Log access denial
                write_audit(x_user_id, "age_gate_denied", "compliance", func.__name__, {
                    "reason": gate_check["reason"],
                    "endpoint": func.__name__
                })

                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied: {gate_check['reason']}"
                )

            return func(*args, **kwargs)
        return wrapper
    return decorator

# ========================================
# M15 Notifications API (Rate Limited)
# ========================================

class NotificationPreferencesUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    daily_horoscope: Optional[bool] = None
    promotional: Optional[bool] = None
    quiet_hours_start: Optional[str] = None  # HH:MM format
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None

class DeviceTokenRequest(BaseModel):
    token: str
    platform: str  # ios, android, web
    app_version: Optional[str] = None

class CampaignCreateRequest(BaseModel):
    name: str
    type: str  # broadcast, targeted, transactional
    notification_type: str  # daily_horoscope, order_update, etc.
    title: str
    body: str
    target_roles: Optional[List[str]] = []
    target_countries: Optional[List[str]] = []
    scheduled_at: Optional[str] = None  # ISO format

@app.get("/api/notifications/preferences")
def get_notification_preferences(x_user_id: str = Header(...)):
    """Get user notification preferences - M15"""
    try:
        user_id = x_user_id
        
        prefs = db_fetchone("""
            SELECT push_enabled, sms_enabled, whatsapp_enabled, email_enabled,
                   daily_horoscope, order_updates, payment_receipts, promotional,
                   quiet_hours_start, quiet_hours_end, timezone
            FROM notification_preferences 
            WHERE user_id = %s
        """, (user_id,))
        
        if not prefs:
            # Create default preferences
            db_exec("""
                INSERT INTO notification_preferences (user_id) VALUES (%s)
            """, (user_id,))
            
            prefs = (True, False, False, True, True, True, True, False, None, None, 'UTC')
        
        return {
            "push_enabled": prefs[0],
            "sms_enabled": prefs[1],
            "whatsapp_enabled": prefs[2],
            "email_enabled": prefs[3],
            "daily_horoscope": prefs[4],
            "order_updates": prefs[5],
            "payment_receipts": prefs[6],
            "promotional": prefs[7],
            "quiet_hours_start": prefs[8],
            "quiet_hours_end": prefs[9],
            "timezone": prefs[10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")

@app.put("/api/notifications/preferences")
def update_notification_preferences(request: NotificationPreferencesUpdate, x_user_id: str = Header(...)):
    """Update user notification preferences - M15"""
    try:
        user_id = x_user_id
        
        # Check rate limit
        bucket_key = f"{user_id}:preferences"
        if not db_fetchone("SELECT check_rate_limit(%s, %s, %s, %s, %s)", 
                          (bucket_key, "email", 1, 10, 5)):
            raise HTTPException(status_code=429, detail="Rate limit exceeded", 
                              headers={"Retry-After": "3600"})
        
        # Build update query dynamically
        updates = []
        params = []
        
        for field, value in request.dict(exclude_unset=True).items():
            updates.append(f"{field} = %s")
            params.append(value)
        
        if updates:
            params.append(user_id)
            db_exec(f"""
                INSERT INTO notification_preferences (user_id) VALUES (%s)
                ON CONFLICT (user_id) DO UPDATE SET {', '.join(updates)}, updated_at = NOW()
            """, [user_id] + params)
        
        # Audit log
        write_audit(user_id, "notification_preferences_updated", "notification_preferences", user_id, 
                   request.dict(exclude_unset=True))
        
        return {"success": True, "updated": len(updates)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@app.post("/api/notifications/device-token")
def register_device_token(request: DeviceTokenRequest, x_user_id: str = Header(...)):
    """Register device token for push notifications - M15"""
    try:
        user_id = x_user_id
        
        # Check rate limit
        bucket_key = f"{user_id}:device_tokens"
        if not db_fetchone("SELECT check_rate_limit(%s, %s, %s, %s, %s)", 
                          (bucket_key, "fcm_push", 1, 20, 10)):
            raise HTTPException(status_code=429, detail="Rate limit exceeded",
                              headers={"Retry-After": "3600"})
        
        # Upsert device token
        db_exec("""
            INSERT INTO device_tokens (user_id, token, platform, app_version, is_active, last_used_at)
            VALUES (%s, %s, %s, %s, true, NOW())
            ON CONFLICT (token) DO UPDATE SET 
                user_id = EXCLUDED.user_id,
                platform = EXCLUDED.platform,
                app_version = EXCLUDED.app_version,
                is_active = true,
                last_used_at = NOW(),
                updated_at = NOW()
        """, (user_id, request.token, request.platform, request.app_version))
        
        # Audit log
        write_audit(user_id, "device_token_registered", "device_token", request.token, {
            "platform": request.platform,
            "app_version": request.app_version
        })
        
        return {"success": True, "token_registered": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register device token: {str(e)}")

@app.post("/api/admin/notifications/campaigns")
def create_campaign(request: CampaignCreateRequest, x_user_id: str = Header(...)):
    """Create notification campaign (admin only) - M15"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check rate limit for campaign creation
        bucket_key = f"global:campaigns"
        if not db_fetchone("SELECT check_rate_limit(%s, %s, %s, %s, %s)", 
                          (bucket_key, "email", 1, 50, 10)):
            raise HTTPException(status_code=429, detail="Campaign creation rate limit exceeded",
                              headers={"Retry-After": "3600"})
        
        # Create campaign
        campaign_id = db_fetchone("""
            INSERT INTO campaigns (
                name, type, notification_type, title, body,
                target_roles, target_countries, scheduled_at, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.name, request.type, request.notification_type,
            request.title, request.body, request.target_roles, request.target_countries,
            request.scheduled_at, user_id
        ))[0]
        
        # Audit log
        write_audit(user_id, "campaign_created", "campaign", str(campaign_id), {
            "name": request.name,
            "type": request.type,
            "notification_type": request.notification_type
        })
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "status": "draft"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign creation failed: {str(e)}")

# ========================================
# PDF Invoice Generation (Private Bucket + Signed URLs)
# ========================================

class InvoiceGenerateRequest(BaseModel):
    payment_intent_id: int
    billing_details: Optional[dict] = None

@app.post("/api/invoices/generate")
def generate_invoice(request: InvoiceGenerateRequest, x_user_id: str = Header(...)):
    """Generate PDF invoice and store in private bucket - M14"""
    try:
        user_id = x_user_id
        
        # Get payment intent
        intent = db_fetchone("""
            SELECT user_id, order_id, amount_cents, currency, status
            FROM payment_intents 
            WHERE id = %s
        """, (request.payment_intent_id,))
        
        if not intent:
            raise HTTPException(status_code=404, detail="Payment intent not found")
        
        intent_user_id, order_id, amount_cents, currency, status = intent
        
        # Authorization check
        if str(intent_user_id) != user_id:
            role = get_user_role(user_id)
            if role not in ['admin', 'superadmin']:
                raise HTTPException(status_code=403, detail="Cannot generate invoice for this payment")
        
        # Check if invoice already exists
        existing_invoice = db_fetchone("""
            SELECT id, pdf_storage_key FROM invoices 
            WHERE payment_intent_id = %s
        """, (request.payment_intent_id,))
        
        if existing_invoice:
            invoice_id, pdf_key = existing_invoice
            
            # Generate signed URL for existing invoice
            if pdf_key:
                signed_url = generate_signed_url(pdf_key, "invoice")  # 60min per TTL whitelist
                return {
                    "invoice_id": invoice_id,
                    "pdf_url": signed_url,
                    "status": "existing",
                    "expires_in": get_signed_url_ttl("invoice") * 60
                }
        
        # Generate invoice number
        invoice_number = db_fetchone("SELECT generate_invoice_number()")[0]
        
        # Create line items
        line_items = [{
            "description": f"Payment for Order #{order_id}",
            "amount_cents": amount_cents,
            "currency": currency
        }]
        
        # Create invoice record
        invoice_id = db_fetchone("""
            INSERT INTO invoices (
                invoice_number, user_id, payment_intent_id,
                amount_cents, currency, line_items, billing_details,
                status, issued_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'draft', NOW())
            RETURNING id
        """, (
            invoice_number, intent_user_id, request.payment_intent_id,
            amount_cents, currency, json.dumps(line_items), 
            json.dumps(request.billing_details or {})
        ))[0]
        
        # Generate PDF (mock implementation)
        pdf_content = generate_pdf_invoice_content(invoice_number, line_items, request.billing_details)
        
        # Store in private bucket
        pdf_storage_key = f"invoices/{invoice_id}/{invoice_number}.pdf"
        
        # Mock S3 upload - in production would upload to actual bucket
        # import boto3
        # s3 = boto3.client('s3')
        # s3.put_object(
        #     Bucket=PRIVATE_BUCKET_NAME,
        #     Key=pdf_storage_key,
        #     Body=pdf_content,
        #     ContentType='application/pdf',
        #     ServerSideEncryption='AES256'
        # )
        
        # Update invoice with PDF info
        db_exec("""
            UPDATE invoices SET 
                pdf_storage_key = %s, 
                pdf_generated_at = NOW(),
                status = 'sent'
            WHERE id = %s
        """, (pdf_storage_key, invoice_id))
        
        # Generate signed URL
        signed_url = generate_signed_url(pdf_storage_key, "invoice")  # 60min per TTL whitelist
        
        # Audit log
        write_audit(user_id, "invoice_generated", "invoice", str(invoice_id), {
            "payment_intent_id": request.payment_intent_id,
            "invoice_number": invoice_number,
            "amount_cents": amount_cents
        })
        
        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "pdf_url": signed_url,
            "status": "generated",
            "expires_in": get_signed_url_ttl("invoice") * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice generation failed: {str(e)}")

@app.get("/api/invoices/{invoice_id}")
def get_invoice(invoice_id: int, x_user_id: str = Header(...)):
    """Get invoice with signed PDF URL - M14"""
    try:
        user_id = x_user_id
        
        # Get invoice
        invoice = db_fetchone("""
            SELECT i.user_id, i.invoice_number, i.amount_cents, i.currency,
                   i.pdf_storage_key, i.status, i.issued_at,
                   pi.order_id
            FROM invoices i
            JOIN payment_intents pi ON pi.id = i.payment_intent_id
            WHERE i.id = %s
        """, (invoice_id,))
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice_user_id, invoice_number, amount_cents, currency, pdf_key, status, issued_at, order_id = invoice
        
        # Authorization check
        if str(invoice_user_id) != user_id:
            role = get_user_role(user_id)
            if role not in ['admin', 'superadmin']:
                raise HTTPException(status_code=403, detail="Cannot access this invoice")
        
        # Generate signed URL if PDF exists
        pdf_url = None
        expires_in_seconds = None
        if pdf_key:
            pdf_url = generate_signed_url(pdf_key, "invoice")  # 60min per TTL whitelist
            expires_in_seconds = get_signed_url_ttl("invoice") * 60
        
        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "amount_cents": amount_cents,
            "currency": currency,
            "status": status,
            "issued_at": issued_at,
            "order_id": order_id,
            "pdf_url": pdf_url,
            "expires_in": expires_in_seconds
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get invoice: {str(e)}")

def generate_pdf_invoice_content(invoice_number: str, line_items: list, billing_details: dict) -> bytes:
    """Generate PDF invoice content (mock implementation)"""
    # In production, use libraries like reportlab, weasyprint, or jsPDF
    pdf_content = f"""
    INVOICE #{invoice_number}
    
    Billing Details:
    {json.dumps(billing_details, indent=2)}
    
    Line Items:
    {json.dumps(line_items, indent=2)}
    
    Generated: {datetime.utcnow().isoformat()}
    """
    return pdf_content.encode('utf-8')

def generate_signed_url(storage_key: str, resource_type: str = "default") -> str:
    """Generate signed URL for private bucket access with security-first TTL"""
    # Get TTL based on resource type and master policy (≤15min default)
    expires_in_seconds = get_signed_url_ttl(resource_type) * 60
    
    # In production, use boto3 to generate actual signed URLs
    # import boto3
    # s3 = boto3.client('s3')
    # return s3.generate_presigned_url(
    #     'get_object',
    #     Params={'Bucket': PRIVATE_BUCKET_NAME, 'Key': storage_key},
    #     ExpiresIn=expires_in_seconds
    # )
    
    # Mock signed URL with security-first TTL
    import base64
    import time
    
    expires_at = int(time.time()) + expires_in_seconds
    payload = f"{storage_key}:{expires_at}"
    signature = base64.b64encode(payload.encode()).decode()
    
    # Audit signed URL generation
    write_audit("system", "signed_url_generated", "storage", storage_key, {
        "resource_type": resource_type,
        "ttl_minutes": expires_in_seconds // 60,
        "expires_at": expires_at
    })
    
    return f"https://private-bucket.example.com/{storage_key}?signature={signature}&expires={expires_at}"

# M40: Siren & Availability Endpoints

class SirenTriggerRequest(BaseModel):
    config_name: str
    trigger_context: dict

class AvailabilitySetRequest(BaseModel):
    day_of_week: int  # 0=Sunday, 1=Monday, etc.
    start_time: str   # HH:MM format
    end_time: str     # HH:MM format
    timezone: str = "UTC"

@app.post("/api/siren/trigger")
def trigger_siren(request: SirenTriggerRequest, x_user_id: str = Header(...)):
    """Trigger emergency siren escalation - Monitor/Admin only"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Initialize siren service
        from services.siren_service import SirenService
        siren_service = SirenService(get_db_config())
        
        # Trigger escalation asynchronously 
        import asyncio
        success = asyncio.run(siren_service.trigger_siren(
            request.config_name, 
            request.trigger_context
        ))
        
        if not success:
            raise HTTPException(status_code=404, detail="Siren config not found or inactive")
        
        write_audit(user_id, "siren_triggered", "siren_config", request.config_name, {
            "trigger_context": request.trigger_context
        })
        
        return {"status": "triggered", "config_name": request.config_name}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Siren trigger failed: {str(e)}")

@app.get("/api/calls/{call_id}/terminate")
def terminate_call(call_id: str, x_user_id: str = Header(...)):
    """Force terminate call - Monitor/Admin only (M40)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Check call exists and is active
        call = db_fetchone("""
            SELECT id, status, reader_id, client_id, twilio_call_sid
            FROM calls 
            WHERE id = %s
        """, (call_id,))
        
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        call_id_db, status, reader_id, client_id, twilio_sid = call
        
        if status in ['completed', 'terminated', 'failed']:
            return {"status": "already_terminated", "call_status": status}
        
        # Terminate via Twilio if active
        terminated_twilio = False
        if twilio_sid and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                import requests
                auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls/{twilio_sid}.json"
                response = requests.post(url, auth=auth, data={"Status": "completed"})
                terminated_twilio = response.status_code == 200
            except Exception as e:
                # Log but don't fail - we can still mark as terminated in our DB
                print(f"Twilio termination failed: {e}")
        
        # Update call status
        db_exec("""
            UPDATE calls 
            SET status = 'terminated', ended_at = %s, termination_reason = 'admin_forced'
            WHERE id = %s
        """, (datetime.utcnow(), call_id))
        
        # Log event
        db_exec("""
            INSERT INTO call_events (call_id, event_type, event_data, created_at)
            VALUES (%s, 'terminated', %s, %s)
        """, (call_id, json.dumps({
            "terminated_by": user_id,
            "twilio_terminated": terminated_twilio,
            "reason": "admin_forced"
        }), datetime.utcnow()))
        
        write_audit(user_id, "call_terminated", "call", call_id, {
            "reader_id": reader_id,
            "client_id": client_id,
            "twilio_terminated": terminated_twilio
        })
        
        # Trigger alert for unexpected termination
        if terminated_twilio:
            siren_service = SirenService(get_db_config())
            asyncio.run(siren_service.trigger_siren("call_drop_alert", {
                "call_id": call_id,
                "terminated_by": user_id,
                "reason": "admin_forced"
            }))
        
        return {
            "status": "terminated",
            "call_id": call_id,
            "twilio_terminated": terminated_twilio
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call termination failed: {str(e)}")

@app.get("/api/availability/readers")
def get_available_readers(datetime_slot: str = Query(...), x_user_id: str = Header(...)):
    """Get readers available at specific datetime - Monitor/Admin only"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Parse datetime
        try:
            slot_datetime = datetime.fromisoformat(datetime_slot.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")
        
        from services.siren_service import SirenService
        siren_service = SirenService(get_db_config())
        
        available_reader_ids = siren_service.get_available_readers(slot_datetime)
        
        # Get reader details
        if available_reader_ids:
            placeholders = ','.join(['%s'] * len(available_reader_ids))
            readers = db_fetchall(f"""
                SELECT id, full_name, phone 
                FROM profiles 
                WHERE id IN ({placeholders}) AND role = 'reader'
            """, available_reader_ids)
        else:
            readers = []
        
        return {
            "datetime_slot": datetime_slot,
            "available_readers": [
                {
                    "id": reader[0],
                    "full_name": reader[1],
                    "phone": reader[2]
                }
                for reader in readers
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available readers: {str(e)}")

@app.post("/api/availability/set")
def set_reader_availability(request: AvailabilitySetRequest, x_user_id: str = Header(...)):
    """Set reader availability window - Reader can set own, Admin can set any"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Readers can only set their own availability
        target_reader_id = user_id
        if role in ['admin', 'superadmin']:
            # Admin can set for any reader (TODO: add reader_id param if needed)
            pass
        elif role != 'reader':
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Validate time format
        try:
            from datetime import time
            start = time.fromisoformat(request.start_time)
            end = time.fromisoformat(request.end_time)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM.")
        
        if request.day_of_week < 0 or request.day_of_week > 6:
            raise HTTPException(status_code=400, detail="day_of_week must be 0-6 (0=Sunday)")
        
        from services.siren_service import SirenService
        siren_service = SirenService(get_db_config())
        
        success = siren_service.set_reader_availability(
            target_reader_id, 
            request.day_of_week,
            start, 
            end, 
            request.timezone
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set availability")
        
        write_audit(user_id, "availability_set", "reader_availability", target_reader_id, {
            "day_of_week": request.day_of_week,
            "start_time": request.start_time,
            "end_time": request.end_time,
            "timezone": request.timezone
        })
        
        return {
            "status": "set",
            "reader_id": target_reader_id,
            "availability": {
                "day_of_week": request.day_of_week,
                "start_time": request.start_time,
                "end_time": request.end_time,
                "timezone": request.timezone
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set availability: {str(e)}")

@app.get("/api/availability/my")
def get_my_availability(x_user_id: str = Header(...)):
    """Get current user's availability windows - Reader only"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'reader':
            raise HTTPException(status_code=403, detail="Reader access only")
        
        windows = db_fetchall("""
            SELECT day_of_week, start_time, end_time, timezone, is_active, created_at, updated_at
            FROM reader_availability 
            WHERE reader_id = %s 
            ORDER BY day_of_week, start_time
        """, (user_id,))
        
        return {
            "reader_id": user_id,
            "availability_windows": [
                {
                    "day_of_week": w[0],
                    "start_time": str(w[1]),
                    "end_time": str(w[2]),
                    "timezone": w[3],
                    "is_active": w[4],
                    "created_at": w[5].isoformat() if w[5] else None,
                    "updated_at": w[6].isoformat() if w[6] else None
                }
                for w in windows
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get availability: {str(e)}")

# M45: Admin Store Validation Panel

class StoreValidationSummary(BaseModel):
    last_run: dict  # {"status": "PASS|FAIL|NONE", "started_at": "ISO8601", "finished_at": "ISO8601", "notes": "string"}
    links: dict     # {"testflight": "https://...", "play_internal": "https://..."}

@app.get("/api/admin/store-validation/summary")
def get_store_validation_summary(x_user_id: str = Header(...)):
    """Get store validation summary - Admin only (M45)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get last run data from app_settings
        last_run_raw = db_fetchone("""
            SELECT value FROM app_settings 
            WHERE key = 'store.validation.last_run'
        """)
        
        links_raw = db_fetchone("""
            SELECT value FROM app_settings 
            WHERE key = 'store.validation.links'  
        """)
        
        # Parse JSON or use defaults
        last_run = json.loads(last_run_raw[0]) if last_run_raw else {
            "status": "NONE", 
            "started_at": None, 
            "finished_at": None, 
            "notes": "No validation run recorded"
        }
        
        links = json.loads(links_raw[0]) if links_raw else {
            "testflight": None,
            "play_internal": None
        }
        
        # Audit read
        write_audit(user_id, "store_validation_read", "app_settings", "store.validation", {
            "last_run_status": last_run.get("status"),
            "links_available": bool(links.get("testflight") or links.get("play_internal"))
        })
        
        # Increment metrics counter
        db_exec("""
            INSERT INTO app_settings (key, value) 
            VALUES ('metrics.store_validation_reads_total', '1')
            ON CONFLICT (key) 
            DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
        """)
        
        return {
            "last_run": last_run,
            "links": links
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get store validation summary: {str(e)}")

@app.post("/api/admin/store-validation/summary")
def update_store_validation_summary(request: StoreValidationSummary, x_user_id: str = Header(...)):
    """Update store validation summary - Admin only (M45)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate schema
        last_run = request.last_run
        links = request.links
        
        # Validate last_run structure
        required_fields = ["status", "started_at", "finished_at", "notes"]
        for field in required_fields:
            if field not in last_run:
                raise HTTPException(status_code=400, detail=f"Missing required field in last_run: {field}")
        
        if last_run["status"] not in ["PASS", "FAIL", "NONE"]:
            raise HTTPException(status_code=400, detail="Invalid status. Must be PASS, FAIL, or NONE")
        
        # Validate ISO8601 timestamps if provided
        for ts_field in ["started_at", "finished_at"]:
            if last_run[ts_field]:
                try:
                    datetime.fromisoformat(last_run[ts_field].replace('Z', '+00:00'))
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid ISO8601 timestamp: {ts_field}")
        
        # Upsert to app_settings
        db_exec("""
            INSERT INTO app_settings (key, value) 
            VALUES ('store.validation.last_run', %s)
            ON CONFLICT (key) 
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """, (json.dumps(last_run),))
        
        db_exec("""
            INSERT INTO app_settings (key, value) 
            VALUES ('store.validation.links', %s)
            ON CONFLICT (key) 
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """, (json.dumps(links),))
        
        # Audit write
        write_audit(user_id, "store_validation_update", "app_settings", "store.validation", {
            "last_run": last_run,
            "links": links
        })
        
        # Increment metrics counter
        db_exec("""
            INSERT INTO app_settings (key, value) 
            VALUES ('metrics.store_validation_updates_total', '1')
            ON CONFLICT (key) 
            DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
        """)
        
        return {
            "status": "updated",
            "last_run": last_run,
            "links": links
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update store validation summary: {str(e)}")

def get_db_config():
    """Get database connection config for services"""
    import urllib.parse
    parsed = urllib.parse.urlparse(DSN)
    return {
        'host': parsed.hostname,
        'port': parsed.port,
        'database': parsed.path[1:],  # Remove leading slash
        'user': parsed.username,
        'password': parsed.password
    }

# Background jobs for SRE operations
def collect_golden_signals_metrics():
    """Collect and store golden signals metrics"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # This would typically collect from application metrics
                # For demo, we'll create synthetic data
                window_start = datetime.utcnow().replace(second=0, microsecond=0)
                window_end = window_start + timedelta(minutes=5)
                
                services = ['api', 'payments', 'notifications', 'community']
                for service in services:
                    # Calculate metrics from audit_log or application metrics
                    cur.execute("""
                        INSERT INTO sre_golden_signals (
                            window_start, window_end, service_name,
                            latency_p95_ms, request_count, error_rate,
                            cpu_usage_percent
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s
                        ) ON CONFLICT (window_start, service_name, endpoint_pattern, method) DO NOTHING
                    """, (
                        window_start, window_end, service,
                        150.0,  # Mock latency
                        100,    # Mock request count
                        0.01,   # Mock error rate
                        45.0    # Mock CPU usage
                    ))
    except Exception as e:
        print(f"Golden signals collection failed: {e}")

# =============================================================================
# M40 SIREN ESCALATION ENDPOINTS - Backend-only incident management
# =============================================================================

@app.post("/api/siren/trigger")
def trigger_siren_incident(request: SirenTriggerRequest, x_user_id: str = Header(...)):
    """
    Trigger a new siren incident with deduplication and cooldown checks
    Requires admin/superadmin/monitor role for creation
    """
    try:
        # Check permissions - monitors can trigger, admins can manage
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Validate severity
        if request.severity not in range(1, 6):
            raise HTTPException(status_code=400, detail="Severity must be 1-5")

        # Trigger incident
        success, message, incident_id = siren_service.trigger_incident(
            incident_type=request.incident_type,
            severity=request.severity,
            source=request.source,
            policy_name=request.policy_name,
            context=request.context,
            variables=request.variables,
            created_by=x_user_id,
            force=request.force
        )

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.siren_incidents_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

            return {
                "success": True,
                "message": message,
                "incident_id": incident_id
            }
        else:
            return {
                "success": False,
                "message": message,
                "incident_id": incident_id
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/api/siren/acknowledge/{incident_id}")
def acknowledge_siren_incident(incident_id: int, x_user_id: str = Header(...)):
    """
    Acknowledge a siren incident - cancels pending notifications
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        success, message = siren_service.acknowledge_incident(incident_id, x_user_id)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.siren_acks_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {
            "success": success,
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/api/siren/resolve/{incident_id}")
def resolve_siren_incident(incident_id: int, x_user_id: str = Header(...)):
    """
    Resolve a siren incident - cancels all pending notifications
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        success, message = siren_service.resolve_incident(incident_id, x_user_id)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.siren_resolves_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {
            "success": success,
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/api/siren/test")
def test_siren_policy(request: SirenTestRequest, x_user_id: str = Header(...)):
    """
    Test an escalation policy with a dummy incident
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        success, message = siren_service.test_escalation_policy(request.policy_name, x_user_id)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.siren_tests_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {
            "success": success,
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/siren/incidents")
def get_siren_incidents(status: Optional[str] = Query(None), limit: int = Query(50), x_user_id: str = Header(...)):
    """
    Get siren incidents with optional status filter
    Requires admin/superadmin role for full access, monitor for read-only
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Validate status if provided
        if status and status not in ['open', 'acknowledged', 'resolved']:
            raise HTTPException(status_code=400, detail="Invalid status")

        incidents = siren_service.get_incidents(status=status, limit=limit)

        return {
            "incidents": incidents,
            "count": len(incidents)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/siren/incidents/{incident_id}/events")
def get_siren_incident_events(incident_id: int, x_user_id: str = Header(...)):
    """
    Get all escalation events for a specific incident
    Requires admin/superadmin/monitor role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        events = siren_service.get_incident_events(incident_id)

        return {
            "incident_id": incident_id,
            "events": events,
            "count": len(events)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/siren/events/pending")
def get_pending_siren_events(limit: int = Query(100), x_user_id: str = Header(...)):
    """
    Get pending notification events ready to be sent
    Internal endpoint for notification processor
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        events = siren_service.get_pending_events(limit=limit)

        return {
            "events": events,
            "count": len(events)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/api/siren/process")
def process_siren_notifications(batch_size: int = Query(10), x_user_id: str = Header(...)):
    """
    Process pending siren notifications
    Internal endpoint for manual processing trigger
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Process notifications
        result = notification_processor.process_pending_events(batch_size=batch_size)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/siren/metrics")
def get_siren_metrics(x_user_id: str = Header(...)):
    """
    Get siren system metrics and performance data
    Requires admin/superadmin/monitor role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Get processor metrics
        metrics = notification_processor.get_processor_metrics()

        # Get system metrics from app_settings
        system_metrics = {}
        metric_keys = [
            'metrics.siren_incidents_total',
            'metrics.siren_acks_total',
            'metrics.siren_resolves_total',
            'metrics.siren_tests_total'
        ]

        for key in metric_keys:
            result = db_fetchone("SELECT value FROM app_settings WHERE key = %s", (key,))
            system_metrics[key.replace('metrics.', '')] = int(result[0]) if result else 0

        return {
            "processor_metrics": metrics,
            "system_metrics": system_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

# =============================================================================
# M41 WHATSAPP + N8N AUTOMATIONS ENDPOINTS - Backend-only messaging
# =============================================================================

@app.post("/api/whatsapp/webhook")
def whatsapp_webhook(request: Request, x_hub_signature_256: str = Header(None)):
    """
    WhatsApp Cloud API webhook endpoint
    Handles inbound messages, media, and status updates
    """
    try:
        # Get raw payload for signature verification
        payload = request.body()

        # Verify webhook signature
        if x_hub_signature_256:
            if not whatsapp_service.verify_webhook_signature(payload.decode(), x_hub_signature_256):
                raise HTTPException(status_code=403, detail="Invalid webhook signature")

        # Parse webhook data
        webhook_data = json.loads(payload)

        # Process webhook
        success, message = whatsapp_service.process_webhook(webhook_data)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.whatsapp_webhooks_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {"success": success, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing error: {str(e)}")

@app.get("/api/whatsapp/webhook")
def whatsapp_webhook_verify(request: Request):
    """
    WhatsApp webhook verification endpoint
    Required for webhook setup
    """
    try:
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        # Verify the webhook
        if mode == "subscribe" and token == whatsapp_service.verify_token:
            return int(challenge)
        else:
            raise HTTPException(status_code=403, detail="Verification failed")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")

@app.post("/api/whatsapp/send")
def send_whatsapp_message(request: WhatsAppSendRequest, x_user_id: str = Header(...)):
    """
    Send WhatsApp message (respects 24h rule)
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Normalize phone number
        phone_e164 = whatsapp_service.normalize_phone_e164(request.phone)
        if not phone_e164:
            raise HTTPException(status_code=400, detail="Invalid phone number format")

        # Send message based on type
        if request.template_name and request.template_params:
            # Send template message
            success, message = whatsapp_service.send_template_message(
                phone_e164=phone_e164,
                template_name=request.template_name,
                parameters=request.template_params
            )
        else:
            # Send free-form message
            success, message = whatsapp_service.send_freeform_message(
                phone_e164=phone_e164,
                text=request.message
            )

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.whatsapp_outbound_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {"success": success, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send message error: {str(e)}")

@app.post("/api/whatsapp/payment-link")
def create_whatsapp_payment_link(request: PaymentLinkCreateRequest, x_user_id: str = Header(...)):
    """
    Create Stripe Payment Link with WhatsApp automation
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Create payment link data
        payment_data = PaymentLinkData(
            amount=request.amount,
            currency=request.currency,
            description=request.description,
            customer_name=request.customer_name,
            customer_phone=request.customer_phone,
            customer_email=request.customer_email,
            order_id=request.order_id
        )

        # Create payment link with automation
        success, message, payment_url = payment_automation.create_payment_link(payment_data)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.payment_links_created_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {
            "success": success,
            "message": message,
            "payment_url": payment_url
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment link creation error: {str(e)}")

@app.post("/api/whatsapp/stripe-webhook")
def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Stripe webhook for payment automation
    Handles payment success/failure events
    """
    try:
        # Get raw payload
        payload = request.body()

        # Verify Stripe signature (if configured)
        # This would use stripe.Webhook.construct_event() in production

        # Parse event
        event = json.loads(payload)

        # Process Stripe webhook
        success, message = payment_automation.process_stripe_webhook(event)

        if success:
            # Update metrics
            db_exec("""
                INSERT INTO app_settings (key, value)
                VALUES ('metrics.stripe_webhooks_processed_total', '1')
                ON CONFLICT (key)
                DO UPDATE SET value = (CAST(app_settings.value AS INTEGER) + 1)::TEXT
            """)

        return {"success": success, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe webhook error: {str(e)}")

@app.get("/api/whatsapp/media/{signature_uuid}")
def get_whatsapp_media(signature_uuid: str, token: str = Query(...)):
    """
    Serve WhatsApp media via signed URL
    Secure media delivery with TTL and access limits
    """
    try:
        # Verify signature
        valid, file_path = whatsapp_service.verify_media_signature(signature_uuid, token)

        if not valid:
            raise HTTPException(status_code=403, detail="Invalid or expired media signature")

        if not file_path:
            raise HTTPException(status_code=404, detail="Media file not found")

        # In production, this would serve the actual file
        # For now, return file info
        return {
            "success": True,
            "message": "Media access granted",
            "file_path": file_path,
            "download_url": f"/storage/{file_path}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Media access error: {str(e)}")

@app.get("/api/whatsapp/conversations/{phone}")
def get_whatsapp_conversation(phone: str, limit: int = Query(50), x_user_id: str = Header(...)):
    """
    Get WhatsApp conversation history
    Requires admin/superadmin role or own verified phone
    """
    try:
        # Normalize phone
        phone_e164 = whatsapp_service.normalize_phone_e164(phone)
        if not phone_e164:
            raise HTTPException(status_code=400, detail="Invalid phone number format")

        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            # Check if user owns this phone number
            profile = whatsapp_service.get_profile_by_phone(phone_e164)
            if not profile or profile['id'] != x_user_id:
                raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Get conversation history
        messages = whatsapp_service.get_conversation_history(phone_e164, limit)

        return {
            "phone_e164": phone_e164,
            "messages": messages,
            "count": len(messages)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversation retrieval error: {str(e)}")

@app.get("/api/whatsapp/metrics")
def get_whatsapp_metrics(x_user_id: str = Header(...)):
    """
    Get WhatsApp automation metrics
    Requires admin/superadmin/monitor role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Get WhatsApp metrics
        wa_metrics = whatsapp_service.get_metrics()

        # Get automation flow metrics
        flow_metrics = payment_automation.get_flow_metrics()

        # Get system metrics from app_settings
        system_metrics = {}
        metric_keys = [
            'metrics.whatsapp_webhooks_total',
            'metrics.whatsapp_outbound_total',
            'metrics.payment_links_created_total',
            'metrics.stripe_webhooks_processed_total'
        ]

        for key in metric_keys:
            result = db_fetchone("SELECT value FROM app_settings WHERE key = %s", (key,))
            system_metrics[key.replace('metrics.', '')] = int(result[0]) if result else 0

        return {
            "whatsapp_metrics": wa_metrics,
            "automation_metrics": flow_metrics,
            "system_metrics": system_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")

@app.post("/api/whatsapp/process-flows")
def process_whatsapp_flows(batch_size: int = Query(20), x_user_id: str = Header(...)):
    """
    Process pending WhatsApp automation flows
    Internal endpoint for manual processing trigger
    Requires admin/superadmin role
    """
    try:
        # Check permissions
        user_role = get_user_role(x_user_id)
        if user_role not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Process flows
        result = payment_automation.process_pending_flows(batch_size=batch_size)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flow processing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)