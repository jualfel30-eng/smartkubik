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
