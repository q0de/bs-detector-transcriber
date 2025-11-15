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

# Configure CORS with explicit settings - Flask-CORS will handle OPTIONS automatically
CORS(app, 
     resources={r"/api/*": {"origins": allowed_origins}},
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization"],
     max_age=3600)

print(f"✅ CORS configured for all /api/* routes with origins: {allowed_origins}")

# Flask-CORS handles OPTIONS requests automatically, so we don't need custom handlers
# The after_request hook is kept minimal - Flask-CORS already sets headers correctly
@app.after_request
def after_request(response):
    # Flask-CORS should already set CORS headers, but ensure they're present
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        # Ensure headers are set (Flask-CORS should have done this already)
        if 'Access-Control-Allow-Origin' not in response.headers:
            response.headers['Access-Control-Allow-Origin'] = origin
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

