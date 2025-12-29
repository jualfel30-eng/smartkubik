#!/bin/bash

# ========================================
# Setup Automated Backups with Cron
# ========================================
# Este script configura cron para ejecutar backups automáticos

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_ROOT}/scripts/auto-backup-daily.sh"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ⚙️  AUTOMATED BACKUPS SETUP${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que el script de backup existe
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Backup script not found at ${BACKUP_SCRIPT}${NC}"
    exit 1
fi

# Verificar que el script sea ejecutable
if [ ! -x "$BACKUP_SCRIPT" ]; then
    echo -e "${YELLOW}Making backup script executable...${NC}"
    chmod +x "$BACKUP_SCRIPT"
fi

echo -e "${YELLOW}Select backup frequency:${NC}"
echo ""
echo "  ${GREEN}1${NC} - Daily at 2:00 AM (Recommended)"
echo "  ${GREEN}2${NC} - Every 12 hours (2:00 AM and 2:00 PM)"
echo "  ${GREEN}3${NC} - Every 6 hours"
echo "  ${GREEN}4${NC} - Every hour"
echo "  ${GREEN}5${NC} - Custom schedule"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="Every 12 hours (2:00 AM and 2:00 PM)"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Every 6 hours"
        ;;
    4)
        CRON_SCHEDULE="0 * * * *"
        DESCRIPTION="Every hour"
        ;;
    5)
        echo ""
        echo -e "${YELLOW}Enter custom cron schedule (e.g., '0 3 * * *' for 3:00 AM daily):${NC}"
        read -p "Cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom: ${CRON_SCHEDULE}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}Selected schedule:${NC} ${DESCRIPTION}"
echo -e "${YELLOW}Cron expression:${NC} ${CRON_SCHEDULE}"
echo ""

# Crear la línea de cron
CRON_JOB="${CRON_SCHEDULE} ${BACKUP_SCRIPT} >> ${PROJECT_ROOT}/backups/automated/backup.log 2>&1"

# Verificar si ya existe un cron job para este script
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "${BACKUP_SCRIPT}" || true)

if [ -n "$EXISTING_CRON" ]; then
    echo -e "${YELLOW}⚠️  Existing backup cron job found:${NC}"
    echo "  $EXISTING_CRON"
    echo ""
    read -p "Do you want to replace it? (yes/no): " replace

    if [ "$replace" != "yes" ]; then
        echo -e "${YELLOW}Setup cancelled.${NC}"
        exit 0
    fi

    # Eliminar el cron job existente
    crontab -l 2>/dev/null | grep -vF "${BACKUP_SCRIPT}" | crontab -
    echo -e "${GREEN}✓${NC} Old cron job removed"
fi

# Agregar el nuevo cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ AUTOMATED BACKUPS CONFIGURED SUCCESSFULLY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Schedule:${NC} ${DESCRIPTION}"
echo -e "${YELLOW}Script:${NC} ${BACKUP_SCRIPT}"
echo -e "${YELLOW}Logs:${NC} ${PROJECT_ROOT}/backups/automated/backup.log"
echo ""
echo -e "${BLUE}Current cron jobs:${NC}"
crontab -l 2>/dev/null | grep -vE '^#|^$' || echo "  (none)"
echo ""
echo -e "${YELLOW}To view backup logs:${NC}"
echo -e "  tail -f ${PROJECT_ROOT}/backups/automated/backup.log"
echo ""
echo -e "${YELLOW}To manually run a backup:${NC}"
echo -e "  ${BACKUP_SCRIPT}"
echo ""
echo -e "${YELLOW}To remove automated backups:${NC}"
echo -e "  crontab -e  # Then delete the line with ${BACKUP_SCRIPT}"
echo ""
