#!/bin/bash

# Script de prueba para el Asistente de Inventario
# Asegúrate de tener el backend corriendo en localhost:3000

set -e

echo "=================================================="
echo "   Prueba del Asistente de Inventario de IA"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para hacer peticiones
function test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    echo -e "${YELLOW}Prueba: ${name}${NC}"
    echo "Endpoint: ${method} ${endpoint}"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            "http://localhost:3000/api/v1${endpoint}")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -X "${method}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "http://localhost:3000/api/v1${endpoint}")
    fi

    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')

    if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ]; then
        echo -e "${GREEN}✓ Status: ${http_status}${NC}"
        echo "Response:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Status: ${http_status}${NC}"
        echo "Response:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
    echo "=================================================="
    echo ""
}

# Verificar que jq esté instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Advertencia: 'jq' no está instalado. Los resultados no se formatearán.${NC}"
    echo "Instálalo con: brew install jq"
    echo ""
fi

# Solicitar credenciales
echo "Por favor, ingresa tus credenciales:"
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# 1. Login
echo -e "${YELLOW}1. Haciendo login...${NC}"
login_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
    "http://localhost:3000/api/v1/auth/login")

http_status=$(echo "$login_response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$login_response" | sed '/HTTP_STATUS/d')

if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ]; then
    echo -e "${GREEN}✓ Login exitoso${NC}"
    TOKEN=$(echo "$body" | jq -r '.accessToken' 2>/dev/null || echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${RED}✗ No se pudo extraer el token${NC}"
        echo "Response:"
        echo "$body"
        exit 1
    fi

    echo "Token obtenido: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ Login fallido (Status: ${http_status})${NC}"
    echo "Response:"
    echo "$body"
    exit 1
fi
echo ""
echo "=================================================="
echo ""

# 2. Verificar configuración del asistente
test_endpoint "Configuración del Asistente" "GET" "/assistant/config" ""

# 3. Solicitar nombre de producto a buscar
echo -e "${YELLOW}Ingresa el nombre del producto a buscar en el inventario:${NC}"
read -p "Producto: " PRODUCT_NAME
echo ""

# 4. Probar búsqueda directa de inventario
test_endpoint "Búsqueda Directa de Inventario" "POST" "/assistant/test-inventory" \
    "{\"productQuery\":\"${PRODUCT_NAME}\",\"limit\":5}"

# 5. Probar el asistente completo
test_endpoint "Asistente Completo - Consulta de Inventario" "POST" "/assistant/chat" \
    "{\"question\":\"¿Cuántas unidades de ${PRODUCT_NAME} tenemos disponibles?\",\"topK\":5}"

# 6. Probar con diferentes variaciones de preguntas
echo -e "${YELLOW}Probando variaciones de preguntas...${NC}"
echo ""

test_endpoint "Pregunta sobre precio" "POST" "/assistant/chat" \
    "{\"question\":\"¿Cuál es el precio de ${PRODUCT_NAME}?\",\"topK\":5}"

test_endpoint "Pregunta sobre stock" "POST" "/assistant/chat" \
    "{\"question\":\"¿Hay stock de ${PRODUCT_NAME}?\",\"topK\":5}"

echo ""
echo -e "${GREEN}=================================================="
echo "   Pruebas completadas"
echo "==================================================${NC}"
echo ""
echo "Revisa los logs del backend para ver información de depuración."
echo "Busca líneas que contengan [DEBUG] para ver el flujo de ejecución."
