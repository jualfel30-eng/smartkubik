# Próximos Pasos - E2E Tests Inventory

## 🎯 Estado Actual: 136/200 tests passing (68%)

### ✅ Completado Exitosamente

1. **Rate Limiting Resuelto** - Filesystem cache compartido
2. **Live Server Architecture** - NO bootstrap de Nest en Jest
3. **200 Tests E2E** - Cobertura completa de módulo Inventario
4. **Documentación Completa** - README.md + RESULTS.md

### 🔬 Problemas Identificados para Resolución

#### Alta Prioridad 🔥

##### 1. Purchase Order Workflow - POST `/purchases` Intermitente (20+ tests affected)

**Síntomas**:
- Flow 1 Step 4: POST `/purchases` con `supplierId` existente → 404
- Flow 2 Step 2: POST `/purchases` con `newSupplierName` → ✅ Pasa
- Approve/Receive steps fallan (porque PO no se creó)

**Análisis**:
- El endpoint existe y está registrado
- El DTO factory genera payloads válidos
- Posibles causas:
  1. `supplierId` generado en Step 1-3 no es válido para el tenant
  2. Token pierde permisos entre steps
  3. Issue con validación de `supplierId` en backend
  4. Race condition o timing issue

**Pasos para Debug**:
```bash
# Correr solo Flow 1 para aislar el problema
jest --config ./test/jest-e2e.json -t "Flow 1: Full Purchase Cycle" --runInBand --verbose

# Agregar logs en test para ver el supplierId generado
console.log('Supplier ID:', supplierId);
console.log('Product ID:', productId);
console.log('DTO:', JSON.stringify(dto, null, 2));

# Verificar en backend si el supplierId existe
# Revisar logs del controller en backend: "[PurchasesController] POST /purchases called"
```

**Solución Propuesta**:
1. Verificar en `purchases.service.ts` la validación de `supplierId`
2. Si no existe, devolver 400 Bad Request, NO 404
3. Agregar validación `@IsMongoId()` en el DTO (ya existe, verificar que funcione)
4. Posible fix: El supplierId debe ser ObjectId válido Y pertenecer al tenant

##### 2. Inventory Lots & Reservations - DTO Validation Issues (8 tests affected)

**Síntomas**:
- Tests de `04-inventory.e2e-spec.ts` fallan con validation errors
- Lots, reservations endpoints rechazan payloads válidos

**Análisis**:
- DTOs tienen validaciones muy estrictas
- Campos opcionales están siendo requeridos
- Falta documentación de qué campos son realmente necesarios

**Pasos para Debug**:
```bash
# Correr solo inventory tests
jest --config ./test/jest-e2e.json test/e2e/inventory/04-inventory.e2e-spec.ts --runInBand --verbose

# Revisar error específico
# Buscar en output: "message": [...validation errors...]
```

**Solución Propuesta**:
1. Revisar `inventory.dto.ts` para lots/reservations
2. Hacer campos opcionales con `@IsOptional()`
3. Documentar en JSDoc qué campos son obligatorios
4. Ajustar test factories para incluir todos los campos requeridos

#### Media Prioridad ⚠️

##### 3. Transfer Discrepancy Logic No Implementada (6 tests affected)

**Síntomas**:
- Flow 6: Ship 50 units, Receive 45 units → No marca discrepancia
- Campo `hasDiscrepancies` siempre `false`
- Campo `discrepancies[]` siempre vacío

**Análisis**:
- Lógica de comparación `shippedQuantity` vs `receivedQuantity` no existe
- El endpoint `/transfer-orders/:id/receive` no calcula discrepancias

**Solución Propuesta**:
```typescript
// En transfer-orders.service.ts, método receive()
for (const item of receivedItems) {
  const shipped = shippedItems.find(s => s.productId.equals(item.productId));
  if (shipped && item.receivedQuantity !== shipped.shippedQuantity) {
    transferOrder.hasDiscrepancies = true;
    transferOrder.discrepancies.push({
      productId: item.productId,
      productName: item.productName,
      expectedQuantity: shipped.shippedQuantity,
      receivedQuantity: item.receivedQuantity,
      difference: item.receivedQuantity - shipped.shippedQuantity,
      reason: item.discrepancyReason || 'No especificado',
    });
  }
}
```

##### 4. Inventory Query by Warehouse Inconsistente (2 tests affected)

**Síntomas**:
- `GET /inventory?warehouseId=X` devuelve array vacío
- Pero el inventory SÍ se creó (se puede ver en MongoDB)

**Análisis**:
- Query filter por `warehouseId` no funciona correctamente
- Posible issue: warehouseId se guarda como String pero query usa ObjectId

**Solución Propuesta**:
```typescript
// En inventory.service.ts
// ANTES:
const query = { warehouseId };

// DESPUÉS:
const query = {
  warehouseId: typeof warehouseId === 'string'
    ? new Types.ObjectId(warehouseId)
    : warehouseId
};
```

#### Baja Prioridad 📝

##### 5. Product Search con Caracteres Especiales

**Síntomas**:
- `GET /products?search=Atún` → 400 Bad Request
- Search con caracteres ASCII funciona

**Solución**:
```typescript
// En products.controller.ts o products.service.ts
const searchTerm = decodeURIComponent(search);
// O usar proper URL encoding en el test
const res = await authGet(ctx, `/products?search=${encodeURIComponent('Atún')}`);
```

##### 6. Product GET con ID Inválido devuelve 200

**Síntomas**:
- `GET /products/invalid-mongo-id` → 200 con array vacío
- Debería ser 404 Not Found

**Solución**:
```typescript
// En products.controller.ts
@Get(':id')
async findOne(@Param('id') id: string) {
  if (!isValidObjectId(id)) {
    throw new NotFoundException('Invalid product ID format');
  }
  const product = await this.productsService.findOne(id);
  if (!product) {
    throw new NotFoundException('Product not found');
  }
  return product;
}
```

##### 7. Bulk Product Creation Endpoint

**Síntomas**:
- `POST /products/bulk` → 404

**Solución**:
- Implementar endpoint o documentar que no existe
- Si existe con otro path, actualizar test

### 📋 Plan de Acción Recomendado

#### Sprint 1: Llegar a 80%+ passing (Semana 1)

**Día 1-2**: Purchase Order Workflow
- [ ] Debug Flow 1 Step 4 con logs detallados
- [ ] Identificar por qué supplierId causa 404
- [ ] Fix validación en backend
- [ ] Verificar approve/receive workflow
- **Impacto**: +15% (30 tests)

**Día 3-4**: Inventory DTOs
- [ ] Revisar y documentar todos los DTOs de inventory
- [ ] Hacer campos opcionales donde corresponda
- [ ] Ajustar test factories
- [ ] Correr tests de inventory hasta 100%
- **Impacto**: +4% (8 tests)

**Día 5**: Code Review & Testing
- [ ] Correr suite completo
- [ ] Verificar que no se rompió nada
- [ ] Actualizar documentación
- **Meta**: 85% passing rate

#### Sprint 2: Llegar a 90%+ passing (Semana 2)

**Día 1-2**: Transfer Discrepancy Logic
- [ ] Implementar lógica de discrepancias
- [ ] Agregar campo `hasDiscrepancies` al schema si no existe
- [ ] Agregar campo `discrepancies[]` al schema
- [ ] Actualizar tests
- **Impacto**: +3% (6 tests)

**Día 3**: Inventory Query Fix
- [ ] Revisar query por warehouseId
- [ ] Fix ObjectId vs String comparison
- [ ] Agregar test unitario para este query
- **Impacto**: +1% (2 tests)

**Día 4**: Refinements
- [ ] Product search UTF-8
- [ ] Product GET 404 fix
- [ ] Documentar bulk endpoint
- **Impacto**: +1.5% (3 tests)

**Día 5**: Final Testing
- [ ] Suite completo con --runInBand
- [ ] Verificar estabilidad (correr 3 veces)
- [ ] Actualizar RESULTS.md
- **Meta**: 90%+ passing rate

### 🔍 Debugging Toolkit

#### Correr un Solo Test
```bash
jest --config ./test/jest-e2e.json -t "Step 4: Create purchase order" --runInBand --verbose
```

#### Correr un Solo Archivo
```bash
jest --config ./test/jest-e2e.json test/e2e/inventory/90-integration-flows.e2e-spec.ts --runInBand
```

#### Ver Requests HTTP
```bash
DEBUG=supertest npm run test:e2e:inventory
```

#### Regenerar Auth Token
```bash
rm .test-auth-cache.json && npm run test:e2e:inventory
```

#### Ver Logs del Backend
```bash
# En otra terminal con el servidor corriendo
tail -f backend.log | grep -E "(PurchasesController|InventoryController|TransferController)"
```

### 📊 Tracking de Progreso

Actualizar este archivo después de cada fix:

| Problema | Tests Affected | Status | Completado |
|----------|----------------|--------|------------|
| PO Workflow | 30 | 🔴 Pendiente | __ / __ / 2026 |
| Inventory DTOs | 8 | 🔴 Pendiente | __ / __ / 2026 |
| Transfer Discrepancy | 6 | 🔴 Pendiente | __ / __ / 2026 |
| Inventory Query | 2 | 🔴 Pendiente | __ / __ / 2026 |
| Product Search UTF-8 | 1 | 🔴 Pendiente | __ / __ / 2026 |
| Product GET 404 | 1 | 🔴 Pendiente | __ / __ / 2026 |
| Bulk Products | 1 | 🔴 Pendiente | __ / __ / 2026 |

**Meta Final**: 180+/200 tests passing (90%+)

### 📞 Soporte

Si encuentras issues bloqueantes:
1. Documenta el error exacto (screenshot + log)
2. Corre el test individual con `--verbose`
3. Verifica logs del backend
4. Revisa RESULTS.md para contexto adicional

---

**Última actualización**: 2026-03-25
**Autor**: E2E Test Suite Implementation
**Estado**: 🟢 68% passing, roadmap definido
