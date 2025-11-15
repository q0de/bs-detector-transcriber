from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')])

# Import routes
from routes import auth, videos, payments, users

# Register blueprints
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(videos.bp, url_prefix='/api/videos')
app.register_blueprint(payments.bp, url_prefix='/api/payments')
app.register_blueprint(users.bp, url_prefix='/api/users')

@app.route('/', methods=['GET'])
def root():
    return {'message': 'Video Transcriber API', 'status': 'running'}, 200

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'timestamp': __import__('datetime').datetime.utcnow().isoformat()}, 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

