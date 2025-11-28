#!/bin/bash

# 🔐 Setup Wildcard SSL Certificate for *.smartkubik.com
# This script helps you obtain a wildcard SSL certificate using DNS validation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Wildcard SSL Certificate Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}This process requires manual DNS validation.${NC}"
echo -e "${YELLOW}You will need access to your DNS provider (Namecheap, Cloudflare, etc.)${NC}"
echo ""
read -p "$(echo -e ${BLUE}Do you want to continue? [Y/n]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Starting certbot DNS challenge...${NC}"
echo -e "${YELLOW}Certbot will provide you with a TXT record to add to your DNS.${NC}"
echo ""

# Start the certbot manual process
ssh $SERVER "sudo certbot certonly --manual --preferred-challenges dns -d '*.smartkubik.com' -d smartkubik.com --agree-tos --email admin@smartkubik.com"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Certificate obtained successfully!${NC}"
    echo ""
    echo -e "${BLUE}Step 2: Applying certificate to nginx...${NC}"

    # Update nginx configuration for storefront
    echo -e "${YELLOW}Updating nginx configuration...${NC}"

    # Upload updated nginx config with SSL
    rsync -avz ./nginx-configs/storefront-subdomain-ssl.conf $SERVER:~/smartkubik/nginx-configs/
    ssh $SERVER "sudo cp ~/smartkubik/nginx-configs/storefront-subdomain-ssl.conf /etc/nginx/sites-available/storefront-subdomain"

    # Test nginx config
    echo -e "${YELLOW}Testing nginx configuration...${NC}"
    ssh $SERVER "sudo nginx -t"

    if [ $? -eq 0 ]; then
        # Reload nginx
        echo -e "${YELLOW}Reloading nginx...${NC}"
        ssh $SERVER "sudo systemctl reload nginx"

        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}🎉 SSL Certificate Applied Successfully!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BLUE}Your storefronts are now accessible via HTTPS:${NC}"
        echo -e "  ${GREEN}https://demo.smartkubik.com${NC}"
        echo -e "  ${GREEN}https://tienda.smartkubik.com${NC}"
        echo -e "  ${GREEN}https://[any-subdomain].smartkubik.com${NC}"
        echo ""
    else
        echo -e "${RED}❌ Nginx configuration test failed${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}❌ Certificate generation failed or was cancelled${NC}"
    echo ""
    echo -e "${YELLOW}Common reasons:${NC}"
    echo -e "  • DNS TXT record not added correctly"
    echo -e "  • DNS changes not propagated yet (wait 5-10 minutes)"
    echo -e "  • Incorrect DNS record name or value"
    echo ""
    echo -e "${BLUE}You can retry this script when ready.${NC}"
    exit 1
fi
