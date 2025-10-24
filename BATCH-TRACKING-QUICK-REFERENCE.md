# Batch/Lot Tracking - Quick Reference Guide

## System Status

| Aspect | Status | Details |
|--------|--------|---------|
| **Backend Lot Tracking** | ✅ COMPLETE | Full schema, service, and API support |
| **Frontend Lot Entry** | ✅ BASIC | Can add lot number and expiration date |
| **Frontend Lot Display** | ⚠️ LIMITED | Shows only first lot in tables |
| **Purchase Order Batches** | ✅ WORKING | Can specify lots when creating POs |
| **Expiration Alerts** | ✅ WORKING | Automatic alerts for near-expiration |
| **Quality Control** | ✅ BACKEND ONLY | Schema exists but no UI |
| **Cost per Batch** | ✅ BACKEND ONLY | Supported in DB but not in UI |
| **FEFO Picking** | 🔧 PARTIAL | Data structure ready, logic not implemented |

## Key Files

### Backend (NestJS)
- **Schema**: `food-inventory-saas/src/schemas/inventory.schema.ts` (Lines 32-260)
- **Service**: `food-inventory-saas/src/modules/inventory/inventory.service.ts`
- **Controller**: `food-inventory-saas/src/modules/inventory/inventory.controller.ts`
- **DTOs**: `food-inventory-saas/src/dto/inventory.dto.ts` (Lines 20-73 for lots)
- **Purchase Integration**: `food-inventory-saas/src/modules/purchases/purchases.service.ts` (Lines 223-240)

### Frontend (React)
- **Inventory Management**: `food-inventory-admin/src/components/InventoryManagement.jsx`
- **Purchase Management**: `food-inventory-admin/src/components/ComprasManagement.jsx`
- **Config**: `food-inventory-admin/src/config/verticalProfiles.js`

## Data Flow: Receiving Purchase with Lot

```
1. User creates Purchase Order with lot info
   → lotNumber: "LOT-20250101"
   → expirationDate: "2025-12-31"

2. User clicks "Receive" on PO
   → purchases.receivePurchaseOrder()

3. For each item, system calls:
   → inventoryService.addStockFromPurchase()

4. Backend creates InventoryLot:
   {
     lotNumber: "LOT-20250101",
     quantity: 100,
     costPrice: 25.50,
     receivedDate: now(),
     expirationDate: "2025-12-31",
     supplierId: <supplier_id>,
     status: "available"
   }

5. Lot added to inventory.lots array
6. Expiration alerts automatically checked
```

## InventoryLot Schema (Complete)

```typescript
lotNumber: string                    // REQUIRED
quantity: number                     // REQUIRED
availableQuantity: number            // REQUIRED
reservedQuantity: number             // REQUIRED
costPrice: number                    // REQUIRED - Cost per unit
receivedDate: Date                   // REQUIRED
expirationDate: Date                 // OPTIONAL - Expiration date
manufacturingDate: Date              // OPTIONAL - MFG date
supplierId: ObjectId                 // OPTIONAL - Supplier reference
supplierInvoice: string              // OPTIONAL - Invoice number
status: string                       // "available" (other statuses possible)
qualityCheck: {                      // OPTIONAL - QC data
  checkedBy: ObjectId,
  checkedAt: Date,
  temperature: number,
  humidity: number,
  visualInspection: string,
  approved: boolean,
  notes: string
}
```

## API Endpoints for Lots

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/inventory` | GET | Get all inventory (includes lots array) |
| `/inventory/:id` | GET | Get specific inventory with all lots |
| `/inventory/alerts/near-expiration` | GET | Get items with expiring lots |
| `/inventory/movements/history` | GET | Get movements (filter by lotNumber) |

**Missing Endpoints**:
- No `/inventory/:id/lots` for lot-specific operations
- No endpoint to update lot status
- No FEFO picking endpoint

## Frontend Lot UI Current Support

### InventoryManagement.jsx
```javascript
// Can add lots manually when creating inventory
lots: [
  {
    lotNumber: string,
    quantity: number,
    expirationDate: string
  }
]

// Can view first lot in table
item.lots?.[0]?.expirationDate

// Can filter by warehouse but not lot-specific
```

### ComprasManagement.jsx
```javascript
// Can add lots to purchase order items
item.lotNumber = "LOT-001"
item.expirationDate = "2025-12-31"

// Can view lots in received PO
lot.lotNumber
lot.expirationDate
```

## What's Missing in Frontend

- Detailed lot view page/modal
- Ability to enter cost price per lot
- Manufacturing date field
- Quality check form
- Lot status management UI
- Show all lots (not just first one)
- FEFO picking visualization
- Lot consumption tracking
- Warehouse location per lot

## Alert System

### Triggered Automatically:
1. **Near Expiration**: When `lot.expirationDate <= today + notificationDays`
   - notificationDays = 20% of product.shelfLifeDays
   - Only for lots with `availableQuantity > 0`

2. **Low Stock**: When `inventory.availableQuantity <= product.inventoryConfig.minimumStock`

### Configuration Required:
```javascript
// Product must be marked perishable
isPerishable: true

// Product must have shelf life
shelfLifeDays: 30

// Inventory config must enable tracking
inventoryConfig: {
  trackLots: true,
  trackExpiration: true,
  minimumStock: 10
}

// Vertical must support lots
verticalConfig.inventory.supportsLots = true
verticalConfig.inventory.alerts = ['nearExpiration', 'lowStock']
```

## Testing Lot Tracking

### Step 1: Create Product
```javascript
{
  name: "Cheese",
  sku: "CHE-001",
  isPerishable: true,
  shelfLifeDays: 60,
  inventoryConfig: {
    trackLots: true,
    trackExpiration: true,
    minimumStock: 5
  }
}
```

### Step 2: Create Purchase Order with Lots
```javascript
{
  items: [
    {
      productId: "<product_id>",
      quantity: 100,
      costPrice: 25.00,
      lotNumber: "LOT-20250101",
      expirationDate: "2025-12-31"
    }
  ]
}
```

### Step 3: Receive Purchase Order
```javascript
// Backend automatically:
// 1. Creates InventoryLot with lot info
// 2. Updates inventory totals
// 3. Creates InventoryMovement record
// 4. Checks and creates expiration alerts
```

### Step 4: Check Expiration Alerts
```javascript
GET /inventory/alerts/near-expiration?days=30
// Returns items with lots expiring within 30 days
```

## Important Notes

1. **Backward Compatibility**: Old products without lots still work
2. **Variant Support**: Each variant can have separate lots
3. **Tenant Isolation**: Lot data is tenant-isolated
4. **Movement Tracking**: Each lot movement creates an InventoryMovement record
5. **Cost per Lot**: Different batches can have different costs (average cost recalculated)

## Quick Fixes Needed

### High Priority
1. **Show All Lots** in inventory table (not just first one)
2. **Create Lot Details Modal** to see full lot information
3. **Add Cost Field** to lot UI
4. **Add Status UI** to mark lots as expired/consumed

### Medium Priority
5. Add Manufacturing Date field
6. Add Supplier Invoice reference field
7. Add Warehouse Location field
8. Implement Quality Check form

## Database Optimization

Queries are optimized with indexes on:
- `lots.expirationDate`
- `lots.status`
- `alerts.nearExpiration`

This ensures:
- Fast expiration queries
- Efficient alert filtering
- Quick stock level lookups

---

**For detailed analysis, see**: INVENTORY-BATCH-LOT-TRACKING-ANALYSIS.md
