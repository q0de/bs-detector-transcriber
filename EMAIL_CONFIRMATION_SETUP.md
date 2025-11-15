# Email Confirmation Setup

## Option 1: Disable Email Confirmation in Supabase (Recommended for Development)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Settings** (or **Configuration**)
4. Find **"Enable email confirmations"** or **"Confirm email"** setting
5. **Turn OFF** email confirmation
6. Save changes

Now users can sign up and login immediately without email confirmation.

---

## Option 2: Auto-Confirm Users (Already Implemented)

The backend is now configured to auto-confirm users during signup using `email_confirm: True`.

However, you may still need to disable email confirmation in Supabase settings for this to work fully.

---

## Option 3: Manually Confirm Users in Supabase Dashboard

If you want to keep email confirmation enabled but manually confirm test users:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the user you want to confirm
3. Click on the user
4. Click **"Confirm Email"** or **"Verify Email"** button
5. User can now login

---

## For Production

In production, you should:
- ✅ Keep email confirmation **ENABLED**
- ✅ Remove `email_confirm: True` from signup
- ✅ Users will receive verification emails
- ✅ Only confirmed users can login

---

## Current Setup (Development)

- ✅ Backend auto-confirms users (`email_confirm: True`)
- ⚠️ You may still need to disable email confirmation in Supabase dashboard for immediate login

