from functools import wraps
from flask import request, jsonify
from services.supabase_client import get_supabase_client
import jwt

def verify_token(f):
    """Decorator to verify JWT token from Supabase"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'success': False, 'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            # Verify token with Supabase
            supabase = get_supabase_client()
            print(f"=== AUTH MIDDLEWARE: Verifying token ===")
            response = supabase.auth.get_user(token)
            
            print(f"Supabase response: {response}")
            print(f"User: {response.user if response else 'None'}")
            
            if not response or not response.user:
                print("❌ No user in response")
                return jsonify({'success': False, 'error': 'Invalid token'}), 401
            
            # Add user info to request context
            request.user = response.user
            request.user_id = response.user.id
            
            print(f"✅ User authenticated: {response.user.email} (ID: {response.user.id})")
            
        except Exception as e:
            print(f"❌ Token verification error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Token verification failed: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

