#!/bin/bash

# Script de despliegue para Food Inventory SaaS
# Este script actualiza tanto el backend como el frontend

echo "🚀 Iniciando proceso de despliegue..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para manejar errores
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

# 1. Git pull para obtener últimos cambios
echo -e "${YELLOW}📥 Obteniendo últimos cambios desde GitHub...${NC}"
git pull origin main || handle_error "Failed to pull from GitHub"

# 2. Actualizar backend
echo -e "${YELLOW}🔧 Actualizando backend (NestJS)...${NC}"
cd food-inventory-saas || handle_error "No se encontró el directorio food-inventory-saas"

# Instalar dependencias si package.json cambió
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo "📦 Instalando dependencias del backend..."
    npm install || handle_error "npm install falló en backend"
fi

# Compilar backend
echo "🔨 Compilando backend..."
npm run build || handle_error "Build falló en backend"

# Reiniciar servicio backend (PM2)
echo "♻️  Reiniciando servicio backend..."
pm2 restart food-inventory-backend || pm2 start dist/main.js --name food-inventory-backend

# 3. Actualizar frontend
echo -e "${YELLOW}🎨 Actualizando frontend (React)...${NC}"
cd ../food-inventory-admin || handle_error "No se encontró el directorio food-inventory-admin"

# Instalar dependencias si package.json cambió
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo "📦 Instalando dependencias del frontend..."
    npm install || handle_error "npm install falló en frontend"
fi

# Build frontend
echo "🔨 Compilando frontend..."
npm run build || handle_error "Build falló en frontend"

# 4. Verificar estado
cd ..
echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
echo ""
echo "Estado de los servicios:"
pm2 list

echo ""
echo -e "${GREEN}🎉 Aplicación actualizada y funcionando!${NC}"
