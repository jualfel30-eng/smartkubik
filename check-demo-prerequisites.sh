#!/bin/bash

# 🔍 CHECK DEMO PREREQUISITES - Verify server is ready for demo deployments

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"
DOMAIN="smartkubik.com"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 SmartKubik Demo Prerequisites Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track issues
ISSUES=0
WARNINGS=0

# ===== LOCAL CHECKS =====
echo -e "${CYAN}📦 Checking Local Environment...${NC}"
echo ""

# Check if scripts exist
echo -n "  deploy-demo-page.sh exists: "
if [ -f "deploy-demo-page.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo -n "  enable-demo-nginx.sh exists: "
if [ -f "enable-demo-nginx.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo -n "  manage-demos.sh exists: "
if [ -f "manage-demos.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check script permissions
echo -n "  Scripts are executable: "
if [ -x "deploy-demo-page.sh" ] && [ -x "enable-demo-nginx.sh" ] && [ -x "manage-demos.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Run: chmod +x *.sh${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check rsync
echo -n "  rsync installed: "
if command -v rsync &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Install: brew install rsync${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check SSH access
echo -n "  SSH access to server: "
if ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER "echo 'OK'" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Cannot connect${NC}"
    echo -e "${YELLOW}    Setup SSH key: ssh-copy-id $SERVER${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ===== SERVER CHECKS =====
echo -e "${CYAN}🖥️  Checking Server Environment...${NC}"
echo ""

# Check PM2
echo -n "  PM2 installed: "
PM2_CHECK=$(ssh $SERVER "command -v pm2 &> /dev/null && echo 'YES' || echo 'NO'")
if [[ "$PM2_CHECK" == "YES" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Install PM2 on server${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check Nginx
echo -n "  Nginx installed: "
NGINX_CHECK=$(ssh $SERVER "command -v nginx &> /dev/null && echo 'YES' || echo 'NO'")
if [[ "$NGINX_CHECK" == "YES" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Install Nginx on server${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check Nginx running
echo -n "  Nginx running: "
NGINX_RUNNING=$(ssh $SERVER "systemctl is-active nginx 2>/dev/null || echo 'inactive'")
if [[ "$NGINX_RUNNING" == "active" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Start: sudo systemctl start nginx${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check demo directory exists
echo -n "  ~/smartkubik/demos directory: "
DEMO_DIR_EXISTS=$(ssh $SERVER "[ -d ~/smartkubik/demos ] && echo 'YES' || echo 'NO'")
if [[ "$DEMO_DIR_EXISTS" == "YES" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Creating...${NC}"
    ssh $SERVER "mkdir -p ~/smartkubik/demos ~/smartkubik/nginx-configs/demos"
    echo -e "    ${GREEN}Created${NC}"
fi

# Check Node.js
echo -n "  Node.js installed (server): "
NODE_VERSION=$(ssh $SERVER "node --version 2>/dev/null || echo 'NOT_INSTALLED'")
if [[ "$NODE_VERSION" != "NOT_INSTALLED" ]]; then
    echo -e "${GREEN}✓ ($NODE_VERSION)${NC}"
else
    echo -e "${RED}✗ Install Node.js on server${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check available ports
echo -n "  Available ports (5001-5010): "
USED_PORTS=$(ssh $SERVER "pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | startswith(\"demo-\")) | .pm2_env.PORT' | sort -n")
if [[ -z "$USED_PORTS" ]]; then
    echo -e "${GREEN}✓ All available${NC}"
else
    echo -e "${CYAN}Used: $USED_PORTS${NC}"
fi

echo ""

# ===== SSL CERTIFICATE CHECKS =====
echo -e "${CYAN}🔒 Checking SSL Certificates...${NC}"
echo ""

# Check certbot
echo -n "  Certbot installed: "
CERTBOT_CHECK=$(ssh $SERVER "command -v certbot &> /dev/null && echo 'YES' || echo 'NO'")
if [[ "$CERTBOT_CHECK" == "YES" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Install: sudo apt install certbot${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check wildcard certificate
echo -n "  Wildcard cert for *.smartkubik.com: "
WILDCARD_CERT=$(ssh $SERVER "sudo certbot certificates 2>/dev/null | grep -E '\\*\\.smartkubik\\.com|smartkubik\\.com' || echo 'NOT_FOUND'")
if [[ "$WILDCARD_CERT" != "NOT_FOUND" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Get wildcard cert:${NC}"
    echo -e "    ${YELLOW}sudo certbot certonly --manual --preferred-challenges=dns -d smartkubik.com -d *.smartkubik.com${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check certificate expiry
echo -n "  Certificate expiry: "
CERT_EXPIRY=$(ssh $SERVER "sudo certbot certificates 2>/dev/null | grep -A 2 'Expiry Date' | head -1 | awk '{print \$3, \$4}' || echo 'UNKNOWN'")
if [[ "$CERT_EXPIRY" != "UNKNOWN" ]]; then
    echo -e "${GREEN}$CERT_EXPIRY${NC}"
else
    echo -e "${YELLOW}⚠ Unknown${NC}"
fi

echo ""

# ===== DNS CHECKS =====
echo -e "${CYAN}🌐 Checking DNS Configuration...${NC}"
echo ""

# Check main domain
echo -n "  smartkubik.com resolves: "
MAIN_DOMAIN_IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
if [[ ! -z "$MAIN_DOMAIN_IP" ]]; then
    echo -e "${GREEN}✓ ($MAIN_DOMAIN_IP)${NC}"
else
    echo -e "${RED}✗ DNS not configured${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check wildcard DNS
echo -n "  Wildcard DNS (*.smartkubik.com): "
TEST_SUBDOMAIN="test-demo-$(date +%s).smartkubik.com"
WILDCARD_IP=$(nslookup $TEST_SUBDOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
if [[ ! -z "$WILDCARD_IP" ]]; then
    echo -e "${GREEN}✓ ($WILDCARD_IP)${NC}"
else
    echo -e "${YELLOW}⚠ Configure wildcard DNS:${NC}"
    echo -e "    ${YELLOW}Type: A, Name: *, Value: 178.156.182.177${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ===== FIREWALL CHECKS =====
echo -e "${CYAN}🔥 Checking Firewall Rules...${NC}"
echo ""

# Check if UFW is active
UFW_STATUS=$(ssh $SERVER "sudo ufw status 2>/dev/null | grep -i 'Status:' | awk '{print \$2}' || echo 'inactive'")
echo -n "  UFW firewall: "
if [[ "$UFW_STATUS" == "active" ]]; then
    echo -e "${GREEN}Active${NC}"

    # Check port 80
    echo -n "    Port 80 (HTTP): "
    PORT_80=$(ssh $SERVER "sudo ufw status | grep -E '80/tcp.*ALLOW' || echo 'BLOCKED'")
    if [[ "$PORT_80" != "BLOCKED" ]]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Run: sudo ufw allow 80/tcp${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check port 443
    echo -n "    Port 443 (HTTPS): "
    PORT_443=$(ssh $SERVER "sudo ufw status | grep -E '443/tcp.*ALLOW' || echo 'BLOCKED'")
    if [[ "$PORT_443" != "BLOCKED" ]]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Run: sudo ufw allow 443/tcp${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${CYAN}Inactive (no restrictions)${NC}"
fi

echo ""

# ===== CURRENT DEMOS =====
echo -e "${CYAN}📋 Current Demo Pages...${NC}"
echo ""

CURRENT_DEMOS=$(ssh $SERVER "pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | startswith(\"demo-\")) | .name' || echo ''")

if [[ -z "$CURRENT_DEMOS" ]]; then
    echo -e "  ${YELLOW}No demos deployed yet${NC}"
else
    echo "  Active demos:"
    while IFS= read -r demo; do
        SUBDOMAIN="${demo#demo-}"
        STATUS=$(ssh $SERVER "pm2 jlist | jq -r '.[] | select(.name == \"$demo\") | .pm2_env.status'")
        PORT=$(ssh $SERVER "pm2 jlist | jq -r '.[] | select(.name == \"$demo\") | .pm2_env.PORT // \"N/A\"'")

        if [[ "$STATUS" == "online" ]]; then
            STATUS_ICON="${GREEN}●${NC}"
        else
            STATUS_ICON="${RED}●${NC}"
        fi

        echo -e "    $STATUS_ICON $SUBDOMAIN (port $PORT)"
    done <<< "$CURRENT_DEMOS"
fi

echo ""

# ===== SUMMARY =====
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to deploy demos.${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Create your demo page (React/Next.js/Vue)"
    echo -e "  2. Run: ${CYAN}./deploy-demo-page.sh <DIR> <SUBDOMAIN> <PORT>${NC}"
    echo -e "  3. Run: ${CYAN}./enable-demo-nginx.sh <SUBDOMAIN>${NC}"
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found - review recommendations above${NC}"
    echo -e "${GREEN}System is functional, but some optimizations recommended${NC}"
else
    echo -e "${RED}❌ $ISSUES critical issue(s) found${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo -e "${YELLOW}Fix critical issues before deploying demos${NC}"
fi

echo ""
