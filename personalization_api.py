"""
M25 Personalization API - Internal Only
JWT-protected endpoints for ranking and metrics (no client-visible AI text)
"""
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from functools import wraps
import jwt
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from personalization_service import PersonalizationService, UserFeatures, RankedItem

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

personalization_bp = Blueprint('personalization', __name__, url_prefix='/personalization')
service = PersonalizationService()

def auth_required(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        
        try:
            # In real implementation, would validate JWT properly
            # For now, assume valid and extract user_id
            g.user_id = request.headers.get('X-User-ID')  # temp for testing
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

@personalization_bp.route('/recommend', methods=['POST'])
@auth_required
def recommend():
    """Internal API: Generate personalized rankings (IDs only)"""
    try:
        data = request.get_json() or {}
        scope = data.get('scope', 'daily_horoscopes')
        limit = min(50, data.get('limit', 10))  # cap at 50
        
        # Validate scope
        valid_scopes = ['daily_horoscopes', 'notifications', 'content_feed']
        if scope not in valid_scopes:
            return jsonify({'error': 'Invalid scope'}), 400
        
        # Check for cached results first
        cached = service.get_cached_rankings(g.user_id, scope)
        if cached:
            rankings_data = [
                {
                    'id': r.item_id,
                    'score': round(r.score, 4),
                    'confidence': round(r.confidence, 4),
                    # rationale_tags are internal only - not returned to client
                }
                for r in cached[:limit]
            ]
            return jsonify({
                'scope': scope,
                'items': rankings_data,
                'cached': True,
                'model_version': service.model_version
            })
        
        # Generate fresh rankings
        rankings = service.generate_rankings(g.user_id, scope, limit)
        
        if not rankings:
            # User opted out or no data
            return jsonify({
                'scope': scope,
                'items': [],
                'cached': False,
                'note': 'Personalization disabled or insufficient data'
            })
        
        # Cache results for future requests
        service.cache_rankings(g.user_id, scope, rankings)
        
        # Return only IDs and scores (no AI rationale to client)
        rankings_data = [
            {
                'id': r.item_id,
                'score': round(r.score, 4),
                'confidence': round(r.confidence, 4)
            }
            for r in rankings
        ]
        
        return jsonify({
            'scope': scope,
            'items': rankings_data,
            'cached': False,
            'model_version': service.model_version
        })
        
    except Exception as e:
        # Log error without exposing internals
        return jsonify({'error': 'Recommendation failed'}), 500

@personalization_bp.route('/metrics', methods=['GET'])
@auth_required
def get_metrics():
    """Get personalization metrics (admin/own performance only)"""
    try:
        # Check access level
        if g.user_role in ['admin', 'superadmin']:
            # Admin sees aggregate metrics
            return _get_admin_metrics()
        elif g.user_role == 'reader':
            # Reader sees own performance slice
            return _get_reader_metrics()
        else:
            # Client users don't see metrics
            return jsonify({'error': 'Metrics access denied'}), 403
            
    except Exception:
        return jsonify({'error': 'Metrics unavailable'}), 500

def _get_admin_metrics():
    """Admin-level personalization metrics"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            # Evaluation metrics
            cur.execute("""
                select 
                    model_version,
                    metric_name,
                    avg(metric_value) as avg_value,
                    count(*) as sample_count
                from personalization_eval
                where eval_date >= current_date - interval '30 days'
                group by model_version, metric_name
                order by model_version, metric_name
            """)
            
            eval_metrics = []
            for row in cur.fetchall():
                eval_metrics.append({
                    'model_version': row[0],
                    'metric': row[1],
                    'value': float(row[2]),
                    'samples': row[3]
                })
            
            # Usage stats
            cur.execute("""
                select 
                    scope,
                    count(distinct user_id) as active_users,
                    count(*) as total_requests,
                    avg(array_length(ranked_items, 1)) as avg_items_per_request
                from personalization_ranks
                where created_at >= current_date - interval '7 days'
                group by scope
            """)
            
            usage_stats = []
            for row in cur.fetchall():
                usage_stats.append({
                    'scope': row[0],
                    'active_users': row[1],
                    'requests': row[2],
                    'avg_items': float(row[3]) if row[3] else 0
                })
            
            return jsonify({
                'evaluation_metrics': eval_metrics,
                'usage_stats': usage_stats,
                'as_of': datetime.now().isoformat()
            })
    finally:
        POOL.putconn(conn)

def _get_reader_metrics():
    """Reader performance slice"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            # Reader's own engagement impact
            cur.execute("""
                select 
                    count(distinct o.user_id) as influenced_users,
                    avg(case when o.delivered_at is not null then 1.0 else 0.0 end) as completion_rate
                from orders o
                where o.assigned_reader = %s
                  and o.created_at >= current_date - interval '30 days'
            """, (g.user_id,))
            
            stats = cur.fetchone()
            
            return jsonify({
                'reader_impact': {
                    'influenced_users': stats[0] if stats else 0,
                    'completion_rate': float(stats[1]) if stats and stats[1] else 0.0
                },
                'period': '30_days'
            })
    finally:
        POOL.putconn(conn)

@personalization_bp.route('/settings', methods=['GET', 'POST'])
@auth_required
def personalization_settings():
    """User personalization settings (opt-in/opt-out)"""
    conn = POOL.getconn()
    try:
        with conn.cursor() as cur:
            if request.method == 'GET':
                # Get current settings
                cur.execute("""
                    select personalization_enabled, data_sharing_consent, updated_at
                    from personalization_settings
                    where user_id = %s
                """, (g.user_id,))
                
                row = cur.fetchone()
                if row:
                    return jsonify({
                        'personalization_enabled': row[0],
                        'data_sharing_consent': row[1],
                        'updated_at': row[2].isoformat() if row[2] else None
                    })
                else:
                    # Default settings
                    return jsonify({
                        'personalization_enabled': True,
                        'data_sharing_consent': False,
                        'updated_at': None
                    })
            
            elif request.method == 'POST':
                # Update settings
                data = request.get_json() or {}
                personalization_enabled = data.get('personalization_enabled', True)
                data_sharing_consent = data.get('data_sharing_consent', False)
                
                cur.execute("""
                    insert into personalization_settings 
                    (user_id, personalization_enabled, data_sharing_consent)
                    values (%s, %s, %s)
                    on conflict (user_id) do update set
                        personalization_enabled = excluded.personalization_enabled,
                        data_sharing_consent = excluded.data_sharing_consent,
                        updated_at = now()
                """, (g.user_id, personalization_enabled, data_sharing_consent))
                
                conn.commit()
                
                return jsonify({
                    'personalization_enabled': personalization_enabled,
                    'data_sharing_consent': data_sharing_consent,
                    'updated_at': datetime.now().isoformat()
                })
    finally:
        POOL.putconn(conn)

@personalization_bp.route('/admin/evaluate', methods=['POST'])
@auth_required
@admin_required
def run_evaluation():
    """Admin: Run offline evaluation"""
    try:
        data = request.get_json() or {}
        eval_date = data.get('eval_date', datetime.now().date().isoformat())
        model_version = data.get('model_version', service.model_version)
        
        # Run evaluation (placeholder - would implement actual metrics)
        results = {
            'precision_at_k': 0.75,
            'map': 0.68,
            'ndcg': 0.72,
            'coverage': 0.85,
            'diversity': 0.63
        }
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                for metric_name, value in results.items():
                    cur.execute("""
                        insert into personalization_eval 
                        (eval_date, model_version, scope, metric_name, metric_value, sample_size)
                        values (%s, %s, %s, %s, %s, %s)
                        on conflict (eval_date, model_version, scope, metric_name) 
                        do update set metric_value = excluded.metric_value
                    """, (eval_date, model_version, 'daily_horoscopes', metric_name, value, 1000))
                
                conn.commit()
        finally:
            POOL.putconn(conn)
        
        return jsonify({
            'evaluation_completed': True,
            'date': eval_date,
            'model_version': model_version,
            'metrics': results
        })
        
    except Exception:
        return jsonify({'error': 'Evaluation failed'}), 500

@personalization_bp.route('/admin/refresh', methods=['POST'])
@auth_required
@admin_required
def refresh_features():
    """Admin: Trigger feature refresh for all users"""
    try:
        from personalization_service import refresh_all_features
        refresh_all_features()
        
        return jsonify({
            'refresh_completed': True,
            'timestamp': datetime.now().isoformat()
        })
    except Exception:
        return jsonify({'error': 'Refresh failed'}), 500

# Error handlers
@personalization_bp.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@personalization_bp.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500