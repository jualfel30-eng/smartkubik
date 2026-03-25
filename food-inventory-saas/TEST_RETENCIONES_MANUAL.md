# Manual de Pruebas - Módulo de Retenciones IVA/ISLR

Este documento contiene pruebas manuales paso a paso para validar el módulo completo de retenciones.

## Requisitos Previos

1. Servidor corriendo: `npm run start:dev`
2. MongoDB conectado
3. Token JWT válido de autenticación
4. Al menos una factura emitida en el sistema
5. Series configuradas para retenciones IVA e ISLR

## Variables de Entorno

```bash
export API_URL="http://localhost:3000/api/v1"
export TOKEN="<tu-token-jwt>"
export TENANT_ID="<tu-tenant-id>"
```

## 1. Preparación: Crear Series para Retenciones

### 1.1 Crear Serie para Retenciones IVA (Tipo 05)

```bash
curl -X POST "$API_URL/billing/sequences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "05",
    "prefix": "RET-IVA",
    "startNumber": 1,
    "currentNumber": 0,
    "enabled": true,
    "description": "Serie para Retenciones IVA"
  }'
```

**Resultado esperado:**
```json
{
  "_id": "65abc123...",
  "documentType": "05",
  "prefix": "RET-IVA",
  "currentNumber": 0,
  "enabled": true
}
```

**Guardar:** `SERIES_IVA_ID=<_id de la respuesta>`

### 1.2 Crear Serie para Retenciones ISLR (Tipo 06)

```bash
curl -X POST "$API_URL/billing/sequences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "06",
    "prefix": "RET-ISLR",
    "startNumber": 1,
    "currentNumber": 0,
    "enabled": true,
    "description": "Serie para Retenciones ISLR"
  }'
```

**Guardar:** `SERIES_ISLR_ID=<_id de la respuesta>`

## 2. Preparación: Obtener una Factura Emitida

### 2.1 Listar Facturas Emitidas

```bash
curl -X GET "$API_URL/billing/documents?status=issued&limit=1" \
  -H "Authorization: Bearer $TOKEN"
```

**Guardar:** `INVOICE_ID=<_id de la factura>`

### 2.2 Ver Detalles de la Factura

```bash
curl -X GET "$API_URL/billing/documents/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Validar:**
- `status`: debe ser `"issued"`
- `totals.taxes`: debe contener al menos un impuesto IVA
- `totals.grandTotal`: monto total de la factura

## 3. Pruebas de Retenciones IVA

### 3.1 Crear Retención IVA 75%

```bash
curl -X POST "$API_URL/withholding/iva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ID'",
    "retentionPercentage": 75,
    "seriesId": "'$SERIES_IVA_ID'",
    "operationDate": "2024-01-15",
    "notes": "Retención IVA 75% - Prueba manual"
  }'
```

**Resultado esperado:**
```json
{
  "_id": "65def456...",
  "type": "iva",
  "documentNumber": "RET-IVA-0001",
  "status": "draft",
  "affectedDocumentId": "...",
  "ivaRetention": {
    "baseAmount": 1000,
    "taxRate": 16,
    "taxAmount": 160,
    "retentionPercentage": 75,
    "retentionAmount": 120
  },
  "totals": {
    "totalRetention": 120
  }
}
```

**Validaciones:**
- `retentionAmount` debe ser 75% del `taxAmount`
- `documentNumber` debe seguir la serie configurada
- `status` debe ser `"draft"`

**Guardar:** `RETENTION_IVA_75_ID=<_id de la retención>`

### 3.2 Verificar Cálculo de Retención IVA 75%

**Fórmula:**
```
Base Imponible: $1,000
IVA (16%): $160
Retención (75%): $160 × 0.75 = $120
```

### 3.3 Crear Retención IVA 100%

```bash
curl -X POST "$API_URL/withholding/iva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ID'",
    "retentionPercentage": 100,
    "seriesId": "'$SERIES_IVA_ID'",
    "notes": "Retención IVA 100% - Contribuyente especial"
  }'
```

**Nota:** Este debería FALLAR porque ya existe una retención IVA para esta factura.

**Resultado esperado:**
```json
{
  "statusCode": 400,
  "message": "Ya existe una retención IVA para esta factura"
}
```

### 3.4 Emitir Retención IVA

```bash
curl -X POST "$API_URL/withholding/$RETENTION_IVA_75_ID/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fiscalInfo": {
      "period": "2024-01",
      "declarationNumber": "DEC-IVA-2024-001"
    }
  }'
```

**Resultado esperado:**
```json
{
  "_id": "...",
  "status": "issued",
  "issueDate": "2024-01-15T...",
  "taxInfo": {
    "period": "2024-01",
    "declarationNumber": "DEC-IVA-2024-001"
  }
}
```

## 4. Pruebas de Retenciones ISLR

### 4.1 Obtener otra Factura para ISLR

```bash
# Listar facturas y elegir una diferente
curl -X GET "$API_URL/billing/documents?status=issued&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Guardar:** `INVOICE_ISLR_ID=<_id de otra factura>`

### 4.2 Crear Retención ISLR con Sustraendo

```bash
curl -X POST "$API_URL/withholding/islr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ISLR_ID'",
    "conceptCode": "H001",
    "conceptDescription": "Honorarios Profesionales",
    "retentionPercentage": 3,
    "seriesId": "'$SERIES_ISLR_ID'",
    "baseAmount": 5000,
    "sustraendo": 10,
    "notes": "Retención ISLR - Honorarios profesionales"
  }'
```

**Resultado esperado:**
```json
{
  "_id": "65ghi789...",
  "type": "islr",
  "documentNumber": "RET-ISLR-0001",
  "status": "draft",
  "islrRetention": {
    "conceptCode": "H001",
    "conceptDescription": "Honorarios Profesionales",
    "baseAmount": 5000,
    "retentionPercentage": 3,
    "retentionAmount": 140,
    "sustraendo": 10
  }
}
```

**Validación del cálculo:**
```
Base Imponible: $5,000
Porcentaje ISLR: 3%
Retención bruta: $5,000 × 0.03 = $150
Sustraendo: $10
Retención neta: $150 - $10 = $140 ✓
```

**Guardar:** `RETENTION_ISLR_ID=<_id de la retención>`

### 4.3 Crear Retención ISLR sin Sustraendo

```bash
curl -X POST "$API_URL/withholding/islr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ISLR_ID'",
    "conceptCode": "A002",
    "conceptDescription": "Alquileres",
    "retentionPercentage": 5,
    "seriesId": "'$SERIES_ISLR_ID'",
    "baseAmount": 2000,
    "notes": "Retención ISLR - Alquiler de local"
  }'
```

**Validación:**
```
Retención = $2,000 × 0.05 = $100
```

### 4.4 Emitir Retención ISLR

```bash
curl -X POST "$API_URL/withholding/$RETENTION_ISLR_ID/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fiscalInfo": {
      "period": "2024-01",
      "declarationNumber": "DEC-ISLR-2024-001"
    }
  }'
```

## 5. Consultas y Reportes

### 5.1 Listar Todas las Retenciones

```bash
curl -X GET "$API_URL/withholding" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.2 Filtrar Retenciones IVA

```bash
curl -X GET "$API_URL/withholding?type=iva" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.3 Filtrar Retenciones ISLR

```bash
curl -X GET "$API_URL/withholding?type=islr" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.4 Filtrar por Estado (Emitidas)

```bash
curl -X GET "$API_URL/withholding?status=issued" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.5 Filtrar por Período

```bash
curl -X GET "$API_URL/withholding?period=2024-01" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.6 Filtrar por Rango de Fechas

```bash
curl -X GET "$API_URL/withholding?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.7 Obtener Retención por ID

```bash
curl -X GET "$API_URL/withholding/$RETENTION_IVA_75_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.8 Obtener Retenciones de una Factura

```bash
curl -X GET "$API_URL/withholding/by-invoice/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.9 Calcular Totales de Retenciones de una Factura

```bash
curl -X GET "$API_URL/withholding/by-invoice/$INVOICE_ID/totals" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "totalIva": 120,
  "totalIslr": 0,
  "total": 120
}
```

## 6. Operaciones de Anulación

### 6.1 Anular una Retención

```bash
curl -X POST "$API_URL/withholding/$RETENTION_IVA_75_ID/cancel" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "_id": "...",
  "status": "archived",
  "documentNumber": "RET-IVA-0001"
}
```

### 6.2 Verificar que la Retención Anulada No Aparece en Listados

```bash
curl -X GET "$API_URL/withholding?type=iva&status=issued" \
  -H "Authorization: Bearer $TOKEN"
```

La retención anulada NO debe aparecer.

## 7. Validaciones de Negocio

### 7.1 Intentar Crear Retención sobre Factura en Borrador

1. Crear una factura en borrador (no emitida)
2. Intentar crear retención sobre ella:

```bash
curl -X POST "$API_URL/withholding/iva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "<id-factura-borrador>",
    "retentionPercentage": 75,
    "seriesId": "'$SERIES_IVA_ID'"
  }'
```

**Resultado esperado:**
```json
{
  "statusCode": 400,
  "message": "Solo se pueden aplicar retenciones a facturas emitidas"
}
```

### 7.2 Intentar Crear Retención con Serie Inexistente

```bash
curl -X POST "$API_URL/withholding/iva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ID'",
    "retentionPercentage": 75,
    "seriesId": "000000000000000000000000"
  }'
```

**Resultado esperado:**
```json
{
  "statusCode": 404,
  "message": "Serie no encontrada"
}
```

### 7.3 Intentar Crear Retención con Factura Inexistente

```bash
curl -X POST "$API_URL/withholding/iva" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "000000000000000000000000",
    "retentionPercentage": 75,
    "seriesId": "'$SERIES_IVA_ID'"
  }'
```

**Resultado esperado:**
```json
{
  "statusCode": 404,
  "message": "Factura no encontrada"
}
```

## 8. Pruebas de Integración con HKA Factory

### 8.1 Validar Formato JSON para HKA (Tipo 05 - IVA)

**Nota:** Esta prueba requiere que exista un método para exportar el JSON de HKA.

```bash
# TODO: Implementar endpoint GET /withholding/:id/hka-json
curl -X GET "$API_URL/withholding/$RETENTION_IVA_75_ID/hka-json" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado (estructura):**
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "05",
        "NumeroDocumento": "RET-IVA-0001",
        "FechaEmision": "15/01/2024",
        "HoraEmision": "10:30:00 am",
        "PeriodoImpositivoDesde": "01/01/2024",
        "PeriodoImpositivoHasta": "31/01/2024"
      },
      "Proveedor": { ... },
      "Beneficiario": { ... },
      "DocumentoAfectado": {
        "TipoDocumento": "01",
        "NumeroDocumento": "FAC-0001",
        "NumeroControl": "12345678"
      },
      "Totales": {
        "MontoBaseImponible": "1000.00",
        "MontoImpuesto": "160.00",
        "PorcentajeRetencion": "75",
        "MontoRetenido": "120.00"
      }
    },
    "DetallesRetencion": [...]
  }
}
```

### 8.2 Validar Formato JSON para HKA (Tipo 06 - ISLR)

```bash
# TODO: Implementar endpoint GET /withholding/:id/hka-json
curl -X GET "$API_URL/withholding/$RETENTION_ISLR_ID/hka-json" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "06"
      },
      "Totales": {
        "MontoBaseImponible": "5000.00",
        "PorcentajeRetencion": "3",
        "MontoRetenido": "140.00",
        "Sustraendo": "10.00"
      }
    }
  }
}
```

## 9. Casos de Borde y Edge Cases

### 9.1 Retención ISLR con Sustraendo Mayor que el Monto

```bash
curl -X POST "$API_URL/withholding/islr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ISLR_ID'",
    "conceptCode": "TEST",
    "conceptDescription": "Prueba sustraendo mayor",
    "retentionPercentage": 3,
    "seriesId": "'$SERIES_ISLR_ID'",
    "baseAmount": 100,
    "sustraendo": 200
  }'
```

**Resultado esperado:**
```json
{
  "islrRetention": {
    "retentionAmount": 0
  }
}
```

**Validación:** La retención debe ser 0 (no negativa).

### 9.2 Verificar Redondeo a 2 Decimales

Crear retención que genere decimales:

```bash
curl -X POST "$API_URL/withholding/islr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "affectedDocumentId": "'$INVOICE_ISLR_ID'",
    "conceptCode": "ROUND",
    "conceptDescription": "Prueba redondeo",
    "retentionPercentage": 3.33,
    "seriesId": "'$SERIES_ISLR_ID'",
    "baseAmount": 1000
  }'
```

**Validar:** Que `retentionAmount` tenga máximo 2 decimales.

## 10. Checklist de Validación Final

- [ ] Las retenciones IVA calculan correctamente 75% y 100%
- [ ] Las retenciones ISLR calculan correctamente con/sin sustraendo
- [ ] No se permiten retenciones IVA duplicadas en la misma factura
- [ ] Solo se permiten retenciones sobre facturas emitidas
- [ ] La numeración secuencial funciona correctamente
- [ ] Los filtros de búsqueda funcionan (tipo, status, período, fechas)
- [ ] Las retenciones se pueden emitir y anular
- [ ] El cálculo de totales por factura es correcto
- [ ] El formato JSON para HKA Factory es válido (tipos 05 y 06)
- [ ] Los campos de fecha y hora se formatean correctamente
- [ ] Los RIF se limpian y formatean correctamente
- [ ] La información fiscal (período, declaración) se guarda correctamente

## 11. Automatización con Script Bash

Para ejecutar todas las pruebas de forma automática, crear un archivo `test-retenciones.sh`:

```bash
#!/bin/bash

# Configuración
export API_URL="http://localhost:3000/api/v1"
export TOKEN="<tu-token>"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Función de test
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -n "Testing: $name... "

  response=$(curl -s -X $method "$API_URL$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data")

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
    echo "$response" | jq '.'
  else
    echo -e "${RED}✗${NC}"
  fi
}

# Ejecutar tests
echo "=== Iniciando pruebas de Retenciones ==="

test_endpoint "Crear serie IVA" "POST" "/billing/sequences" '{
  "documentType": "05",
  "prefix": "TEST-IVA",
  "startNumber": 1
}'

# ... más tests
```

## Notas Finales

- Todas las pruebas deben ejecutarse en un entorno de desarrollo/testing
- Verificar que los cálculos coincidan con las fórmulas fiscales venezolanas
- Revisar los logs del servidor para detectar errores no reportados en respuestas HTTP
- Validar que los índices de MongoDB estén creados correctamente
