from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase_client

bp = Blueprint('auth', __name__)

@bp.route('/signup', methods=['POST'])
def signup():
    """Register new user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        if len(password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
        
        supabase = get_supabase_client()
        
        # Sign up user
        response = supabase.auth.sign_up({
            'email': email,
            'password': password
        })
        
        # Create user record in database
        if response.user:
            # Insert user into users table
            supabase.table('users').insert({
                'id': response.user.id,
                'email': email,
                'subscription_tier': 'free',
                'subscription_status': 'active',
                'monthly_minute_limit': 60,
                'minutes_used_this_month': 0
            }).execute()
            
            return jsonify({
                'success': True,
                'message': 'Check your email to verify your account',
                'user': {
                    'id': response.user.id,
                    'email': response.user.email
                }
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create user'}), 400
            
    except Exception as e:
        error_msg = str(e)
        if 'already registered' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Email already exists'}), 400
        return jsonify({'success': False, 'error': error_msg}), 400

@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        supabase = get_supabase_client()
        
        # Sign in user
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        
        if response.user and response.session:
            # Ensure user record exists in database
            user_check = supabase.table('users').select('id').eq('id', response.user.id).execute()
            if not user_check.data:
                # Create user record if doesn't exist
                supabase.table('users').insert({
                    'id': response.user.id,
                    'email': email,
                    'subscription_tier': 'free',
                    'subscription_status': 'active',
                    'monthly_minute_limit': 60,
                    'minutes_used_this_month': 0
                }).execute()
            
            return jsonify({
                'success': True,
                'user': {
                    'id': response.user.id,
                    'email': response.user.email
                },
                'session': {
                    'access_token': response.session.access_token,
                    'expires_at': response.session.expires_at
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
            
    except Exception as e:
        error_msg = str(e)
        if 'email not confirmed' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Please verify your email'}), 401
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    try:
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Send password reset email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400
        
        supabase = get_supabase_client()
        supabase.auth.reset_password_for_email(email)
        
        return jsonify({
            'success': True,
            'message': 'Password reset email sent'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

