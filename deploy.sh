#!/bin/bash

# --- Script robusto para actualizar y reiniciar el proyecto ---

# --- Configuración ---
# Puerto que usa tu aplicación (el default de 'npm run preview' suele ser 4173)
PORT=5174
# Ruta absoluta a tu proyecto
PROJECT_DIR="./food-inventory-admin"


echo "🔵 1. Buscando y deteniendo el proceso en el puerto $PORT..."

# Obtenemos el PID (Process ID) del proceso que usa el puerto
PID=$(lsof -t -i:$PORT)

# Si se encontró un PID, se termina el proceso
if [ -n "$PID" ]; then
  echo "Proceso encontrado con PID: $PID. Terminando..."
  kill -9 $PID
  echo "Proceso terminado."
else
  echo "Ningún proceso encontrado en el puerto $PORT. Continuando..."
fi

# echo "🔵 2. Navegando al directorio del proyecto..."
# cd $PROJECT_DIR

echo "🔵 3. Actualizando el código desde el repositorio..."
git pull # Cambia 'main' por tu rama si es diferente

echo "🔵 4. Instalando/actualizando dependencias..."
cd food-inventory-admin
npm install

# echo "🔵 5. Creando la build de producción..."
# npm run build

echo "🔵 6. Levantando el proyecto con forever..."
forever start -c "npm run dev" ./

# echo "✅ ¡Proceso completado! El proyecto está actualizado y corriendo."
# forever list

# También detenemos la referencia de forever por si acaso
forever restart 3