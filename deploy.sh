#!/bin/bash

# --- Script robusto para actualizar y reiniciar el proyecto en modo DESARROLLO ---

# --- Configuración ---
# Puerto que usa tu aplicación (el default de 'npm run dev' suele ser 5173)
PORT=5174
# Ruta relativa a tu proyecto desde donde se ejecuta el script
PROJECT_DIR="food-inventory-admin"
# UID para el proceso de forever
APP_UID="smartkubik-admin"


echo "🔵 1. Intentando detener el proceso de forever con UID '$APP_UID'..."
# Se intenta detener de la forma normal primero
forever stop "$APP_UID"
echo "Comando 'forever stop' ejecutado."
sleep 2 # Damos un par de segundos para que el proceso termine

echo "🔵 2. Verificando y forzando la liberación del puerto $PORT..."
# Como medida de seguridad, buscamos si algo sigue usando el puerto
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "El puerto $PORT sigue en uso por el PID: $PID. Forzando terminación..."
  kill -9 "$PID"
  echo "Proceso terminado."
else
  echo "El puerto $PORT ya está libre. Continuando..."
fi

echo "🔵 3. Actualizando el código desde el repositorio..."
git pull # Cambia 'main' por tu rama si es diferente

echo "🔵 4. Instalando/actualizando dependencias..."
cd "$PROJECT_DIR"
npm install

echo "🔵 5. Iniciando la aplicación en modo desarrollo con forever..."
# Usamos 'start' porque ya detuvimos cualquier instancia anterior.
# El comando se ejecuta en el directorio 'food-inventory-admin'
# 'npm run dev' inicia el servidor de desarrollo de Vite.
# Le pasamos el puerto configurado en este script.
forever start --uid "$APP_UID" -a -c "npm run dev -- --port $PORT" .

echo "✅ ¡Proceso completado! El proyecto está actualizado y corriendo en modo desarrollo."
# forever list