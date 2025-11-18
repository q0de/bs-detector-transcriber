from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase_client
from services.slack_notifier import notify_new_signup

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
        try:
            response = supabase.auth.sign_up({
                'email': email,
                'password': password,
                'email_confirm': True  # Auto-confirm email for development/testing
            })
        except Exception as supabase_error:
            error_msg = str(supabase_error)
            print(f"Signup error: {error_msg}")  # Debug logging
            # Check for common Supabase errors
            if 'invalid' in error_msg.lower() and 'email' in error_msg.lower():
                return jsonify({'success': False, 'error': f'Invalid email domain. Try gmail.com, yahoo.com, or outlook.com instead.'}), 400
            if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower():
                return jsonify({'success': False, 'error': 'Email already exists'}), 400
            return jsonify({'success': False, 'error': f'Signup failed: {error_msg}'}), 400
        
        # Create user record in database (if trigger didn't already create it)
        if response.user:
            # Check if user already exists (trigger may have created it)
            user_check = supabase.table('users').select('id').eq('id', response.user.id).execute()
            
            if not user_check.data:
                # Only insert if user doesn't exist (trigger may have failed or not run yet)
                try:
                    supabase.table('users').insert({
                        'id': response.user.id,
                        'email': email,
                        'subscription_tier': 'free',
                        'subscription_status': 'active',
                        'monthly_minute_limit': 60,
                        'minutes_used_this_month': 0
                    }).execute()
                except Exception as insert_error:
                    # If insert fails due to duplicate key, user was likely created by trigger
                    error_str = str(insert_error)
                    if '23505' in error_str or 'duplicate key' in error_str.lower():
                        print(f"✅ User already exists (likely created by trigger): {response.user.id}")
                        # User exists, continue normally
                    else:
                        # Some other error, re-raise it
                        raise
            
            # Send Slack notification for new signup
            try:
                notify_new_signup(email, response.user.id, signup_method="email")
            except Exception as slack_error:
                print(f"⚠️ Slack notification failed (non-critical): {str(slack_error)}")
            
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
        print(f"Signup exception: {error_msg}")  # Debug logging
        
        # Handle duplicate key errors (user already exists)
        if '23505' in error_msg or 'duplicate key' in error_msg.lower():
            return jsonify({'success': False, 'error': 'An account with this email already exists. Please try logging in instead.'}), 400
        
        if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Email already exists. Please try logging in instead.'}), 400
        
        return jsonify({'success': False, 'error': f'Signup failed: {error_msg[:200]}'}), 400

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
                # Create user record if doesn't exist (trigger may have failed)
                try:
                    supabase.table('users').insert({
                        'id': response.user.id,
                        'email': email,
                        'subscription_tier': 'free',
                        'subscription_status': 'active',
                        'monthly_minute_limit': 60,
                        'minutes_used_this_month': 0
                    }).execute()
                except Exception as insert_error:
                    # If insert fails due to duplicate key, user was likely created by trigger
                    error_str = str(insert_error)
                    if '23505' in error_str or 'duplicate key' in error_str.lower():
                        print(f"✅ User already exists (likely created by trigger): {response.user.id}")
                        # User exists, continue normally
                    else:
                        # Some other error, re-raise it
                        raise
            
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
        print(f"Login error: {error_msg}")  # Debug logging
        
        # Check for specific Supabase errors
        if 'email not confirmed' in error_msg.lower() or 'not confirmed' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Please verify your email before logging in'}), 401
        if 'invalid login' in error_msg.lower() or 'invalid credentials' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        if 'user not found' in error_msg.lower():
            return jsonify({'success': False, 'error': 'No account found with this email. Please sign up first.'}), 401
        
        # Return more detailed error for debugging
        return jsonify({'success': False, 'error': f'Login failed: {error_msg}'}), 401

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

