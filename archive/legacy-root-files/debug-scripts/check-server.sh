#!/bin/bash

# 🔍 SCRIPT DE VERIFICACIÓN RÁPIDA - SmartKubik
# Muestra el estado actual del servidor en producción

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 SmartKubik Server Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PM2 Status
echo -e "${YELLOW}🔧 PM2 Status:${NC}"
ssh $SERVER "pm2 status"
echo ""

# Health Check
echo -e "${YELLOW}🏥 Backend Health Check:${NC}"
HEALTH=$(ssh $SERVER "curl -s http://localhost:3000/api/v1/health")
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Backend is HEALTHY${NC}"
    echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
    echo -e "${RED}❌ Backend is UNHEALTHY${NC}"
    echo "$HEALTH"
fi
echo ""

# Disk Space
echo -e "${YELLOW}💾 Disk Space:${NC}"
ssh $SERVER "df -h / | tail -1"
echo ""

# Memory
echo -e "${YELLOW}🧠 Memory Usage:${NC}"
ssh $SERVER "free -h | grep Mem"
echo ""

# Uptime
echo -e "${YELLOW}⏰ Server Uptime:${NC}"
ssh $SERVER "uptime"
echo ""

# Last Commits
echo -e "${YELLOW}📝 Last 3 Commits:${NC}"
ssh $SERVER "cd /home/deployer/smartkubik && git log --oneline -3"
echo ""

# Nginx Status
echo -e "${YELLOW}🌐 Nginx Status:${NC}"
ssh $SERVER "sudo systemctl status nginx | head -3"
echo ""

# Public URLs
echo -e "${YELLOW}🌍 Public URLs:${NC}"
echo -e "  Frontend: ${GREEN}https://smartkubik.com${NC}"
echo -e "  Backend:  ${GREEN}https://api.smartkubik.com${NC}"
echo ""

# Quick Health Checks
echo -e "${YELLOW}🔍 Quick Health Checks:${NC}"

# Frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://smartkubik.com)
if [ "$FRONTEND_STATUS" == "200" ]; then
    echo -e "  Frontend: ${GREEN}✅ OK (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "  Frontend: ${RED}❌ ERROR (HTTP $FRONTEND_STATUS)${NC}"
fi

# Backend
BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://api.smartkubik.com/api/v1/health)
if [ "$BACKEND_STATUS" == "200" ]; then
    echo -e "  Backend:  ${GREEN}✅ OK (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "  Backend:  ${RED}❌ ERROR (HTTP $BACKEND_STATUS)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
