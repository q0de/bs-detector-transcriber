# Deployment Guide - November 17, 2025

## ✅ Changes Committed and Pushed

**Commit:** `868fe28`  
**Branch:** `main`  
**Status:** Pushed to GitHub ✅

---

## 📦 What's Being Deployed

### New Features:
1. **Insufficient Credits Notification** - Beautiful warning when users run out
2. **History View Results** - Click to see full past analyses
3. **Enhanced Re-Check** - Detects 7 types of corrections (not just names)
4. **Subtle Animations** - Gentle pulse instead of spinning

### Bug Fixes:
1. **JSON Serialization** - Fixed duplicate import bug
2. **Claude Models** - Uses Claude 3 with proper fallback
3. **Robust JSON Parsing** - Handles malformed AI responses

### UI Improvements:
1. **Consistent Button Styling** - Re-check matches copy button
2. **Loading States** - Subtle, professional animations
3. **History Banner** - Shows when viewing old results

---

## 🚀 Deployment Steps

### Frontend (Vercel)

**Automatic Deployment:**
Vercel will auto-deploy from your GitHub `main` branch!

1. **Check Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Find your `bs-detector-transcriber` project
   - Wait for build to complete (~2-3 minutes)
   
2. **Monitor Build:**
   ```
   Building... → Deploying... → Ready ✅
   ```

3. **Test Frontend:**
   - Visit your Vercel URL
   - Test insufficient credits notification
   - Test history view results
   - Test re-check button

**If Manual Deploy Needed:**
```bash
cd frontend
vercel --prod
```

---

### Backend (Railway/Render)

Your backend deployment depends on your hosting:

#### Option A: Railway (Auto-deploy)
1. **Go to Railway Dashboard:** https://railway.app/dashboard
2. **Find your project:** bs-detector-transcriber-backend
3. **Check deployment status:**
   - Should auto-deploy from GitHub
   - Wait for "Deployed" status
4. **Check logs** for any errors

#### Option B: Render (Auto-deploy)
1. **Go to Render Dashboard:** https://dashboard.render.com/
2. **Find your service:** bs-detector-transcriber-backend
3. **Wait for deploy to complete**
4. **Check logs:**
   ```
   Deploying... → Build succeeded → Deploy live ✅
   ```

#### Option C: Manual Deploy
If not auto-deploying:
```bash
cd backend
git pull origin main
# Restart your service (depends on platform)
```

---

## ⚙️ Environment Variables

**Make sure these are set in your backend:**

```bash
# Required for Claude AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Required for Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Optional (for Stripe if you have it)
STRIPE_SECRET_KEY=sk_...
```

**Check in your hosting dashboard:**
- Railway: Settings → Variables
- Render: Environment → Environment Variables

---

## 🧪 Post-Deployment Testing

### 1. Test Backend Health
```bash
curl https://your-backend-url.railway.app/api/health
# or
curl https://your-backend-url.onrender.com/api/health
```

Should return: `{"status": "ok"}`

### 2. Test Insufficient Credits
1. Log in to test account
2. Try to process video exceeding limit
3. Should see red notification with upgrade button

### 3. Test History View Results
1. Go to History page
2. Click "👁️ View Results" on any video
3. Should navigate to Dashboard with full analysis
4. Should see blue "📚 Loaded from history" banner

### 4. Test Re-Check Button
1. View any fact-checked video
2. Expand a claim
3. Click purple 🔄 button
4. Should show loading pulse
5. Should return detailed corrections

**Check Console Logs:**
```
Backend:
🔍 Trying model for re-check: claude-3-opus-20240229
✅ Re-check succeeded with model: claude-3-opus-20240229
📝 Raw response length: 850 characters
✅ JSON parsed successfully

Frontend:
✅ Re-check result: {verdict: "VERIFIED", ...}
```

---

## 🔍 Troubleshooting

### Frontend Issues

**Problem: Changes not showing**
```bash
# Clear browser cache
Ctrl + Shift + R  # Hard refresh

# Or redeploy
cd frontend
vercel --prod --force
```

**Problem: API errors**
- Check backend URL in `frontend/src/services/api.js`
- Make sure CORS is enabled on backend

### Backend Issues

**Problem: Re-check button fails**
- **Check API Key:**
  ```bash
  # In your hosting dashboard
  echo $ANTHROPIC_API_KEY
  # Should show: sk-ant-api03-...
  ```
- **Check Model Access:** Your key should have Claude 3 access
- **Check Logs:** Look for model errors

**Problem: Insufficient credits not working**
- Check database connection
- Verify user has correct `monthly_minute_limit` value
- Check backend logs for SQL errors

**Problem: History view results fails**
- Check Supabase connection
- Verify `videoId` is being passed correctly
- Check CORS settings

---

## 📊 Deployment Checklist

- [x] Code committed to git
- [x] Code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Railway/Render)
- [ ] Environment variables verified
- [ ] Test insufficient credits notification
- [ ] Test history view results
- [ ] Test re-check button functionality
- [ ] Check backend logs for errors
- [ ] Test on mobile devices
- [ ] Verify production database access

---

## 🎯 URLs to Check

### Frontend (Vercel):
- Production: `https://your-app.vercel.app`
- Dashboard: https://vercel.com/dashboard

### Backend (Railway):
- Production: `https://your-backend.railway.app`
- Dashboard: https://railway.app/dashboard

### Backend (Render):
- Production: `https://your-backend.onrender.com`
- Dashboard: https://dashboard.render.com/

### Database (Supabase):
- Dashboard: https://supabase.com/dashboard

---

## 📈 Monitoring

### Check These After Deploy:

1. **Vercel Analytics** - Track frontend errors
2. **Backend Logs** - Watch for API errors
3. **Supabase Logs** - Check database queries
4. **User Feedback** - Monitor for issues

---

## 🆘 Rollback Plan

If something breaks:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel and Railway/Render will auto-deploy the rollback
```

---

## 🎉 Summary

**Status:** ✅ Code committed and pushed  
**Frontend:** Auto-deploys via Vercel  
**Backend:** Auto-deploys via Railway/Render  
**Features:** 5 major improvements + 3 bug fixes  
**Testing:** All features working locally  

**Next Steps:**
1. Wait for auto-deployment (5-10 min)
2. Test production environment
3. Monitor logs
4. Celebrate! 🎊

---

## 📞 Support

If issues occur:
- Check deployment logs
- Review error messages
- Verify environment variables
- Test locally first
- Roll back if critical

**Deployment should be smooth!** All changes are tested and working. 🚀

