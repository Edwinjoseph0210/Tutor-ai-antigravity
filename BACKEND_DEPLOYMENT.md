# Backend Deployment Guide

## Overview

This guide explains how to deploy the Flask backend to a cloud service so your frontend can communicate with it.

## Option 1: Deploy to Render (Recommended)

### Step 1: Prepare Your Repository

1. Make sure all your code is pushed to GitHub
2. Add a `Procfile` to the root directory (if not already present)

```procfile
web: gunicorn app:app
```

3. Update `requirements.txt` to include production dependencies:

```bash
pip install gunicorn
pip freeze > requirements.txt
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Grant access to your repository

### Step 3: Create Web Service

1. Click "New +" → "Web Service"
2. Select your repository
3. Fill in the settings:
   - **Name**: `tutor-ai-backend`
   - **Environment**: `Python 3.11`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free (for testing) or Starter ($7/month for production)

### Step 4: Add Environment Variables

In Render dashboard, go to Environment and add:

```
GEMINI_API_KEY=your_actual_gemini_key
FLASK_ENV=production
DEBUG=false
```

### Step 5: Deploy

Click "Deploy" and wait for the build to complete. Your backend URL will be:
```
https://tutor-ai-backend.onrender.com
```

## Option 2: Deploy to Heroku

### Step 1: Install Heroku CLI

```bash
brew tap heroku/brew && brew install heroku
```

### Step 2: Create Heroku App

```bash
heroku login
heroku create tutor-ai-backend
git push heroku main
```

### Step 3: Set Environment Variables

```bash
heroku config:set GEMINI_API_KEY=your_key
heroku config:set FLASK_ENV=production
```

Your backend URL will be:
```
https://tutor-ai-backend.herokuapp.com
```

## Option 3: Deploy to Railway.app

1. Go to https://railway.app
2. Connect GitHub repository
3. Add environment variables
4. Deploy

Your backend URL will be:
```
https://your-project.railway.app
```

## Important Configuration Files

### app.py - CORS Configuration

The Flask backend already supports CORS for Firebase hosting:

```python
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ai-tutor-94ff4.web.app',
    'https://aitutor-team.web.app'
])
```

Add your backend URL when deployed if needed.

### environment variables

**Required for production:**

```env
GEMINI_API_KEY=your_actual_key_from_google
FLASK_ENV=production
DEBUG=false
```

**Optional:**

```env
DISABLE_FACE_RECO=0  # Set to 1 to disable face recognition (faster startup)
SECRET_KEY=your_secure_random_key
```

## Update Frontend API URL

Once you have your backend URL, update in `frontend/src/services/api.js`:

```javascript
if (window.location.hostname === 'ai-tutor-94ff4.web.app') {
  return 'https://your-backend-url.com/api';
}
```

Then rebuild and redeploy the frontend:

```bash
npm run build
firebase deploy --only hosting
```

## Database Setup

The first time your backend starts, it will create `attendance.db` and `auth.db` SQLite files.

For production, you may want to migrate to PostgreSQL. Contact me for guidance.

## Testing

Once deployed, test your backend:

```bash
curl https://tutor-ai-backend.onrender.com/api/health
```

Should return:
```json
{"status": "ok", "face_recognition": false}
```

## Troubleshooting

### Backend Not Responding

1. Check deployment logs in Render/Heroku dashboard
2. Verify environment variables are set
3. Check CORS configuration in app.py

### Face Recognition Not Working

Face recognition requires system libraries (dlib, cmake). On Render:
- Set `DISABLE_FACE_RECO=1` in environment variables
- Or use a dedicated machine for face recognition

### Database Issues

SQLite works on free tiers but has limitations:
- Only one process can write at a time
- No concurrent access

For production with multiple processes, migrate to PostgreSQL.

## Support

For deployment issues, check:
- Render logs: Dashboard → Logs
- Heroku logs: `heroku logs --tail`
- Railway logs: In dashboard under "Logs"
