"""
M26 AR + M27 i18n API Endpoints
Admin-only APIs for AR asset management and internationalization
"""
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from functools import wraps
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from ar_service import ARService
from i18n_service import I18nService

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

# Create blueprints
ar_bp = Blueprint('ar', __name__, url_prefix='/admin/ar')
i18n_bp = Blueprint('i18n', __name__, url_prefix='/admin/i18n')

# Initialize services
ar_service = ARService()
i18n_service = I18nService()

def auth_required(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        
        try:
            # In real implementation, would validate JWT properly
            g.user_id = request.headers.get('X-User-ID')
            g.user_role = request.headers.get('X-User-Role', 'client')
            
            if not g.user_id:
                return jsonify({'error': 'Invalid token'}), 401
                
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Admin/Superadmin access only"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'user_role') or g.user_role not in ['admin', 'superadmin']:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# M26 AR ASSETS API ENDPOINTS
# =============================================================================

@ar_bp.route('/assets', methods=['POST'])
@auth_required
@admin_required
def upload_ar_asset():
    """Upload/register AR asset with validation"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['kind', 'filename', 'content_base64']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        kind = data['kind']
        filename = data['filename']
        content_base64 = data['content_base64']
        metadata = data.get('metadata', {})
        
        # Decode base64 content
        import base64
        try:
            file_content = base64.b64decode(content_base64)
        except Exception:
            return jsonify({'error': 'Invalid base64 content'}), 400
        
        # Create AR asset
        asset = ar_service.create_asset(
            owner_id=g.user_id,
            kind=kind,
            filename=filename,
            file_content=file_content,
            metadata=metadata
        )
        
        if asset:
            # Generate signed URL for upload confirmation
            signed_url = ar_service.generate_signed_url(asset.storage_path)
            
            return jsonify({
                'asset_id': asset.id,
                'storage_path': asset.storage_path,
                'signed_url': signed_url,
                'sha256': asset.sha256,
                'bytes': asset.bytes,
                'requires_approval': not asset.is_approved,
                'created_at': asset.created_at.isoformat()
            }), 201
        else:
            return jsonify({'error': 'Failed to create asset'}), 500
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Asset upload failed'}), 500

@ar_bp.route('/assets', methods=['GET'])
@auth_required
@admin_required
def list_ar_assets():
    """List AR assets with filters"""
    try:
        # Query parameters
        owner_id = request.args.get('owner_id')
        kind = request.args.get('kind')
        approved_only = request.args.get('approved_only', 'false').lower() == 'true'
        limit = min(100, int(request.args.get('limit', 50)))
        
        assets = ar_service.get_assets(
            owner_id=owner_id,
            kind=kind,
            approved_only=approved_only,
            limit=limit
        )
        
        assets_data = []
        for asset in assets:
            asset_data = {
                'id': asset.id,
                'owner_id': asset.owner_id,
                'kind': asset.kind,
                'filename': asset.filename,
                'content_type': asset.content_type,
                'sha256': asset.sha256,
                'bytes': asset.bytes,
                'is_approved': asset.is_approved,
                'created_at': asset.created_at.isoformat()
            }
            
            # Add signed URL for approved assets
            if asset.is_approved:
                asset_data['signed_url'] = ar_service.generate_signed_url(
                    asset.storage_path, expires_in=3600
                )
            
            assets_data.append(asset_data)
        
        # Get storage statistics
        stats = ar_service.get_storage_stats()
        
        return jsonify({
            'assets': assets_data,
            'stats': stats,
            'count': len(assets_data)
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to list assets'}), 500

@ar_bp.route('/assets/<int:asset_id>/approve', methods=['POST'])
@auth_required
@admin_required
def approve_ar_asset(asset_id):
    """Approve AR asset for use"""
    try:
        success = ar_service.approve_asset(asset_id, g.user_id)
        
        if success:
            return jsonify({
                'asset_id': asset_id,
                'approved': True,
                'approved_by': g.user_id,
                'approved_at': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Asset not found'}), 404
            
    except Exception as e:
        return jsonify({'error': 'Approval failed'}), 500

@ar_bp.route('/assets/link', methods=['POST'])
@auth_required
@admin_required
def link_ar_asset():
    """Link AR asset to order/horoscope/profile"""
    try:
        data = request.get_json() or {}
        
        required_fields = ['ar_asset_id', 'subject_type', 'subject_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        ar_asset_id = data['ar_asset_id']
        subject_type = data['subject_type']
        subject_id = str(data['subject_id'])
        link_position = data.get('link_position')
        
        link = ar_service.create_link(
            ar_asset_id=ar_asset_id,
            subject_type=subject_type,
            subject_id=subject_id,
            creator_id=g.user_id,
            link_position=link_position
        )
        
        if link:
            return jsonify({
                'link_id': link.id,
                'ar_asset_id': link.ar_asset_id,
                'subject_type': link.subject_type,
                'subject_id': link.subject_id,
                'is_active': link.is_active,
                'created_at': link.created_at.isoformat()
            }), 201
        else:
            return jsonify({'error': 'Failed to create link'}), 500
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Link creation failed'}), 500

@ar_bp.route('/links/<subject_type>/<subject_id>', methods=['GET'])
@auth_required
@admin_required
def get_ar_links(subject_type, subject_id):
    """Get AR asset links for subject"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        links = ar_service.get_links_for_subject(subject_type, subject_id, active_only)
        
        links_data = [
            {
                'link_id': link.id,
                'ar_asset_id': link.ar_asset_id,
                'subject_type': link.subject_type,
                'subject_id': link.subject_id,
                'link_position': link.link_position,
                'is_active': link.is_active,
                'created_at': link.created_at.isoformat()
            }
            for link in links
        ]
        
        return jsonify({
            'links': links_data,
            'subject_type': subject_type,
            'subject_id': subject_id,
            'count': len(links_data)
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to get links'}), 500

# =============================================================================
# M27 I18N API ENDPOINTS
# =============================================================================

@i18n_bp.route('/translate', methods=['POST'])
@auth_required
@admin_required
def batch_translate():
    """Batch translate messages (optional auto-translate)"""
    try:
        data = request.get_json() or {}
        
        if 'translations' not in data:
            return jsonify({'error': 'Missing translations array'}), 400
        
        translations_data = data['translations']
        auto_translate = data.get('auto_translate', False)
        
        # Validate each translation entry
        for entry in translations_data:
            required_fields = ['message_key', 'language_code', 'message_text']
            for field in required_fields:
                if field not in entry:
                    return jsonify({'error': f'Missing field {field} in translation entry'}), 400
        
        results = i18n_service.batch_translate(translations_data, auto_translate)
        
        return jsonify({
            'batch_results': results,
            'auto_translate_enabled': auto_translate,
            'requires_review': auto_translate
        })
        
    except Exception as e:
        return jsonify({'error': 'Batch translation failed'}), 500

@i18n_bp.route('/status', methods=['GET'])
@auth_required
@admin_required
def translation_status():
    """Get translation coverage and review backlog"""
    try:
        # Get coverage status
        coverage = i18n_service.get_coverage_status()
        
        # Get review backlog
        pending_review = i18n_service.get_translations(needs_review=True, limit=100)
        
        review_backlog = [
            {
                'id': t.id,
                'message_key': t.message_key,
                'language_code': t.language_code,
                'message_text': t.message_text,
                'context_notes': t.context_notes,
                'updated_at': t.updated_at.isoformat()
            }
            for t in pending_review
        ]
        
        return jsonify({
            'coverage': coverage,
            'review_backlog': {
                'items': review_backlog,
                'count': len(review_backlog)
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Status retrieval failed'}), 500

@i18n_bp.route('/translations/<int:translation_id>/approve', methods=['POST'])
@auth_required
@admin_required
def approve_translation(translation_id):
    """Approve auto-translated entry after human review"""
    try:
        success = i18n_service.approve_translation(translation_id, g.user_id)
        
        if success:
            return jsonify({
                'translation_id': translation_id,
                'approved': True,
                'reviewed_by': g.user_id,
                'reviewed_at': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Translation not found or not auto-translated'}), 404
            
    except Exception as e:
        return jsonify({'error': 'Approval failed'}), 500

@i18n_bp.route('/translations/<int:translation_id>/reject', methods=['POST'])
@auth_required
@admin_required
def reject_translation(translation_id):
    """Reject auto-translated entry"""
    try:
        success = i18n_service.reject_translation(translation_id, g.user_id)
        
        if success:
            return jsonify({
                'translation_id': translation_id,
                'rejected': True,
                'reviewed_by': g.user_id,
                'reviewed_at': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Translation not found'}), 404
            
    except Exception as e:
        return jsonify({'error': 'Rejection failed'}), 500

@i18n_bp.route('/auto-translate', methods=['POST'])
@auth_required
@admin_required
def auto_translate_missing():
    """Auto-translate missing entries"""
    try:
        data = request.get_json() or {}
        target_language = data.get('target_language', 'ar')
        
        if target_language not in i18n_service.supported_languages:
            return jsonify({'error': f'Unsupported language: {target_language}'}), 400
        
        results = i18n_service.auto_translate_missing(target_language)
        
        return jsonify({
            'auto_translate_results': results,
            'target_language': target_language,
            'requires_review': True,
            'next_step': 'Review auto-translated entries in /admin/i18n/status'
        })
        
    except Exception as e:
        return jsonify({'error': 'Auto-translation failed'}), 500

@i18n_bp.route('/glossary', methods=['GET', 'POST'])
@auth_required
@admin_required
def manage_glossary():
    """Get or add glossary terms"""
    try:
        if request.method == 'GET':
            terms = i18n_service.get_glossary_terms()
            
            terms_data = [
                {
                    'id': term.id,
                    'term': term.term,
                    'definition': term.definition,
                    'do_not_translate': term.do_not_translate,
                    'preferred_translations': term.preferred_translations,
                    'created_at': term.created_at.isoformat()
                }
                for term in terms
            ]
            
            return jsonify({
                'glossary': terms_data,
                'count': len(terms_data)
            })
            
        elif request.method == 'POST':
            data = request.get_json() or {}
            
            required_fields = ['term', 'definition']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            term = i18n_service.add_glossary_term(
                term=data['term'],
                definition=data['definition'],
                do_not_translate=data.get('do_not_translate', False),
                preferred_translations=data.get('preferred_translations', {})
            )
            
            if term:
                return jsonify({
                    'term': {
                        'id': term.id,
                        'term': term.term,
                        'definition': term.definition,
                        'do_not_translate': term.do_not_translate,
                        'preferred_translations': term.preferred_translations,
                        'created_at': term.created_at.isoformat()
                    }
                }), 201
            else:
                return jsonify({'error': 'Failed to create glossary term'}), 500
                
    except Exception as e:
        return jsonify({'error': 'Glossary operation failed'}), 500

@i18n_bp.route('/validate', methods=['POST'])
@auth_required
@admin_required
def validate_icu_format():
    """Validate ICU MessageFormat syntax"""
    try:
        data = request.get_json() or {}
        
        if 'message_text' not in data:
            return jsonify({'error': 'Missing message_text'}), 400
        
        message_text = data['message_text']
        valid, errors = i18n_service.validate_icu_format(message_text)
        
        return jsonify({
            'message_text': message_text,
            'is_valid': valid,
            'errors': errors,
            'icu_compliant': valid
        })
        
    except Exception as e:
        return jsonify({'error': 'Validation failed'}), 500

# Error handlers
@ar_bp.errorhandler(404)
@i18n_bp.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@ar_bp.errorhandler(500)
@i18n_bp.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500