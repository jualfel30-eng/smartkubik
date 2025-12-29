#!/bin/bash

# ========================================
# Google Drive Backup Script
# ========================================
# Sube backups automáticamente a Google Drive usando rclone
# Gratis hasta 15GB

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${PROJECT_ROOT}/backups/automated"
GDRIVE_REMOTE="smartkubik-drive"  # Nombre que le darás en rclone config
GDRIVE_FOLDER="MongoDB-Backups"
LOG_FILE="${BACKUP_ROOT}/gdrive-upload.log"
MAX_BACKUPS_CLOUD=30  # Mantener solo 30 backups en Drive

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "☁️  GOOGLE DRIVE BACKUP UPLOAD"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que rclone esté instalado
if ! command -v rclone &> /dev/null; then
    log "❌ rclone not installed"
    echo ""
    echo -e "${YELLOW}Installing rclone...${NC}"
    echo ""

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install rclone
        else
            log "❌ Homebrew not found. Install from: https://brew.sh"
            exit 1
        fi
    else
        # Linux
        curl https://rclone.org/install.sh | sudo bash
    fi

    log "✅ rclone installed"
fi

# Verificar configuración de rclone
if ! rclone listremotes | grep -q "^${GDRIVE_REMOTE}:"; then
    log "❌ Google Drive not configured in rclone"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  🔧 CONFIGURACIÓN INICIAL DE GOOGLE DRIVE${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Sigue estos pasos:${NC}"
    echo ""
    echo "1. Ejecuta: ${BLUE}rclone config${NC}"
    echo "2. Escribe: ${BLUE}n${NC} (nuevo remote)"
    echo "3. Nombre: ${BLUE}${GDRIVE_REMOTE}${NC}"
    echo "4. Tipo: ${BLUE}drive${NC} (Google Drive)"
    echo "5. Client ID: ${BLUE}[Enter]${NC} (dejar en blanco)"
    echo "6. Client Secret: ${BLUE}[Enter]${NC} (dejar en blanco)"
    echo "7. Scope: ${BLUE}1${NC} (Full access)"
    echo "8. Root folder: ${BLUE}[Enter]${NC} (dejar en blanco)"
    echo "9. Service Account: ${BLUE}[Enter]${NC} (dejar en blanco)"
    echo "10. Auto config: ${BLUE}y${NC} (yes)"
    echo "11. Se abrirá navegador → Inicia sesión con ${GREEN}smartkubik@gmail.com${NC}"
    echo "12. Team Drive: ${BLUE}n${NC} (no)"
    echo "13. Confirma: ${BLUE}y${NC} (yes)"
    echo "14. Quit: ${BLUE}q${NC}"
    echo ""
    echo -e "${YELLOW}Después de configurar, ejecuta este script de nuevo.${NC}"
    echo ""

    # Ejecutar rclone config
    rclone config

    exit 0
fi

log "✅ Google Drive configured: ${GDRIVE_REMOTE}"

# Verificar que existan backups locales
if [ ! -d "$BACKUP_ROOT" ]; then
    log "❌ No backups found at $BACKUP_ROOT"
    exit 1
fi

# Obtener el backup más reciente
LATEST_BACKUP=$(ls -td ${BACKUP_ROOT}/*/ 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ No backups found to upload"
    exit 1
fi

BACKUP_NAME=$(basename "$LATEST_BACKUP")
log "📂 Latest backup: $BACKUP_NAME"

# Comprimir el backup antes de subir
TEMP_FILE="/tmp/${BACKUP_NAME}.tar.gz"
log "📦 Compressing backup..."

if tar -czf "$TEMP_FILE" -C "$BACKUP_ROOT" "$BACKUP_NAME"; then
    COMPRESSED_SIZE=$(du -h "$TEMP_FILE" | cut -f1)
    log "✅ Compressed: $COMPRESSED_SIZE"
else
    log "❌ Failed to compress backup"
    exit 1
fi

# Subir a Google Drive
log "📤 Uploading to Google Drive..."
log "   Destination: ${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/"

if rclone copy "$TEMP_FILE" "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" --progress --stats 5s; then
    log "✅ Successfully uploaded to Google Drive"
    rm "$TEMP_FILE"
else
    log "❌ Failed to upload to Google Drive"
    rm "$TEMP_FILE"
    exit 1
fi

# Verificar espacio usado en Drive
log ""
log "📊 Google Drive Status:"
DRIVE_ABOUT=$(rclone about "${GDRIVE_REMOTE}:" --json 2>/dev/null || echo '{}')

if [ "$DRIVE_ABOUT" != "{}" ]; then
    # Extraer información usando grep y awk (sin jq)
    USED=$(echo "$DRIVE_ABOUT" | grep -o '"used":[^,]*' | cut -d':' -f2 | tr -d ' ')
    TOTAL=$(echo "$DRIVE_ABOUT" | grep -o '"total":[^,]*' | cut -d':' -f2 | tr -d ' ')
    FREE=$(echo "$DRIVE_ABOUT" | grep -o '"free":[^,]*' | cut -d':' -f2 | tr -d ' ')

    if [ ! -z "$USED" ] && [ ! -z "$TOTAL" ]; then
        USED_GB=$(echo "scale=2; $USED / 1073741824" | bc)
        TOTAL_GB=$(echo "scale=2; $TOTAL / 1073741824" | bc)
        FREE_GB=$(echo "scale=2; $FREE / 1073741824" | bc)
        PERCENT=$(echo "scale=1; $USED * 100 / $TOTAL" | bc)

        log "   Used: ${USED_GB}GB / ${TOTAL_GB}GB (${PERCENT}%)"
        log "   Free: ${FREE_GB}GB"

        # Advertencia si queda poco espacio
        if (( $(echo "$PERCENT > 80" | bc -l) )); then
            log "⚠️  WARNING: Google Drive is over 80% full!"
            log "   Consider cleaning old backups or upgrading storage"
        fi
    fi
fi

# Limpiar backups viejos en Drive (mantener solo los últimos MAX_BACKUPS_CLOUD)
log ""
log "🗑️  Cleaning old backups in Google Drive..."
log "   Keeping last ${MAX_BACKUPS_CLOUD} backups"

# Listar archivos en Drive ordenados por fecha
BACKUP_FILES=$(rclone lsf "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" --format "tp" 2>/dev/null || echo "")

if [ ! -z "$BACKUP_FILES" ]; then
    BACKUP_COUNT=$(echo "$BACKUP_FILES" | wc -l | tr -d ' ')
    log "   Found ${BACKUP_COUNT} backups in Drive"

    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS_CLOUD" ]; then
        BACKUPS_TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS_CLOUD))
        log "   Deleting ${BACKUPS_TO_DELETE} oldest backups..."

        # Obtener lista ordenada por fecha (más antiguos primero)
        OLD_BACKUPS=$(echo "$BACKUP_FILES" | sort | head -n $BACKUPS_TO_DELETE | awk '{print $2}')

        while IFS= read -r old_backup; do
            if [ ! -z "$old_backup" ]; then
                log "     Deleting: $old_backup"
                rclone delete "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${old_backup}" 2>/dev/null || true
            fi
        done <<< "$OLD_BACKUPS"

        log "   ✅ Old backups cleaned"
    else
        log "   No cleanup needed"
    fi
fi

# Listar backups actuales en Drive
log ""
log "📋 Current backups in Google Drive:"
rclone ls "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" | tail -n 5 | awk '{printf "   %s (%s)\n", $2, $1}'

log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ GOOGLE DRIVE BACKUP COMPLETED"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""

exit 0
