# Firebase Deployment Guide

## Prerequisites
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged into Firebase (`firebase login`)

## Deployment Steps

### 1. Build the Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 2. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 3. Verify Deployment
- Visit: https://aitutor-team.web.app/
- Check that latest changes are visible

## Complete Deployment Script

Run this to deploy all changes:
```bash
#!/bin/bash
cd frontend
npm install
npm run build
cd ..
firebase deploy --only hosting
echo "✅ Deployment complete!"
```

## Troubleshooting

### Changes not showing on live site:
1. **Clear browser cache**: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. **Verify build**: Check if `frontend/build` folder exists with updated files
3. **Check Firebase status**: `firebase status`

### Firebase not configured:
1. Run: `firebase init hosting`
2. Select project: `aitutor-team`
3. Set public directory to: `frontend/build`

## Environment Variables

For Firebase configuration in `frontend/src/firebase.js`, update with actual credentials from Firebase Console:
- Go to Firebase Console → Project Settings
- Copy your config and update the firebaseConfig object

## Local Development (Backend + Frontend)

1. Create and activate your Python virtualenv, then install requirements:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# If you use face recognition, install the models:
pip install git+https://github.com/ageitgey/face_recognition_models
```

2. Start the backend (development):

```bash
# To disable face recognition during local dev (faster startup):
DISABLE_FACE_RECO=1 PORT=5002 venv/bin/python app.py

# Or to enable face recognition (requires models):
PORT=5001 venv/bin/python app.py
```

3. Start the frontend dev server (React):

```bash
cd frontend
REACT_APP_API_URL=http://localhost:5002/api npm install
REACT_APP_API_URL=http://localhost:5002/api npm start
```

4. Open the app in your browser:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5002/api/health

Notes:
- The backend will create a default admin user (`admin` / `admin123`) on first run.
- For full face recognition features, install the `face_recognition_models` package (large download) and run backend without `DISABLE_FACE_RECO`.
