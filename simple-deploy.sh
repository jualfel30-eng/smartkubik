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
STOREFRONT_LOCAL="./food-inventory-storefront"

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

cd $STOREFRONT_LOCAL
if ! npm ls --depth=0 > /dev/null 2>&1; then
  echo -e "${RED}❌ Storefront dependencies are broken. Run 'npm install' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Storefront dependencies valid${NC}"
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

# Step 2.5: Build storefront locally
echo -e "${YELLOW}📦 Building storefront locally...${NC}"
cd $STOREFRONT_LOCAL
# Copy production env before build
cp .env.production .env.local
npm run build
echo -e "${GREEN}✅ Storefront built${NC}"
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

# Step 4.3: Upload storefront
echo -e "${YELLOW}📤 Uploading storefront...${NC}"
# Create directories if they don't exist
ssh $SERVER "mkdir -p ~/smartkubik/food-inventory-storefront"
ssh $SERVER "mkdir -p ~/smartkubik/nginx-configs"
# Upload Next.js build output and necessary files
rsync -avz --delete $STOREFRONT_LOCAL/.next/ $SERVER:~/smartkubik/food-inventory-storefront/.next/
rsync -avz $STOREFRONT_LOCAL/public/ $SERVER:~/smartkubik/food-inventory-storefront/public/
rsync -avz $STOREFRONT_LOCAL/package.json $SERVER:~/smartkubik/food-inventory-storefront/
rsync -avz $STOREFRONT_LOCAL/package-lock.json $SERVER:~/smartkubik/food-inventory-storefront/
rsync -avz $STOREFRONT_LOCAL/next.config.ts $SERVER:~/smartkubik/food-inventory-storefront/
rsync -avz $STOREFRONT_LOCAL/.env.production $SERVER:~/smartkubik/food-inventory-storefront/.env.local
# Upload nginx configuration
rsync -avz ./nginx-configs/storefront-subdomain.conf $SERVER:~/smartkubik/nginx-configs/
echo -e "${GREEN}✅ Storefront uploaded${NC}"

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

# Step 4.7: Check and install storefront dependencies
echo -e "${YELLOW}🔍 Checking storefront dependencies on server...${NC}"
STOREFRONT_NEEDS_INSTALL=$(ssh $SERVER "cd ~/smartkubik/food-inventory-storefront && \
  ([ ! -d node_modules ] || \
   [ package-lock.json -nt node_modules/.package-lock.json ] || \
   ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$STOREFRONT_NEEDS_INSTALL" == "YES" ]]; then
  echo -e "${YELLOW}📦 Installing storefront dependencies on server...${NC}"
  ssh $SERVER "cd ~/smartkubik/food-inventory-storefront && npm ci --production --prefer-offline"
  echo -e "${GREEN}✅ Storefront dependencies installed${NC}"
else
  echo -e "${GREEN}✅ Storefront dependencies up to date (skipping install)${NC}"
fi

# Step 5: Reload PM2 (zero downtime)
echo -e "${YELLOW}🔄 Reloading PM2...${NC}"
ssh $SERVER "cd ~/smartkubik/food-inventory-saas && pm2 reload smartkubik-api"
echo -e "${GREEN}✅ Backend PM2 reloaded${NC}"

# Step 5.5: Start or reload storefront with PM2
echo -e "${YELLOW}🔄 Managing storefront PM2 process...${NC}"
STOREFRONT_PM2_STATUS=$(ssh $SERVER "pm2 list | grep smartkubik-storefront || echo 'NOT_RUNNING'")

if [[ "$STOREFRONT_PM2_STATUS" == "NOT_RUNNING" ]]; then
  echo -e "${YELLOW}📦 Starting storefront with PM2 (first time)...${NC}"
  ssh $SERVER "cd ~/smartkubik/food-inventory-storefront && pm2 start npm --name smartkubik-storefront -- start"
  ssh $SERVER "pm2 save"
  echo -e "${GREEN}✅ Storefront started with PM2${NC}"
else
  echo -e "${YELLOW}🔄 Reloading storefront...${NC}"
  ssh $SERVER "cd ~/smartkubik/food-inventory-storefront && pm2 reload smartkubik-storefront"
  echo -e "${GREEN}✅ Storefront PM2 reloaded${NC}"
fi

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

STOREFRONT=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001")
if [[ "$STOREFRONT" != "200" ]]; then
    echo -e "${YELLOW}⚠️  Storefront check returned HTTP $STOREFRONT (might need nginx config)${NC}"
else
    echo -e "${GREEN}✅ Storefront is OK${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Live URLs:${NC}"
echo -e "  Admin Panel: ${GREEN}https://smartkubik.com${NC}"
echo -e "  Backend API: ${GREEN}https://api.smartkubik.com${NC}"
echo -e "  Storefront:  ${GREEN}https://*.smartkubik.com${NC} ${YELLOW}(requires nginx setup)${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps for Storefront:${NC}"
echo -e "  1. Copy nginx config: ${BLUE}sudo cp ~/smartkubik/nginx-configs/storefront-subdomain.conf /etc/nginx/sites-available/${NC}"
echo -e "  2. Enable config: ${BLUE}sudo ln -s /etc/nginx/sites-available/storefront-subdomain.conf /etc/nginx/sites-enabled/${NC}"
echo -e "  3. Test nginx: ${BLUE}sudo nginx -t${NC}"
echo -e "  4. Reload nginx: ${BLUE}sudo systemctl reload nginx${NC}"
echo -e "  5. Get SSL cert: ${BLUE}sudo certbot --nginx -d \"*.smartkubik.com\" -d smartkubik.com${NC}"
echo ""
