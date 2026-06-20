# SmartKubik — Mapa de Impacto del Sistema

> **DOCUMENTO OBLIGATORIO**: Este mapa DEBE ser consultado antes de cualquier cambio de código. Contiene los contratos de datos entre frontend↔backend, tipos exactos, gotchas de cada módulo, y la cadena de impacto de cada modificación.
>
> **Cómo usarlo**:
> 1. Busca el módulo/archivo que vas a modificar
> 2. Lee sus contratos de datos (qué envía el frontend, qué espera el backend)
> 3. Identifica dependencias (qué otros módulos se afectan)
> 4. Verifica gotchas de tipos (String vs ObjectId, undefined vs false)
> 5. Después del cambio: actualiza la documentación listada
>
> Última actualización: 2026-04-28

---

## SECCIÓN 1: CONTRATOS FRONTEND ↔ BACKEND

### 1.1 Patrón de Comunicación General

```
TODA llamada del frontend pasa por: lib/api.js → fetchApi(path, options)

Headers automáticos:
  Authorization: Bearer {accessToken}    ← localStorage.getItem('accessToken')
  x-tenant-id: {tenantId}               ← extraído del JWT payload (user.tenantId)
  Content-Type: application/json         ← por defecto (excepto multipart)

Respuesta estándar del backend:
  { success: boolean, data: T, message?: string }
  { success: boolean, data: T[], pagination: { page, limit, total, totalPages } }

Errores:
  { statusCode: number, message: string|string[], error: string }
  401 → fetchApi hace auto-refresh del token y reintenta
  403 → sin permisos (frontend muestra toast)
  404 → recurso no encontrado
```

### 1.2 Autenticación y Tokens

```
LOGIN:
  Frontend envía:  POST /auth/login { email: string(lowercase), password: string }
  Backend retorna: { accessToken, refreshToken, user, tenant, memberships[], membership }
  
  Token payload (accessToken, 15 min):
    { sub: string(userId), email: string, role: { name: string, permissions: string[] }, tenantId: string, membershipId: string }
  
  Token payload (refreshToken, 7 días):
    { sub: string(userId) }  ← solo el userId

  ⚠️ El token de CLIENTE (storefront) tiene type: "customer" en el payload
  ⚠️ El token de ADMIN no tiene field type — la ausencia de type = admin

REFRESH:
  Frontend envía:  POST /auth/refresh { refreshToken: string }
  Backend retorna: { accessToken, refreshToken }  ← nuevos tokens
  ⚠️ Refresh tokens NO se invalidan (stateless) — token robado es válido hasta expiración

SWITCH TENANT:
  Frontend envía:  POST /auth/switch-tenant { membershipId: string(MongoId), rememberAsDefault?: boolean }
  Backend retorna: Nuevos tokens con tenantId diferente

PERMISOS (cómo el frontend los verifica):
  useAuth().hasPermission('inventory_read') verifica:
    1. user.role.permissions.includes('inventory_read')  ← del JWT
    2. tenant.enabledModules[mapPermissionToModule('inventory_read')]  ← inventario habilitado?
  
  Mapeo permission→module: 'inventory_*' → 'inventory', 'orders_*' → 'orders', etc.
  Si el módulo no está en enabledModules → el permiso se niega aunque el rol lo tenga
```

### 1.3 Products — Contrato de Datos

```
CREAR PRODUCTO:
  Frontend envía: POST /products
  {
    name: string,                          ← REQUERIDO, sanitizado
    brand: string,                         ← REQUERIDO, sanitizado
    sku: string | undefined,               ← si undefined → backend auto-genera "{PREFIX}-{NNNN}"
    category: string[],                    ← array (aunque UI trata el primero como "principal")
    subcategory: string[],                 ← array
    productType: "simple"|"consumable"|"supply"|"raw_material",  ← default: "simple"
    unitOfMeasure: string,                 ← default: "unidad"
    isPerishable: boolean,                 ← REQUERIDO
    taxCategory: string,                   ← REQUERIDO
    ivaApplicable: boolean,                ← default: true
    ivaRate: 0 | 8 | 16,                  ← NUMBER, no string. Default: 0
    igtfExempt: boolean,                   ← default: false
    variants: [{                           ← MÍNIMO 1 variante
      name: string,                        ← REQUERIDO
      sku: string | undefined,             ← variante 0 = product.sku, demás = "{sku}-VAR{N}"
      barcode: string | undefined,         ← ÚNICO por tenant (parcial, solo no-vacíos)
      unit: string,                        ← REQUERIDO (ej: "kg", "und")
      unitSize: number,                    ← REQUERIDO, min: 0.01
      basePrice: number,                   ← precio de venta, min: 0
      costPrice: number,                   ← REQUERIDO, min: 0
      wholesalePrice: number | undefined,
      images: string[],                    ← BASE64 strings (no URLs). Frontend comprime a max 500KB
      pricingStrategy: {
        mode: "manual"|"markup"|"margin",
        markupPercentage: number(0-1000),
        marginPercentage: number(0-99.9),
        autoCalculate: boolean,
        psychologicalRounding: "none"|"0.99"|"0.95"|"0.90"|"round_up"|"round_down"
      } | undefined
    }],
    pricingRules: { cashDiscount, cardSurcharge, minimumMargin, maximumDiscount, ... },
    inventoryConfig: { trackLots, trackExpiration, minimumStock, maximumStock, reorderPoint, reorderQuantity, fefoEnabled },
    suppliers: [{ supplierId: string(MongoId), supplierSku: string, costPrice: number, ... }] | undefined,
    initialInventoryQuantity: number | undefined,            ← opcional, min 0. Stock inicial SOLO en tenant del usuario
    initialInventoryWarehouseId: string(MongoId) | undefined  ← opcional. Si falta, se usa el default warehouse del owner
  }

  Backend retorna: { success: true, data: ProductDocument }
  
  ⚠️ images son BASE64, NO URLs. El tamaño se trackea en tenant.usage.currentStorage
  ⚠️ Si el frontend envía SKU vacío para variante → backend genera "{productSku}-VAR{N}"
  ⚠️ ivaRate es NUMBER (0, 8, 16), NO string. Frontend debe enviar número, no "16%"
  ⚠️ Side effect (desde commit bb76281ce, 2026-05-05): el controller arma
       inventoryContext = { ownerTenantId: req.user.tenantId, warehouseId, initialQuantity }
     y ProductsService.create() invoca InventoryService.createInitialInventoriesForProductInGroup().
     Esto crea documentos Inventory en TODOS los tenants del grupo (matriz + sucursales):
       - Owner tenant: qty = initialInventoryQuantity (default 0) + InventoryMovement IN si > 0
       - Resto del grupo: qty = 0
       - Idempotente: pre-existentes (tenantId, productId, variantId) se saltean
       - Si falla: log error, NO aborta la creación del producto
     ownerTenantId proviene del JWT del usuario, NO del tenant del catálogo (req.tenantId).
     El bulk endpoint (POST /products/bulk) propaga el mismo contexto pero con initialQuantity=0 forzado.

LISTAR PRODUCTOS:
  Frontend envía: GET /products?page=1&limit=20&search=harina&category=Alimentos&sortBy=createdAt&sortOrder=desc
  
  Tipos de query params:
    page: number (string en URL, backend parsea con parseInt)
    limit: number (max 20000)
    search: string (busca en: name, brand, sku, variants.name, variants.sku, variants.barcode)
    category: string (se convierte a regex case-insensitive en backend)
    brand: string (match exacto)
    productType: string (match exacto)
    isActive: "true"|"false" (string en URL, backend transforma a boolean)
    includeInactive: "true"|"false"
    supplierId: string(MongoId)
    ids: string (comma-separated MongoIds, backend hace split)
    sortBy: "name"|"category"|"createdAt"|"updatedAt"|"sku"|"brand"|"price"|"cost"
    sortOrder: "asc"|"desc"
    q: string (alias de search)
  
  Backend retorna:
    { success: true, data: Product[], pagination: { page: number, limit: number, total: number, totalPages: number } }
  
  ⚠️ El campo supplierId busca en Product.suppliers[].supplierId con AMBOS tipos:
     { $in: [String(supplierId), new ObjectId(supplierId)] }
     Esto es porque suppliers[].supplierId puede estar guardado como String O ObjectId

BUSCAR POR BARCODE:
  Frontend envía: GET /products/lookup/barcode/{barcode}
  Backend retorna: { success: true, data: { product: Product(parcial), variant: ProductVariant } }
  ⚠️ El match es case-insensitive y trimmed
```

### 1.4 Inventory — Contrato de Datos

```
CREAR INVENTARIO:
  Frontend envía: POST /inventory
  {
    productId: string(MongoId),            ← REQUERIDO
    productSku: string,                    ← REQUERIDO (desnormalizado)
    productName: string,                   ← REQUERIDO (desnormalizado)
    totalQuantity: number,                 ← REQUERIDO, min: 0
    averageCostPrice: number,              ← REQUERIDO, min: 0
    warehouseId: string(MongoId) | undefined, ← si undefined → backend usa getDefaultWarehouse()
    variantId: string(MongoId) | undefined,
    variantSku: string | undefined,
    lots: [{
      lotNumber: string,                   ← REQUERIDO
      quantity: number,                    ← REQUERIDO, min: 0.01
      costPrice: number,                   ← REQUERIDO, min: 0
      expirationDate: string(ISO) | undefined,
      manufacturingDate: string(ISO) | undefined
    }] | undefined,
    receivedBy: string | undefined,
    notes: string | undefined,
    reference: string | undefined          ← agrupa recepciones bajo misma referencia
  }
  
  ⚠️ Si el producto YA tiene inventario → backend SUMA la cantidad (no crea duplicado)
  ⚠️ Si el inventario existía pero estaba isActive=false → lo REACTIVA

AJUSTAR INVENTARIO:
  Frontend envía: POST /inventory/adjust
  {
    inventoryId: string(MongoId),          ← REQUERIDO
    newQuantity: number,                   ← REQUERIDO, min: 0 (es la cantidad FINAL, no el delta)
    reason: string,                        ← REQUERIDO ("Conteo físico", "Daño", "Merma", "Devolución", "Otro")
    newCostPrice: number | undefined,
    lotNumber: string | undefined,
    binLocationId: string(MongoId) | undefined
  }
  
  ⚠️ newQuantity es la CANTIDAD FINAL deseada, NO la diferencia
  ⚠️ Backend calcula delta = newQuantity - currentQuantity y crea movimiento IN o OUT según el signo

RESERVAR INVENTARIO:
  Frontend envía: POST /inventory/reserve (llamado internamente por Orders, no directamente)
  {
    items: [{
      productSku: string,                  ← REQUERIDO
      variantSku: string | undefined,      ← para backward compat: busca por productSku O variantSku
      quantity: number,                    ← REQUERIDO, min: 0.01
      useFefo: boolean                     ← default: true (primero el que vence antes)
    }],
    orderId: string(MongoId),              ← REQUERIDO
    expirationMinutes: number              ← default: 30, max: 1440
  }
  
  ⚠️ Busca inventario por productSku. Si no encuentra, busca por variantSku (backward compat)
  ⚠️ Las reservas NO se limpian automáticamente al expirar — dependen de cancelación de orden
```

### 1.5 Orders — Contrato de Datos

```
CREAR ORDEN (POS):
  Frontend envía: POST /orders
  {
    customerId: string(MongoId) | undefined,
    customerName: string | undefined,
    customerRif: string | undefined,       ← formato: "V-12345678" o "J-12345678"
    taxType: "V"|"E"|"J"|"G"|"P"|"N" | undefined,  ← tipo de documento fiscal
    customerIsSpecialTaxpayer: boolean | undefined,  ← si true → retención IVA
    items: [{
      productId: string(MongoId),          ← REQUERIDO
      variantId: string(MongoId) | undefined,
      variantSku: string | undefined,
      quantity: number,                    ← REQUERIDO
      unitPrice: number | undefined,       ← si undefined → backend usa price list o variant.basePrice
      selectedUnit: string | undefined,    ← "kg", "g", etc. para multi-unidad
      conversionFactor: number | undefined, ← factor de conversión a unidad base
      modifiers: [{ modifierId: string(MongoId), name: string, priceAdjustment: number }] | undefined,
      specialInstructions: string | undefined,
      removedIngredients: string[] | undefined,  ← ingredientes a excluir del backflush BOM
      ivaApplicable: boolean | undefined,
      ivaRate: number | undefined          ← 0, 8, o 16
    }],
    deliveryMethod: "store"|"pickup"|"delivery"|"envio_nacional" | undefined,
    shippingAddress: string | undefined,
    shippingCost: number | undefined,
    couponCode: string | undefined,        ← código del cupón (se valida en backend)
    generalDiscountPercentage: number | undefined,
    priceListId: string(MongoId) | undefined,
    savePriceListToCustomer: boolean | undefined,
    autoReserve: boolean | undefined,      ← default: false
    tableId: string(MongoId) | undefined,  ← para restaurantes
    cashSessionId: string(MongoId) | undefined,  ← para POS con caja
    cashRegisterId: string | undefined,    ← nombre de la caja ("Caja 1")
    notes: string | undefined,
    payments: [{ method: string, amount: number, reference: string }] | undefined
  }
  
  Backend calcula automáticamente:
    - subtotal, ivaTotal, igtfTotal, shippingCost, discountAmount, totalAmount, totalAmountVes
    - fulfillmentType y fulfillmentStatus según deliveryMethod
    - Descuentos (volumen + promoción, aplica el mejor)
    - Retención IVA si customerIsSpecialTaxpayer
  
  ⚠️ ivaRate en items es NUMBER (0, 8, 16), no porcentaje con % 
  ⚠️ deliveryMethod "store" → fulfillmentType="store", fulfillmentStatus="delivered" (inmediato)
  ⚠️ El frontend envía las fechas a las 12:00 noon para evitar bugs de timezone UTC:
     const dateAtNoon = new Date(date); dateAtNoon.setHours(12, 0, 0, 0); return dateAtNoon.toISOString();

REGISTRAR PAGOS:
  Frontend envía: POST /orders/:id/payments
  {
    payments: [{
      method: string,                      ← "efectivo_usd", "zelle_usd", "pago_movil_ves", "pos_ves", etc.
      amount: number,                      ← en la moneda del método
      currency: "USD"|"VES",
      reference: string | undefined,
      bankAccountId: string(MongoId) | undefined,  ← para transferencias
      amountTendered: number | undefined,  ← efectivo entregado (para calcular vuelto)
      tipAmount: number | undefined,
      tipPercentage: number | undefined
    }]
  }
  
  Backend calcula:
    - IGTF (3%) automáticamente para métodos con "_usd" en el nombre
    - changeGiven si amountTendered > amount
    - Convierte USD↔VES con tasa de cambio del ExchangeRateService
    - Actualiza paymentStatus: "pending" → "partial" → "paid"
  
  ⚠️ IGTF solo aplica a la PORCIÓN en divisas, no al total
  ⚠️ Al quedar "paid" → dispara backflush de BOM (async) + OUT movements (async)
  ⚠️ changeGivenBreakdown: { usd: number, ves: number, vesMethod: string } para vuelto mixto
```

### 1.6 Purchases — Contrato de Datos

```
CREAR ORDEN DE COMPRA:
  Frontend envía: POST /purchases
  {
    // Proveedor: XOR — uno de los dos
    supplierId: string(MongoId) | undefined,       ← proveedor existente (es Customer._id, NO Supplier._id)
    newSupplierName: string | undefined,
    newSupplierRif: string | undefined,            ← formato: /^[VEJGPNC]-?\d{7,9}(-\d)?$/
    newSupplierContactName: string | undefined,
    
    purchaseDate: string(ISO),                     ← REQUERIDO. Frontend envía con hora 12:00
    items: [{
      productId: string(MongoId),                  ← REQUERIDO
      productName: string,                         ← REQUERIDO (desnormalizado)
      productSku: string,                          ← REQUERIDO (desnormalizado)
      variantId: string(MongoId) | undefined,
      quantity: number,                            ← REQUERIDO, > 0
      costPrice: number,                           ← REQUERIDO, > 0
      discount: number | undefined,                ← 0-100 (porcentaje)
      lotNumber: string | undefined,
      expirationDate: string(ISO) | undefined
    }],
    paymentTerms: {
      isCredit: boolean,                           ← REQUERIDO
      creditDays: number,                          ← REQUERIDO, ≥ 0
      paymentMethods: string[],                    ← REQUERIDO, min 1
      expectedCurrency: "USD"|"VES"|"EUR"|"USD_BCV"|"EUR_BCV",  ← REQUERIDO
      paymentDueDate: string(ISO) | undefined,
      requiresAdvancePayment: boolean,             ← REQUERIDO
      advancePaymentPercentage: number | undefined,
      advancePaymentAmount: number | undefined,
      remainingBalance: number | undefined
    },
    documentType: "factura_fiscal"|"nota_entrega" | undefined,
    invoiceNumber: string | undefined,
    exchangeRateSnapshot: number | undefined,      ← tasa USD→VES al momento
    eurExchangeRateSnapshot: number | undefined,   ← tasa EUR→VES
    totalAmountVes: number | undefined,
    subtotal: number | undefined,
    ivaTotal: number | undefined,
    igtfTotal: number | undefined,
    totalAmount: number | undefined
  }
  
  ⚠️ supplierId apunta a CUSTOMERS collection, NO a SUPPLIERS
  ⚠️ El backend normaliza RIF: "J413164663" → "J-413164663"
  ⚠️ Si es proveedor nuevo, el backend: crea Customer(type=supplier) + crea Supplier(linked)
  ⚠️ documentType "nota_entrega" → IVA e IGTF = 0 (frontend calcula en base a esto)

RECIBIR MERCANCÍA:
  Frontend envía: PATCH /purchases/:id/receive
  {
    receivedBy: string | undefined,                ← nombre de quién recibió
    invoiceDate: string(ISO) | undefined
  }
  
  Backend hace 5 cosas automáticamente (ver guía purchase-to-stock.md)
  
  ⚠️ Solo funciona si status es "pending" o "approved"
  ⚠️ Si paymentTerms.requiresAdvancePayment → crea 2 Payables (no 1)
```

### 1.7 Transfer Orders — Contrato de Datos

> **⚠️ MODELO DE TRASLADOS — LEER ANTES DE TOCAR NADA DE TRANSFERS/WAREHOUSES ⚠️**
>
> El sistema soporta **DOS dimensiones de traslado que coexisten y NO son excluyentes**:
>
> 1. **Traslados entre ALMACENES de un MISMO tenant/sede.** Un solo tenant puede tener
>    varios `warehouses` en la misma sede y debe poder mover producto entre ellos.
>    (`sourceWarehouseId` → `destinationWarehouseId`, mismo `tenantId`.)
> 2. **Traslados entre SEDES (tenant padre → sedes hijas / entre sedes hermanas).**
>    El sistema permite un **tenant padre con sedes hijas**; cada sede es su propio
>    tenant con sus propios almacenes. Debe poder moverse producto **entre sedes**.
>    (cross-tenant: se incluye `destinationTenantId`.)
>
> **Ambos casos deben funcionar a la vez.** Uno NO reemplaza ni excluye al otro. Un tenant
> puede tener N almacenes en su sede Y además ser parte de una jerarquía de sedes, y los
> traslados deben poder hacerse en cualquiera de las dos dimensiones. No asumir nunca que
> "traslado = entre sedes" ni que "traslado = entre almacenes de la misma sede": son ambos.

```
CREAR TRANSFERENCIA:
  Frontend envía: POST /transfer-orders
  {
    sourceWarehouseId: string(MongoId),             ← REQUERIDO
    destinationWarehouseId: string(MongoId),        ← REQUERIDO
    destinationTenantId: string(MongoId) | undefined, ← solo para cross-tenant
    items: [{
      productId: string(MongoId),                   ← REQUERIDO
      requestedQuantity: number,                    ← REQUERIDO
      selectedUnit: string | undefined,             ← "kg", "cajas", "sacos"
      conversionFactor: number | undefined,         ← si multi-unidad
      unitOfMeasure: string | undefined
    }],
    notes: string | undefined
  }
  
  ⚠️ conversionFactor se envía SOLO si el producto tiene sellingUnits y conversionFactor ≠ 1
  ⚠️ En el frontend: if (conversionFactor !== 1) { incluye selectedUnit + conversionFactor }

DESPACHAR:
  Frontend envía: POST /transfer-orders/:id/dispatch
  {
    items: [{ productId: string(MongoId), shippedQuantity: number }] | undefined,
    trackingNumber: string | undefined,
    carrier: string | undefined,
    notes: string | undefined
  }
  
  Backend hace:
    baseQty = item.conversionFactor ? qty × conversionFactor : qty
    Busca inventario con: { productId: { $in: [ObjectId, String, toString()] }, warehouseId, tenantId }
    Filtro: { isActive: { $ne: false }, isDeleted: { $ne: true } }
  
  ⚠️ IRREVERSIBLE — no se puede cancelar después
  ⚠️ El backend opera DIRECTAMENTE sobre modelos Mongoose (no pasa por InventoryService)
     → Las alertas de stock bajo NO se evalúan durante transferencias

RECIBIR:
  Frontend envía: POST /transfer-orders/:id/receive
  {
    items: [{
      productId: string(MongoId),                   ← REQUERIDO
      receivedQuantity: number                      ← REQUERIDO, ≤ shippedQuantity
    }],
    receiptNotes: string | undefined
  }
  
  ⚠️ Para cross-tenant: backend busca producto por SKU en el tenant destino (ObjectIds difieren)
  ⚠️ Si receivedQty < shippedQty → auto-genera discrepancia con razón "Faltante: X unidades"
```

### 1.8 Customers — Contrato de Datos

```
CREAR CONTACTO:
  Frontend envía: POST /customers
  {
    name: string,                                   ← REQUERIDO
    companyName: string | undefined,
    customerType: "individual"|"business"|"supplier"|"employee"|..., ← REQUERIDO
    taxInfo: { taxId: string, taxType: string, taxName: string } | undefined,
    contacts: [{ type: "phone"|"email"|"whatsapp", value: string, isPrimary: boolean }] | undefined,
    addresses: [{ type: "business"|"billing"|"shipping", street, city, state, isDefault }] | undefined,
    creditInfo: { creditLimit, availableCredit, paymentTerms, acceptsCredit } | undefined,
    notes: string | undefined,
    paymentSettings: { ... } | undefined           ← solo para type="supplier"
  }
  
  Backend auto-genera: customerNumber "CLI-XXXXXX"
  
  ⚠️ type="supplier" → auto-crea Supplier vinculado con paymentSettings
  ⚠️ type="employee" → auto-crea EmployeeProfile con "EMP-XXXXXX"
  ⚠️ Customer.email es SPARSE UNIQUE — puede ser null, pero si tiene valor debe ser único por tenant

AUTH STOREFRONT (separado del admin):
  Registro: POST /customers/auth/register { name, email, password(min 6), phone?, tenantId }
  Login: POST /customers/auth/login { email(lowercase), password, tenantId }
  Retorna: JWT con { sub: customerId, email, tenantId, type: "customer" }
  
  ⚠️ type: "customer" en el JWT diferencia del token admin (que no tiene type)
  ⚠️ passwordHash tiene select: false — nunca se retorna en queries normales
```

### 1.9 Accounting / Billing — Contrato de Datos

```
ASIENTOS AUTOMÁTICOS (el frontend NO los crea):
  Los crea el backend en respuesta a eventos:
  
  Venta creada     → DR CxC(1102), CR Ventas(4101), CR IVA(2102)
  Pago recibido    → DR Caja(1101), CR CxC(1102) + DR IGTF(599) si divisas
  Factura emitida  → Evento billing.document.issued → BillingAccountingListener
                     → Asiento en VES (usando tasa BCV del momento)
                     → Entrada en Libro de Ventas IVA
  Compra recibida  → DR Inventario(1103), CR CxP(2101)
  Pago de CxP      → DR CxP(2101), CR Caja(1101)
  Nómina pagada    → DR Gastos Nómina, CR CxP/Banco
  Merma registrada → DR Mermas(5103), CR Inventario(1103)
  
  ⚠️ Cuentas hardcodeadas: 1101, 1102, 1103, 2101, 2102, 2104, 4101, 5101, 5103, 599
  ⚠️ findOrCreateAccount() las crea si no existen

FACTURACIÓN:
  Frontend envía: POST /billing { type, seriesId, customer, items, totals, currency, exchangeRate }
  Luego: POST /billing/:id/issue { orderId? }
  
  Al emitir:
    - Asigna controlNumber (Imprenta Digital)
    - Calcula totalsVes con tasa BCV del momento (FUENTE DE VERDAD para contabilidad)
    - Crea BillingEvidence (inmutable)
    - Emite evento billing.document.issued
    - Vincula Order.billingDocumentId
  
  ⚠️ totals (USD) y totalsVes (VES) son objetos separados en el documento
  ⚠️ La contabilidad siempre usa totalsVes como fuente de verdad
```

### 1.10 Cash Register — Contrato de Datos

```
ABRIR CAJA:
  Frontend envía: POST /cash-register/sessions/open
  {
    registerName: string,                           ← REQUERIDO ("Caja 1")
    openingFunds: [{
      currency: "USD"|"VES",
      amount: number,                               ← total verificado
      denominations: { d_100: number, d_50: number, d_20: number, ... }
    }] | undefined,
    openingAmountUsd: number | undefined,
    openingAmountVes: number | undefined,
    workShift: "morning"|"afternoon"|"night" | undefined
  }
  
  ⚠️ Un usuario solo puede tener UNA caja abierta a la vez
  ⚠️ registerName no puede estar en uso por otro cajero

CERRAR CAJA:
  Frontend envía: POST /cash-register/sessions/:id/close
  {
    closingFunds: [{ currency, amount, denominations }] | undefined,
    closingAmountUsd: number | undefined,
    closingAmountVes: number | undefined,
    exchangeRate: number | undefined
  }
  
  Backend calcula:
    Esperado = Apertura + Ventas - Vueltos + Entradas - Salidas
    Diferencia = Declarado - Esperado
    Si |diferencia| < 0.01 → "balanced" (auto-aprobado)
    Si diferencia > 0 → "surplus" (pendiente aprobación)
    Si diferencia < 0 → "shortage" (pendiente aprobación)
```

### 1.11 Stripe Pay — Contrato de Datos

```
CREAR PAYMENT INTENT (storefront público):
  Frontend envía:  POST /public/stripe/payment-intent
  {
    tenantId: string,                       ← REQUERIDO
    orderId: string(MongoId),               ← REQUERIDO. Order debe existir y matchear tenantId
    customerEmail: string | undefined,      ← si falta usa Order.customerEmail
    customerName: string | undefined        ← si falta usa Order.customerName
  }

  Backend retorna:
  {
    success: true,
    data: {
      clientSecret: "pi_3O.._secret_..",    ← se pasa a Stripe.js confirmCardPayment()
      publishableKey: "pk_test_..." | "pk_live_...",
      paymentIntentId: "pi_3O...",
      orderNumber: "ORD-...",
      amountCents: number,                  ← Order.totalAmount × 100 redondeado
      currency: "usd"
    }
  }

  ⚠️ Idempotente por orderId. Llamadas repetidas devuelven el mismo intent vivo.
  ⚠️ Si Order.totalAmount cambia entre llamadas → cancela el viejo y crea uno nuevo.
  ⚠️ idempotencyKey enviado a Stripe = `order_${orderId}_${amountCents}` — previene duplicados.
  ⚠️ Si la orden ya está paid → 400 "La orden ya está pagada".
  ⚠️ Tenant isolation: si el orderId no pertenece al tenantId → 404 (anti-IDOR).

WEBHOOK STRIPE:
  Stripe envía:    POST /webhooks/stripe
  Headers: stripe-signature: t=...,v1=...
  Body: raw JSON del evento (NO parsear antes de verificar firma)

  Backend:
    1. Lee req.rawBody (capturado en main.ts express.json verify hook)
    2. stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
       → si la firma falla, 400
    3. Dedupe por event.id (processedWebhookEvents[]) — Stripe puede reintentar 3 días
    4. Persiste status, statusHistory, charge details (cardBrand, cardLast4, receiptUrl)
    5. Si event.type='payment_intent.succeeded': emite EventEmitter
       'stripe.payment_intent.succeeded' → StripePaymentListener (en orders/) →
       OrdersService.registerPayments({orderId, payments: [{
         method: 'stripe_card_usd', amount: cents/100, currency: 'USD',
         reference: '${paymentIntentId} (visa ****4242)',
         isConfirmed: true, idempotencyKey: paymentIntentId
       }]})
       → marca Order.paymentStatus='paid', dispara backflush BOM + OUT movements + evento order.paid

  ⚠️ NUNCA leer el body via JSON.stringify(req.body) — Stripe firma los bytes crudos
  ⚠️ Devolver siempre 200 a Stripe (incluso para eventos no manejados) salvo firma inválida
  ⚠️ El receptor es @Public() — la auth es la verificación de firma HMAC
  ⚠️ Si STRIPE_SECRET_KEY no está set, /payment-intent retorna 400; el módulo carga sin error

CONFIG:
  STRIPE_SECRET_KEY=sk_test_... | sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_test_... | pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...

  ⚠️ El módulo asume USD. NO cobrar en VES — Stripe no opera en VES (usar Pago Móvil)
  ⚠️ Tenants con fiscalProfile.igtfApplicable=false NO acumulan IGTF al recibir pago Stripe
     (se procesará en PR 2 dentro de OrderPaymentsService)
```

---

### 1.12 Payment Requests — Contrato de Datos

**Backend → Cliente (portal público, `GET /public/payment-portal/:token`)**

```ts
PublicPaymentInfoDto {
  status: "pending" | "submitted" | "info_mismatch" | "proof_unclear" | "partial" | "awaiting_settlement"
  expiresAt: string                  // ISO
  amountDue: number
  currency: "USD" | "VES"
  exchangeRateSnapshot?: number
  allowPartialPayments: boolean
  allowMethodOverride: boolean
  entity: { type, snapshot: { items[], subtotal, tax, total, customerName?, createdAt? } }
  selectedMethod: { type, label, methodId?, accountDetails }     // accountDetails frozen del tenant config
  diagnostic: null | { reason, note?, rejectedProofId?, rejectedAt? }
  tenant: { name?, branding?: { logoUrl?, primaryColor? } }
}
```

**Cliente → Backend (subir comprobante, multipart)**

```ts
{
  amount: number                     // string en multipart, coerced
  currency: "USD" | "VES"
  method: "transfer" | "pago_movil" | "zelle" | "cash" | "card"
  originBank: string                 // sanitized
  payerIdNumber: string              // sanitized
  payerPhone: string                 // sanitized
  referenceNumber: string            // sanitized, min 6 chars
  replacesProofId?: string           // re-submission hint
  image: File                        // JPG/PNG/WebP/HEIC, ≤10MB, magic-byte validated
}
```

**Admin → Backend (crear manual)**

```ts
POST /api/v1/payment-requests
{
  entityType: "order"                // PR1: sólo order
  entityId: ObjectId
  methodId?: string                  // de TenantPaymentConfig.paymentMethods[].methodId
  deliveryPhone?: string             // VE formats
  deliveryChannel?: "whatsapp" | "manual"
  allowMethodOverride?: boolean
}
→ { paymentRequest, portalUrl: "<STOREFRONT_PUBLIC_URL>/pago/<token>" }
```

**Admin → Backend (list / detail responses incluyen portalUrl derivado)**

```ts
GET /api/v1/payment-requests
GET /api/v1/payment-requests/:id
→ cada PR en la response trae portalUrl: "<STOREFRONT_PUBLIC_URL>/pago/<token>"
  (derivado en el controller via PaymentRequestsService.attachPortalUrl,
  el admin lo usa para el "Copiar enlace" sin conocer STOREFRONT_PUBLIC_URL)
```

**AR report (admin) ahora incluye orderId / customerPhone / source**

```ts
GET /api/v1/accounting/reports/accounts-receivable
→ row: { orderId, orderNumber, customerName, customerPhone, source, ... }
  (necesario para que SolicitarComprobanteButton se auto-gatee por row)
```

**Bridge `Tenant.settings.paymentMethods` → `TenantPaymentConfig`**

Los métodos de pago (con datos bancarios) se configuran en
`Tenant.settings.paymentMethods` vía la pantalla admin existente
(`PaymentMethodsSettings.jsx → PUT /tenant/settings`).

`TenantPaymentConfig.paymentMethods` queda vestigial / fallback. Los 3
campos de PR siguen viviendo en `TenantPaymentConfig`:
`requirePaymentProof`, `allowPartialPayments`, `paymentRequestExpiryDays`.

`PaymentRequestsService.resolveTenantMethods()` lee de `Tenant.settings.paymentMethods`
primero y mapea los field names al shape del portal:

| Admin (`details.X`) | Portal (`accountDetails.X`) | Method type |
|---|---|---|
| `bank` | `bankName` o `pagoMovilBank` | transfer / pago_movil |
| `accountNumber` | `accountNumber` | transfer |
| `accountName` | `accountHolderName` | transfer / zelle |
| `cid` | `pagoMovilCI` | pago_movil |
| `phoneNumber` | `pagoMovilPhone` o `zellePhone` | pago_movil / zelle |
| `email` | `zelleEmail` | zelle |

**Notification types emitidos**

```
payment-request.submitted        priority: high   → toast auto en admin
payment-request.confirmed        priority: medium
payment-request.status-changed   priority: medium / low
```

Todas bajo `category: 'finance'` (no nuevo enum value). El admin frontend
discrimina por `type` cuando hace falta (e.g. badge invalidation).

**Permisos**

```
payment_requests_review  →  granted to: admin, employee (seed)
                            grantable to custom roles via /permissions UI
                            (la página existente lo recoge automáticamente)
```

**Gotchas**:
- El JWT del portal usa el mismo `JWT_SECRET` que auth pero con claim `scope: 'payment_portal'`. El `PaymentTokenGuard` rechaza scopes distintos.
- Estados terminales (`confirmed`, `rejected_final`, `expired`) hacen el guard devolver 403/401 — el portal muestra mensaje específico.
- El `imageHash` PR1 es SHA-256 del webp optimizado (exact-duplicate). Phase 2 lo cambia a perceptual hash.
- La auto-creación por `order.created` requiere **3** gates: `source='storefront'` + `TenantPaymentConfig.requirePaymentProof=true` + tenant tiene método activo no-cash en `Tenant.settings.paymentMethods` (después del bridge de PR3).
- Soft-delete: `isDeleted: { $ne: true }`. NO usar `deletedAt`.
- El backend NO dedupe PRs por entity — dos `Solicitar comprobante` en la misma orden crearán 2 PRs. El admin UI no checkea "PR activo existente" para esa orden. Riesgo bajo (cashier suele revisar primero).

---

## SECCIÓN 2: TIPOS Y GOTCHAS GLOBALES

### 2.1 String vs ObjectId — Tabla Definitiva

| Colección | Campo | Tipo Real | Cómo Hacer Query Seguro |
|---|---|---|---|
| `products.suppliers[].supplierId` | **Mixto** (String u ObjectId) | `{ $in: [String(id), new ObjectId(id)] }` |
| `inventory.productId` | **Mixto** (String u ObjectId) | `{ $in: [id, new ObjectId(id), id.toString()] }` |
| `inventory.warehouseId` | **Puede ser undefined** | `warehouseId: { $exists: true }` o fallback a sin warehouseId |
| `purchaseorders.supplierId` | **ObjectId** → colección `customers` | No confundir: es Customer._id, NO Supplier._id |
| `suppliers.tenantId` | **String** (no ObjectId) | Usar `tenantFilter()` que busca ambos tipos |
| `suppliers.customerId` | **ObjectId** → colección `customers` | El link del patrón dual |
| `transferorders.items[].productId` | **ObjectId** | Pero al buscar inventario, usar 3 formatos |
| `orders.tenantId` | **String** (no ObjectId) | A diferencia de la mayoría de colecciones |
| `customer.email` | **String, sparse unique** | Puede ser null/undefined. Unique solo cuando tiene valor |

### 2.2 Soft Delete — Inconsistencias

| Colección | Campo | Gotcha |
|---|---|---|
| `inventory` | `isActive` | Puede ser `undefined` (no `false`). Filtro seguro: `{ isActive: { $ne: false } }` |
| `inventory` | `isDeleted` | Puede ser `undefined`. Filtro seguro: `{ isDeleted: { $ne: true } }` |
| `warehouses` | `isDeleted` | Usa `isDeleted: false` correctamente |
| `customers` | `status` | Soft delete = `status: "inactive"`, NO isActive/isDeleted |
| `products` | `isActive` | Pero el método `remove()` hace **hard delete** (no soft) |
| `transferorders` | `isDeleted` | Boolean, `false` por default |
| `inventoryalertrules` | `isDeleted` | Boolean, índice parcial `where !isDeleted` |

### 2.3 Fechas y Timezone

```
REGLA DEL FRONTEND: Todas las fechas se envían a las 12:00 noon UTC para evitar
que el cambio de zona horaria mueva la fecha un día antes o después.

const dateAtNoon = new Date(date);
dateAtNoon.setHours(12, 0, 0, 0);
return dateAtNoon.toISOString();  // "2026-04-28T12:00:00.000Z"

EXCEPCIÓN: Timestamps de citas/reservaciones usan hora exacta (startTime, endTime)
```

### 2.4 Moneda y Tasa de Cambio

```
MONEDAS SOPORTADAS: USD, VES, EUR, USD_BCV, EUR_BCV
TASA EN TIEMPO REAL: ExchangeRateService → GET /exchange-rate/bcv

PATRÓN: Toda transacción guarda:
  amount (en moneda original) + amountVes (convertido) + exchangeRate (tasa usada)

IGTF (3%): Solo aplica a pagos con métodos que contienen "_usd" en el ID:
  efectivo_usd → SÍ
  zelle_usd → SÍ  
  transferencia_usd → SÍ
  pago_movil_ves → NO
  pos_ves → NO
  
INFERENCIA DE MONEDA DEL PROVEEDOR (suppliers.service.ts):
  zelle, efectivo_usd, binance_usdt → USD_PARALELO
  transferencia_int, paypal → USD
  pago_movil, transferencia_ves → VES
  default → USD_PARALELO
```

### 2.5 Generación de Números Secuenciales

| Entidad | Formato | Método | Gotcha |
|---|---|---|---|
| Product SKU | `{PREFIX}-{NNNN}` (ej: TIE-0042) | `generateSku()` — prefix de 3 letras del nombre del tenant | Loop hasta encontrar único |
| PO Number | `OC-YYMMDD-HHMMSS-XXXXXX` | `generatePoNumber()` — timestamp + 6 random digits | Prácticamente no colisiona |
| Order Number | `ORD-YYMMDD-HHMMSS-XXXX` | Similar al PO | Ídem |
| Supplier Number | `PROV-{NNNNNN}` (ej: PROV-000018) | `generateSupplierNumber()` — **MAX+1** | ⚠️ RACE CONDITION: dos requests simultáneos pueden generar el mismo número. Índice unique lo previene pero genera error 409 |
| Customer Number | `CLI-{NNNNNN}` (admin) o `C{NNNNNN}` (storefront) | Secuencial | Formatos diferentes según origen |
| Employee Number | `EMP-{NNNNNN}` | Secuencial | Auto-generado al crear employee |
| Cash Session | `CAJ-{YYYY}-{NNNN}` | `generateSessionNumber()` | Por tenant + año |
| Cash Closing | `CIE-{YYYY}-{NNNN}` | `generateClosingNumber()` | Por tenant + año |
| Transfer Order | Secuencial por tenant | `generateOrderNumber()` | Contador atómico |
| IVA Withholding | `RET-IVA-{YYYY}-{NNNNNN}` | Secuencial | Por tenant + año |
| ISLR Withholding | `RET-ISLR-{YYYY}-{NNNNNN}` | Secuencial | Por tenant + año |
| IVA Declaration | `DEC-IVA-{MMYYYY}-{NNNNNN}` | Secuencial | Por período |
| Billing Document | Secuencia configurable | Por serie (DocumentSequence) | Prefijo + número secuencial |

---

## SECCIÓN 3: GRAFO DE DEPENDENCIAS

```
AUTH → [Roles, Permissions, Mail, Memberships]
  ⤷ IMPORTADO POR: ~30 módulos

PRODUCTS → [Auth*, PriceHistory, PriceLists, Customers*, Inventory*, Purchases*, Suppliers*, OpenAI*]
  ⤷ IMPORTADO POR: Orders, Purchases, BOM, Manufacturing, Assistant, SuperAdmin

INVENTORY → [Auth*, Events*, Products*]
  ⤷ IMPORTADO POR: Orders, Purchases, BOM, Manufacturing, Waste, Dashboard, Assistant

ORDERS → [Auth*, Inventory, Customers*, Accounting, Payments, Delivery, Shifts, ExchangeRate, TransactionHistory, Coupons, Promotions, Marketing*, Tables, PriceLists]
  ⤷ IMPORTADO POR: Assistant, SuperAdmin, Dashboard, Analytics, CashRegister, BillSplits, KDS

PURCHASES → [Auth*, Customers*, Products*, Inventory*, Accounting*, Payables*, Events*, TransactionHistory*, Suppliers*, OpenAI*]
  ⤷ IMPORTADO POR: Products, Assistant, SuperAdmin

SUPPLIERS → [Auth*]
  ⤷ IMPORTADO POR: Products, Purchases, SuperAdmin

CUSTOMERS → [Auth*, Roles, Loyalty, TransactionHistory, Orders*]
  ⤷ IMPORTADO POR: Orders, Purchases, Suppliers, Appointments, Marketing, Notifications

ACCOUNTING → [] (base, no importa otros)
  ⤷ IMPORTADO POR: Orders, Purchases, Payables, Payments, Payroll, Waste, Manufacturing, BOM, Liquidations, Appointments

TRANSFER_ORDERS → [Organizations]
  ⤷ USA DIRECTAMENTE: modelos Inventory, InventoryMovement (bypass de servicios)

ASSISTANT → [14 módulos] (el más conectado)
SUPER_ADMIN → [25+ módulos]
```

`*` = forwardRef (dependencia circular)

---

## SECCIÓN 4: MAPA ARCHIVO → DOCS A ACTUALIZAR

### Si cambias este archivo → actualiza estos documentos

```
products.service.ts → wiki/modules/products/{functions,flows,api-reference}.md + help/inventario/gestionar-productos.md + guides/purchase-to-stock.md
products.controller.ts → wiki/modules/products/api-reference.md + system-map.md §1.3 (cuando agrega side effects cross-módulo, ej. inventoryContext)
products.schema.ts → wiki/modules/products/data-model.md + wiki/data-model.md
inventory.service.ts → wiki/modules/inventory/{functions,flows,api-reference,data-model}.md + help/inventario/{control-de-stock,problemas-inventario}.md + guides/{purchase-to-stock,order-lifecycle,transfer-between-locations}.md
orders.service.ts → wiki/modules/orders/{functions,flows,api-reference}.md + help/ventas/{crear-ventas-pos,problemas-ventas}.md + guides/order-lifecycle.md
order-payments.service.ts → wiki/modules/orders/{functions,flows}.md + help/ventas/crear-ventas-pos.md
order-inventory.service.ts → wiki/modules/orders/flows.md + guides/order-lifecycle.md
purchases.service.ts → wiki/modules/purchases/{functions,flows,api-reference}.md + help/compras/ordenes-de-compra.md + guides/purchase-to-stock.md
suppliers.service.ts → wiki/modules/purchases/{functions,data-model}.md + help/compras/gestionar-proveedores.md
transfer-orders.service.ts → wiki/modules/transfers/{functions,flows,api-reference}.md + help/transferencias/transferir-mercancia.md + guides/transfer-between-locations.md
accounting.service.ts → wiki/modules/accounting/{functions,flows,api-reference}.md + help/finanzas/contabilidad-general.md + guides/accounting-flow.md
iva-*.service.ts → wiki/modules/accounting/{functions,api-reference}.md + help/finanzas/facturacion-fiscal.md
billing.service.ts → wiki/modules/billing/overview.md + help/finanzas/facturacion-fiscal.md
customers.service.ts → wiki/modules/customers-crm/{functions,flows,api-reference}.md + help/clientes/gestionar-clientes.md
auth.service.ts → wiki/modules/auth-users-roles/{functions,flows,api-reference}.md + help/configuracion/usuarios-roles-permisos.md
cash-register.service.ts → wiki/modules/orders/{functions,flows}.md + help/ventas/caja-registradora.md
payroll*.service.ts → wiki/modules/payroll/overview.md + help/rrhh/guia-nomina.md + guides/payroll-cycle.md
appointments/*.service.ts → wiki/modules/beauty/overview.md + help/salon/guia-salon-belleza.md
beauty/*.service.ts → wiki/modules/beauty/overview.md + help/salon/guia-salon-belleza.md
production/*.service.ts → wiki/modules/production/overview.md + help/produccion/guia-produccion.md
marketing/*.service.ts → wiki/modules/marketing/overview.md + help/marketing-docs/guia-marketing.md
tables/*.service.ts → wiki/modules/restaurant/overview.md + help/restaurante/guia-restaurante.md
stripe-pay/*.ts → wiki/modules/stripe-pay/{overview,functions,api-reference,data-model}.md + system-map.md §1.11
payment-requests/services/*.ts → wiki/modules/payment-requests/{functions,api-reference}.md + system-map.md §1.12, §5, §6
payment-requests/schemas/*.ts → wiki/modules/payment-requests/data-model.md + system-map.md §1.12
payment-requests/controllers/**/*.ts → wiki/modules/payment-requests/api-reference.md + system-map.md §1.12, §5
food-inventory-admin/src/components/payment-requests/**/*.jsx → wiki/modules/payment-requests/admin.md + system-map.md §1.12
food-inventory-admin/src/hooks/use-payment-requests.js → wiki/modules/payment-requests/admin.md
food-inventory-admin/src/lib/paymentRequestsApi.js → wiki/modules/payment-requests/admin.md + api-reference.md
food-inventory-storefront/src/app/pago/[token]/**/*.{tsx,ts} → wiki/modules/payment-requests/portal.md
food-inventory-storefront/src/lib/payment-portal.ts → wiki/modules/payment-requests/portal.md
App.jsx → wiki/index.md + wiki/frontend/overview.md
navLinks.js → wiki/index.md + wiki/frontend/overview.md
api.js → wiki/frontend/overview.md
middleware.ts → wiki/storefront-docs/overview.md + guides/customer-journey.md
*.schema.ts → wiki/data-model.md + wiki/modules/{módulo}/data-model.md
```

---

## SECCIÓN 5: ENDPOINTS PÚBLICOS (sin auth)

```
POST   /auth/login, /auth/refresh
GET    /auth/google, /auth/google/callback
GET    /permissions
GET    /public/storefront/by-domain/:domain, /public/storefront/active-domains
GET    /public/products, /public/products/:id, /public/products/categories/list
POST   /public/orders
GET    /orders/track/:orderNumber
GET    /public/services, /public/services/:id, /public/services/categories
POST   /public/appointments/availability, /public/appointments, /public/appointments/lookup
POST   /public/appointments/:id/cancel, /public/appointments/:id/reschedule
GET    /public/beauty-services/:tenantId, /public/beauty-packages/:tenantId
GET    /public/professionals/:tenantId, /public/beauty-gallery/:tenantId, /public/beauty-reviews/:tenantId
POST   /public/beauty-bookings, /public/beauty-bookings/availability
GET    /public/beauty-bookings/booking-number/:num, /public/beauty-bookings/client-status, /public/beauty-bookings/checkin
POST   /customers/auth/register, /customers/auth/login
GET    /public/tenant-payment-config/:id/payment-methods
GET    /public/payment-portal/:token           ← portal de comprobante (JWT scope=payment_portal)
POST   /public/payment-portal/:token/proofs    ← subir comprobante (multipart, rate-limit 5/h)
POST   /public/delivery/calculate
GET    /feature-flags, /social-links
POST   /newsletter/subscribe, /newsletter/unsubscribe
GET    /restaurant-dishes-public
POST   /restaurant-orders
POST   /public/stripe/payment-intent       ← crear/reutilizar PaymentIntent para una orden
POST   /webhooks/stripe                    ← receptor de webhooks Stripe (firma verificada)
```

---

## SECCIÓN 6: EVENTOS DEL SISTEMA

```
order.created → Consumables deduction, Analytics, Marketing triggers, PaymentRequests auto-issue (si source=storefront + requirePaymentProof)
order.updated → KDS (Kitchen Display)
order.paid → Inventory backflush + OUT movements + Billing triggers
order.fulfillment.updated → WhatsApp delivery notifications
stripe.payment_intent.succeeded → StripePaymentListener (orders/) → OrdersService.registerPayments() → marca orden paid
billing.document.issued → BillingAccountingListener (asiento + libro ventas)
inventory.alert.triggered → NotificationCenter + EventsService
payroll.run.approved → PayrollWebhooks
```

---

## SECCIÓN 7: REGLAS DE ORO

1. **Antes de cualquier cambio**: Busca el archivo en SECCIÓN 4 → identifica docs a actualizar
2. **Antes de hacer queries**: Consulta SECCIÓN 2.1 → verifica si el campo tiene tipo mixto
3. **Antes de filtrar por deleted/active**: Consulta SECCIÓN 2.2 → usa el filtro seguro
4. **Antes de enviar fechas**: Usa el patrón de noon (SECCIÓN 2.3)
5. **Antes de calcular IGTF**: Solo sobre la porción en divisas (SECCIÓN 2.4)
6. **Antes de generar números**: Verifica el formato en SECCIÓN 2.5
7. **Antes de recibir una PO**: Recuerda los 5 side effects (SECCIÓN 1.6)
8. **Antes de despachar transferencia**: Es IRREVERSIBLE (SECCIÓN 1.7)
9. **Después de cualquier cambio**: Actualiza los docs listados en SECCIÓN 4
10. **Si cambias un schema**: Actualiza wiki/data-model.md ADEMÁS del data-model del módulo

---

*Última actualización: 2026-04-28*
