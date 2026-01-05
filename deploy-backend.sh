#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   DEPLOY BACKEND TO RENDER.COM IN 5 MINUTES          ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Install gunicorn
echo "📦 Step 1: Installing gunicorn..."
pip install gunicorn --quiet
if [ $? -eq 0 ]; then
    echo "✓ Gunicorn installed"
else
    echo "✗ Failed to install gunicorn"
    exit 1
fi

# Step 2: Update requirements.txt
echo ""
echo "📝 Step 2: Updating requirements.txt..."
pip freeze > requirements.txt
echo "✓ Requirements updated"

# Step 3: Check git
echo ""
echo "🔍 Step 3: Checking Git..."
if ! git status > /dev/null 2>&1; then
    echo "✗ Not a Git repository. Please initialize Git first:"
    echo "  git init && git add . && git commit -m 'Initial commit'"
    exit 1
fi
echo "✓ Git repository found"

# Step 4: Commit changes
echo ""
echo "💾 Step 4: Committing changes..."
git add requirements.txt Procfile .env
if git diff --cached --quiet; then
    echo "  No changes to commit"
else
    git commit -m "Add production deployment files (gunicorn, Procfile)"
    echo "✓ Changes committed"
fi

# Step 5: Push to GitHub
echo ""
echo "🚀 Step 5: Pushing to GitHub..."
echo "  Make sure you're connected to GitHub and have push permissions"
git push origin main 2>&1 | grep -E "^(Enumerating|Counting|Compressing|Total|Writing|Unpacking|remote:|✓|✗|To |fatal)" || echo "  Push may have completed"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  NEXT STEPS                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "1. Go to https://render.com"
echo "2. Sign up/login with GitHub"
echo "3. Click '+ New' → 'Web Service'"
echo "4. Select this repository (Tutor-ai-antigravity)"
echo ""
echo "5. Configure with:"
echo "   • Name: tutor-ai-backend"
echo "   • Environment: Python 3.11"
echo "   • Build: pip install -r requirements.txt"
echo "   • Start: gunicorn --workers 2 --timeout 120 app:app"
echo "   • Plan: Free (for testing)"
echo ""
echo "6. Add environment variables:"
echo "   GEMINI_API_KEY = your_key_from_https://ai.google.dev/"
echo "   FLASK_ENV = production"
echo "   DEBUG = false"
echo ""
echo "7. Click 'Create Web Service'"
echo "   (Build takes 2-3 minutes)"
echo ""
echo "8. Get your backend URL (like: https://tutor-ai-backend-xxxx.onrender.com)"
echo ""
echo "9. ✓ Your full application will then be working!"
echo ""
echo "✨ All code is ready for deployment!"
echo ""
