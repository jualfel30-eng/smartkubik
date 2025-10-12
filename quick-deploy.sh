#!/bin/bash

# Script para hacer deploy rápido desde tu máquina local al servidor
# Uso: sh quick-deploy.sh

echo "🚀 Iniciando deploy a smartkubik..."

# 1. Commit y push a GitHub (si hay cambios)
echo "📦 Verificando cambios locales..."
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Hay cambios sin commitear. Por favor commit tus cambios primero."
  echo "¿Quieres que lo haga automáticamente? (y/n)"
  read -r response
  if [[ "$response" == "y" ]]; then
    git add .
    git commit -m "deploy: Deploy changes to production"
    git push origin main
    echo "✅ Cambios subidos a GitHub"
  else
    echo "❌ Deploy cancelado. Commit tus cambios manualmente."
    exit 1
  fi
else
  echo "✅ No hay cambios locales. Continuando..."
fi

# 2. Conectar al servidor y ejecutar deploy
echo ""
echo "🔵 Conectando al servidor y ejecutando deploy..."
echo ""

ssh root@66.135.27.185 << 'ENDSSH'
cd /home/ubuntu/smartkubik
sh deploy.sh
ENDSSH

echo ""
echo "✅ Deploy completado!"
echo ""
echo "🌐 Verifica tu aplicación en:"
echo "   - Admin: https://smartkubik.com"
echo "   - API: https://api.smartkubik.com/api/v1/health"
echo "   - Storefront: https://[tu-dominio].smartkubik.com"
