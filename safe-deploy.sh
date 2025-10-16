#!/bin/bash

# 🛡️ SCRIPT DE DEPLOY SEGURO - SmartKubik
# Este script hace deploy CON backup automático y rollback en caso de error
# Autor: Claude AI
# Fecha: 16 de Octubre 2025

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SERVER="deployer@178.156.182.177"
REPO_DIR="/home/deployer/smartkubik"
BACKEND_DIR="$REPO_DIR/food-inventory-saas"
FRONTEND_DIR="$REPO_DIR/food-inventory-admin"
BACKUP_DIR="/home/deployer/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/smartkubik-$TIMESTAMP"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 SmartKubik Safe Deploy Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Función para ejecutar comandos remotos
remote_exec() {
    ssh $SERVER "$1"
}

# Función de rollback
rollback() {
    log_error "Deploy falló. Iniciando rollback automático..."

    log_info "Deteniendo PM2..."
    remote_exec "pm2 delete all" || true

    log_info "Restaurando código desde backup..."
    remote_exec "rm -rf $REPO_DIR && cp -r $BACKUP_PATH $REPO_DIR"

    log_info "Restaurando PM2..."
    remote_exec "cp $BACKUP_PATH/.pm2-dump.pm2 ~/.pm2/dump.pm2" || true

    log_info "Reiniciando aplicación..."
    remote_exec "cd $BACKEND_DIR && pm2 start ecosystem.config.js"
    remote_exec "pm2 save"

    log_success "Rollback completado. Sistema restaurado al estado anterior."
    exit 1
}

# Trap para ejecutar rollback en caso de error
trap rollback ERR

# ============================================================
# PASO 1: VERIFICACIONES INICIALES
# ============================================================

log_info "Verificando conexión al servidor..."
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'OK'" > /dev/null 2>&1; then
    log_error "No se puede conectar al servidor"
    exit 1
fi
log_success "Conexión establecida"

log_info "Verificando que el backend esté corriendo..."
CURRENT_STATUS=$(remote_exec "pm2 status smartkubik-api --no-color | grep smartkubik-api | awk '{print \$10}'")
if [[ "$CURRENT_STATUS" != "online" ]]; then
    log_warning "Backend no está corriendo. Estado actual: $CURRENT_STATUS"
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
log_success "Backend está corriendo"

# ============================================================
# PASO 2: CREAR BACKUP
# ============================================================

log_info "Creando backup del código actual..."
remote_exec "mkdir -p $BACKUP_DIR"

log_info "Copiando código..."
remote_exec "cp -r $REPO_DIR $BACKUP_PATH"

log_info "Guardando estado de PM2..."
remote_exec "pm2 save"
remote_exec "cp ~/.pm2/dump.pm2 $BACKUP_PATH/.pm2-dump.pm2"

BACKUP_SIZE=$(remote_exec "du -sh $BACKUP_PATH | cut -f1")
log_success "Backup creado: $BACKUP_PATH ($BACKUP_SIZE)"

# ============================================================
# PASO 3: ACTUALIZAR CÓDIGO DESDE GITHUB
# ============================================================

log_info "Obteniendo código más reciente desde GitHub..."

# Asegurar que el remote use HTTPS (no SSH)
log_info "Configurando remote para usar HTTPS..."
remote_exec "cd $REPO_DIR && git remote set-url origin https://github.com/jualfel30-eng/smartkubik.git"

# Fetch desde origin
remote_exec "cd $REPO_DIR && git fetch origin" || {
    log_error "No se pudo hacer fetch desde GitHub. Verifica tu conexión a internet."
    log_info "Intentando continuar con el código local..."
}

CURRENT_COMMIT=$(remote_exec "cd $REPO_DIR && git rev-parse HEAD")
LATEST_COMMIT=$(remote_exec "cd $REPO_DIR && git rev-parse origin/main" 2>/dev/null || echo "$CURRENT_COMMIT")

if [ "$CURRENT_COMMIT" == "$LATEST_COMMIT" ]; then
    log_warning "No hay cambios nuevos en GitHub (o no se pudo verificar)"
    read -p "¿Continuar con re-deploy de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deploy cancelado"
        exit 0
    fi
else
    log_info "Hay cambios nuevos disponibles"
fi

log_info "Haciendo pull..."
remote_exec "cd $REPO_DIR && git pull origin main" || {
    log_warning "Pull falló, usando código local existente"
}
log_success "Código actualizado"

# ============================================================
# PASO 4: COMPILAR BACKEND
# ============================================================

log_info "Compilando backend..."

log_info "Instalando dependencias del backend..."
remote_exec "cd $BACKEND_DIR && npm ci" || {
    log_error "Falló npm ci del backend"
    rollback
}

log_info "Compilando código del backend..."
remote_exec "cd $BACKEND_DIR && npm run build" || {
    log_error "Falló compilación del backend"
    rollback
}

log_info "Verificando que dist/main.js existe..."
if ! remote_exec "test -f $BACKEND_DIR/dist/main.js"; then
    log_error "dist/main.js no existe después de compilar"
    rollback
fi

log_success "Backend compilado exitosamente"

# ============================================================
# PASO 5: COMPILAR FRONTEND
# ============================================================

log_info "Compilando frontend..."

log_info "Instalando dependencias del frontend..."
remote_exec "cd $FRONTEND_DIR && npm ci" || {
    log_error "Falló npm ci del frontend"
    rollback
}

log_info "Compilando código del frontend..."
remote_exec "cd $FRONTEND_DIR && npm run build" || {
    log_error "Falló compilación del frontend"
    rollback
}

log_info "Verificando que dist/index.html existe..."
if ! remote_exec "test -f $FRONTEND_DIR/dist/index.html"; then
    log_error "dist/index.html no existe después de compilar"
    rollback
}

log_info "Arreglando permisos del frontend..."
remote_exec "sudo chmod -R 755 $FRONTEND_DIR/dist"

log_success "Frontend compilado exitosamente"

# ============================================================
# PASO 6: REINICIAR BACKEND (SIN DOWNTIME)
# ============================================================

log_info "Reiniciando backend con PM2 (reload sin downtime)..."

remote_exec "cd $BACKEND_DIR && pm2 reload smartkubik-api" || {
    log_error "Falló reinicio de PM2"
    rollback
}

log_info "Guardando configuración de PM2..."
remote_exec "pm2 save"

log_success "Backend reiniciado"

# ============================================================
# PASO 7: VERIFICAR QUE TODO FUNCIONA
# ============================================================

log_info "Esperando 5 segundos para que el backend inicie..."
sleep 5

log_info "Verificando health check del backend..."
HEALTH_CHECK=$(remote_exec "curl -s http://localhost:3000/api/v1/health | grep -o '\"status\":\"healthy\"' || echo 'FAILED'")

if [[ "$HEALTH_CHECK" == *"FAILED"* ]]; then
    log_error "Health check falló"
    log_error "Respuesta: $(remote_exec 'curl -s http://localhost:3000/api/v1/health')"
    rollback
fi

log_success "Health check OK"

log_info "Verificando que frontend responde..."
FRONTEND_CHECK=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost")

if [[ "$FRONTEND_CHECK" != "200" ]]; then
    log_error "Frontend no responde (HTTP $FRONTEND_CHECK)"
    rollback
fi

log_success "Frontend OK"

log_info "Verificando PM2 status..."
PM2_STATUS=$(remote_exec "pm2 status smartkubik-api --no-color | grep smartkubik-api | awk '{print \$10}'")

if [[ "$PM2_STATUS" != "online" ]]; then
    log_error "PM2 status no es 'online': $PM2_STATUS"
    remote_exec "pm2 logs smartkubik-api --lines 50 --nostream"
    rollback
fi

log_success "PM2 status: online"

# ============================================================
# PASO 8: LIMPIEZA Y RESUMEN
# ============================================================

log_info "Limpiando backups antiguos (más de 7 días)..."
remote_exec "find $BACKUP_DIR -mtime +7 -type d -name 'smartkubik-*' -exec rm -rf {} + 2>/dev/null || true"

REMAINING_BACKUPS=$(remote_exec "ls -1 $BACKUP_DIR | wc -l")
log_success "Backups restantes: $REMAINING_BACKUPS"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOY EXITOSO${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "  • Backend: https://api.smartkubik.com"
echo -e "  • Frontend: https://smartkubik.com"
echo -e "  • Backup guardado en: $BACKUP_PATH"
echo -e "  • Commit actual: $(remote_exec 'cd /home/deployer/smartkubik && git rev-parse --short HEAD')"
echo ""
echo -e "${BLUE}🔍 Comandos útiles:${NC}"
echo -e "  • Ver logs: ${YELLOW}ssh $SERVER 'pm2 logs smartkubik-api'${NC}"
echo -e "  • Ver status: ${YELLOW}ssh $SERVER 'pm2 status'${NC}"
echo -e "  • Health check: ${YELLOW}curl https://api.smartkubik.com/api/v1/health${NC}"
echo ""
echo -e "${GREEN}🎉 Tu aplicación está en producción!${NC}"
echo ""
