#!/bin/bash

# 🌐 ENABLE DEMO NGINX - Automate nginx configuration for demo subdomains
# Run this script to enable a demo site in nginx (must be run locally, will SSH to server)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"

# Usage
if [ "$#" -lt 1 ]; then
    echo -e "${RED}Usage: ./enable-demo-nginx.sh <SUBDOMAIN>${NC}"
    echo ""
    echo "Example: ./enable-demo-nginx.sh restaurante-casa-pepe"
    echo ""
    echo "This will:"
    echo "  1. Copy nginx config to sites-available"
    echo "  2. Create symlink in sites-enabled"
    echo "  3. Test nginx configuration"
    echo "  4. Reload nginx"
    exit 1
fi

SUBDOMAIN=$1
CONFIG_FILE="${SUBDOMAIN}.conf"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Enabling Nginx for Demo: ${SUBDOMAIN}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check if config exists on server
echo -e "${YELLOW}🔍 Checking if nginx config exists...${NC}"
CONFIG_EXISTS=$(ssh $SERVER "[ -f ~/smartkubik/nginx-configs/demos/${CONFIG_FILE} ] && echo 'YES' || echo 'NO'")

if [[ "$CONFIG_EXISTS" == "NO" ]]; then
    echo -e "${RED}❌ Nginx config not found: ~/smartkubik/nginx-configs/demos/${CONFIG_FILE}${NC}"
    echo -e "${YELLOW}Run ./deploy-demo-page.sh first to generate the config${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Config found${NC}"

# Step 2: Copy to sites-available
echo -e "${YELLOW}📋 Copying config to sites-available...${NC}"
ssh $SERVER "sudo cp ~/smartkubik/nginx-configs/demos/${CONFIG_FILE} /etc/nginx/sites-available/"
echo -e "${GREEN}✅ Config copied${NC}"

# Step 3: Create symlink in sites-enabled
echo -e "${YELLOW}🔗 Creating symlink in sites-enabled...${NC}"
ssh $SERVER "sudo ln -sf /etc/nginx/sites-available/${CONFIG_FILE} /etc/nginx/sites-enabled/"
echo -e "${GREEN}✅ Symlink created${NC}"

# Step 4: Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
TEST_RESULT=$(ssh $SERVER "sudo nginx -t 2>&1")

if echo "$TEST_RESULT" | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed:${NC}"
    echo "$TEST_RESULT"
    exit 1
fi

# Step 5: Reload nginx
echo -e "${YELLOW}♻️  Reloading nginx...${NC}"
ssh $SERVER "sudo systemctl reload nginx"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    exit 1
fi

# Step 6: Verify site is accessible
echo ""
echo -e "${YELLOW}🔍 Verifying site accessibility...${NC}"
sleep 2

HTTPS_CHECK=$(ssh $SERVER "curl -sk -o /dev/null -w '%{http_code}' https://${SUBDOMAIN}.smartkubik.com")

if [[ "$HTTPS_CHECK" == "200" ]]; then
    echo -e "${GREEN}✅ Site is live and accessible via HTTPS!${NC}"
elif [[ "$HTTPS_CHECK" == "000" ]]; then
    echo -e "${YELLOW}⚠️  SSL certificate might not be configured for this subdomain${NC}"
    echo -e "${YELLOW}   Site should work via HTTP, but HTTPS needs SSL cert${NC}"
else
    echo -e "${YELLOW}⚠️  Site returned HTTP $HTTPS_CHECK${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 NGINX CONFIGURATION COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Your demo is now live at:${NC}"
echo -e "  ${GREEN}https://${SUBDOMAIN}.smartkubik.com${NC}"
echo ""
echo -e "${YELLOW}📝 Note:${NC}"
echo -e "  - If you see SSL warnings, ensure wildcard cert covers *.smartkubik.com"
echo -e "  - Add DNS A record if ${SUBDOMAIN}.smartkubik.com doesn't resolve"
echo -e "  - Check PM2: ${BLUE}ssh $SERVER 'pm2 list'${NC}"
echo ""
