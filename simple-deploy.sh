#!/bin/bash

# 🚀 SIMPLE DEPLOY - Build locally, upload compiled files
# NO npm install on server, NO compilation on server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"
BACKEND_LOCAL="./food-inventory-saas"
FRONTEND_LOCAL="./food-inventory-admin"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik SIMPLE Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 0: Validate local dependencies
echo -e "${YELLOW}🔍 Validating local dependencies...${NC}"
cd $BACKEND_LOCAL
if ! npm ls --depth=0 > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend dependencies are broken. Run 'npm install' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend dependencies valid${NC}"
cd ..

cd $FRONTEND_LOCAL
if ! npm ls --depth=0 > /dev/null 2>&1; then
  echo -e "${RED}❌ Frontend dependencies are broken. Run 'npm install' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Frontend dependencies valid${NC}"
cd ..

# Step 1: Build backend locally
echo -e "${YELLOW}📦 Building backend locally...${NC}"
cd $BACKEND_LOCAL
npm run build
echo -e "${GREEN}✅ Backend built${NC}"
cd ..

# Step 2: Build frontend locally
echo -e "${YELLOW}📦 Building frontend locally...${NC}"
cd $FRONTEND_LOCAL
npm run build
echo -e "${GREEN}✅ Frontend built${NC}"
cd ..

# Step 3: Upload backend dist
echo -e "${YELLOW}📤 Uploading backend...${NC}"
rsync -avz --delete $BACKEND_LOCAL/dist/ $SERVER:~/smartkubik/food-inventory-saas/dist/
echo -e "${GREEN}✅ Backend uploaded${NC}"

# Step 4: Upload frontend dist
echo -e "${YELLOW}📤 Uploading frontend...${NC}"
rsync -avz --delete $FRONTEND_LOCAL/dist/ $SERVER:~/smartkubik/food-inventory-admin/dist/
ssh $SERVER "sudo chmod -R 755 ~/smartkubik/food-inventory-admin/dist"
echo -e "${GREEN}✅ Frontend uploaded${NC}"

# Step 4.5: Sync package files and install dependencies if needed
echo -e "${YELLOW}🔍 Checking backend dependencies on server...${NC}"
rsync -avz $BACKEND_LOCAL/package.json $SERVER:~/smartkubik/food-inventory-saas/
rsync -avz $BACKEND_LOCAL/package-lock.json $SERVER:~/smartkubik/food-inventory-saas/

# Check if npm install is needed
NEEDS_INSTALL=$(ssh $SERVER "cd ~/smartkubik/food-inventory-saas && \
  ([ ! -d node_modules ] || \
   [ package-lock.json -nt node_modules/.package-lock.json ] || \
   ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$NEEDS_INSTALL" == "YES" ]]; then
  echo -e "${YELLOW}📦 Installing dependencies on server (this may take a moment)...${NC}"
  ssh $SERVER "cd ~/smartkubik/food-inventory-saas && npm ci --production --prefer-offline"
  echo -e "${GREEN}✅ Dependencies installed${NC}"
else
  echo -e "${GREEN}✅ Dependencies up to date (skipping install)${NC}"
fi

# Step 5: Reload PM2 (zero downtime)
echo -e "${YELLOW}🔄 Reloading PM2...${NC}"
ssh $SERVER "cd ~/smartkubik/food-inventory-saas && pm2 reload smartkubik-api"
echo -e "${GREEN}✅ PM2 reloaded${NC}"

# Step 6: Verify
echo ""
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
HEALTH=$(ssh $SERVER "curl -s http://localhost:3000/api/v1/health | grep -o '\"status\":\"healthy\"' || echo 'FAILED'")
if [[ "$HEALTH" == *"FAILED"* ]]; then
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is healthy${NC}"

FRONTEND=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost")
if [[ "$FRONTEND" != "200" ]]; then
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONTEND)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend is OK${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Live URLs:${NC}"
echo -e "  Frontend: ${GREEN}https://smartkubik.com${NC}"
echo -e "  Backend:  ${GREEN}https://api.smartkubik.com${NC}"
echo ""
