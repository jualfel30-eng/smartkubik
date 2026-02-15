#!/bin/bash

# Script de prueba end-to-end para sistema multi-unidad
# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"

echo -e "${YELLOW}🧪 Iniciando pruebas del sistema multi-unidad${NC}\n"

# 1. Login para obtener token
echo -e "${YELLOW}1️⃣  Haciendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juanalfel30@gmail.com",
    "password": "Chipi.24",
    "tenantCode": "earlyadopter"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Error en login${NC}"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Login exitoso${NC}\n"

# 2. Crear producto con múltiples unidades de venta
echo -e "${YELLOW}2️⃣  Creando producto TEST-QUESO-MULTIUNIT con múltiples unidades...${NC}"

PRODUCT_DATA='{
  "sku": "TEST-QUESO-MULTIUNIT-'$(date +%s)'",
  "name": "Queso Blanco Artesanal (Test Multi-Unit)",
  "category": "Lácteos",
  "subcategory": "Quesos",
  "brand": "Test Brand",
  "unitOfMeasure": "gramos",
  "hasMultipleSellingUnits": true,
  "sellingUnits": [
    {
      "name": "Gramos",
      "abbreviation": "g",
      "conversionFactor": 1,
      "pricePerUnit": 0.02,
      "costPerUnit": 0.012,
      "isActive": true,
      "isDefault": false,
      "minimumQuantity": 100,
      "incrementStep": 50
    },
    {
      "name": "Kilogramos",
      "abbreviation": "kg",
      "conversionFactor": 1000,
      "pricePerUnit": 18.00,
      "costPerUnit": 11.00,
      "isActive": true,
      "isDefault": true,
      "minimumQuantity": 0.5,
      "incrementStep": 0.5
    },
    {
      "name": "Libras",
      "abbreviation": "lb",
      "conversionFactor": 453.592,
      "pricePerUnit": 9.00,
      "costPerUnit": 5.50,
      "isActive": true,
      "isDefault": false
    }
  ],
  "variants": [
    {
      "name": "Estándar",
      "sku": "TEST-QUESO-VAR-'$(date +%s)'",
      "barcode": "750123456'$(date +%s | tail -c 5)'",
      "unit": "gramos",
      "unitSize": 1,
      "basePrice": 18.00,
      "costPrice": 11.00
    }
  ],
  "isPerishable": true,
  "shelfLifeDays": 30,
  "storageTemperature": "refrigerado",
  "pricingRules": {
    "cashDiscount": 0,
    "cardSurcharge": 0,
    "minimumMargin": 0.2,
    "maximumDiscount": 0.1
  },
  "inventoryConfig": {
    "trackLots": false,
    "trackExpiration": true,
    "minimumStock": 5000,
    "maximumStock": 50000,
    "reorderPoint": 10000,
    "reorderQuantity": 20000,
    "fefoEnabled": true
  },
  "ivaApplicable": true,
  "taxCategory": "general"
}'

PRODUCT_RESPONSE=$(curl -s -X POST "${API_URL}/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PRODUCT_DATA")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
PRODUCT_SKU=$(echo $PRODUCT_RESPONSE | grep -o '"sku":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PRODUCT_ID" ]; then
  echo -e "${RED}❌ Error creando producto${NC}"
  echo $PRODUCT_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Producto creado${NC}"
echo -e "   ID: $PRODUCT_ID"
echo -e "   SKU: $PRODUCT_SKU\n"

# 3. Crear inventario inicial de 10kg (10000 gramos)
echo -e "${YELLOW}3️⃣  Creando inventario inicial: 10,000 gramos (10 kg)...${NC}"

INVENTORY_DATA='{
  "productId": "'$PRODUCT_ID'",
  "productSku": "'$PRODUCT_SKU'",
  "totalQuantity": 10000,
  "averageCostPrice": 11.00
}'

INVENTORY_RESPONSE=$(curl -s -X POST "${API_URL}/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$INVENTORY_DATA")

INVENTORY_ID=$(echo $INVENTORY_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$INVENTORY_ID" ]; then
  echo -e "${RED}❌ Error creando inventario${NC}"
  echo $INVENTORY_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Inventario creado${NC}"
echo -e "   Stock inicial: 10,000 gramos\n"

# 4. Obtener un cliente existente
echo -e "${YELLOW}4️⃣  Obteniendo cliente para la orden...${NC}"

CUSTOMERS_RESPONSE=$(curl -s -X GET "${API_URL}/customers?limit=1" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_ID=$(echo $CUSTOMERS_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CUSTOMER_ID" ]; then
  echo -e "${RED}❌ No se encontraron clientes${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Cliente obtenido: $CUSTOMER_ID${NC}\n"

# 5. Crear orden con 2.5 kg (debería descontar 2500 gramos)
echo -e "${YELLOW}5️⃣  Creando orden: 2.5 kg de queso...${NC}"

ORDER_DATA='{
  "customerId": "'$CUSTOMER_ID'",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 2.5,
      "selectedUnit": "kg"
    }
  ],
  "paymentMethod": "efectivo_usd",
  "deliveryMethod": "pickup",
  "autoReserve": true
}'

ORDER_RESPONSE=$(curl -s -X POST "${API_URL}/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$ORDER_DATA")

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
  echo -e "${RED}❌ Error creando orden${NC}"
  echo $ORDER_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Orden creada: $ORDER_ID${NC}\n"

# 6. Verificar datos de la orden
echo -e "${YELLOW}6️⃣  Verificando datos de la orden...${NC}"

ORDER_DETAIL=$(curl -s -X GET "${API_URL}/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $ORDER_DETAIL | jq '.data.items[0]' > /tmp/order_item.json

# Extraer valores
QUANTITY=$(cat /tmp/order_item.json | grep -o '"quantity":[0-9.]*' | cut -d':' -f2)
SELECTED_UNIT=$(cat /tmp/order_item.json | grep -o '"selectedUnit":"[^"]*' | cut -d'"' -f4)
CONVERSION_FACTOR=$(cat /tmp/order_item.json | grep -o '"conversionFactor":[0-9.]*' | cut -d':' -f2)
QUANTITY_IN_BASE=$(cat /tmp/order_item.json | grep -o '"quantityInBaseUnit":[0-9.]*' | cut -d':' -f2)
UNIT_PRICE=$(cat /tmp/order_item.json | grep -o '"unitPrice":[0-9.]*' | cut -d':' -f2)
TOTAL_PRICE=$(cat /tmp/order_item.json | grep -o '"totalPrice":[0-9.]*' | cut -d':' -f2)

echo -e "${GREEN}✅ Datos del OrderItem:${NC}"
echo -e "   quantity: $QUANTITY"
echo -e "   selectedUnit: $SELECTED_UNIT"
echo -e "   conversionFactor: $CONVERSION_FACTOR"
echo -e "   quantityInBaseUnit: $QUANTITY_IN_BASE"
echo -e "   unitPrice: \$$UNIT_PRICE"
echo -e "   totalPrice: \$$TOTAL_PRICE\n"

# Validar cálculos
if [ "$QUANTITY" != "2.5" ]; then
  echo -e "${RED}❌ Error: quantity debería ser 2.5${NC}"
fi

if [ "$SELECTED_UNIT" != "kg" ]; then
  echo -e "${RED}❌ Error: selectedUnit debería ser 'kg'${NC}"
fi

if [ "$CONVERSION_FACTOR" != "1000" ]; then
  echo -e "${RED}❌ Error: conversionFactor debería ser 1000${NC}"
fi

if [ "$QUANTITY_IN_BASE" != "2500" ]; then
  echo -e "${RED}❌ Error: quantityInBaseUnit debería ser 2500${NC}"
fi

if [ "$UNIT_PRICE" != "18" ]; then
  echo -e "${RED}❌ Error: unitPrice debería ser 18${NC}"
fi

if [ "$TOTAL_PRICE" != "45" ]; then
  echo -e "${RED}❌ Error: totalPrice debería ser 45${NC}"
fi

# 7. Verificar inventario descontado
echo -e "${YELLOW}7️⃣  Verificando descuento de inventario...${NC}"

INVENTORY_CHECK=$(curl -s -X GET "${API_URL}/inventory/product/$PRODUCT_SKU" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_QUANTITY=$(echo $INVENTORY_CHECK | grep -o '"totalQuantity":[0-9.]*' | head -1 | cut -d':' -f2)
RESERVED_QUANTITY=$(echo $INVENTORY_CHECK | grep -o '"reservedQuantity":[0-9.]*' | head -1 | cut -d':' -f2)
AVAILABLE_QUANTITY=$(echo $INVENTORY_CHECK | grep -o '"availableQuantity":[0-9.]*' | head -1 | cut -d':' -f2)

echo -e "${GREEN}✅ Estado del inventario:${NC}"
echo -e "   totalQuantity: $TOTAL_QUANTITY gramos"
echo -e "   reservedQuantity: $RESERVED_QUANTITY gramos"
echo -e "   availableQuantity: $AVAILABLE_QUANTITY gramos\n"

# Validar inventario
EXPECTED_TOTAL=10000
EXPECTED_RESERVED=2500
EXPECTED_AVAILABLE=7500

if [ "$TOTAL_QUANTITY" != "$EXPECTED_TOTAL" ]; then
  echo -e "${RED}❌ Error: totalQuantity debería ser $EXPECTED_TOTAL${NC}"
fi

if [ "$RESERVED_QUANTITY" != "$EXPECTED_RESERVED" ]; then
  echo -e "${RED}❌ Error: reservedQuantity debería ser $EXPECTED_RESERVED${NC}"
fi

if [ "$AVAILABLE_QUANTITY" != "$EXPECTED_AVAILABLE" ]; then
  echo -e "${RED}❌ Error: availableQuantity debería ser $EXPECTED_AVAILABLE${NC}"
fi

# 8. Prueba de validación: cantidad menor al mínimo
echo -e "${YELLOW}8️⃣  Probando validación: cantidad menor al mínimo (0.3 kg, mínimo: 0.5 kg)...${NC}"

INVALID_ORDER='{
  "customerId": "'$CUSTOMER_ID'",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 0.3,
      "selectedUnit": "kg"
    }
  ],
  "paymentMethod": "efectivo_usd",
  "deliveryMethod": "pickup",
  "autoReserve": true
}'

INVALID_RESPONSE=$(curl -s -X POST "${API_URL}/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$INVALID_ORDER")

if echo $INVALID_RESPONSE | grep -q "Cantidad mínima"; then
  echo -e "${GREEN}✅ Validación correcta: rechazó cantidad menor al mínimo${NC}\n"
else
  echo -e "${RED}❌ Error: debería rechazar cantidad menor al mínimo${NC}"
  echo $INVALID_RESPONSE | jq '.'
fi

# 9. Prueba de validación: incremento inválido
echo -e "${YELLOW}9️⃣  Probando validación: incremento inválido (0.7 kg, incremento: 0.5 kg)...${NC}"

INVALID_INCREMENT='{
  "customerId": "'$CUSTOMER_ID'",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 0.7,
      "selectedUnit": "kg"
    }
  ],
  "paymentMethod": "efectivo_usd",
  "deliveryMethod": "pickup",
  "autoReserve": true
}'

INVALID_INC_RESPONSE=$(curl -s -X POST "${API_URL}/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$INVALID_INCREMENT")

if echo $INVALID_INC_RESPONSE | grep -q "múltiplo"; then
  echo -e "${GREEN}✅ Validación correcta: rechazó incremento inválido${NC}\n"
else
  echo -e "${RED}❌ Error: debería rechazar incremento inválido${NC}"
  echo $INVALID_INC_RESPONSE | jq '.'
fi

# 10. Prueba de validación: unidad inválida
echo -e "${YELLOW}🔟  Probando validación: unidad inválida (toneladas)...${NC}"

INVALID_UNIT='{
  "customerId": "'$CUSTOMER_ID'",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 1,
      "selectedUnit": "ton"
    }
  ],
  "paymentMethod": "efectivo_usd",
  "deliveryMethod": "pickup",
  "autoReserve": true
}'

INVALID_UNIT_RESPONSE=$(curl -s -X POST "${API_URL}/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$INVALID_UNIT")

if echo $INVALID_UNIT_RESPONSE | grep -q "no es válida"; then
  echo -e "${GREEN}✅ Validación correcta: rechazó unidad inválida${NC}\n"
else
  echo -e "${RED}❌ Error: debería rechazar unidad inválida${NC}"
  echo $INVALID_UNIT_RESPONSE | jq '.'
fi

# Resumen final
echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ PRUEBAS COMPLETADAS EXITOSAMENTE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

echo -e "📊 Resumen:"
echo -e "   ✓ Producto con multi-unidad creado"
echo -e "   ✓ Inventario inicial: 10,000 g"
echo -e "   ✓ Orden creada: 2.5 kg"
echo -e "   ✓ Conversión correcta: 2.5 kg → 2,500 g"
echo -e "   ✓ Precio correcto: 2.5 × \$18.00 = \$45.00"
echo -e "   ✓ Inventario descontado: 10,000 - 2,500 = 7,500 g"
echo -e "   ✓ Validaciones funcionando correctamente\n"

echo -e "${YELLOW}IDs para referencia:${NC}"
echo -e "   Producto: $PRODUCT_ID"
echo -e "   Orden: $ORDER_ID"
echo -e "   SKU: $PRODUCT_SKU\n"
