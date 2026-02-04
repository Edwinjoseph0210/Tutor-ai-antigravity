# 🚀 Free Cloud Deployment Guide

This guide will help you host your **Tutor AI** app for free so you can access it from any device.

## 1. Deploy Backend (Render)
**Platform:** [Render](https://render.com) (Free Tier)

1.  **Push Code to GitHub**:
    *   Make sure your project is pushed to your GitHub repository.
    *   `git add .`
    *   `git commit -m "Prepare for deployment"`
    *   `git push origin main`

2.  **Create Web Service on Render**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
    *   **Name**: `tutor-ai-backend` (or similar)
    *   **Runtime**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `gunicorn --worker-class gthread --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app` (It might auto-detect `gunicorn app:app`, which is fine too).
    *   **Instance Type**: Free

3.  **Environment Variables**:
    *   Add `GEMINI_API_KEY`: (Your Gemini Key)
    *   Add `DISABLE_FACE_RECO`: `1` (Recommended for Free Tier speed, set to `0` if you really need it but it will be slow).
    *   Add `FLASK_ENV`: `production`

4.  **Deploy**: Click "Create Web Service".
    *   Wait ~5 minutes.
    *   **Copy your Backend URL** (e.g., `https://tutor-ai-backend.onrender.com`).

---

## 2. Connect Frontend to Backend

1.  Open `frontend/src/contexts/SocketContext.js` in your code.
2.  Update line ~12 with your **new Render Backend URL**:
    ```javascript
    return 'https://tutor-ai-backend.onrender.com'; // <--- REPLACE THIS
    ```
3.  Commit and push this change to GitHub:
    *   `git add .`
    *   `git commit -m "Update backend URL"`
    *   `git push origin main`

---

## 3. Deploy Frontend (Vercel)
**Platform:** [Vercel](https://vercel.com) (Free Tier)

1.  Go to [vercel.com](https://vercel.com) and Sign Up/Login with GitHub.
2.  Click **Add New...** -> **Project**.
3.  Import your `Tutor-ai-antigravity-main` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Create React App (should auto-detect).
    *   **Root Directory**: Click `Edit` and select `frontend` folder.
5.  Click **Deploy**.

---

## 4. Done! 🎉
You will get a Vercel URL (e.g., `https://tutor-ai-frontend.vercel.app`).
*   Open this on **Laptop 1** (Teacher).
*   Open this on **Laptop 2** (Student).
*   They are now connected globally!
