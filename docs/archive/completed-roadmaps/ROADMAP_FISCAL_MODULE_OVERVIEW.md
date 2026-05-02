# HOJA DE RUTA: MÓDULO FISCAL INTEGRAL
## Visión General y Arquitectura

**Fecha de creación**: 14 de Noviembre de 2025
**Versión**: 1.0
**Autor**: Análisis exhaustivo del sistema V1.03

---

## ÍNDICE

1. [Visión y Objetivos](#visión-y-objetivos)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Decisiones Críticas](#decisiones-críticas)
5. [Fases de Implementación](#fases-de-implementación)
6. [Estimaciones y Recursos](#estimaciones-y-recursos)
7. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)

---

## VISIÓN Y OBJETIVOS

### Visión

Crear un **módulo fiscal de clase mundial** que permita al ERP competir con SAP, Oracle NetSuite y Microsoft Dynamics, cumpliendo con normativas fiscales de múltiples países y proporcionando automatización completa desde la transacción hasta la declaración.

### Objetivos Estratégicos

1. **Automatización Completa**: Desde transacción → cálculo → contabilización → declaración → pago fiscal
2. **Cumplimiento Normativo**: 100% compliance con leyes fiscales de cada país
3. **Escalabilidad Internacional**: Arquitectura que soporte 20+ países sin refactorización
4. **Auditoría Total**: Trazabilidad completa de cada centavo de impuesto
5. **UX de Clase Mundial**: Configuración simple, reportes claros, alertas proactivas

### Objetivos Técnicos

1. **Cero errores de redondeo**: Precisión decimal hasta el último centavo
2. **Performance**: Calcular impuestos de 1000 líneas en <2 segundos
3. **Integridad**: Transacciones atómicas, rollback automático en errores
4. **Mantenibilidad**: Código limpio, patrones consistentes, 80%+ test coverage
5. **Extensibilidad**: Nuevos impuestos sin tocar código core

---

## ESTADO ACTUAL DEL SISTEMA

### ✅ Lo que Funciona Bien (NO TOCAR)

#### 1. Sistema de IVA
- **Archivo**: `src/modules/orders/orders.service.ts` (línea 209)
- **Implementación**:
  - Tasa fija 16% configurable por producto
  - Campo `ivaApplicable: boolean` en Product schema
  - Cálculo automático: `totalPrice × 0.16`
  - Acumulación en orden: `ivaTotal`
- **Contabilización**: Automática en cuenta 2102 (Impuestos por Pagar)
- **Estado**: ✅ **FUNCIONA PERFECTAMENTE**

#### 2. Sistema de IGTF
- **Archivo**: `src/modules/orders/orders.service.ts` (líneas 61-87, 303)
- **Implementación**:
  - Tasa fija 3% en transacciones USD
  - Identificación automática por método de pago (`_usd` suffix)
  - Métodos sujetos: efectivo_usd, transferencia_usd, zelle_usd
  - Cálculo: `Σ(pagos en USD) × 0.03`
- **Contabilización**:
  - Gasto IGTF en cuenta 599
  - Provisión en cuenta 2102
- **Estado**: ✅ **FUNCIONA CORRECTAMENTE**

#### 3. Contabilidad Automática
- **Archivo**: `src/modules/accounting/accounting.service.ts` (líneas 239-424)
- **Flujos implementados**:
  - Venta → Asiento de ingresos + impuestos
  - Venta → Asiento de COGS
  - Pago → Asiento de cobro + IGTF si aplica
  - Compra → Asiento de inventario
  - Payable → Asiento de gasto
- **Validaciones**: Débito = Crédito (tolerancia ±0.001)
- **Estado**: ✅ **ROBUSTO Y PROBADO**

#### 4. Configuración Multi-tenant
- **Archivo**: `src/schemas/tenant.schema.ts` (líneas 35-42, 184-190)
- **Campos**:
  ```typescript
  taxes: {
    ivaRate: number,
    igtfRate: number,
    retentionRates: { iva: number, islr: number }
  }
  taxInfo: {
    rif: string,
    businessName: string,
    isRetentionAgent: boolean,
    taxRegime: string
  }
  ```
- **Estado**: ✅ **ESTRUCTURA SÓLIDA**

### ⚠️ Lo que Existe pero Está Incompleto

#### 1. Retenciones
- **Ubicación**: `src/schemas/tenant.schema.ts` (líneas 38-41)
- **Problema**: Campos existen pero NO hay lógica de cálculo
- **Falta**:
  - Motor de cálculo de retenciones
  - Integración con pagos
  - Generación de comprobantes
  - Registro contable separado

#### 2. Categorías Fiscales
- **Ubicación**: `src/schemas/product.schema.ts` (línea 248)
- **Problema**: Campo `taxCategory: string` sin validación de enum
- **Riesgo**: Inconsistencia en reportes (cada usuario puede inventar categorías)
- **Falta**: Definir enum de categorías válidas por país

#### 3. Exención de IGTF
- **Ubicación**: `src/schemas/product.schema.ts` (línea 229)
- **Problema**: Campo `igtfExempt: boolean` existe pero NO se usa en cálculos
- **Falta**: Implementar lógica en OrdersService para respetar exenciones

### ❌ Lo que NO Existe

1. **Reportes Fiscales Específicos**
   - Libro de Ventas (Venezuela)
   - Libro de Compras (Venezuela)
   - Declaración IVA (Forma 30)
   - Declaración ISLR
   - Reportes de retenciones

2. **Auditoría de Cambios Fiscales**
   - Historial de cambios en tasas
   - Log de ajustes fiscales
   - Trazabilidad completa

3. **Sistema de Localizaciones**
   - Configuración por país
   - Tasas múltiples por impuesto
   - Reglas de aplicación dinámicas

4. **Validaciones Externas**
   - Validación de RIF contra SENIAT
   - Verificación de agentes de retención

5. **Alertas y Compliance**
   - Fechas límite de declaración
   - Recordatorios de pago
   - Detección de anomalías fiscales

---

## ARQUITECTURA PROPUESTA

### Principios de Diseño

1. **Extend, Don't Replace**: Extender sistema actual, NO reemplazarlo
2. **Backward Compatible**: Todo lo que funciona debe seguir funcionando
3. **Data-Driven**: Configuración por datos, NO código hardcodeado
4. **Event-Driven**: Desacoplamiento mediante eventos
5. **Audit-First**: Todo cambio fiscal debe ser auditable

### Componentes Nuevos

```
src/
├── modules/
│   ├── tax/                          # ⭐ NUEVO: Módulo fiscal core
│   │   ├── tax.module.ts
│   │   ├── tax.service.ts            # Motor de cálculo
│   │   ├── tax.controller.ts
│   │   ├── tax-configuration.service.ts
│   │   ├── tax-calculation.service.ts
│   │   ├── tax-reporting.service.ts
│   │   └── tax-audit.service.ts
│   │
│   ├── withholdings/                 # ⭐ NUEVO: Retenciones
│   │   ├── withholdings.module.ts
│   │   ├── withholdings.service.ts
│   │   ├── withholdings.controller.ts
│   │   └── certificates.service.ts
│   │
│   └── fiscal-reports/               # ⭐ NUEVO: Reportes fiscales
│       ├── fiscal-reports.module.ts
│       ├── sales-book.service.ts     # Libro de ventas
│       ├── purchase-book.service.ts  # Libro de compras
│       ├── tax-declarations.service.ts
│       └── report-generators/
│           ├── venezuela.generator.ts
│           ├── mexico.generator.ts
│           └── colombia.generator.ts
│
├── schemas/
│   ├── tax-configuration.schema.ts  # ⭐ NUEVO
│   ├── tax-transaction.schema.ts    # ⭐ NUEVO
│   ├── withholding.schema.ts        # ⭐ NUEVO
│   └── tax-audit-log.schema.ts      # ⭐ NUEVO
│
└── dto/
    ├── tax/
    │   ├── create-tax-config.dto.ts # ⭐ NUEVO
    │   ├── calculate-tax.dto.ts     # ⭐ NUEVO
    │   └── tax-report.dto.ts        # ⭐ NUEVO
    └── withholding/
        ├── create-withholding.dto.ts # ⭐ NUEVO
        └── withholding-certificate.dto.ts # ⭐ NUEVO
```

### Integración con Módulos Existentes

#### OrdersService (Modificaciones Mínimas)
```typescript
// ANTES (línea 209):
const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;

// DESPUÉS (sin romper backward compatibility):
const ivaAmount = await this.taxService.calculateTax({
  amount: totalPrice,
  taxType: 'IVA',
  productId: product._id.toString(),
  customerId: order.customerId,
  tenantId: user.tenantId
});
// Si TaxService no está disponible, fallback a lógica actual
// Esto permite migración gradual sin downtime
```

#### PaymentsService (Retenciones Automáticas)
```typescript
// NUEVO en handlePayablePayment:
if (payable.requiresWithholding) {
  const withholding = await this.withholdingsService.calculateAndCreate({
    paymentId: payment._id.toString(),
    payableId: payable._id.toString(),
    amount: payment.amount,
    supplierId: payable.supplierId,
    tenantId
  });

  // Actualizar monto neto del pago
  payment.netAmount = payment.amount - withholding.withholdingAmount;
}
```

#### AccountingService (Registro de Transacciones Fiscales)
```typescript
// NUEVO evento después de crear asiento:
this.eventEmitter.emit('journal_entry.created', {
  journalEntryId: entry._id.toString(),
  sourceDocument: { type: 'Order', id: order._id.toString() },
  tenantId
});

// TaxService escucha evento y crea TaxTransaction:
@OnEvent('journal_entry.created')
async handleJournalEntryCreated(payload) {
  await this.taxTransactionService.createFromJournalEntry(payload);
}
```

### Flujo de Datos: Transacción → Declaración

```
┌─────────────────────────────────────────────────────────┐
│ 1. TRANSACCIÓN ORIGINAL                                 │
│    (Venta, Compra, Pago, Nómina)                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SERVICIO DE MÓDULO (Orders, Purchases, Payments)    │
│    - Calcula totales                                    │
│    - Llama a TaxService.calculateTax()                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. TAX SERVICE                                          │
│    - Obtiene TaxConfiguration vigente                   │
│    - Aplica reglas de negocio                          │
│    - Valida exenciones                                 │
│    - Calcula impuesto exacto                           │
│    - Retorna: { taxAmount, taxRate, taxConfigId }     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. GUARDA TRANSACCIÓN CON IMPUESTOS                    │
│    Order/Purchase/Payment con campos de impuestos      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. ACCOUNTING SERVICE                                   │
│    - Crea Journal Entry                                │
│    - Emite evento 'journal_entry.created'              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. TAX TRANSACTION SERVICE (escucha evento)             │
│    - Crea TaxTransaction record                        │
│    - Asigna taxPeriod (2025-01)                       │
│    - Estado: 'pending'                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 7. TAX AUDIT SERVICE                                    │
│    - Registra en TaxAuditLog                           │
│    - Snapshot completo de la transacción               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼ (al cierre del período)
┌─────────────────────────────────────────────────────────┐
│ 8. FISCAL REPORTS SERVICE                               │
│    - Agrupa TaxTransactions por período                │
│    - Genera Libro de Ventas                            │
│    - Genera Libro de Compras                           │
│    - Calcula Declaración IVA                           │
│    - Produce PDF/XML/TXT según formato oficial         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 9. USUARIO REVISA Y APRUEBA                            │
│    - Marca TaxTransactions como 'declared'             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 10. PAGO FISCAL (opcional: integración bancaria)       │
│     - Genera orden de pago al ente tributario          │
│     - Marca TaxTransactions como 'paid'                │
└─────────────────────────────────────────────────────────┘
```

---

## DECISIONES CRÍTICAS

### Decisión 1: Migración Gradual vs Big Bang

**Opción A: Big Bang** (Reemplazar todo de una vez)
- ❌ Riesgo altísimo de downtime
- ❌ Imposible probar en producción gradualmente
- ❌ Si algo falla, afecta TODO el sistema

**Opción B: Migración Gradual** (Extender y deprecar lentamente) ✅ **SELECCIONADA**
- ✅ Sistema actual sigue funcionando
- ✅ Módulo fiscal nuevo convive con lógica legacy
- ✅ Feature flag para activar nuevas funcionalidades por tenant
- ✅ Rollback inmediato si hay problemas

**Implementación**:
```typescript
// En tenant.schema.ts, agregar:
@Prop({ type: Object, default: {} })
featureFlags: {
  useNewTaxModule?: boolean;           // default: false
  enableWithholdings?: boolean;        // default: false
  enableFiscalReports?: boolean;       // default: false
};

// En OrdersService.create():
if (tenant.featureFlags?.useNewTaxModule) {
  // Usar TaxService
} else {
  // Usar lógica actual (backward compatible)
}
```

### Decisión 2: Almacenamiento de Tasas Históricas

**Problema**: Las tasas de impuestos cambian con el tiempo. Una orden del 2023 con IVA 12% debe mantenerse así aunque hoy sea 16%.

**Opción A**: Almacenar solo tasa actual, confiar en auditoría
- ❌ Imposible recalcular transacciones pasadas correctamente

**Opción B**: Almacenar tasa en cada transacción ✅ **SELECCIONADA**
- ✅ Cada Order/Payment tiene `appliedTaxRate` guardado
- ✅ TaxTransaction almacena `taxRate` usado en ese momento
- ✅ Auditoría perfecta

**Implementación**:
```typescript
// En order.schema.ts, agregar:
@Prop({ type: Number })
appliedIVARate?: number;  // Ej: 0.16 (se guarda al crear orden)

@Prop({ type: Number })
appliedIGTFRate?: number; // Ej: 0.03

// TaxTransaction siempre almacena:
taxRate: number;          // Tasa que se usó en esa transacción específica
```

### Decisión 3: Cálculo de Impuestos - Dónde y Cuándo

**Opción A**: Calcular en frontend, guardar en backend
- ❌ Riesgo de manipulación
- ❌ Inconsistencia si hay diferentes versiones de frontend

**Opción B**: Calcular en backend SIEMPRE ✅ **SELECCIONADA**
- ✅ Single source of truth
- ✅ Validación centralizada
- ✅ Frontend solo muestra, no calcula

**Implementación**:
```typescript
// Frontend envía:
{
  items: [{ productId, quantity, price }]
  // NO envía ivaTotal, igtfTotal
}

// Backend calcula:
for (const item of items) {
  const product = await this.productModel.findById(item.productId);
  const taxes = await this.taxService.calculateAllTaxes({
    amount: item.quantity * item.price,
    productId: item.productId,
    customerId: dto.customerId,
    tenantId
  });
  item.ivaAmount = taxes.iva;
  item.igtfAmount = taxes.igtf;
}
```

### Decisión 4: Manejo de Errores en Contabilización Fiscal

**Problema Actual**: Si falla creación de asiento, la orden ya fue guardada (setImmediate no bloqueante).

**Opción A**: Mantener comportamiento actual
- ❌ Inconsistencia entre transacción y contabilidad
- ❌ Requiere reconciliación manual

**Opción B**: Hacer todo transaccional ✅ **SELECCIONADA**
- ✅ Si falla contabilidad, se revierte transacción
- ✅ Consistencia garantizada
- ✅ Usar MongoDB transactions

**Implementación**:
```typescript
const session = await this.connection.startSession();
session.startTransaction();

try {
  // 1. Guardar orden
  const order = await new this.orderModel(orderData).save({ session });

  // 2. Crear asientos contables (DENTRO de transacción)
  await this.accountingService.createJournalEntryForSale(
    order,
    tenantId,
    { session }  // ⭐ Pasar session
  );

  // 3. Crear tax transactions
  await this.taxTransactionService.createFromOrder(
    order,
    tenantId,
    { session }
  );

  // 4. Si todo OK, commit
  await session.commitTransaction();
  return order;

} catch (error) {
  // Rollback completo
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Decisión 5: Redondeo de Impuestos

**Problema**: `100 × 0.16 = 16.00` pero `33.33 × 0.16 = 5.33280...`

**Opción A**: Redondear en cada línea
- ❌ Error acumulativo: 100 líneas × 0.01 = $1 de diferencia

**Opción B**: Redondear solo al final ✅ **SELECCIONADA**
- ✅ Precisión máxima
- ✅ Usar Decimal.js para aritmética exacta

**Implementación**:
```typescript
import Decimal from 'decimal.js';

// Configurar precisión global
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

// Calcular impuesto
const baseAmount = new Decimal(item.quantity).times(item.price);
const taxAmount = baseAmount.times(taxRate);

// Acumular SIN redondear
totalTax = totalTax.plus(taxAmount);

// Redondear SOLO al final
order.ivaTotal = totalTax.toDecimalPlaces(2).toNumber();
```

---

## FASES DE IMPLEMENTACIÓN

### Fase 1: Venezuela Completo (8 sprints = 16 semanas)
**Objetivo**: Sistema fiscal 100% funcional para Venezuela

**Entregables**:
- IVA con múltiples tasas (16%, 8%, exento)
- IGTF con excepciones por producto/cliente
- Retenciones IVA (75%, 100%)
- Retenciones ISLR (tarifas según ley)
- Libro de Ventas electrónico
- Libro de Compras electrónico
- Declaración IVA (Forma 30)
- Comprobantes de retención
- Auditoría completa

Ver: [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md)

### Fase 2: Arquitectura Multi-país (4 sprints = 8 semanas)
**Objetivo**: Sistema de localizaciones y configuración dinámica

**Entregables**:
- TaxConfiguration engine
- Sistema de localizaciones
- Wizard de setup por país
- API para gestionar tasas
- Migración de datos existentes

Ver: [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md)

### Fase 3: Expansión Internacional (6-9 sprints por país)
**Objetivo**: Soporte para México, Colombia, USA, España

**Países prioritarios**:
1. México (3 sprints) - ISR, IVA, CFDI
2. Colombia (3 sprints) - IVA, ReteFuente, factura electrónica
3. USA (4 sprints) - Sales Tax por estado
4. España (3 sprints) - IVA, IRPF, modelos fiscales

Ver: [ROADMAP_FASE_3_EXPANSION.md](./ROADMAP_FASE_3_EXPANSION.md)

---

## ESTIMACIONES Y RECURSOS

### Timeline Global

```
Año 1:
├── Q1 (Enero-Marzo)
│   ├── Sprint 1-2: Fase 1.1 (Schemas + TaxService core)
│   └── Sprint 3-4: Fase 1.2 (Retenciones)
│
├── Q2 (Abril-Junio)
│   ├── Sprint 5-6: Fase 1.3 (Reportes fiscales Venezuela)
│   └── Sprint 7-8: Fase 1.4 (Testing + bugfixes)
│
├── Q3 (Julio-Septiembre)
│   ├── Sprint 9-10: Fase 2.1 (TaxConfiguration engine)
│   └── Sprint 11-12: Fase 2.2 (Localizaciones + migración)
│
└── Q4 (Octubre-Diciembre)
    ├── Sprint 13-15: Fase 3.1 (México)
    └── Sprint 16: Buffer + documentación

Año 2:
├── Q1: Colombia + USA
└── Q2-Q4: España + otros países según demanda
```

### Equipo Requerido

**Backend (2 desarrolladores senior)**
- Developer 1: Tax engine, cálculos, validaciones
- Developer 2: Reportes, integraciones, auditoría

**Frontend (1 desarrollador)**
- Vistas de configuración fiscal
- Reportes y dashboards
- Wizards de setup

**QA (1 tester)**
- Test plans por país
- Automatización de pruebas fiscales
- Validación contra normativas

**Product Owner (part-time)**
- Investigación de normativas por país
- Validación con contadores
- Priorización de features

### Budget Estimado

| Concepto | Costo Mensual | Costo Año 1 |
|----------|---------------|-------------|
| 2 Backend Senior | $12,000 | $144,000 |
| 1 Frontend | $5,000 | $60,000 |
| 1 QA | $4,000 | $48,000 |
| 0.5 PO | $3,000 | $36,000 |
| Infraestructura | $500 | $6,000 |
| Consultoría fiscal | $2,000 | $24,000 |
| **TOTAL** | **$26,500** | **$318,000** |

---

## RIESGOS Y MITIGACIONES

### Riesgo 1: Cambios Normativos Durante Desarrollo
**Probabilidad**: Alta
**Impacto**: Medio
**Mitigación**:
- Arquitectura data-driven (cambios sin código)
- Contratar asesor fiscal local part-time
- Buffer de 1 sprint por fase para ajustes

### Riesgo 2: Errores en Cálculos Fiscales
**Probabilidad**: Media
**Impacto**: Crítico
**Mitigación**:
- Test suite de 500+ casos reales
- Validación con contador certificado
- Audit trail completo para detectar errores
- Reconciliación mensual automática

### Riesgo 3: Incompatibilidad con Sistema Actual
**Probabilidad**: Media (por errores históricos)
**Impacto**: Alto
**Mitigación**:
- Migración gradual con feature flags
- Testing exhaustivo en staging con datos reales
- Rollback plan documentado
- **Ver**: [ROADMAP_MIGRATION_PLAN.md](./ROADMAP_MIGRATION_PLAN.md)

### Riesgo 4: Performance con Volumen Alto
**Probabilidad**: Media
**Impacto**: Alto
**Mitigación**:
- Índices de base de datos optimizados
- Caching de configuraciones fiscales
- Procesamiento asíncrono de reportes
- Load testing desde sprint 4

### Riesgo 5: Resistencia al Cambio de Usuarios
**Probabilidad**: Alta
**Impacto**: Medio
**Mitigación**:
- UX simple y clara
- Migración automática de datos
- Documentación y videos tutoriales
- Soporte dedicado primer mes post-lanzamiento

---

## CRITERIOS DE ÉXITO

### Técnicos
- [ ] 95%+ test coverage en módulo fiscal
- [ ] 100% de transacciones con audit trail
- [ ] <2s para calcular impuestos en orden de 100 líneas
- [ ] 0 errores de redondeo reportados
- [ ] Cero downtime durante migración

### Funcionales
- [ ] 100% de transacciones fiscales correctas vs validación manual
- [ ] Declaraciones generadas aceptadas por ente fiscal sin errores
- [ ] Retenciones calculadas correctamente según ley
- [ ] Reportes generados en <10s para período mensual

### Negocio
- [ ] 80%+ de clientes migrados a nuevo sistema en 3 meses
- [ ] Reducción de 50% en tiempo de cierre fiscal mensual
- [ ] 0 multas fiscales atribuibles al sistema
- [ ] 90%+ satisfacción de usuarios contables

---

## PRÓXIMOS PASOS

1. ✅ Leer [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md) - Implementación detallada Venezuela
2. ✅ Leer [ROADMAP_SCHEMAS_Y_DTOS.md](./ROADMAP_SCHEMAS_Y_DTOS.md) - Schemas, DTOs, validaciones
3. ✅ Leer [ROADMAP_MIGRATION_PLAN.md](./ROADMAP_MIGRATION_PLAN.md) - Plan de migración paso a paso
4. ✅ Leer [ROADMAP_TESTING_STRATEGY.md](./ROADMAP_TESTING_STRATEGY.md) - Estrategia de pruebas
5. ⏭️ Revisar con equipo técnico y contable
6. ⏭️ Ajustar estimaciones según feedback
7. ⏭️ Iniciar Sprint 1

---

**Documentos relacionados**:
- [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md)
- [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md)
- [ROADMAP_FASE_3_EXPANSION.md](./ROADMAP_FASE_3_EXPANSION.md)
- [ROADMAP_SCHEMAS_Y_DTOS.md](./ROADMAP_SCHEMAS_Y_DTOS.md)
- [ROADMAP_MIGRATION_PLAN.md](./ROADMAP_MIGRATION_PLAN.md)
- [ROADMAP_TESTING_STRATEGY.md](./ROADMAP_TESTING_STRATEGY.md)

**Documentación del sistema actual**:
- [ANALISIS_SISTEMA_IMPUESTOS.md](./ANALISIS_SISTEMA_IMPUESTOS.md)
- [ACCOUNTING_SYSTEM_ANALYSIS.md](./ACCOUNTING_SYSTEM_ANALYSIS.md)
- [RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md)
