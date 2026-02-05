# 📋 Deployment Checklist

## ✅ Pre-Deployment (DONE)
- [x] Code pushed to GitHub
- [x] Backend fixed for cloud deployment (no face_recognition crashes)
- [x] CORS placeholders added
- [x] Deployment guides created
- [x] Browser pages opened

---

## 🔴 STEP 1: Deploy Backend on Render (5-10 min)

**Browser tab is open**: You should see Render dashboard

### Actions:

1. **Sign in with GitHub**
   - Click "Sign Up" or "Log In"
   - Choose "Continue with GitHub"
   - Authorize Render

2. **Create New Web Service**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect Repository**
   - Find: `Edwinjoseph0210/Tutor-ai-antigravity`
   - Click **"Connect"**

4. **Configure Settings** (Copy these EXACTLY):

   **Name**: `tutor-ai-backend`
   
   **Region**: Choose closest to you
   
   **Branch**: `main`
   
   **Root Directory**: (leave blank)
   
   **Runtime**: `Python 3`
   
   **Build Command**: 
   ```
   pip install -r requirements.txt
   ```
   
   **Start Command**: 
   ```
   gunicorn --worker-class gthread --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
   ```
   
   **Instance Type**: `Free`

5. **Add Environment Variables** (Click "Advanced"):

   Click "Add Environment Variable" and add these 3:
   
   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | (your actual API key) |
   | `DISABLE_FACE_RECO` | `1` |
   | `FLASK_ENV` | `production` |

6. **Deploy!**
   - Scroll down, click **"Create Web Service"**
   - Wait 5-10 minutes (you'll see build logs)

7. **Get Backend URL**
   - Once deployed, copy the URL at the top
   - Format: `https://tutor-ai-backend-XXXXX.onrender.com`
   - **SAVE THIS URL** - you need it for Step 2!

8. **Test Backend**
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return JSON with `"status":"ok"`

---

## 🟡 STEP 2: Update Frontend with Backend URL (2 min)

**File to edit**: `frontend/src/contexts/SocketContext.js`

1. Open the file in your editor

2. Find **line 16**:
   ```javascript
   return 'https://tutor-ai-backend.onrender.com';
   ```

3. **Replace** with YOUR actual Render URL from Step 1:
   ```javascript
   return 'https://tutor-ai-backend-XXXXX.onrender.com'; // ← YOUR URL
   ```

4. **Save** the file

5. **Commit and push**:
   ```bash
   cd /Users/apple/Downloads/Tutor-ai-antigravity-main
   git add frontend/src/contexts/SocketContext.js
   git commit -m "Add production backend URL"
   git push origin main
   ```

---

## 🟢 STEP 3: Deploy Frontend on Vercel (3-5 min)

**Browser tab is open**: You should see Vercel login page

### Actions:

1. **Sign in with GitHub**
   - Click "Continue with GitHub"
   - Authorize Vercel

2. **Import Project**
   - Click "Add New..." → "Project"
   - Or click "Import Git Repository"
   - Find: `Edwinjoseph0210/Tutor-ai-antigravity`
   - Click **"Import"**

3. **Configure Project** (🚨 CRITICAL):

   **Framework Preset**: `Create React App` (should auto-detect)
   
   **Root Directory**: 
   - Click **"Edit"** 
   - Select **`frontend`** from dropdown
   - ⚠️ **THIS IS THE MOST IMPORTANT STEP!**
   
   **Build Command**: `npm run build` (auto)
   
   **Output Directory**: `build` (auto)
   
   **Install Command**: `npm install` (auto)

4. **Deploy!**
   - Click **"Deploy"**
   - Wait 2-5 minutes (you'll see build progress)

5. **Get Frontend URL**
   - Once deployed, you'll see a celebration screen
   - Copy your app URL
   - Format: `https://tutor-ai-antigravity.vercel.app` (or similar)
   - **SAVE THIS URL** - you need it for Step 4!

6. **Test Frontend**
   - Click "Visit" or open the URL
   - Should see the login page
   - **Don't try to login yet** - CORS not set up!

---

## 🔵 STEP 4: Connect Backend and Frontend (3 min)

**File to edit**: `app.py`

1. Open `app.py` in your editor

2. Find **line 93-100** (CORS configuration):
   ```python
   CORS(app, supports_credentials=True, origins=[
       'http://localhost:3000', 
       'http://127.0.0.1:3000',
       'https://ai-tutor-94ff4.web.app',
       'https://aitutor-team.web.app',
       # Add your Vercel URL here after deployment:
       # 'https://your-app-name.vercel.app'
   ])
   ```

3. **Uncomment and replace** with YOUR Vercel URL:
   ```python
   CORS(app, supports_credentials=True, origins=[
       'http://localhost:3000', 
       'http://127.0.0.1:3000',
       'https://ai-tutor-94ff4.web.app',
       'https://aitutor-team.web.app',
       'https://tutor-ai-antigravity.vercel.app'  # ← YOUR VERCEL URL
   ])
   ```

4. Find **line 104-120** (SocketIO CORS):
   ```python
   socketio = SocketIO(
       app,
       cors_allowed_origins=[
           'http://localhost:3000',
           'http://127.0.0.1:3000',
           'https://ai-tutor-94ff4.web.app',
           'https://aitutor-team.web.app',
           # Add your Vercel URL here after deployment:
           # 'https://your-app-name.vercel.app'
       ],
       # ... rest
   )
   ```

5. **Uncomment and replace**:
   ```python
   socketio = SocketIO(
       app,
       cors_allowed_origins=[
           'http://localhost:3000',
           'http://127.0.0.1:3000',
           'https://ai-tutor-94ff4.web.app',
           'https://aitutor-team.web.app',
           'https://tutor-ai-antigravity.vercel.app'  # ← YOUR VERCEL URL
       ],
       async_mode='threading',
       logger=True,
       engineio_logger=True
   )
   ```

6. **Save** the file

7. **Commit and push**:
   ```bash
   git add app.py
   git commit -m "Add Vercel URL to CORS configuration"
   git push origin main
   ```

8. **Wait for Render to Redeploy** (~2-3 minutes)
   - Go back to Render dashboard
   - You should see it automatically redeploying
   - Wait for "Live" status

---

## 🎉 STEP 5: Test Your Deployed App!

### Test 1: Backend Health
1. Visit: `https://your-backend-url.onrender.com/api/health`
2. Should return:
   ```json
   {
     "status": "ok",
     "face_recognition": false,
     "faces_loaded": false,
     "loaded_students": [],
     "student_count": 0
   }
   ```

### Test 2: Frontend Loads
1. Visit: `https://your-app.vercel.app`
2. Should see: **Login page** with logo and form

### Test 3: Login Works
1. Enter:
   - Username: `admin`
   - Password: `admin123`
2. Click "Login"
3. Should redirect to **Teacher Dashboard**
4. If you see dashboard → **SUCCESS!** 🎊

### Test 4: Socket Connection (Optional)
1. Open DevTools (F12) → Console tab
2. Should see:
   ```
   Connecting to socket at: https://your-backend-url.onrender.com
   Socket connected: <some-id>
   ```

---

## 🎯 Your Live URLs

Once complete, fill these in:

**Backend**: `https://__________________________.onrender.com`

**Frontend**: `https://__________________________.vercel.app`

**Login**: 
- Admin: `admin` / `admin123`

---

## ⚠️ Troubleshooting

### Issue: "Failed to fetch" or CORS error
**Solution**: Did you complete Step 4? Backend needs Vercel URL in CORS.

### Issue: Blank page on Vercel
**Solution**: Did you set `frontend` as Root Directory in Step 3.3?

### Issue: Backend takes 30 seconds to respond
**Normal**: Free tier sleeps after 15 min. First request wakes it up.

### Issue: Build failed on Vercel
**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings
2. General → Root Directory → Change to `frontend`
3. Deployments → Latest → Click "..." → Redeploy

### Issue: Can't login
**Solution**: 
1. Check browser console (F12) for errors
2. Verify backend/api/health works
3. Check CORS settings in app.py

---

## 📱 Share Your App!

Once everything works, share your Vercel URL with anyone:

`https://your-app.vercel.app`

They can:
- Create student accounts
- Join live lectures
- Track attendance
- Access AI-generated content

---

## Summary

You should have:
- ✅ Backend running on Render
- ✅ Frontend running on Vercel
- ✅ CORS configured
- ✅ Login working
- ✅ App accessible from anywhere

**Congrats! Your Tutor AI is live! 🚀**
