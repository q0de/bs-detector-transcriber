from flask import Blueprint, request, jsonify
from middleware.auth_middleware import verify_token
from services.supabase_client import get_supabase_client
import random
import string

referrals_bp = Blueprint('referrals', __name__)
supabase = get_supabase_client()

@referrals_bp.route('/code', methods=['GET'])
@verify_token
def get_referral_code():
    """Get or generate user's referral code"""
    try:
        user_id = request.user_id
        
        # Get user's current referral code
        user_response = supabase.table('users').select('referral_code').eq('id', user_id).execute()
        
        if not user_response.data:
            return jsonify({'error': 'User not found'}), 404
        
        user = user_response.data[0]
        referral_code = user.get('referral_code')
        
        # Generate code if doesn't exist
        if not referral_code:
            referral_code = supabase.rpc('generate_referral_code').execute().data
            
            # Update user with code
            supabase.table('users').update({
                'referral_code': referral_code
            }).eq('id', user_id).execute()
        
        return jsonify({
            'referral_code': referral_code,
            'referral_url': f"{request.host_url}signup?ref={referral_code}"
        }), 200
        
    except Exception as e:
        print(f"Error getting referral code: {str(e)}")
        return jsonify({'error': str(e)}), 500


@referrals_bp.route('/apply', methods=['POST'])
@verify_token
def apply_referral():
    """Apply a referral code"""
    try:
        user_id = request.user_id
        data = request.json
        referral_code = data.get('referral_code', '').strip().upper()
        
        if not referral_code:
            return jsonify({'error': 'Referral code required'}), 400
        
        # Apply referral using database function
        result = supabase.rpc('apply_referral_code', {
            'p_user_id': user_id,
            'p_referral_code': referral_code
        }).execute()
        
        if result.data and isinstance(result.data, dict):
            if result.data.get('success'):
                return jsonify({
                    'success': True,
                    'message': 'Referral code applied! You\'ll get bonus minutes when you subscribe.'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': result.data.get('error', 'Failed to apply referral code')
                }), 400
        
        return jsonify({'error': 'Unexpected response'}), 500
        
    except Exception as e:
        print(f"Error applying referral: {str(e)}")
        return jsonify({'error': str(e)}), 500


@referrals_bp.route('/stats', methods=['GET'])
@verify_token
def get_referral_stats():
    """Get user's referral statistics"""
    try:
        user_id = request.user_id
        
        # Get referral stats
        referrals_response = supabase.table('referrals').select('*').eq('referrer_user_id', user_id).execute()
        
        referrals = referrals_response.data or []
        
        total_referrals = len(referrals)
        completed_referrals = len([r for r in referrals if r['status'] in ['completed', 'rewarded']])
        pending_referrals = len([r for r in referrals if r['status'] == 'pending'])
        
        # Get bonus minutes earned
        user_response = supabase.table('users').select('referral_bonus_minutes').eq('id', user_id).execute()
        bonus_minutes = user_response.data[0].get('referral_bonus_minutes', 0) if user_response.data else 0
        
        return jsonify({
            'total_referrals': total_referrals,
            'completed_referrals': completed_referrals,
            'pending_referrals': pending_referrals,
            'bonus_minutes_earned': bonus_minutes,
            'referrals': [
                {
                    'id': r['id'],
                    'status': r['status'],
                    'created_at': r['created_at'],
                    'completed_at': r.get('completed_at'),
                    'reward_minutes': r['reward_minutes']
                }
                for r in referrals
            ]
        }), 200
        
    except Exception as e:
        print(f"Error getting referral stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

