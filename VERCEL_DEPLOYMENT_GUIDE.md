# Vercel Deployment Guide

## 📋 New Project Setup

### 1. Import Git Repository
- **Repository:** `q0de/bs-detector-transcriber`
- **Branch:** `main`

---

### 2. Configure Project

**Project Name:**
```
bs-detector-transcriber
```
*(or any name you prefer)*

---

**Framework Preset:**
```
Create React App
```
*(Select this from the dropdown)*

---

**Root Directory:**
```
frontend
```
⚠️ **IMPORTANT:** Click "Edit" and set this to `frontend`  
This tells Vercel your React app is in the `frontend` folder, not the root.

---

**Build & Development Settings:**

**Build Command:**
```
npm run build
```

**Output Directory:**
```
build
```

**Install Command:**
```
npm install
```

**Development Command:** *(leave default)*
```
npm start
```

---

### 3. Environment Variables

Click **"Add Environment Variable"** and add these **3 variables**:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://bs-detector-transcriber-production.up.railway.app/api` |
| `REACT_APP_SUPABASE_URL` | *(Get from your Supabase project settings)* |
| `REACT_APP_SUPABASE_ANON_KEY` | *(Get from your Supabase project settings)* |

---

### 4. Deploy

Click **"Deploy"** and Vercel will:
1. Clone your repo ✅
2. Install dependencies (npm install) ✅
3. Build your React app (npm run build) ✅
4. Deploy to a .vercel.app domain ✅

---

## 🎯 After Deployment

Your app will be live at:
```
https://bs-detector-transcriber.vercel.app
```
*(or similar URL)*

---

## 🔄 Automatic Updates

Every time you push to GitHub:
- ✅ Vercel automatically rebuilds and redeploys
- ✅ No manual deployment needed!

---

## 🚀 Quick Summary

**What to set:**
1. Root Directory: `frontend`
2. Framework: Create React App
3. Add 3 environment variables (API URL, Supabase URL, Supabase Key)
4. Click Deploy!

**Done!** 🎉

