#!/bin/bash

# 🚀 Tutor AI - Complete Deployment Script
# This script helps you deploy both backend and frontend

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Tutor AI Deployment Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Check if we're in the right directory
print_step "Checking directory..."
if [ ! -f "app.py" ]; then
    print_error "Error: app.py not found. Please run this script from the project root."
    exit 1
fi
print_success "In correct directory"

# Step 2: Check Git status
print_step "Checking Git status..."
if ! git status &>/dev/null; then
    print_error "Not a git repository"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes"
    echo ""
    echo "Would you like to commit them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Enter commit message:"
        read -r commit_msg
        git add .
        git commit -m "$commit_msg"
        print_success "Changes committed"
    fi
fi

# Step 3: Push to GitHub
print_step "Pushing to GitHub..."
git push origin main
print_success "Code pushed to GitHub"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Next Steps (Manual)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}BACKEND DEPLOYMENT (Render):${NC}"
echo "1. Go to: https://dashboard.render.com"
echo "2. Create New Web Service"
echo "3. Connect GitHub repo: Edwinjoseph0210/Tutor-ai-antigravity"
echo "4. Settings:"
echo "   - Name: tutor-ai-backend"
echo "   - Runtime: Python 3"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: gunicorn --worker-class gthread --threads 4 --timeout 120 --bind 0.0.0.0:\$PORT app:app"
echo "   - Instance Type: Free"
echo ""
echo "5. Environment Variables:"
echo "   - GEMINI_API_KEY = (your key)"
echo "   - DISABLE_FACE_RECO = 1"
echo "   - FLASK_ENV = production"
echo ""
echo "6. Deploy and copy the URL (e.g., https://tutor-ai-backend.onrender.com)"
echo ""

echo -e "${YELLOW}FRONTEND DEPLOYMENT (Vercel):${NC}"
echo "1. Go to: https://vercel.com"
echo "2. Import project: Edwinjoseph0210/Tutor-ai-antigravity"
echo "3. Framework Preset: Create React App"
echo "4. Root Directory: frontend"
echo "5. Deploy!"
echo ""

echo -e "${YELLOW}AFTER DEPLOYMENT:${NC}"
echo "1. Update frontend/src/contexts/SocketContext.js (line 16)"
echo "   with your Render backend URL"
echo ""
echo "2. Update app.py (lines 93-98 and 103-115)"
echo "   with your Vercel frontend URL for CORS"
echo ""
echo "3. Commit and push again:"
echo "   git add ."
echo "   git commit -m \"Add production URLs\""
echo "   git push origin main"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Script completed! Follow the manual steps above."
echo ""
echo "📖 Full guide: See DEPLOYMENT_GUIDE.md"
echo ""
