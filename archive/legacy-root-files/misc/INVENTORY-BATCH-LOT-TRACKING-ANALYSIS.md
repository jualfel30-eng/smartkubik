# Inventory System Batch/Lot Tracking Investigation Report

## Executive Summary
The system has a **comprehensive backend implementation** for batch/lot tracking with expiration dates, quality checks, and lot management. However, the **frontend UI is minimal** and does not fully expose these capabilities to end users. Batch tracking is working but underutilized in the UI.

---

## 1. Backend Schema & Model Analysis

### Inventory Schema (`inventory.schema.ts`)
The system has TWO complementary models for lot tracking:

#### A. InventoryLot Schema (Lines 32-80)
```typescript
@Schema({ timestamps: true })
export class InventoryLot {
  lotNumber: string;              // Required: Unique lot identifier
  quantity: number;               // Lot quantity
  availableQuantity: number;      // Qty available for sale
  reservedQuantity: number;       // Qty reserved for orders
  costPrice: number;              // Cost per unit for this lot
  receivedDate: Date;             // When received
  expirationDate?: Date;          // EXPIRATION TRACKING
  manufacturingDate?: Date;       // Manufacturing date
  supplierId?: ObjectId;          // Reference to supplier
  supplierInvoice?: string;       // Supplier invoice number
  status: string;                 // "available", other statuses
  qualityCheck?: {                // QUALITY CONTROL TRACKING
    checkedBy: ObjectId;
    checkedAt: Date;
    temperature: number;
    humidity: number;
    visualInspection: string;
    approved: boolean;
    notes?: string;
  };
  createdBy: ObjectId;
}
```

**Key Observations:**
- Full lot-level tracking with individual quantities per lot
- Expiration date tracking per lot (not aggregate)
- Quality check data structure for perishable items
- Manufacturing date for shelf-life calculation
- Supplier reference and invoice tracking

#### B. Inventory Schema (Lines 83-167)
The main Inventory schema includes:
```typescript
@Prop({ type: [InventoryLotSchema] })
lots: InventoryLot[];            // Array of lots for this product

@Prop({ type: Object })
location: {                       // Physical location tracking
  warehouse: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
};

@Prop({ type: Object })
alerts: {
  lowStock: boolean;
  nearExpiration: boolean;        // Expiration alert flag
  expired: boolean;
  overstock: boolean;
  lastAlertSent?: Date;
};

@Prop({ type: Object })
metrics: {
  turnoverRate: number;
  daysOnHand: number;
  lastSaleDate?: Date;
  averageDailySales: number;
  seasonalityFactor: number;
};
```

#### C. InventoryMovement Schema (Lines 169-220)
Tracks every inventory change:
```typescript
@Prop({ type: String })
lotNumber?: string;              // Track which lot was affected

@Prop({ type: String, required: true })
movementType: string;            // "in", "out", "adjustment", 
                                 // "transfer", "reservation", "release"
```

### Database Indexes (Lines 226-260)
Multiple indexes optimize lot queries:
```typescript
InventorySchema.index({ "lots.expirationDate": 1, tenantId: 1 });
InventorySchema.index({ "lots.status": 1, tenantId: 1 });
InventorySchema.index({ "alerts.nearExpiration": 1, tenantId: 1 });
```

---

## 2. DTO (Data Transfer Object) Analysis

### CreateInventoryLotDto (Lines 20-73)
Complete lot creation structure:
- lotNumber (required)
- quantity, availableQuantity, reservedQuantity
- costPrice
- receivedDate, expirationDate, manufacturingDate
- supplierId, supplierInvoice
- qualityCheck object with temperature, humidity, inspection details

### InventoryMovementDto (Lines 180-231)
- lotNumber (optional): Specific lot being moved
- movementType: Different movement types
- expirationDate (optional): Can track expiration in movements

---

## 3. Backend Service Implementation Analysis

### Key Methods in inventory.service.ts

#### A. Lot Creation During Inventory Setup
```typescript
async create() - Lines 47-147
- Processes lots array from CreateInventoryDto
- Sets availableQuantity = lot.quantity initially
- Sets reservedQuantity = 0
- Tracks createdBy user for audit trail
- Creates movement record for initial inventory
```

#### B. Lot-Based Stock Management
```typescript
async addStockFromPurchase() - Lines 1066-1193
- Called when purchase order is received
- For perishable products, REQUIRES lotNumber and expirationDate
- Creates new lot entry with:
  - Quantity from purchase order item
  - Cost price from purchase item
  - Received date = current date
  - Expiration date from purchase order item
  - Supplier ID and created by user
- Updates inventory totals
- Creates movement record with lot number
```

#### C. Expiration Alert System
```typescript
async checkAndCreateAlerts() - Lines 731-816
- Checks if product.inventoryConfig.trackExpiration is enabled
- Searches through inventory.lots array
- Identifies lots expiring within X days (20% of shelf life)
- Creates automatic events/tasks for expiring stock
- Filters by lot.availableQuantity > 0 (don't alert on empty lots)
- Notifies user about specific lot numbers
```

#### D. Expiration Query
```typescript
async getExpirationAlerts() - Lines 904-916
- Searches: lots.expirationDate <= alertDate
- Filters: lots.status == "available"
- Returns inventory items with expiring lots
- Called by frontend for alerts
```

#### E. Lot-Level Reservation (Implicit)
- reserveInventory() method handles overall quantity
- Individual lot tracking happens at save time
- FEFO (First Expired First Out) is mentioned in DTO but not fully implemented in code

---

## 4. Purchase Order & Receiving Flow

### From purchases.service.ts (Lines 194-376)

#### receivePurchaseOrder() Process:
```typescript
async receivePurchaseOrder() - Lines 194-376
1. Validates purchase order status != "pending"
2. Loops through each purchase order item
3. Calls inventoryService.addStockFromPurchase() for each item
4. Item includes:
   - productId, productSku, productName
   - variantId, variantSku (for variants)
   - quantity, costPrice
   - lotNumber: From purchase order item (perishable products)
   - expirationDate: From purchase order item (perishable products)
   - supplierId, purchaseOrderId
5. Updates purchase order status to "received"
6. Creates payables for accounting
```

**Key Finding:** Batch/lot information is passed from purchase order items → inventory lots on receiving.

### Product Schema (`product.schema.ts`)

```typescript
@Prop({ type: Boolean, required: true })
isPerishable: boolean;           // Flag for lot tracking requirement

@Prop({ type: Number })
shelfLifeDays?: number;          // Used in alert calculation

@Prop({ type: Object })
inventoryConfig: {
  trackLots: boolean;            // Feature flag
  trackExpiration: boolean;       // Feature flag
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
}
```

---

## 5. Frontend Implementation Analysis

### InventoryManagement.jsx (Food Inventory Admin)

#### Limited Lot Display:
- Line 52: `lots: []` in newInventoryItem state
- Lines 139-166: Basic lot handlers (addLot, removeLot, handleLotChange)
- Line 159: Lot structure: `{ lotNumber: '', quantity: 0, expirationDate: '' }`

**Problems:**
1. **No costPrice field** - Lots can have different costs but UI doesn't capture this
2. **No receivedDate** - Backend stores this but UI doesn't set it
3. **No manufacturingDate** - Backend supports it, UI ignores
4. **No qualityCheck** - No QC data input UI
5. **No lot status tracking** - Backend has "available" status but no UI management

#### Lot Display in Table:
- Lines 446: Shows only first lot's expiration date in main inventory table
  ```javascript
  'Fecha de Vencimiento (Primer Lote)': item.lots?.[0]?.expirationDate
  ```
- **Only shows first lot**, not all lots in inventory

#### Lot Creation Dialog (Lines 500-600):
- Allows adding lots manually
- Shows lot number, quantity, expiration date fields
- No detailed form for all lot attributes

### ComprasManagement.jsx (Purchase Management)

#### Purchase Order Lot Capture:
- Lines 49-50: Purchase item has lotNumber and expirationDate
- Lines 146-147: showLotFields flag controls lot UI visibility based on vertical config
- Line 145: showExpirationFields flag for expiration date visibility

#### Lot Display in Purchase Items Table:
- Shows lot number and expiration date for each line item
- **Key Finding:** When viewing received purchase orders, lots are displayed in detail (showing lot.lotNumber and lot.expirationDate)

#### Lot Creation in Purchase Order:
- Lines 388-398: Allows entering lot number and expiration date per item
- Only for perishable products

---

## 6. Product Variant Inventory Tracking

### Variant Support:
From inventory.schema.ts:
```typescript
@Prop({ type: Types.ObjectId, ref: "ProductVariant" })
variantId?: Types.ObjectId;

@Prop({ type: String })
variantSku?: string;
```

And from product.schema.ts:
```typescript
@Prop({ type: [ProductVariantSchema] })
variants: ProductVariant[];

// Each variant has:
sku: string;
unit: string;
unitSize: number;
basePrice, costPrice: number;
attributes?: Record<string, any>;
```

**How It Works:**
1. Each product variant gets separate inventory record
2. Inventory document has unique index on (tenantId, productId, variantId)
3. Variants can have different SKUs (variantSku)
4. Each variant inventory has its own lot tracking
5. Frontend InventoryManagement detects variants and allows per-variant inventory management

---

## 7. Attribute-Based Inventory Tracking

The system supports attribute-based inventory combinations:

From inventory.schema.ts:
```typescript
@Prop({
  type: [InventoryAttributeCombinationSchema],
  default: [],
})
attributeCombinations?: InventoryAttributeCombination[];

// Where each combination includes:
attributes: Record<string, any>;     // e.g., { color: "red", size: "L" }
totalQuantity, availableQuantity: number;
reservedQuantity, committedQuantity: number;
averageCostPrice?: number;
```

**Current Status:** Backend fully supports it, but frontend inventory management has minimal support.

---

## 8. Alert System

### Alerts Triggered:
1. **Low Stock Alert** - When availableQuantity <= product.inventoryConfig.minimumStock
2. **Near Expiration Alert** - When lot.expirationDate <= (today + notificationDays)
3. **Expired Alert** - When lot.expirationDate < today

### Implementation:
- Automatic events/tasks created via eventsService
- One alert per day max (controlled by lastAlertSent timestamp)
- Alerts populated in ComprasManagement UI (expiringProducts state)

**Frontend Integration:**
- ComprasManagement.jsx fetches alerts
  ```javascript
  fetchApi('/inventory/alerts/near-expiration?days=30')
  ```
- Displays list of expiring products
- Shows lot number and expiration date

---

## 9. API Endpoints Analysis

### Inventory Controller Endpoints:
1. `POST /inventory` - Create initial inventory (supports lots)
2. `GET /inventory` - List all inventory (paginated)
3. `GET /inventory/:id` - Get specific inventory (includes all lots)
4. `GET /inventory/product/:productSku` - Get by SKU
5. `GET /inventory/alerts/low-stock` - Low stock alerts
6. `GET /inventory/alerts/near-expiration` - Expiration alerts (with ?days param)
7. `GET /inventory/reports/summary` - Inventory summary
8. `POST /inventory/movements` - Create movement record
9. `GET /inventory/movements/history` - Movement history (supports lotNumber filter)

**Missing Endpoints:**
- No dedicated `/inventory/:id/lots` endpoint to view/manage lots separately
- No endpoint to update lot status (e.g., mark as expired, consumed, etc.)
- No endpoint for FEFO (First Expired First Out) picking logic

---

## 10. Data Flow: Receiving a Purchase Order with Batches

```
1. Frontend: ComprasManagement creates purchase order
   - Item includes: lotNumber, expirationDate
   
2. Backend: purchases.service.create()
   - Stores lotNumber, expirationDate on PO item
   
3. Frontend: User clicks "Receive" on purchase order
   - Calls purchases.service.receivePurchaseOrder()
   
4. Backend: purchases.service.receivePurchaseOrder()
   - For each item, calls inventoryService.addStockFromPurchase()
   - Passes: lotNumber, expirationDate from PO item
   
5. Backend: inventory.service.addStockFromPurchase()
   - Finds or creates Inventory record for product/variant
   - For perishable items: Creates new InventoryLot
     - Sets: lotNumber, quantity, costPrice
     - Sets: receivedDate = now, expirationDate = from PO
     - Sets: supplierId from PO
   - Adds lot to inventory.lots array
   - Updates inventory totals
   - Creates InventoryMovement record with lotNumber
   
6. Backend: inventory.service.checkAndCreateAlerts()
   - Checks for expiring lots
   - Creates events/tasks for alerts
   
7. Result: Inventory has lots with full tracking data
```

---

## 11. Summary of Findings

### What IS Implemented (Backend):
✅ **Lot Number Tracking** - Each batch has unique identifier  
✅ **Expiration Date Tracking** - Per-lot expiration tracking with alerts  
✅ **Manufacturing Date** - Captured in schema  
✅ **Quality Check Data** - Temperature, humidity, inspection notes stored  
✅ **Cost Price per Lot** - Different batches can have different costs  
✅ **Received Date** - When batch was received  
✅ **Supplier Reference** - Link to supplier per lot  
✅ **Lot Status** - Available/consumed status tracking  
✅ **Lot-level Movement History** - Each movement can reference specific lot  
✅ **Expiration Alerts** - Automatic alerts for near-expiration lots  
✅ **Variant-Based Inventory** - Separate tracking per variant  
✅ **Attribute Combinations** - Support for color/size/etc. combinations  
✅ **FEFO Support** - Data structure ready (not fully implemented in code)

### What IS Implemented (Frontend):
✅ **Basic Lot Entry** - Can add lot number and expiration date  
✅ **Purchase Order Lots** - Can specify lot info when creating purchase orders  
✅ **Lot Display in Purchases** - Shows lots in received purchase orders  
✅ **Expiration Alerts** - Shows expiring products/lots  
✅ **Lot Filtering** - Can search by lot number in movements  

### What is NOT/Partially Implemented:

❌ **No Detailed Lot View** - No page/modal to view all lots for a product  
❌ **No Cost Price UI** - Can't enter different costs per lot in frontend  
❌ **No Manufacturing Date UI** - Backend supports, UI doesn't  
❌ **No Quality Check UI** - No form to enter QC data  
❌ **No Lot Status Management** - Can't change lot status from UI  
❌ **Limited Lot Display** - Only shows first lot in inventory table  
❌ **No FEFO Picking** - No algorithm to pick oldest expiration lots first  
❌ **No Lot Consumption Tracking** - Can't mark lots as "used/sold" explicitly  
❌ **No Lot Splitting** - Can't split one lot into multiple operations  
❌ **No Lot Transfer** - Can't move lot between warehouses/locations  
❌ **Attribute Combinations Underused** - Data structure exists but minimal UI support

---

## 12. Vertical Configuration Integration

From verticalProfiles.js (frontend):
```javascript
inventorySupportsLots = verticalConfig?.inventory?.supportsLots !== false;
inventorySupportsExpiration = 
  inventorySupportsLots && inventoryAlerts.includes('nearExpiration');
showLotFields = inventorySupportsLots && !isNonFoodRetailVertical;
showExpirationFields = showLotFields && inventorySupportsExpiration;
```

**This means:**
- Lot tracking can be disabled per vertical/tenant
- Expiration tracking is optional
- Non-food retail verticals don't show lot fields by default
- Configuration is environment-based

---

## 13. Key Code Locations

| Feature | Backend Location | Frontend Location |
|---------|-----------------|-------------------|
| Schema | `/food-inventory-saas/src/schemas/inventory.schema.ts` | - |
| Service | `/food-inventory-saas/src/modules/inventory/inventory.service.ts` | - |
| Controller | `/food-inventory-saas/src/modules/inventory/inventory.controller.ts` | - |
| DTOs | `/food-inventory-saas/src/dto/inventory.dto.ts` | - |
| Purchase Service | `/food-inventory-saas/src/modules/purchases/purchases.service.ts` | - |
| Inventory UI | - | `food-inventory-admin/src/components/InventoryManagement.jsx` |
| Purchase UI | - | `food-inventory-admin/src/components/ComprasManagement.jsx` |
| Config | - | `food-inventory-admin/src/config/verticalProfiles.js` |

---

## 14. Recommendations

### High Priority:
1. **Create Detailed Lot View Component** - Show all lots for a product with full details
2. **Add Lot Cost Entry** - Allow different costs per batch in UI
3. **Implement QC Form** - Capture quality check data when receiving
4. **Lot Status Management** - Add UI to mark lots as expired/consumed
5. **FEFO Implementation** - Modify reservation logic to pick oldest expiring first

### Medium Priority:
6. Add Manufacturing Date UI field
7. Create Lot Transfer functionality
8. Implement Lot Splitting/Merging
9. Add Warehouse Location UI for lots
10. Create Lot Consumption Reporting

### Low Priority:
11. Advanced attribute combination management
12. Lot-based costing reports
13. Lot traceability/genealogy views

---

## 15. Configuration Flags to Check

When implementing/testing, verify these configurations are enabled:

```javascript
// In vertical configuration:
{
  inventory: {
    supportsLots: true,      // Enable lot tracking
    alerts: [
      'lowStock',            // Enable low stock alerts
      'nearExpiration'       // Enable expiration alerts
    ]
  },
  isPerishable: true,        // Product must be marked perishable
}
```

Then in Product:
```javascript
{
  isPerishable: true,
  shelfLifeDays: 30,
  inventoryConfig: {
    trackLots: true,
    trackExpiration: true,
    minimumStock: 10
  }
}
```

---

## Conclusion

The system has a **robust backend batch/lot tracking implementation** with comprehensive data structures for:
- Unique lot identification
- Expiration date tracking
- Quality control recording
- Supplier references
- Cost tracking per batch
- Automatic alert generation

However, the **frontend UI is significantly underdeveloped** relative to backend capabilities. The UI currently focuses on basic lot entry and display rather than comprehensive lot management. Most advanced features (QC, detailed lot status, FEFO picking, lot transfers) exist in the backend but lack corresponding frontend interfaces.

This represents a **good foundation for enterprise batch tracking** but requires frontend enhancement to fully utilize the system's capabilities.
