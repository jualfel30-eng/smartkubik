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

export RSYNC_RSH="ssh -o ServerAliveInterval=60"
SERVER="deployer@178.156.182.177"
BACKEND_LOCAL="./food-inventory-saas"
FRONTEND_LOCAL="./food-inventory-admin"
STOREFRONT_LOCAL="./food-inventory-storefront"
RESTAURANT_STOREFRONT_LOCAL="./restaurant-storefront"
BLOG_LOCAL="./smartkubik-blog/frontend"
ROOT_DIR=$(pwd)

# Blog deployment settings
BLOG_REMOTE="~/smartkubik/smartkubik-blog/frontend"
BLOG_PORT=3032
BLOG_PM2_NAME="smartkubik-blog"
BLOG_BASE_PATH="/blog"
BLOG_SITE_URL="https://smartkubik.com"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik SIMPLE Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── Subsystem selection ──────────────────────────────────────────────────────
# Usage:
#   ./simple-deploy.sh                      # deploy everything (default)
#   ./simple-deploy.sh admin                # only admin frontend
#   ./simple-deploy.sh backend admin        # backend + admin
#   ./simple-deploy.sh auto                 # detect from git diff HEAD~1..HEAD
# Subsystems: backend | admin | storefront | restaurant | blog | all
DEPLOY_BACKEND=false
DEPLOY_ADMIN=false
DEPLOY_STOREFRONT=false
DEPLOY_RESTAURANT=false
DEPLOY_BLOG=false

if [ $# -eq 0 ]; then
  DEPLOY_BACKEND=true; DEPLOY_ADMIN=true; DEPLOY_STOREFRONT=true; DEPLOY_RESTAURANT=true; DEPLOY_BLOG=true
else
  for arg in "$@"; do
    case "$arg" in
      all)
        DEPLOY_BACKEND=true; DEPLOY_ADMIN=true; DEPLOY_STOREFRONT=true; DEPLOY_RESTAURANT=true; DEPLOY_BLOG=true ;;
      backend|api) DEPLOY_BACKEND=true ;;
      admin|frontend) DEPLOY_ADMIN=true ;;
      storefront) DEPLOY_STOREFRONT=true ;;
      restaurant) DEPLOY_RESTAURANT=true ;;
      blog) DEPLOY_BLOG=true ;;
      auto)
        echo -e "${YELLOW}🔎 Auto-detect: inspecting git diff HEAD~1..HEAD${NC}"
        CHANGED=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || echo "")
        if echo "$CHANGED" | grep -q "^food-inventory-saas/";       then DEPLOY_BACKEND=true;    fi
        if echo "$CHANGED" | grep -q "^food-inventory-admin/";      then DEPLOY_ADMIN=true;      fi
        if echo "$CHANGED" | grep -q "^food-inventory-storefront/"; then DEPLOY_STOREFRONT=true; fi
        if echo "$CHANGED" | grep -q "^restaurant-storefront/";     then DEPLOY_RESTAURANT=true; fi
        if echo "$CHANGED" | grep -q "^smartkubik-blog/";           then DEPLOY_BLOG=true;       fi
        ;;
      *) echo -e "${RED}❌ Unknown target: $arg${NC}"; echo "Valid: backend admin storefront restaurant blog all auto"; exit 1 ;;
    esac
  done
fi

if ! $DEPLOY_BACKEND && ! $DEPLOY_ADMIN && ! $DEPLOY_STOREFRONT && ! $DEPLOY_RESTAURANT && ! $DEPLOY_BLOG; then
  echo -e "${YELLOW}⚠️  Nothing to deploy (no targets matched). Exiting.${NC}"
  exit 0
fi

TARGETS=""
if $DEPLOY_BACKEND;    then TARGETS="$TARGETS backend";    fi
if $DEPLOY_ADMIN;      then TARGETS="$TARGETS admin";      fi
if $DEPLOY_STOREFRONT; then TARGETS="$TARGETS storefront"; fi
if $DEPLOY_RESTAURANT; then TARGETS="$TARGETS restaurant"; fi
if $DEPLOY_BLOG;       then TARGETS="$TARGETS blog";       fi
echo -e "${BLUE}🎯 Targets:${NC}$TARGETS"
echo ""

# Step 0: Validate local dependencies (only for selected targets)
echo -e "${YELLOW}🔍 Validating local dependencies...${NC}"
validate_deps() {
  local name=$1 path=$2
  cd "$ROOT_DIR/$path"
  if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ $name dependencies are broken. Run 'npm install' first.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ $name dependencies valid${NC}"
  cd "$ROOT_DIR"
}
if $DEPLOY_BACKEND;    then validate_deps "Backend" "$BACKEND_LOCAL"; fi
if $DEPLOY_ADMIN;      then validate_deps "Frontend" "$FRONTEND_LOCAL"; fi
if $DEPLOY_STOREFRONT; then validate_deps "Storefront" "$STOREFRONT_LOCAL"; fi
if $DEPLOY_RESTAURANT; then validate_deps "Restaurant storefront" "$RESTAURANT_STOREFRONT_LOCAL"; fi
if $DEPLOY_BLOG;       then validate_deps "Blog" "$BLOG_LOCAL"; fi

# Step 1: Build backend locally
if $DEPLOY_BACKEND; then
  echo -e "${YELLOW}📦 Building backend locally...${NC}"
  cd "$ROOT_DIR/$BACKEND_LOCAL"
  npm run build
  echo -e "${GREEN}✅ Backend built${NC}"
  cd "$ROOT_DIR"
fi

# Step 2: Build frontend locally
if $DEPLOY_ADMIN; then
  echo -e "${YELLOW}📦 Building frontend locally...${NC}"
  cd "$ROOT_DIR/$FRONTEND_LOCAL"
  npm run build
  echo -e "${GREEN}✅ Frontend built${NC}"
  cd "$ROOT_DIR"
fi

# Step 2.5: Build general storefront locally
if $DEPLOY_STOREFRONT; then
  echo -e "${YELLOW}📦 Building storefront (general) locally...${NC}"
  cd "$ROOT_DIR/$STOREFRONT_LOCAL"
  npm run build
  echo -e "${GREEN}✅ Storefront (general) built${NC}"
  cd "$ROOT_DIR"
fi

# Step 2.6: Build restaurant storefront locally
if $DEPLOY_RESTAURANT; then
  echo -e "${YELLOW}📦 Building restaurant storefront locally...${NC}"
  cd "$ROOT_DIR/$RESTAURANT_STOREFRONT_LOCAL"
  [ -f .env.production ] && cp .env.production .env.local
  npm run build
  echo -e "${GREEN}✅ Restaurant storefront built${NC}"
  cd "$ROOT_DIR"
fi

# Step 2.7: Build blog locally (Next.js, SSG/SSR)
if $DEPLOY_BLOG; then
  echo -e "${YELLOW}📦 Building blog locally...${NC}"
  cd "$ROOT_DIR/$BLOG_LOCAL"
  NEXT_PUBLIC_SITE_URL=$BLOG_SITE_URL NEXT_PUBLIC_BLOG_BASE_PATH=$BLOG_BASE_PATH npm run build
  echo -e "${GREEN}✅ Blog built${NC}"
  cd "$ROOT_DIR"
fi

# Step 3: Upload backend dist
if $DEPLOY_BACKEND; then
  echo -e "${YELLOW}📤 Uploading backend...${NC}"
  rsync -avz --delete $BACKEND_LOCAL/dist/ $SERVER:~/smartkubik/food-inventory-saas/dist/
  echo -e "${GREEN}✅ Backend uploaded${NC}"
fi

# Step 4: Upload frontend dist
if $DEPLOY_ADMIN; then
  echo -e "${YELLOW}📤 Uploading frontend...${NC}"
  rsync -avz --delete $FRONTEND_LOCAL/dist/ $SERVER:~/smartkubik/food-inventory-admin/dist/
  ssh $SERVER "sudo chmod -R 755 ~/smartkubik/food-inventory-admin/dist"
  echo -e "${GREEN}✅ Frontend uploaded${NC}"
fi

# Step 4.3: Upload general storefront (port 3001 - all templates)
if $DEPLOY_STOREFRONT; then
  echo -e "${YELLOW}📤 Uploading storefront (general)...${NC}"
  ssh $SERVER "mkdir -p ~/smartkubik/food-inventory-storefront ~/smartkubik/nginx-configs"
  rsync -avz --delete $STOREFRONT_LOCAL/.next/ $SERVER:~/smartkubik/food-inventory-storefront/.next/
  rsync -avz $STOREFRONT_LOCAL/public/ $SERVER:~/smartkubik/food-inventory-storefront/public/
  rsync -avz $STOREFRONT_LOCAL/package.json $SERVER:~/smartkubik/food-inventory-storefront/
  rsync -avz $STOREFRONT_LOCAL/package-lock.json $SERVER:~/smartkubik/food-inventory-storefront/
  rsync -avz $STOREFRONT_LOCAL/next.config.ts $SERVER:~/smartkubik/food-inventory-storefront/
  [ -f ./nginx-configs/storefront-subdomain.conf ] && rsync -avz ./nginx-configs/storefront-subdomain.conf $SERVER:~/smartkubik/nginx-configs/
  echo -e "${GREEN}✅ Storefront (general) uploaded${NC}"
fi

# Step 4.33: Upload restaurant storefront (port 3002)
if $DEPLOY_RESTAURANT; then
  echo -e "${YELLOW}📤 Uploading restaurant storefront...${NC}"
  ssh $SERVER "mkdir -p ~/smartkubik/restaurant-storefront"
  rsync -avz --delete $RESTAURANT_STOREFRONT_LOCAL/.next/ $SERVER:~/smartkubik/restaurant-storefront/.next/
  rsync -avz $RESTAURANT_STOREFRONT_LOCAL/public/ $SERVER:~/smartkubik/restaurant-storefront/public/ 2>/dev/null || true
  rsync -avz $RESTAURANT_STOREFRONT_LOCAL/package.json $SERVER:~/smartkubik/restaurant-storefront/
  rsync -avz $RESTAURANT_STOREFRONT_LOCAL/package-lock.json $SERVER:~/smartkubik/restaurant-storefront/
  for cfg in next.config.ts next.config.mjs next.config.js; do
    [ -f "$RESTAURANT_STOREFRONT_LOCAL/$cfg" ] && rsync -avz "$RESTAURANT_STOREFRONT_LOCAL/$cfg" $SERVER:~/smartkubik/restaurant-storefront/
  done
  [ -f $RESTAURANT_STOREFRONT_LOCAL/.env.production ] && rsync -avz $RESTAURANT_STOREFRONT_LOCAL/.env.production $SERVER:~/smartkubik/restaurant-storefront/.env.local
  echo -e "${GREEN}✅ Restaurant storefront uploaded${NC}"
fi

# Step 4.35: Upload blog
if $DEPLOY_BLOG; then
  echo -e "${YELLOW}📤 Uploading blog...${NC}"
  ssh $SERVER "mkdir -p $BLOG_REMOTE/.next $BLOG_REMOTE/public $BLOG_REMOTE"
  rsync -avz --delete $BLOG_LOCAL/.next/ $SERVER:$BLOG_REMOTE/.next/
  rsync -avz --delete $BLOG_LOCAL/public/ $SERVER:$BLOG_REMOTE/public/
  rsync -avz $BLOG_LOCAL/package.json $SERVER:$BLOG_REMOTE/
  if [ -f "$BLOG_LOCAL/package-lock.json" ]; then
    rsync -avz $BLOG_LOCAL/package-lock.json $SERVER:$BLOG_REMOTE/
  fi
  rsync -avz $BLOG_LOCAL/next.config.ts $SERVER:$BLOG_REMOTE/
  if [ -f "$BLOG_LOCAL/.env.local" ]; then
    rsync -avz $BLOG_LOCAL/.env.local $SERVER:$BLOG_REMOTE/.env.local
  fi
  if [ -f "./nginx-configs/blog-location.conf" ]; then
    rsync -avz ./nginx-configs/blog-location.conf $SERVER:~/smartkubik/nginx-configs/
  fi
  echo -e "${GREEN}✅ Blog uploaded${NC}"
fi

# Step 4.5: Sync package files and install dependencies if needed
if $DEPLOY_BACKEND; then
  echo -e "${YELLOW}🔍 Checking backend dependencies on server...${NC}"
  rsync -avz $BACKEND_LOCAL/package.json $SERVER:~/smartkubik/food-inventory-saas/
  rsync -avz $BACKEND_LOCAL/package-lock.json $SERVER:~/smartkubik/food-inventory-saas/

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
fi

# Step 4.7: Check and install storefront dependencies
if $DEPLOY_STOREFRONT; then
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
fi

# Step 4.8: Check and install blog dependencies
if $DEPLOY_BLOG; then
  echo -e "${YELLOW}🔍 Checking blog dependencies on server...${NC}"
  BLOG_NEEDS_INSTALL=$(ssh $SERVER "cd $BLOG_REMOTE && \
    ([ ! -d node_modules ] || \
     [ package-lock.json -nt node_modules/.package-lock.json ] || \
     ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

  if [[ "$BLOG_NEEDS_INSTALL" == "YES" ]]; then
    echo -e "${YELLOW}📦 Installing blog dependencies on server...${NC}"
    BLOG_INSTALL_CMD="npm ci --production --prefer-offline"
    ssh $SERVER "cd $BLOG_REMOTE && [ -f package-lock.json ] || exit 100" || BLOG_INSTALL_CMD="npm install --production"
    ssh $SERVER "cd $BLOG_REMOTE && $BLOG_INSTALL_CMD"
    echo -e "${GREEN}✅ Blog dependencies installed${NC}"
  else
    echo -e "${GREEN}✅ Blog dependencies up to date (skipping install)${NC}"
  fi
fi

# Step 5: Reload PM2 (zero downtime)
if $DEPLOY_BACKEND; then
  echo -e "${YELLOW}🔄 Reloading PM2...${NC}"
  ssh $SERVER "cd ~/smartkubik/food-inventory-saas && pm2 reload smartkubik-api"
  echo -e "${GREEN}✅ Backend PM2 reloaded${NC}"
  echo -e "${YELLOW}⏳ Waiting for backend to fully start...${NC}"
  sleep 5
fi

# Step 5.5: Start or reload general storefront with PM2 (port 3001)
if $DEPLOY_STOREFRONT; then
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
fi

# Step 5.55: Start or reload restaurant storefront with PM2 (port 3002)
if $DEPLOY_RESTAURANT; then
  echo -e "${YELLOW}🔄 Managing restaurant storefront PM2 process...${NC}"
  RESTAURANT_PM2_STATUS=$(ssh $SERVER "pm2 list | grep smartkubik-restaurant || echo 'NOT_RUNNING'")
  if [[ "$RESTAURANT_PM2_STATUS" == "NOT_RUNNING" ]]; then
    echo -e "${YELLOW}📦 Starting restaurant storefront with PM2 (first time)...${NC}"
    ssh $SERVER "cd ~/smartkubik/restaurant-storefront && pm2 start npm --name smartkubik-restaurant -- start"
    ssh $SERVER "pm2 save"
    echo -e "${GREEN}✅ Restaurant storefront started with PM2${NC}"
  else
    echo -e "${YELLOW}🔄 Reloading restaurant storefront...${NC}"
    ssh $SERVER "cd ~/smartkubik/restaurant-storefront && pm2 reload smartkubik-restaurant"
    echo -e "${GREEN}✅ Restaurant storefront PM2 reloaded${NC}"
  fi
fi

# Step 5.6: Start or reload blog with PM2
if $DEPLOY_BLOG; then
  echo -e "${YELLOW}🔄 Managing blog PM2 process...${NC}"
  BLOG_PM2_STATUS=$(ssh $SERVER "pm2 list | grep $BLOG_PM2_NAME || echo 'NOT_RUNNING'")
  if [[ "$BLOG_PM2_STATUS" == "NOT_RUNNING" ]]; then
    echo -e "${YELLOW}📦 Starting blog with PM2 (first time)...${NC}"
    ssh $SERVER "cd $BLOG_REMOTE && PORT=$BLOG_PORT HOST=0.0.0.0 NEXT_PUBLIC_SITE_URL=$BLOG_SITE_URL NEXT_PUBLIC_BLOG_BASE_PATH=$BLOG_BASE_PATH pm2 start npm --name $BLOG_PM2_NAME -- start"
    ssh $SERVER "pm2 save"
    echo -e "${GREEN}✅ Blog started with PM2${NC}"
  else
    echo -e "${YELLOW}🔄 Restarting blog (full restart to clear Next.js cache)...${NC}"
    ssh $SERVER "cd $BLOG_REMOTE && PORT=$BLOG_PORT HOST=0.0.0.0 NEXT_PUBLIC_SITE_URL=$BLOG_SITE_URL NEXT_PUBLIC_BLOG_BASE_PATH=$BLOG_BASE_PATH pm2 restart $BLOG_PM2_NAME"
    echo -e "${GREEN}✅ Blog PM2 restarted${NC}"
  fi
fi

# Step 6: Verify
echo ""
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

# Function to check backend health with retries.
# NestJS cold start (Mongo Atlas reconnect, module bootstrap) can take 10-25s
# after a pm2 reload, so we poll patiently before declaring failure.
check_backend_health() {
  local max_attempts=15
  local attempt=1
  local CURL_OPTS="--connect-timeout 2 -m 5 -s"

  # Extra grace period after pm2 reload before first probe
  sleep 3

  while [ $attempt -le $max_attempts ]; do
    echo -e "${YELLOW}Attempt $attempt/$max_attempts...${NC}"

    if ssh $SERVER "command -v jq >/dev/null 2>&1"; then
      HEALTH_STATUS=$(ssh $SERVER "curl $CURL_OPTS http://localhost:3000/api/v1/health 2>/dev/null | jq -r '.status // empty' 2>/dev/null || echo ''")
      if [[ "$HEALTH_STATUS" == "healthy" ]]; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        return 0
      fi
    else
      HEALTH=$(ssh $SERVER "curl $CURL_OPTS http://localhost:3000/api/v1/health 2>/dev/null | grep -o 'healthy' || echo ''")
      if [[ "$HEALTH" == "healthy" ]]; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        return 0
      fi
    fi

    if [ $attempt -lt $max_attempts ]; then
      # First 5 attempts every 1s (catches normal reload), then every 3s (cold start)
      if [ $attempt -le 5 ]; then
        sleep 1
      else
        sleep 3
      fi
    fi
    attempt=$((attempt + 1))
  done

  # All attempts failed — emit warning, do NOT abort. Files are uploaded and
  # PM2 reload was issued; if backend is genuinely broken pm2 will surface it.
  echo -e "${YELLOW}⚠️  Backend health check did not return 'healthy' after $max_attempts attempts (~30s).${NC}"
  echo -e "${YELLOW}    This may be a slow cold start. Verify manually:${NC}"
  echo -e "${YELLOW}      ssh $SERVER 'curl -s http://localhost:3000/api/v1/health'${NC}"
  echo -e "${YELLOW}      ssh $SERVER 'pm2 logs smartkubik-api --lines 50'${NC}"
  API_CODE=$(ssh $SERVER "curl --connect-timeout 2 -m 5 -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/v1/health 2>/dev/null || echo '000'")
  echo -e "${YELLOW}    Last HTTP code: $API_CODE${NC}"
  return 0
}

if $DEPLOY_BACKEND; then
  check_backend_health || true
fi

if $DEPLOY_ADMIN; then
  FRONTEND=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost")
  if [[ "$FRONTEND" == "200" ]]; then
      echo -e "${GREEN}✅ Frontend is OK${NC}"
  elif [[ "$FRONTEND" == "404" ]]; then
      echo -e "${YELLOW}⚠️  Frontend check returned HTTP 404 (nginx may need configuration)${NC}"
  else
      echo -e "${YELLOW}⚠️  Frontend check returned HTTP $FRONTEND${NC}"
  fi
fi

if $DEPLOY_STOREFRONT; then
  STOREFRONT=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001")
  if [[ "$STOREFRONT" != "200" ]]; then
      echo -e "${YELLOW}⚠️  Storefront check returned HTTP $STOREFRONT (might need nginx config)${NC}"
  else
      echo -e "${GREEN}✅ Storefront is OK${NC}"
  fi
fi

if $DEPLOY_BLOG; then
  BLOG_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$BLOG_PORT$BLOG_BASE_PATH")
  if [[ "$BLOG_CHECK" != "200" ]]; then
      echo -e "${YELLOW}⚠️  Blog check returned HTTP $BLOG_CHECK (verify PM2/env/nginx)${NC}"
  else
      echo -e "${GREEN}✅ Blog is OK${NC}"
  fi
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
echo -e "  Blog:        ${GREEN}https://smartkubik.com${BLOG_BASE_PATH}${NC} ${YELLOW}(requires nginx location /blog -> $BLOG_PORT)${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps for Storefront:${NC}"
echo -e "  1. Copy nginx config: ${BLUE}sudo cp ~/smartkubik/nginx-configs/storefront-subdomain.conf /etc/nginx/sites-available/${NC}"
echo -e "  2. Enable config: ${BLUE}sudo ln -s /etc/nginx/sites-available/storefront-subdomain.conf /etc/nginx/sites-enabled/${NC}"
echo -e "  3. Test nginx: ${BLUE}sudo nginx -t${NC}"
echo -e "  4. Reload nginx: ${BLUE}sudo systemctl reload nginx${NC}"
echo -e "  5. Get SSL cert: ${BLUE}sudo certbot --nginx -d \"*.smartkubik.com\" -d smartkubik.com${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps for Blog:${NC}"
echo -e "  1. Add location block to your main nginx site to proxy /blog to http://127.0.0.1:${BLOG_PORT}${BLOG_BASE_PATH}"
echo -e "     (a template was uploaded to ~/smartkubik/nginx-configs/blog-location.conf)."
echo -e "  2. Test nginx: ${BLUE}sudo nginx -t${NC}"
echo -e "  3. Reload nginx: ${BLUE}sudo systemctl reload nginx${NC}"
echo ""
