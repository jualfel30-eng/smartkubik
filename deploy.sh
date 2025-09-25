#!/bin/bash

# --- Script robusto para actualizar y reiniciar el proyecto en modo DESARROLLO ---
nvm use 20
# --- Configuración ---
# Frontend
FE_PORT=5174
FE_PROJECT_DIR="food-inventory-admin"
FE_APP_UID="smartkubik-admin"

# Backend
BE_PROJECT_DIR="food-inventory-saas"
BE_APP_UID="smartkubik-saas"


# --- INICIO DESPLIEGUE FRONTEND ---
echo "🚀 --- INICIANDO DESPLIEGUE DEL FRONTEND --- 🚀"

echo "🔵 1. Intentando detener el proceso de frontend (forever UID: '$FE_APP_UID')..."
forever stop "$FE_APP_UID"
echo "Comando 'forever stop' para frontend ejecutado."
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

echo "🔵 3. Actualizando el código desde el repositorio..."
git pull

echo "🔵 4. Instalando/actualizando dependencias del frontend..."
cd "$FE_PROJECT_DIR"
npm install

echo "🔵 5. Iniciando el frontend en modo desarrollo con forever..."
forever start --uid "$FE_APP_UID" -a -c "npm run dev -- --port $FE_PORT" .
echo "✅ Frontend iniciado."

# --- FIN DESPLIEGUE FRONTEND ---


# --- INICIO DESPLIEGUE BACKEND ---
echo "
🚀 --- INICIANDO DESPLIEGUE DEL BACKEND --- 🚀"

echo "🔵 6. Navegando al directorio del backend..."
cd .. # Volver a la raíz del proyecto
cd "$BE_PROJECT_DIR"

echo "🔵 7. Instalando/actualizando dependencias del backend..."
npm install --legacy-peer-deps

echo "🔵 8. Compilando el backend..."
npm run build

echo "🔵 9. Deteniendo cualquier instancia anterior del backend (UID: '$BE_APP_UID')..."
# Se usa 'stop'. No da error si el proceso no existe.
forever stop "$BE_APP_UID"
sleep 2 # Pequeña pausa para asegurar que el proceso se detenga

echo "🔵 10. Iniciando el backend con forever (UID: '$BE_APP_UID')..."
# Se usa 'start' para levantar la nueva instancia.
forever start --uid "$BE_APP_UID" -a dist/main.js

# --- FIN DESPLIEGUE BACKEND ---

echo "
✅ ¡Proceso de despliegue completado!"
forever list