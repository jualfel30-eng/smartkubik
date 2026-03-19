#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 DEPLOY DEMO FULLSTACK - Generic full-stack demo deployer
# Reads .deploy.env from the project directory for configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

export RSYNC_RSH="ssh -o ServerAliveInterval=60"
SERVER="deployer@178.156.182.177"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# ─── USAGE ────────────────────────────────────────────────────
if [ "$#" -lt 1 ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 SmartKubik Demo Fullstack Deployer${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Usage: ${GREEN}./deploy-demo-fullstack.sh <PROJECT_DIR> [--skip-build] [--skip-nginx] [--seed]${NC}"
    echo ""
    echo "Options:"
    echo "  --skip-build   Skip local build (use existing dist/.next)"
    echo "  --skip-nginx   Skip nginx config generation"
    echo "  --seed         Run seed script after deployment"
    echo ""
    echo "The project must contain a ${YELLOW}.deploy.env${NC} file with configuration."
    echo ""
    echo "Examples:"
    echo "  ./deploy-demo-fullstack.sh ../Autopartes"
    echo "  ./deploy-demo-fullstack.sh ../Restaurante --seed"
    echo "  ./deploy-demo-fullstack.sh \"../Página de clínica\" --skip-build"
    echo ""
    exit 0
fi

PROJECT_DIR="$1"
shift

# Parse flags
SKIP_BUILD=false
SKIP_NGINX=false
RUN_SEED=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true ;;
        --skip-nginx) SKIP_NGINX=true ;;
        --seed) RUN_SEED=true ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Resolve absolute path
PROJECT_DIR=$(cd "$PROJECT_DIR" 2>/dev/null && pwd)
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

# ─── LOAD CONFIG ──────────────────────────────────────────────
CONFIG_FILE="$PROJECT_DIR/.deploy.env"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    echo -e "${YELLOW}Create a .deploy.env file in the project root. See DEPLOY-DEMOS-GUIDE.md${NC}"
    exit 1
fi

source "$CONFIG_FILE"

# Validate required vars
REQUIRED_VARS="DEMO_SUBDOMAIN BACKEND_PORT FRONTEND_PORT BACKEND_START_CMD BACKEND_BUILD_CMD"
for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Missing required config: $var in .deploy.env${NC}"
        exit 1
    fi
done

# Defaults
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"
BACKEND_DIR="${BACKEND_DIR:-backend}"
FRONTEND_BUILD_CMD="${FRONTEND_BUILD_CMD:-npm run build}"
REMOTE_DIR="~/smartkubik/demos/${DEMO_SUBDOMAIN}"
PM2_BACKEND="demo-${DEMO_SUBDOMAIN}-api"
PM2_FRONTEND="demo-${DEMO_SUBDOMAIN}-frontend"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik Demo Deploy: ${DEMO_SUBDOMAIN}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Subdomain:${NC} ${DEMO_SUBDOMAIN}.smartkubik.com"
echo -e "${YELLOW}Backend:${NC}   port ${BACKEND_PORT} (${BACKEND_START_CMD})"
echo -e "${YELLOW}Frontend:${NC}  port ${FRONTEND_PORT} (Next.js)"
echo -e "${YELLOW}Project:${NC}   ${PROJECT_DIR}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: BUILD BACKEND
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${CYAN}[1/9] Building backend...${NC}"
    cd "$PROJECT_DIR/$BACKEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  Installing backend dependencies...${NC}"
        npm install
    fi

    echo -e "${YELLOW}  Running: ${BACKEND_BUILD_CMD}...${NC}"
    eval "$BACKEND_BUILD_CMD"
    echo -e "${GREEN}  ✅ Backend built${NC}"

    # ═══════════════════════════════════════════════════════════
    # STEP 2: BUILD FRONTEND
    # ═══════════════════════════════════════════════════════════
    echo -e "${CYAN}[2/9] Building frontend...${NC}"
    cd "$PROJECT_DIR/$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  Installing frontend dependencies...${NC}"
        npm install
    fi

    # Swap .env.local with .env.production for build
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}  Using production environment variables...${NC}"
        cp .env.local .env.local.backup 2>/dev/null || true
        cp .env.production .env.local
    fi

    eval "$FRONTEND_BUILD_CMD"

    # Restore original .env.local
    if [ -f ".env.local.backup" ]; then
        mv .env.local.backup .env.local
    elif [ -f ".env.production" ]; then
        rm -f .env.local
    fi

    echo -e "${GREEN}  ✅ Frontend built${NC}"
else
    echo -e "${YELLOW}[1-2/9] Skipping builds (--skip-build)${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 3: CREATE REMOTE DIRECTORIES
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[3/9] Creating remote directory structure...${NC}"
ssh $SERVER "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/frontend"
ssh $SERVER "mkdir -p ~/smartkubik/nginx-configs/demos"
echo -e "${GREEN}  ✅ Directories created${NC}"

# ═══════════════════════════════════════════════════════════════
# STEP 4: UPLOAD BACKEND
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[4/9] Uploading backend...${NC}"
cd "$PROJECT_DIR/$BACKEND_DIR"

# Determine what to upload based on build output
if [ -d "dist" ]; then
    rsync -avz --delete dist/ $SERVER:$REMOTE_DIR/backend/dist/
fi

rsync -avz package.json $SERVER:$REMOTE_DIR/backend/
rsync -avz package-lock.json $SERVER:$REMOTE_DIR/backend/ 2>/dev/null || true

# Upload production .env
if [ -f ".env.production" ]; then
    rsync -avz .env.production $SERVER:$REMOTE_DIR/backend/.env
elif [ -f ".env" ]; then
    echo -e "${YELLOW}  ⚠️  No .env.production found, using .env (check secrets!)${NC}"
    rsync -avz .env $SERVER:$REMOTE_DIR/backend/.env
fi

# Upload NestJS-specific files if present
rsync -avz nest-cli.json $SERVER:$REMOTE_DIR/backend/ 2>/dev/null || true
rsync -avz tsconfig*.json $SERVER:$REMOTE_DIR/backend/ 2>/dev/null || true

echo -e "${GREEN}  ✅ Backend uploaded${NC}"

# ═══════════════════════════════════════════════════════════════
# STEP 5: UPLOAD FRONTEND
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[5/9] Uploading frontend...${NC}"
cd "$PROJECT_DIR/$FRONTEND_DIR"

if [ -d ".next" ]; then
    rsync -avz --delete .next/ $SERVER:$REMOTE_DIR/frontend/.next/
fi
rsync -avz public/ $SERVER:$REMOTE_DIR/frontend/public/ 2>/dev/null || true
rsync -avz package.json $SERVER:$REMOTE_DIR/frontend/
rsync -avz package-lock.json $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true
rsync -avz next.config.* $SERVER:$REMOTE_DIR/frontend/ 2>/dev/null || true

# Upload production env as .env.local
if [ -f ".env.production" ]; then
    rsync -avz .env.production $SERVER:$REMOTE_DIR/frontend/.env.local
fi

echo -e "${GREEN}  ✅ Frontend uploaded${NC}"

# ═══════════════════════════════════════════════════════════════
# STEP 6: INSTALL SERVER DEPENDENCIES
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[6/9] Installing server dependencies...${NC}"

# Backend
NEEDS_BACKEND=$(ssh $SERVER "cd $REMOTE_DIR/backend && \
  ([ ! -d node_modules ] || ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$NEEDS_BACKEND" == "YES" ]]; then
    echo -e "${YELLOW}  Installing backend dependencies on server...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/backend && npm ci --omit=dev --prefer-offline"
    echo -e "${GREEN}  ✅ Backend deps installed${NC}"
else
    echo -e "${GREEN}  ✅ Backend deps up to date${NC}"
fi

# Frontend
NEEDS_FRONTEND=$(ssh $SERVER "cd $REMOTE_DIR/frontend && \
  ([ ! -d node_modules ] || ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

if [[ "$NEEDS_FRONTEND" == "YES" ]]; then
    echo -e "${YELLOW}  Installing frontend dependencies on server...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/frontend && npm ci --omit=dev --prefer-offline"
    echo -e "${GREEN}  ✅ Frontend deps installed${NC}"
else
    echo -e "${GREEN}  ✅ Frontend deps up to date${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 7: PM2 MANAGEMENT
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[7/9] Managing PM2 processes...${NC}"

# --- Backend ---
BACKEND_STATUS=$(ssh $SERVER "pm2 list | grep '$PM2_BACKEND' || echo 'NOT_RUNNING'")

if [[ "$BACKEND_STATUS" == *"NOT_RUNNING"* ]]; then
    echo -e "${YELLOW}  Starting backend with PM2...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/backend && PORT=$BACKEND_PORT pm2 start $BACKEND_START_CMD --name $PM2_BACKEND"
else
    echo -e "${YELLOW}  Reloading backend...${NC}"
    ssh $SERVER "pm2 reload $PM2_BACKEND"
fi
echo -e "${GREEN}  ✅ Backend: $PM2_BACKEND (port $BACKEND_PORT)${NC}"

# --- Frontend ---
FRONTEND_STATUS=$(ssh $SERVER "pm2 list | grep '$PM2_FRONTEND' || echo 'NOT_RUNNING'")

if [[ "$FRONTEND_STATUS" == *"NOT_RUNNING"* ]]; then
    echo -e "${YELLOW}  Starting frontend with PM2...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/frontend && PORT=$FRONTEND_PORT pm2 start npm --name $PM2_FRONTEND -- start"
else
    echo -e "${YELLOW}  Reloading frontend...${NC}"
    ssh $SERVER "pm2 reload $PM2_FRONTEND"
fi
echo -e "${GREEN}  ✅ Frontend: $PM2_FRONTEND (port $FRONTEND_PORT)${NC}"

ssh $SERVER "pm2 save"

# ═══════════════════════════════════════════════════════════════
# STEP 8: NGINX CONFIG
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_NGINX" = false ]; then
    echo -e "${CYAN}[8/9] Generating Nginx configuration...${NC}"

    NGINX_LOCAL="$PROJECT_DIR/nginx-${DEMO_SUBDOMAIN}.conf"

    cat > "$NGINX_LOCAL" <<NGINXEOF
# SmartKubik Demo: ${DEMO_SUBDOMAIN}.smartkubik.com
# Auto-generated by deploy-demo-fullstack.sh

server {
    listen 80;
    listen [::]:80;
    server_name ${DEMO_SUBDOMAIN}.smartkubik.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DEMO_SUBDOMAIN}.smartkubik.com;

    ssl_certificate /etc/letsencrypt/live/smartkubik.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartkubik.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/demo-${DEMO_SUBDOMAIN}-access.log;
    error_log /var/log/nginx/demo-${DEMO_SUBDOMAIN}-error.log;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /_next/ {
        proxy_pass http://localhost:${FRONTEND_PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:${FRONTEND_PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

    rsync -avz "$NGINX_LOCAL" $SERVER:~/smartkubik/nginx-configs/demos/${DEMO_SUBDOMAIN}.conf
    echo -e "${GREEN}  ✅ Nginx config generated & uploaded${NC}"
else
    echo -e "${YELLOW}[8/9] Skipping Nginx (--skip-nginx)${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 9: SEED (optional)
# ═══════════════════════════════════════════════════════════════
if [ "$RUN_SEED" = true ] && [ -n "$SEED_CMD" ]; then
    echo -e "${CYAN}[9/9] Running seed...${NC}"
    ssh $SERVER "cd $REMOTE_DIR/backend && $SEED_CMD"
    echo -e "${GREEN}  ✅ Seed complete${NC}"
else
    echo -e "${CYAN}[9/9] Verifying deployment...${NC}"
    sleep 3

    BACKEND_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$BACKEND_PORT/api 2>/dev/null || echo '000'")
    FRONTEND_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$FRONTEND_PORT 2>/dev/null || echo '000'")

    if [[ "$BACKEND_CHECK" == "200" ]] || [[ "$BACKEND_CHECK" == "404" ]]; then
        echo -e "${GREEN}  ✅ Backend API responding (HTTP $BACKEND_CHECK)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Backend returned HTTP $BACKEND_CHECK${NC}"
    fi

    if [[ "$FRONTEND_CHECK" == "200" ]]; then
        echo -e "${GREEN}  ✅ Frontend responding (HTTP $FRONTEND_CHECK)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Frontend returned HTTP $FRONTEND_CHECK${NC}"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEMO DEPLOYED: ${DEMO_SUBDOMAIN}.smartkubik.com${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}PM2 Processes:${NC}"
echo -e "  Backend:  ${YELLOW}$PM2_BACKEND${NC} → port ${BACKEND_PORT}"
echo -e "  Frontend: ${YELLOW}$PM2_FRONTEND${NC} → port ${FRONTEND_PORT}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo -e "  Frontend: ${GREEN}https://${DEMO_SUBDOMAIN}.smartkubik.com${NC}"
echo -e "  API:      ${GREEN}https://${DEMO_SUBDOMAIN}.smartkubik.com/api${NC}"
echo ""
echo -e "${YELLOW}Enable Nginx:${NC}"
echo -e "  ssh $SERVER"
echo -e "  sudo cp ~/smartkubik/nginx-configs/demos/${DEMO_SUBDOMAIN}.conf /etc/nginx/sites-available/"
echo -e "  sudo ln -sf /etc/nginx/sites-available/${DEMO_SUBDOMAIN}.conf /etc/nginx/sites-enabled/"
echo -e "  sudo nginx -t && sudo systemctl reload nginx"
echo ""

cd "$SCRIPT_DIR"
