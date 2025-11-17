# Google Sign-In Setup Guide

## 📋 Prerequisites

Before implementing Google Sign-In in the code, you need to configure:
1. Google Cloud Console (OAuth credentials)
2. Supabase Authentication Settings

---

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name: `BS Detector` (or your app name)
4. Click **"Create"**

### 1.2 Configure OAuth Consent Screen

1. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (for public access)
3. Fill in the details:
   - **App name:** BS Detector
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **"Save and Continue"**
5. Skip **"Scopes"** (click "Save and Continue")
6. Add test users if in testing mode
7. Click **"Save and Continue"**

### 1.3 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Name: `BS Detector Web Client`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://yourdomain.com (when deployed)
   ```
6. **Authorized redirect URIs:** (IMPORTANT - get from Supabase)
   ```
   https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   
   To find your redirect URL:
   - Go to Supabase Dashboard
   - Your project → Authentication → Providers
   - The redirect URL will be shown in the Google provider settings

7. Click **"Create"**
8. **SAVE THESE CREDENTIALS:**
   - ✅ Client ID: `xxxx.apps.googleusercontent.com`
   - ✅ Client Secret: `GOCSPX-xxxxx`

---

## 🔐 Step 2: Supabase Configuration

### 2.1 Enable Google Provider

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the provider list
5. Toggle **"Enable Sign in with Google"** to ON

### 2.2 Configure Google Provider

1. Paste your **Client ID** from Google Cloud Console
2. Paste your **Client Secret** from Google Cloud Console
3. **Redirect URL** - Copy this and add it to Google Cloud Console (Step 1.3 #6)
4. Click **"Save"**

### 2.3 Configure Site URL (Important!)

1. Still in Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL:**
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Set **Redirect URLs:**
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (when deployed)
4. Click **"Save"**

---

## ✅ Step 3: Verify Setup

### Test Checklist:

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Secret saved
- [ ] Supabase Google provider enabled
- [ ] Client ID/Secret added to Supabase
- [ ] Redirect URLs configured in both Google and Supabase
- [ ] Site URL configured in Supabase

---

## 🚀 Step 4: Test Google Sign-In

Once configured:

1. Refresh your app at `http://localhost:3000`
2. Go to Login or Signup page
3. Click **"Continue with Google"** button
4. You should see Google's OAuth consent screen
5. Select your Google account
6. App will redirect back and you'll be logged in!

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
**Fix:** Make sure the redirect URI in Google Cloud Console matches exactly:
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

### Error: "Invalid client"
**Fix:** Double-check Client ID and Client Secret in Supabase settings

### Error: "Access blocked: BS Detector has not completed verification"
**Fix:** Add yourself as a test user in Google Cloud Console → OAuth consent screen

### Sign-in succeeds but user not created
**Fix:** Check Supabase logs (Authentication → Logs) for errors

---

## 🎯 What Happens on Sign-In?

1. User clicks "Continue with Google"
2. Redirected to Google's OAuth consent screen
3. User selects Google account and grants permissions
4. Google redirects back to Supabase callback URL
5. Supabase creates/retrieves user record
6. User is redirected to your app with session token
7. App stores session and redirects to dashboard
8. User gets 60 free minutes (new users)!

---

## 📝 Next Steps After Setup

After completing the configuration above:

1. The Google Sign-In button will appear on Login/Signup pages
2. Users can sign in with one click
3. New Google users automatically get 60 free minutes
4. Email/password auth still works for existing users
5. Users can link Google account to existing email accounts (future feature)

---

## 🔒 Security Notes

- **Client Secret** should be stored in Supabase only (not in frontend code)
- Supabase handles all OAuth token management
- Sessions are automatically refreshed by Supabase
- Users are automatically created in your `users` table via database trigger
- All sign-ins are logged in Supabase auth logs

---

## 📚 Additional Resources

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)

---

## ⚙️ Environment Variables

No additional environment variables needed! Your existing Supabase credentials are sufficient:

```env
REACT_APP_SUPABASE_URL=your_url
REACT_APP_SUPABASE_ANON_KEY=your_key
```

Supabase manages the Google OAuth credentials internally.

