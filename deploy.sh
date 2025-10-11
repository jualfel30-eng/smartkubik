#!/bin/bash

# --- Script para actualizar y reiniciar smartkubik (Admin + Backend + Storefront) ---

# Cargar NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar Node 20
nvm use 20

# --- Configuración ---
# Frontend Admin
FE_PORT=5174
FE_PROJECT_DIR="food-inventory-admin"
FE_APP_UID="smartkubik-admin"

# Backend
BE_PROJECT_DIR="food-inventory-saas"
BE_APP_UID="smartkubik-saas"

# Storefront
SF_PORT=3001
SF_PROJECT_DIR="food-inventory-storefront"
SF_APP_UID="smartkubik-storefront"


# --- ACTUALIZAR CÓDIGO ---
echo "🔵 Actualizando el código desde el repositorio..."
git pull


# --- DESPLIEGUE FRONTEND ADMIN ---
echo ""
echo "🚀 --- INICIANDO DESPLIEGUE DEL FRONTEND ADMIN --- 🚀"

echo "🔵 1. Intentando detener el proceso de frontend (forever UID: '$FE_APP_UID')..."
forever stop "$FE_APP_UID" 2>/dev/null || echo "No había proceso previo."
sleep 2

echo "🔵 2. Verificando y forzando la liberación del puerto del frontend $FE_PORT..."
FE_PID=$(lsof -t -i:$FE_PORT)
if [ -n "$FE_PID" ]; then
  echo "El puerto $FE_PORT sigue en uso por el PID: $FE_PID. Forzando terminación..."
  kill -9 "$FE_PID"
  echo "Proceso de frontend terminado."
else
  echo "El puerto $FE_PORT ya está libre. Continuando..."
fi

echo "🔵 3. Copiando variables de entorno de producción..."
cd "$FE_PROJECT_DIR"
if [ -f ".env.production" ]; then
  cp .env.production .env
  echo "✅ Variables de entorno actualizadas desde .env.production"
else
  echo "⚠️  Advertencia: No se encontró .env.production"
fi

echo "🔵 4. Instalando/actualizando dependencias del frontend..."
npm install

echo "🔵 5. Compilando el frontend para producción..."
npm run build

echo "🔵 6. Iniciando el frontend con forever (sirviendo desde dist/)..."
forever start --uid "$FE_APP_UID" -a -c "npm run preview -- --port $FE_PORT" .
echo "✅ Frontend admin iniciado."


# --- DESPLIEGUE BACKEND ---
echo ""
echo "🚀 --- INICIANDO DESPLIEGUE DEL BACKEND --- 🚀"

echo "🔵 7. Navegando al directorio del backend..."
cd ..
cd "$BE_PROJECT_DIR"

echo "🔵 8. Copiando variables de entorno de producción..."
if [ -f ".env.production" ]; then
  # NO sobreescribimos .env si ya existe con secretos configurados
  if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "✅ Variables de entorno creadas desde .env.production"
    echo "⚠️  IMPORTANTE: Edita .env y configura JWT_SECRET y MONGODB_URI"
  else
    echo "ℹ️  .env ya existe. NO se sobreescribe (contiene secretos configurados)."
  fi
else
  echo "⚠️  Advertencia: No se encontró .env.production"
fi

echo "🔵 9. Instalando/actualizando dependencias del backend..."
npm install

echo "🔵 10. Compilando el backend..."
npm run build

echo "🔵 11. Deteniendo cualquier instancia anterior del backend (UID: '$BE_APP_UID')..."
forever stop "$BE_APP_UID" 2>/dev/null || echo "No había proceso previo."
sleep 2

echo "🔵 12. Iniciando el backend con forever (UID: '$BE_APP_UID')..."
forever start --uid "$BE_APP_UID" -a dist/main.js
echo "✅ Backend iniciado."


# --- DESPLIEGUE STOREFRONT ---
echo ""
echo "🚀 --- INICIANDO DESPLIEGUE DEL STOREFRONT --- 🚀"

echo "🔵 13. Navegando al directorio del storefront..."
cd ..
cd "$SF_PROJECT_DIR"

echo "🔵 14. Copiando variables de entorno de producción..."
if [ -f ".env.production" ]; then
  cp .env.production .env.local
  echo "✅ Variables de entorno actualizadas desde .env.production"
else
  echo "⚠️  Advertencia: No se encontró .env.production"
fi

echo "🔵 15. Instalando/actualizando dependencias del storefront..."
npm install

echo "🔵 16. Compilando el storefront (Next.js)..."
npm run build

echo "🔵 17. Deteniendo cualquier instancia anterior del storefront (UID: '$SF_APP_UID')..."
forever stop "$SF_APP_UID" 2>/dev/null || echo "No había proceso previo."
sleep 2

echo "🔵 18. Iniciando el storefront con forever en puerto $SF_PORT..."
forever start --uid "$SF_APP_UID" -a -c "npm start -- -p $SF_PORT" .
echo "✅ Storefront iniciado."


# --- FIN DESPLIEGUE ---
echo ""
echo "✅ ¡Proceso de despliegue completado!"
echo ""
echo "📊 Procesos activos:"
forever list
