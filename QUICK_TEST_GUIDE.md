# Quick Testing Guide

## 🚀 What to Restart

### 1. Frontend (REQUIRED - to pick up new .env file)
**Stop the current frontend:**
- Find the terminal window running `npm start`
- Press `Ctrl + C` to stop it

**Restart the frontend:**
```powershell
cd C:\Users\micha\Projects\bs-detector-trasnscriber\frontend
npm start
```

### 2. Backend (REQUIRED - Railway is down)
**Start the backend locally:**
```powershell
cd C:\Users\micha\Projects\bs-detector-trasnscriber\backend
.\venv\Scripts\Activate.ps1
python app.py
```

**Update frontend .env to use local backend:**
Change this line in `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📝 Test Credentials

### Step 1: Create a Test Account
1. Go to `http://localhost:3000`
2. Click **"Get Started"** button
3. Fill in the signup form:
   - **Email:** `test@example.com` (or any email you want)
   - **Password:** `testpass123` (must be at least 8 characters)
   - **Confirm Password:** `testpass123`
   - ✅ Check "I agree to Terms & Privacy Policy"
4. Click **"Create Account"**

### Step 2: Verify Email (if required)
- Check your email for verification link
- OR check Supabase dashboard → Authentication → Users
- You may need to manually verify the user in Supabase

### Step 3: Sign In
1. Go to `http://localhost:3000/login`
2. Use the credentials you just created:
   - **Email:** `test@example.com` (or whatever you used)
   - **Password:** `testpass123` (or whatever you used)
3. Click **"Log In"**

## ✅ What Should Work

After signing in, you should be able to:
- ✅ See the Dashboard
- ✅ View your usage stats (60 free minutes)
- ✅ Try processing a video (will need backend running)

## 🔧 Troubleshooting

### "Cannot connect to server" error
- Make sure backend is running on `http://localhost:5000`
- Check that `frontend/.env` has `REACT_APP_API_URL=http://localhost:5000/api`

### "Email already exists" error
- Use a different email address
- OR delete the user from Supabase dashboard → Authentication → Users

### Frontend not loading
- Make sure you restarted `npm start` after creating `.env` file
- Check browser console (F12) for errors

