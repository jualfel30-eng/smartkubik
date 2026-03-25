import { Types } from 'mongoose';

let counter = 0;
function seq() {
  return ++counter;
}

export function buildProductDto(overrides: Record<string, any> = {}) {
  const n = seq();
  return {
    name: `Test Product ${n}`,
    category: ['Alimentos'],
    subcategory: ['Enlatados'],
    brand: 'TestBrand',
    isPerishable: false,
    taxCategory: 'general',
    pricingRules: {
      cashDiscount: 0,
      cardSurcharge: 0,
      minimumMargin: 10,
      maximumDiscount: 20,
    },
    inventoryConfig: {
      trackLots: false,
      trackExpiration: false,
      minimumStock: 5,
      maximumStock: 1000,
      reorderPoint: 10,
      reorderQuantity: 50,
      fefoEnabled: false,
    },
    variants: [
      {
        name: 'Unidad',
        unit: 'unidad',
        unitSize: 1,
        costPrice: 5,
        basePrice: 10,
      },
    ],
    ...overrides,
  };
}

export function buildSupplierDto(overrides: Record<string, any> = {}) {
  const n = seq();
  return {
    name: `Proveedor Test ${n}`,
    rif: `J-${String(10000000 + n).padStart(8, '0')}-${n % 10}`,
    contactName: `Contacto ${n}`,
    contactPhone: `04141234${String(n).padStart(3, '0')}`,
    contactEmail: `proveedor${n}@test.com`,
    ...overrides,
  };
}

export function buildPurchaseOrderDto(
  supplierId: string,
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    costPrice: number;
    variantId?: string;
    variantName?: string;
    variantSku?: string;
  }>,
  overrides: Record<string, any> = {},
) {
  return {
    supplierId,
    purchaseDate: new Date().toISOString(),
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      costPrice: item.costPrice,
      ...(item.variantId && { variantId: item.variantId }),
      ...(item.variantName && { variantName: item.variantName }),
      ...(item.variantSku && { variantSku: item.variantSku }),
    })),
    paymentTerms: {
      isCredit: false,
      creditDays: 0,
      paymentMethods: ['efectivo'],
      expectedCurrency: 'USD',
      requiresAdvancePayment: false,
    },
    ...overrides,
  };
}

export function buildNewSupplierPurchaseOrderDto(
  newSupplierName: string,
  newSupplierRif: string,
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    costPrice: number;
  }>,
  overrides: Record<string, any> = {},
) {
  return {
    newSupplierName,
    newSupplierRif,
    newSupplierContactName: 'Contacto Auto',
    purchaseDate: new Date().toISOString(),
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      costPrice: item.costPrice,
    })),
    paymentTerms: {
      isCredit: false,
      creditDays: 0,
      paymentMethods: ['transferencia'],
      expectedCurrency: 'USD',
      requiresAdvancePayment: false,
    },
    ...overrides,
  };
}

export function buildWarehouseDto(overrides: Record<string, any> = {}) {
  const n = seq();
  return {
    name: `Almacén Test ${n}`,
    code: `ALM-${n}`,
    ...overrides,
  };
}

export function buildTransferOrderDto(
  sourceWarehouseId: string,
  destinationWarehouseId: string,
  items: Array<{
    productId: string;
    requestedQuantity: number;
    productSku?: string;
    productName?: string;
  }>,
  overrides: Record<string, any> = {},
) {
  return {
    sourceWarehouseId,
    destinationWarehouseId,
    items: items.map((item) => ({
      productId: item.productId,
      requestedQuantity: item.requestedQuantity,
      ...(item.productSku && { productSku: item.productSku }),
      ...(item.productName && { productName: item.productName }),
    })),
    ...overrides,
  };
}

export function buildWasteEntryDto(
  productId: string,
  overrides: Record<string, any> = {},
) {
  return {
    productId,
    quantity: 5,
    unit: 'unidad',
    reason: 'spoilage',
    notes: 'Test waste entry',
    ...overrides,
  };
}

export function buildInventoryDto(
  productId: string,
  productSku: string,
  productName: string,
  overrides: Record<string, any> = {},
) {
  return {
    productId,
    productSku,
    productName,
    totalQuantity: 100,
    averageCostPrice: 5,
    ...overrides,
  };
}

export function buildAlertRuleDto(overrides: Record<string, any> = {}) {
  return {
    alertType: 'low_stock',
    threshold: 10,
    isActive: true,
    notificationChannels: ['dashboard'],
    ...overrides,
  };
}
