from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes - more permissive configuration
# Allow both localhost (for development) and production frontend URL
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
allowed_origins = [frontend_url]

# Also allow localhost:3000 in production for testing
if frontend_url != 'http://localhost:3000':
    allowed_origins.append('http://localhost:3000')

# TEMPORARY: Allow Vercel domain until FRONTEND_URL is set in Railway
vercel_domains = [
    'https://bs-detector-transcriber.vercel.app',
    'https://bs-detector-transcriber-*.vercel.app'  # Wildcard for preview deployments
]
for domain in vercel_domains:
    if domain not in allowed_origins:
        allowed_origins.append(domain)

# Configure CORS with explicit settings
CORS(app, 
     resources={r"/api/*": {"origins": allowed_origins}},
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization"],
     max_age=3600)

print(f"✅ CORS configured for all /api/* routes with origins: {allowed_origins}")

# Add explicit CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    # Check exact match or wildcard match for Vercel preview deployments
    if origin:
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        elif origin and origin.startswith('https://bs-detector-transcriber-') and origin.endswith('.vercel.app'):
            # Allow any Vercel preview deployment
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Handle OPTIONS requests explicitly (for CORS preflight)
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        if origin:
            # Check exact match or Vercel preview deployment
            if origin in allowed_origins or (origin.startswith('https://bs-detector-transcriber-') and origin.endswith('.vercel.app')):
                response = app.make_default_options_response()
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Max-Age'] = '3600'
                return response

# Import routes with error handling
try:
    from routes import auth, videos, payments, users
    
    # Register blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(videos.bp, url_prefix='/api/videos')
    app.register_blueprint(payments.bp, url_prefix='/api/payments')
    app.register_blueprint(users.bp, url_prefix='/api/users')
except Exception as e:
    print(f"Error importing routes: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    raise

@app.route('/', methods=['GET'])
def root():
    return {'message': 'Video Transcriber API', 'status': 'running'}, 200

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'timestamp': __import__('datetime').datetime.utcnow().isoformat()}, 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

