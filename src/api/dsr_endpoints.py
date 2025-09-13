"""
M38 - DSR (Data Subject Rights) API Endpoints
GDPR-compliant endpoints for export/delete requests with immutable audit trails
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import os
from src.services.dsr_service import DSRService
from src.services.compliance_service import ComplianceService

dsr_bp = Blueprint('dsr', __name__, url_prefix='/api/dsr')
dsr_service = DSRService()
compliance_service = ComplianceService()

def token_required(f):
    """JWT token validation decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            current_user_role = data.get('role', 'user')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user_id, current_user_role, *args, **kwargs)
    return decorated

def admin_required(f):
    """Admin role validation decorator"""
    @wraps(f)
    def decorated(current_user_id, current_user_role, *args, **kwargs):
        if current_user_role not in ['admin', 'superadmin']:
            return jsonify({'error': 'Admin access required'}), 403
        return f(current_user_id, current_user_role, *args, **kwargs)
    return decorated

@dsr_bp.route('/request', methods=['POST'])
@token_required
def create_dsr_request(current_user_id, current_user_role):
    """
    Create new DSR request (GDPR Art. 15/17)
    
    Body:
    {
        "request_type": "export" | "delete",
        "verification_method": "email" | "email_2fa" | "admin_override"
    }
    """
    try:
        data = request.get_json()
        request_type = data.get('request_type')
        verification_method = data.get('verification_method', 'email')
        
        if request_type not in ['export', 'delete']:
            return jsonify({'error': 'Invalid request_type. Must be export or delete'}), 400
        
        if verification_method not in ['email', 'email_2fa', 'admin_override']:
            return jsonify({'error': 'Invalid verification_method'}), 400
        
        # Only admins can use admin_override
        if verification_method == 'admin_override' and current_user_role not in ['admin', 'superadmin']:
            return jsonify({'error': 'Admin access required for admin_override'}), 403
        
        result = dsr_service.create_dsr_request(
            user_id=current_user_id,
            request_type=request_type,
            verification_method=verification_method
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({
            'message': f'DSR {request_type} request created successfully',
            'request_id': result['request_id'],
            'verification_token': result['verification_token'],
            'expiry_date': result['expiry_date'],
            'next_step': f'Check your email for verification link or use /verify endpoint with token'
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"DSR request creation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/verify', methods=['POST'])
def verify_dsr_request():
    """
    Verify DSR request with token
    
    Body:
    {
        "request_id": 123,
        "verification_token": "abc123...",
        "admin_id": "uuid" (optional, for admin verification)
    }
    """
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        verification_token = data.get('verification_token')
        admin_id = data.get('admin_id')
        
        if not request_id or not verification_token:
            return jsonify({'error': 'request_id and verification_token are required'}), 400
        
        result = dsr_service.verify_dsr_request(
            request_id=request_id,
            verification_token=verification_token,
            actor_id=admin_id
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({
            'message': 'DSR request verified successfully',
            'request_id': result['request_id'],
            'status': result['status'],
            'request_type': result['request_type'],
            'next_step': 'Request will be processed according to GDPR timelines'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"DSR verification error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/export/<int:request_id>', methods=['POST'])
@token_required
@admin_required
def execute_export(current_user_id, current_user_role, request_id):
    """Execute verified export request (Admin only)"""
    try:
        result = dsr_service.export_user_data(
            request_id=request_id,
            admin_id=current_user_id
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({
            'message': 'Data export completed successfully',
            'request_id': result['request_id'],
            'export_url': result['export_url'],
            'data_summary': result['data_summary']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Export execution error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/delete/<int:request_id>', methods=['POST'])
@token_required
@admin_required
def approve_deletion(current_user_id, current_user_role, request_id):
    """
    Approve deletion with grace period (Admin only)
    
    Body:
    {
        "grace_period_hours": 72
    }
    """
    try:
        data = request.get_json() or {}
        grace_period_hours = data.get('grace_period_hours', 72)
        
        if grace_period_hours < 0 or grace_period_hours > 720:  # Max 30 days
            return jsonify({'error': 'Grace period must be between 0 and 720 hours'}), 400
        
        result = dsr_service.delete_user_data(
            request_id=request_id,
            admin_id=current_user_id,
            grace_period_hours=grace_period_hours
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({
            'message': 'Deletion approved and scheduled',
            'request_id': result['request_id'],
            'scheduled_for': result['scheduled_for'],
            'grace_period_hours': result['grace_period_hours']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Deletion approval error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/status/<int:request_id>', methods=['GET'])
@token_required
def get_dsr_status(current_user_id, current_user_role, request_id):
    """Get DSR request status and audit trail"""
    try:
        # Non-admins can only view their own requests
        user_filter = None if current_user_role in ['admin', 'superadmin'] else current_user_id
        
        result = dsr_service.get_dsr_request_status(
            request_id=request_id,
            user_id=user_filter
        )
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"DSR status check error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/audit/<int:request_id>/integrity', methods=['GET'])
@token_required
@admin_required
def verify_audit_integrity(current_user_id, current_user_role, request_id):
    """Verify audit trail integrity for tamper detection (Admin only)"""
    try:
        result = dsr_service.verify_audit_chain_integrity(request_id)
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Audit integrity check error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/execute-scheduled', methods=['POST'])
@token_required
@admin_required
def execute_scheduled_deletions(current_user_id, current_user_role):
    """Execute deletions that have passed grace period (Admin only)"""
    try:
        result = dsr_service.execute_scheduled_deletions()
        
        return jsonify({
            'message': 'Scheduled deletions executed',
            'executed_count': result['executed_deletions'],
            'results': result['results']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Scheduled deletion execution error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Compliance endpoints
@dsr_bp.route('/compliance/age-verify', methods=['POST'])
@token_required
def verify_age(current_user_id, current_user_role):
    """
    Verify user age through DOB declaration
    
    Body:
    {
        "date_of_birth": "1990-01-01"
    }
    """
    try:
        data = request.get_json()
        date_of_birth = data.get('date_of_birth')
        
        if not date_of_birth:
            return jsonify({'error': 'date_of_birth is required (format: YYYY-MM-DD)'}), 400
        
        result = compliance_service.verify_age_declaration(
            user_id=current_user_id,
            date_of_birth=date_of_birth,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Age verification error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/compliance/consent', methods=['POST'])
@token_required
def record_consent(current_user_id, current_user_role):
    """
    Record user consent
    
    Body:
    {
        "consent_type": "data_processing" | "marketing" | "analytics" | "ai_assistance" | "third_party_sharing",
        "status": "given" | "withdrawn",
        "consent_version": "1.0"
    }
    """
    try:
        data = request.get_json()
        consent_type = data.get('consent_type')
        status = data.get('status')
        consent_version = data.get('consent_version', '1.0')
        
        if not consent_type or not status:
            return jsonify({'error': 'consent_type and status are required'}), 400
        
        result = compliance_service.record_consent(
            user_id=current_user_id,
            consent_type=consent_type,
            status=status,
            consent_version=consent_version,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Consent recording error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/compliance/status', methods=['GET'])
@token_required
def check_compliance_status(current_user_id, current_user_role):
    """Check user's compliance status"""
    try:
        result = compliance_service.check_user_compliance(current_user_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Compliance status check error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/compliance/store-data', methods=['GET'])
@token_required
@admin_required
def get_store_compliance_data(current_user_id, current_user_role):
    """Get store compliance data for App Store/Google Play (Admin only)"""
    try:
        result = compliance_service.get_store_compliance_data()
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Store compliance data error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@dsr_bp.route('/admin/cleanup', methods=['POST'])
@token_required
@admin_required
def cleanup_expired_data(current_user_id, current_user_role):
    """Clean up expired data per retention policies (Admin only)"""
    try:
        result = compliance_service.cleanup_expired_data()
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Data cleanup error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Error handlers
@dsr_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@dsr_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized access'}), 401

@dsr_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden - insufficient permissions'}), 403

@dsr_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@dsr_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500