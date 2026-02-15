# Hoja de Ruta: Vertical de Fabricantes (Manufacturing)
## Smart Kubik ERP - Manufacturing Vertical Implementation

**Versión:** 1.0
**Fecha:** 2025-01-14
**Estado:** En desarrollo
**Objetivo:** Convertir SmartKubik en un ERP competitivo para fabricantes a nivel de SAP Business One, Odoo Manufacturing, Oracle NetSuite Manufacturing

---

## Tabla de Contenidos

1. [Análisis del Sistema Actual](#1-análisis-del-sistema-actual)
2. [Análisis Competitivo: Mejores Prácticas](#2-análisis-competitivo-mejores-prácticas)
3. [Diseño de la Vertical Manufacturing](#3-diseño-de-la-vertical-manufacturing)
4. [Arquitectura Técnica](#4-arquitectura-técnica)
5. [Hoja de Ruta de Implementación](#5-hoja-de-ruta-de-implementación)
6. [Fases del Proyecto](#6-fases-del-proyecto)
7. [KPIs de Éxito](#7-kpis-de-éxito)

---

## 1. Análisis del Sistema Actual

### 1.1 Arquitectura de Verticales Existente

**Verticales Actuales:**
- `FOOD_SERVICE`: Restaurantes, catering, food trucks
- `RETAIL`: Supermercados, tiendas, distribuidores
- `SERVICES`: Hoteles, hospitales, escuelas
- `LOGISTICS`: Almacenes, transporte, distribución
- `HYBRID`: Multi-vertical (todos los módulos habilitados)

**Flujo de Onboarding:**
```
1. Selección de Plan (Trial, Professional, Enterprise)
   └─> 2. Datos del Negocio (nombre, vertical, categoría)
       └─> 3. Datos del Administrador (nombre, email, contraseña)
           └─> 4. Confirmación (resumen + envío de código)
               └─> Tenant creado + Módulos habilitados automáticamente
```

**Módulos Actuales por Vertical:**
```typescript
enabledModules: {
  // Core (compartidos)
  inventory, orders, customers, suppliers, reports,
  accounting, payroll, bankAccounts, hrCore, timeAndAttendance,

  // Específicos por vertical
  FOOD_SERVICE: tables, recipes, kitchenDisplay, menuEngineering
  RETAIL: pos, variants, ecommerce, loyaltyProgram
  SERVICES: appointments, resources, booking, servicePackages
  LOGISTICS: shipments, tracking, routes, fleet, warehousing, dispatch
}
```

### 1.2 Módulo de Producción Actual (Fase 1-8 Completada)

**✅ Componentes Implementados:**
1. **Bill of Materials (BOM)**
   - Creación y gestión de BOMs
   - Explosión multinivel recursiva con detección de dependencias circulares
   - Vista de árbol jerárquico
   - Cálculo de costos agregados

2. **Routings (Rutas de Producción)**
   - Definición de operaciones secuenciales
   - Asignación de centros de trabajo
   - Cálculo de tiempos y costos estándar

3. **Work Centers (Centros de Trabajo)**
   - Capacidad y disponibilidad
   - Costos por hora (mano de obra + maquinaria)
   - Eficiencia y métricas

4. **Manufacturing Orders (Órdenes de Producción)**
   - Creación con selección de BOM y Routing
   - Estados: draft, confirmed, in_progress, completed, cancelled
   - Tracking de componentes consumidos y operaciones completadas
   - Cálculo de costos reales vs planificados

5. **Material Requirements Planning (MRP)**
   - Cálculo automático de necesidades de materiales
   - Comparación con inventario disponible
   - Generación de sugerencias de compra
   - Planeación por rangos de fechas

6. **Production Dashboard**
   - KPIs: órdenes totales, completadas, atrasadas
   - Eficiencia de entrega
   - Análisis de varianza de costos
   - Distribución por estado

7. **Production Versions (Versiones de Producción)**
   - Gestión de versiones alternativas de BOMs/Routings
   - Vigencia y activación de versiones

### 1.3 Esquemas de Datos Actuales

**Product Schema (product.schema.ts):**
```typescript
productType: enum ['simple', 'consumable', 'supply']
- simple: Productos finales vendibles
- consumable: Ingredientes consumibles en recetas
- supply: Suministros (empaques, utensilios)

Características:
- Variants (variantes de productos)
- SellingUnits (múltiples unidades de venta)
- Suppliers (proveedores con lead times)
- PricingRules (reglas de pricing)
- InventoryConfig (configuración de stocks)
```

**Inventory Schema (inventory.schema.ts):**
```typescript
- Lots (lotes con fechas de vencimiento)
- Location (warehouse, zone, aisle, shelf, bin)
- Alerts (lowStock, nearExpiration, expired, overstock)
- Metrics (turnoverRate, daysOnHand, seasonalityFactor)
- AttributeCombinations (para productos con atributos variables)
```

### 1.4 Limitaciones Identificadas

**Para una vertical de manufactura completa se requiere:**

1. **Tipos de Productos Expandidos:**
   - ❌ No hay distinción entre materias primas, semi-elaborados, productos terminados
   - ❌ No hay soporte para productos de múltiples niveles de producción
   - ❌ No hay tracking de envases, etiquetas, cajas como entidades diferenciadas

2. **Procesos de Manufactura:**
   - ✅ BOM multinivel funciona
   - ✅ Routings funcionan
   - ❌ Falta Quality Control (QC) integrado
   - ❌ Falta Work Order Scheduling avanzado
   - ❌ Falta Capacity Planning

3. **Trazabilidad:**
   - ✅ Lots existentes en inventario
   - ❌ Falta trazabilidad ascendente/descendente completa
   - ❌ Falta genealogía de lotes en productos terminados

4. **Costos:**
   - ✅ Costo estándar por producto
   - ❌ Falta costing methods (FIFO, LIFO, Average, Standard)
   - ❌ Falta análisis de overhead (costos indirectos)

5. **Compliance y Regulatorio:**
   - ❌ No hay módulo de certificaciones (ISO, HACCP, FDA)
   - ❌ No hay gestión de fórmulas con restricciones regulatorias

---

## 2. Análisis Competitivo: Mejores Prácticas

### 2.1 SAP Business One (Manufacturing Edition)

**Fortalezas Clave:**
1. **Product Master Data Management:**
   - Classification: Raw Materials, Semi-Finished, Finished Goods, Packaging
   - Phantom items (virtuales, no van a inventario)
   - Make-to-Stock, Make-to-Order, Engineer-to-Order

2. **Production Planning:**
   - Material Requirements Planning (MRP) multinivel
   - Capacity Requirements Planning (CRP)
   - Finite vs Infinite scheduling
   - Backward y Forward scheduling

3. **Shop Floor Control:**
   - Work orders con operaciones secuenciales
   - Time tracking por operación
   - Reporting de rechazo/scrap con razones
   - Re-work orders (órdenes de retrabajo)

4. **Quality Management:**
   - QC al recibir materias primas
   - In-Process Quality Control (IPQC)
   - Final inspection (FQC)
   - Non-conformance tracking

5. **Costing:**
   - Standard costing, Average costing, FIFO
   - Overhead allocation (por centro de costos)
   - Variance analysis (material, labor, overhead)

**Lecciones Aprendidas:**
- Separar claramente materias primas de productos terminados
- Integrar QC en cada paso crítico
- Permitir múltiples métodos de costeo

### 2.2 Odoo Manufacturing

**Fortalezas Clave:**
1. **Bill of Materials:**
   - Multi-level BoM con tipos: Manufacture, Kit, Subcontracting
   - BoM versioning con fechas de efectividad
   - Flexible routings con work centers

2. **Manufacturing Orders:**
   - Generación automática desde Sales Orders (MTO)
   - Backflush (consumo automático al completar)
   - By-products (sub-productos generados)
   - Scrap management integrado

3. **Maintenance:**
   - Preventive maintenance scheduling
   - Equipment downtime tracking
   - Integration con work centers

4. **PLM (Product Lifecycle Management):**
   - Engineering Change Orders (ECO)
   - Product versioning con aprobaciones
   - Document management

5. **MRP Inteligente:**
   - Lead time calculation automático
   - Safety stock rules
   - Reordering rules con forecasting

**Lecciones Aprendidas:**
- Backflushing simplifica entry en shop floor
- By-products son cruciales para industrias químicas/alimentarias
- ECOs son esenciales para trazabilidad de cambios

### 2.3 Oracle NetSuite Manufacturing

**Fortalezas Clave:**
1. **Advanced Production Planning:**
   - Demand Planning con forecasting
   - Master Production Schedule (MPS)
   - Rough-Cut Capacity Planning (RCCP)

2. **Work Order Management:**
   - Assembly builds (ensamblaje)
   - Work orders con múltiples salidas
   - Integration con calidad y costos

3. **Inventory Management:**
   - Lot/Serial number traceability
   - Bin management avanzado
   - Cycle counting automatizado

4. **Supply Chain:**
   - Vendor Management Inventory (VMI)
   - Subcontracting workflows
   - Intercompany transfers

**Lecciones Aprendidas:**
- Forecasting debe estar integrado con MRP
- Bin management mejora picking efficiency
- Subcontracting es clave para manufactura modular

### 2.4 Infor CloudSuite Industrial (SyteLine)

**Fortalezas Clave:**
1. **Mixed-Mode Manufacturing:**
   - Discrete, Process, Configurator, Repetitive
   - Job shop y Flow manufacturing

2. **Configurator:**
   - Product configuration rules
   - Dynamic BoM generation
   - Pricing con rules engine

3. **Advanced Planning & Scheduling (APS):**
   - Finite capacity scheduling
   - What-if scenarios
   - Constraint-based planning

**Lecciones Aprendidas:**
- Configurator es esencial para productos customizables
- APS es differentiator para manufactura compleja
- Mixed-mode permite atender diversos tipos de producción

### 2.5 Epicor ERP

**Fortalezas Clave:**
1. **Kinetic Design System:**
   - Low-code customization
   - Flexible workflows con approval routing

2. **Advanced Material Management:**
   - Kanban replenishment
   - Min/Max planning
   - Economic Order Quantity (EOQ) calculation

3. **Compliance:**
   - REACH/RoHS tracking
   - Country of Origin tracking
   - Certificates of Analysis (CoA) generation

**Lecciones Aprendidas:**
- Kanban mejora flow en repetitive manufacturing
- Compliance tracking debe ser first-class citizen
- CoAs son mandatorios en industrias reguladas

---

## 3. Diseño de la Vertical Manufacturing

### 3.1 Visión y Propuesta de Valor

**Visión:**
> "Ser el ERP de manufactura más accesible, intuitivo y potente para PYMEs fabricantes en Latinoamérica, con capacidades de clase mundial a precios competitivos."

**Propuesta de Valor:**
1. **Implementación Rápida:** Onboarding en < 2 semanas vs 3-6 meses de SAP/Oracle
2. **Precio Competitivo:** $199-499/mes vs $2,000-10,000/mes de competidores
3. **Español-First:** UX pensada para mercado latinoamericano
4. **Multi-Industria:** Soporte para alimentos, químicos, metalmecánica, textiles, plásticos
5. **Compliance Local:** Integración con normativas locales (INVIMA, COFEPRIS, FDA)

### 3.2 Tipos de Fabricantes Target

**Industrias Objetivo:**
1. **Alimentos y Bebidas:**
   - Panaderías industriales
   - Procesadoras de lácteos
   - Embotelladoras
   - Productoras de snacks
   - Confiterías

2. **Química y Farmacéutica:**
   - Cosméticos y cuidado personal
   - Productos de limpieza
   - Suplementos alimenticios
   - Farmacéuticos OTC

3. **Metalmecánica:**
   - Fabricación de piezas
   - Ensamblaje de equipos
   - Herrería industrial

4. **Textil y Confección:**
   - Confección de ropa
   - Producción de calzado
   - Textiles para hogar

5. **Plásticos y Empaques:**
   - Inyección de plásticos
   - Producción de empaques
   - Bolsas y películas plásticas

6. **Electrónica:**
   - Ensamblaje de PCBs
   - Productos electrónicos

### 3.3 Categorías de Productos para Manufactura

**Nueva Taxonomía de Productos:**

```typescript
enum ProductCategory {
  // Inputs (Entradas)
  RAW_MATERIAL = 'raw_material',                 // Materias primas base
  SEMI_FINISHED = 'semi_finished',               // Semi-elaborados
  PACKAGING_MATERIAL = 'packaging_material',     // Materiales de empaque
  LABELING_MATERIAL = 'labeling_material',       // Etiquetas, stickers
  CONSUMABLE_MATERIAL = 'consumable_material',   // Consumibles de producción

  // Outputs (Salidas)
  FINISHED_GOOD = 'finished_good',               // Producto terminado
  BY_PRODUCT = 'by_product',                     // Sub-producto
  CO_PRODUCT = 'co_product',                     // Co-producto

  // Special
  PHANTOM = 'phantom',                           // Phantom (no va a inventario)
  TOOL = 'tool',                                 // Herramientas y moldes
  SPARE_PART = 'spare_part',                     // Refacciones
}
```

**Ejemplos por Industria:**

**Alimentos (Panadería):**
- `RAW_MATERIAL`: Harina, azúcar, levadura, sal
- `PACKAGING_MATERIAL`: Bolsas plásticas, cajas de cartón
- `LABELING_MATERIAL`: Etiquetas nutricionales, stickers de marca
- `CONSUMABLE_MATERIAL`: Papel encerado, combustible de hornos
- `FINISHED_GOOD`: Pan empacado y etiquetado
- `BY_PRODUCT`: Recortes de masa (para alimento animal)

**Cosméticos:**
- `RAW_MATERIAL`: Aceites base, fragancias, emulsionantes
- `SEMI_FINISHED`: Emulsión base antes de fragancia
- `PACKAGING_MATERIAL`: Botellas, tapas, cajas
- `LABELING_MATERIAL`: Etiquetas regulatorias, sellos
- `FINISHED_GOOD`: Crema facial empacada
- `CO_PRODUCT`: Diferentes tamaños (30ml, 50ml, 100ml) del mismo batch

### 3.4 Módulos de la Vertical MANUFACTURING

**Módulos Core (ya existentes, se mantienen):**
- ✅ `inventory`: Gestión de inventarios
- ✅ `orders`: Órdenes de venta
- ✅ `customers`: Clientes
- ✅ `suppliers`: Proveedores
- ✅ `reports`: Reportes
- ✅ `accounting`: Contabilidad
- ✅ `payroll`: Nómina
- ✅ `bankAccounts`: Cuentas bancarias

**Módulos Manufacturing (nuevos y existentes):**
- ✅ `production`: Módulo base de producción (YA EXISTE)
- ✅ `bom`: Bill of Materials (YA EXISTE)
- ✅ `routing`: Rutas de producción (YA EXISTE)
- ✅ `workCenters`: Centros de trabajo (YA EXISTE)
- ✅ `mrp`: Material Requirements Planning (YA EXISTE)
- 🆕 `qualityControl`: Control de calidad
- 🆕 `maintenance`: Mantenimiento preventivo/correctivo
- 🆕 `productionScheduling`: Programación avanzada
- 🆕 `shopFloorControl`: Control de piso (tablets, kioscos)
- 🆕 `traceability`: Trazabilidad completa (lote a lote)
- 🆕 `costing`: Gestión de costos avanzada
- 🆕 `plm`: Product Lifecycle Management
- 🆕 `capacityPlanning`: Planeación de capacidad
- 🆕 `compliance`: Cumplimiento regulatorio

**Módulos Deshabilitados para Manufacturing:**
- ❌ `tables`: No aplica (restaurantes)
- ❌ `kitchenDisplay`: No aplica (restaurantes)
- ❌ `menuEngineering`: No aplica (restaurantes)
- ❌ `pos`: No aplica en contexto de manufactura
- ❌ `appointments`: No aplica (servicios)
- ❌ `resources`: No aplica (servicios)
- ❌ `booking`: No aplica (servicios)

**Módulos Opcionales (pueden habilitarse):**
- 🔘 `ecommerce`: Para B2B o D2C
- 🔘 `variants`: Si venden con variantes
- 🔘 `warehousing`: Si tienen almacenes múltiples
- 🔘 `dispatch`: Si hacen distribución propia
- 🔘 `hrCore`: Si quieren HR completo
- 🔘 `timeAndAttendance`: Control de asistencia

---

## 4. Arquitectura Técnica

### 4.1 Cambios en Esquemas de Base de Datos

#### 4.1.1 Tenant Schema (tenant.schema.ts)

**Añadir a `vertical` enum:**
```typescript
@Prop({
  type: String,
  enum: ["FOOD_SERVICE", "RETAIL", "SERVICES", "LOGISTICS", "HYBRID", "MANUFACTURING"],
  default: "FOOD_SERVICE",
  required: true,
})
vertical: string;
```

**Añadir a `enabledModules`:**
```typescript
enabledModules: {
  // ... existing modules ...

  // MANUFACTURING specific modules
  production?: boolean;
  bom?: boolean;
  routing?: boolean;
  workCenters?: boolean;
  mrp?: boolean;
  qualityControl?: boolean;
  maintenance?: boolean;
  productionScheduling?: boolean;
  shopFloorControl?: boolean;
  traceability?: boolean;
  costing?: boolean;
  plm?: boolean;
  capacityPlanning?: boolean;
  compliance?: boolean;
}
```

**Añadir a `TenantSettings`:**
```typescript
@Prop({ type: Object })
manufacturing?: {
  // Métodos de costeo
  costingMethod?: 'standard' | 'average' | 'fifo' | 'lifo';

  // Configuración de producción
  defaultProductionStrategy?: 'make_to_stock' | 'make_to_order' | 'engineer_to_order';
  backflushEnabled?: boolean;
  autoConsumeMaterials?: boolean;

  // Control de calidad
  qcRequired?: boolean;
  qcStages?: ('receiving' | 'in_process' | 'final_inspection')[];

  // Trazabilidad
  lotTrackingLevel?: 'none' | 'basic' | 'full_genealogy';
  serialNumberRequired?: boolean;

  // Compliance
  regulatoryBody?: 'fda' | 'invima' | 'cofepris' | 'iso' | 'other';
  certificationsRequired?: string[];

  // Scheduling
  schedulingMethod?: 'infinite' | 'finite';
  leadTimeBuffer?: number; // días

  // Overhead
  overheadAllocationMethod?: 'labor_hours' | 'machine_hours' | 'material_cost' | 'units_produced';
  overheadRate?: number;
};
```

#### 4.1.2 Product Schema (product.schema.ts)

**Extender `ProductType` enum:**
```typescript
export enum ProductType {
  // Existing
  SIMPLE = "simple",
  CONSUMABLE = "consumable",
  SUPPLY = "supply",

  // Manufacturing additions
  RAW_MATERIAL = "raw_material",
  SEMI_FINISHED = "semi_finished",
  FINISHED_GOOD = "finished_good",
  PACKAGING_MATERIAL = "packaging_material",
  LABELING_MATERIAL = "labeling_material",
  BY_PRODUCT = "by_product",
  CO_PRODUCT = "co_product",
  PHANTOM = "phantom",
  TOOL = "tool",
  SPARE_PART = "spare_part",
}
```

**Añadir campos de manufactura:**
```typescript
@Schema({ timestamps: true })
export class Product {
  // ... existing fields ...

  // Manufacturing specific fields
  @Prop({ type: String, enum: ['make_to_stock', 'make_to_order', 'engineer_to_order'] })
  productionStrategy?: string;

  @Prop({ type: Boolean, default: false })
  isPhantom?: boolean; // No va a inventario, se consume directo

  @Prop({ type: Number })
  standardCost?: number; // Costo estándar calculado

  @Prop({ type: Number })
  overheadCost?: number; // Costos indirectos por unidad

  @Prop({ type: Object })
  manufacturingConfig?: {
    requiresQC?: boolean;
    qcCheckpoints?: string[]; // ['receiving', 'in_process', 'final']
    batchSizeMin?: number;
    batchSizeMax?: number;
    batchSizeOptimal?: number;
    shelfLifeAfterProduction?: number; // días
    requiredCertifications?: string[];
    regulatoryNotes?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'BillOfMaterials' })
  defaultBomId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Routing' })
  defaultRoutingId?: Types.ObjectId;

  @Prop({ type: [String] })
  alternativeBomIds?: string[]; // Referencias a BOMs alternativos

  @Prop({ type: [String] })
  alternativeRoutingIds?: string[]; // Rutas alternativas

  @Prop({ type: Boolean, default: false })
  canProduceByProducts?: boolean;

  @Prop({ type: Array })
  byProducts?: Array<{
    productId: Types.ObjectId;
    productSku: string;
    yieldPercentage: number; // % del batch principal
    isRecoverable: boolean; // Si se puede reprocesar
  }>;

  @Prop({ type: Object })
  tooling?: {
    requiredTools?: Types.ObjectId[]; // Referencias a tools
    setupTimeMinutes?: number;
    changeoverTimeMinutes?: number;
  };
}
```

#### 4.1.3 Inventory Schema - Mejoras para Manufactura

**Añadir trazabilidad completa:**
```typescript
@Schema({ timestamps: true })
export class InventoryLot {
  // ... existing fields ...

  // Manufacturing traceability
  @Prop({ type: Types.ObjectId, ref: 'ManufacturingOrder' })
  sourceManufacturingOrderId?: Types.ObjectId;

  @Prop({ type: String })
  parentLotNumber?: string; // Lote padre (si viene de otro lote)

  @Prop({ type: [String] })
  childLotNumbers?: string[]; // Lotes hijos (si fue usado para producir otros)

  @Prop({ type: Object })
  genealogy?: {
    level: number; // Nivel en el árbol de producción
    ancestors: Array<{
      lotNumber: string;
      productSku: string;
      quantity: number;
    }>;
  };

  @Prop({ type: Object })
  qualityData?: {
    inspectionDate?: Date;
    inspectedBy?: Types.ObjectId;
    passed?: boolean;
    testResults?: Record<string, any>;
    certificates?: string[]; // URLs a certificados
    nonConformances?: Array<{
      type: string;
      severity: 'minor' | 'major' | 'critical';
      description: string;
      correctiveAction?: string;
    }>;
  };

  @Prop({ type: Boolean, default: true })
  isReleasedForUse?: boolean; // Si QC lo aprobó para usar

  @Prop({ type: Object })
  compliance?: {
    certificateOfAnalysis?: string; // URL
    countryOfOrigin?: string;
    reachCompliant?: boolean;
    fda Compliant?: boolean;
    customsDocuments?: string[];
  };
}
```

#### 4.1.4 Manufacturing Order Schema - Mejoras

**Extender manufacturing-order.schema.ts:**
```typescript
@Schema({ timestamps: true })
export class ManufacturingOrder {
  // ... existing fields ...

  // Add quality control
  @Prop({ type: Object })
  qualityControl?: {
    required: boolean;
    checkpoints: Array<{
      stage: 'receiving' | 'in_process' | 'final';
      completedAt?: Date;
      completedBy?: Types.ObjectId;
      passed?: boolean;
      notes?: string;
      attachments?: string[];
    }>;
  };

  // Add by-products tracking
  @Prop({ type: Array })
  byProductsProduced?: Array<{
    productId: Types.ObjectId;
    productSku: string;
    productName: string;
    quantityProduced: number;
    unit: string;
    lotNumber?: string;
  }>;

  // Add scrap/waste tracking
  @Prop({ type: Object })
  scrap?: {
    totalScrapQuantity: number;
    scrapPercentage: number;
    scrapReasons: Array<{
      reason: string;
      quantity: number;
      cost: number;
    }>;
  };

  // Add actual consumption (for backflush comparison)
  @Prop({ type: Array })
  actualMaterialConsumption?: Array<{
    componentId: Types.ObjectId;
    componentSku: string;
    plannedQuantity: number;
    actualQuantity: number;
    variance: number;
    variancePercentage: number;
    lotNumber?: string;
  }>;

  // Add downtime tracking
  @Prop({ type: Array })
  downtimeEvents?: Array<{
    workCenterId: Types.ObjectId;
    reason: string;
    startTime: Date;
    endTime?: Date;
    durationMinutes: number;
    notes?: string;
  }>;
}
```

### 4.2 Nuevos Módulos Backend

#### 4.2.1 Quality Control Module

**Archivos a crear:**
- `src/modules/quality-control/quality-control.module.ts`
- `src/modules/quality-control/quality-control.controller.ts`
- `src/modules/quality-control/quality-control.service.ts`
- `src/schemas/quality-control-plan.schema.ts`
- `src/schemas/quality-inspection.schema.ts`

**Funcionalidades:**
- Crear planes de QC por producto/proceso
- Registrar inspecciones (receiving, in-process, final)
- Gestionar no conformidades
- Generar Certificates of Analysis (CoA)
- Reportes de calidad

#### 4.2.2 Maintenance Module

**Archivos a crear:**
- `src/modules/maintenance/maintenance.module.ts`
- `src/modules/maintenance/maintenance.controller.ts`
- `src/modules/maintenance/maintenance.service.ts`
- `src/schemas/maintenance-schedule.schema.ts`
- `src/schemas/maintenance-request.schema.ts`

**Funcionalidades:**
- Mantenimiento preventivo programado
- Solicitudes de mantenimiento correctivo
- Tracking de downtime
- Costos de mantenimiento
- Historial de equipo

#### 4.2.3 Production Scheduling Module

**Archivos a crear:**
- `src/modules/production-scheduling/production-scheduling.module.ts`
- `src/modules/production-scheduling/production-scheduling.controller.ts`
- `src/modules/production-scheduling/production-scheduling.service.ts`
- `src/modules/production-scheduling/dto/*.dto.ts`

**Funcionalidades:**
- Scheduling de órdenes con capacidad finita/infinita
- Gantt chart de producción
- What-if scenarios
- Optimización de setup times
- Priorización de órdenes

#### 4.2.4 Traceability Module

**Archivos a crear:**
- `src/modules/traceability/traceability.module.ts`
- `src/modules/traceability/traceability.controller.ts`
- `src/modules/traceability/traceability.service.ts`

**Funcionalidades:**
- Genealogía de lotes (forward/backward tracing)
- Lot explosion report
- Recall management
- Batch certification
- Supply chain visibility

#### 4.2.5 Advanced Costing Module

**Archivos a crear:**
- `src/modules/costing/costing.module.ts`
- `src/modules/costing/costing.controller.ts`
- `src/modules/costing/costing.service.ts`
- `src/modules/costing/dto/*.dto.ts`

**Funcionalidades:**
- Standard costing calculation
- Actual costing calculation
- Variance analysis (material, labor, overhead)
- Cost rollup (de materias primas a producto final)
- Overhead allocation
- Cost simulation

#### 4.2.6 Compliance Module

**Archivos a crear:**
- `src/modules/compliance/compliance.module.ts`
- `src/modules/compliance/compliance.controller.ts`
- `src/modules/compliance/compliance.service.ts`
- `src/schemas/certification.schema.ts`
- `src/schemas/audit.schema.ts`

**Funcionalidades:**
- Gestión de certificaciones (ISO, HACCP, FDA)
- Auditorías internas/externas
- Document control
- Training records
- Deviation management

### 4.3 Frontend - Nuevos Componentes

#### 4.3.1 Manufacturing Onboarding

**Archivo:** `src/pages/Register.jsx`

**Añadir vertical MANUFACTURING:**
```jsx
const businessVerticals = [
  // ... existing verticals ...
  {
    name: 'Fabricantes / Manufactura',
    value: 'MANUFACTURING',
    categories: [
      'Alimentos y Bebidas',
      'Química y Cosméticos',
      'Farmacéutica y Suplementos',
      'Metalmecánica',
      'Textil y Confección',
      'Plásticos y Empaques',
      'Electrónica',
      'Muebles y Madera',
      'Otro',
    ],
  },
];
```

#### 4.3.2 Quality Control UI

**Archivos a crear:**
- `src/components/quality-control/QualityControlDashboard.jsx`
- `src/components/quality-control/InspectionForm.jsx`
- `src/components/quality-control/NonConformanceManager.jsx`
- `src/components/quality-control/CoAGenerator.jsx`

#### 4.3.3 Production Scheduling UI

**Archivos a crear:**
- `src/components/production-scheduling/SchedulerView.jsx` (Gantt chart)
- `src/components/production-scheduling/CapacityAnalysis.jsx`
- `src/components/production-scheduling/OrderPrioritization.jsx`

#### 4.3.4 Traceability UI

**Archivos a crear:**
- `src/components/traceability/LotGenealogyViewer.jsx` (árbol visual)
- `src/components/traceability/RecallManager.jsx`
- `src/components/traceability/BatchCertification.jsx`

#### 4.3.5 Costing UI

**Archivos a crear:**
- `src/components/costing/CostBreakdownView.jsx`
- `src/components/costing/VarianceAnalysis.jsx`
- `src/components/costing/CostSimulator.jsx`

#### 4.3.6 Compliance UI

**Archivos a crear:**
- `src/components/compliance/CertificationManager.jsx`
- `src/components/compliance/AuditScheduler.jsx`
- `src/components/compliance/DocumentControl.jsx`

---

## 5. Hoja de Ruta de Implementación

### Resumen de Fases

| Fase | Nombre | Duración | Módulos Clave |
|------|--------|----------|---------------|
| **Fase 0** | Fundamentos (✅ COMPLETADA) | 6 sprints | BOM, Routing, Work Centers, MO, MRP, Dashboard |
| **Fase 1** | Onboarding & Vertical Setup | 1 sprint | Tenant schema, Onboarding UI, Product types |
| **Fase 2** | Quality Control | 2 sprints | QC Plans, Inspections, Non-conformances, CoA |
| **Fase 3** | Traceability | 2 sprints | Lot genealogy, Forward/backward tracing, Recall |
| **Fase 4** | Advanced Costing | 2 sprints | Standard/Actual costing, Variance, Overhead |
| **Fase 5** | Production Scheduling | 3 sprints | Gantt scheduler, Capacity planning, Optimization |
| **Fase 6** | Maintenance | 2 sprints | Preventive/Corrective maintenance, Downtime tracking |
| **Fase 7** | Compliance | 2 sprints | Certifications, Audits, Document control |
| **Fase 8** | Shop Floor Control | 2 sprints | Kiosks, Time tracking, Real-time reporting |
| **Fase 9** | PLM Basics | 2 sprints | ECOs, Product versioning, Document management |
| **Fase 10** | Polish & Launch | 2 sprints | Testing, Docs, Marketing, Pilots |

**Total:** 20 sprints (~10 meses con sprints de 2 semanas)

---

## 6. Fases del Proyecto

### Fase 1: Onboarding & Vertical Setup (Sprint 1)

**Objetivo:** Permitir que fabricantes se registren y tengan módulos de manufactura habilitados automáticamente.

**Tareas Backend:**
1. ✅ Extender `tenant.schema.ts`:
   - Añadir `MANUFACTURING` a enum de vertical
   - Añadir módulos manufacturing a `enabledModules`
   - Añadir `manufacturing` settings

2. ✅ Actualizar `vertical-features.config.ts`:
   - Crear configuración de `MANUFACTURING` vertical
   - Definir módulos habilitados por defecto

3. ✅ Extender `product.schema.ts`:
   - Añadir nuevos `ProductType` (RAW_MATERIAL, SEMI_FINISHED, etc.)
   - Añadir campos `manufacturingConfig`
   - Añadir referencias a BOMs y Routings

4. ✅ Actualizar `onboarding.service.ts`:
   - Asegurar que MANUFACTURING se maneje correctamente
   - Seedear categorías de productos según industria

**Tareas Frontend:**
1. ✅ Actualizar `Register.jsx`:
   - Añadir vertical "Fabricantes / Manufactura"
   - Añadir categorías de industrias manufactureras
   - Mostrar módulos que se habilitarán

2. ✅ Actualizar `App.jsx`:
   - Asegurar que sidebar muestre "Producción" con submenús

**Tareas Testing:**
1. ✅ Registrar un tenant con vertical MANUFACTURING
2. ✅ Verificar que módulos se habiliten correctamente
3. ✅ Verificar que sidebar muestre opciones correctas

**Entregables:**
- [ ] Tenant schema actualizado
- [ ] Vertical config actualizado
- [ ] Product schema extendido
- [ ] Frontend de registro actualizado
- [ ] Tests de integración pasando

**Definición de Listo:**
- Un usuario puede registrarse como "Fabricante"
- Los módulos de producción están habilitados automáticamente
- El dashboard muestra opciones de manufactura

---

### Fase 2: Quality Control (Sprints 2-3)

**Objetivo:** Implementar sistema completo de control de calidad con inspecciones, no conformidades y CoAs.

**Sprint 2: Infraestructura QC**

**Tareas Backend:**
1. Crear `quality-control-plan.schema.ts`:
   ```typescript
   - name, description
   - applicableProducts[]
   - inspectionStages[] (receiving, in_process, final)
   - checkpoints[] (name, type, acceptanceCriteria, testMethod)
   - samplingPlan (sampleSize, acceptanceLevel)
   - requiredEquipment[]
   - estimatedDurationMinutes
   ```

2. Crear `quality-inspection.schema.ts`:
   ```typescript
   - qcPlanId
   - inspectionType
   - productId, lotNumber
   - inspector (userId)
   - inspectionDate
   - results[] (checkpoint, measured, expected, passed)
   - overallResult (passed/failed)
   - nonConformances[]
   - attachments[] (photos, docs)
   ```

3. Crear `quality-control.service.ts`:
   - `createQCPlan()`
   - `getQCPlansForProduct()`
   - `createInspection()`
   - `recordInspectionResult()`
   - `generateCoA(lotNumber)`

4. Crear `quality-control.controller.ts`:
   - Endpoints para CRUD de planes QC
   - Endpoints para inspecciones
   - Endpoint para generar CoA (PDF)

**Tareas Frontend:**
1. Crear `QualityControlPlansManager.jsx`:
   - Lista de planes QC
   - Crear/editar plan con checkpoints
   - Asignar a productos

2. Crear `InspectionForm.jsx`:
   - Formulario para registrar inspección
   - Checklist dinámico según plan
   - Captura de fotos con cámara
   - Firma digital del inspector

**Sprint 3: No Conformidades y CoA**

**Tareas Backend:**
1. Crear `non-conformance.schema.ts`:
   ```typescript
   - ncNumber (auto-generated)
   - type, severity
   - description
   - rootCause, correctiveAction, preventiveAction
   - responsibleUserId
   - status (open, in_progress, closed)
   - dueDate, closedDate
   - verification (verified, verifiedBy, verifiedDate)
   ```

2. Extender `quality-control.service.ts`:
   - `createNonConformance()`
   - `assignCorrectiveAction()`
   - `verifyCorrectiveAction()`
   - `closeNonConformance()`

3. Implementar generación de CoA (PDF):
   - Template con datos del lote
   - Resultados de inspección
   - Firma digital
   - QR code para verificación

**Tareas Frontend:**
1. Crear `NonConformanceManager.jsx`:
   - Lista de NCs abiertas/cerradas
   - Crear NC desde inspección fallida
   - Asignar acciones correctivas
   - Workflow de aprobación

2. Crear `CoAGenerator.jsx`:
   - Vista previa de CoA
   - Generación de PDF
   - Historial de CoAs emitidos
   - Búsqueda por lote

**Entregables Fase 2:**
- [ ] Módulo QC completo (backend + frontend)
- [ ] Generación de CoAs en PDF
- [ ] Gestión de no conformidades
- [ ] Tests unitarios y de integración
- [ ] Documentación de usuario

**Definición de Listo Fase 2:**
- Se pueden crear planes QC y asignarlos a productos
- Las inspecciones se registran con pass/fail
- Las no conformidades generan acciones correctivas
- Los CoAs se generan automáticamente en PDF

---

### Fase 3: Trazabilidad (Sprints 4-5)

**Objetivo:** Implementar trazabilidad completa de lotes con genealogía, forward/backward tracing y recall management.

**Sprint 4: Genealogía de Lotes**

**Tareas Backend:**
1. Actualizar `inventory.schema.ts`:
   - Añadir campos de genealogía (ya diseñados arriba)
   - Indexar por `parentLotNumber` y `childLotNumbers`

2. Crear `traceability.service.ts`:
   - `buildLotGenealogy(lotNumber)`: Construir árbol completo
   - `getAncestors(lotNumber)`: Lotes usados para producir este
   - `getDescendants(lotNumber)`: Lotes producidos con este
   - `getLotUsageHistory(lotNumber)`: Dónde se usó
   - `getProductionPath(lotNumber)`: Camino completo de producción

3. Actualizar `manufacturing-order.service.ts`:
   - Al completar orden, vincular lotes padres → hijos
   - Registrar genealogía en inventario

4. Crear endpoints de trazabilidad:
   - `GET /traceability/lot/:lotNumber/genealogy`
   - `GET /traceability/lot/:lotNumber/ancestors`
   - `GET /traceability/lot/:lotNumber/descendants`
   - `GET /traceability/lot/:lotNumber/usage`

**Tareas Frontend:**
1. Crear `LotGenealogyViewer.jsx`:
   - Vista de árbol interactivo (react-d3-tree o similar)
   - Nodos clickeables para ver detalles de lote
   - Filtros por producto, fecha
   - Export a PDF/Excel

2. Crear `LotSearchBar.jsx`:
   - Búsqueda rápida por número de lote
   - Autocompletado
   - Quick actions (ver genealogía, ver stock, ver órdenes)

**Sprint 5: Recall Management**

**Tareas Backend:**
1. Crear `recall.schema.ts`:
   ```typescript
   - recallNumber (auto-generated)
   - reason, severity (low, medium, high, critical)
   - affectedProduct, affectedLots[]
   - initiatedBy, initiatedDate
   - status (investigation, in_progress, completed)
   - customersAffected[]
   - quantityAffected, quantityRecovered
   - rootCause, correctiveActions[]
   - closedDate, reportUrl
   ```

2. Extender `traceability.service.ts`:
   - `initiateRecall(productId, lotNumbers, reason)`
   - `getAffectedCustomers(lotNumbers)`: Clientes que compraron
   - `getAffectedInventory(lotNumbers)`: Stock afectado
   - `getAffectedProduction(lotNumbers)`: Órdenes afectadas
   - `markLotAsRecalled(lotNumber)`
   - `closeRecall(recallId, report)`

3. Crear `recall.controller.ts`:
   - CRUD de recalls
   - Reportes de recall

**Tareas Frontend:**
1. Crear `RecallManager.jsx`:
   - Iniciar recall con wizard
   - Lista de recalls activos/cerrados
   - Vista de impacto (customers, inventory, production)
   - Acciones: bloquear stock, notificar clientes, generar reporte

2. Crear `RecallImpactReport.jsx`:
   - Resumen de impacto
   - Lista de clientes afectados con datos de contacto
   - Inventario afectado por ubicación
   - Timeline de recall
   - Export a PDF para reguladores

**Entregables Fase 3:**
- [ ] Genealogía de lotes funcional
- [ ] Viewer de árbol de trazabilidad
- [ ] Módulo de recall management
- [ ] Reportes de impacto
- [ ] Tests de trazabilidad
- [ ] Documentación

**Definición de Listo Fase 3:**
- Se puede visualizar el árbol completo de un lote
- Forward y backward tracing funcionan
- Los recalls se pueden iniciar y rastrear
- Los reportes de impacto se generan correctamente

---

### Fase 4: Advanced Costing (Sprints 6-7)

**Objetivo:** Implementar sistema avanzado de costos con standard costing, actual costing, variance analysis y overhead allocation.

**Sprint 6: Standard & Actual Costing**

**Tareas Backend:**
1. Crear `costing.service.ts`:
   - `calculateStandardCost(productId)`:
     ```
     Standard Cost = Σ(Material Cost) + Σ(Labor Cost) + Overhead
     Material Cost = Σ(component.quantity * component.standardCost)
     Labor Cost = Σ(operation.setupTime + operation.runTime) * workCenter.laborRate
     Overhead = Labor Hours * Overhead Rate
     ```

   - `calculateActualCost(manufacturingOrderId)`:
     ```
     Actual Cost = Actual Materials + Actual Labor + Actual Overhead
     ```

   - `rollupProductCost(productId)`:
     - Calcular costo recursivamente desde materias primas
     - Considerar BOMs multinivel

   - `allocateOverhead(manufacturingOrderId)`:
     - Método: labor_hours | machine_hours | material_cost | units_produced
     - Aplicar rate de overhead

2. Crear `cost-variance.schema.ts`:
   ```typescript
   - manufacturingOrderId
   - productId, productSku
   - standardCost, actualCost, variance
   - materialVariance { standard, actual, variance, percentage }
   - laborVariance { standard, actual, variance, percentage }
   - overheadVariance { standard, actual, variance, percentage }
   - reasons[] (material_price_change, labor_inefficiency, scrap, etc.)
   - analysis (favorable/unfavorable)
   - calculatedAt
   ```

3. Extender `manufacturing-order.service.ts`:
   - Al completar orden, calcular actual cost
   - Generar cost variance automáticamente
   - Permitir ajustes manuales con justificación

4. Crear endpoints de costing:
   - `GET /costing/product/:productId/standard-cost`
   - `GET /costing/product/:productId/cost-rollup`
   - `GET /costing/manufacturing-order/:orderId/actual-cost`
   - `GET /costing/manufacturing-order/:orderId/variance`
   - `POST /costing/overhead-allocation`

**Tareas Frontend:**
1. Crear `CostBreakdownView.jsx`:
   - Visualización de costo estándar con drill-down
   - Gráfico de torta: Materials, Labor, Overhead
   - Tabla detallada de componentes
   - Comparación de versiones de BOM

2. Crear `ProductCostingCard.jsx`:
   - Card en detalle de producto
   - Standard cost, Last actual cost, Average cost
   - Trend chart de costos históricos
   - Botón "Recalcular costo estándar"

**Sprint 7: Variance Analysis & Overhead Management**

**Tareas Backend:**
1. Extender `costing.service.ts`:
   - `getVarianceReport(startDate, endDate, filters)`:
     - Aggregate variances por producto, centro de trabajo, tipo
     - Identificar tendencias

   - `getTopVariances(limit, type)`:
     - Top N varianzas más altas

   - `explainVariance(varianceId)`:
     - Análisis detallado de causas

   - `forecastCost(productId, quantity, date)`:
     - Predecir costo futuro considerando trends

2. Crear `overhead-rate.schema.ts`:
   ```typescript
   - name (e.g., "Plant Overhead 2025")
   - applicablePeriod { start, end }
   - allocationBasis ('labor_hours' | 'machine_hours' | 'material_cost' | 'units_produced')
   - budgetedOverhead (total overhead esperado)
   - budgetedAllocationBase (total horas/costo esperado)
   - rate (budgetedOverhead / budgetedAllocationBase)
   - actualOverhead (se va actualizando)
   - actualAllocationBase
   - varianceOverhead
   ```

3. Implementar overhead rate management:
   - `createOverheadRate()`
   - `updateActualOverhead()` (mensual)
   - `calculateOverheadVariance()`
   - `applyOverheadToOrder()`

**Tareas Frontend:**
1. Crear `VarianceAnalysisDashboard.jsx`:
   - KPIs: Total variance, Favorable vs Unfavorable
   - Chart de tendencia de varianzas
   - Top 10 productos con mayor varianza
   - Breakdown por tipo (material, labor, overhead)
   - Filtros por fecha, producto, centro de trabajo

2. Crear `OverheadManager.jsx`:
   - Configurar overhead rates
   - Definir período y basis
   - Actualizar actual overhead mensualmente
   - Ver varianza de overhead
   - Proyecciones

3. Crear `CostSimulator.jsx`:
   - Simular costo de producción con diferentes escenarios
   - Cambiar cantidades, materiales, routings
   - Comparar alternativas
   - Sensitivity analysis

**Entregables Fase 4:**
- [ ] Sistema de costing completo
- [ ] Variance analysis automático
- [ ] Overhead allocation configurable
- [ ] Cost simulator
- [ ] Reportes de costos
- [ ] Tests de cálculos
- [ ] Documentación

**Definición de Listo Fase 4:**
- Los costos estándar se calculan automáticamente
- Los costos reales se registran al completar órdenes
- Las varianzas se generan y analizan
- El overhead se alloca correctamente
- Los reportes de costos son precisos

---

### Fase 5: Production Scheduling (Sprints 8-10)

**Objetivo:** Implementar scheduler avanzado con Gantt, capacidad finita/infinita y optimización.

**Sprint 8: Scheduler Backend**

**Tareas Backend:**
1. Crear `production-schedule.schema.ts`:
   ```typescript
   - scheduleName
   - startDate, endDate
   - schedulingMethod ('finite' | 'infinite')
   - orders[] {
       orderId
       scheduledStartDate
       scheduledEndDate
       workCenterAllocations[] {
         workCenterId
         operationId
         startTime
         endTime
         duration
       }
     }
   - constraints[] (max_orders_per_day, shift_times, holidays)
   - status ('draft' | 'active' | 'archived')
   ```

2. Crear `production-scheduling.service.ts`:
   - `scheduleMO(orderId, options)`:
     - Backward scheduling (desde due date)
     - Forward scheduling (desde hoy)
     - Considerar lead times

   - `scheduleMultipleMOs(orderIds[], method)`:
     - Priority rules: FIFO, EDD (Earliest Due Date), SPT (Shortest Processing Time)

   - `checkCapacity(workCenterId, date)`:
     - Available capacity vs scheduled
     - Detect overloads

   - `optimizeSchedule(scheduleId, objective)`:
     - Minimize makespan
     - Minimize tardiness
     - Maximize utilization

   - `whatIfScenario(scheduleId, changes)`:
     - Crear copia para simulación
     - Aplicar cambios (add/remove/reorder orders)
     - Evaluar impacto

**Tareas Testing:**
- Tests de algoritmos de scheduling
- Tests de detección de conflicts
- Tests de optimización

**Sprint 9: Scheduler Frontend - Gantt Chart**

**Tareas Frontend:**
1. Evaluar librerías de Gantt:
   - Opciones: dhtmlx-gantt (paid), frappe-gantt (free), react-gantt-chart
   - Requisitos: drag-and-drop, zoom, dependencies, tooltips

2. Crear `SchedulerView.jsx`:
   - Gantt chart principal
   - Timeline: day/week/month views
   - Rows: Work Centers o Manufacturing Orders
   - Tasks: Operations con colores por estado
   - Drag-and-drop para reprogramar
   - Tooltips con detalles de orden/operación

3. Crear `SchedulerToolbar.jsx`:
   - Botones: Schedule All, Optimize, What-If, Save, Reset
   - Filtros: Por producto, centro de trabajo, fecha
   - Scheduling method: Finite vs Infinite
   - Priority rules selector

4. Crear `CapacityLoadChart.jsx`:
   - Gráfico de carga por work center
   - Barras: Scheduled hours vs Available hours
   - Highlight overloads en rojo
   - Drill-down a detalles

**Sprint 10: Optimización y What-If**

**Tareas Backend:**
1. Implementar algoritmos de optimización:
   - Genetic Algorithm para scheduling óptimo
   - Simulated Annealing
   - Constraint Programming (OR-Tools de Google)

2. Crear `what-if-scenario.schema.ts`:
   ```typescript
   - scenarioName
   - baseScheduleId
   - changes[] (type, orderId, newDate, etc.)
   - results {
       makespan
       totalTardiness
       utilizationRate
       comparison (vs base schedule)
     }
   - createdBy, createdAt
   ```

**Tareas Frontend:**
1. Crear `WhatIfScenarioManager.jsx`:
   - Crear escenario desde schedule actual
   - Aplicar cambios (add orders, change dates, change priorities)
   - Ejecutar re-scheduling
   - Comparar resultados con base
   - Aplicar escenario si es mejor

2. Crear `ScheduleComparison.jsx`:
   - Vista lado a lado de dos schedules
   - Metrics comparison table
   - Visual diff en Gantt

3. Crear `OrderPrioritization.jsx`:
   - Lista de órdenes pendientes de programar
   - Drag-and-drop para reordenar
   - Auto-prioritization rules
   - Save priority order

**Entregables Fase 5:**
- [ ] Scheduler backend completo
- [ ] Gantt chart interactivo
- [ ] Algoritmos de optimización
- [ ] What-if scenarios
- [ ] Capacity analysis
- [ ] Tests de scheduling
- [ ] Documentación

**Definición de Listo Fase 5:**
- Las órdenes se programan automáticamente
- El Gantt muestra todas las órdenes y operaciones
- La capacidad se monitorea en tiempo real
- Los usuarios pueden crear what-if scenarios
- La optimización mejora el schedule

---

### Fase 6: Maintenance (Sprints 11-12)

**Objetivo:** Implementar gestión de mantenimiento preventivo y correctivo con tracking de downtime.

**(Los detalles de esta fase se pueden expandir siguiendo el mismo patrón de las fases anteriores)**

**Contenido clave:**
- Maintenance schedules (preventive)
- Maintenance requests (corrective)
- Work orders de mantenimiento
- Spare parts management
- Downtime tracking
- Equipment history
- Maintenance costs
- Integration con work centers

---

### Fase 7: Compliance (Sprints 13-14)

**Objetivo:** Sistema de gestión de cumplimiento regulatorio, certificaciones y auditorías.

**(Detalles a expandir)**

---

### Fase 8: Shop Floor Control (Sprints 15-16)

**Objetivo:** Interfaces para tablets/kioscos en piso de producción.

**(Detalles a expandir)**

---

### Fase 9: PLM Basics (Sprints 17-18)

**Objetivo:** Gestión del ciclo de vida del producto con ECOs y document management.

**(Detalles a expandir)**

---

### Fase 10: Polish & Launch (Sprints 19-20)

**Objetivo:** Testing exhaustivo, documentación y lanzamiento comercial.

**Tareas:**
- Testing de integración end-to-end
- Performance testing y optimización
- Security audit
- Documentación de usuario completa
- Videos de capacitación
- Material de marketing
- Pilotos con 3-5 clientes beta
- Launch plan y estrategia go-to-market

---

## 7. KPIs de Éxito

### 7.1 KPIs Técnicos

1. **Performance:**
   - MRP calculation < 5 segundos para 1000 productos
   - BOM explosion < 2 segundos para 10 niveles
   - Gantt chart render < 3 segundos para 500 órdenes
   - API response time p95 < 500ms

2. **Reliability:**
   - Uptime > 99.5%
   - Data accuracy > 99.9%
   - Zero data loss incidents

3. **Code Quality:**
   - Test coverage > 80%
   - TypeScript strict mode enabled
   - ESLint errors = 0
   - Security vulnerabilities = 0 (high/critical)

### 7.2 KPIs de Producto

1. **Onboarding:**
   - Time to first MO created < 1 hora
   - Onboarding completion rate > 80%
   - User satisfaction (NPS) > 50

2. **Adoption:**
   - DAU/MAU ratio > 40% (usuarios diarios vs mensuales)
   - Feature adoption:
     - MRP usage > 70% de tenants manufacturing
     - QC usage > 50%
     - Traceability usage > 40%

3. **Retention:**
   - Churn rate < 5% mensual
   - Customer lifetime > 24 meses
   - Expansion revenue (upsells) > 15%

### 7.3 KPIs de Negocio

1. **Adquisición:**
   - 50 tenants manufacturing en primeros 6 meses post-launch
   - CAC (Customer Acquisition Cost) < $500
   - Conversion rate trial-to-paid > 30%

2. **Revenue:**
   - MRR (Monthly Recurring Revenue) > $10K a los 6 meses
   - ARPU (Average Revenue Per User) > $250/mes
   - Revenue from manufacturing vertical > 20% de total

3. **Competitividad:**
   - Win rate vs competitors > 40% en deals competidos
   - Feature parity con SAP Business One > 70%
   - Price advantage vs competitors > 50% (más barato)

---

## 8. Riesgos y Mitigaciones

### Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de scheduling algorithms | Alta | Alto | Usar librerías probadas (OR-Tools), hacer PoC early |
| Performance con datos masivos | Media | Alto | Indexing estratégico, caching, pagination |
| Integración con módulos existentes | Media | Medio | Tests de integración extensivos, refactoring incremental |

### Riesgos de Producto

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Feature creep (demasiadas features) | Alta | Alto | Priorización estricta, MVP por fase |
| UX compleja para usuarios | Media | Alto | User testing continuo, simplificación |
| Compliance gaps (regulatorio) | Media | Crítico | Consultoría legal/regulatoria por industria |

### Riesgos de Negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Competencia de players establecidos | Alta | Alto | Diferenciación en precio, UX, tiempo de implementación |
| Baja adopción inicial | Media | Alto | Pilotos gratuitos, partners implementadores |
| Regulaciones cambiantes | Baja | Medio | Arquitectura modular para compliance, updates rápidos |

---

## 9. Recursos Necesarios

### Equipo

**Core Team:**
- 1 Product Manager (PM) - Full time
- 2 Backend Developers (Node.js/NestJS) - Full time
- 2 Frontend Developers (React) - Full time
- 1 UI/UX Designer - Part time (50%)
- 1 QA Engineer - Full time
- 1 DevOps Engineer - Part time (25%)

**Consultores/Asesores:**
- 1 Manufacturing Expert (ex-SAP/Odoo consultant) - Part time
- 1 Compliance Consultant (FDA/ISO) - Por demanda
- 1 Algorithms Expert (scheduling/optimization) - Part time

**Total:** ~6.75 FTEs

### Tecnologías Adicionales

**Backend:**
- OR-Tools (Google) para optimization algorithms
- Bull Queue para background jobs (MRP, scheduling)
- PDF generation (puppeteer o pdfkit)
- WebSockets para real-time updates en shop floor

**Frontend:**
- Gantt chart library (dhtmlx-gantt o frappe-gantt)
- D3.js o react-d3-tree para genealogy visualization
- React Query para data fetching
- Recharts para dashboards avanzados

**Infrastructure:**
- Redis para caching de MRP results
- MongoDB replica set para high availability
- S3-compatible storage para CoAs, attachments
- CDN para assets

### Presupuesto Estimado

**Salarios (10 meses):**
- Team salaries: $300K - $450K (dependiendo de ubicación)

**Software/Services:**
- Gantt library license: $1K - $2K
- OR-Tools: Free (open source)
- Infrastructure (AWS/GCP): $500 - $1K/mes

**Otros:**
- Legal/compliance consultancy: $5K - $10K
- Marketing/launch: $10K - $20K

**Total:** $320K - $490K

**ROI Esperado:**
- Break-even: 18-24 meses
- Payback period: < 3 años
- Projected revenue (año 3): $1M+ ARR de vertical manufacturing

---

## 10. Conclusiones y Próximos Pasos

### Resumen Ejecutivo

La implementación de la vertical **MANUFACTURING** posicionará a SmartKubik como un ERP competitivo para fabricantes PYMEs en Latinoamérica. Con un enfoque en:
- **Facilidad de uso** superior a SAP/Oracle
- **Precio accesible** (10-20% del costo de competidores)
- **Funcionalidad de clase mundial** (MRP, QC, Traceability, Costing, Scheduling)
- **Compliance local** (FDA, INVIMA, COFEPRIS)

Podemos capturar un mercado de $500M+ en manufactura de alimentos, químicos y otros sectores.

### Próximos Pasos Inmediatos

**Esta Semana:**
1. ✅ **Aprobar esta hoja de ruta** con stakeholders
2. 🔄 **Iniciar Fase 1** (Onboarding & Vertical Setup)
   - Actualizar schemas (tenant, product)
   - Actualizar vertical config
   - Actualizar UI de registro
3. 📝 **Documentar decisiones** de arquitectura

**Próximas 2 Semanas:**
1. 🚀 **Completar Fase 1**
2. 🧪 **Testing de onboarding** con usuarios internos
3. 📊 **Preparar demo** para investors/clientes potenciales
4. 🎯 **Iniciar Fase 2** (Quality Control)

**Próximo Mes:**
1. 🏗️ **Completar Fases 2-3** (QC + Traceability)
2. 🤝 **Identificar 3-5 clientes beta** para pilotos
3. 📈 **Refinar pricing** y go-to-market strategy

### Call to Action

¿Estás listo para construir el ERP de manufactura más poderoso y accesible de Latinoamérica?

**Let's ship it! 🚀**

---

**Documento preparado por:** Claude (Anthropic)
**Fecha:** 2025-01-14
**Versión:** 1.0
**Próxima revisión:** Al completar Fase 1
