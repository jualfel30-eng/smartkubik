/**
 * @file compras-utils.js
 * Pure helper functions for the Compras (Purchases) module.
 * No React dependencies — can be used anywhere.
 */

/**
 * Parse taxId/RIF to extract taxType and rifNumber.
 * Handles multiple formats:
 * - "J-123456789" -> { taxType: "J", rifNumber: "123456789" }
 * - "123456789"   -> { taxType: fallbackType, rifNumber: "123456789" }
 * - "J123456789"  -> { taxType: "J", rifNumber: "123456789" }
 * - "502100652"   -> { taxType: fallbackType, rifNumber: "502100652" }
 *
 * @param {string} taxId - The raw taxId string
 * @param {string} [fallbackTaxType='J'] - Default tax type when none can be parsed
 * @returns {{ taxType: string, rifNumber: string }}
 */
export const parseTaxId = (taxId, fallbackTaxType = 'J') => {
  if (!taxId) {
    return { taxType: fallbackTaxType, rifNumber: '' };
  }

  const cleaned = String(taxId).trim();

  // Case 1: Has hyphen (e.g., "J-123456789")
  if (cleaned.includes('-')) {
    const [taxType, ...rifParts] = cleaned.split('-');
    const rifNumber = rifParts.join('').replace(/[^0-9]/g, '');
    return {
      taxType: taxType.toUpperCase() || fallbackTaxType,
      rifNumber
    };
  }

  // Case 2: Starts with letter (e.g., "J123456789")
  const firstChar = cleaned[0];
  if (/[A-Za-z]/.test(firstChar)) {
    return {
      taxType: firstChar.toUpperCase(),
      rifNumber: cleaned.slice(1).replace(/[^0-9]/g, '')
    };
  }

  // Case 3: Only numbers (e.g., "123456789" or "502100652")
  return {
    taxType: fallbackTaxType,
    rifNumber: cleaned.replace(/[^0-9]/g, '')
  };
};

/**
 * Format date for API submission with proper timezone handling.
 * Sends date at noon (12:00:00) in ISO format to avoid timezone edge cases.
 * This prevents MongoDB from interpreting 'yyyy-MM-dd' as UTC midnight,
 * which causes 1-day offset issues in timezones behind UTC.
 *
 * @param {Date|null} date
 * @returns {string|undefined}
 */
export const formatDateForApi = (date) => {
  if (!date) return undefined;

  const dateAtNoon = new Date(date);
  dateAtNoon.setHours(12, 0, 0, 0);
  return dateAtNoon.toISOString();
};

/**
 * Initial state for the "New Product" dialog form.
 */
export const initialNewProductState = {
  productType: 'simple',
  sku: '',
  name: '',
  category: [],
  subcategory: [],
  brand: '',
  description: '',
  ingredients: '',
  isPerishable: false,
  shelfLifeDays: 0,
  shelfLifeUnit: 'days',
  shelfLifeValue: 0,
  storageTemperature: 'ambiente',
  ivaApplicable: true,
  taxCategory: 'general',
  isSoldByWeight: false,
  unitOfMeasure: 'unidad',
  hasMultipleSellingUnits: false,
  sellingUnits: [],
  inventoryConfig: {
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 20,
    reorderQuantity: 50,
  },
  variant: {
    name: 'Estandar',
    unit: 'unidad',
    unitSize: 1,
    basePrice: 0,
    costPrice: 0,
    images: []
  },
  inventory: {
    quantity: 1,
    costPrice: 0,
    discount: 0,
    lotNumber: '',
    expirationDate: ''
  },
  supplier: {
    supplierId: null,
    isNew: true,
    newSupplierName: '',
    newSupplierRif: '',
    newSupplierContactName: '',
    newSupplierContactPhone: '',
    newSupplierContactEmail: '',
    newSupplierAddress: { city: '', state: '', street: '' },
    rifPrefix: 'J',
  },
  purchaseDate: new Date(),
  documentType: 'factura_fiscal',
  invoiceNumber: '',
  actualPaymentMethod: 'bolivares_bcv', // Metodo de pago REAL para esta compra especifica
  paymentTerms: {
    isCredit: false,
    paymentDueDate: null,
    paymentMethods: [],
    customPaymentMethod: '',
    expectedCurrency: 'bolivares_bcv',
    requiresAdvancePayment: false,
    advancePaymentPercentage: 0,
  }
};

/**
 * Initial state for the "New Purchase Order" dialog form.
 */
export const initialPoState = {
  supplierId: '',
  supplierName: '',
  supplierRif: '',
  taxType: 'J',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  supplierAddress: { city: '', state: '', street: '' },
  purchaseDate: new Date(),
  items: [],
  notes: '',
  documentType: 'factura_fiscal',
  invoiceNumber: '',
  actualPaymentMethod: 'bolivares_bcv', // Metodo de pago REAL para esta compra especifica
  paymentTerms: {
    isCredit: false,
    paymentDueDate: null,
    paymentMethods: [],
    customPaymentMethod: '',
    expectedCurrency: 'bolivares_bcv',
    requiresAdvancePayment: false,
    advancePaymentPercentage: 0,
  }
};

/**
 * Calcula IVA e IGTF para una compra.
 *
 * @param {number} subtotal - Subtotal de la compra (sin impuestos)
 * @param {string} documentType - 'factura_fiscal' o 'nota_entrega'
 * @param {string} [actualPaymentMethod='bolivares_bcv'] - Metodo de pago real que se usara
 * @param {Array} [items=[]] - Array de items de la compra (con ivaApplicable e igtfExempt)
 * @returns {{ iva: number, igtf: number, total: number, subtotalWithIva: number, subtotalExempt: number }}
 */
export const calculatePurchaseTaxes = (subtotal, documentType, actualPaymentMethod = 'bolivares_bcv', items = []) => {
  // Si es nota de entrega, no aplicar impuestos
  if (documentType === 'nota_entrega') {
    return {
      iva: 0,
      igtf: 0,
      total: subtotal,
      subtotalWithIva: 0,
      subtotalExempt: subtotal
    };
  }

  // Si no hay items, usar el comportamiento legacy (aplicar IVA a todo)
  if (!items || items.length === 0) {
    const iva = subtotal * 0.16;
    const igtfMethods = ['efectivo_usd', 'zelle', 'transferencia_int', 'binance', 'paypal'];
    const requiresIgtf = igtfMethods.includes(actualPaymentMethod);
    const igtf = requiresIgtf ? (subtotal + iva) * 0.03 : 0;

    return {
      iva,
      igtf,
      total: subtotal + iva + igtf,
      subtotalWithIva: subtotal,
      subtotalExempt: 0
    };
  }

  // Calcular subtotales por categoria de impuestos
  let subtotalWithIva = 0;
  let subtotalExempt = 0;
  let subtotalWithoutIgtf = 0;

  items.forEach(item => {
    const itemTotal = Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100);

    // Clasificar por IVA
    if (item.ivaApplicable !== false) {
      subtotalWithIva += itemTotal;
    } else {
      subtotalExempt += itemTotal;
    }

    // Clasificar por IGTF (productos exentos de IGTF no contribuyen a la base de IGTF)
    if (item.igtfExempt === true) {
      subtotalWithoutIgtf += itemTotal;
    }
  });

  // Calcular IVA usando la tasa especifica de cada producto
  const iva = items.reduce((sum, item) => {
    const itemTotal = Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100);
    const ivaRate = (item.ivaRate ?? 16) / 100; // Fallback to 16%
    const hasIva = item.ivaApplicable !== false;
    return hasIva ? sum + (itemTotal * ivaRate) : sum;
  }, 0);

  // Calcular IGTF (3%) solo si:
  // 1. El metodo de pago es en divisas
  // 2. El producto NO esta exento de IGTF (igtfExempt !== true)
  const igtfMethods = ['efectivo_usd', 'zelle', 'transferencia_int', 'binance', 'paypal'];
  const requiresIgtf = igtfMethods.includes(actualPaymentMethod);

  // Base IGTF = subtotal (sin productos exentos) + IVA (solo de productos no exentos de IGTF que si tienen IVA)
  const subtotalForIgtf = subtotal - subtotalWithoutIgtf;
  const ivaForIgtf = items.reduce((sum, item) => {
    const itemTotal = Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100);
    const ivaRate = (item.ivaRate ?? 16) / 100; // Use product's IVA rate
    const hasIva = item.ivaApplicable !== false;
    const notIgtfExempt = item.igtfExempt !== true;
    // Solo agregar IVA de items que tienen IVA aplicable Y no estan exentos de IGTF
    return (hasIva && notIgtfExempt) ? sum + (itemTotal * ivaRate) : sum;
  }, 0);

  const igtf = requiresIgtf ? (subtotalForIgtf + ivaForIgtf) * 0.03 : 0;

  const total = subtotal + iva + igtf;

  return {
    iva,
    igtf,
    total,
    subtotalWithIva,
    subtotalExempt
  };
};

/**
 * List of available payment method options used in payment terms UI.
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo_usd', label: 'Efectivo USD' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bolivares_bcv', label: '$ BCV' },
  { value: 'euro_bcv', label: '\u20AC BCV' },
  { value: 'pago_movil', label: 'Pago Movil' },
  { value: 'transferencia_ves', label: 'Transf. Bancaria VES' },
  { value: 'transferencia_int', label: 'Transf. Internacional' },
  { value: 'binance', label: 'Binance' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'pos', label: 'Punto de Venta' },
];
