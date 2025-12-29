#!/bin/bash

# ========================================
# Automated Daily Backup Script
# ========================================
# Este script crea backups automáticos diarios de MongoDB
# Mantiene los últimos 7 backups y elimina los más antiguos

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${PROJECT_ROOT}/backups/automated"
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
LOG_FILE="${BACKUP_ROOT}/backup.log"
MAX_BACKUPS=7  # Mantener los últimos 7 backups

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_ROOT}"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📦 AUTOMATED BACKUP STARTED"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Timestamp: ${TIMESTAMP}"
log "Backup directory: ${BACKUP_DIR}"

# Crear directorio de backup
mkdir -p "${BACKUP_DIR}"

# Cargar MongoDB URI desde .env
cd "${PROJECT_ROOT}/food-inventory-saas"

if [ ! -f .env ]; then
    log "❌ ERROR: .env file not found"
    exit 1
fi

export $(grep -v '^#' .env | grep MONGODB_URI | xargs)

if [ -z "$MONGODB_URI" ]; then
    log "❌ ERROR: MONGODB_URI not found in .env"
    exit 1
fi

# Verificar que mongodump esté instalado
if ! command -v mongodump &> /dev/null; then
    log "❌ ERROR: mongodump not found. Install: brew install mongodb-database-tools"
    exit 1
fi

# Realizar backup de MongoDB
log "📥 Starting MongoDB backup..."

if mongodump --uri="$MONGODB_URI" --out="${BACKUP_DIR}" 2>&1 | tee -a "${LOG_FILE}"; then
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
    log "✅ Backup completed successfully"
    log "📊 Backup size: ${BACKUP_SIZE}"
else
    log "❌ ERROR: Backup failed"
    exit 1
fi

# Crear archivo de información del backup
cat > "${BACKUP_DIR}/BACKUP_INFO.txt" << EOF
Automated Backup Information
============================

Created: $(date '+%Y-%m-%d %H:%M:%S')
Timestamp: ${TIMESTAMP}
Backup Directory: ${BACKUP_DIR}
Database Size: ${BACKUP_SIZE}

Restore Command:
----------------
mongorestore --uri="\$MONGODB_URI" --drop "${BACKUP_DIR}"

Notes:
------
- This is an automated backup
- Backups are kept for ${MAX_BACKUPS} days
- Older backups are automatically deleted

EOF

# Limpiar backups antiguos (mantener solo los últimos MAX_BACKUPS)
log "🗑️  Cleaning old backups (keeping last ${MAX_BACKUPS})..."

BACKUP_COUNT=$(ls -1d ${BACKUP_ROOT}/*/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    BACKUPS_TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS))
    log "Found ${BACKUP_COUNT} backups, deleting ${BACKUPS_TO_DELETE} oldest..."

    ls -1dt ${BACKUP_ROOT}/*/ | tail -n ${BACKUPS_TO_DELETE} | while read old_backup; do
        log "  Deleting: $(basename ${old_backup})"
        rm -rf "${old_backup}"
    done

    log "✅ Old backups cleaned"
else
    log "Only ${BACKUP_COUNT} backups found, no cleanup needed"
fi

# Resumen final
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ AUTOMATED BACKUP COMPLETED SUCCESSFULLY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Backup Location: ${BACKUP_DIR}"
log "Backup Size: ${BACKUP_SIZE}"
log "Total Backups: $(ls -1d ${BACKUP_ROOT}/*/ 2>/dev/null | wc -l | tr -d ' ')"
log ""

exit 0
