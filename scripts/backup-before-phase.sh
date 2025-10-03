#!/bin/bash

# ========================================
# Backup Script - Before Phase Implementation
# ========================================
# Este script crea un backup completo antes de iniciar una fase
# Incluye: Base de datos, código crítico, package.json, estado de git

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📦 BACKUP SCRIPT - FASE PREPARATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Timestamp:${NC} ${TIMESTAMP}"
echo -e "${YELLOW}Backup directory:${NC} ${BACKUP_DIR}"
echo ""

# Create backup directory
echo -e "${BLUE}[1/6]${NC} Creating backup directory..."
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/code"
mkdir -p "${BACKUP_DIR}/configs"
echo -e "${GREEN}✓${NC} Directory created"
echo ""

# Backup MongoDB (if URI is set)
echo -e "${BLUE}[2/6]${NC} Backing up MongoDB database..."
cd "${PROJECT_ROOT}/food-inventory-saas"

if [ -f .env ]; then
    # Load MONGODB_URI from .env
    export $(grep -v '^#' .env | grep MONGODB_URI | xargs)

    if [ -n "$MONGODB_URI" ]; then
        echo -e "${YELLOW}Found MongoDB URI, creating backup...${NC}"

        # Check if mongodump is installed
        if command -v mongodump &> /dev/null; then
            mongodump --uri="$MONGODB_URI" --out="${BACKUP_DIR}/db" 2>&1 | sed 's/^/  /'
            echo -e "${GREEN}✓${NC} Database backed up successfully"
        else
            echo -e "${YELLOW}⚠${NC}  mongodump not found, skipping database backup"
            echo -e "${YELLOW}   Install: brew install mongodb-database-tools${NC}"
        fi
    else
        echo -e "${YELLOW}⚠${NC}  MONGODB_URI not found in .env, skipping database backup"
    fi
else
    echo -e "${YELLOW}⚠${NC}  .env file not found, skipping database backup"
fi
echo ""

# Backup critical code
echo -e "${BLUE}[3/6]${NC} Backing up critical code..."
cd "${PROJECT_ROOT}"

# Backend critical modules
if [ -d "food-inventory-saas/src/modules/orders" ]; then
    cp -r food-inventory-saas/src/modules/orders "${BACKUP_DIR}/code/"
    echo -e "  ${GREEN}✓${NC} orders module"
fi

if [ -d "food-inventory-saas/src/modules/analytics" ]; then
    cp -r food-inventory-saas/src/modules/analytics "${BACKUP_DIR}/code/"
    echo -e "  ${GREEN}✓${NC} analytics module"
fi

if [ -d "food-inventory-saas/src/modules/bank-accounts" ]; then
    cp -r food-inventory-saas/src/modules/bank-accounts "${BACKUP_DIR}/code/"
    echo -e "  ${GREEN}✓${NC} bank-accounts module"
fi

if [ -d "food-inventory-saas/src/modules/shifts" ]; then
    cp -r food-inventory-saas/src/modules/shifts "${BACKUP_DIR}/code/"
    echo -e "  ${GREEN}✓${NC} shifts module"
fi

if [ -d "food-inventory-saas/src/schemas" ]; then
    cp -r food-inventory-saas/src/schemas "${BACKUP_DIR}/code/"
    echo -e "  ${GREEN}✓${NC} schemas"
fi

echo -e "${GREEN}✓${NC} Code backup completed"
echo ""

# Backup configurations
echo -e "${BLUE}[4/6]${NC} Backing up configuration files..."

if [ -f "food-inventory-saas/package.json" ]; then
    cp food-inventory-saas/package.json "${BACKUP_DIR}/configs/backend-package.json"
    echo -e "  ${GREEN}✓${NC} backend package.json"
fi

if [ -f "food-inventory-saas/package-lock.json" ]; then
    cp food-inventory-saas/package-lock.json "${BACKUP_DIR}/configs/backend-package-lock.json"
    echo -e "  ${GREEN}✓${NC} backend package-lock.json"
fi

if [ -f "food-inventory-admin/package.json" ]; then
    cp food-inventory-admin/package.json "${BACKUP_DIR}/configs/frontend-package.json"
    echo -e "  ${GREEN}✓${NC} frontend package.json"
fi

if [ -f "food-inventory-admin/package-lock.json" ]; then
    cp food-inventory-admin/package-lock.json "${BACKUP_DIR}/configs/frontend-package-lock.json"
    echo -e "  ${GREEN}✓${NC} frontend package-lock.json"
fi

if [ -f "food-inventory-saas/.env" ]; then
    cp food-inventory-saas/.env "${BACKUP_DIR}/configs/backend.env"
    echo -e "  ${GREEN}✓${NC} backend .env"
fi

if [ -f "food-inventory-admin/.env" ]; then
    cp food-inventory-admin/.env "${BACKUP_DIR}/configs/frontend.env"
    echo -e "  ${GREEN}✓${NC} frontend .env"
fi

echo -e "${GREEN}✓${NC} Configurations backup completed"
echo ""

# Save git state
echo -e "${BLUE}[5/6]${NC} Saving git state..."
git log --oneline -n 20 > "${BACKUP_DIR}/git-log.txt" 2>&1
git status > "${BACKUP_DIR}/git-status.txt" 2>&1
git diff > "${BACKUP_DIR}/uncommitted-changes.diff" 2>&1 || true
git branch -a > "${BACKUP_DIR}/git-branches.txt" 2>&1
git tag -l > "${BACKUP_DIR}/git-tags.txt" 2>&1

echo -e "${GREEN}✓${NC} Git state saved"
echo ""

# Create backup info file
echo -e "${BLUE}[6/6]${NC} Creating backup info file..."
cat > "${BACKUP_DIR}/BACKUP_INFO.txt" << EOF
Backup Information
==================

Created: $(date '+%Y-%m-%d %H:%M:%S')
Timestamp: ${TIMESTAMP}
Backup Directory: ${BACKUP_DIR}

Contents:
---------
- Database: $([ -d "${BACKUP_DIR}/db" ] && [ "$(ls -A ${BACKUP_DIR}/db)" ] && echo "✓ Yes" || echo "✗ No")
- Code: $([ -d "${BACKUP_DIR}/code" ] && echo "✓ Yes" || echo "✗ No")
- Configs: $([ -d "${BACKUP_DIR}/configs" ] && echo "✓ Yes" || echo "✗ No")
- Git State: $([ -f "${BACKUP_DIR}/git-log.txt" ] && echo "✓ Yes" || echo "✗ No")

Git Information:
----------------
Current Branch: $(git rev-parse --abbrev-ref HEAD)
Last Commit: $(git log -1 --oneline)
Uncommitted Changes: $(git diff --stat | wc -l | tr -d ' ') files

To Restore This Backup:
-----------------------
1. Database: mongorestore --drop --uri="\$MONGODB_URI" ${BACKUP_DIR}/db
2. Code: cp -r ${BACKUP_DIR}/code/* food-inventory-saas/src/
3. Configs: cp ${BACKUP_DIR}/configs/* <destination>
4. Git: git diff ${BACKUP_DIR}/uncommitted-changes.diff

Notes:
------
- This backup was created before implementing a phase
- Keep this backup until the phase is validated in production
- Recommended retention: 30 days minimum

EOF

echo -e "${GREEN}✓${NC} Backup info file created"
echo ""

# Save backup path for easy rollback
echo "${BACKUP_DIR}" > "${PROJECT_ROOT}/.last-backup"

# Summary
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ BACKUP COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Backup Location:${NC} ${BACKUP_DIR}"
echo -e "${YELLOW}Backup Size:${NC} ${BACKUP_SIZE}"
echo -e "${YELLOW}Last Backup:${NC} ${PROJECT_ROOT}/.last-backup"
echo ""
echo -e "${BLUE}To restore this backup:${NC}"
echo -e "  cat ${BACKUP_DIR}/BACKUP_INFO.txt"
echo ""
echo -e "${GREEN}You can now safely proceed with the phase implementation.${NC}"
echo ""
