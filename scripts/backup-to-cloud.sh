#!/bin/bash

# ========================================
# Cloud Backup Script - Upload to S3/Cloud Storage
# ========================================
# Este script sube backups automáticamente a la nube
# Soporta: AWS S3, Backblaze B2, Wasabi

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
CLOUD_PROVIDER="${CLOUD_PROVIDER:-s3}"  # s3, b2, wasabi, gcs
BUCKET_NAME="${BUCKET_NAME:-your-backup-bucket}"
LOG_FILE="${BACKUP_ROOT}/cloud-upload.log"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "☁️  CLOUD BACKUP UPLOAD STARTED"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que existan backups locales
if [ ! -d "$BACKUP_ROOT" ]; then
    log "❌ ERROR: No backups found at $BACKUP_ROOT"
    exit 1
fi

# Función para subir a AWS S3
upload_to_s3() {
    local backup_dir=$1
    local backup_name=$(basename "$backup_dir")

    log "📤 Uploading to AWS S3: s3://${BUCKET_NAME}/${backup_name}"

    if command -v aws &> /dev/null; then
        # Comprimir backup primero
        log "📦 Compressing backup..."
        tar -czf "${backup_dir}.tar.gz" -C "$(dirname "$backup_dir")" "$backup_name"

        # Subir a S3
        if aws s3 cp "${backup_dir}.tar.gz" "s3://${BUCKET_NAME}/${backup_name}.tar.gz" --storage-class STANDARD_IA; then
            log "✅ Successfully uploaded to S3"
            rm "${backup_dir}.tar.gz"  # Eliminar archivo comprimido local
        else
            log "❌ Failed to upload to S3"
            rm "${backup_dir}.tar.gz"
            return 1
        fi
    else
        log "❌ AWS CLI not installed. Install: brew install awscli"
        log "   Then configure: aws configure"
        return 1
    fi
}

# Función para subir a Backblaze B2
upload_to_b2() {
    local backup_dir=$1
    local backup_name=$(basename "$backup_dir")

    log "📤 Uploading to Backblaze B2: ${BUCKET_NAME}/${backup_name}"

    if command -v b2 &> /dev/null; then
        tar -czf "${backup_dir}.tar.gz" -C "$(dirname "$backup_dir")" "$backup_name"

        if b2 upload-file "${BUCKET_NAME}" "${backup_dir}.tar.gz" "${backup_name}.tar.gz"; then
            log "✅ Successfully uploaded to B2"
            rm "${backup_dir}.tar.gz"
        else
            log "❌ Failed to upload to B2"
            rm "${backup_dir}.tar.gz"
            return 1
        fi
    else
        log "❌ B2 CLI not installed. Install: brew install b2-tools"
        return 1
    fi
}

# Función para sincronizar con rclone (Google Drive, Dropbox, etc.)
upload_to_rclone() {
    local backup_dir=$1
    local backup_name=$(basename "$backup_dir")
    local remote_name="${RCLONE_REMOTE:-gdrive}"  # gdrive, dropbox, onedrive

    log "📤 Uploading to ${remote_name}: ${backup_name}"

    if command -v rclone &> /dev/null; then
        if rclone copy "$backup_dir" "${remote_name}:backups/${backup_name}" --progress; then
            log "✅ Successfully uploaded to ${remote_name}"
        else
            log "❌ Failed to upload to ${remote_name}"
            return 1
        fi
    else
        log "❌ rclone not installed. Install: brew install rclone"
        log "   Then configure: rclone config"
        return 1
    fi
}

# Obtener el backup más reciente
LATEST_BACKUP=$(ls -td ${BACKUP_ROOT}/*/ 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ No backups found to upload"
    exit 1
fi

log "📂 Latest backup: $(basename "$LATEST_BACKUP")"

# Subir según el proveedor configurado
case $CLOUD_PROVIDER in
    s3|aws)
        upload_to_s3 "$LATEST_BACKUP"
        ;;
    b2|backblaze)
        upload_to_b2 "$LATEST_BACKUP"
        ;;
    rclone|gdrive|dropbox)
        upload_to_rclone "$LATEST_BACKUP"
        ;;
    *)
        log "❌ Unknown cloud provider: $CLOUD_PROVIDER"
        log "   Supported: s3, b2, rclone"
        exit 1
        ;;
esac

# Limpiar backups viejos en la nube (mantener últimos 30)
log "🗑️  Cleaning old cloud backups..."

if [ "$CLOUD_PROVIDER" = "s3" ] && command -v aws &> /dev/null; then
    # Listar y eliminar backups más antiguos de 30 días
    aws s3 ls "s3://${BUCKET_NAME}/" | while read -r line; do
        file_date=$(echo "$line" | awk '{print $1}')
        file_name=$(echo "$line" | awk '{print $4}')

        if [ ! -z "$file_name" ]; then
            file_age_days=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))

            if [ $file_age_days -gt 30 ]; then
                log "  Deleting old backup: $file_name (${file_age_days} days old)"
                aws s3 rm "s3://${BUCKET_NAME}/${file_name}"
            fi
        fi
    done 2>/dev/null || true
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ CLOUD BACKUP UPLOAD COMPLETED"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
