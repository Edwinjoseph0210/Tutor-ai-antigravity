# 🚀 Complete Deployment Guide for Tutor AI

This guide covers **complete cloud deployment** with troubleshooting steps.

---

## ✅ Pre-Deployment Checklist

- [x] Code is pushed to GitHub
- [x] `pyttsx3` import is optional (won't crash on cloud)
- [x] `face_recognition` import is optional (DISABLE_FACE_RECO=1 for free tier)
- [x] Frontend has proper backend URL detection
- [x] CORS settings ready for production domains

---

## 📦 Step 1: Deploy Backend (Render)

### 1.1 Create Web Service

1. Go to **[dashboard.render.com](https://dashboard.render.com)**
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `Edwinjoseph0210/Tutor-ai-antigravity`
4. Configure:
   - **Name**: `tutor-ai-backend`
   - **Runtime**: `Python 3`
   - **Root Directory**: Leave blank (root of repo)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: 
     ```
     gunicorn --worker-class gthread --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
     ```
   - **Instance Type**: **Free**

### 1.2 Environment Variables

Add these in the **Environment** section:

| Key | Value | Why |
|-----|-------|-----|
| `GEMINI_API_KEY` | `YOUR_API_KEY` | For AI lecture generation |
| `DISABLE_FACE_RECO` | `1` | **CRITICAL**: Disables face_recognition (too heavy for free tier) |
| `FLASK_ENV` | `production` | Production mode |

### 1.3 Deploy & Get URL

1. Click **Create Web Service**
2. Wait ~5-10 minutes for first build
3. **Copy your backend URL** (e.g., `https://tutor-ai-backend.onrender.com`)
4. Test it: Visit `https://tutor-ai-backend.onrender.com/api/health`
   - Should return: `{"status":"ok"}`

---

## 🎨 Step 2: Update Frontend Backend URL

### 2.1 Update SocketContext.js

The file already has proper detection, but **verify** the production URL:

**File**: `frontend/src/contexts/SocketContext.js` (Line 16)

```javascript
// Production URL (fallback)
return 'https://tutor-ai-backend.onrender.com'; // ✅ UPDATE THIS
```

Replace with **YOUR ACTUAL Render backend URL**.

### 2.2 Commit Changes

```bash
cd /Users/apple/Downloads/Tutor-ai-antigravity-main
git add frontend/src/contexts/SocketContext.js
git commit -m "Update production backend URL"
git push origin main
```

---

## 🌐 Step 3: Deploy Frontend (Vercel)

### Method A: Vercel Dashboard (Recommended)

1. Go to **[vercel.com](https://vercel.com)**
2. Sign in with **GitHub**
3. Click **Add New...** → **Project**
4. Import `Edwinjoseph0210/Tutor-ai-antigravity` repository

#### ⚙️ Configure Project Settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Create React App (auto-detects) |
| **Root Directory** | Click **Edit** → Select `frontend` ⬅️ **CRITICAL** |
| **Build Command** | `npm run build` (auto-fills) |
| **Output Directory** | `build` (auto-fills) |
| **Install Command** | `npm install` (auto-fills) |

5. Click **Deploy**
6. Wait ~3-5 minutes
7. **Copy your Vercel URL** (e.g., `https://tutor-ai-antigravity.vercel.app`)

### Method B: Vercel CLI (Alternative)

```bash
cd /Users/apple/Downloads/Tutor-ai-antigravity-main/frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? tutor-ai-frontend
# - Directory? ./
# - Override settings? N

# For production:
vercel --prod
```

---

## 🔧 Step 4: Update Backend CORS for Vercel

Once you have your Vercel URL, update the backend to accept requests:

**File**: `app.py` (Lines 93-98)

```python
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://ai-tutor-94ff4.web.app',
    'https://aitutor-team.web.app',
    'https://tutor-ai-antigravity.vercel.app'  # ✅ ADD YOUR VERCEL URL
])
```

**AND** update SocketIO CORS (Lines 103-108):

```python
socketio = SocketIO(
    app,
    cors_allowed_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://ai-tutor-94ff4.web.app',
        'https://aitutor-team.web.app',
        'https://tutor-ai-antigravity.vercel.app'  # ✅ ADD YOUR VERCEL URL
    ],
    async_mode='threading',
    logger=True,
    engineio_logger=True
)
```

### Commit & Redeploy:

```bash
git add app.py
git commit -m "Add Vercel URL to CORS"
git push origin main
```

> **Note**: Render will auto-redeploy when you push to `main` branch.

---

## 🐛 Common Issues & Fixes

### Issue 1: Vercel Build Fails

**Error**: `npm ERR! missing script: build`

**Fix**: Make sure you selected `frontend` as the **Root Directory** in Vercel settings.

### Issue 2: Blank Page on Vercel

**Symptoms**: Frontend loads but shows blank screen

**Fix**:
1. Open browser DevTools (F12) → Console
2. Look for CORS errors like:
   ```
   Access to XMLHttpRequest at 'https://tutor-ai-backend.onrender.com/api/health' 
   from origin 'https://tutor-ai-antigravity.vercel.app' has been blocked by CORS
   ```
3. **Solution**: Add Vercel URL to backend CORS (see Step 4)

### Issue 3: Backend Crashes on Render

**Error in Render logs**: `ModuleNotFoundError: No module named 'face_recognition'`

**Fix**: Verify `DISABLE_FACE_RECO=1` is set in Render environment variables.

### Issue 4: Socket Connection Failed

**Symptoms**: Real-time features don't work (lecture notifications)

**Fix**:
1. Check `frontend/src/contexts/SocketContext.js` Line 16
2. Ensure backend URL is correct
3. Ensure backend SocketIO CORS includes Vercel URL

### Issue 5: 404 on Page Refresh

**Symptoms**: Refreshing `/materials` or other routes shows 404

**Fix**: Already handled by `frontend/vercel.json` rewrites. If issue persists, verify `vercel.json` exists in frontend folder.

---

## ✅ Verification Steps

After deployment, test these:

### 1. Backend Health Check
Visit: `https://tutor-ai-backend.onrender.com/api/health`

Expected:
```json
{
  "status": "ok",
  "face_recognition": false,
  "faces_loaded": false,
  "loaded_students": [],
  "student_count": 0
}
```

### 2. Frontend Loads
Visit: `https://tutor-ai-antigravity.vercel.app`

Expected: Login page appears

### 3. Login Works
- Username: `admin`
- Password: `admin123`

Expected: Redirects to dashboard

### 4. Socket Connection
Open Browser DevTools → Console

Expected:
```
Connecting to socket at: https://tutor-ai-backend.onrender.com
Socket connected: <socket_id>
```

---

## 🎉 Success!

Your app is now live at:
- **Frontend**: `https://tutor-ai-antigravity.vercel.app`
- **Backend**: `https://tutor-ai-backend.onrender.com`

### Default Login Credentials:
- **Teacher/Admin**: `admin` / `admin123`
- **Create students** via the Student Management page

---

## 📝 Notes

### Free Tier Limitations:
1. **Render Free Tier**:
   - Sleeps after 15 minutes of inactivity
   - First request takes ~30 seconds to wake up
   - 512 MB RAM limit (face recognition disabled)

2. **Vercel Free Tier**:
   - 100 GB bandwidth/month
   - Good performance (CDN)

### Performance Tips:
1. Keep a tab open to prevent Render from sleeping
2. For production, upgrade to Render paid plan ($7/month) for:
   - No sleep
   - More RAM (can enable face recognition)
   - Better performance

---

## 🔄 Updating Your Deployment

Whenever you make code changes:

```bash
# Commit and push
git add .
git commit -m "Your update message"
git push origin main
```

- **Render**: Auto-redeploys backend (takes ~2-3 minutes)
- **Vercel**: Auto-redeploys frontend (takes ~1-2 minutes)

---

## 🆘 Still Having Issues?

1. **Check Render Logs**: Go to Render dashboard → Your service → Logs
2. **Check Vercel Logs**: Go to Vercel dashboard → Your project → Deployments → Click latest → View Function Logs
3. **Browser Console**: Open DevTools (F12) → Console tab for frontend errors

Common log patterns:
- `ModuleNotFoundError` → Missing dependency in requirements.txt
- `CORS policy` → Update CORS settings
- `Connection refused` → Backend URL is wrong
- `500 Internal Server Error` → Check Render logs
