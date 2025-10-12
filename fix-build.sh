#!/bin/bash

# Script para arreglar el build del frontend con más memoria

echo "🔧 Arreglando build del frontend..."

ssh root@66.135.27.185 'bash -l -c "
cd /home/ubuntu/smartkubik/food-inventory-admin
echo \"🔵 Building frontend con más memoria...\"
NODE_OPTIONS=\"--max-old-space-size=2048\" npm run build
echo \"🔵 Reiniciando frontend...\"
forever restart smartkubik-admin
echo \"✅ Frontend arreglado\"
"'

echo ""
echo "✅ Proceso completado!"
