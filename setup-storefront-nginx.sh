#!/bin/bash

# 🏪 SETUP STOREFRONT NGINX - Configure nginx for storefront subdomain routing
# This script should be run on the production server after deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏪 SmartKubik Storefront Nginx Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running on server
if [ ! -d ~/smartkubik ]; then
    echo -e "${RED}❌ This script must be run on the production server${NC}"
    echo -e "${YELLOW}💡 Transfer this script to the server and run it there:${NC}"
    echo -e "   ${BLUE}scp setup-storefront-nginx.sh deployer@178.156.182.177:~/${NC}"
    echo -e "   ${BLUE}ssh deployer@178.156.182.177${NC}"
    echo -e "   ${BLUE}chmod +x setup-storefront-nginx.sh${NC}"
    echo -e "   ${BLUE}./setup-storefront-nginx.sh${NC}"
    exit 1
fi

# Step 1: Check if nginx config exists
echo -e "${YELLOW}🔍 Checking for nginx configuration...${NC}"
if [ ! -f ~/smartkubik/nginx-configs/storefront-subdomain.conf ]; then
    echo -e "${RED}❌ Nginx config not found. Please run deployment first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Nginx config found${NC}"

# Step 2: Copy nginx config to sites-available
echo -e "${YELLOW}📋 Copying nginx config to sites-available...${NC}"
sudo cp ~/smartkubik/nginx-configs/storefront-subdomain.conf /etc/nginx/sites-available/storefront-subdomain
echo -e "${GREEN}✅ Config copied${NC}"

# Step 3: Enable the site
echo -e "${YELLOW}🔗 Enabling site...${NC}"
if [ -L /etc/nginx/sites-enabled/storefront-subdomain ]; then
    echo -e "${YELLOW}⚠️  Site already enabled, skipping...${NC}"
else
    sudo ln -s /etc/nginx/sites-available/storefront-subdomain /etc/nginx/sites-enabled/storefront-subdomain
    echo -e "${GREEN}✅ Site enabled${NC}"
fi

# Step 4: Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}💡 Rolling back changes...${NC}"
    sudo rm /etc/nginx/sites-enabled/storefront-subdomain
    exit 1
fi

# Step 5: Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# Step 6: Verify PM2 is running storefront
echo -e "${YELLOW}🔍 Checking PM2 storefront process...${NC}"
if pm2 list | grep -q smartkubik-storefront; then
    echo -e "${GREEN}✅ Storefront is running in PM2${NC}"
else
    echo -e "${YELLOW}⚠️  Storefront not found in PM2${NC}"
    echo -e "${BLUE}🚀 Starting storefront...${NC}"
    cd ~/smartkubik/food-inventory-storefront
    pm2 start npm --name smartkubik-storefront -- start
    pm2 save
    echo -e "${GREEN}✅ Storefront started${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 STOREFRONT NGINX SETUP COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Next Steps:${NC}"
echo ""
echo -e "  ${YELLOW}1. Test local access:${NC}"
echo -e "     ${BLUE}curl http://localhost:3001${NC}"
echo ""
echo -e "  ${YELLOW}2. Setup DNS (if not already done):${NC}"
echo -e "     Configure ${BLUE}*.smartkubik.com${NC} A record to point to this server's IP"
echo ""
echo -e "  ${YELLOW}3. Get SSL Certificate (Recommended):${NC}"
echo -e "     ${BLUE}sudo certbot --nginx -d \"*.smartkubik.com\" -d smartkubik.com${NC}"
echo ""
echo -e "  ${YELLOW}4. Test with a subdomain:${NC}"
echo -e "     ${BLUE}curl https://demo.smartkubik.com${NC}"
echo ""
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo -e "  View storefront logs:  ${BLUE}pm2 logs smartkubik-storefront${NC}"
echo -e "  View nginx logs:       ${BLUE}sudo tail -f /var/log/nginx/storefront-error.log${NC}"
echo -e "  Restart storefront:    ${BLUE}pm2 restart smartkubik-storefront${NC}"
echo -e "  Restart nginx:         ${BLUE}sudo systemctl reload nginx${NC}"
echo ""
