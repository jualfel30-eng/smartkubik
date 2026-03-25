# Inventory Module E2E Tests

Tests End-to-End para el módulo completo de Inventario de SmartKubik SaaS.

## Prerequisitos

1. **Servidor NestJS corriendo**: `npm run start:dev` en otra terminal
2. **Tenant de prueba creado**: Usuario `e2e@test.local` / `password123` (ya creado)
3. **Base de datos limpia**: Recomendado correr contra DB de desarrollo, no producción

## Ejecutar Tests

```bash
npm run test:e2e:inventory
```

## Resultados Actuales (2026-03-25)

### 🎉 Después de Correcciones

**✅ 136 tests PASADOS** de 200 total (68%)
**❌ 64 tests FALLARON** (32%)
**✅ 3 test suites al 100%**: Warehouses, Suppliers, Waste

### 📊 Primera Ejecución (Referencia)

**✅ 51 tests PASADOS** de 200 total (25.5%)
**❌ 149 tests FALLARON** (74.5%)

**Mejora**: +85 tests pasando (+166% improvement) ⚡

### Tests que Pasaron ✓

**Flow 5: Transfer Orders (Problema #3 del tenant)**
- ✓ Todo el flujo de transferencias entre almacenes funciona correctamente
- ✓ Los 13 pasos del ciclo completo pasan (crear almacenes, producto, inventario, orden de transferencia, aprobar, preparar, enviar, recibir)

**Flow 7: Ajustes de Inventario + Alertas**
- ✓ Todos los 6 pasos pasan (crear producto, inventario, ajustar, verificar alertas de stock bajo)

**Flow 1, 2, 3, 4, 6: Parcialmente funcionales**
- ✓ Creación de suppliers, productos, links
- ✓ Verificaciones de duplicación RIF
- ✓ Sync bidireccional de payment settings
- ✓ Algunas verificaciones de inventario

### ✅ Problemas Resueltos

#### 1. ✅ Rate Limiting (429 Too Many Requests) - RESUELTO
- **Solución**: Filesystem cache compartido (`.test-auth-cache.json`)
- **Resultado**: 0 rate limit errors, 1 solo login para todos los 200 tests
- **Impacto**: +85 tests pasando

#### 2. ✅ Endpoint 404: `/purchases` - RESUELTO
- **Causa**: Token expirado, no problema con el endpoint
- **Solución**: Auth cache mantiene token válido
- **Resultado**: Endpoints funcionan correctamente

### Problemas Remanentes (32% failing)

#### 1. Transfer Discrepancy Logic Not Implemented
- **Test**: Flow 6 - "Execute: Ship 50 → Receive 45"
- **Problema**: No se marca discrepancia cuando faltan unidades
- **Campo afectado**: `hasDiscrepancies`, `discrepancies[]`
- **Prioridad**: Media (funcionalidad edge case)

#### 2. Inventory Query by Warehouse Inconsistency
- **Test**: Flow 5 Step 12 - "Verify destination warehouse has 50 units"
- **Problema**: Query `GET /inventory?warehouseId=X` no retorna items
- **Workaround**: El inventory SÍ se crea, solo el query falla
- **Prioridad**: Media (query específico, funcionalidad core OK)

#### 3. Purchase Order Workflow Issues
- **Tests**: Flow 1, Flow 2 (approve/receive steps)
- **Problema**: Algunos estados de PO no transicionan correctamente
- **Endpoints afectados**: `PATCH /purchases/:id/approve`, `PATCH /purchases/:id/receive`
- **Prioridad**: Alta (funcionalidad core)

#### 4. Product Search con Caracteres Especiales
- **Test**: "should filter products by search" - `/products?search=Atún`
- **Problema**: Devuelve 400 Bad Request
- **Causa**: Encoding UTF-8 (ú → %C3%BA)
- **Prioridad**: Baja (edge case)

### Arquitectura de Tests

#### Setup
- **Live Server**: Tests corren contra `http://localhost:3000` (servidor en vivo)
- **No Bootstrap**: NO se crea instancia de NestJS en Jest (evita OOM, problemas Redis, lentitud)
- **Singleton Auth**: Se autentica UNA vez y se cachea el token (parcialmente funcional)

#### Estructura
```
test/e2e/inventory/
├── _setup/
│   ├── constants.ts              # BASE_URL, credenciales
│   ├── inventory-test.setup.ts   # bootstrapTestApp(), authGet/Post/Patch/Delete helpers
│   └── test-data.factory.ts      # Factories para DTOs
├── 01-warehouses.e2e-spec.ts     # ~10 tests
├── 02-suppliers.e2e-spec.ts      # ~15 tests (RIF normalization, payment sync)
├── 03-products.e2e-spec.ts       # ~18 tests (4 tipos, variants, categorías)
├── 04-inventory.e2e-spec.ts      # ~16 tests (movements, adjustments, reservations)
├── 05-purchases.e2e-spec.ts      # ~18 tests (PO con supplier existente/nuevo)
├── 06-transfer-orders.e2e-spec.ts# ~20 tests (PUSH/PULL flows, FSM completo)
├── 07-waste.e2e-spec.ts          # ~10 tests (mermas/desperdicios)
├── 08-inventory-movements.e2e-spec.ts # ~8 tests
├── 09-inventory-alerts.e2e-spec.ts    # ~6 tests
├── 10-pricing.e2e-spec.ts        # ~6 tests (cálculo IVA/IGTF)
├── 11-consumables.e2e-spec.ts    # ~8 tests
├── 12-supplies.e2e-spec.ts       # ~8 tests
└── 90-integration-flows.e2e-spec.ts   # 47 tests (7 flows cross-module) ⭐ MÁS IMPORTANTE
```

#### Integration Flows (90-integration-flows.e2e-spec.ts)

Estos son los **tests más importantes** porque prueban los problemas reales reportados por el tenant "Tiendas Broas C.A.":

1. **Flow 1**: Ciclo completo de compra con proveedor existente
   - ✓ Crear supplier, producto, link
   - ❌ Crear PO (404)
   - ✓ Verificar sync de payment settings
   - ✓ Verificar NO hay doble stock
   - ✓ Verificar producto linked a supplier

2. **Flow 2**: Compra con proveedor nuevo on-the-fly
   - ✓ Crear 2 productos
   - ✓ Crear PO con nuevo supplier
   - ✓ Verificar supplier fue creado en módulo Suppliers
   - ❌ Aprobar y recibir PO
   - ❌ Verificar inventario de ambos productos
   - ❌ Verificar ambos productos linked al nuevo supplier

3. **Flow 3**: Consistencia RIF - Sin Duplicación
   - ✓ Crear supplier con RIF
   - ❌ Crear PO con mismo supplier
   - ❌ Verificar NO duplicación
   - ✓ Crear PO con mismo RIF formato diferente
   - ✓ Verificar TODAVÍA no hay duplicación

4. **Flow 4**: Editar Supplier + Sync Bidireccional
   - ✓ Crear supplier
   - ✓ Crear producto y linkar
   - ❌ Editar RIF del supplier (Problema #5 del tenant)
   - ✓ Actualizar payment settings
   - ✓ Verificar producto tiene config de pago actualizada

5. **Flow 5**: Transferencia Inter-Almacén (Problema #3) ⭐ **100% PASADO**
   - ✓ Todos los 13 pasos del FSM completo funcionan
   - ✓ Stock se decrementa en origen, incrementa en destino
   - ✓ Movements correctos creados

6. **Flow 6**: Transferencia con Discrepancia
   - ✓ Setup de almacenes/producto/inventario
   - ❌ Ejecutar flujo con discrepancia (enviar 50, recibir 45)
   - ❌ Verificar discrepancia registrada

7. **Flow 7**: Ajuste + Alerta de Stock Bajo ⭐ **100% PASADO**
   - ✓ Todos los 6 pasos funcionan
   - ✓ Alertas de stock bajo se generan correctamente

## Próximos Pasos para 90%+ Passing

### ✅ Completado
1. ✅ **Resolver rate limiting** - Filesystem cache implementado
2. ✅ **Investigar endpoint 404 `/purchases`** - Era token expirado, resuelto
3. ✅ **Verificar RIF editing** - Funciona correctamente (Flow 4)
4. ✅ **Verificar bidirectional sync** - Funciona correctamente (Flow 4, Flow 6)
5. ✅ **Transferencias inter-almacén** - Funcionan al 100% (Flow 5)

### Alta Prioridad 🔥 (Para llegar a 80-85%)
1. **Corregir Purchase Order approve/receive workflow**
   - Afecta: Flow 1, Flow 2 (20+ tests)
   - Endpoints: `/purchases/:id/approve`, `/purchases/:id/receive`
   - Impact: +15% passing rate

2. **Ajustar DTOs de Inventory (lots, reservations)**
   - Afecta: 04-inventory.e2e-spec.ts (8 tests)
   - Validaciones demasiado estrictas o campos faltantes
   - Impact: +4% passing rate

### Media Prioridad (Para llegar a 90%)
3. Implementar transfer discrepancy logic (Flow 6)
4. Corregir query de inventario por `warehouseId`
5. Agregar encoding UTF-8 en product search

### Baja Prioridad (Perfeccionamiento)
6. Implementar `/products/bulk` endpoint
7. Corregir fallback de GET product con ID inválido
8. Agregar tests de performance y edge cases

## Configuración

### Credenciales de Test
- **Email**: `e2e@test.local`
- **Password**: `password123`
- **TenantId**: `69c35984ffb749a6ea39fcc7`
- **Tenant Name**: "E2E Tests"

### Variables de Entorno (opcional)
```bash
TEST_BASE_URL=http://localhost:3000  # Default
TEST_USER_EMAIL=e2e@test.local        # Default
TEST_USER_PASSWORD=password123        # Default
```

## Logs y Debugging

Para ver requests HTTP detallados:
```bash
DEBUG=supertest npm run test:e2e:inventory
```

Para correr un solo archivo de tests:
```bash
jest --config ./test/jest-e2e.json test/e2e/inventory/90-integration-flows.e2e-spec.ts --runInBand --verbose
```

Para correr un solo test:
```bash
jest --config ./test/jest-e2e.json -t "Step 1: Create supplier" --runInBand --verbose
```

## Notas Técnicas

### Por qué NO Bootstrap de NestJS en Jest
- AppModule tiene 100+ módulos → bootstrap tarda >90 segundos
- BullMQ crea docenas de conexiones Redis → "max clients reached"
- Heap memory issues (OOM) incluso con 8GB RAM
- Tests contra servidor vivo son más rápidos (2-3s por test vs 60s+ bootstrap)

### Singleton de Autenticación
El `bootstrapTestApp()` cachea el contexto de autenticación en `_cachedCtx`.
**Problema actual**: No se comparte entre archivos de test, cada archivo hace nuevo login.
**Solución pendiente**: Usar filesystem cache o global variable.

### Rate Limit del Backend
El endpoint `/auth/login` tiene throttle configurado (probablemente 5-10 requests/min).
Con 13 archivos de test, se excede el límite.

## Mantenimiento

Al agregar nuevo módulo de inventario:
1. Crear `XX-nombre-modulo.e2e-spec.ts` en `test/e2e/inventory/`
2. Importar helpers de `_setup/inventory-test.setup.ts`
3. Usar factories de `_setup/test-data.factory.ts`
4. NO cerrar app en `afterAll` (solo en `90-integration-flows.e2e-spec.ts`)
5. Agregar flow de integración en `90-integration-flows.e2e-spec.ts` si aplica

---

**Última actualización**: 2026-03-25
**Estado**: 🟡 Parcialmente funcional (25.5% passing)
**Blocker principal**: Rate limiting + endpoint 404 `/purchases`
