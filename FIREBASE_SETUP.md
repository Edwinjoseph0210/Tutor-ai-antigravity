# Firebase Authentication Setup Guide

## ✅ What I've Done

I've set up Firebase Authentication for your signup/login system. Here's what was changed:

### Files Created/Modified:
1. **`frontend/src/firebase.js`** - Firebase configuration file
2. **`frontend/src/contexts/AuthContext.js`** - Complete Firebase auth implementation
3. **`frontend/src/pages/Auth.js`** - Updated to use email/password instead of username

## 🔧 Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select an existing project
3. Follow the setup wizard

### Step 2: Enable Email/Password Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

### Step 3: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️
2. Go to **Project settings**
3. Scroll down to **Your apps** section
4. Click the web icon `</>` to add a web app
5. Register your app (give it a name)
6. Copy the `firebaseConfig` object

### Step 4: Update Your Configuration

1. Open `frontend/src/firebase.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

### Step 5: Install Firebase (if not already installed)

```bash
cd frontend
npm install firebase
```

### Step 6: Test Your Setup

1. Start your frontend: `npm start`
2. Navigate to the signup page
3. Create a new account with email/password
4. Login with your new credentials

## 📝 Current Behavior

### Signup Features:
- ✅ Email/password registration
- ✅ Password confirmation validation
- ✅ Minimum 6 character password requirement
- ✅ Automatic error handling
- ✅ User state management

### Login Features:
- ✅ Email/password login
- ✅ Persistent sessions
- ✅ Error handling
- ✅ Protected routes

## 🎯 User Flow

1. **New User**: Click "Sign up" → Enter email & password → Account created → Redirected to Dashboard
2. **Existing User**: Enter email & password → Login → Redirected to Dashboard
3. **Logged in User**: Can access all protected routes

## 🔒 Security Notes

- Passwords are hashed and secured by Firebase
- No credentials stored in your Flask backend
- All auth handled by Firebase
- Session tokens managed automatically

## 🐛 Troubleshooting

### "Firebase app is not initialized"
- Make sure you've updated `firebase.js` with your actual credentials

### "auth/invalid-email"
- Ensure email field has proper validation (`type="email"`)

### "auth/weak-password"
- Firebase requires passwords to be at least 6 characters

### "auth/email-already-in-use"
- User is trying to register with an existing email

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks) (optional)

---

**Note**: Your Flask backend `/api/register` endpoint is still available but won't be used with Firebase auth. You can keep it for backward compatibility or remove it if not needed.

