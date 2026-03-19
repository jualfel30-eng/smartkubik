#!/bin/bash

# 🎯 DEPLOY DEMO PAGE - Deploy a landing page demo to SmartKubik subdomain
# Similar flow to simple-deploy.sh but for standalone demo pages

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
if [ "$#" -lt 3 ]; then
    echo -e "${RED}Usage: ./deploy-demo-page.sh <DEMO_DIR> <SUBDOMAIN> <PORT>${NC}"
    echo ""
    echo "Examples:"
    echo "  ./deploy-demo-page.sh ../mi-restaurante-demo restaurante-casa-pepe 5001"
    echo "  ./deploy-demo-page.sh ../cafeteria-demo cafeteria-dulce-aroma 5002"
    echo ""
    echo "This will:"
    echo "  1. Build the demo locally"
    echo "  2. Upload to ~/smartkubik/demos/<subdomain>/"
    echo "  3. Start with PM2 on specified port"
    echo "  4. Create nginx config for <subdomain>.smartkubik.com"
    exit 1
fi

DEMO_DIR=$1
SUBDOMAIN=$2
PORT=$3
DEMO_NAME=$(basename "$DEMO_DIR")

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik Demo Page Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Demo: ${NC}$DEMO_NAME"
echo -e "${YELLOW}Subdomain: ${NC}${SUBDOMAIN}.smartkubik.com"
echo -e "${YELLOW}Port: ${NC}$PORT"
echo ""

# Validate demo directory exists
if [ ! -d "$DEMO_DIR" ]; then
    echo -e "${RED}❌ Demo directory not found: $DEMO_DIR${NC}"
    exit 1
fi

# Check if it's a Node.js project
if [ ! -f "$DEMO_DIR/package.json" ]; then
    echo -e "${RED}❌ package.json not found in $DEMO_DIR${NC}"
    echo -e "${YELLOW}This script is for React/Next.js/Vue projects${NC}"
    exit 1
fi

# Step 1: Install dependencies if needed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
cd "$DEMO_DIR"
if [ ! -d "node_modules" ] || ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies OK${NC}"
fi

# Step 2: Build locally
echo -e "${YELLOW}🔨 Building demo page locally...${NC}"
npm run build

if [ ! -d "dist" ] && [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed - no dist/ or .next/ folder found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Demo built successfully${NC}"

# Detect build type
if [ -d ".next" ]; then
    BUILD_TYPE="nextjs"
    BUILD_DIR=".next"
    echo -e "${BLUE}📦 Detected: Next.js project${NC}"
elif [ -d "dist" ]; then
    BUILD_TYPE="static"
    BUILD_DIR="dist"
    echo -e "${BLUE}📦 Detected: Static build (React/Vue/Vite)${NC}"
fi

REMOTE_DIR="~/smartkubik/demos/${SUBDOMAIN}"

# Step 3: Create remote directory structure
echo -e "${YELLOW}📁 Creating remote directory structure...${NC}"
ssh $SERVER "mkdir -p $REMOTE_DIR"
ssh $SERVER "mkdir -p ~/smartkubik/nginx-configs/demos"

# Step 4: Upload build files
echo -e "${YELLOW}📤 Uploading demo files to server...${NC}"

if [ "$BUILD_TYPE" == "nextjs" ]; then
    # Next.js deployment
    rsync -avz --delete .next/ $SERVER:$REMOTE_DIR/.next/
    rsync -avz public/ $SERVER:$REMOTE_DIR/public/ 2>/dev/null || true
    rsync -avz package.json $SERVER:$REMOTE_DIR/
    rsync -avz package-lock.json $SERVER:$REMOTE_DIR/ 2>/dev/null || true
    rsync -avz next.config.* $SERVER:$REMOTE_DIR/ 2>/dev/null || true
else
    # Static build (Vite/React/Vue)
    rsync -avz --delete dist/ $SERVER:$REMOTE_DIR/dist/
    ssh $SERVER "sudo chmod -R 755 $REMOTE_DIR/dist 2>/dev/null || chmod -R 755 $REMOTE_DIR/dist"
fi

echo -e "${GREEN}✅ Files uploaded${NC}"

# Step 5: Install production dependencies (only for Next.js)
if [ "$BUILD_TYPE" == "nextjs" ]; then
    echo -e "${YELLOW}🔍 Checking server dependencies...${NC}"
    NEEDS_INSTALL=$(ssh $SERVER "cd $REMOTE_DIR && \
      ([ ! -d node_modules ] || ! npm ls --depth=0 > /dev/null 2>&1) && echo 'YES' || echo 'NO'")

    if [[ "$NEEDS_INSTALL" == "YES" ]]; then
        echo -e "${YELLOW}📦 Installing dependencies on server...${NC}"
        ssh $SERVER "cd $REMOTE_DIR && npm ci --production --prefer-offline"
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✅ Dependencies up to date${NC}"
    fi
fi

# Step 6: PM2 management
PM2_NAME="demo-${SUBDOMAIN}"
echo -e "${YELLOW}🔄 Managing PM2 process...${NC}"

PM2_STATUS=$(ssh $SERVER "pm2 list | grep $PM2_NAME || echo 'NOT_RUNNING'")

if [[ "$PM2_STATUS" == "NOT_RUNNING" ]]; then
    echo -e "${YELLOW}📦 Starting demo with PM2 (first time)...${NC}"

    if [ "$BUILD_TYPE" == "nextjs" ]; then
        ssh $SERVER "cd $REMOTE_DIR && PORT=$PORT pm2 start npm --name $PM2_NAME -- start"
    else
        # For static builds, use serve or a simple HTTP server
        ssh $SERVER "cd $REMOTE_DIR && pm2 start 'npx serve dist -l $PORT' --name $PM2_NAME"
    fi

    ssh $SERVER "pm2 save"
    echo -e "${GREEN}✅ Demo started with PM2${NC}"
else
    echo -e "${YELLOW}🔄 Reloading demo...${NC}"
    ssh $SERVER "cd $REMOTE_DIR && pm2 reload $PM2_NAME"
    echo -e "${GREEN}✅ Demo PM2 reloaded${NC}"
fi

# Step 7: Generate Nginx config
echo -e "${YELLOW}⚙️  Generating Nginx configuration...${NC}"

NGINX_CONFIG_LOCAL="./nginx-configs/demos/${SUBDOMAIN}.conf"
mkdir -p ./nginx-configs/demos

cat > "$NGINX_CONFIG_LOCAL" <<EOF
# SmartKubik Demo: ${SUBDOMAIN}
# Auto-generated by deploy-demo-page.sh

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
    access_log /var/log/nginx/demo-${SUBDOMAIN}-access.log;
    error_log /var/log/nginx/demo-${SUBDOMAIN}-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to PM2 process
    location / {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:${PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Upload nginx config
rsync -avz "$NGINX_CONFIG_LOCAL" $SERVER:~/smartkubik/nginx-configs/demos/

echo -e "${GREEN}✅ Nginx config generated${NC}"

# Step 8: Verify deployment
echo ""
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

sleep 2

HEALTH_CHECK=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT")

if [[ "$HEALTH_CHECK" == "200" ]]; then
    echo -e "${GREEN}✅ Demo is responding on port $PORT${NC}"
else
    echo -e "${YELLOW}⚠️  Demo returned HTTP $HEALTH_CHECK (might need a moment to start)${NC}"
fi

# Final output
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEMO DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Demo Info:${NC}"
echo -e "  Local Directory: ${YELLOW}$DEMO_DIR${NC}"
echo -e "  Remote Directory: ${YELLOW}$REMOTE_DIR${NC}"
echo -e "  PM2 Process: ${YELLOW}$PM2_NAME${NC}"
echo -e "  Port: ${YELLOW}$PORT${NC}"
echo ""
echo -e "${BLUE}🌐 Access:${NC}"
echo -e "  Internal: ${GREEN}http://localhost:$PORT${NC}"
echo -e "  Public: ${YELLOW}https://${SUBDOMAIN}.smartkubik.com${NC} ${RED}(requires nginx setup)${NC}"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS - Enable Nginx:${NC}"
echo ""
echo -e "Run on the server (SSH into ${SERVER}):"
echo -e "${BLUE}  sudo cp ~/smartkubik/nginx-configs/demos/${SUBDOMAIN}.conf /etc/nginx/sites-available/${NC}"
echo -e "${BLUE}  sudo ln -s /etc/nginx/sites-available/${SUBDOMAIN}.conf /etc/nginx/sites-enabled/${NC}"
echo -e "${BLUE}  sudo nginx -t${NC}"
echo -e "${BLUE}  sudo systemctl reload nginx${NC}"
echo ""
echo -e "Or use the automated helper script:"
echo -e "${BLUE}  ./enable-demo-nginx.sh ${SUBDOMAIN}${NC}"
echo ""

cd "$ROOT_DIR"
