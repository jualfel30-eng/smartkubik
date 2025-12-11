# Ejemplos de API (cURL) Multi-Warehouse

Base: `http://localhost:3000/api/v1` con token Bearer válido.

## Crear almacén
```bash
curl -X POST "$BASE/warehouses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Secundario","code":"SEC"}'
```

## Listar movimientos con filtros/paginación
```bash
curl -G "$BASE/inventory-movements" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=50" \
  --data-urlencode "movementType=OUT" \
  --data-urlencode "warehouseId=<warehouseId>" \
  --data-urlencode "dateFrom=2025-12-01" \
  --data-urlencode "dateTo=2025-12-31"
```

## Crear movimiento manual (IN)
```bash
curl -X POST "$BASE/inventory-movements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "inventoryId":"<invId>",
        "movementType":"IN",
        "quantity":25,
        "unitCost":3.5,
        "warehouseId":"<warehouseId>",
        "reason":"Reabastecimiento"
      }'
```

## Crear regla de alerta (por almacén)
```bash
curl -X POST "$BASE/inventory-alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "productId":"<productId>",
        "warehouseId":"<warehouseId>",
        "minQuantity":10,
        "isActive":true
      }'
```

## Listar alertas
```bash
curl -G "$BASE/inventory-alerts" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=50" \
  --data-urlencode "productId=<productId>" \
  --data-urlencode "warehouseId=<warehouseId>"
```

## Resumen de stock por producto/almacén
```bash
curl -G "$BASE/inventory/stock-summary" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=100"
```

## Transferencia manual entre almacenes (patrón OUT+IN)
```bash
REF="transfer-001"

# OUT desde GEN
curl -X POST "$BASE/inventory-movements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "inventoryId":"<invId-gen>",
        "movementType":"OUT",
        "quantity":10,
        "unitCost":0,
        "warehouseId":"<warehouseIdGEN>",
        "reason":"'$REF'"
      }'

# IN hacia SEC
curl -X POST "$BASE/inventory-movements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "inventoryId":"<invId-sec>",
        "movementType":"IN",
        "quantity":10,
        "unitCost":0,
        "warehouseId":"<warehouseIdSEC>",
        "reason":"'$REF'"
      }'
```
