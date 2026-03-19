#!/bin/bash

# 🎯 DEPLOY FULLSTACK PAGE - Deploy a complete fullstack app (NestJS Backend + Next.js Frontend)
# Handles separate backend and frontend deployments with unified domain architecture
# Uses domain-based routing: /api/* → Backend, /* → Frontend

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

export RSYNC_RSH="ssh -o ServerAliveInterval=60"
SERVER="deployer@178.156.182.177"
ROOT_DIR=$(pwd)

# Usage info
if [ "$#" -lt 4 ]; then
    echo -e "${RED}Usage: ./deploy-fullstack-page.sh <PROJECT_DIR> <SUBDOMAIN> <FRONTEND_PORT> <BACKEND_PORT>${NC}"
    echo ""
    echo "Examples:"
    echo "  ./deploy-fullstack-page.sh /path/to/pagina-inmobiliaria pagina-inmobiliaria 3000 3001"
    echo "  ./deploy-fullstack-page.sh /path/to/client-clinic clinica-lujo 3010 3011"
    echo ""
    echo "This will:"
    echo "  1. Build backend and frontend locally"
    echo "  2. Upload both to ~/smartkubik/pages/<subdomain>/"
    echo "  3. Start 2 PM2 processes (frontend and backend on specified ports)"
    echo "  4. Create nginx config with unified domain routing"
    echo ""
    echo "Requirements:"
    echo "  - Project structure: <PROJECT_DIR>/backend/ and <PROJECT_DIR>/frontend/"
    echo "  - Backend: NestJS with package.json and 'build' script"
    echo "  - Frontend: Next.js with package.json and 'build' script"
    exit 1
fi

PROJECT_DIR=$1
SUBDOMAIN=$2
FRONTEND_PORT=$3
BACKEND_PORT=$4
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik Fullstack Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Project: ${NC}$PROJECT_NAME"
echo -e "${YELLOW}Subdomain: ${NC}${SUBDOMAIN}.smartkubik.com"
echo -e "${YELLOW}Frontend Port: ${NC}$FRONTEND_PORT"
echo -e "${YELLOW}Backend Port: ${NC}$BACKEND_PORT"
echo ""

# Validate project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

# Check backend and frontend directories exist
if [ ! -d "$PROJECT_DIR/backend" ]; then
    echo -e "${RED}❌ Backend directory not found: $PROJECT_DIR/backend${NC}"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found: $PROJECT_DIR/frontend${NC}"
    exit 1
fi

# Check package.json files
if [ ! -f "$PROJECT_DIR/backend/package.json" ]; then
    echo -e "${RED}❌ Backend package.json not found${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/frontend/package.json" ]; then
    echo -e "${RED}❌ Frontend package.json not found${NC}"
    exit 1
fi

echo -e "${YELLOW}✓ Structure validated${NC}"
echo ""

# ===========================
# STEP 1: BUILD BACKEND
# ===========================
echo -e "${YELLOW}📦 Building Backend (NestJS)...${NC}"
cd "$PROJECT_DIR/backend"

if [ ! -d "node_modules" ] || ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Backend build failed - no dist/ folder found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend built successfully${NC}"
echo ""

# ===========================
# STEP 2: BUILD FRONTEND
# ===========================
echo -e "${YELLOW}🎨 Building Frontend (Next.js)...${NC}"
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ] || ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Frontend build failed - no .next/ folder found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# ===========================
# STEP 3: PREPARE REMOTE DIRECTORIES
# ===========================
REMOTE_DIR="~/smartkubik/pages/${SUBDOMAIN}"

echo -e "${YELLOW}📁 Creating remote directory structure...${NC}"
ssh $SERVER "mkdir -p $REMOTE_DIR/backend"
ssh $SERVER "mkdir -p $REMOTE_DIR/frontend"
ssh $SERVER "mkdir -p ~/smartkubik/nginx-configs/pages"

echo -e "${GREEN}✅ Remote directories created${NC}"
echo ""

# ===========================
# STEP 4: UPLOAD BACKEND FILES
# ===========================
echo -e "${YELLOW}📤 Uploading Backend...${NC}"
cd "$PROJECT_DIR/backend"

rsync -avz --delete dist/ $SERVER:$REMOTE_DIR/backend/dist/
rsync -avz package.json $SERVER:$REMOTE_DIR/backend/
rsync -avz package-lock.json $SERVER:$REMOTE_DIR/backend/ 2>/dev/null || true
rsync -avz .env $SERVER:$REMOTE_DIR/backend/ 2>/dev/null || true

ssh $SERVER "mkdir -p $REMOTE_DIR/backend/src"
rsync -avz src/ $SERVER:$REMOTE_DIR/backend/src/ 2>/dev/null || true

echo -e "${GREEN}✅ Backend uploaded${NC}"

# ===========================
# STEP 5: UPLOAD FRONTEND FILES
# ===========================
echo -e "${YELLOW}📤 Uploading Frontend...${NC}"
cd "$PROJECT_DIR/frontend"

rsync -avz --delete .next/ $SERVER:$REMOTE_DIR/frontend/.next/
rsync -avz public/ $SERVER:$REMOTE_DIR/frontend/public/ 2>/dev/null || true
rsync -avz package.json $SERVER:$REMOTE_DIR/frontend/
rsync -avz package-lock.json $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true
rsync -avz next.config.* $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true
rsync -avz .env.local $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true
rsync -avz .env $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true

echo -e "${GREEN}✅ Frontend uploaded${NC}"
echo ""

# ===========================
# STEP 6: INSTALL DEPENDENCIES ON SERVER
# ===========================
echo -e "${YELLOW}🔍 Checking server dependencies...${NC}"

# Backend dependencies
BACKEND_NEEDS_INSTALL=$(ssh $SERVER "cd $REMOTE_DIR/backend && \
  ([ ! -d node_modules ] || ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$BACKEND_NEEDS_INSTALL" == "YES" ]]; then
    echo -e "${YELLOW}📦 Installing backend dependencies on server...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/backend && npm ci --production --prefer-offline"
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies up to date${NC}"
fi

# Frontend dependencies
FRONTEND_NEEDS_INSTALL=$(ssh $SERVER "cd $REMOTE_DIR/frontend && \
  ([ ! -d node_modules ] || ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$FRONTEND_NEEDS_INSTALL" == "YES" ]]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies on server...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/frontend && npm ci --production --prefer-offline"
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies up to date${NC}"
fi

echo ""

# ===========================
# STEP 7: PM2 MANAGEMENT - BACKEND
# ===========================
PM2_BACKEND_NAME="backend-${SUBDOMAIN}"
echo -e "${YELLOW}🔄 Managing PM2 processes...${NC}"

PM2_BACKEND_STATUS=$(ssh $SERVER "pm2 list | grep $PM2_BACKEND_NAME || echo 'NOT_RUNNING'")

if [[ "$PM2_BACKEND_STATUS" == "NOT_RUNNING" ]]; then
    echo -e "${YELLOW}📦 Starting backend with PM2...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/backend && PORT=$BACKEND_PORT pm2 start 'npm run start:prod' --name $PM2_BACKEND_NAME"
    echo -e "${GREEN}✅ Backend started${NC}"
else
    echo -e "${YELLOW}🔄 Reloading backend...${NC}"
    ssh $SERVER "pm2 reload $PM2_BACKEND_NAME"
    echo -e "${GREEN}✅ Backend reloaded${NC}"
fi

# ===========================
# STEP 8: PM2 MANAGEMENT - FRONTEND
# ===========================
PM2_FRONTEND_NAME="frontend-${SUBDOMAIN}"

PM2_FRONTEND_STATUS=$(ssh $SERVER "pm2 list | grep $PM2_FRONTEND_NAME || echo 'NOT_RUNNING'")

if [[ "$PM2_FRONTEND_STATUS" == "NOT_RUNNING" ]]; then
    echo -e "${YELLOW}📦 Starting frontend with PM2...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/frontend && PORT=$FRONTEND_PORT pm2 start 'npm run start' --name $PM2_FRONTEND_NAME"
    echo -e "${GREEN}✅ Frontend started${NC}"
else
    echo -e "${YELLOW}🔄 Reloading frontend...${NC}"
    ssh $SERVER "pm2 reload $PM2_FRONTEND_NAME"
    echo -e "${GREEN}✅ Frontend reloaded${NC}"
fi

ssh $SERVER "pm2 save"
echo ""

# ===========================
# STEP 9: GENERATE NGINX CONFIG
# ===========================
echo -e "${YELLOW}⚙️  Generating Nginx configuration...${NC}"

NGINX_CONFIG_LOCAL="./nginx-configs/pages/${SUBDOMAIN}.conf"
mkdir -p ./nginx-configs/pages

cat > "$NGINX_CONFIG_LOCAL" <<EOF
# SmartKubik Fullstack: ${SUBDOMAIN}
# Auto-generated by deploy-fullstack-page.sh
# Architecture: /api/* → Backend (NestJS), /* → Frontend (Next.js)

server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN}.smartkubik.com;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SUBDOMAIN}.smartkubik.com;

    # SSL certificates (wildcard cert)
    ssl_certificate /etc/letsencrypt/live/smartkubik.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartkubik.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/fullstack-${SUBDOMAIN}-access.log;
    error_log /var/log/nginx/fullstack-${SUBDOMAIN}-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ===========================
    # BACKEND ROUTES - NestJS
    # ===========================
    location /api/ {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # ===========================
    # FRONTEND ROUTES - Next.js
    # ===========================
    location / {
        proxy_pass http://localhost:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:${FRONTEND_PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Next.js cache folder
    location /.next/ {
        proxy_pass http://localhost:${FRONTEND_PORT};
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Upload nginx config
rsync -avz "$NGINX_CONFIG_LOCAL" $SERVER:~/smartkubik/nginx-configs/pages/

echo -e "${GREEN}✅ Nginx config generated${NC}"
echo ""

# ===========================
# STEP 10: VERIFY DEPLOYMENT
# ===========================
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

sleep 2

BACKEND_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$BACKEND_PORT/health 2>/dev/null || echo '000'")
FRONTEND_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$FRONTEND_PORT 2>/dev/null || echo '000'")

echo ""
if [[ "$BACKEND_CHECK" == "200" ]] || [[ "$BACKEND_CHECK" == "404" ]]; then
    echo -e "${GREEN}✅ Backend responding on port $BACKEND_PORT${NC}"
else
    echo -e "${YELLOW}⚠️  Backend returned HTTP $BACKEND_CHECK (might need a moment to start)${NC}"
fi

if [[ "$FRONTEND_CHECK" == "200" ]]; then
    echo -e "${GREEN}✅ Frontend responding on port $FRONTEND_PORT${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend returned HTTP $FRONTEND_CHECK (might need a moment to start)${NC}"
fi

echo ""

# ===========================
# FINAL OUTPUT
# ===========================
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 FULLSTACK DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Info:${NC}"
echo -e "  Project: ${YELLOW}$PROJECT_NAME${NC}"
echo -e "  Remote Path: ${YELLOW}$REMOTE_DIR${NC}"
echo ""
echo -e "${BLUE}🎛️  PM2 Processes:${NC}"
echo -e "  Backend: ${YELLOW}$PM2_BACKEND_NAME${NC} (port $BACKEND_PORT)"
echo -e "  Frontend: ${YELLOW}$PM2_FRONTEND_NAME${NC} (port $FRONTEND_PORT)"
echo ""
echo -e "${BLUE}🌐 Access:${NC}"
echo -e "  Internal Backend: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "  Internal Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Public URL: ${YELLOW}https://${SUBDOMAIN}.smartkubik.com${NC} ${RED}(requires nginx setup)${NC}"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS - Enable Nginx:${NC}"
echo ""
echo -e "Run on the server (SSH into ${SERVER}):"
echo -e "${BLUE}  sudo cp ~/smartkubik/nginx-configs/pages/${SUBDOMAIN}.conf /etc/nginx/sites-available/${NC}"
echo -e "${BLUE}  sudo ln -s /etc/nginx/sites-available/${SUBDOMAIN}.conf /etc/nginx/sites-enabled/${NC}"
echo -e "${BLUE}  sudo nginx -t${NC}"
echo -e "${BLUE}  sudo systemctl reload nginx${NC}"
echo ""
echo -e "Or use the automated helper script:"
echo -e "${BLUE}  ./enable-fullstack-nginx.sh ${SUBDOMAIN}${NC}"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo -e "  Check processes: ${BLUE}ssh $SERVER 'pm2 list'${NC}"
echo -e "  Backend logs: ${BLUE}ssh $SERVER 'pm2 logs $PM2_BACKEND_NAME'${NC}"
echo -e "  Frontend logs: ${BLUE}ssh $SERVER 'pm2 logs $PM2_FRONTEND_NAME'${NC}"
echo ""

cd "$ROOT_DIR"
