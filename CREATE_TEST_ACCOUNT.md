# Create Test Account - Step by Step

## ✅ Simple Steps to Create a Working Test Account

### Step 1: Sign Up
1. Go to: `http://localhost:3000`
2. Click: **"Get Started"** button
3. Fill in the form:
   - **Email:** `test@test.com`
   - **Password:** `testpass123`
   - **Confirm Password:** `testpass123`
   - ✅ **Check:** "I agree to Terms & Privacy Policy"
4. Click: **"Create Account"**

### Step 2: Login Immediately
1. You'll be redirected to login page (or go to `http://localhost:3000/login`)
2. Enter:
   - **Email:** `test@test.com`
   - **Password:** `testpass123`
3. Click: **"Log In"**

---

## ✅ Why This Works

- ✅ Backend auto-confirms emails (`email_confirm: True`)
- ✅ Account is ready immediately after signup
- ✅ No email verification needed
- ✅ You know the password because you set it

---

## 🔧 If You Still Get "Invalid Email or Password"

1. **Make sure backend is running:**
   - Check terminal running `python app.py`
   - Should see: `Running on http://0.0.0.0:5000`

2. **Try a different email:**
   - Use: `test2@test.com` / `testpass123`

3. **Check browser console (F12):**
   - Look for any error messages
   - Check Network tab for API responses

4. **Clear browser cache:**
   - Sometimes old data causes issues

---

## 📝 Test Credentials Summary

**Email:** `test@test.com`  
**Password:** `testpass123`

These will work after you sign up with them!

