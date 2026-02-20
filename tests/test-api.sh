#!/bin/bash

# =============================================================================
# 🧪 API TESTS — Nivel 3
# =============================================================================
# INSTRUCCIONES:
# 1. Obtener token: Login → DevTools → localStorage.getItem('token')
# 2. Editar línea 12 con tu token real
# 3. Ejecutar: chmod +x test-api.sh && ./test-api.sh
# 4. Verificar outputs (deben ser 200 OK con datos correctos)
#
# TIEMPO ESTIMADO: 10 minutos
# =============================================================================

# ⚠️ EDITAR AQUÍ: Pegar tu token JWT
TOKEN="TU_TOKEN_AQUI"

# Base URLs
API_BASE="http://localhost:3000"
ADMIN_BASE="http://localhost:5173"

# Colors para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_test() {
  echo ""
  echo "======================================================================"
  echo "TEST: $1"
  echo "======================================================================"
}

print_success() {
  echo -e "${GREEN}✅ PASS:${NC} $1"
}

print_fail() {
  echo -e "${RED}❌ FAIL:${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
  print_warning "jq no está instalado. Instalar con: brew install jq (Mac) o apt-get install jq (Linux)"
  print_warning "Tests continuarán pero sin validación de JSON"
  HAS_JQ=false
else
  HAS_JQ=true
fi

# =============================================================================
# Pre-flight checks
# =============================================================================

print_test "0. PRE-FLIGHT CHECKS"

# Check if backend is running
if curl -s "$API_BASE/health" > /dev/null 2>&1; then
  print_success "Backend está corriendo en $API_BASE"
else
  print_fail "Backend NO responde en $API_BASE"
  echo "   Fix: cd food-inventory-saas && npm run dev"
  exit 1
fi

# Check if token is set
if [ "$TOKEN" = "TU_TOKEN_AQUI" ]; then
  print_fail "Token no configurado. Editar línea 12 del script."
  echo "   1. Login en http://localhost:5173"
  echo "   2. DevTools → Console → ejecutar: localStorage.getItem('token')"
  echo "   3. Copiar token y pegar en línea 12 de este script"
  exit 1
fi

print_success "Token configurado"

# =============================================================================
# TEST 1: GET /tenant/settings — countryCode field
# =============================================================================

print_test "1. GET /tenant/settings (verificar countryCode)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/tenant/settings")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  print_success "HTTP 200 OK"

  if [ "$HAS_JQ" = true ]; then
    COUNTRY_CODE=$(echo "$BODY" | jq -r '.countryCode // "null"')
    NAME=$(echo "$BODY" | jq -r '.name // "null"')
    TIMEZONE=$(echo "$BODY" | jq -r '.timezone // "null"')

    echo "   Tenant Name: $NAME"
    echo "   Timezone: $TIMEZONE"
    echo "   Country Code: $COUNTRY_CODE"

    if [ "$COUNTRY_CODE" = "null" ] || [ "$COUNTRY_CODE" = "" ]; then
      print_fail "countryCode está null o vacío"
      echo "   Fix: Ejecutar en MongoDB:"
      echo "   db.tenants.updateMany({}, { \$set: { countryCode: 'VE' } })"
    elif [ "$COUNTRY_CODE" = "VE" ]; then
      print_success "countryCode = 'VE' (correcto)"
    else
      print_warning "countryCode = '$COUNTRY_CODE' (esperado: VE)"
    fi
  else
    echo "$BODY" | head -20
  fi
else
  print_fail "HTTP $HTTP_CODE (esperado: 200)"
  echo "$BODY"
fi

# =============================================================================
# TEST 2: GET /country-plugins/VE — Plugin endpoint
# =============================================================================

print_test "2. GET /country-plugins/VE (plugin VE existe)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/country-plugins/VE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  print_success "HTTP 200 OK"

  if [ "$HAS_JQ" = true ]; then
    COUNTRY_CODE=$(echo "$BODY" | jq -r '.countryCode // "null"')
    COUNTRY_NAME=$(echo "$BODY" | jq -r '.countryName // "null"')
    PRIMARY_CURRENCY=$(echo "$BODY" | jq -r '.currencyEngine.primaryCurrency.code // "null"')
    DEFAULT_TAX_TYPE=$(echo "$BODY" | jq -r '.taxEngine.defaultTaxes[0].type // "null"')
    DEFAULT_TAX_RATE=$(echo "$BODY" | jq -r '.taxEngine.defaultTaxes[0].rate // "null"')

    echo "   Country Code: $COUNTRY_CODE"
    echo "   Country Name: $COUNTRY_NAME"
    echo "   Primary Currency: $PRIMARY_CURRENCY"
    echo "   Default Tax: $DEFAULT_TAX_TYPE ($DEFAULT_TAX_RATE%)"

    if [ "$COUNTRY_CODE" = "VE" ] && [ "$PRIMARY_CURRENCY" = "VES" ] && [ "$DEFAULT_TAX_TYPE" = "IVA" ] && [ "$DEFAULT_TAX_RATE" = "16" ]; then
      print_success "Plugin VE retorna datos correctos"
    else
      print_fail "Plugin VE retorna datos incorrectos"
    fi
  else
    echo "$BODY" | head -30
  fi
else
  print_fail "HTTP $HTTP_CODE (esperado: 200)"
  echo "$BODY"
  echo "   Fix: Verificar que CountryPluginModule está en app.module.ts"
fi

# =============================================================================
# TEST 3: PUT /tenant/settings (actualizar countryCode)
# =============================================================================

print_test "3. PUT /tenant/settings (actualizar countryCode)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"countryCode": "VE"}' \
  "$API_BASE/tenant/settings")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  print_success "HTTP 200 OK"

  if [ "$HAS_JQ" = true ]; then
    UPDATED_CODE=$(echo "$BODY" | jq -r '.countryCode // "null"')
    echo "   Updated countryCode: $UPDATED_CODE"

    if [ "$UPDATED_CODE" = "VE" ]; then
      print_success "countryCode actualizado correctamente"
    else
      print_fail "countryCode no se actualizó (got: $UPDATED_CODE)"
    fi
  else
    echo "$BODY" | head -20
  fi
else
  print_fail "HTTP $HTTP_CODE (esperado: 200)"
  echo "$BODY"
fi

# =============================================================================
# TEST 4: GET /country-plugins (list all plugins)
# =============================================================================

print_test "4. GET /country-plugins (listar todos los plugins)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/country-plugins")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  print_success "HTTP 200 OK"

  if [ "$HAS_JQ" = true ]; then
    COUNT=$(echo "$BODY" | jq '. | length')
    echo "   Plugins disponibles: $COUNT"

    if [ "$COUNT" -gt 0 ]; then
      echo "$BODY" | jq -r '.[] | "   - \(.countryCode): \(.countryName)"'
      print_success "Al menos 1 plugin disponible"
    else
      print_fail "No hay plugins disponibles"
    fi
  else
    echo "$BODY"
  fi
else
  print_fail "HTTP $HTTP_CODE (esperado: 200)"
  echo "$BODY"
fi

# =============================================================================
# TEST 5: Verify tenant schema has countryCode field
# =============================================================================

print_test "5. VERIFICAR: Schema de Tenant incluye countryCode"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/tenant/settings")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  if [ "$HAS_JQ" = true ]; then
    HAS_COUNTRY_CODE=$(echo "$BODY" | jq 'has("countryCode")')

    if [ "$HAS_COUNTRY_CODE" = "true" ]; then
      print_success "Campo countryCode existe en response"
    else
      print_fail "Campo countryCode NO existe en response"
      echo "   Fix: Verificar que tenant.schema.ts incluye countryCode field"
    fi
  fi
else
  print_fail "No se pudo verificar (HTTP $HTTP_CODE)"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "======================================================================"
echo "📊 RESUMEN DE TESTS"
echo "======================================================================"
echo ""
echo "Tests ejecutados: 5"
echo ""
echo "✅ = Test pasó"
echo "❌ = Test falló"
echo "⚠️  = Warning (no crítico)"
echo ""
echo "Si todos los tests pasaron: Sistema backend funcional ✅"
echo "Si alguno falló: Revisar logs arriba para detalles de error"
echo ""
echo "======================================================================"
