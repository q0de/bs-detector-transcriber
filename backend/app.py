from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes - explicit origins only (no wildcards)
# Flask-CORS doesn't support wildcard patterns, so we use explicit domains
allowed_origins = [
    'http://localhost:3000',
    'https://bs-detector-transcriber.vercel.app'
]

# Add FRONTEND_URL from environment if set
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

# Configure CORS globally - Flask-CORS handles OPTIONS automatically
# Use resources pattern to apply to /api/* routes specifically
CORS(app, 
     resources={
         r"/api/*": {
             "origins": allowed_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "expose_headers": ["Content-Type", "Authorization"],
             "max_age": 3600
         }
     })

print(f"✅ CORS configured for /api/* routes with origins: {allowed_origins}")

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

@app.route('/', methods=['GET', 'OPTIONS'])
def root():
    """Root endpoint - no dependencies, always works"""
    try:
        response_data = {'message': 'Video Transcriber API', 'status': 'running'}
        response = app.make_response(response_data)
        response.status_code = 200
        # Ensure CORS headers are set
        origin = request.headers.get('Origin')
        if origin and origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
        import traceback
        traceback.print_exc()
        error_response = app.make_response({'message': 'Video Transcriber API', 'status': 'error', 'error': str(e)})
        error_response.status_code = 500
        return error_response

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint - minimal dependencies, no auth required"""
    try:
        import datetime
        response_data = {
            'status': 'healthy', 
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'cors_origins': allowed_origins
        }
        response = app.make_response(response_data)
        response.status_code = 200
        # Ensure CORS headers are set
        origin = request.headers.get('Origin')
        if origin and origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
        import traceback
        traceback.print_exc()
        error_response = app.make_response({'status': 'error', 'error': str(e)})
        error_response.status_code = 500
        return error_response

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

