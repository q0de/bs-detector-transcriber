from flask import Flask, request, make_response, jsonify
from dotenv import load_dotenv
import os
import sys
import io

# Fix Windows console encoding for emoji/unicode
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv()

app = Flask(__name__)

# CORS allowed origins
allowed_origins = [
    'http://localhost:3000',
    'https://bs-detector-transcriber.vercel.app'
]

# Add FRONTEND_URL from environment if set
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

print(f"✅ CORS configured with origins: {allowed_origins}")

# Handle ALL OPTIONS requests first (preflight)
@app.before_request
def handle_options():
    try:
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin', 'NO_ORIGIN')
            print(f"🔵 OPTIONS preflight from: {origin}")
            print(f"   Path: {request.path}")
            print(f"   Allowed origins: {allowed_origins}")
            
            response = make_response('', 204)
            
            # Set CORS headers for preflight
            if origin in allowed_origins:
                response.headers['Access-Control-Allow-Origin'] = origin
                print(f"   ✅ Origin matched - setting: {origin}")
            else:
                response.headers['Access-Control-Allow-Origin'] = allowed_origins[0] if allowed_origins else '*'
                print(f"   ⚠️ Origin NOT matched - using fallback: {allowed_origins[0] if allowed_origins else '*'}")
                
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = '86400'
            
            print(f"   📤 Returning 204 with CORS headers")
            return response
    except Exception as e:
        print(f"❌ Error in handle_options: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    return None

# Add CORS headers to ALL responses
@app.after_request
def add_cors_headers(response):
    try:
        origin = request.headers.get('Origin', 'NO_ORIGIN')
        
        # Only log non-static and non-health-check requests
        # Skip logging for Render health checks (GET / from Render/1.0)
        user_agent = request.headers.get('User-Agent', '')
        is_health_check = (request.path == '/' or request.path == '/api/health') and 'Render' in user_agent
        
        if not request.path.startswith('/static') and not is_health_check:
            print(f"🟢 {request.method} {request.path} - Origin: {origin}")
        
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        elif allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = allowed_origins[0]
            
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
    except Exception as e:
        print(f"❌ Error in add_cors_headers: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    
    return response

# Import routes with error handling
# Note: Routes are imported but health check should work even if routes fail
try:
    print("📦 Importing routes...")
    from routes import auth, videos, videos_free, payments, users, referrals, badges
    print("✅ Routes imported successfully")
    
    # Register blueprints
    print("📝 Registering blueprints...")
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(videos.bp, url_prefix='/api/videos')
    app.register_blueprint(videos_free.bp, url_prefix='/api/videos')  # Free anonymous endpoint
    app.register_blueprint(payments.bp, url_prefix='/api/payments')
    app.register_blueprint(users.bp, url_prefix='/api/users')
    app.register_blueprint(referrals.referrals_bp, url_prefix='/api/referrals')
    app.register_blueprint(badges.badges_bp, url_prefix='/api/badges')
    print("✅ Blueprints registered successfully")
except Exception as e:
    print(f"❌ Error importing/registering routes: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    # Don't raise - allow app to start even if routes fail (for debugging)
    print("⚠️ App will start but routes may not work")

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - no dependencies, always works"""
    return {'message': 'Video Transcriber API', 'status': 'running'}, 200

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint - minimal dependencies, no auth required"""
    import datetime
    return {
        'status': 'healthy', 
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'cors_origins': allowed_origins
    }, 200

@app.route('/api/test-proxy', methods=['GET'])
def test_proxy():
    """Test endpoint to check proxy configuration"""
    import os
    from services.video_processor import VideoProcessor
    
    try:
        # Check environment variables
        proxy_host = os.environ.get('PROXY_HOST')
        proxy_port = os.environ.get('PROXY_PORT')
        proxy_username = os.environ.get('PROXY_USERNAME')
        proxy_password = os.environ.get('PROXY_PASSWORD')
        proxy_url = os.environ.get('PROXY_URL')
        
        # Try to initialize VideoProcessor to see what it detects
        processor = VideoProcessor()
        
        result = {
            'proxy_url_set': bool(proxy_url),
            'proxy_host_set': bool(proxy_host),
            'proxy_port_set': bool(proxy_port),
            'proxy_username_set': bool(proxy_username),
            'proxy_password_set': bool(proxy_password),
            'processor_proxy_detected': bool(processor.proxy_url),
            'processor_proxy_url': processor.proxy_url.split('@')[1] if processor.proxy_url and '@' in processor.proxy_url else None
        }
        
        return jsonify({
            'success': True,
            'proxy_configured': bool(processor.proxy_url),
            'details': result
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

