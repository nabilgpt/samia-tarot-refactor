# api.py - M3 Auth & Phone Verification API (FastAPI + psycopg2)
# Zero theme drift - backend endpoints only
# Usage: uvicorn api:app --reload

import os, json, uuid, subprocess, hashlib, base64
from datetime import datetime, timedelta
from typing import Optional

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from fastapi import FastAPI, HTTPException, Header, Query, Response
from pydantic import BaseModel
import requests

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

# M5 - TikTok ingestion and Supabase Storage credentials (required - no defaults)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE = os.getenv("SUPABASE_SERVICE")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "audio")  # default bucket name
YTDLP_BIN = os.getenv("YTDLP_BIN", "yt-dlp")  # default to 'yt-dlp' in PATH

# M5 Upgrade - Voice synthesis and timezone support
VOICE_PROVIDER = os.getenv("VOICE_PROVIDER")  # e.g. 'elevenlabs', 'azure'
VOICE_API_KEY = os.getenv("VOICE_API_KEY")

# M10 - DeepConf and Semantic Galaxy (internal only)
DEEPCONF_API_URL = os.getenv("DEEPCONF_API_URL")
DEEPCONF_API_KEY = os.getenv("DEEPCONF_API_KEY")
SEMANTIC_API_URL = os.getenv("SEMANTIC_API_URL")
SEMANTIC_API_KEY = os.getenv("SEMANTIC_API_KEY")

app = FastAPI(title="SAMIA-TAROT API", version="1.0.0")

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

# M5 - Horoscope models
class HoroscopeIngestRequest(BaseModel):
    tiktok_url: str
    zodiac: str
    ref_date: str  # YYYY-MM-DD format

class HoroscopeApproveRequest(BaseModel):
    note: Optional[str] = None

class HoroscopeRejectRequest(BaseModel):
    reason: str

# M5 Upgrade - Additional models
class HoroscopeRegenerateRequest(BaseModel):
    zodiac: str
    ref_date: Optional[str] = None  # defaults to server UTC date
    source: str  # 'tiktok' or 'voice_model'
    tiktok_url: Optional[str] = None  # required if source='tiktok'
    script_text: Optional[str] = None  # optional guidance if source='voice_model'

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
def download_tiktok_audio(tiktok_url: str) -> bytes:
    """Download audio from TikTok URL using yt-dlp, return MP3 bytes"""
    if not YTDLP_BIN:
        raise HTTPException(status_code=503, detail="TikTok ingestion not configured (YTDLP_BIN missing)")
    
    try:
        # Run yt-dlp to extract audio to stdout as MP3
        cmd = [
            YTDLP_BIN,
            "-x",  # extract audio only
            "--audio-format", "mp3",
            "-o", "-",  # output to stdout
            tiktok_url
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=60,  # 60 second timeout
            check=True
        )
        
        if not result.stdout:
            raise HTTPException(status_code=400, detail="No audio extracted from TikTok URL")
        
        return result.stdout
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="TikTok download timeout")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"TikTok extraction failed: {e.stderr.decode()}")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail=f"yt-dlp not found at: {YTDLP_BIN}")

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
                detail="Rate limit exceeded"
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
    """Start phone verification via Twilio"""
    try:
        user_id = request.user_id
        phone = request.phone
        channel = request.channel
        
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
    """Check phone verification code via Twilio"""
    try:
        user_id = request.user_id
        phone = request.phone
        code = request.code
        
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
        
        metrics = {
            "period_days": days,
            "orders_created": orders_created,
            "orders_delivered": orders_delivered,
            "rejects": rejects,
            "regenerates": regenerates,
            "calls_started": calls_started,
            "calls_ended": calls_ended,
            "rate_limit_hits": rate_limit_hits,
            "avg_sql_latency_ms": round(avg_sql_latency, 2)
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
    """Assign reader to order (admin/superadmin only)"""
    try:
        user_id = x_user_id
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

@app.post("/api/orders/{order_id}/result")
def upload_result(order_id: int, request: UploadResultRequest, x_user_id: str = Header(...)):
    """Upload result media (reader only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role != 'reader':
            raise HTTPException(status_code=403, detail="Reader access required")
        
        # Check order ownership and status
        order = db_fetchone("""
            SELECT status, assigned_reader FROM orders WHERE id = %s
        """, (order_id,))
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status, assigned_reader = order
        if assigned_reader != user_id:
            raise HTTPException(status_code=403, detail="Order not assigned to you")
        
        if status not in ['in_progress', 'rejected']:
            raise HTTPException(status_code=409, detail=f"Cannot upload result for status: {status}")
        
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
    """Approve order and deliver (monitor/admin/superadmin)"""
    try:
        user_id = x_user_id
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
        
        # Approve and deliver
        db_exec("""
            UPDATE orders 
            SET status = 'delivered', delivered_at = %s, updated_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), datetime.utcnow(), order_id))
        
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
        raise HTTPException(status_code=500, detail=f"Order approval failed: {str(e)}")

@app.post("/api/orders/{order_id}/reject")
def reject_order(order_id: int, request: RejectRequest, x_user_id: str = Header(...)):
    """Reject order (monitor/admin/superadmin)"""
    try:
        user_id = x_user_id
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

@app.post("/api/horoscopes/ingest")
def ingest_horoscope(request: HoroscopeIngestRequest, x_user_id: str = Header(...)):
    """Ingest TikTok audio for daily horoscope (monitor/admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Validate environment
        ensure_env(['DB_DSN', 'SUPABASE_URL', 'SUPABASE_SERVICE'])
        
        # Validate inputs
        zodiac = validate_zodiac(request.zodiac)
        ref_date = validate_date(request.ref_date)
        
        # Download audio from TikTok
        audio_bytes = download_tiktok_audio(request.tiktok_url)
        
        # Calculate SHA256
        sha256_hash = hashlib.sha256(audio_bytes).hexdigest()
        
        # Build storage path
        storage_path = f"horoscopes/daily/{ref_date}/{zodiac}.mp3"
        
        # Upload to Supabase Storage
        storage_key = storage_upload_bytes(SUPABASE_BUCKET, storage_path, audio_bytes, "audio/mpeg")
        
        # Insert media asset
        media_id = db_fetchone("""
            INSERT INTO media_assets(kind, url, bytes, sha256, created_at)
            VALUES ('audio', %s, %s, %s, %s)
            RETURNING id
        """, (storage_key, len(audio_bytes), sha256_hash, datetime.utcnow()))[0]
        
        # Upsert horoscope (enforce uniqueness on scope, zodiac, ref_date)
        horoscope_id = db_fetchone("""
            INSERT INTO horoscopes(scope, zodiac, ref_date, audio_media_id, tiktok_post_url)
            VALUES ('daily', %s, %s, %s, %s)
            ON CONFLICT (scope, zodiac, ref_date) 
            DO UPDATE SET 
                audio_media_id = EXCLUDED.audio_media_id,
                tiktok_post_url = EXCLUDED.tiktok_post_url,
                approved_by = NULL,
                approved_at = NULL
            RETURNING id
        """, (zodiac, ref_date, media_id, request.tiktok_url))[0]
        
        # Audit log
        write_audit(
            actor=user_id,
            event="horoscope_ingest",
            entity="horoscope",
            entity_id=str(horoscope_id),
            meta={
                "zodiac": zodiac,
                "ref_date": ref_date,
                "tiktok_url_hash": hashlib.sha256(request.tiktok_url.encode()).hexdigest()[:16]
            }
        )
        
        return {
            "horoscope_id": horoscope_id,
            "media_id": media_id,
            "status": "pending_approval"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Horoscope ingestion failed: {str(e)}")

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
            SELECT h.id, h.scope, h.zodiac, h.ref_date, h.tiktok_post_url,
                   m.bytes, m.created_at
            FROM horoscopes h
            JOIN media_assets m ON m.id = h.audio_media_id
            WHERE h.approved_by IS NULL
            ORDER BY h.ref_date DESC, h.zodiac ASC
        """)
        
        # Convert to list of dicts
        columns = ['id', 'scope', 'zodiac', 'ref_date', 'tiktok_post_url', 'bytes', 'created_at']
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

@app.post("/api/horoscopes/{horoscope_id}/approve")
def approve_horoscope(horoscope_id: int, request: HoroscopeApproveRequest, x_user_id: str = Header(...)):
    """Approve horoscope for public release (monitor/admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check horoscope exists and has audio
        horoscope = db_fetchone("""
            SELECT audio_media_id, approved_by, zodiac, ref_date 
            FROM horoscopes WHERE id = %s
        """, (horoscope_id,))
        
        if not horoscope:
            raise HTTPException(status_code=404, detail="Horoscope not found")
        
        audio_media_id, approved_by, zodiac, ref_date = horoscope
        
        if not audio_media_id:
            raise HTTPException(status_code=400, detail="Horoscope has no audio media")
        
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

@app.post("/api/horoscopes/{horoscope_id}/reject")
def reject_horoscope(horoscope_id: int, request: HoroscopeRejectRequest, x_user_id: str = Header(...)):
    """Reject horoscope (monitor/admin/superadmin only)"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        if role not in ['monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Monitor access required")
        
        # Check horoscope exists
        horoscope = db_fetchone("""
            SELECT zodiac, ref_date FROM horoscopes WHERE id = %s
        """, (horoscope_id,))
        
        if not horoscope:
            raise HTTPException(status_code=404, detail="Horoscope not found")
        
        zodiac, ref_date = horoscope
        
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
                SELECT h.zodiac, h.ref_date, h.tiktok_post_url, m.url as storage_key
                FROM horoscopes h
                JOIN media_assets m ON m.id = h.audio_media_id
                WHERE h.scope = 'daily' 
                  AND h.zodiac = %s 
                  AND h.ref_date = %s
            """, (zodiac, ref_date))
        else:
            horoscope = db_fetchone("""
                SELECT h.zodiac, h.ref_date, h.tiktok_post_url, m.url as storage_key
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
        
        zodiac, ref_date, tiktok_post_url, storage_key = horoscope
        
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
            "audio_url": signed_url,
            "tiktok_post_url": tiktok_post_url
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)