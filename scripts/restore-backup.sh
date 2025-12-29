#!/bin/bash

# ========================================
# Restore Script - MongoDB Backup Recovery
# ========================================
# Este script restaura un backup de MongoDB desde los backups locales

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

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔄 MONGODB BACKUP RESTORE SCRIPT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if mongorestore is installed
if ! command -v mongorestore &> /dev/null; then
    echo -e "${RED}❌ Error: mongorestore not found${NC}"
    echo -e "${YELLOW}Install MongoDB Database Tools:${NC}"
    echo -e "  brew install mongodb-database-tools"
    exit 1
fi

# Load MongoDB URI from .env
cd "${PROJECT_ROOT}/food-inventory-saas"
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

export $(grep -v '^#' .env | grep MONGODB_URI | xargs)

if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ Error: MONGODB_URI not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} MongoDB URI loaded from .env"
echo ""

# List available backups
echo -e "${BLUE}Available backups:${NC}"
echo ""
ls -lhrt "${BACKUP_ROOT}" | tail -n +2 | awk '{print "  " NR ". " $9 " (" $6 " " $7 " " $8 ")"}'
echo ""

# Show backup selection options
echo -e "${YELLOW}Select a backup to restore:${NC}"
echo -e "  ${GREEN}1${NC} - Latest backup (${YELLOW}2025-11-15T21-55-50${NC})"
echo -e "  ${GREEN}2${NC} - Previous backup (${YELLOW}2025-11-15T21-40-24${NC})"
echo -e "  ${GREEN}3${NC} - Variant migration backup (${YELLOW}backup-before-variant-migration-20251020-194713${NC})"
echo -e "  ${GREEN}4${NC} - Custom path"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        BACKUP_DIR="${BACKUP_ROOT}/2025-11-15T21-55-50/test"
        ;;
    2)
        BACKUP_DIR="${BACKUP_ROOT}/2025-11-15T21-40-24"
        ;;
    3)
        BACKUP_DIR="${PROJECT_ROOT}/food-inventory-saas/backups/backup-before-variant-migration-20251020-194713/food-inventory-saas"
        ;;
    4)
        read -p "Enter full path to backup directory: " BACKUP_DIR
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Verify backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Error: Backup directory not found: ${BACKUP_DIR}${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Selected backup:${NC} ${BACKUP_DIR}"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will REPLACE all data in your MongoDB database!${NC}"
echo -e "${RED}   Current database will be dropped and replaced with the backup.${NC}"
echo ""
read -p "Are you absolutely sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}[1/2]${NC} Starting MongoDB restore..."
echo -e "${YELLOW}This may take several minutes depending on backup size...${NC}"
echo ""

# Restore the backup
mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_DIR" 2>&1 | sed 's/^/  /'

echo ""
echo -e "${GREEN}✓${NC} Restore completed"
echo ""

# Verify restore
echo -e "${BLUE}[2/2]${NC} Verifying restore..."
echo ""

# Connect to MongoDB and show collection counts
node << 'EOF'
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;

async function verify() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();

    console.log('\x1b[32m✓\x1b[0m Collections restored:');
    console.log('');

    for (const col of collections.slice(0, 10)) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    if (collections.length > 10) {
      console.log(`  ... and ${collections.length - 10} more collections`);
    }

    console.log('');
    console.log(`\x1b[33mTotal collections:\x1b[0m ${collections.length}`);

  } catch (error) {
    console.error('\x1b[31m❌ Verification failed:\x1b[0m', error.message);
  } finally {
    await client.close();
  }
}

verify();
EOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ RESTORE COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Restart your backend server"
echo -e "  2. Clear browser cache and refresh frontend"
echo -e "  3. Verify data in your application"
echo ""
