"""
M38 - GDPR-compliant Data Subject Rights (DSR) Service
Implements Article 15 (Access) and Article 17 (Erasure) with immutable audit trails
"""

import os
import json
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=2, maxconn=10, dsn=DSN)

class DSRService:
    """GDPR-compliant Data Subject Rights service"""
    
    def __init__(self):
        self.pool = POOL
    
    def _get_connection(self):
        """Get connection from pool"""
        return self.pool.getconn()
    
    def _return_connection(self, conn):
        """Return connection to pool"""
        self.pool.putconn(conn)
    
    def _log_audit_event(self, conn, dsr_request_id: int, event_type: str, 
                        actor_id: Optional[str] = None, actor_role: Optional[str] = None,
                        details: Optional[Dict] = None):
        """Log immutable audit event with hash chaining"""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO dsr_audit_log (dsr_request_id, event_type, actor_id, actor_role, details)
                VALUES (%s, %s, %s, %s, %s)
            """, (dsr_request_id, event_type, actor_id, actor_role, json.dumps(details or {})))
    
    def create_dsr_request(self, user_id: str, request_type: str, 
                          verification_method: str = 'email') -> Dict:
        """
        Create a new DSR request (GDPR Art. 15/17)
        
        Args:
            user_id: UUID of the user
            request_type: 'export' or 'delete'
            verification_method: 'email', 'email_2fa', or 'admin_override'
        
        Returns:
            Dict with request details and verification token
        """
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Check for existing active request
                    cur.execute("""
                        SELECT id, status FROM dsr_requests 
                        WHERE user_id = %s AND request_type = %s 
                        AND status IN ('pending', 'verified', 'processing')
                    """, (user_id, request_type))
                    
                    existing = cur.fetchone()
                    if existing:
                        return {
                            'error': f'Active {request_type} request already exists',
                            'existing_request_id': existing['id'],
                            'status': existing['status']
                        }
                    
                    # Generate verification token
                    verification_token = secrets.token_urlsafe(32)
                    
                    # Create request
                    cur.execute("""
                        INSERT INTO dsr_requests 
                        (user_id, request_type, verification_token, verification_method)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, created_at, expiry_date
                    """, (user_id, request_type, verification_token, verification_method))
                    
                    request_data = cur.fetchone()
                    request_id = request_data['id']
                    
                    # Log creation event
                    self._log_audit_event(
                        conn, request_id, 'created',
                        actor_id=user_id, actor_role='user',
                        details={
                            'request_type': request_type,
                            'verification_method': verification_method,
                            'ip_address': os.getenv('REQUEST_IP', 'unknown')
                        }
                    )
                    
                    return {
                        'request_id': request_id,
                        'verification_token': verification_token,
                        'created_at': request_data['created_at'].isoformat(),
                        'expiry_date': request_data['expiry_date'].isoformat(),
                        'status': 'pending'
                    }
                    
        finally:
            self._return_connection(conn)
    
    def verify_dsr_request(self, request_id: int, verification_token: str,
                          actor_id: Optional[str] = None) -> Dict:
        """Verify DSR request with token or admin override"""
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Validate request and token
                    cur.execute("""
                        SELECT dr.*, p.email, p.role_id, r.code as role_code
                        FROM dsr_requests dr
                        JOIN profiles p ON p.id = dr.user_id
                        LEFT JOIN roles r ON r.id = p.role_id
                        WHERE dr.id = %s AND dr.verification_token = %s
                        AND dr.status = 'pending'
                        AND dr.expiry_date > now()
                    """, (request_id, verification_token))
                    
                    request = cur.fetchone()
                    if not request:
                        return {'error': 'Invalid or expired verification token'}
                    
                    # Update request status
                    cur.execute("""
                        UPDATE dsr_requests 
                        SET status = 'verified', verified_at = now()
                        WHERE id = %s
                    """, (request_id,))
                    
                    # Log verification
                    actor_role = 'admin' if actor_id and actor_id != request['user_id'] else 'user'
                    self._log_audit_event(
                        conn, request_id, 'verified',
                        actor_id=actor_id or request['user_id'],
                        actor_role=actor_role,
                        details={'verified_by_admin': actor_role == 'admin'}
                    )
                    
                    return {
                        'request_id': request_id,
                        'status': 'verified',
                        'request_type': request['request_type'],
                        'user_email': request['email']
                    }
                    
        finally:
            self._return_connection(conn)
    
    def export_user_data(self, request_id: int, admin_id: Optional[str] = None) -> Dict:
        """
        Export all user data per GDPR Article 15
        Creates machine-readable export with media references
        """
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get verified export request
                    cur.execute("""
                        SELECT dr.*, p.email 
                        FROM dsr_requests dr
                        JOIN profiles p ON p.id = dr.user_id
                        WHERE dr.id = %s AND dr.request_type = 'export'
                        AND dr.status = 'verified'
                    """, (request_id,))
                    
                    request = cur.fetchone()
                    if not request:
                        return {'error': 'Export request not found or not verified'}
                    
                    user_id = request['user_id']
                    
                    # Update status to processing
                    cur.execute("""
                        UPDATE dsr_requests SET status = 'processing' WHERE id = %s
                    """, (request_id,))
                    
                    self._log_audit_event(
                        conn, request_id, 'processing',
                        actor_id=admin_id or user_id,
                        actor_role='admin' if admin_id else 'automated'
                    )
                    
                    # Export user data
                    export_data = self._collect_user_data(conn, user_id)
                    
                    # Generate export file (in production, this would upload to secure storage)
                    export_filename = f"user_data_export_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                    export_content = {
                        'export_metadata': {
                            'user_id': user_id,
                            'export_date': datetime.now().isoformat(),
                            'request_id': request_id,
                            'format_version': '1.0',
                            'gdpr_article': 'Article 15 - Right of access'
                        },
                        'user_data': export_data
                    }
                    
                    # In production: upload to secure storage and get signed URL
                    # For now, store locally for testing
                    export_path = f"/tmp/{export_filename}"
                    with open(export_path, 'w', encoding='utf-8') as f:
                        json.dump(export_content, f, indent=2, default=str)
                    
                    # Update request with export URL
                    export_url = f"file://{export_path}"  # In production: signed S3/Supabase URL
                    cur.execute("""
                        UPDATE dsr_requests 
                        SET status = 'completed', completed_at = now(), export_url = %s
                        WHERE id = %s
                    """, (export_url, request_id))
                    
                    self._log_audit_event(
                        conn, request_id, 'completed',
                        actor_id=admin_id or user_id,
                        actor_role='admin' if admin_id else 'automated',
                        details={
                            'export_file': export_filename,
                            'data_categories_exported': list(export_data.keys()),
                            'total_records': sum(len(v) if isinstance(v, list) else 1 for v in export_data.values())
                        }
                    )
                    
                    return {
                        'request_id': request_id,
                        'status': 'completed',
                        'export_url': export_url,
                        'export_file': export_filename,
                        'data_summary': {
                            'categories': list(export_data.keys()),
                            'total_records': sum(len(v) if isinstance(v, list) else 1 for v in export_data.values())
                        }
                    }
                    
        finally:
            self._return_connection(conn)
    
    def _collect_user_data(self, conn, user_id: str) -> Dict:
        """Collect all user data for export"""
        data = {}
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Profile data
            cur.execute("SELECT * FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()
            if profile:
                data['profile'] = dict(profile)
            
            # Orders
            cur.execute("""
                SELECT o.*, s.name as service_name 
                FROM orders o 
                LEFT JOIN services s ON s.id = o.service_id
                WHERE o.user_id = %s
            """, (user_id,))
            data['orders'] = [dict(row) for row in cur.fetchall()]
            
            # Media assets
            cur.execute("SELECT * FROM media_assets WHERE owner_id = %s", (user_id,))
            data['media_assets'] = [dict(row) for row in cur.fetchall()]
            
            # Consents
            cur.execute("SELECT * FROM user_consents WHERE user_id = %s", (user_id,))
            data['consents'] = [dict(row) for row in cur.fetchall()]
            
            # Age verifications
            cur.execute("SELECT * FROM age_verifications WHERE user_id = %s", (user_id,))
            data['age_verifications'] = [dict(row) for row in cur.fetchall()]
            
            # Phone verifications
            cur.execute("SELECT * FROM phone_verifications WHERE profile_id = %s", (user_id,))
            data['phone_verifications'] = [dict(row) for row in cur.fetchall()]
            
            # Audit logs (user-related only)
            cur.execute("""
                SELECT event, entity, entity_id, meta, created_at 
                FROM audit_log 
                WHERE actor = %s OR entity_id = %s
                ORDER BY created_at DESC
            """, (user_id, user_id))
            data['audit_logs'] = [dict(row) for row in cur.fetchall()]
        
        return data
    
    def delete_user_data(self, request_id: int, admin_id: str, 
                        grace_period_hours: int = 72) -> Dict:
        """
        Delete user data per GDPR Article 17 with grace period
        
        Args:
            request_id: DSR request ID
            admin_id: Admin authorizing the deletion
            grace_period_hours: Reversible grace period (default 72h)
        """
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get verified delete request
                    cur.execute("""
                        SELECT dr.*, p.email 
                        FROM dsr_requests dr
                        JOIN profiles p ON p.id = dr.user_id
                        WHERE dr.id = %s AND dr.request_type = 'delete'
                        AND dr.status = 'verified'
                    """, (request_id,))
                    
                    request = cur.fetchone()
                    if not request:
                        return {'error': 'Delete request not found or not verified'}
                    
                    user_id = request['user_id']
                    scheduled_for = datetime.now() + timedelta(hours=grace_period_hours)
                    
                    # Schedule deletion (grace period)
                    cur.execute("""
                        UPDATE dsr_requests 
                        SET status = 'processing', 
                            admin_approved_by = %s,
                            admin_approved_at = now(),
                            scheduled_for = %s
                        WHERE id = %s
                    """, (admin_id, scheduled_for, request_id))
                    
                    self._log_audit_event(
                        conn, request_id, 'approved',
                        actor_id=admin_id,
                        actor_role='admin',
                        details={
                            'grace_period_hours': grace_period_hours,
                            'scheduled_for': scheduled_for.isoformat(),
                            'reversible_until': scheduled_for.isoformat()
                        }
                    )
                    
                    return {
                        'request_id': request_id,
                        'status': 'processing',
                        'scheduled_for': scheduled_for.isoformat(),
                        'grace_period_hours': grace_period_hours,
                        'message': f'Deletion scheduled for {scheduled_for.isoformat()}. Reversible until then.'
                    }
                    
        finally:
            self._return_connection(conn)
    
    def execute_scheduled_deletions(self) -> Dict:
        """Execute deletions that have passed their grace period"""
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Find deletions ready for execution
                    cur.execute("""
                        SELECT id, user_id 
                        FROM dsr_requests 
                        WHERE request_type = 'delete' 
                        AND status = 'processing'
                        AND scheduled_for <= now()
                    """)
                    
                    ready_deletions = cur.fetchall()
                    results = []
                    
                    for deletion in ready_deletions:
                        request_id = deletion['id']
                        user_id = deletion['user_id']
                        
                        try:
                            # Execute hard deletion
                            deletion_result = self._execute_hard_delete(conn, user_id)
                            
                            # Mark as completed
                            cur.execute("""
                                UPDATE dsr_requests 
                                SET status = 'completed', completed_at = now()
                                WHERE id = %s
                            """, (request_id,))
                            
                            self._log_audit_event(
                                conn, request_id, 'completed',
                                actor_id=None,
                                actor_role='automated',
                                details={
                                    'deletion_method': 'hard_delete',
                                    'tables_affected': deletion_result['tables_affected'],
                                    'records_deleted': deletion_result['records_deleted']
                                }
                            )
                            
                            results.append({
                                'request_id': request_id,
                                'user_id': user_id,
                                'status': 'completed',
                                'deletion_summary': deletion_result
                            })
                            
                        except Exception as e:
                            # Log failure
                            self._log_audit_event(
                                conn, request_id, 'failed',
                                actor_id=None,
                                actor_role='automated',
                                details={'error': str(e)}
                            )
                            
                            results.append({
                                'request_id': request_id,
                                'user_id': user_id,
                                'status': 'failed',
                                'error': str(e)
                            })
                    
                    return {
                        'executed_deletions': len(results),
                        'results': results
                    }
                    
        finally:
            self._return_connection(conn)
    
    def _execute_hard_delete(self, conn, user_id: str) -> Dict:
        """Execute hard deletion of user data"""
        tables_affected = []
        records_deleted = 0
        
        with conn.cursor() as cur:
            # Delete in proper order (respecting foreign keys)
            deletion_order = [
                'dsr_audit_log',  # Keep DSR audit trail until last
                'coppa_incidents',
                'age_verifications', 
                'user_consents',
                'phone_verifications',
                'moderation_actions',
                'calls',
                'media_assets',
                'orders',
                'profiles'  # Last - will cascade auth.users deletion
            ]
            
            for table in deletion_order:
                if table == 'dsr_audit_log':
                    # Keep DSR audit logs for legal compliance
                    continue
                elif table == 'coppa_incidents':
                    cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
                elif table == 'moderation_actions':
                    cur.execute(f"DELETE FROM {table} WHERE actor_id = %s", (user_id,))
                elif table == 'calls':
                    cur.execute(f"""
                        DELETE FROM {table} 
                        WHERE order_id IN (SELECT id FROM orders WHERE user_id = %s)
                    """, (user_id,))
                elif table == 'media_assets':
                    cur.execute(f"DELETE FROM {table} WHERE owner_id = %s", (user_id,))
                else:
                    # Standard user_id or profile_id column
                    column = 'profile_id' if table == 'phone_verifications' else 'user_id'
                    cur.execute(f"DELETE FROM {table} WHERE {column} = %s", (user_id,))
                
                deleted_count = cur.rowcount
                if deleted_count > 0:
                    tables_affected.append(table)
                    records_deleted += deleted_count
        
        return {
            'tables_affected': tables_affected,
            'records_deleted': records_deleted
        }
    
    def get_dsr_request_status(self, request_id: int, user_id: Optional[str] = None) -> Dict:
        """Get status of DSR request"""
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                where_clause = "WHERE dr.id = %s"
                params = [request_id]
                
                if user_id:
                    where_clause += " AND dr.user_id = %s"
                    params.append(user_id)
                
                cur.execute(f"""
                    SELECT dr.*, p.email,
                           array_agg(
                               json_build_object(
                                   'event_type', dal.event_type,
                                   'actor_role', dal.actor_role,
                                   'created_at', dal.created_at,
                                   'details', dal.details
                               ) ORDER BY dal.created_at
                           ) as audit_trail
                    FROM dsr_requests dr
                    JOIN profiles p ON p.id = dr.user_id
                    LEFT JOIN dsr_audit_log dal ON dal.dsr_request_id = dr.id
                    {where_clause}
                    GROUP BY dr.id, p.email
                """, params)
                
                request = cur.fetchone()
                if not request:
                    return {'error': 'DSR request not found'}
                
                return {
                    'request_id': request['id'],
                    'user_email': request['email'],
                    'request_type': request['request_type'],
                    'status': request['status'],
                    'created_at': request['created_at'].isoformat(),
                    'expiry_date': request['expiry_date'].isoformat() if request['expiry_date'] else None,
                    'completed_at': request['completed_at'].isoformat() if request['completed_at'] else None,
                    'export_url': request['export_url'],
                    'audit_trail': request['audit_trail'] or []
                }
                
        finally:
            self._return_connection(conn)
    
    def verify_audit_chain_integrity(self, request_id: int) -> Dict:
        """Verify hash chain integrity for tamper detection"""
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, dsr_request_id, event_type, actor_id, details, 
                           prev_hash, row_hash, created_at
                    FROM dsr_audit_log 
                    WHERE dsr_request_id = %s 
                    ORDER BY id
                """, (request_id,))
                
                audit_logs = cur.fetchall()
                integrity_check = {'valid': True, 'issues': []}
                
                for i, log in enumerate(audit_logs):
                    # Verify hash chain
                    expected_prev_hash = audit_logs[i-1]['row_hash'] if i > 0 else None
                    
                    if log['prev_hash'] != expected_prev_hash:
                        integrity_check['valid'] = False
                        integrity_check['issues'].append({
                            'log_id': log['id'],
                            'issue': 'Hash chain broken',
                            'expected_prev_hash': expected_prev_hash,
                            'actual_prev_hash': log['prev_hash']
                        })
                
                return {
                    'request_id': request_id,
                    'integrity_check': integrity_check,
                    'audit_log_count': len(audit_logs)
                }
                
        finally:
            self._return_connection(conn)