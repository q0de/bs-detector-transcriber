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
            response = supabase.auth.get_user(token)
            
            if not response or not response.user:
                return jsonify({'success': False, 'error': 'Invalid token'}), 401
            
            # Add user info to request context
            request.user = response.user
            request.user_id = response.user.id
            
        except Exception as e:
            return jsonify({'success': False, 'error': 'Token verification failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

