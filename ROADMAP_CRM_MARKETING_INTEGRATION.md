# 🔗 ROADMAP - INTEGRACIÓN CRM-MARKETING: HISTORIAL DE COMPRAS Y CAMPAÑAS POR PRODUCTO

**Objetivo**: Crear campañas de marketing dirigidas basadas en el historial real de compras de clientes, enviando promociones de productos específicos solo a aquellos clientes que tienen mayor probabilidad de comprarlos.

**Estado Actual**: Planificación
**Última actualización**: 2025-01-21

---

## 🎯 VISIÓN GENERAL

### El Problema que Resolvemos
Actualmente las campañas de marketing se envían a segmentos amplios sin considerar **qué productos específicos compra cada cliente**. Esto resulta en:
- ❌ Spam a clientes con productos que nunca comprarían
- ❌ Baja tasa de conversión
- ❌ Desperdicio de recursos de marketing
- ❌ Experiencia de cliente pobre

### La Solución
Integrar profundamente el **historial de compras por cliente** con el **módulo de marketing** para:
- ✅ Enviar promociones de productos solo a clientes que los compran
- ✅ Identificar productos complementarios automáticamente
- ✅ Crear audiencias objetivo ultra-precisas
- ✅ Maximizar ROI de campañas
- ✅ Mejorar experiencia del cliente

### Inspiración (ERPs Top del Mercado)
Los mejores ERPs (SAP, Oracle NetSuite, Microsoft Dynamics) implementan esto así:
1. **Purchase History Module** - Historial completo de transacciones
2. **Product Affinity Analysis** - Análisis de afinidad por producto
3. **Customer-Product Matrix** - Matriz de cliente-producto
4. **Targeted Campaigns** - Campañas dirigidas por producto
5. **Predictive Analytics** - Análisis predictivo de compra

---

## 📋 FASES DE IMPLEMENTACIÓN

### FASE 1: HISTORIAL DE TRANSACCIONES POR CLIENTE/PROVEEDOR (CRÍTICO)
**Prioridad**: 🔴 ALTA - Base fundamental de todo el sistema
**Estimación**: 3-4 días

#### Backend

##### 1.1. Schema: CustomerTransactionHistory
```typescript
@Schema({ timestamps: true })
export class CustomerTransactionHistory {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ required: true })
  orderDate: Date;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: String, enum: ['completed', 'cancelled', 'refunded'] })
  status: string;

  // Items purchased - CRÍTICO para análisis por producto
  @Prop({ type: [ProductPurchaseItem] })
  items: ProductPurchaseItem[];

  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;
}

// Sub-schema para items
export class ProductPurchaseItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop()
  category?: string;

  @Prop()
  brand?: string;
}
```

##### 1.2. Schema: SupplierTransactionHistory
Similar al anterior pero para proveedores:
```typescript
@Schema({ timestamps: true })
export class SupplierTransactionHistory {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' })
  purchaseOrderId: Types.ObjectId;

  @Prop({ required: true })
  orderDate: Date;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: [ProductPurchaseItem] })
  items: ProductPurchaseItem[];

  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;
}
```

##### 1.3. Service: TransactionHistoryService
```typescript
@Injectable()
export class TransactionHistoryService {
  // CRUD básico
  async recordCustomerTransaction(orderId: string, tenantId: string): Promise<void>
  async getCustomerTransactionHistory(customerId: string, filters?: any): Promise<CustomerTransactionHistory[]>
  async getSupplierTransactionHistory(supplierId: string, filters?: any): Promise<SupplierTransactionHistory[]>

  // Análisis por producto
  async getCustomerProductHistory(customerId: string, productId: string): Promise<any>
  async getCustomersWhoP urchasedProduct(productId: string, dateRange?: any): Promise<Customer[]>

  // Estadísticas
  async getCustomerPurchaseFrequency(customerId: string, productId: string): Promise<number>
  async getAverageOrderValue(customerId: string): Promise<number>
  async getTopProductsByCustomer(customerId: string, limit?: number): Promise<any[]>
}
```

##### 1.4. Integración con Orders
- Hook en OrderService para registrar transacciones automáticamente
- Actualizar historial cuando una orden se completa
- Sincronización retroactiva de órdenes existentes

##### 1.5. Controller: TransactionHistoryController
```typescript
@Controller('transactions')
export class TransactionHistoryController {
  @Get('customer/:customerId')
  async getCustomerHistory()

  @Get('supplier/:supplierId')
  async getSupplierHistory()

  @Get('customer/:customerId/products')
  async getCustomerProducts()

  @Get('product/:productId/customers')
  async getProductCustomers()
}
```

#### Frontend

##### 1.6. Componente: CustomerTransactionHistory
- Vista de historial completo del cliente
- Filtros por fecha, producto, categoría
- Estadísticas visuales (gráficos de compra)
- Drill-down a detalles de orden

##### 1.7. Componente: ProductCustomerList
- Lista de clientes que compraron un producto específico
- Última compra, frecuencia, total gastado
- Botón para crear campaña dirigida

##### 1.8. API Functions
```javascript
export const getCustomerTransactionHistory = (customerId, filters) => ...
export const getProductCustomers = (productId, filters) => ...
export const getCustomerProductStats = (customerId, productId) => ...
```

---

### FASE 2: MATRIZ CLIENTE-PRODUCTO Y ANÁLISIS DE AFINIDAD
**Prioridad**: 🟡 MEDIA-ALTA - Construye sobre Fase 1
**Estimación**: 2-3 días

#### Backend

##### 2.1. Service: ProductAffinityService (Expansión)
```typescript
@Injectable()
export class ProductAffinityService {
  // Ya existe - expandir con:

  async getCustomerProductAffinity(customerId: string): Promise<any> {
    // Retorna qué productos tiene más afinidad este cliente
    // Basado en su historial de compras
  }

  async getProductCustomerSegments(productId: string): Promise<any> {
    // Segmenta clientes por su afinidad a un producto
    // High affinity, Medium affinity, Low affinity, Never purchased
  }

  async getPredictiveRecommendations(customerId: string): Promise<Product[]> {
    // Predice qué productos comprará próximamente
    // Basado en patrones de compra similares
  }

  async getComplementaryProductBuyers(productIds: string[]): Promise<Customer[]> {
    // Encuentra clientes que compran productos complementarios
    // Ej: Si compran ingrediente A, probablemente compren B
  }
}
```

##### 2.2. Schema: CustomerProductAffinity (Cache)
```typescript
@Schema({ timestamps: true })
export class CustomerProductAffinity {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  affinityScore: number; // 0-100

  @Prop({ required: true })
  purchaseCount: number;

  @Prop({ required: true })
  lastPurchaseDate: Date;

  @Prop({ required: true })
  averageQuantity: number;

  @Prop({ required: true })
  totalSpent: number;

  @Prop({ required: true })
  purchaseFrequencyDays: number; // Cada cuántos días compra

  @Prop()
  nextPredictedPurchaseDate?: Date;

  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;
}
```

##### 2.3. Cron Job: Actualización de Afinidad
```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async updateProductAffinityScores() {
  // Recalcula scores de afinidad para todos los clientes
  // Basado en historial de transacciones
}
```

---

### FASE 3: CAMPAÑAS POR PRODUCTO CON AUDIENCIA OBJETIVO
**Prioridad**: 🔴 ALTA - Feature principal
**Estimación**: 3-4 días

#### Backend

##### 3.1. Schema: ProductCampaign (Extensión de MarketingCampaign)
```typescript
@Schema({ timestamps: true })
export class ProductCampaign extends MarketingCampaign {
  // Campos adicionales para campañas por producto

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  targetProductId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId] })
  targetProductIds?: Types.ObjectId[]; // Para campañas multi-producto

  @Prop({ type: String, enum: ['single_product', 'product_bundle', 'category', 'complementary'] })
  productCampaignType: string;

  // Criterios de audiencia basados en producto
  @Prop({ type: Object })
  productAudienceCriteria: {
    // Incluir solo clientes que:
    hasPurchasedProduct?: boolean; // Han comprado el producto antes
    neverPurchasedProduct?: boolean; // Nunca lo han comprado (adquisición)
    minPurchaseCount?: number; // Mínimo N compras del producto
    maxDaysSinceLastPurchase?: number; // Último comprado hace max N días
    minAffinityScore?: number; // Score de afinidad mínimo
    purchaseFrequency?: string; // 'frequent' | 'occasional' | 'rare'
    averageOrderValue?: { min?: number; max?: number; };
    includeComplementaryBuyers?: boolean; // Clientes que compran productos complementarios
  };

  // Métricas específicas de producto
  @Prop({ type: Number, default: 0 })
  productConversions: number;

  @Prop({ type: Number, default: 0 })
  productRevenue: number;

  @Prop({ type: Number, default: 0 })
  newCustomersAcquired: number;
}
```

##### 3.2. Service: ProductCampaignService
```typescript
@Injectable()
export class ProductCampaignService {
  async createProductCampaign(dto: CreateProductCampaignDto, tenantId: string): Promise<ProductCampaign>

  async calculateTargetAudience(campaignId: string): Promise<Customer[]> {
    // Calcula audiencia objetivo basándose en:
    // 1. Historial de transacciones
    // 2. Afinidad de producto
    // 3. Criterios definidos en la campaña
    // 4. Segmentos RFM
  }

  async getProductCampaignInsights(campaignId: string): Promise<any> {
    // Retorna insights como:
    // - Tamaño de audiencia objetivo
    // - Distribución por frecuencia de compra
    // - Potencial de ingresos estimado
    // - Mejores canales para esta audiencia
  }

  async trackProductConversion(customerId: string, campaignId: string, productId: string): Promise<void> {
    // Rastrea cuando un cliente compra el producto promocionado
    // Atribuye la venta a la campaña
  }
}
```

##### 3.3. DTO: CreateProductCampaignDto
```typescript
export class CreateProductCampaignDto extends CreateCampaignDto {
  @IsOptional()
  @IsString()
  targetProductId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetProductIds?: string[];

  @IsEnum(['single_product', 'product_bundle', 'category', 'complementary'])
  productCampaignType: string;

  @ValidateNested()
  @Type(() => ProductAudienceCriteriaDto)
  productAudienceCriteria: ProductAudienceCriteriaDto;
}

export class ProductAudienceCriteriaDto {
  @IsOptional()
  @IsBoolean()
  hasPurchasedProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  neverPurchasedProduct?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minPurchaseCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceLastPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAffinityScore?: number;

  @IsOptional()
  @IsEnum(['frequent', 'occasional', 'rare'])
  purchaseFrequency?: string;

  @IsOptional()
  @ValidateNested()
  averageOrderValue?: { min?: number; max?: number; };

  @IsOptional()
  @IsBoolean()
  includeComplementaryBuyers?: boolean;
}
```

##### 3.4. Controller: ProductCampaignController
```typescript
@Controller('marketing/product-campaigns')
export class ProductCampaignController {
  @Post()
  async createProductCampaign()

  @Get(':id/audience')
  async getTargetAudience()

  @Get(':id/insights')
  async getCampaignInsights()

  @Get('product/:productId/campaigns')
  async getCampaignsByProduct()

  @Post(':id/test-audience')
  async testAudienceCriteria() // Preview de audiencia antes de crear
}
```

#### Frontend

##### 3.5. Componente: ProductCampaignBuilder
- Selector de producto(s) objetivo
- Builder de criterios de audiencia con preview
- Estimación de tamaño de audiencia en tiempo real
- Visualización de distribución de audiencia
- Template de mensaje con datos del producto

##### 3.6. Componente: ProductCampaignInsights
- Dashboard específico para campaña de producto
- Conversiones por producto
- Revenue atribuido
- Clientes nuevos vs recurrentes
- Comparación vs otras campañas del mismo producto

##### 3.7. Componente: AudiencePreview
- Vista previa de audiencia antes de lanzar campaña
- Distribución por segmento RFM
- Historial de compra promedio
- Mejores canales de contacto
- Probabilidad de conversión estimada

---

### FASE 4: AUTOMATIZACIÓN CON WORKFLOWS BASADOS EN PRODUCTO
**Prioridad**: 🟡 MEDIA - Mejora la eficiencia
**Estimación**: 2 días

#### Workflows Automáticos

##### 4.1. Repurchase Reminder Workflow
```
Trigger: Producto comprado regularmente + X días desde última compra
↓
Paso 1: Esperar hasta fecha predicha de recompra - 3 días
↓
Paso 2: Enviar recordatorio: "¿Ya es hora de reordenar [Producto]?"
↓
Paso 3: Esperar 2 días
↓
Condición: ¿Hizo la compra?
  SÍ → Salir del workflow
  NO → Paso 4
↓
Paso 4: Enviar oferta especial: "10% de descuento en [Producto]"
```

##### 4.2. Product Launch to Loyal Customers
```
Trigger: Nuevo producto lanzado
↓
Paso 1: Identificar clientes con alta afinidad a categoría del producto
↓
Paso 2: Segmentar por tier (Champions primero)
↓
Paso 3: Enviar early access a Champions
↓
Paso 4: Esperar 3 días
↓
Paso 5: Enviar a Loyal Customers
↓
Paso 6: Esperar 5 días
↓
Paso 7: Enviar a todos los demás
```

##### 4.3. Complementary Product Upsell
```
Trigger: Cliente compró Producto A
↓
Paso 1: Identificar productos complementarios más comprados con A
↓
Paso 2: Verificar si cliente ya tiene los complementarios
↓
Condición: ¿Ya tiene todos?
  SÍ → Salir
  NO → Paso 3
↓
Paso 3: Esperar 2 días
↓
Paso 4: Enviar recomendación de productos complementarios
↓
Paso 5: Ofrecer bundle discount
```

---

### FASE 5: ANALYTICS Y REPORTING AVANZADO
**Prioridad**: 🟢 BAJA-MEDIA - Nice to have
**Estimación**: 2 días

#### Reports

##### 5.1. Product Campaign Performance Report
- ROI por producto promocionado
- Comparación de productos
- Mejor tiempo/día para cada producto
- Análisis de audiencia efectiva

##### 5.2. Customer-Product Matrix Report
- Heatmap de clientes vs productos
- Identificación de cross-sell opportunities
- Predicción de próximas compras
- Lifetime value por producto

##### 5.3. Purchase Pattern Analysis
- Estacionalidad por producto
- Productos correlacionados
- Tendencias de compra
- Análisis de churn por producto

---

## 🔄 FLUJO DE TRABAJO COMPLETO

### Ejemplo: Campaña de Promoción de Aceite de Oliva

1. **Identificación de Oportunidad** (Manual)
   - Marketing manager decide promocionar "Aceite de Oliva Premium"

2. **Creación de Campaña** (Sistema)
   - Selecciona producto: "Aceite de Oliva Premium"
   - Define criterios de audiencia:
     - ✅ Han comprado el producto antes
     - ✅ Última compra hace 30-60 días (timing perfecto para recompra)
     - ✅ Compran frecuentemente (al menos 3 veces al año)
     - ✅ Score de afinidad > 70
     - ❌ Excluir si compraron en últimos 15 días

3. **Cálculo de Audiencia** (Automático)
   - Sistema consulta CustomerTransactionHistory
   - Filtra por criterios
   - Consulta CustomerProductAffinity para scores
   - Resultado: 450 clientes calificados

4. **Preview de Audiencia** (Sistema muestra)
   - 320 Champions (71%)
   - 90 Loyal (20%)
   - 40 At Risk (9%)
   - Potencial revenue estimado: $12,500
   - Mejor canal: Email (85% open rate histórico)

5. **Personalización de Mensaje** (Template)
   ```
   Hola {{customerName}},

   Sabemos que te encanta nuestro {{productName}}.
   ¡Tenemos una oferta especial solo para ti!

   Tu última compra fue hace {{daysSinceLastPurchase}} días.

   15% de descuento en tu próximo pedido.
   Usa código: OLIVA15

   [CTA: Comprar Ahora]
   ```

6. **Envío y Tracking** (Automático)
   - Campaña enviada a 450 clientes
   - Tracking de aperturas, clics
   - Tracking de compras del producto
   - Atribución de revenue

7. **Análisis de Resultados** (Dashboard)
   - 380 aperturas (84.4%)
   - 145 clics (32.2%)
   - 78 conversiones (17.3%)
   - Revenue: $9,840
   - ROI: 450% (considerando costo de campaña)

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs Principales
- **Precision Rate**: % de audiencia que convierte (objetivo: >15%)
- **Product Conversion Rate**: % de receptores que compran el producto (objetivo: >10%)
- **Revenue per Recipient**: Ingresos promedio por cliente contactado (objetivo: >$20)
- **Campaign ROI**: Retorno de inversión (objetivo: >300%)
- **Audience Accuracy**: % de audiencia correctamente segmentada (objetivo: >90%)

### Mejoras vs Sistema Actual
- ↑ 300% en tasa de conversión (de 3% a 15%)
- ↓ 70% en spam a clientes irrelevantes
- ↑ 250% en ROI de campañas
- ↓ 50% en costos de marketing desperdiciados

---

## 🛠️ STACK TECNOLÓGICO

### Backend
- **NestJS** - Framework
- **MongoDB** - Base de datos principal
- **Mongoose** - ODM
- **Bull** - Queue para procesamiento de audiencias grandes
- **Node-cron** - Jobs programados

### Análisis de Datos
- **MongoDB Aggregation Pipeline** - Análisis complejo
- **Math.js** - Cálculos estadísticos
- **Simple-statistics** - Análisis de afinidad

### Frontend
- **React** - UI
- **Recharts / Chart.js** - Visualizaciones
- **TanStack Query** - Data fetching
- **Zustand** - State management

---

## 📅 CRONOGRAMA SUGERIDO

| Semana | Fase | Deliverables |
|--------|------|--------------|
| 1 | Fase 1 (Parte 1) | Schemas + TransactionHistoryService |
| 2 | Fase 1 (Parte 2) | Controllers + Frontend básico |
| 3 | Fase 2 | ProductAffinityService + Cron jobs |
| 4 | Fase 3 (Parte 1) | ProductCampaignService + Schemas |
| 5 | Fase 3 (Parte 2) | ProductCampaignBuilder (Frontend) |
| 6 | Fase 4 | Workflows automáticos |
| 7 | Fase 5 | Analytics y dashboards |
| 8 | Testing & Refinamiento | QA + Performance tuning |

**Total estimado**: 6-8 semanas

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Performance
- Indexar CustomerTransactionHistory por customerId, productId, orderDate
- Cachear CustomerProductAffinity scores
- Usar pagination para listas grandes
- Background jobs para cálculo de audiencias grandes (>10k clientes)

### Privacy & GDPR
- Consentimiento de marketing registrado
- Opt-out fácil
- Data retention policies
- Anonimización para analytics agregados

### Escalabilidad
- Particionar CustomerTransactionHistory por mes/año
- Archiving de datos antiguos (>3 años)
- CDN para imágenes de productos en emails
- Rate limiting en APIs de proveedores externos

---

## 🎯 SIGUIENTE PASO INMEDIATO

**Comenzar con Fase 1**: Implementar `CustomerTransactionHistory` schema y service básico.

¿Procedemos con la Fase 1 del roadmap de integración CRM-Marketing?

---

**Documento creado**: 2025-01-21
**Prioridad global**: 🔴 CRÍTICA - Base fundamental para marketing efectivo
**Dependencias**: Módulo de Marketing (Fases 1-6) ✅ Completado
