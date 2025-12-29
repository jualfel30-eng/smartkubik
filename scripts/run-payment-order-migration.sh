#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔗 MIGRACIÓN: VINCULAR PAGOS A ÓRDENES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Esta migración reconstruye las relaciones entre pagos y órdenes"
echo "después de restaurar el backup del 15 de noviembre."
echo ""
echo "📋 Qué hace esta migración:"
echo "   1. Resetea todos los campos order.payments[] a vacío"
echo "   2. Lee las asignaciones (allocations) de cada pago"
echo "   3. Vincula los pagos a las órdenes correspondientes"
echo "   4. Recalcula order.paidAmount y order.paymentStatus"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que el backend esté corriendo"
echo ""
read -p "¿Deseas continuar? (s/n): " confirm

if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "❌ Migración cancelada"
    exit 0
fi

echo ""
echo "🔍 Verificando que el backend esté corriendo..."

# Check if backend is running (port 3000)
if ! curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo "❌ El backend NO está corriendo en http://localhost:3000"
    echo ""
    echo "Por favor, inicia el backend primero:"
    echo "  cd food-inventory-saas"
    echo "  npm run start:dev"
    echo ""
    exit 1
fi

echo "✅ Backend detectado en http://localhost:3000"
echo ""

# Load .env to get JWT token or ask user
echo "🔐 Necesitas estar autenticado como Super Admin"
echo ""
echo "Por favor, ve a http://localhost:5173 y:"
echo "  1. Inicia sesión como super admin"
echo "  2. Abre DevTools (F12)"
echo "  3. Ve a Application > Local Storage > http://localhost:5173"
echo "  4. Copia el valor de 'token'"
echo ""
read -p "Pega tu JWT token aquí: " JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ Token vacío. Migración cancelada."
    exit 1
fi

echo ""
echo "🚀 Ejecutando migración..."
echo ""

# Execute migration
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/migrations/link-payments-to-orders \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Respuesta del servidor:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
    echo "📊 Verifica ahora el módulo de Cuentas por Cobrar"
    echo "   Las órdenes deberían aparecer correctamente"
    echo ""
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ❌ ERROR EN LA MIGRACIÓN"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "HTTP Status: $http_code"
    echo ""
    echo "Respuesta del servidor:"
    echo "$body"
    echo ""

    if [ "$http_code" = "401" ]; then
        echo "⚠️  Token inválido o expirado. Obtén un nuevo token."
    elif [ "$http_code" = "403" ]; then
        echo "⚠️  No tienes permisos de Super Admin."
    fi

    exit 1
fi
