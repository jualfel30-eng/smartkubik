# ROADMAP DE TESTING: PLAN COMPLETO

**Fecha de Creación:** Diciembre 3, 2025
**Última Actualización:** Diciembre 5, 2025
**Estado Actual:** 21.2% cobertura de services (24/113)
**Objetivo:** 80% cobertura en 12 semanas
**Progreso Week 1:** ✅ COMPLETADA - 91 tests pasando
**Progreso Week 2:** ✅ COMPLETADA - 55 tests pasando

---

## 📊 ESTADO ACTUAL

### Inventario de Tests Existentes

#### ✅ Tests Unitarios Implementados (18)

| Módulo | Archivo | Líneas | Estado |
|--------|---------|--------|--------|
| **Core** | | | |
| Tenant | `tenant.service.spec.ts` | ~100 | ✅ Completo |
| Tenant Controller | `tenant.controller.spec.ts` | ~80 | ✅ Completo |
| SuperAdmin | `super-admin.service.spec.ts` | ~120 | ✅ Completo |
| SuperAdmin Controller | `super-admin.controller.spec.ts` | ~90 | ✅ Completo |
| **Finanzas** | | | |
| Payments | `test/payments/payments.service.spec.ts` | ~378 | ✅ Completo (12 tests) |
| Bank Accounts | `modules/bank-accounts/bank-accounts.service.spec.ts` | ~430 | ✅ Completo (16 tests) |
| Bank Transactions | `modules/bank-accounts/bank-transactions.service.spec.ts` | ~412 | ✅ Completo (10 tests) |
| Bank Reconciliation | `modules/bank-reconciliation/bank-reconciliation.service.spec.ts` | ~500 | ✅ Completo (12 tests) |
| Exchange Rate | `modules/exchange-rate/exchange-rate.service.spec.ts` | ~152 | ✅ Completo (5 tests) |
| Accounting | `test/unit/accounting.service.spec.ts` | ~150 | ✅ Completo |
| Payables | `modules/payables/payables.service.spec.ts` | ~180 | ✅ Completo |
| Payables Controller | `modules/payables/payables.controller.spec.ts` | ~120 | ✅ Completo |
| **Inventario** | | | |
| Consumables | `modules/consumables/consumables.service.spec.ts` | ~150 | ✅ Completo |
| Consumables Listener | `modules/consumables/consumables.listener.spec.ts` | ~100 | ✅ Completo |
| Supplies | `modules/supplies/supplies.service.spec.ts` | ~130 | ✅ Completo |
| **Producción** | | | |
| Bill of Materials | `modules/production/bill-of-materials.service.spec.ts` | ~140 | ✅ Completo |
| Manufacturing Order | `modules/production/manufacturing-order.service.spec.ts` | ~160 | ✅ Completo |
| Routing | `modules/production/routing.service.spec.ts` | ~120 | ✅ Completo |
| **Órdenes** | | | |
| Orders | `modules/orders/orders.service.spec.ts` | ~180 | ✅ Completo |
| **Nómina** | | | |
| Payroll Engine | `test/unit/payroll-engine.service.spec.ts` | ~250 | ✅ Completo |

#### ✅ Tests de Integración (1)

| Test | Archivo | Cobertura |
|------|---------|-----------|
| Rate Limiting | `test/integration/rate-limiting.spec.ts` | ✅ Completo |

#### ✅ Tests E2E (3)

| Test | Archivo | Cobertura |
|------|---------|-----------|
| Assistant (IA) | `test/e2e/assistant.e2e.spec.ts` | ✅ Completo |
| CSP Headers | `test/e2e/csp-headers.spec.ts` | ✅ Completo |
| Ownership Validation | `test/e2e/ownership-validation.spec.ts` | ✅ Completo |

#### ✅ Tests de Seguridad (1)

| Test | Archivo | Cobertura |
|------|---------|-----------|
| Sanitization | `test/unit/sanitization.spec.ts` | ✅ Completo |

**Total Existente:** 23 archivos de test, ~4,292 líneas de tests
**Total Tests Pasando:** 146 tests (91 Week 1 + 55 Week 2)

---

## 🎯 OBJETIVOS POR FASE

### Meta General
- **Cobertura de Services:** 21.2% → 80% (24/113 services)
- **Cobertura de Líneas:** ~8% → 70%
- **Duración:** 12 semanas (3 fases de 4 semanas)
- **Esfuerzo:** 2-3 horas/día de trabajo en tests
- **Progreso Actual:** Week 1 ✅ + Week 2 ✅ (2/12 semanas completadas)

### Principios de Priorización

1. **Criticidad de Negocio:** Módulos que impactan dinero, datos sensibles o workflows críticos
2. **Complejidad:** Módulos con lógica compleja que puede romper fácilmente
3. **Frecuencia de Cambio:** Módulos que se modifican seguido necesitan tests primero
4. **Dependencias:** Módulos que son dependidos por muchos otros

---

## 📅 FASE 1: MÓDULOS CRÍTICOS (Semanas 1-4)

**Objetivo:** Cubrir los 25 services más críticos del sistema
**Cobertura esperada:** 11.5% → 33%

### Semana 1: Autenticación & Multi-Tenancy (6 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests Creados | Estado |
|----------|--------|---------|------------|--------|---------------|--------|
| 🔴 P0 | Auth | `auth.service.ts` | CRÍTICA | ~450 | 20 test cases | ✅ 20/20 (100%) |
| 🔴 P0 | Auth | `token.service.ts` | CRÍTICA | ~200 | 13 test cases | ✅ 13/13 (100%) |
| 🔴 P0 | Memberships | `memberships.service.ts` | CRÍTICA | ~222 | 20 test cases | ✅ 20/20 (100%) |
| 🟡 P1 | Roles | `roles.service.ts` | ALTA | ~180 | 16 test cases | ✅ 16/16 (100%) |
| 🟡 P1 | Permissions | `permissions.service.ts` | ALTA | ~160 | 12 test cases | ✅ 12/12 (100%) |
| 🟡 P1 | Onboarding | `onboarding.service.ts` | ALTA | ~300 | 10 test cases | ✅ 10/10 (100%) |

**Estado Week 1:** ✅ **COMPLETADA** - 6/6 services con tests (100%)

**Test Cases Clave:**
```typescript
// auth.service.spec.ts
✅ Login exitoso con credenciales válidas
✅ Login fallido con password incorrecto
✅ Creación de usuario y tenant default
✅ Registro con email duplicado (debe fallar)
✅ Switch tenant con membresía válida
✅ Switch tenant sin membresía (debe fallar)
✅ Token refresh válido
✅ Token refresh expirado (debe fallar)

// memberships.service.spec.ts
✅ Obtener membresías activas de usuario
✅ Crear membresía default si no existe
✅ Setear membresía como default
✅ Obtener membresía con usuario incorrecto (debe fallar)
✅ BuildMembershipSummary con populate

// token.service.spec.ts
✅ Generar access token válido
✅ Generar refresh token válido
✅ Validar token expirado
✅ Revocar token correctamente
```

---

### Semana 2: Pagos & Conciliación Bancaria (5 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests Creados | Estado |
|----------|--------|---------|------------|--------|---------------|--------|
| 🔴 P0 | Payments | `payments.service.ts` | CRÍTICA | ~897 | 12 test cases (5+7) | ✅ 12/12 (100%) |
| 🔴 P0 | Bank Accounts | `bank-accounts.service.ts` | CRÍTICA | ~420 | 16 test cases | ✅ 16/16 (100%) |
| 🔴 P0 | Bank Transactions | `bank-transactions.service.ts` | CRÍTICA | ~350 | 10 test cases | ✅ 10/10 (100%) |
| 🟡 P1 | Bank Reconciliation | `bank-reconciliation.service.ts` | ALTA | ~450 | 12 test cases | ✅ 12/12 (100%) |
| 🟢 P2 | Exchange Rate | `exchange-rate.service.ts` | MEDIA | ~180 | 5 test cases | ✅ 5/5 (100%) |

**Estado Week 2:** ✅ **COMPLETADA** - 5/5 services con tests (100%)

**Test Cases Clave:**
```typescript
// payments.service.spec.ts (expandido)
✅ Validación de referencia requerida para bank accounts
✅ Validación de referencia para métodos de pago (pago_movil, transferencia, pos)
✅ Auto-reconciliación cuando PAYMENTS_AUTO_RECONCILE=true
✅ Validación de reconciliación manual/rechazada con notas
✅ Marcar pago como reconciliado (status=matched)
✅ getSummary: agregación por método de pago
✅ getSummary: filtrado por rango de fechas

// bank-accounts.service.spec.ts (16 tests)
✅ Crear cuenta bancaria con alertEnabled y minimumBalance
✅ findAll: cuentas activas vs todas las cuentas
✅ findOne: éxito y NotFoundException
✅ update: éxito y NotFoundException
✅ delete: éxito y NotFoundException
✅ adjustBalance: incremento y decremento
✅ updateBalance usando operador $inc
✅ getTotalBalance: todas las cuentas y filtrado por currency
✅ getBalancesByCurrency: agrupación y resultado vacío

// bank-transactions.service.spec.ts (10 tests)
✅ findById: encontrado y no encontrado
✅ createTransaction con balance actualizado
✅ recordPaymentMovement: sale como crédito
✅ recordPaymentMovement: payable como débito
✅ markAsReconciled con actualización de payment
✅ markAsPending para deshacer reconciliación
✅ createTransfer: transacciones débito y crédito duales
✅ listTransactions: con filtros/paginación y búsqueda de texto

// bank-reconciliation.service.spec.ts (12 tests)
✅ createBankStatement con transacciones
✅ getBankStatement: encontrado y NotFoundException
✅ listBankStatements con paginación
✅ startReconciliation: iniciar proceso nuevo
✅ getReconciliation: encontrado y NotFoundException
✅ matchTransaction: vincular statement con bank transaction
✅ unmatchTransaction: desvincular transacción previamente matched
✅ completeReconciliation: finalizar proceso
✅ manualReconcile: reconciliación manual con metadata

// exchange-rate.service.spec.ts (5 tests)
✅ Retornar tasa cacheada cuando es válida
✅ Fetch de primera API cuando caché expiró
✅ Fallback a segunda API cuando primera falla
✅ Retornar caché antiguo cuando todas las APIs fallan
✅ Retornar tasa de fallback sin caché disponible
```

---

### Semana 3: Contabilidad & Reportes (6 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🔴 P0 | Accounting | *(ya tiene tests)* | CRÍTICA | ~1268 | Expandir +8 casos (**✅ 9/8 listos**) |
| 🔴 P0 | Journal Entries | (parte de accounting) | CRÍTICA | - | Incluido en Accounting ✅ |
| 🟡 P1 | Chart of Accounts | (parte de accounting) | ALTA | - | Incluido en Accounting ✅ |
| 🟡 P1 | Financial Reports | `accounting.service.ts` (P&L / Balance / Cash Flow) | ALTA | ~520 | 8-10 test cases (**⏳ 5/8**) |
| 🟢 P2 | Tax Settings | *(service no existe aún)* | MEDIA | ~180 | 4-5 test cases (**⚠️ crear service**) |
| 🟢 P2 | Fiscal Year | *(service no existe aún)* | MEDIA | ~150 | 4-5 test cases (**⚠️ crear service**) |

**Test Cases Clave:**
```typescript
// accounting.service.spec.ts (ya implementado Week 3)
✅ createJournalEntryForPayment genera líneas correctas y saldo IGTF
✅ createJournalEntryForPayablePayment genera líneas correctas
✅ createJournalEntryForPayrollRun agrega líneas agregadas por concepto
✅ Validar débitos = créditos (rechaza desbalance)
✅ findOrCreateAccount usa existente o crea system account
✅ Balance General (getBalanceSheet): activos/pasivos/patrimonio + verificación 0
✅ Estado de Resultados (getProfitAndLoss): ingresos, gastos, utilidad
✅ Flujo de Caja (getCashFlowStatement): inflows/outflows/net
✅ Asientos automáticos tienen isAutomatic=true

// financial reports pendientes (mismo AccountingService)
✅ Filtros por fecha: from/to (P&L y Cash Flow)
⏳ Filtros por currency: USD, VES
⏳ Comparación períodos: mes actual vs anterior

// Tax Settings / Fiscal Year
⚠️ No existen los services `tax-settings.service.ts` ni `fiscal-year.service.ts` en el código. Se requiere crearlos o ajustar alcance.
```

**Estado Week 3:** ⏳ **EN PROGRESO** — Accounting ampliado (9 casos nuevos). Reportes financieros básicos cubiertos; faltan filtros/comparaciones y crear/definir services de Tax Settings y Fiscal Year.

### Ajuste de alcance (Week 3)
- `tax-settings.service.ts` y `fiscal-year.service.ts` no están disponibles en el código actual. Su testing se pospone hasta que los módulos existan.
- Los casos faltantes de filtros/comparaciones de reportes financieros se retomarán cuando el servicio esté completo.

---

### Semana 4: Órdenes & Kitchen Display (6 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🔴 P0 | Orders | *(ya tiene tests)* | CRÍTICA | ~680 | Expandir +6 casos (**✅ 6/6**) |
| 🔴 P0 | Kitchen Display | `kitchen-display.service.ts` | CRÍTICA | ~320 | 8-10 test cases (**✅ 10/10**) |
| 🟡 P1 | Modifiers | `modifiers.service.ts` | ALTA | ~180 | 5-6 test cases (**✅ 5/5**) |
| 🟡 P1 | Modifier Groups | `modifier-groups.service.ts` | ALTA | ~220 | 6-7 test cases (**✅ 6/6**) |
| 🟡 P1 | Tables | `tables.service.ts` | ALTA | ~250 | 6-7 test cases (**✅ 6/6**) |
| 🟢 P2 | Split Bill | `bill-splits.service.ts` | MEDIA | ~280 | 5-6 test cases (**✅ 4/4**) |

**Test Cases Clave:**
```typescript
// kitchen-display.service.spec.ts
✅ createFromOrder mapea Order → KitchenOrder con modifiers e instrucciones
✅ Extrae modifiers de OrderItems
✅ Extrae specialInstructions de items
✅ Workflow: new → preparing → ready → completed/reopen
✅ Marcar urgente (priority asap)
✅ Calcular tiempos startedAt/prepTime/totalPrepTime
✅ Cancelar orden desde cocina
✅ Obtener órdenes por status y station
✅ Calcular estimatedPrepTime según items

// orders.service.spec.ts (expandir)
✅ Crear orden con modifiers aplicados
✅ Crear orden con split bill
✅ Actualizar paymentStatus: pending → partial → paid (registerPayments)
✅ Vincular payments array al recibir pago
✅ Validar ownership: orden pertenece a tenant correcto
✅ Calcular totalAmount incluyendo IGTF en pagos USD

// modifiers.service.spec.ts
✅ Crear modifier con priceAdjustment y group existente
✅ Validar error si el grupo no existe
✅ findAll por tenant
✅ update NotFound
✅ delete soft delete

// modifier-groups.service.spec.ts
✅ Crear modifier group con selectionType y validación min/max
✅ Obtener modifier groups por producto con modifiers
✅ Validar minSelections/maxSelections en update
✅ Soft delete + cascada en modifiers

// tables.service.spec.ts
✅ Crear table (duplica lanza error)
✅ Seat guests respeta capacity/disponibilidad
✅ Transferir mesa
✅ Clear → cleaning y auto available
✅ Combine tables con disponibilidad
✅ Update NotFound

// split-bill.service.spec.ts
✅ Validar order existente
✅ Crear split con montos y remainingBalance
✅ Registrar pago parcial de un split y marcar paid cuando se cubre
✅ Soft delete con tenant
```

**Resultado Fase 1 (Progreso Parcial - 2/4 semanas):**
- ✅ Week 1: 6 services completados (Auth & Multi-Tenancy)
- ✅ Week 2: 5 services completados (Pagos & Conciliación)
- ⏳ Week 3: 6 services pendientes (Contabilidad & Reportes)
- ✅ Week 4: 6 services completados (Órdenes & Kitchen Display)
- **Total Fase 1:** 11/25 services completados (44%)
- **Cobertura Actual:** 21.2% (24/113 services)
- **Líneas de tests:** ~4,292 líneas totales
- **Tests Pasando:** 146 tests

---

## 📅 FASE 2: MÓDULOS DE OPERACIONES (Semanas 5-8)

**Objetivo:** Cubrir 30 services de operaciones y verticales
**Cobertura esperada:** 33% → 60%

### Semana 5: Inventario & Productos (8 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟡 P1 | Inventory | `inventory.service.ts` | ALTA | ~480 | 8-10 test cases (**✅ en progreso: movimientos, soft delete, reactivación, not-found, movimiento con update, reserva/liberación, commit, ajuste, alertas**) |
| 🟡 P1 | Products | `products.service.ts` | ALTA | ~420 | 8-10 test cases (**✅ en progreso: límites plan, SKU duplicado, proveedor incompleto, findByBarcode, creación feliz, barcodes cross-product**) |
| 🟢 P2 | Unit Types | `unit-types.service.ts` | MEDIA | ~150 | 4-5 test cases (**✅ en progreso: duplicados, base unit, update, conversion, findOne/factor, findAll/categorías**) |
| ⚠️ | Stock Movements | *(no existe service)* | - | - | ⚠️ Crear o ajustar alcance |
| ⚠️ | Warehouses | *(no existe service)* | - | - | ⚠️ Crear o ajustar alcance |
| ⚠️ | Categories | *(no existe service)* | - | - | ⚠️ Crear o ajustar alcance |
| ⚠️ | Barcodes | *(no existe service)* | - | - | ⚠️ Crear o ajustar alcance |
| ⚠️ | Inventory Alerts | *(no existe service)* | - | - | ⚠️ Crear o ajustar alcance |

**Test Cases Clave:**
```typescript
// inventory.service.spec.ts
✅ Deducir inventario al crear orden (deductInventory)
✅ Reversar deducción al cancelar orden
✅ Validar stock insuficiente (debe fallar)
✅ Calcular stock disponible por warehouse
✅ Movimientos de entrada: purchase orders
✅ Movimientos de salida: órdenes, manufactura
✅ Ajustes de inventario: manual adjustments
✅ Obtener historial de movimientos

// products.service.spec.ts
✅ SKU único por tenant
✅ WeightSelling
✅ Filtros: categoría/status/vertical
✅ Búsqueda regex nombre/descripcion
✅ Barcodes únicos (variants)
✅ findByBarcode retorna variant y NotFound si no existe
✅ Update valida storage limit por imágenes
✅ Update valida barcodes contra otros productos

// stock-movements.service.spec.ts
✅ Registrar movimiento de entrada (type: IN)
✅ Registrar movimiento de salida (type: OUT)
✅ Registrar ajuste (type: ADJUSTMENT)
✅ Vincular con documento origen (orderId, purchaseOrderId)
✅ Calcular quantity_after correctamente
✅ Validar tenantId ownership
```

---

### Semana 6: Compras & Proveedores (7 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟡 P1 | Purchase Orders | `purchase-orders.service.ts` | ALTA | ~520 | 8-10 test cases |
| 🟡 P1 | Suppliers | `suppliers.service.ts` | ALTA | ~320 | 6-8 test cases |
| 🟢 P2 | Purchase Requisitions | `purchase-requisitions.service.ts` | MEDIA | ~280 | 6-7 test cases |
| 🟢 P2 | Supplier Products | `supplier-products.service.ts` | MEDIA | ~220 | 5-6 test cases |
| 🟢 P2 | Quotes | `quotes.service.ts` | MEDIA | ~260 | 5-6 test cases |
| 🟢 P2 | Receiving | `receiving.service.ts` | MEDIA | ~300 | 6-7 test cases |
| 🟢 P2 | RFQ (Request for Quote) | `rfq.service.ts` | MEDIA | ~240 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// purchase-orders.service.spec.ts
✅ Crear PO desde requisition
✅ Aprobar PO (status: draft → approved)
✅ Recibir PO (status: approved → received)
✅ Crear Payable automáticamente al recibir PO
✅ Actualizar inventario al recibir
✅ Cancelar PO
✅ Calcular totalAmount con taxes
✅ Vincular con supplier correcto

// suppliers.service.spec.ts
✅ Crear supplier con contactos
✅ Validar taxId único por país
✅ Gestionar términos de pago (paymentTerms)
✅ Rating de proveedor
✅ Historial de compras
✅ Productos preferidos por supplier
```

---

### Semana 7: Nómina (8 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟡 P1 | Payroll Runs | `payroll-runs.service.ts` | ALTA | ~680 | 10-12 test cases |
| 🟡 P1 | Payroll Structures | `payroll-structures.service.ts` | ALTA | ~520 | 8-10 test cases |
| 🟡 P1 | Payroll Absences | `payroll-absences.service.ts` | ALTA | ~380 | 7-8 test cases |
| 🟡 P1 | Payroll Engine | *(ya tiene tests)* | ALTA | ~820 | Expandir +5 casos |
| 🟡 P1 | Payroll Calendar | `payroll-calendar.service.ts` | ALTA | ~280 | 6-7 test cases |
| 🟢 P2 | Payroll Concepts | `payroll-concepts.service.ts` | MEDIA | ~220 | 5-6 test cases |
| 🟢 P2 | Payroll Reports | `payroll-reports.service.ts` | MEDIA | ~340 | 6-7 test cases |
| 🟢 P2 | Employee Benefits | `employee-benefits.service.ts` | MEDIA | ~260 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// payroll-runs.service.spec.ts
✅ Crear payroll run para período
✅ Calcular nómina con PayrollEngine
✅ Aplicar ausencias (descuentos)
✅ Aplicar concepts: salaries, bonos, deducciones
✅ Generar journal entry automática
✅ Pagar nómina (crear Payables por empleado)
✅ Cerrar payroll run (status: closed)
✅ Reabrir payroll run si necesario
✅ Validar no duplicar runs para mismo período

// payroll-structures.service.spec.ts
✅ Crear estructura de nómina (quincenal, mensual)
✅ Asignar employees a estructura
✅ Definir concepts por estructura
✅ Calcular salary base según structure
✅ Aplicar rules de cálculo (json-logic)
✅ Validar scope: tenant-level vs global

// payroll-absences.service.spec.ts
✅ Registrar ausencia: sick leave, vacation
✅ Aprobar/rechazar ausencia
✅ Calcular balance de días disponibles
✅ Aplicar descuento en payroll run
✅ Validar overlap de ausencias
```

---

### Semana 8: CRM & Clientes (7 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟡 P1 | Customers | `customers.service.ts` | ALTA | ~380 | 7-8 test cases |
| 🟡 P1 | Leads | `leads.service.ts` | ALTA | ~320 | 6-7 test cases |
| 🟢 P2 | Customer Addresses | `customer-addresses.service.ts` | MEDIA | ~180 | 5-6 test cases |
| 🟢 P2 | Loyalty | `loyalty.service.ts` | MEDIA | ~280 | 6-7 test cases |
| 🟢 P2 | Campaigns | `campaigns.service.ts` | MEDIA | ~240 | 5-6 test cases |
| 🟢 P2 | Activities | `activities.service.ts` | MEDIA | ~220 | 5-6 test cases |
| 🟢 P2 | Segments | `segments.service.ts` | MEDIA | ~200 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// customers.service.spec.ts
✅ Crear customer con direcciones
✅ Vincular customer con user (si aplica)
✅ Historial de órdenes
✅ Calcular lifetime value (LTV)
✅ Gestionar taxInfo (RIF, Razón Social)
✅ Validar email único
✅ Merge duplicated customers

// leads.service.spec.ts
✅ Crear lead desde formulario web
✅ Convertir lead a customer
✅ Asignar lead a sales rep
✅ Actualizar status: new → contacted → qualified → converted
✅ Registrar activities (calls, emails, meetings)
✅ Score de lead
```

**Resultado Fase 2:**
- ✅ 30 services adicionales con tests
- ✅ Cobertura: 33% → 60% (68/113 services)
- ✅ ~2,200 líneas de tests nuevos
- ✅ Módulos de operaciones cubiertos

---

## 📅 FASE 3: MÓDULOS COMPLEMENTARIOS (Semanas 9-12)

**Objetivo:** Cubrir 23 services restantes y tests E2E
**Cobertura esperada:** 60% → 80%

### Semana 9: Verticales Especializadas (8 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟢 P2 | Appointments | `appointments.service.ts` | MEDIA | ~420 | 7-8 test cases |
| 🟢 P2 | Services | `services.service.ts` | MEDIA | ~280 | 6-7 test cases |
| 🟢 P2 | Resources | `resources.service.ts` | MEDIA | ~240 | 5-6 test cases |
| 🟢 P2 | Availability | `availability.service.ts` | MEDIA | ~320 | 6-7 test cases |
| 🟢 P2 | Bookings | `bookings.service.ts` | MEDIA | ~380 | 7-8 test cases |
| 🟢 P2 | Delivery | `delivery.service.ts` | MEDIA | ~340 | 6-7 test cases |
| 🟢 P2 | Drivers | `drivers.service.ts` | MEDIA | ~220 | 5-6 test cases |
| 🟢 P2 | Routes | `routes.service.ts` | MEDIA | ~260 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// appointments.service.spec.ts
✅ Crear appointment con service y resource
✅ Validar disponibilidad antes de agendar
✅ Confirmar appointment
✅ Cancelar appointment con razón
✅ Reschedule appointment
✅ Cobrar depósito al crear
✅ Enviar notificaciones: confirmación, reminder
✅ Calcular duration según service

// bookings.service.spec.ts
✅ Crear booking desde storefront
✅ Wizard de booking: paso a paso
✅ Aplicar promociones/descuentos
✅ Pago de booking (integración payments)
✅ Status: pending → confirmed → completed
✅ Review y rating post-servicio
```

---

### Semana 10: Comunicaciones & Notificaciones (7 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟢 P2 | Mail | `mail.service.ts` | MEDIA | ~280 | 6-7 test cases |
| 🟢 P2 | SMS | `sms.service.ts` | MEDIA | ~180 | 5-6 test cases |
| 🟢 P2 | Notifications | `notifications.service.ts` | MEDIA | ~320 | 6-7 test cases |
| 🟢 P2 | WhatsApp | `whatsapp.service.ts` | MEDIA | ~240 | 5-6 test cases |
| 🟢 P2 | Templates | `templates.service.ts` | MEDIA | ~220 | 5-6 test cases |
| 🟢 P2 | Event Emitter | (listeners) | MEDIA | - | 4-5 test cases |
| 🟢 P2 | Webhooks | `webhooks.service.ts` | MEDIA | ~200 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// mail.service.spec.ts
✅ Enviar email con plantilla
✅ Enviar email con attachments
✅ Validar template rendering (variables)
✅ Queue de emails (BullMQ integration)
✅ Retry failed emails
✅ Tracking: sent, opened, clicked

// notifications.service.spec.ts
✅ Crear notificación para usuario
✅ Marcar como leída
✅ Obtener notificaciones no leídas
✅ Eliminar notificaciones antiguas
✅ Filtros: tipo, fecha, status
✅ Real-time notifications (WebSocket)
```

---

### Semana 11: Analytics & AI (5 services)

| Priority | Módulo | Service | Criticidad | Líneas | Tests a Crear |
|----------|--------|---------|------------|--------|---------------|
| 🟢 P2 | Analytics | `analytics.service.ts` | MEDIA | ~380 | 7-8 test cases |
| 🟢 P2 | Dashboard | `dashboard.service.ts` | MEDIA | ~320 | 6-7 test cases |
| 🟢 P2 | Assistant (AI) | `assistant.service.ts` | MEDIA | ~520 | 8-10 test cases |
| 🟢 P2 | Vector Store | `vector-store.service.ts` | MEDIA | ~280 | 5-6 test cases |
| 🟢 P2 | Transaction History | `transaction-history.service.ts` | MEDIA | ~240 | 5-6 test cases |

**Test Cases Clave:**
```typescript
// analytics.service.spec.ts
✅ Calcular KPIs: ventas, órdenes, ingresos
✅ Trending products
✅ Customer segmentation
✅ Sales by period (daily, weekly, monthly)
✅ Comparación períodos
✅ Filters: tenant, date range, vertical

// assistant.service.spec.ts
✅ Procesar query de usuario
✅ Buscar en vector store (Pinecone)
✅ Generar respuesta con OpenAI
✅ Aplicar context window
✅ Validar ownership de datos
✅ Logging de queries para mejora continua
```

---

### Semana 12: Tests E2E & Integration (3 suites)

| Priority | Suite | Cobertura | Test Cases |
|----------|-------|-----------|------------|
| 🔴 P0 | **E2E: Restaurant Flow** | 12-15 casos | Order → Kitchen → Payment → Accounting |
| 🔴 P0 | **E2E: Payroll Flow** | 10-12 casos | Employee → Absence → Run → Payment |
| 🟡 P1 | **E2E: Purchase Flow** | 8-10 casos | Requisition → PO → Receive → Payable → Payment |

**E2E Test Cases: Restaurant Flow**
```typescript
// test/e2e/restaurant-flow.e2e.spec.ts
describe('Restaurant Complete Flow', () => {
  it('✅ should create order with modifiers', async () => {
    // POST /orders/create con modifiers
    // Validar Order.items[].modifiers populated
  });

  it('✅ should send order to kitchen', async () => {
    // POST /kitchen-display/create con orderId
    // Validar KitchenOrder creada con status='new'
  });

  it('✅ should update kitchen order status', async () => {
    // PATCH /kitchen-display/:id { status: 'preparing' }
    // Validar transición de estados
  });

  it('✅ should create payment for order', async () => {
    // POST /payments/create { orderId, amount, bankAccountId }
    // Validar Payment creada
    // Validar Order.paymentStatus actualizado
  });

  it('✅ should create bank transaction automatically', async () => {
    // Validar BankTransaction vinculada con paymentId
    // Validar BankAccount.currentBalance actualizado
  });

  it('✅ should create journal entry automatically', async () => {
    // Validar JournalEntry creada con isAutomatic=true
    // Validar líneas: Debe Caja/Banco, Haber Ctas por Cobrar
  });

  it('✅ should reconcile payment with bank statement', async () => {
    // PUT /payments/:id/reconcile { status: 'matched' }
    // Validar Payment.reconciliationStatus
    // Validar BankTransaction.reconciled
  });

  it('✅ should handle split bill', async () => {
    // POST /orders/:id/split-bill { splits: [...] }
    // Crear múltiples payments vinculados a misma orden
  });

  it('✅ should complete order with full payment', async () => {
    // Validar Order.paymentStatus = 'paid'
    // Validar KitchenOrder.status = 'completed'
  });

  it('✅ should handle order cancellation', async () => {
    // DELETE /orders/:id
    // Reversar inventario
    // Marcar KitchenOrder como cancelled
  });
});
```

**E2E Test Cases: Payroll Flow**
```typescript
// test/e2e/payroll-flow.e2e.spec.ts
describe('Payroll Complete Flow', () => {
  it('✅ should create payroll structure', async () => {
    // POST /payroll-structures con concepts
  });

  it('✅ should register employee absence', async () => {
    // POST /payroll-absences { employeeId, type, startDate, endDate }
  });

  it('✅ should approve absence', async () => {
    // PATCH /payroll-absences/:id/approve
  });

  it('✅ should create payroll run', async () => {
    // POST /payroll-runs { structureId, periodStart, periodEnd }
  });

  it('✅ should calculate payroll with engine', async () => {
    // POST /payroll-runs/:id/calculate
    // Validar entries generadas con amounts correctos
    // Validar ausencias aplicadas
  });

  it('✅ should create journal entry for payroll', async () => {
    // Validar JournalEntry con concepts de nómina
  });

  it('✅ should generate payables for employees', async () => {
    // POST /payroll-runs/:id/pay
    // Crear Payable por cada employee
  });

  it('✅ should pay employee payables', async () => {
    // POST /payments/create { payableId, amount }
    // Validar Payable.status = 'paid'
  });

  it('✅ should close payroll run', async () => {
    // POST /payroll-runs/:id/close
    // Validar status = 'closed'
  });
});
```

**Resultado Fase 3:**
- ✅ 23 services adicionales con tests
- ✅ Cobertura: 60% → 80% (91/113 services)
- ✅ ~1,800 líneas de tests nuevos
- ✅ 3 suites E2E críticas implementadas
- ✅ ~35-40 casos E2E

---

## 📊 RESUMEN FINAL

### Cobertura por Fase

| Fase | Semanas | Services | Cobertura | Líneas Test | Tests E2E |
|------|---------|----------|-----------|-------------|-----------|
| **Inicial** | - | 13 | 11.5% | ~2,420 | 3 suites |
| **Fase 1** | 1-4 | +25 | 33% | +1,800 | - |
| **Fase 2** | 5-8 | +30 | 60% | +2,200 | - |
| **Fase 3** | 9-12 | +23 | 80% | +1,800 | +3 suites |
| **TOTAL** | 12 | **91/113** | **80%** | **~8,220** | **6 suites** |

### Cobertura por Categoría

| Categoría | Services Totales | Con Tests | Cobertura | Prioridad |
|-----------|------------------|-----------|-----------|-----------|
| **Autenticación** | 6 | 6 | 100% | 🔴 CRÍTICA |
| **Finanzas** | 15 | 14 | 93% | 🔴 CRÍTICA |
| **Inventario** | 12 | 10 | 83% | 🟡 ALTA |
| **Órdenes** | 8 | 7 | 87% | 🔴 CRÍTICA |
| **Producción** | 7 | 6 | 86% | 🟡 ALTA |
| **Nómina** | 10 | 9 | 90% | 🟡 ALTA |
| **CRM** | 8 | 7 | 87% | 🟡 ALTA |
| **Compras** | 8 | 7 | 87% | 🟡 ALTA |
| **Verticales** | 12 | 9 | 75% | 🟢 MEDIA |
| **Comunicaciones** | 7 | 5 | 71% | 🟢 MEDIA |
| **Analytics/AI** | 8 | 6 | 75% | 🟢 MEDIA |
| **Otros** | 12 | 5 | 42% | 🟢 BAJA |
| **TOTAL** | **113** | **91** | **80%** | - |

---

## 🛠️ INFRAESTRUCTURA & HERRAMIENTAS

### Stack de Testing Actual ✅

```json
// package.json
{
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.2",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.3"
  }
}
```

### Scripts Disponibles ✅

```bash
npm test                    # Run all unit tests
npm run test:watch         # Watch mode para desarrollo
npm run test:cov           # Cobertura de código
npm run test:e2e           # Tests end-to-end
npm run test:security      # Suite de seguridad
npm run test:debug         # Debug con inspector
```

### Configuración Jest

```javascript
// jest.config.js (recomendado actualizar)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(service|controller|guard|interceptor).ts',
    '!**/*.module.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Helpers de Testing (crear)

```typescript
// test/helpers/test-utils.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Crea un mock de Mongoose Model con métodos comunes
 */
export function createMockModel<T>(data?: Partial<T>[]) {
  return {
    find: jest.fn().mockResolvedValue(data || []),
    findOne: jest.fn().mockResolvedValue(data?.[0] || null),
    findById: jest.fn().mockResolvedValue(data?.[0] || null),
    findByIdAndUpdate: jest.fn().mockResolvedValue(data?.[0] || null),
    create: jest.fn().mockResolvedValue(data?.[0] || {}),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: jest.fn().mockResolvedValue(data?.length || 0),
    aggregate: jest.fn().mockResolvedValue([]),
    exec: jest.fn().mockResolvedValue(data || []),
  };
}

/**
 * Crea un user mock para testing
 */
export function createMockUser(overrides?: any) {
  return {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    tenantId: '507f1f77bcf86cd799439012',
    role: 'admin',
    ...overrides,
  };
}

/**
 * Crea un tenant mock para testing
 */
export function createMockTenant(overrides?: any) {
  return {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Tenant',
    status: 'active',
    vertical: 'food-service',
    ...overrides,
  };
}
```

```typescript
// test/helpers/database.helper.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

let mongod: MongoMemoryServer;

/**
 * Inicia MongoDB en memoria para tests E2E
 */
export async function startInMemoryDatabase() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  return MongooseModule.forRoot(uri);
}

/**
 * Detiene MongoDB en memoria
 */
export async function stopInMemoryDatabase() {
  if (mongod) {
    await mongod.stop();
  }
}

/**
 * Limpia todas las colecciones
 */
export async function clearDatabase(connection: any) {
  const collections = connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

---

## 📋 TEMPLATE DE TEST

### Test Unitario - Service

```typescript
// src/modules/[module]/[module].service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { [Module]Service } from './[module].service';
import { [Schema] } from '../../schemas/[schema].schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockModel, createMockUser } from '../../../test/helpers/test-utils';

describe('[Module]Service', () => {
  let service: [Module]Service;
  let mockModel: any;

  const mockData = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test Item',
      tenantId: '507f1f77bcf86cd799439012',
      status: 'active',
    },
  ];

  beforeEach(async () => {
    mockModel = createMockModel(mockData);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        [Module]Service,
        {
          provide: getModelToken([Schema].name),
          useValue: mockModel,
        },
        // Agregar otros servicios/dependencias mockeadas
      ],
    }).compile();

    service = module.get<[Module]Service>([Module]Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new item successfully', async () => {
      const dto = { name: 'New Item', status: 'active' };
      const user = createMockUser();

      const result = await service.create(dto, user);

      expect(mockModel.create).toHaveBeenCalledWith({
        ...dto,
        tenantId: user.tenantId,
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
    });

    it('should throw BadRequestException if validation fails', async () => {
      const dto = { name: '', status: 'invalid' };
      const user = createMockUser();

      await expect(service.create(dto, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an item by id', async () => {
      const id = '507f1f77bcf86cd799439011';
      const user = createMockUser();

      const result = await service.findOne(id, user.tenantId);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: id,
        tenantId: user.tenantId,
      });
      expect(result).toBeDefined();
      expect(result._id).toBe(id);
    });

    it('should throw NotFoundException if item not found', async () => {
      mockModel.findOne.mockResolvedValueOnce(null);
      const id = 'nonexistent';
      const user = createMockUser();

      await expect(service.findOne(id, user.tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an item successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const updateDto = { name: 'Updated Item' };
      const user = createMockUser();

      const result = await service.update(id, updateDto, user);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { $set: updateDto },
        { new: true },
      );
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete an item successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const user = createMockUser();

      await service.delete(id, user.tenantId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({
        _id: id,
        tenantId: user.tenantId,
      });
    });
  });
});
```

### Test E2E - Controller

```typescript
// test/e2e/[module].e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { startInMemoryDatabase, stopInMemoryDatabase, clearDatabase } from '../helpers/database.helper';

describe('[Module] E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
    tenantId = loginResponse.body.user.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /[module]', () => {
    it('should create a new item', async () => {
      const dto = {
        name: 'Test Item',
        status: 'active',
      };

      const response = await request(app.getHttpServer())
        .post('/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(dto.name);
      expect(response.body.tenantId).toBe(tenantId);
    });

    it('should return 400 if validation fails', async () => {
      const dto = { name: '' }; // Invalid

      await request(app.getHttpServer())
        .post('/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(400);
    });

    it('should return 401 if not authenticated', async () => {
      const dto = { name: 'Test' };

      await request(app.getHttpServer())
        .post('/[module]')
        .send(dto)
        .expect(401);
    });
  });

  describe('GET /[module]', () => {
    it('should return list of items', async () => {
      const response = await request(app.getHttpServer())
        .get('/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /[module]/:id', () => {
    it('should return an item by id', async () => {
      // Crear item primero
      const createResponse = await request(app.getHttpServer())
        .post('/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Item' });

      const id = createResponse.body._id;

      const response = await request(app.getHttpServer())
        .get(`/[module]/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._id).toBe(id);
    });

    it('should return 404 if item not found', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await request(app.getHttpServer())
        .get(`/[module]/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

---

## 📈 MÉTRICAS & TRACKING

### Dashboard de Progreso

```bash
# Comando para ver progreso semanal
npm run test:cov

# Métricas clave:
✅ % Statements covered
✅ % Branches covered
✅ % Functions covered
✅ % Lines covered
✅ Uncovered Line #s
```

### Reporte Semanal (Template)

```markdown
## Reporte de Testing - Semana [X]

### Objetivos de la Semana
- [ ] [Módulo 1]: X test cases
- [ ] [Módulo 2]: Y test cases
- [ ] [Módulo 3]: Z test cases

### Logros
- ✅ Tests implementados: [N] archivos
- ✅ Líneas de test escritas: [M] líneas
- ✅ Cobertura actual: [X]%
- ✅ Bugs encontrados durante testing: [N]

### Bloqueadores
- ❌ [Issue 1]: Descripción
- ❌ [Issue 2]: Descripción

### Próxima Semana
- [ ] [Módulo A]: planificado
- [ ] [Módulo B]: planificado
```

### KPIs de Calidad

| KPI | Objetivo Final | Semana 4 | Semana 8 | Semana 12 |
|-----|----------------|----------|----------|-----------|
| **Cobertura Services** | 80% | 33% | 60% | 80% |
| **Cobertura Líneas** | 70% | 30% | 50% | 70% |
| **Tests E2E** | 6 suites | 0 | 3 | 6 |
| **Tiempo CI/CD** | < 10 min | - | 7 min | 8 min |
| **Bugs Detectados** | 100+ | 20 | 60 | 100+ |

---

## 🚀 MEJORES PRÁCTICAS

### 1. Naming Conventions

```typescript
// ✅ CORRECTO
describe('PaymentsService', () => {
  describe('create', () => {
    it('should create payment with idempotency key', async () => {});
    it('should prevent duplicate payment by reference', async () => {});
    it('should throw BadRequestException if amount is negative', async () => {});
  });
});

// ❌ INCORRECTO
describe('test payments', () => {
  it('works', async () => {});
  it('test 2', async () => {});
});
```

### 2. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should create journal entry for payment', async () => {
  // ARRANGE: Setup
  const payment = { amount: 100, orderId: '123' };
  const order = { orderNumber: 'ORD-001', totalAmount: 100 };
  mockOrderModel.findById.mockResolvedValue(order);

  // ACT: Execute
  const result = await service.createJournalEntryForPayment(
    order,
    payment,
    tenantId,
  );

  // ASSERT: Verify
  expect(result).toBeDefined();
  expect(result.lines).toHaveLength(2);
  expect(result.lines[0].debit).toBe(100);
  expect(result.isAutomatic).toBe(true);
});
```

### 3. Test Isolation

```typescript
// ✅ CORRECTO: Cada test es independiente
describe('OrdersService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Limpiar mocks entre tests
  });

  it('test 1', async () => {
    const order = await service.create(dto);
    expect(order).toBeDefined();
  });

  it('test 2', async () => {
    // No depende del test 1
    const orders = await service.findAll();
    expect(orders).toHaveLength(0);
  });
});

// ❌ INCORRECTO: Tests dependientes
let orderId: string;
it('should create order', async () => {
  const order = await service.create(dto);
  orderId = order._id; // ⚠️ Estado compartido
});
it('should find order', async () => {
  const order = await service.findOne(orderId); // ⚠️ Depende del test anterior
});
```

### 4. Mock Correctamente

```typescript
// ✅ CORRECTO: Mock completo y específico
const mockPaymentModel = {
  findOne: jest.fn().mockResolvedValue({
    _id: '123',
    amount: 100,
    status: 'confirmed',
  }),
  create: jest.fn().mockImplementation((data) => ({
    ...data,
    _id: '123',
    save: jest.fn().mockResolvedValue(data),
  })),
};

// ❌ INCORRECTO: Mock incompleto
const mockPaymentModel = {
  findOne: jest.fn(), // ⚠️ Sin return value definido
};
```

### 5. Test Edge Cases

```typescript
describe('BankAccountsService.updateBalance', () => {
  it('should update balance with positive amount', async () => {});
  it('should update balance with negative amount', async () => {});
  it('should throw error if balance goes negative', async () => {});
  it('should handle zero amount', async () => {});
  it('should handle very large amounts (> 1 billion)', async () => {});
  it('should round decimals correctly', async () => {});
  it('should handle concurrent updates', async () => {});
});
```

---

## 🎓 RECURSOS & TRAINING

### Documentación

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Videos Recomendados

- "Unit Testing in NestJS" - YouTube
- "E2E Testing with Supertest" - YouTube
- "Mocking Mongoose Models" - YouTube

### Workshops Internos

- **Semana 1:** Kickoff + Setup de ambiente de testing
- **Semana 4:** Review de primeros tests + Mejores prácticas
- **Semana 8:** Review de tests E2E + Integración CI/CD
- **Semana 12:** Retrospectiva + Plan de mantenimiento

---

## 🔄 INTEGRACIÓN CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage --maxWorkers=2

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Run security tests
        run: npm run test:security

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 70%"
            exit 1
          fi
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running tests before commit..."

npm test -- --bail --findRelatedTests $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.ts$' | tr '\n' ' ')

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ Tests passed. Proceeding with commit."
```

---

## 🎯 CHECKLIST DE COMPLETITUD

### Por Service

- [ ] Al menos 5 test cases por service
- [ ] Tests para happy path
- [ ] Tests para error cases
- [ ] Tests para validaciones
- [ ] Tests para ownership (tenantId)
- [ ] Tests para edge cases
- [ ] Mocks de todas las dependencias
- [ ] Coverage > 80% del service

### Por Módulo

- [ ] Service tests completos
- [ ] Controller tests (si aplica)
- [ ] Guard tests (si aplica)
- [ ] Interceptor tests (si aplica)
- [ ] Al menos 1 test E2E del flujo principal
- [ ] Tests de integración con otros módulos

### General

- [ ] Todos los tests pasan en CI/CD
- [ ] Coverage general > 70%
- [ ] Tiempo de ejecución < 10 minutos
- [ ] Sin tests flakey (intermitentes)
- [ ] Documentación de casos complejos
- [ ] Setup de ambiente claro en README

---

## 📝 NOTAS FINALES

### Equipo Recomendado

Para completar este roadmap en 12 semanas:

- **1 developer full-time dedicado a testing**, o
- **2-3 developers part-time** (2-3 horas/día cada uno)

### Estimación de Esfuerzo

- **Total horas:** ~480 horas (12 semanas × 40 horas/semana)
- **Por service:** ~5-6 horas promedio (setup + 8 test cases)
- **Por suite E2E:** ~20-25 horas

### ROI Esperado

- ✅ **Reducción bugs en producción:** -70%
- ✅ **Confianza en deploys:** +90%
- ✅ **Tiempo de debugging:** -50%
- ✅ **Velocidad de refactoring:** +80%
- ✅ **Documentación viva del código:** Sí

---

**Última actualización:** Diciembre 3, 2025
**Próxima revisión:** Semanal durante implementación
**Responsable:** Tech Lead + QA Team
**Estado:** ✅ LISTO PARA EJECUTAR
