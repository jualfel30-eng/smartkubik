#!/bin/bash

# Script para actualizar el .env del servidor de forma SEGURA
# Este script SOLO actualiza las variables críticas sin borrar las existentes

echo "🔧 Actualizando variables de entorno en el servidor..."

ssh root@66.135.27.185 << 'ENDSSH'
cd /home/ubuntu/smartkubik/food-inventory-saas

# Backup del .env actual
echo "📦 Creando backup del .env actual..."
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# Actualizar variables críticas usando sed
echo "🔧 Actualizando variables críticas..."

# NODE_ENV
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env

# PORT
sed -i 's/^PORT=.*/PORT=3000/' .env

# CORS_ORIGIN
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://smartkubik.com,https://api.smartkubik.com|' .env

# GOOGLE_CALLBACK_URL
sed -i 's|^GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=https://api.smartkubik.com/api/v1/auth/google/callback|' .env

# Agregar ENABLE_MULTI_TENANT_LOGIN si no existe
if ! grep -q "ENABLE_MULTI_TENANT_LOGIN" .env; then
  echo "" >> .env
  echo "# Multi-Tenant Login" >> .env
  echo "ENABLE_MULTI_TENANT_LOGIN=true" >> .env
else
  sed -i 's/^ENABLE_MULTI_TENANT_LOGIN=.*/ENABLE_MULTI_TENANT_LOGIN=true/' .env
fi

# Agregar FRONTEND_URL si no existe
if ! grep -q "FRONTEND_URL" .env; then
  echo "FRONTEND_URL=https://smartkubik.com" >> .env
else
  sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://smartkubik.com|' .env
fi

echo "✅ Variables actualizadas. Mostrando cambios:"
echo ""
echo "NODE_ENV: $(grep NODE_ENV .env)"
echo "PORT: $(grep PORT .env)"
echo "ENABLE_MULTI_TENANT_LOGIN: $(grep ENABLE_MULTI_TENANT_LOGIN .env)"
echo "FRONTEND_URL: $(grep FRONTEND_URL .env)"
echo ""
echo "⚠️  IMPORTANTE: Debes cambiar JWT_SECRET manualmente por seguridad"
echo ""

# Reiniciar backend
echo "🔄 Reiniciando backend..."
cd ..
cd food-inventory-saas
npm run build
forever stop smartkubik-saas
sleep 2
forever start --uid smartkubik-saas -a dist/main.js

echo "✅ Backend reiniciado con nuevas variables"
ENDSSH

echo ""
echo "✅ Proceso completado!"
