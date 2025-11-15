# Testing Guide

## Quick Tests

### 1. Frontend UI Test (White Button Text)
1. Open your browser to `http://localhost:3000`
2. Look at the navbar - the "Get Started" button should have **white text**
3. Hover over it - text should stay white (not change color)

### 2. Backend API Test (Local)
```powershell
# Test root endpoint
Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing

# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing
```

### 3. Backend API Test (Railway)
```powershell
# Test root endpoint
Invoke-WebRequest -Uri "https://bs-detector-transcriber-production.up.railway.app/" -UseBasicParsing

# Test health endpoint
Invoke-WebRequest -Uri "https://bs-detector-transcriber-production.up.railway.app/api/health" -UseBasicParsing
```

## Full Application Flow Test

### Frontend Tests
1. **Homepage**
   - ✅ Check "Get Started" button has white text
   - ✅ Click "Get Started" → should navigate to `/signup`
   - ✅ Check all navigation links work

2. **Sign Up**
   - Navigate to `/signup`
   - Fill in email and password
   - Submit → should create account and redirect to dashboard

3. **Login**
   - Navigate to `/login`
   - Enter credentials
   - Submit → should authenticate and redirect to dashboard

4. **Dashboard**
   - Should show user's video history
   - Should show usage stats
   - "Process Video" button should work

5. **Video Processing**
   - Click "Process Video"
   - Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
   - Select analysis type
   - Submit → should process and show results

### Backend Tests

#### Health Check
```bash
curl http://localhost:5000/api/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

#### Auth Endpoints
```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## Current Issues

### Backend (Railway)
- ❌ Getting 502 Bad Gateway errors
- Need to check Railway deploy logs for crash reasons
- Application workers are starting but then stopping

### Backend (Local)
- ⚠️ Whisper installation failing on Windows
- Can test API endpoints without Whisper (will fail on video processing)

## Next Steps

1. ✅ Test frontend UI changes (white button text)
2. ⏳ Fix Railway backend deployment (check logs)
3. ⏳ Test full signup/login flow
4. ⏳ Test video processing with a real YouTube URL

