# api.py - M3 Auth & Phone Verification API (FastAPI + psycopg2)
# Zero theme drift - backend endpoints only
# Usage: uvicorn api:app --reload

import os, json, uuid
from datetime import datetime
from typing import Optional

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import requests

# Database connection pool
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

# Twilio credentials (required - no defaults)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN") 
TWILIO_VERIFY_SID = os.getenv("TWILIO_VERIFY_SID")

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

def check_verification_status(user_id: str) -> tuple:
    """Check if user has email and phone verified"""
    profile = db_fetchone("""
        SELECT email_verified, phone_verified 
        FROM profiles WHERE id = %s
    """, (user_id,))
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

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

# M4 - Orders Workflow Endpoints

@app.post("/api/orders")
def create_order(request: OrderCreateRequest, x_user_id: str = Header(...)):
    """Create new service order"""
    try:
        user_id = x_user_id
        role = get_user_role(user_id)
        
        # Must be client or higher
        if role not in ['client', 'reader', 'monitor', 'admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Must have verified email and phone
        email_verified, phone_verified = check_verification_status(user_id)
        if not email_verified or not phone_verified:
            raise HTTPException(status_code=400, detail="Email and phone verification required")
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)