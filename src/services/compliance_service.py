"""
M38 - Age Verification and Legal Compliance Service
Implements 18+ gating, COPPA protection, and store compliance requirements
"""

import os
import json
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=2, maxconn=10, dsn=DSN)

class ComplianceService:
    """Age verification and legal compliance service"""
    
    def __init__(self):
        self.pool = POOL
        self.min_age = 18  # Adults only requirement
        self.coppa_age = 13  # Under 13 requires special handling
    
    def _get_connection(self):
        """Get connection from pool"""
        return self.pool.getconn()
    
    def _return_connection(self, conn):
        """Return connection to pool"""
        self.pool.putconn(conn)
    
    def verify_age_declaration(self, user_id: str, date_of_birth: str, 
                              ip_address: str = None, user_agent: str = None) -> Dict:
        """
        Verify user age through DOB declaration
        Implements 18+ requirement with COPPA protection for under-13
        """
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Parse and validate DOB
                    try:
                        dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
                    except ValueError:
                        return {'error': 'Invalid date format. Use YYYY-MM-DD'}
                    
                    # Calculate age
                    today = date.today()
                    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                    
                    # Check age requirements
                    if age < self.coppa_age:
                        # COPPA incident - block immediately
                        return self._handle_coppa_incident(conn, user_id, age, 'dob_declaration', ip_address)
                    
                    # Store age verification
                    cur.execute("""
                        INSERT INTO age_verifications 
                        (user_id, verification_method, verified_age, verification_date, ip_address, user_agent)
                        VALUES (%s, 'dob_declaration', %s, now(), %s, %s)
                        ON CONFLICT (user_id, verification_method) 
                        DO UPDATE SET verified_age = EXCLUDED.verified_age,
                                     verification_date = EXCLUDED.verification_date
                        RETURNING is_adult
                    """, (user_id, age, ip_address, user_agent))
                    
                    result = cur.fetchone()
                    is_adult = result['is_adult']
                    
                    # Update profile DOB if not set
                    cur.execute("""
                        UPDATE profiles SET dob = %s WHERE id = %s AND dob IS NULL
                    """, (dob, user_id))
                    
                    # Log audit event
                    cur.execute("""
                        INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                        VALUES (%s, 'user', 'age_verification', 'age_verification', %s, %s)
                    """, (user_id, user_id, json.dumps({
                        'method': 'dob_declaration',
                        'age': age,
                        'is_adult': is_adult,
                        'ip_address': ip_address
                    })))
                    
                    return {
                        'user_id': user_id,
                        'age': age,
                        'is_adult': is_adult,
                        'verification_method': 'dob_declaration',
                        'access_granted': is_adult,
                        'message': 'Age verified successfully' if is_adult else 'Access restricted - must be 18 or older'
                    }
                    
        finally:
            self._return_connection(conn)
    
    def _handle_coppa_incident(self, conn, user_id: str, detected_age: int, 
                              detection_method: str, ip_address: str = None) -> Dict:
        """Handle COPPA incident for users under 13"""
        with conn.cursor() as cur:
            # Create COPPA incident
            cur.execute("""
                INSERT INTO coppa_incidents 
                (user_id, detected_age, detection_method, auto_blocked_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id, detected_age, detection_method))
            
            # Block user access (remove role)
            cur.execute("""
                UPDATE profiles SET role_id = NULL WHERE id = %s
            """, (user_id,))
            
            # Log incident
            cur.execute("""
                INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                VALUES (%s, 'system', 'coppa_incident', 'coppa_incident', %s, %s)
            """, (user_id, user_id, json.dumps({
                'detected_age': detected_age,
                'detection_method': detection_method,
                'action': 'auto_blocked',
                'ip_address': ip_address
            })))
        
        return {
            'error': 'Access blocked - age verification failed',
            'incident_type': 'coppa_protection',
            'detected_age': detected_age,
            'message': 'This service is for adults only. If you believe this is an error, please contact support.',
            'access_granted': False
        }
    
    def verify_document_age(self, user_id: str, document_hash: str, 
                           verified_age: int, admin_id: str, notes: str = None) -> Dict:
        """Admin verification of age through ID document"""
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Check if admin has permission
                    cur.execute("""
                        SELECT r.code FROM profiles p 
                        JOIN roles r ON r.id = p.role_id 
                        WHERE p.id = %s AND r.code IN ('admin', 'superadmin')
                    """, (admin_id,))
                    
                    if not cur.fetchone():
                        return {'error': 'Insufficient permissions for document verification'}
                    
                    # Handle COPPA case
                    if verified_age < self.coppa_age:
                        return self._handle_coppa_incident(conn, user_id, verified_age, 'id_document')
                    
                    # Store verification
                    cur.execute("""
                        INSERT INTO age_verifications 
                        (user_id, verification_method, verified_age, document_hash, 
                         verified_by, verification_date, notes)
                        VALUES (%s, 'id_document', %s, %s, %s, now(), %s)
                        ON CONFLICT (user_id, verification_method)
                        DO UPDATE SET verified_age = EXCLUDED.verified_age,
                                     document_hash = EXCLUDED.document_hash,
                                     verified_by = EXCLUDED.verified_by,
                                     verification_date = EXCLUDED.verification_date,
                                     notes = EXCLUDED.notes
                        RETURNING is_adult
                    """, (user_id, verified_age, document_hash, admin_id, notes))
                    
                    result = cur.fetchone()
                    is_adult = result['is_adult']
                    
                    # Log verification
                    cur.execute("""
                        INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                        VALUES (%s, 'admin', 'age_verification', 'age_verification', %s, %s)
                    """, (admin_id, user_id, json.dumps({
                        'method': 'id_document',
                        'verified_age': verified_age,
                        'is_adult': is_adult,
                        'document_hash': document_hash[:16] + '...',  # Partial hash for audit
                        'notes': notes
                    })))
                    
                    return {
                        'user_id': user_id,
                        'verified_age': verified_age,
                        'is_adult': is_adult,
                        'verification_method': 'id_document',
                        'verified_by': admin_id,
                        'access_granted': is_adult
                    }
                    
        finally:
            self._return_connection(conn)
    
    def record_consent(self, user_id: str, consent_type: str, status: str,
                      consent_version: str, ip_address: str = None, 
                      user_agent: str = None) -> Dict:
        """Record user consent for data processing"""
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    # Validate consent type
                    valid_types = ['data_processing', 'marketing', 'analytics', 'ai_assistance', 'third_party_sharing']
                    if consent_type not in valid_types:
                        return {'error': f'Invalid consent type. Must be one of: {valid_types}'}
                    
                    # Record consent
                    given_at = datetime.now() if status == 'given' else None
                    withdrawn_at = datetime.now() if status == 'withdrawn' else None
                    
                    cur.execute("""
                        INSERT INTO user_consents 
                        (user_id, consent_type, status, given_at, withdrawn_at, 
                         ip_address, user_agent, consent_version)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, consent_type, consent_version)
                        DO UPDATE SET status = EXCLUDED.status,
                                     given_at = EXCLUDED.given_at,
                                     withdrawn_at = EXCLUDED.withdrawn_at
                    """, (user_id, consent_type, status, given_at, withdrawn_at,
                          ip_address, user_agent, consent_version))
                    
                    # Log consent change
                    cur.execute("""
                        INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                        VALUES (%s, 'user', 'consent_change', 'user_consent', %s, %s)
                    """, (user_id, user_id, json.dumps({
                        'consent_type': consent_type,
                        'status': status,
                        'consent_version': consent_version,
                        'ip_address': ip_address
                    })))
                    
                    return {
                        'user_id': user_id,
                        'consent_type': consent_type,
                        'status': status,
                        'recorded_at': datetime.now().isoformat()
                    }
                    
        finally:
            self._return_connection(conn)
    
    def check_user_compliance(self, user_id: str) -> Dict:
        """Check user's compliance status for access control"""
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user profile and age verification
                cur.execute("""
                    SELECT p.id, p.email, p.dob, p.role_id, r.code as role,
                           av.verified_age, av.is_adult, av.verification_method,
                           ci.id as coppa_incident_id, ci.resolution
                    FROM profiles p
                    LEFT JOIN roles r ON r.id = p.role_id
                    LEFT JOIN age_verifications av ON av.user_id = p.id
                    LEFT JOIN coppa_incidents ci ON ci.user_id = p.id
                    WHERE p.id = %s
                """, (user_id,))
                
                user_data = cur.fetchone()
                if not user_data:
                    return {'error': 'User not found'}
                
                # Get consents
                cur.execute("""
                    SELECT consent_type, status, consent_version, given_at, withdrawn_at
                    FROM user_consents 
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user_id,))
                
                consents = [dict(row) for row in cur.fetchall()]
                
                # Determine compliance status
                compliance_status = {
                    'user_id': user_id,
                    'is_adult': user_data.get('is_adult', False),
                    'verified_age': user_data.get('verified_age'),
                    'verification_method': user_data.get('verification_method'),
                    'has_coppa_incident': bool(user_data.get('coppa_incident_id')),
                    'coppa_resolution': user_data.get('resolution'),
                    'access_granted': False,
                    'access_restrictions': [],
                    'consents': consents
                }
                
                # Check access criteria
                if user_data.get('coppa_incident_id') and not user_data.get('resolution'):
                    compliance_status['access_restrictions'].append('COPPA incident - under 13 detected')
                elif not user_data.get('is_adult', False):
                    compliance_status['access_restrictions'].append('Must be 18 or older')
                elif not user_data.get('role_id'):
                    compliance_status['access_restrictions'].append('Account disabled')
                else:
                    compliance_status['access_granted'] = True
                
                # Check required consents
                required_consents = ['data_processing']
                for consent_type in required_consents:
                    user_consent = next((c for c in consents if c['consent_type'] == consent_type), None)
                    if not user_consent or user_consent['status'] != 'given':
                        compliance_status['access_restrictions'].append(f'Missing required consent: {consent_type}')
                        compliance_status['access_granted'] = False
                
                return compliance_status
                
        finally:
            self._return_connection(conn)
    
    def get_store_compliance_data(self) -> Dict:
        """
        Generate store compliance data for App Store and Google Play
        """
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get data categories and purposes
                data_collection = {
                    'app_store_privacy': {
                        'data_types': {
                            'contact_info': {
                                'email_address': True,
                                'phone_number': True,
                                'linked_to_user': True,
                                'used_for_tracking': False
                            },
                            'user_content': {
                                'audio_data': True,  # Tarot readings, voice notes
                                'other_user_content': True,  # Questions, responses
                                'linked_to_user': True,
                                'used_for_tracking': False
                            },
                            'identifiers': {
                                'user_id': True,
                                'device_id': True,
                                'linked_to_user': True,
                                'used_for_tracking': False
                            },
                            'usage_data': {
                                'product_interaction': True,
                                'advertising_data': False,
                                'linked_to_user': True,
                                'used_for_tracking': False
                            },
                            'financial_info': {
                                'payment_info': True,
                                'purchase_history': True,
                                'linked_to_user': True,
                                'used_for_tracking': False
                            }
                        },
                        'data_uses': {
                            'app_functionality': True,
                            'analytics': True,
                            'developer_advertising': False,
                            'third_party_advertising': False,
                            'other_purposes': ['Customer Support', 'Fraud Prevention', 'Legal Compliance']
                        }
                    },
                    'google_play_data_safety': {
                        'data_collected': {
                            'personal_info': {
                                'name': True,
                                'email_address': True,
                                'phone_number': True,
                                'date_of_birth': True
                            },
                            'financial_info': {
                                'payment_info': True,
                                'purchase_history': True
                            },
                            'audio_files': {
                                'voice_or_sound_recordings': True,
                                'music_files': False,
                                'other_audio_files': True
                            },
                            'app_activity': {
                                'app_interactions': True,
                                'in_app_search_history': False,
                                'installed_apps': False
                            }
                        },
                        'data_shared': {
                            'shared_with_third_parties': False,  # No third-party sharing
                            'data_shared_types': []
                        },
                        'security_practices': {
                            'data_encrypted_in_transit': True,
                            'data_encrypted_at_rest': True,
                            'follows_families_policy': False,  # 18+ only
                            'committed_to_play_families_policy': False,
                            'independent_security_review': False,
                            'data_deletion_request': True  # GDPR compliance
                        },
                        'data_collection_purposes': {
                            'app_functionality': True,
                            'analytics': True,
                            'developer_communications': True,
                            'advertising_or_marketing': False,
                            'fraud_prevention_security': True,
                            'compliance': True,
                            'account_management': True
                        }
                    }
                }
                
                # Get current statistics for context
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT p.id) as total_users,
                        COUNT(DISTINCT CASE WHEN av.is_adult THEN p.id END) as verified_adults,
                        COUNT(DISTINCT ci.user_id) as coppa_incidents,
                        COUNT(DISTINCT dr.user_id) as dsr_requests
                    FROM profiles p
                    LEFT JOIN age_verifications av ON av.user_id = p.id
                    LEFT JOIN coppa_incidents ci ON ci.user_id = p.id
                    LEFT JOIN dsr_requests dr ON dr.user_id = p.id
                """)
                
                stats = cur.fetchone()
                
                return {
                    'store_compliance': data_collection,
                    'statistics': dict(stats) if stats else {},
                    'age_rating': {
                        'app_store': '18+',
                        'google_play': 'Mature 17+',
                        'content_rating': 'Adults only - Fortune telling, spiritual guidance'
                    },
                    'compliance_notes': {
                        'gdpr_compliant': True,
                        'coppa_protected': True,
                        'adult_content_gated': True,
                        'data_deletion_supported': True
                    }
                }
                
        finally:
            self._return_connection(conn)
    
    def cleanup_expired_data(self) -> Dict:
        """Clean up expired data per retention policies"""
        conn = self._get_connection()
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cleanup_results = []
                    
                    # Expire old DSR requests
                    cur.execute("""
                        UPDATE dsr_requests 
                        SET status = 'expired' 
                        WHERE status IN ('pending', 'verified') 
                        AND expiry_date < now()
                    """)
                    expired_dsr = cur.rowcount
                    if expired_dsr > 0:
                        cleanup_results.append(f"Expired {expired_dsr} DSR requests")
                    
                    # Clean up old phone verifications (keep only latest per user)
                    cur.execute("""
                        DELETE FROM phone_verifications pv1
                        WHERE pv1.created_at < now() - interval '90 days'
                        AND EXISTS (
                            SELECT 1 FROM phone_verifications pv2
                            WHERE pv2.profile_id = pv1.profile_id
                            AND pv2.created_at > pv1.created_at
                        )
                    """)
                    cleaned_phone = cur.rowcount
                    if cleaned_phone > 0:
                        cleanup_results.append(f"Cleaned {cleaned_phone} old phone verifications")
                    
                    # Archive old audit logs (>2 years)
                    cur.execute("""
                        DELETE FROM audit_log 
                        WHERE created_at < now() - interval '2 years'
                        AND event NOT IN ('dsr_request', 'coppa_incident', 'age_verification')
                    """)
                    archived_audit = cur.rowcount
                    if archived_audit > 0:
                        cleanup_results.append(f"Archived {archived_audit} old audit logs")
                    
                    return {
                        'cleanup_executed': True,
                        'results': cleanup_results,
                        'executed_at': datetime.now().isoformat()
                    }
                    
        finally:
            self._return_connection(conn)