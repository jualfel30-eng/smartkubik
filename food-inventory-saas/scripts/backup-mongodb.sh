#!/bin/bash
# Script de backup de MongoDB antes de migración multi-ubicación
# Uso: ./scripts/backup-mongodb.sh [MONGO_URI]

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/pre-multi-location_${TIMESTAMP}"
MONGO_URI="${1:-mongodb://localhost:27017}"
DB_NAME="${2:-food-inventory}"

echo "=== SmartKubik MongoDB Backup ==="
echo "Timestamp: ${TIMESTAMP}"
echo "URI: ${MONGO_URI}"
echo "Database: ${DB_NAME}"
echo "Backup dir: ${BACKUP_DIR}"
echo ""

# Crear directorio de backup
mkdir -p "${BACKUP_DIR}"

# Ejecutar mongodump
echo "Ejecutando mongodump..."
mongodump \
  --uri="${MONGO_URI}" \
  --db="${DB_NAME}" \
  --out="${BACKUP_DIR}" \
  --gzip

echo ""
echo "=== Backup completado ==="
echo "Ubicación: ${BACKUP_DIR}"
echo ""
echo "Para restaurar:"
echo "  mongorestore --uri=\"${MONGO_URI}\" --db=\"${DB_NAME}\" --gzip \"${BACKUP_DIR}/${DB_NAME}\""
