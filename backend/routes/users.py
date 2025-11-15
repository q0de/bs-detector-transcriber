from flask import Blueprint, request, jsonify
from middleware.auth_middleware import verify_token
from services.supabase_client import get_supabase_client

bp = Blueprint('users', __name__)

@bp.route('/me', methods=['GET'])
@verify_token
def get_current_user():
    """Get current user profile"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get user from database
        response = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = response.data[0]
        
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'subscription_tier': user.get('subscription_tier', 'free'),
            'subscription_status': user.get('subscription_status', 'active'),
            'minutes_used_this_month': float(user.get('minutes_used_this_month', 0)),
            'monthly_minute_limit': user.get('monthly_minute_limit', 60),
            'created_at': user.get('created_at')
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/usage', methods=['GET'])
@verify_token
def get_usage():
    """Get usage statistics"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get user from database
        response = supabase.table('users').select('minutes_used_this_month, monthly_minute_limit, last_reset_date').eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = response.data[0]
        used = float(user.get('minutes_used_this_month', 0))
        limit = user.get('monthly_minute_limit', 60)
        remaining = max(0, limit - used)
        percentage = (used / limit * 100) if limit > 0 else 0
        
        # Calculate reset date (1st of next month)
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        if now.day == 1:
            reset_date = now.date()
        else:
            next_month = now.replace(day=1) + timedelta(days=32)
            reset_date = next_month.replace(day=1).date()
        
        return jsonify({
            'used': used,
            'limit': limit,
            'remaining': remaining,
            'tier': user.get('subscription_tier', 'free'),
            'reset_date': reset_date.isoformat(),
            'percentage': round(percentage, 1)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/me', methods=['DELETE'])
@verify_token
def delete_account():
    """Delete user account"""
    try:
        data = request.get_json()
        password = data.get('password') if data else None
        
        # TODO: Verify password before deletion
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Delete user from auth
        supabase.auth.admin.delete_user(user_id)
        
        return jsonify({
            'success': True,
            'message': 'Account deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

