#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AI Tutor Deployment...${NC}\n"

# Step 1: Build Frontend
echo -e "${BLUE}Step 1: Building React Frontend...${NC}"
cd frontend
echo "Installing dependencies..."
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo "Building production bundle..."
npm run build
echo -e "${GREEN}✓ Build complete${NC}\n"
cd ..

# Step 2: Deploy to Firebase
echo -e "${BLUE}Step 2: Deploying to Firebase Hosting...${NC}"
firebase deploy --only hosting

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}📱 Your app is live at: https://aitutor-team.web.app${NC}"
echo -e "${YELLOW}💡 Tip: Clear your browser cache if you don't see latest changes${NC}\n"
