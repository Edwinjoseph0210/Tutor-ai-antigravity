# ⚡ Quick Deploy - 5 Minute Guide

## 🎯 Goal
Get your Tutor AI app live on the internet in 5 minutes!

---

## 📱 What You'll Get
- **Backend**: `https://tutor-ai-backend.onrender.com`
- **Frontend**: `https://your-app.vercel.app`
- **Free hosting** (no credit card needed for basic tier)

---

## 🚀 Step 1: Backend (2 minutes)

### A. Go to Render
1. Open: **https://dashboard.render.com**
2. Sign up/Login with **GitHub**
3. Click **"New +"** → **"Web Service"**

### B. Connect Repo
1. Find: `Edwinjoseph0210/Tutor-ai-antigravity`
2. Click **"Connect"**

### C. Configure (copy these EXACTLY):
```
Name: tutor-ai-backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn --worker-class gthread --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
Instance Type: Free
```

### D. Add Environment Variables:
Click **"Advanced"** → **"Add Environment Variable"**

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | (paste your Gemini API key) |
| `DISABLE_FACE_RECO` | `1` |
| `FLASK_ENV` | `production` |

### E. Deploy
1. Click **"Create Web Service"**
2. Wait ~5 minutes (grab coffee ☕)
3. **COPY THE URL** shown at top (e.g., `https://tutor-ai-backend-abc123.onrender.com`)

---

## 🎨 Step 2: Frontend (2 minutes)

### A. Update Backend URL
1. Open: `frontend/src/contexts/SocketContext.js`
2. Line 16, replace with YOUR Render URL:
```javascript
return 'https://tutor-ai-backend-abc123.onrender.com'; // ← YOUR URL HERE
```

3. Save and commit:
```bash
git add frontend/src/contexts/SocketContext.js
git commit -m "Add production backend URL"
git push origin main
```

### B. Go to Vercel
1. Open: **https://vercel.com**
2. Sign up/Login with **GitHub**
3. Click **"Add New..."** → **"Project"**

### C. Import Project
1. Find: `Edwinjoseph0210/Tutor-ai-antigravity`
2. Click **"Import"**

### D. Configure (CRITICAL):
1. **Framework Preset**: Create React App (auto-detected) ✓
2. **Root Directory**: Click **"Edit"** → Select **`frontend`** ← **DO THIS!**
3. Build Command: `npm run build` (auto)
4. Output Directory: `build` (auto)

### E. Deploy
1. Click **"Deploy"**
2. Wait ~2 minutes
3. **COPY THE URL** (e.g., `https://tutor-ai-antigravity.vercel.app`)

---

## 🔗 Step 3: Connect Them (1 minute)

### Update CORS in Backend
1. Open: `app.py`
2. Line 97, add your Vercel URL:
```python
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://ai-tutor-94ff4.web.app',
    'https://aitutor-team.web.app',
    'https://tutor-ai-antigravity.vercel.app'  # ← ADD YOUR VERCEL URL
])
```

3. Line 116, same thing:
```python
socketio = SocketIO(
    app,
    cors_allowed_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://ai-tutor-94ff4.web.app',
        'https://aitutor-team.web.app',
        'https://tutor-ai-antigravity.vercel.app'  # ← ADD YOUR VERCEL URL
    ],
    # ... rest
)
```

4. Commit and push:
```bash
git add app.py
git commit -m "Add Vercel URL to CORS"
git push origin main
```

> Render will auto-redeploy (wait ~2 minutes)

---

## ✅ Test It!

### 1. Test Backend
Visit: `https://tutor-ai-backend-abc123.onrender.com/api/health`

Should see:
```json
{"status":"ok","face_recognition":false}
```

### 2. Test Frontend
Visit: `https://tutor-ai-antigravity.vercel.app`

Should see: **Login page**

### 3. Login
- Username: `admin`
- Password: `admin123`

Should work! 🎉

---

## 🐛 Troubleshooting

### "Blank page" on Vercel
- Open DevTools (F12) → Console
- Look for CORS errors
- **Fix**: Did you add Vercel URL to `app.py` CORS? (Step 3)

### "Backend not responding"
- **Fix**: Render free tier sleeps after 15 min. First request takes 30 sec.
- Visit backend URL to wake it up

### "Build failed" on Vercel
- **Fix**: Did you select `frontend` as Root Directory?
- Redeploy: Vercel Dashboard → Project → Settings → General → Root Directory → Change to `frontend`

---

## 🎊 You're Live!

Your app is now accessible from anywhere:
- **Teachers** can conduct lectures
- **Students** can join and track attendance
- **AI Lectures** work globally

**Share your link**: `https://tutor-ai-antigravity.vercel.app`

---

## 📊 Free Tier Limits

**Render (Backend)**:
- ✓ Unlimited API calls
- ✓ 512 MB RAM
- ⚠ Sleeps after 15 min (wakes in ~30 sec)
- 💡 Upgrade to $7/month for always-on

**Vercel (Frontend)**:
- ✓ Unlimited deployments
- ✓ 100 GB bandwidth/month
- ✓ Always on, fast (CDN)

---

## 🔄 Future Updates

When you make changes:
```bash
git add .
git commit -m "Your update"
git push origin main
```

- **Render**: Auto-redeploys backend (~2-3 min)
- **Vercel**: Auto-redeploys frontend (~1-2 min)

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
