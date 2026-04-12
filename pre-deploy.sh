#!/bin/bash

# 🔧 PRE-DEPLOY - Ensure all dependencies are installed before deploying
# This script prepares your local environment and then runs the deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_LOCAL="./food-inventory-saas"
FRONTEND_LOCAL="./food-inventory-admin"
STOREFRONT_LOCAL="./food-inventory-storefront"
RESTAURANT_STOREFRONT_LOCAL="./restaurant-storefront"
BLOG_LOCAL="./smartkubik-blog/frontend"
ROOT_DIR=$(pwd)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 SmartKubik PRE-DEPLOY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check if directories exist
if [ ! -d "$BACKEND_LOCAL" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_LOCAL${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_LOCAL" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_LOCAL${NC}"
    exit 1
fi

if [ ! -d "$STOREFRONT_LOCAL" ]; then
    echo -e "${RED}❌ Storefront directory not found: $STOREFRONT_LOCAL${NC}"
    exit 1
fi

if [ ! -d "$BLOG_LOCAL" ]; then
    echo -e "${RED}❌ Blog directory not found: $BLOG_LOCAL${NC}"
    exit 1
fi

# Step 2: Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd $BACKEND_LOCAL

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in backend${NC}"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend dependencies installed${NC}"
cd ..

# Step 3: Install frontend dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd $FRONTEND_LOCAL

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in frontend${NC}"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
cd ..

# Step 3.5: Install storefront dependencies (general)
echo -e "${YELLOW}📦 Installing storefront dependencies...${NC}"
cd $STOREFRONT_LOCAL

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in storefront${NC}"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Storefront dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Storefront dependencies installed${NC}"
cd ..

# Step 3.55: Install restaurant storefront dependencies
echo -e "${YELLOW}📦 Installing restaurant storefront dependencies...${NC}"
cd $RESTAURANT_STOREFRONT_LOCAL

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in restaurant storefront${NC}"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Restaurant storefront dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Restaurant storefront dependencies installed${NC}"
cd ..

# Step 3.6: Install blog dependencies
echo -e "${YELLOW}📦 Installing blog dependencies...${NC}"
cd $BLOG_LOCAL

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in blog${NC}"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Blog dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Blog dependencies installed${NC}"
cd "$ROOT_DIR"

# Step 4: Verify installations
echo ""
echo -e "${YELLOW}🔍 Verifying installations...${NC}"

cd "$ROOT_DIR/$BACKEND_LOCAL"
if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend dependencies verification failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend dependencies verified${NC}"
cd "$ROOT_DIR"

cd "$ROOT_DIR/$FRONTEND_LOCAL"
if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend dependencies verification failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend dependencies verified${NC}"
cd "$ROOT_DIR"

cd "$ROOT_DIR/$STOREFRONT_LOCAL"
if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ Storefront dependencies verification failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Storefront dependencies verified${NC}"
cd "$ROOT_DIR"

cd "$ROOT_DIR/$RESTAURANT_STOREFRONT_LOCAL"
if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ Restaurant storefront dependencies verification failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Restaurant storefront dependencies verified${NC}"
cd "$ROOT_DIR"

cd "$ROOT_DIR/$BLOG_LOCAL"
if ! npm ls --depth=0 > /dev/null 2>&1; then
    echo -e "${RED}❌ Blog dependencies verification failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Blog dependencies verified${NC}"
cd "$ROOT_DIR"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ PRE-DEPLOY COMPLETE - Dependencies ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 5: Ask if user wants to proceed with deployment
echo -e "${BLUE}🚀 Ready to deploy!${NC}"
echo ""
read -p "$(echo -e ${YELLOW}Do you want to proceed with deployment now? [Y/n]: ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo -e "${BLUE}🚀 Starting deployment...${NC}"
    echo ""
    ./simple-deploy.sh
else
    echo ""
    echo -e "${YELLOW}⏸️  Deployment cancelled. Run './simple-deploy.sh' when ready.${NC}"
    echo ""
fi
