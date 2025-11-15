from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes
# Allow both localhost (for development) and production frontend URL
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
allowed_origins = [frontend_url]

# Also allow localhost:3000 in production for testing
if frontend_url != 'http://localhost:3000':
    allowed_origins.append('http://localhost:3000')

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

print(f"✅ CORS configured for all /api/* routes with origins: {allowed_origins}")

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

