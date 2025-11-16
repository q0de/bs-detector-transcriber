from flask import Flask, request, make_response
from dotenv import load_dotenv
import os
import sys

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
    if request.method == "OPTIONS":
        origin = request.headers.get('Origin', '')
        response = make_response('', 204)
        
        # Set CORS headers for preflight
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = allowed_origins[0]
            
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response

# Add CORS headers to ALL responses
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin', '')
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    elif allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = allowed_origins[0]
        
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Import routes with error handling
# Note: Routes are imported but health check should work even if routes fail
try:
    print("📦 Importing routes...")
    from routes import auth, videos, payments, users
    print("✅ Routes imported successfully")
    
    # Register blueprints
    print("📝 Registering blueprints...")
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(videos.bp, url_prefix='/api/videos')
    app.register_blueprint(payments.bp, url_prefix='/api/payments')
    app.register_blueprint(users.bp, url_prefix='/api/users')
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

