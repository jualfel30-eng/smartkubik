/**
 * @file useComprasData.js
 * Custom hook that encapsulates ALL state and handlers for the Compras module.
 * The orchestrator (ComprasManagement.jsx) imports this hook and passes
 * slices of state / callbacks to the presentational sub-components.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useInventoryCache } from '@/hooks/useInventoryCache';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useExchangeRate } from '@/hooks/useExchangeRate.js';
import {
  parseTaxId,
  formatDateForApi,
  initialNewProductState,
  initialPoState,
  calculatePurchaseTaxes,
} from './compras-utils';

export function useComprasData() {
  const { rate: exchangeRate } = useExchangeRate();
  const [usdRate, setUsdRate] = useState(null);
  const [eurRate, setEurRate] = useState(null);
  const { tenant } = useAuth();
  const { invalidateInventoryData } = useInventoryCache();

  // State for New Product Dialog
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProductState);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const dragImageIndex = useRef(null);

  // State for New Purchase Order Dialog
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [po, setPo] = useState(initialPoState);

  const [poLoading, setPoLoading] = useState(false);
  // Snapshot of selected supplier's original data — used to detect edits
  // and persist them via PATCH /customers/:id when the PO is saved
  const originalSupplierRef = useRef(null);

  // Auto-receive flow: after a PO is created in "simple mode" (default for SMBs),
  // open a unified Receive+Rate dialog so the user doesn't have to navigate to
  // Purchase History. Tenants with separation of roles can opt into advanced
  // mode to disable this and require explicit receipt later.
  const [poForReceiveRate, setPoForReceiveRate] = useState(null);
  const [isReceiveRateOpen, setIsReceiveRateOpen] = useState(false);
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [supplierRifInput, setSupplierRifInput] = useState('');
  const [rifDropdownOpen, setRifDropdownOpen] = useState(false);
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [paymentDueDateOpen, setPaymentDueDateOpen] = useState(false);
  const rifInputRef = useRef(null);
  const rifDropdownRef = useRef(null);
  const [variantSelection, setVariantSelection] = useState(null);
  const [unitSelection, setUnitSelection] = useState(null);
  const [additionalVariants, setAdditionalVariants] = useState([]);

  // Invoice scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const invoiceFileRef = useRef(null);
  const invoiceFileRef2 = useRef(null);

  // --- Vertical config ---
  const verticalConfig = useVerticalConfig();
  const placeholders = useMemo(() => verticalConfig?.placeholders || {}, [verticalConfig]);
  const getPlaceholder = useCallback(
    (key, fallback) =>
      placeholders[key] && placeholders[key].trim() !== '' ? placeholders[key] : fallback,
    [placeholders],
  );
  const unitOptions = useMemo(() => {
    const defaults = Array.isArray(verticalConfig?.defaultUnits)
      ? verticalConfig.defaultUnits
      : [];
    const fallback = ['unidad', 'kg', 'g', 'lb', 'lt', 'ml'];
    const combined = [...defaults];
    fallback.forEach((unit) => {
      if (!combined.includes(unit)) {
        combined.push(unit);
      }
    });
    return combined.length > 0 ? combined : ['unidad'];
  }, [verticalConfig]);
  const supportsVariants = verticalConfig?.supportsVariants !== false;
  const allowsWeight = verticalConfig?.allowsWeight !== false;
  const isNonFoodRetailVertical = useMemo(() => {
    if (!verticalConfig) return false;
    return verticalConfig.baseVertical === 'RETAIL' && verticalConfig.allowsWeight === false;
  }, [verticalConfig]);
  const ingredientLabel = isNonFoodRetailVertical ? 'Composición' : 'Ingredientes';
  const variantSectionDescription = isNonFoodRetailVertical
    ? 'Agrega presentaciones extra para este producto (tallas, colores, etc.).'
    : 'Agrega presentaciones adicionales (tamaños, empaques, sabores, etc.) para este producto.';
  const inventorySupportsLots = verticalConfig?.inventory?.supportsLots !== false;
  const inventoryAlerts = Array.isArray(verticalConfig?.inventory?.alerts)
    ? verticalConfig.inventory.alerts
    : [];
  const inventorySupportsExpiration =
    inventorySupportsLots && inventoryAlerts.includes('nearExpiration');
  const showLotFields = inventorySupportsLots && !isNonFoodRetailVertical;
  const showExpirationFields = showLotFields && inventorySupportsExpiration;

  // --- Computed totals ---
  const poTotals = useMemo(() => {
    const subtotal = po.items.reduce((sum, item) => {
      const itemTotal = Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100);
      return sum + itemTotal;
    }, 0);
    const taxes = calculatePurchaseTaxes(subtotal, po.documentType, po.actualPaymentMethod, po.items);
    return {
      subtotal,
      iva: taxes.iva,
      igtf: taxes.igtf,
      total: taxes.total,
      subtotalWithIva: taxes.subtotalWithIva,
      subtotalExempt: taxes.subtotalExempt
    };
  }, [po.items, po.documentType, po.actualPaymentMethod]);

  const newProductTotals = useMemo(() => {
    const quantity = Number(newProduct.inventory.quantity) || 0;
    const costPrice = Number(newProduct.inventory.costPrice) || 0;
    const discount = Number(newProduct.inventory.discount) || 0;
    const subtotal = quantity * costPrice * (1 - discount / 100);
    const tempItem = {
      quantity,
      costPrice,
      discount,
      ivaApplicable: newProduct.ivaApplicable !== false,
      igtfExempt: newProduct.igtfExempt === true,
    };
    const taxes = calculatePurchaseTaxes(subtotal, newProduct.documentType, newProduct.actualPaymentMethod, [tempItem]);
    return {
      subtotal,
      iva: taxes.iva,
      igtf: taxes.igtf,
      total: taxes.total,
      subtotalWithIva: taxes.subtotalWithIva,
      subtotalExempt: taxes.subtotalExempt
    };
  }, [newProduct.inventory.quantity, newProduct.inventory.costPrice, newProduct.inventory.discount, newProduct.documentType, newProduct.actualPaymentMethod, newProduct.ivaApplicable, newProduct.igtfExempt]);

  // --- Data fetching (React Query: cacheado + compartido entre módulos del
  // contenedor Inventario; reentrar = instantáneo dentro del staleTime) ---
  const alertsQuery = useQuery({
    queryKey: ['compras-alerts', tenant?.id],
    queryFn: async () => {
      const [lowStockResp, expiringResp] = await Promise.all([
        // Resumen liviano: items limitados + totales (bajo stock vs agotado).
        fetchApi('/inventory/alerts/low-stock/summary'),
        fetchApi('/inventory/alerts/near-expiration?days=30'),
      ]);
      return {
        summary: lowStockResp.data || {},
        expiring: expiringResp.data || [],
      };
    },
    enabled: !!tenant?.id,
    staleTime: 120_000,
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', tenant?.id],
    queryFn: async () =>
      (await fetchApi('/customers?customerType=supplier')).data || [],
    enabled: !!tenant?.id,
    staleTime: 120_000,
  });

  const lowStockProducts = alertsQuery.data?.summary?.items || [];
  const lowStockTotal = alertsQuery.data?.summary?.lowStockTotal || 0;
  const outOfStockTotal = alertsQuery.data?.summary?.outOfStockTotal || 0;
  const expiringProducts = alertsQuery.data?.expiring || [];
  const suppliers = suppliersQuery.data || [];
  const loading = alertsQuery.isLoading || suppliersQuery.isLoading;
  const error =
    alertsQuery.error?.message || suppliersQuery.error?.message || null;

  // Tras escribir (crear producto/PO, recibir) se invalida TODO el contenedor
  // Inventario para que los demás módulos muestren datos frescos. Reemplaza el
  // antiguo fetchData() local.
  const fetchData = invalidateInventoryData;

  // Fetch both USD and EUR exchange rates from BCV
  useEffect(() => {
    const fetchBCVRates = async () => {
      try {
        const response = await fetchApi('/exchange-rate/bcv');
        setUsdRate(response.usd?.rate || exchangeRate || null);
        setEurRate(response.eur?.rate || null);
      } catch (error) {
        console.error('Error fetching BCV rates:', error);
        setUsdRate(exchangeRate);
      }
    };
    fetchBCVRates();
    const interval = setInterval(fetchBCVRates, 3600000);
    return () => clearInterval(interval);
  }, [exchangeRate]);

  // --- Handlers for New Product Dialog ---
  const handleDragStart = (index) => { dragImageIndex.current = index; };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (targetIndex) => {
    if (dragImageIndex.current === null || dragImageIndex.current === targetIndex) {
      dragImageIndex.current = null;
      return;
    }
    const draggedIndex = dragImageIndex.current;
    const images = [...newProduct.variant.images];
    const selectedImage = images[selectedImageIndex];
    const [draggedItem] = images.splice(draggedIndex, 1);
    images.splice(targetIndex, 0, draggedItem);
    const newSelectedIndex = images.findIndex(img => img === selectedImage);
    setNewProduct({ ...newProduct, variant: { ...newProduct.variant, images: images } });
    setSelectedImageIndex(newSelectedIndex >= 0 ? newSelectedIndex : 0);
    dragImageIndex.current = null;
  };

  useEffect(() => {
    if (!isNewProductDialogOpen) return;
    const defaultUnit = unitOptions[0] || initialNewProductState.unitOfMeasure;
    const baseProduct = {
      ...initialNewProductState,
      unitOfMeasure: defaultUnit,
      isPerishable: isNonFoodRetailVertical ? false : initialNewProductState.isPerishable,
      isSoldByWeight: allowsWeight ? initialNewProductState.isSoldByWeight : false,
      supplier: { ...initialNewProductState.supplier },
      variant: {
        ...initialNewProductState.variant,
        unit: defaultUnit,
        unitSize: initialNewProductState.variant.unitSize || 1,
        basePrice: initialNewProductState.variant.basePrice || 0,
        costPrice: initialNewProductState.variant.costPrice || 0,
        images: [],
      },
      inventory: { ...initialNewProductState.inventory },
    };
    if (!allowsWeight) {
      baseProduct.isSoldByWeight = false;
    }
    setNewProduct(baseProduct);
    setSelectedImageIndex(0);
    setAdditionalVariants([]);
  }, [isNewProductDialogOpen, unitOptions, isNonFoodRetailVertical, allowsWeight]);

  const addAdditionalVariant = useCallback(() => {
    setAdditionalVariants((prev) => [
      ...prev,
      {
        name: '',
        sku: '',
        barcode: '',
        unit: newProduct.unitOfMeasure || unitOptions[0] || 'unidad',
        unitSize: 1,
        costPrice: '',
        basePrice: '',
      },
    ]);
  }, [newProduct.unitOfMeasure, unitOptions]);

  const removeAdditionalVariant = useCallback((index) => {
    setAdditionalVariants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAdditionalVariantField = useCallback((index, field, value) => {
    setAdditionalVariants((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  // RIF Formatting Helpers
  const formatRifInput = useCallback((value, taxType) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (taxType === 'J') {
      if (cleaned.length > 8) {
        return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 9)}`;
      }
      return cleaned;
    }
    if (taxType === 'V' || taxType === 'E') {
      if (cleaned.length > 8) {
        return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 9)}`;
      }
      return cleaned;
    }
    return cleaned;
  }, []);

  const handleSupplierSelectionForNewProduct = (selectedOption) => {
    if (!selectedOption) {
      setNewProduct(prev => ({ ...prev, supplier: initialNewProductState.supplier }));
      return;
    }
    if (selectedOption.__isNew__) {
      setNewProduct(prev => ({
        ...prev,
        supplier: {
          ...initialNewProductState.supplier,
          isNew: true,
          newSupplierName: selectedOption.label,
        }
      }));
    } else {
      const { supplier } = selectedOption;
      const addr = supplier.addresses?.find(a => a.isDefault) || supplier.addresses?.[0];
      setNewProduct(prev => ({
        ...prev,
        supplier: {
          ...initialNewProductState.supplier,
          isNew: false,
          supplierId: supplier._id,
          newSupplierName: supplier.companyName || supplier.name,
          newSupplierRif: (supplier.taxInfo?.taxId || '').split('-').slice(1).join('-'),
          rifPrefix: (supplier.taxInfo?.taxId || 'J-').split('-')[0],
          newSupplierContactName: supplier.contacts?.[0]?.name || '',
          newSupplierContactPhone: supplier.contacts?.find(c => c.type === 'phone')?.value || '',
          newSupplierContactEmail: supplier.contacts?.find(c => c.type === 'email')?.value || '',
          newSupplierAddress: {
            city: addr?.city || '',
            state: addr?.state || '',
            street: addr?.street || '',
          },
        }
      }));
    }
  };

  const handleAddProduct = async () => {
    // Payment methods are optional at PO creation time — default if empty
    let allPaymentMethods = [...(newProduct.paymentTerms.paymentMethods || [])];
    if (newProduct.paymentTerms.customPaymentMethod?.trim()) {
      allPaymentMethods.push(newProduct.paymentTerms.customPaymentMethod.trim());
    }
    if (allPaymentMethods.length === 0) {
      allPaymentMethods = ['bolivares_bcv'];
    }

    const normalizedSku = (newProduct.sku || '').trim();
    const baseCost = Number(newProduct.inventory.costPrice) || 0;

    const buildVariantPayload = (variant, index) => {
      if (!variant) return null;
      const trimmedName = (variant.name || '').trim();
      const fallbackName = index === 1 ? 'Estándar' : `Variante ${index}`;
      const name = trimmedName !== '' ? trimmedName : fallbackName;

      const normalizedVariantSku = (variant.sku || '').trim();
      let resolvedSku;
      if (normalizedVariantSku !== '') {
        resolvedSku = normalizedVariantSku;
      } else if (normalizedSku) {
        resolvedSku = index === 1
          ? normalizedSku
          : `${normalizedSku}-${trimmedName !== ''
            ? trimmedName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-+$/, '')
            : `VAR${index}`}`;
      } else {
        // Backend autogenera SKU del producto y de cada variante cuando vienen vacíos.
        resolvedSku = undefined;
      }

      const normalizedBarcode = (variant.barcode || '').trim();
      const unit = (variant.unit || '').trim() || newProduct.unitOfMeasure || unitOptions[0] || 'unidad';
      const unitSize = Number(variant.unitSize) || 1;
      const basePrice = Number(variant.basePrice) || 0;
      const resolvedCost = variant.costPrice !== undefined && variant.costPrice !== ''
        ? Number(variant.costPrice) : baseCost;
      const costPrice = Number.isFinite(resolvedCost) && resolvedCost >= 0 ? resolvedCost : 0;

      return {
        name,
        sku: resolvedSku,
        barcode: normalizedBarcode !== '' ? normalizedBarcode : undefined,
        unit,
        unitSize: unitSize > 0 ? unitSize : 1,
        basePrice: basePrice >= 0 ? basePrice : 0,
        costPrice,
        images: Array.isArray(variant.images) ? variant.images : [],
      };
    };

    const primaryVariant = buildVariantPayload(
      {
        ...newProduct.variant,
        costPrice: newProduct.variant.costPrice !== undefined && newProduct.variant.costPrice !== ''
          ? newProduct.variant.costPrice : baseCost,
      },
      1,
    );

    const extraVariants = supportsVariants
      ? additionalVariants.map((variant, index) => buildVariantPayload(variant, index + 2)).filter(Boolean)
      : [];

    const variantsPayload = [primaryVariant, ...extraVariants].filter(Boolean);
    const isPerishable = !isNonFoodRetailVertical && newProduct.isPerishable;

    const inventoryConfig = {
      trackLots: showLotFields && isPerishable,
      trackExpiration: showExpirationFields && isPerishable,
      minimumStock: Number(newProduct.inventoryConfig?.minimumStock) || 10,
      maximumStock: Number(newProduct.inventoryConfig?.maximumStock) || 100,
      reorderPoint: Number(newProduct.inventoryConfig?.reorderPoint) || 20,
      reorderQuantity: Number(newProduct.inventoryConfig?.reorderQuantity) || 50,
      fefoEnabled: showExpirationFields && isPerishable,
    };

    const sanitizedSellingUnits = newProduct.hasMultipleSellingUnits
      ? (newProduct.sellingUnits || []).map(u => ({
        name: u.name || '',
        abbreviation: u.abbreviation || '',
        conversionFactor: u.conversionFactor ?? 1,
        isSoldByWeight: u.isSoldByWeight || false,
        pricePerUnit: Number(u.pricePerUnit) || 0,
        costPerUnit: Number(u.costPerUnit) || 0,
        minimumQuantity: Number(u.minimumQuantity) || 0,
        incrementStep: Number(u.incrementStep) || 0,
        isDefault: u.isDefault || false,
        isActive: u.isActive !== false,
      }))
      : [];

    const productPayload = {
      productType: newProduct.productType || 'simple',
      sku: normalizedSku || undefined,
      name: newProduct.name,
      category: newProduct.category,
      subcategory: newProduct.subcategory,
      brand: newProduct.brand,
      description: newProduct.description,
      ingredients: newProduct.ingredients,
      isPerishable,
      shelfLifeDays: isPerishable ? Number(newProduct.shelfLifeDays) || 0 : undefined,
      shelfLifeUnit: isPerishable ? (newProduct.shelfLifeUnit || 'days') : undefined,
      storageTemperature: isPerishable ? newProduct.storageTemperature : undefined,
      ivaApplicable: newProduct.ivaApplicable,
      taxCategory: newProduct.taxCategory,
      isSoldByWeight: allowsWeight ? newProduct.isSoldByWeight : false,
      unitOfMeasure: newProduct.unitOfMeasure,
      hasMultipleSellingUnits: newProduct.hasMultipleSellingUnits,
      sellingUnits: sanitizedSellingUnits,
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 0.2,
        maximumDiscount: 0.5,
      },
      inventoryConfig,
      variants: variantsPayload,
    };

    delete productPayload.shelfLifeValue;
    if (!isPerishable) {
      delete productPayload.shelfLifeDays;
      delete productPayload.shelfLifeUnit;
      delete productPayload.storageTemperature;
    }

    const inventoryPayload = {
      quantity: Number(newProduct.inventory.quantity) || 0,
      costPrice: baseCost,
      discount: Number(newProduct.inventory.discount) || 0,
    };
    if (showLotFields && newProduct.inventory.lotNumber) {
      inventoryPayload.lotNumber = newProduct.inventory.lotNumber;
    }
    if (showExpirationFields && newProduct.inventory.expirationDate) {
      inventoryPayload.expirationDate = newProduct.inventory.expirationDate;
    }

    const supplierPayload = {
      supplierId: newProduct.supplier.supplierId,
      newSupplierName: newProduct.supplier.newSupplierName,
      newSupplierContactName: newProduct.supplier.newSupplierContactName,
      newSupplierContactPhone: newProduct.supplier.newSupplierContactPhone,
      newSupplierContactEmail: newProduct.supplier.newSupplierContactEmail || undefined,
    };

    if (supplierPayload.supplierId) {
      delete supplierPayload.newSupplierName;
      delete supplierPayload.newSupplierContactName;
      delete supplierPayload.newSupplierContactPhone;
      delete supplierPayload.newSupplierContactEmail;
    } else {
      const rifNumber = (newProduct.supplier.newSupplierRif || '').trim();
      supplierPayload.newSupplierRif = `${newProduct.supplier.rifPrefix}-${rifNumber}`;
      const addr = newProduct.supplier.newSupplierAddress;
      const addrCity = addr?.city?.trim();
      const addrState = addr?.state?.trim();
      const addrStreet = addr?.street?.trim();
      if (addrCity || addrState || addrStreet) {
        supplierPayload.newSupplierAddress = {
          city: addrCity || undefined,
          state: addrState || undefined,
          street: addrStreet || undefined,
        };
      }
    }

    const payload = {
      product: productPayload,
      supplier: supplierPayload,
      inventory: inventoryPayload,
      purchaseDate: formatDateForApi(newProduct.purchaseDate),
      documentType: newProduct.documentType,
      invoiceNumber: newProduct.invoiceNumber?.trim() || undefined,
      subtotal: newProductTotals.subtotal,
      ivaTotal: newProductTotals.iva,
      igtfTotal: newProductTotals.igtf,
      totalAmount: newProductTotals.total,
      notes: 'Creación de producto con compra inicial.',
      paymentTerms: {
        isCredit: newProduct.paymentTerms.isCredit,
        paymentDueDate: formatDateForApi(newProduct.paymentTerms.paymentDueDate),
        paymentMethods: allPaymentMethods,
        customPaymentMethod: newProduct.paymentTerms.customPaymentMethod,
        expectedCurrency: newProduct.paymentTerms.expectedCurrency,
        requiresAdvancePayment: newProduct.paymentTerms.requiresAdvancePayment,
        advancePaymentPercentage: newProduct.paymentTerms.advancePaymentPercentage
      }
    };

    try {
      await fetchApi('/products/with-initial-purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Producto y compra inicial creados con éxito');
      setIsNewProductDialogOpen(false);
      setNewProduct(initialNewProductState);
      setAdditionalVariants([]);
      fetchData();
    } catch (err) {
      toast.error(`Error al crear producto: ${err.message}`);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = newProduct.variant.images || [];
    if (currentImages.length + files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }
    const newImages = files.map(file => URL.createObjectURL(file));
    setNewProduct({ ...newProduct, variant: { ...newProduct.variant, images: [...currentImages, ...newImages] } });
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...newProduct.variant.images];
    updatedImages.splice(index, 1);
    if (index === selectedImageIndex) {
      setSelectedImageIndex(0);
    } else if (index < selectedImageIndex) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
    setNewProduct({ ...newProduct, variant: { ...newProduct.variant, images: updatedImages } });
  };

  // --- Invoice Scanning Handler ---
  const handleScanInvoice = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      toast.info('Optimizando imagen...', { duration: 2000 });
      const file = await compressImage(rawFile, 1600, 0.8);

      const formData = new FormData();
      formData.append('image', file);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 90000);
      });

      const apiPromise = fetchApi('/purchases/scan-invoice', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      const result = await Promise.race([apiPromise, timeoutPromise]);
      const data = result.data || result;
      setScanResult(data);

      // Pre-fill supplier data
      if (data.supplier) {
        const rifParts = (data.supplier.rif || '').split('-');
        const taxType = rifParts[0] || 'J';
        const rifNumber = rifParts.slice(1).join('').replace(/[^0-9]/g, '') || data.supplier.rif?.replace(/[^0-9]/g, '') || '';

        setPo(prev => ({
          ...prev,
          supplierId: data.supplier.matchedSupplierId || '',
          supplierName: data.supplier.name || prev.supplierName,
          supplierRif: rifNumber,
          taxType: taxType.toUpperCase(),
          contactName: data.supplier.contactName || prev.contactName,
          contactPhone: data.supplier.contactPhone || prev.contactPhone,
          contactEmail: data.supplier.contactEmail || prev.contactEmail,
          purchaseDate: data.invoiceDate ? new Date(data.invoiceDate) : prev.purchaseDate,
          notes: data.notes || `Factura #${data.invoiceNumber || 'S/N'}`,
          paymentTerms: {
            ...prev.paymentTerms,
            isCredit: data.paymentTerms?.isCredit || false,
            paymentMethods: data.paymentTerms?.paymentMethods?.length > 0
              ? data.paymentTerms.paymentMethods
              : prev.paymentTerms.paymentMethods,
            expectedCurrency: data.paymentTerms?.expectedCurrency || prev.paymentTerms.expectedCurrency,
          },
        }));

        if (data.supplier.name && !data.supplier.matchedSupplierId) {
          setSupplierNameInput(data.supplier.name);
        }
        if (rifNumber && !data.supplier.matchedSupplierId) {
          setSupplierRifInput(rifNumber);
        }

        // Also update newProduct supplier for the "Compra de Producto Nuevo" dialog
        if (isNewProductDialogOpen) {
          setNewProduct(prev => ({
            ...prev,
            supplier: {
              ...prev.supplier,
              isNew: !data.supplier.matchedSupplierId,
              supplierId: data.supplier.matchedSupplierId || null,
              newSupplierName: data.supplier.name || '',
              newSupplierRif: rifNumber,
              rifPrefix: taxType.toUpperCase(),
              newSupplierContactName: data.supplier.contactName || prev.supplier.newSupplierContactName,
              newSupplierContactPhone: data.supplier.contactPhone || prev.supplier.newSupplierContactPhone,
            },
          }));
        }
      }

      // Pre-fill items
      if (data.items?.length > 0) {
        const mappedItems = data.items.map(item => ({
          productId: item.matchedProductId || '',
          productName: item.productName,
          productSku: item.productSku,
          variantId: item.matchedVariantId || '',
          variantName: '',
          variantSku: '',
          quantity: item.quantity,
          costPrice: item.costPrice,
          lotNumber: item.lotNumber || '',
          expirationDate: item.expirationDate || '',
          _confidence: item.confidence,
          _matched: !!item.matchedProductId,
        }));
        setPo(prev => ({ ...prev, items: mappedItems }));

        if (isNewProductDialogOpen && data.items.length > 0) {
          const firstItem = data.items[0];
          setNewProduct(prev => ({
            ...prev,
            name: firstItem.productName || prev.name,
            inventory: {
              ...prev.inventory,
              quantity: firstItem.quantity || prev.inventory.quantity,
              costPrice: firstItem.costPrice || prev.inventory.costPrice,
            },
            variant: {
              ...prev.variant,
              costPrice: firstItem.costPrice || prev.variant.costPrice,
            },
          }));
        }
      }

      const confidencePct = Math.round((data.overallConfidence || 0) * 100);
      if (confidencePct >= 80) {
        toast.success(`Factura escaneada con ${confidencePct}% de confianza`, {
          description: `${data.items?.length || 0} productos detectados. Revise los datos antes de confirmar.`,
        });
      } else if (confidencePct >= 50) {
        toast.warning(`Factura escaneada con ${confidencePct}% de confianza`, {
          description: 'Algunos campos requieren revisión manual. Los campos en amarillo tienen baja confianza.',
        });
      } else {
        toast.warning(`Factura escaneada con baja confianza (${confidencePct}%)`, {
          description: 'Revise cuidadosamente todos los campos. La imagen puede ser difícil de leer.',
        });
      }
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        toast.error('El escaneo está tomando demasiado tiempo', {
          description: 'Por favor, intente con una imagen más clara o de menor tamaño.'
        });
      } else {
        toast.error('Error al escanear factura', { description: err.message });
      }
    } finally {
      setIsScanning(false);
      if (invoiceFileRef.current) invoiceFileRef.current.value = '';
      if (invoiceFileRef2.current) invoiceFileRef2.current.value = '';
    }
  };

  const handleClearScan = () => {
    setScanResult(null);
    setPo(initialPoState);
    if (isNewProductDialogOpen) {
      setNewProduct(initialNewProductState);
    }
    toast.info('Escaneo descartado. Formulario restaurado.');
  };

  // --- Handlers for New Purchase Order Dialog ---
  const handleSupplierSelection = (selectedOption) => {
    if (!selectedOption) {
      setSupplierNameInput('');
      setSupplierRifInput('');
      setPo(prev => ({
        ...prev,
        supplierId: '',
        supplierName: '',
        supplierRif: '',
        taxType: 'J',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        supplierAddress: { city: '', state: '', street: '' },
      }));
      return;
    }
    if (selectedOption.__isNew__) {
      setSupplierNameInput('');
      originalSupplierRef.current = null;
      setPo(prev => ({ ...prev, supplierId: '', supplierName: selectedOption.label }));
    } else {
      setSupplierNameInput('');
      const { supplier } = selectedOption;
      const { taxType, rifNumber } = parseTaxId(
        supplier.taxInfo?.taxId,
        supplier.taxInfo?.taxType || 'J'
      );
      const addr = supplier.addresses?.find(a => a.isDefault) || supplier.addresses?.[0];
      setSupplierRifInput(rifNumber);

      // Snapshot original values to detect edits later
      originalSupplierRef.current = {
        _id: supplier._id,
        contactName: supplier.contacts?.[0]?.name || supplier.name || '',
        contactPhone: supplier.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: supplier.contacts?.find(c => c.type === 'email')?.value || '',
        addresses: supplier.addresses || [],
        contacts: supplier.contacts || [],
        address: {
          city: addr?.city || '',
          state: addr?.state || '',
          street: addr?.street || '',
        },
      };

      setPo(prev => ({
        ...prev,
        supplierId: supplier._id,
        supplierName: supplier.companyName || supplier.name,
        supplierRif: rifNumber,
        taxType: taxType,
        contactName: supplier.contacts?.[0]?.name || supplier.name || '',
        contactPhone: supplier.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: supplier.contacts?.find(c => c.type === 'email')?.value || '',
        supplierAddress: {
          city: addr?.city || '',
          state: addr?.state || '',
          street: addr?.street || '',
        },
      }));
      fetchSupplierPaymentMethods(supplier._id);
    }
  };

  const handleRifSelection = (selectedOption) => {
    console.log('🔍 DEBUG RIF - handleRifSelection called:', selectedOption);

    if (!selectedOption) {
      setSupplierRifInput('');
      setSupplierNameInput('');
      setPo(prev => ({
        ...prev,
        supplierId: '',
        supplierName: '',
        supplierRif: '',
        taxType: 'J',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        supplierAddress: { city: '', state: '', street: '' },
      }));
      return;
    }
    if (selectedOption.__isNew__) {
      const { taxType, rifNumber } = parseTaxId(selectedOption.label, po.taxType || 'J');
      setPo(prev => ({
        ...prev,
        supplierId: '',
        supplierName: '',
        taxType: taxType,
        supplierRif: rifNumber,
      }));
    } else {
      const { customer } = selectedOption;
      console.log('🔍 DEBUG RIF - Customer data:', {
        _id: customer._id,
        companyName: customer.companyName,
        name: customer.name,
        fullCustomer: customer,
      });
      const { taxType, rifNumber } = parseTaxId(
        customer.taxInfo?.taxId,
        customer.taxInfo?.taxType || 'J'
      );
      const addr = customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0];
      const supplierNameToSet = customer.companyName || customer.name;
      console.log('🔍 DEBUG RIF - Will set supplierName to:', supplierNameToSet);

      // Snapshot original values to detect edits later
      originalSupplierRef.current = {
        _id: customer._id,
        contactName: customer.contacts?.[0]?.name || customer.name || '',
        contactPhone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: customer.contacts?.find(c => c.type === 'email')?.value || '',
        addresses: customer.addresses || [],
        contacts: customer.contacts || [],
        address: {
          city: addr?.city || '',
          state: addr?.state || '',
          street: addr?.street || '',
        },
      };

      setSupplierRifInput(rifNumber);
      setSupplierNameInput('');
      setPo(prev => {
        console.log('🔍 DEBUG RIF - Setting state, prev:', prev);
        const newState = {
          ...prev,
          supplierId: customer._id,
          supplierName: supplierNameToSet,
          supplierRif: rifNumber,
          taxType: taxType,
          contactName: customer.contacts?.[0]?.name || customer.name || '',
          contactPhone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
          contactEmail: customer.contacts?.find(c => c.type === 'email')?.value || '',
          supplierAddress: {
            city: addr?.city || '',
            state: addr?.state || '',
            street: addr?.street || '',
          },
        };
        console.log('🔍 DEBUG RIF - New state:', newState);
        return newState;
      });

      console.log('🔍 DEBUG RIF - Calling fetchSupplierPaymentMethods');
      fetchSupplierPaymentMethods(customer._id);
    }
  };

  const handleSupplierNameInputChange = (inputValue = '') => {
    setSupplierNameInput(inputValue);
    if (inputValue) {
      setPo(prev => ({ ...prev, supplierId: '', supplierName: inputValue }));
    }
  };

  const handleSupplierRifInputChange = (inputValue = '') => {
    const sanitized = inputValue.replace(/\s+/g, '').toUpperCase();
    setSupplierRifInput(sanitized);
    if (sanitized) {
      setPo(prev => {
        let taxType = prev.taxType || 'J';
        let rifNumber = sanitized;
        const dashParts = sanitized.split('-').filter(Boolean);
        if (dashParts.length > 1 && /^[JVEGPNC]$/.test(dashParts[0])) {
          taxType = dashParts[0];
          rifNumber = dashParts.slice(1).join('-');
        } else if (/^[JVEGPNC]\d/.test(sanitized)) {
          taxType = sanitized.charAt(0);
          rifNumber = sanitized.slice(1);
        }
        rifNumber = rifNumber.replace(/[^0-9]/g, '');
        return { ...prev, supplierId: '', supplierRif: rifNumber, taxType };
      });
    } else {
      setPo(prev => ({ ...prev, supplierId: '', supplierRif: '', taxType: prev.taxType || 'J' }));
    }
  };

  const handleFieldChange = (field, value) => {
    setPo(prev => ({ ...prev, [field]: value }));
  };

  const supplierNameOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s._id,
      label: s.companyName || s.name,
      customer: s,
    })), [suppliers]);

  const supplierRifOptions = useMemo(() => {
    return suppliers
      .filter(s => s.taxInfo?.taxId)
      .map(s => ({
        value: s._id,
        label: s.taxInfo.taxId,
        customer: s,
      }));
  }, [suppliers]);

  const rifSuggestions = useMemo(() => {
    const currentRif = po.supplierRif?.replace(/[^0-9]/g, '') || '';
    if (!currentRif || currentRif.length < 2 || po.supplierId) return [];
    return suppliers
      .filter(s => {
        const taxId = (s.taxInfo?.taxId || '').replace(/[^0-9]/g, '');
        return taxId && taxId.includes(currentRif);
      })
      .slice(0, 5);
  }, [po.supplierRif, po.supplierId, suppliers]);

  // Close RIF dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        rifDropdownRef.current && !rifDropdownRef.current.contains(e.target) &&
        rifInputRef.current && !rifInputRef.current.contains(e.target)
      ) {
        setRifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s._id,
      label: s.companyName || s.name,
      supplier: s,
    })), [suppliers]);

  const loadSupplierOptions = useCallback(async (searchQuery) => {
    try {
      const response = await fetchApi(
        `/customers?customerType=supplier&search=${encodeURIComponent(searchQuery)}`
      );
      return (response.data || []).map((s) => ({
        value: s._id,
        label: s.companyName || s.name,
        supplier: s,
      }));
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return [];
    }
  }, []);

  const loadProductOptions = useCallback(async (searchQuery) => {
    try {
      const response = await fetchApi(
        `/products?search=${encodeURIComponent(searchQuery)}&includeInactive=true&limit=200`
      );
      return (response.data || []).map((p) => {
        const parts = [p.name];
        if (p.sku) parts.push(`SKU: ${p.sku}`);
        if (p.brand) parts.push(`Marca: ${p.brand}`);
        if (p.isActive === false) parts.push('[INACTIVO]');
        return {
          value: p._id,
          label: parts.join(' · '),
          product: p
        };
      });
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }, []);

  const normalizeId = useCallback((value) => {
    if (value === undefined || value === null) return null;
    return value.toString();
  }, []);

  const upsertPurchaseItem = useCallback((product, variant, quantity, costPrice, selectedUnit = null) => {
    if (!product || !quantity || Number.isNaN(quantity) || quantity <= 0) return;
    const productId = normalizeId(product._id);
    const variantId = variant ? normalizeId(variant._id) : null;
    const resolvedCost = Number.isFinite(costPrice) ? costPrice : 0;

    setPo(prev => {
      const items = [...prev.items];
      const matchIndex = items.findIndex(item =>
        normalizeId(item.productId) === productId &&
        normalizeId(item.variantId) === variantId &&
        (item.selectedUnitName || null) === (selectedUnit?.name || null)
      );
      if (matchIndex !== -1) {
        const existing = items[matchIndex];
        const existingQty = Number(existing.quantity) || 0;
        items[matchIndex] = { ...existing, quantity: existingQty + quantity, costPrice: resolvedCost };
      } else {
        items.push({
          productId,
          productName: product.name,
          productBrand: product.brand || '',
          productSku: variant?.sku || product.sku,
          variantId: variantId || undefined,
          variantName: variant?.name,
          variantSku: variant?.sku,
          selectedUnitName: selectedUnit?.name || undefined,
          selectedUnitAbbr: selectedUnit?.abbreviation || undefined,
          quantity,
          costPrice: resolvedCost,
          isPerishable: product.isPerishable,
          lotNumber: '',
          expirationDate: '',
          ivaApplicable: product.ivaApplicable !== false,
          ivaRate: product.ivaRate ?? 16,
          igtfExempt: product.igtfExempt === true,
        });
      }
      return { ...prev, items };
    });
  }, [normalizeId]);

  const openVariantSelection = useCallback((product, variants) => {
    setVariantSelection({
      product,
      rows: variants.map(variant => ({
        variant,
        quantity: '',
        costPrice: variant?.costPrice != null ? variant.costPrice.toString() : '',
      })),
    });
  }, []);

  const closeVariantSelection = useCallback(() => {
    setVariantSelection(null);
  }, []);

  const openUnitSelection = useCallback((product, variant, units) => {
    setUnitSelection({ product, variant, units });
  }, []);

  const closeUnitSelection = useCallback(() => {
    setUnitSelection(null);
  }, []);

  const selectUnit = useCallback((unit) => {
    if (!unitSelection) return;
    const { product, variant } = unitSelection;
    const cost = unit.costPerUnit ?? variant?.costPrice ?? 0;
    upsertPurchaseItem(product, variant, 1, cost, unit);
    setUnitSelection(null);
  }, [unitSelection, upsertPurchaseItem]);

  const updateVariantSelectionRow = useCallback((index, field, value) => {
    setVariantSelection(prev => {
      if (!prev) return prev;
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, rows };
    });
  }, []);

  const confirmVariantSelection = useCallback(() => {
    if (!variantSelection) return;
    const { product, rows } = variantSelection;
    let hasValidQuantity = false;
    rows.forEach(row => {
      const quantityValue = Number(row.quantity);
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) return;
      hasValidQuantity = true;
      const costValue = Number(row.costPrice !== '' ? row.costPrice : row.variant?.costPrice ?? 0);
      upsertPurchaseItem(product, row.variant, quantityValue, Number.isFinite(costValue) ? costValue : 0);
    });
    if (!hasValidQuantity) {
      toast.error('Debes ingresar al menos una cantidad mayor a cero para las variantes seleccionadas.');
      return;
    }
    closeVariantSelection();
  }, [closeVariantSelection, upsertPurchaseItem, variantSelection]);

  const handleProductSelection = (selectedOption) => {
    if (!selectedOption) return;
    const product = selectedOption.product;
    if (!product) return;
    const variants = Array.isArray(product.variants)
      ? product.variants.filter(variant => variant && variant.isActive !== false)
      : [];
    if (variants.length === 0) {
      toast.error(`El producto seleccionado (${product.name}) no tiene variantes activas configuradas.`);
      return;
    }
    if (variants.length === 1) {
      const variant = variants[0];
      // If product has multiple selling units, let user pick which unit to purchase in
      const activeSellingUnits = Array.isArray(product.sellingUnits)
        ? product.sellingUnits.filter(u => u && u.isActive !== false)
        : [];
      if (product.hasMultipleSellingUnits && activeSellingUnits.length > 1) {
        openUnitSelection(product, variant, activeSellingUnits);
        return;
      }
      const defaultCost = variant?.costPrice ?? 0;
      upsertPurchaseItem(product, variant, 1, defaultCost);
      return;
    }
    openVariantSelection(product, variants);
  };

  const updateItemField = (index, field, value) => {
    const newItems = [...po.items];
    newItems[index][field] = value;
    setPo(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItemFromPo = (index) => {
    const newItems = [...po.items];
    newItems.splice(index, 1);
    setPo(prev => ({ ...prev, items: newItems }));
  };

  // ─── Inline product creation (unified Compras flow) ─────────────────────
  // Popup state for the "+ Crear producto nuevo" affordance inside the
  // product search of CompraCreateDialog. The popup creates a catalog entry
  // via plain POST /products (NOT createWithInitialPurchase) and inserts the
  // resulting product into po.items as a regular line item. The PO is built
  // separately by the parent dialog as a single transaction with mixed
  // pre-existing + freshly-created productIds.
  const INLINE_DRAFT_STORAGE_KEY = 'smartkubik:compras:pending-product-draft';
  const FIRST_CREATE_STORAGE_KEY_PREFIX = 'smartkubik:first-inline-product-created:';

  const [isInlineProductDialogOpen, setIsInlineProductDialogOpen] = useState(false);
  const [inlineProductInitialQuery, setInlineProductInitialQuery] = useState('');
  const [inlineProductLoading, setInlineProductLoading] = useState(false);
  const [pendingProductDraft, setPendingProductDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(INLINE_DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const persistPendingProductDraft = useCallback((draft) => {
    setPendingProductDraft(draft);
    try {
      if (draft) {
        localStorage.setItem(INLINE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(INLINE_DRAFT_STORAGE_KEY);
      }
    } catch { /* localStorage might be disabled */ }
  }, []);

  const openInlineProductDialog = useCallback((query) => {
    setInlineProductInitialQuery((query || '').trim());
    setIsInlineProductDialogOpen(true);
  }, []);

  const closeInlineProductDialog = useCallback(() => {
    setIsInlineProductDialogOpen(false);
  }, []);

  // Builds the full CreateProductDto from the popup's 8-field state.
  // Defaults that the popup does NOT capture but the DTO requires are
  // injected here per docs/discovery/unified-purchase-product-creation.md.
  const buildInlineProductPayload = useCallback((draft) => {
    const name = (draft.name || '').trim();
    const brand = (draft.brand || '').trim();
    const baseUnit = (draft.baseUnit || unitOptions[0] || 'unidad').trim();
    const sellingPrice = Number(draft.sellingPrice) || 0;
    const sku = (draft.sku || '').trim();
    const barcode = (draft.barcode || '').trim();
    const category = (draft.category || '').trim();
    const subcategory = (draft.subcategory || '').trim();

    const isPerishable = !!(
      verticalConfig?.inventory?.supportsLots
      && verticalConfig?.baseVertical === 'FOOD_SERVICE'
    );

    return {
      // 8 popup fields
      name,
      brand,
      unitOfMeasure: baseUnit,
      sku: sku || undefined,
      category: category ? [category] : ['Sin clasificar'],
      subcategory: subcategory ? [subcategory] : ['General'],
      // Frontend-injected defaults (popup never asks for these)
      taxCategory: 'general',
      isPerishable,
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 0.2,
        maximumDiscount: 0.5,
        bulkDiscountEnabled: false,
        bulkDiscountRules: [],
        wholesaleEnabled: false,
        wholesaleMinQuantity: 1,
      },
      inventoryConfig: {
        minimumStock: 10,
        maximumStock: 100,
        reorderPoint: 20,
        reorderQuantity: 50,
        trackLots: isPerishable,
        trackExpiration: isPerishable,
        fefoEnabled: isPerishable,
      },
      variants: [
        {
          name,
          unit: baseUnit,
          unitSize: 1,
          basePrice: sellingPrice,
          costPrice: 0,
          ...(barcode ? { barcode } : {}),
        },
      ],
    };
  }, [unitOptions, verticalConfig]);

  const createInlineProduct = useCallback(async (draft) => {
    const payload = buildInlineProductPayload(draft);

    // Client-side guard mirrors backend @IsNotEmpty rules (popup also disables
    // submit, but defense in depth).
    if (!payload.name) {
      toast.error('Falta el nombre del producto.');
      return null;
    }
    if (!payload.brand) {
      toast.error('Falta la marca del producto.');
      return null;
    }
    if (!Number(payload.variants[0].basePrice) || payload.variants[0].basePrice < 0) {
      toast.error('Ingresa un precio de venta mayor a 0.');
      return null;
    }

    setInlineProductLoading(true);
    try {
      const response = await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // fetchApi may return either {data: ...} or the raw doc — normalize.
      const created = response?.data ?? response;
      if (!created || !created._id) {
        toast.error('No se recibió el producto creado del servidor.');
        return null;
      }

      const variant = created.variants?.[0];
      upsertPurchaseItem(created, variant, 1, 0);
      persistPendingProductDraft(null);

      // First-ever inline create — milestone celebration (once per tenant).
      try {
        const stored = JSON.parse(localStorage.getItem('tenant') || '{}');
        const tenantId = stored?.id || stored?._id;
        if (tenantId) {
          const key = `${FIRST_CREATE_STORAGE_KEY_PREFIX}${tenantId}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            window.dispatchEvent(new CustomEvent('smartkubik:celebrate'));
          }
        }
      } catch { /* ignore */ }

      toast.success(`"${created.name}" agregado a la compra.`);
      setIsInlineProductDialogOpen(false);
      return created;
    } catch (err) {
      console.error('Inline product creation failed:', err);
      const msg = err?.response?.data?.message
        || err?.message
        || 'No se pudo crear el producto.';
      toast.error(Array.isArray(msg) ? msg.join(' · ') : String(msg));
      return null;
    } finally {
      setInlineProductLoading(false);
    }
  }, [buildInlineProductPayload, upsertPurchaseItem, persistPendingProductDraft]);

  const fetchSupplierPaymentMethods = async (supplierId) => {
    try {
      const supplier = await fetchApi(`/suppliers/${supplierId}`);
      const paymentSettings = supplier?.paymentSettings || {};
      const acceptedMethods = paymentSettings.acceptedPaymentMethods || [];
      const acceptsCredit = paymentSettings.acceptsCredit ?? false;
      const defaultCreditDays = paymentSettings.defaultCreditDays || 0;
      const requiresAdvancePayment = paymentSettings.requiresAdvancePayment ?? false;
      const advancePaymentPercentage = paymentSettings.advancePaymentPercentage || 0;

      let paymentDueDate = null;
      if (acceptsCredit && defaultCreditDays > 0) {
        const dueDate = new Date(po.purchaseDate);
        dueDate.setDate(dueDate.getDate() + defaultCreditDays);
        paymentDueDate = dueDate;
      }

      const lastMethod = loadLastPaymentMethod(supplierId);
      const preferredMethod = paymentSettings.preferredPaymentMethod;
      const validPreferredMethod = preferredMethod && acceptedMethods.includes(preferredMethod)
        ? preferredMethod : null;
      const methodToUse = lastMethod || validPreferredMethod || acceptedMethods[0] || 'efectivo_usd';

      // Smart default: currency from last purchase with this supplier
      const lastCurrency = loadLastCurrency(supplierId);

      setPo(prev => ({
        ...prev,
        actualPaymentMethod: methodToUse,
        paymentTerms: {
          ...prev.paymentTerms,
          paymentMethods: acceptedMethods,
          isCredit: acceptsCredit,
          paymentDueDate: paymentDueDate,
          requiresAdvancePayment: requiresAdvancePayment,
          advancePaymentPercentage: advancePaymentPercentage,
          ...(lastCurrency && { expectedCurrency: lastCurrency }),
        }
      }));

      const features = [];
      if (acceptedMethods.length > 0) features.push(`${acceptedMethods.length} método(s) de pago`);
      if (acceptsCredit) features.push(`crédito a ${defaultCreditDays} días`);
      if (requiresAdvancePayment) features.push(`adelanto del ${advancePaymentPercentage}%`);
      if (features.length > 0) {
        toast.info('Condiciones de Pago Cargadas', {
          description: `Se han pre-configurado: ${features.join(', ')}`
        });
      }
    } catch (error) {
      console.error('Error cargando condiciones de pago del proveedor:', error);
    }
  };

  const saveLastPaymentMethod = (supplierId, paymentMethod) => {
    if (!supplierId || !paymentMethod) return;
    try {
      localStorage.setItem(`lastPaymentMethod_${supplierId}`, paymentMethod);
    } catch (error) {
      console.error('Error guardando último método de pago:', error);
    }
  };

  const loadLastPaymentMethod = (supplierId) => {
    if (!supplierId) return null;
    try {
      return localStorage.getItem(`lastPaymentMethod_${supplierId}`);
    } catch (error) {
      console.error('Error cargando último método de pago:', error);
      return null;
    }
  };

  // Smart default: remember last currency used per supplier
  const saveLastCurrency = (supplierId, currency) => {
    if (!supplierId || !currency) return;
    try { localStorage.setItem(`lastCurrency_${supplierId}`, currency); }
    catch { /* ignore */ }
  };

  const loadLastCurrency = (supplierId) => {
    if (!supplierId) return null;
    try { return localStorage.getItem(`lastCurrency_${supplierId}`); }
    catch { return null; }
  };

  const handleActualPaymentMethodChange = (method) => {
    setPo(prev => ({ ...prev, actualPaymentMethod: method }));
    if (po.supplierId) {
      saveLastPaymentMethod(po.supplierId, method);
    }
  };

  const syncPaymentMethodsToSupplier = async (supplierId, newPaymentMethods) => {
    try {
      const supplier = await fetchApi(`/suppliers/${supplierId}`);
      const currentMethods = supplier?.paymentSettings?.acceptedPaymentMethods || [];
      const methodsToAdd = newPaymentMethods.filter(m => !currentMethods.includes(m));
      if (methodsToAdd.length === 0) return;
      const mergedMethods = [...new Set([...currentMethods, ...methodsToAdd])];
      await fetchApi(`/suppliers/${supplierId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentSettings: { ...supplier.paymentSettings, acceptedPaymentMethods: mergedMethods }
        })
      });
      console.log(`✅ Synced ${methodsToAdd.length} new payment method(s) to supplier ${supplierId}`);
    } catch (error) {
      console.error('Error sincronizando métodos de pago al proveedor:', error);
    }
  };

  const handlePoSubmit = async () => {
    console.log('🔍 DEBUG - Estado PO antes de validación:', {
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierRif: po.supplierRif,
      contactName: po.contactName,
      contactPhone: po.contactPhone,
    });

    const supplierNameTrimmed = po.supplierName?.trim() || '';
    const supplierRifTrimmed = po.supplierRif?.toString().trim() || '';
    const contactNameTrimmed = po.contactName?.trim() || '';
    const contactPhoneTrimmed = po.contactPhone?.trim() || '';
    const contactEmailTrimmed = po.contactEmail?.trim() || '';

    console.log('🔍 DEBUG - Valores trimmed:', { supplierNameTrimmed, supplierRifTrimmed, contactNameTrimmed });

    const hasIdentifier = supplierNameTrimmed || supplierRifTrimmed;
    if (!hasIdentifier) {
      toast.error('Error de Validación', {
        description: 'Debes proporcionar al menos el Nombre de la Empresa o el RIF del proveedor.'
      });
      return;
    }
    // Contact name + phone are always optional (per product decision). The
    // identifier check (company name OR RIF) above is enough to register a
    // supplier; the contact person can be added later from Suppliers Hub.
    // Backend tolerates empty contactName/contactPhone in CreatePurchaseOrderDto.
    if (!po.supplierId && !supplierNameTrimmed) {
      toast.error('Error de Validación', {
        description: 'Debes ingresar el Nombre o Razón Social del proveedor.'
      });
      return;
    }

    const normalizedTaxType = (po.taxType || 'J').toUpperCase();
    const rifDigits = supplierRifTrimmed.replace(/[^0-9]/g, '');

    if (!po.supplierId) {
      const rifForValidation = `${normalizedTaxType}-${rifDigits}`;
      const rifRegex = /^[JVEGPNC]-?[0-9]{8,9}$/;
      if (!rifDigits || !rifRegex.test(rifForValidation)) {
        toast.error('Error de Validación', { description: 'El RIF del nuevo proveedor no es válido.' });
        return;
      }
    }
    if (po.items.length === 0) {
      toast.error('Error de Validación', { description: 'Debe agregar al menos un producto a la orden.' });
      return;
    }

    // Payment methods are now optional at PO creation time
    // (configured in supplier profile or at payment time in Accounts Payable)
    // Backend still requires at least 1 method — default to 'bolivares_bcv' (most common in VE)
    let allPaymentMethods = [...(po.paymentTerms.paymentMethods || [])];
    if (po.paymentTerms.customPaymentMethod?.trim()) {
      allPaymentMethods.push(po.paymentTerms.customPaymentMethod.trim());
    }
    if (allPaymentMethods.length === 0) {
      allPaymentMethods = ['bolivares_bcv'];
    }

    setPoLoading(true);

    const totalAmount = poTotals.total;
    const advancePaymentAmount = po.paymentTerms.requiresAdvancePayment
      ? (totalAmount * (po.paymentTerms.advancePaymentPercentage / 100))
      : 0;
    const remainingBalance = totalAmount - advancePaymentAmount;

    let creditDays = 0;
    if (po.paymentTerms.isCredit && po.paymentTerms.paymentDueDate) {
      const purchaseDate = new Date(po.purchaseDate);
      const dueDate = new Date(po.paymentTerms.paymentDueDate);
      creditDays = Math.ceil((dueDate - purchaseDate) / (1000 * 60 * 60 * 24));
    }

    let exchangeRateSnapshot = undefined;
    let eurExchangeRateSnapshot = undefined;
    let totalAmountVes = undefined;

    if (po.actualPaymentMethod === 'bolivares_bcv' && usdRate) {
      exchangeRateSnapshot = usdRate;
      totalAmountVes = poTotals.total * usdRate;
    } else if (po.actualPaymentMethod === 'euro_bcv' && eurRate) {
      eurExchangeRateSnapshot = eurRate;
      totalAmountVes = poTotals.total * eurRate;
    }

    const dto = {
      purchaseDate: formatDateForApi(po.purchaseDate),
      documentType: po.documentType,
      invoiceNumber: po.invoiceNumber?.trim() || undefined,
      actualPaymentMethod: po.actualPaymentMethod,
      exchangeRateSnapshot,
      eurExchangeRateSnapshot,
      totalAmountVes,
      subtotal: poTotals.subtotal,
      ivaTotal: poTotals.iva,
      igtfTotal: poTotals.igtf,
      totalAmount: poTotals.total,
      items: po.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.costPrice) || 0,
        discount: Number(item.discount) || 0,
        lotNumber: item.lotNumber || undefined,
        expirationDate: item.expirationDate || undefined,
        ...(item.variantId
          ? {
            variantId: item.variantId,
            variantName: item.variantName,
            variantSku: item.variantSku || item.productSku,
          }
          : {}),
      })),
      notes: po.notes,
      paymentTerms: {
        isCredit: po.paymentTerms.isCredit,
        creditDays: creditDays,
        paymentMethods: allPaymentMethods,
        expectedCurrency: po.paymentTerms.expectedCurrency || 'USD',
        paymentDueDate: formatDateForApi(po.paymentTerms.paymentDueDate),
        requiresAdvancePayment: po.paymentTerms.requiresAdvancePayment,
        advancePaymentPercentage: po.paymentTerms.advancePaymentPercentage,
        advancePaymentAmount,
        remainingBalance,
      }
    };

    if (po.supplierId) {
      dto.supplierId = po.supplierId;
    } else {
      dto.newSupplierName = supplierNameTrimmed;
      dto.newSupplierRif = `${normalizedTaxType}-${rifDigits}`;
      dto.newSupplierContactName = contactNameTrimmed;
      dto.newSupplierContactPhone = contactPhoneTrimmed;
      dto.newSupplierContactEmail = contactEmailTrimmed || undefined;

      const addrCity = po.supplierAddress?.city?.trim();
      const addrState = po.supplierAddress?.state?.trim();
      const addrStreet = po.supplierAddress?.street?.trim();
      if (addrCity || addrState || addrStreet) {
        dto.newSupplierAddress = {
          city: addrCity || undefined,
          state: addrState || undefined,
          street: addrStreet || undefined,
        };
      }
      dto.newSupplierPaymentSettings = {
        acceptedPaymentMethods: allPaymentMethods,
        acceptsCredit: po.paymentTerms.isCredit,
        defaultCreditDays: creditDays,
        requiresAdvancePayment: po.paymentTerms.requiresAdvancePayment,
        advancePaymentPercentage: po.paymentTerms.advancePaymentPercentage
      };
    }

    try {
      const response = await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(dto) });
      const createdPo = response?.data || response;
      toast.success('Compra creada exitosamente');

      if (po.supplierId && allPaymentMethods.length > 0) {
        await syncPaymentMethodsToSupplier(po.supplierId, allPaymentMethods);
      }

      // Smart default: remember currency used for next purchase with this supplier
      if (po.supplierId && po.paymentTerms?.expectedCurrency) {
        saveLastCurrency(po.supplierId, po.paymentTerms.expectedCurrency);
      }

      // If editing an existing supplier, persist any field changes back to the supplier
      if (po.supplierId && originalSupplierRef.current?._id === po.supplierId) {
        await syncSupplierEdits(po, originalSupplierRef.current);
      }

      setIsNewPurchaseDialogOpen(false);

      // Simple mode (default): immediately open Receive+Rate dialog with the
      // just-created PO. Advanced mode users skip this and use Purchase History.
      const advancedMode = (() => {
        try { return localStorage.getItem('smartkubik_advanced_receive_mode') === 'true'; }
        catch { return false; }
      })();

      if (!advancedMode && createdPo?._id) {
        // Build a minimal PO object compatible with RatingModal's expectations
        setPoForReceiveRate({
          _id: createdPo._id,
          poNumber: createdPo.poNumber,
          supplierId: createdPo.supplierId,
          supplierName: createdPo.supplierName || po.supplierName,
          documentType: createdPo.documentType || po.documentType,
          items: createdPo.items || po.items,
          totalAmount: createdPo.totalAmount,
        });
        setIsReceiveRateOpen(true);
      }

      setPo(initialPoState);
      setSupplierNameInput('');
      setSupplierRifInput('');
      originalSupplierRef.current = null;
      fetchData();
    } catch (error) {
      toast.error('Error al crear la Compra', { description: error.message });
    } finally {
      setPoLoading(false);
    }
  };

  /**
   * Submits rating + receive in one atomic flow (mirrors PurchaseHistory's logic).
   * Called from the unified Receive+Rate dialog opened automatically after PO creation.
   */
  const handleReceiveAndRate = async (ratingData) => {
    try {
      await fetchApi('/ratings', { method: 'POST', body: JSON.stringify(ratingData) });
      await fetchApi(`/purchases/${ratingData.purchaseOrderId}/receive`, {
        method: 'PATCH',
        body: JSON.stringify({
          receivedBy: ratingData.receivedBy,
          invoiceDate: ratingData.invoiceDate,
        }),
      });
      toast.success('Compra recibida e inventario actualizado');
      setIsReceiveRateOpen(false);
      setPoForReceiveRate(null);
      fetchData();
    } catch (err) {
      toast.error('Error al procesar recepcion', { description: err.message });
    }
  };

  const handleSkipReceive = () => {
    setIsReceiveRateOpen(false);
    setPoForReceiveRate(null);
    toast.info('Puedes recibir esta compra desde el Historial cuando llegue la mercancia');
  };

  /**
   * Detects edits made to an existing supplier during PO creation and
   * persists them via PATCH /customers/:id. Non-blocking: failures are
   * logged but don't stop the PO flow.
   */
  const syncSupplierEdits = async (currentPo, snapshot) => {
    try {
      const updates = {};
      let needsUpdate = false;

      // Address: compare normalized strings
      const norm = (s) => (s || '').trim();
      const addrChanged =
        norm(currentPo.supplierAddress?.city) !== norm(snapshot.address.city) ||
        norm(currentPo.supplierAddress?.state) !== norm(snapshot.address.state) ||
        norm(currentPo.supplierAddress?.street) !== norm(snapshot.address.street);

      if (addrChanged) {
        // Preserve other addresses if any; replace the default one
        const other = (snapshot.addresses || []).filter(a => !a.isDefault && (snapshot.addresses.length > 1));
        const defaultAddr = (snapshot.addresses || []).find(a => a.isDefault) || snapshot.addresses?.[0] || {};
        updates.addresses = [
          {
            type: defaultAddr.type || 'billing',
            street: norm(currentPo.supplierAddress?.street) || undefined,
            city: norm(currentPo.supplierAddress?.city) || undefined,
            state: norm(currentPo.supplierAddress?.state) || undefined,
            isDefault: true,
          },
          ...other.map(a => ({
            type: a.type || 'billing',
            street: a.street,
            city: a.city,
            municipality: a.municipality,
            state: a.state,
            isDefault: false,
          })),
        ];
        needsUpdate = true;
      }

      // Contact phone/email: rebuild contacts array if anything changed
      const phoneChanged = norm(currentPo.contactPhone) !== norm(snapshot.contactPhone);
      const emailChanged = norm(currentPo.contactEmail) !== norm(snapshot.contactEmail);

      if (phoneChanged || emailChanged) {
        const contacts = [];
        const phone = norm(currentPo.contactPhone);
        const email = norm(currentPo.contactEmail);
        if (phone) contacts.push({ type: 'phone', value: phone, isPrimary: true });
        if (email) contacts.push({ type: 'email', value: email, isPrimary: !phone });

        // Preserve any other contact types (e.g., whatsapp) we don't manage here
        const preserved = (snapshot.contacts || []).filter(
          c => c.type !== 'phone' && c.type !== 'email'
        );
        updates.contacts = [...contacts, ...preserved];
        needsUpdate = true;
      }

      if (!needsUpdate) return;

      await fetchApi(`/customers/${snapshot._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      toast.info('Datos del proveedor actualizados');
    } catch (err) {
      // Non-blocking: PO is already created
      console.warn('Failed to sync supplier edits:', err);
    }
  };

  const handleCreatePoFromAlert = (alertItem) => {
    const productInfo = alertItem?.productId;
    if (!productInfo) return;

    const resolvedSku = alertItem.productSku;
    const variants = Array.isArray(productInfo.variants)
      ? productInfo.variants.filter(variant => variant && variant.isActive !== false)
      : [];
    const matchedVariant = variants.find(variant => variant?.sku === resolvedSku);
    const fallbackVariant = variants.length === 1 ? variants[0] : null;
    const variantToUse = matchedVariant || fallbackVariant || null;

    const costPrice = variantToUse?.costPrice ?? alertItem.lastCostPrice ?? 0;

    const newItem = {
      productId: productInfo._id,
      productName: productInfo.name || alertItem.productName,
      productSku: variantToUse?.sku || resolvedSku,
      variantId: variantToUse?._id,
      variantName: variantToUse?.name,
      variantSku: variantToUse?.sku || resolvedSku,
      quantity: 1,
      costPrice,
      isPerishable: productInfo.isPerishable,
      lotNumber: '',
      expirationDate: '',
    };

    setPo({ ...initialPoState, items: [newItem] });
    setSupplierNameInput('');
    setSupplierRifInput('');
    setIsNewPurchaseDialogOpen(true);
  };

  /**
   * Batch variant of handleCreatePoFromAlert: stuffs N alert items into a
   * single PO. If all items share the same preferred supplier (suppliers[0]),
   * the supplier section is pre-filled; otherwise it stays empty so the user
   * picks one (and all items end up under that single supplier — POs are
   * always one-supplier-only by design).
   */
  const handleCreatePoFromAlertBatch = (alertItems) => {
    if (!Array.isArray(alertItems) || alertItems.length === 0) return;

    const items = alertItems
      .map((alertItem) => {
        const productInfo = alertItem?.productId;
        if (!productInfo) return null;

        const resolvedSku = alertItem.productSku;
        const variants = Array.isArray(productInfo.variants)
          ? productInfo.variants.filter((v) => v && v.isActive !== false)
          : [];
        const matchedVariant = variants.find((v) => v?.sku === resolvedSku);
        const fallbackVariant = variants.length === 1 ? variants[0] : null;
        const variantToUse = matchedVariant || fallbackVariant || null;
        const costPrice = variantToUse?.costPrice ?? alertItem.lastCostPrice ?? 0;

        return {
          productId: productInfo._id,
          productName: productInfo.name || alertItem.productName,
          productSku: variantToUse?.sku || resolvedSku,
          variantId: variantToUse?._id,
          variantName: variantToUse?.name,
          variantSku: variantToUse?.sku || resolvedSku,
          quantity: 1,
          costPrice,
          isPerishable: productInfo.isPerishable,
          lotNumber: '',
          expirationDate: '',
        };
      })
      .filter(Boolean);

    if (items.length === 0) return;

    // Detect common preferred supplier across all items.
    const preferredSupplierIds = alertItems
      .map((a) => a?.productId?.suppliers?.[0]?.supplierId)
      .filter(Boolean)
      .map((id) => (typeof id === 'string' ? id : id?.toString?.()))
      .filter(Boolean);
    const allShareSupplier =
      preferredSupplierIds.length === items.length &&
      preferredSupplierIds.every((id) => id === preferredSupplierIds[0]);
    const commonSupplier = allShareSupplier
      ? suppliers.find((s) => s._id?.toString?.() === preferredSupplierIds[0])
      : null;

    if (commonSupplier) {
      const { taxType, rifNumber } = parseTaxId(
        commonSupplier.taxInfo?.taxId,
        commonSupplier.taxInfo?.taxType || 'J',
      );
      const addr =
        commonSupplier.addresses?.find((a) => a.isDefault) ||
        commonSupplier.addresses?.[0];
      setPo({
        ...initialPoState,
        items,
        supplierId: commonSupplier._id,
        supplierName: commonSupplier.companyName || commonSupplier.name,
        supplierRif: rifNumber,
        taxType,
        contactName: commonSupplier.contacts?.[0]?.name || commonSupplier.name || '',
        contactPhone:
          commonSupplier.contacts?.find((c) => c.type === 'phone')?.value || '',
        contactEmail:
          commonSupplier.contacts?.find((c) => c.type === 'email')?.value || '',
        supplierAddress: {
          city: addr?.city || '',
          state: addr?.state || '',
          street: addr?.street || '',
        },
      });
      setSupplierNameInput(commonSupplier.companyName || commonSupplier.name);
      setSupplierRifInput(rifNumber);
    } else {
      setPo({ ...initialPoState, items });
      setSupplierNameInput('');
      setSupplierRifInput('');
    }

    setIsNewPurchaseDialogOpen(true);
  };

  // Handle RIF dropdown supplier selection (for the custom dropdown in the PO dialog)
  const handleRifDropdownSelect = (s) => {
    console.log('🔍 DEBUG DROPDOWN - Supplier selected from RIF dropdown:', {
      _id: s._id,
      companyName: s.companyName,
      name: s.name,
      taxId: s.taxInfo?.taxId,
      fullSupplier: s,
    });

    const { taxType, rifNumber } = parseTaxId(
      s.taxInfo?.taxId,
      s.taxInfo?.taxType || 'J'
    );

    const supplierNameValue = s.companyName || s.name;
    console.log('🔍 DEBUG DROPDOWN - Will set supplierName to:', supplierNameValue);

    const rifAddr = s.addresses?.find(a => a.isDefault) || s.addresses?.[0];
    setSupplierRifInput(rifNumber);
    setRifDropdownOpen(false);
    setPo(prev => {
      const newState = {
        ...prev,
        supplierId: s._id,
        supplierName: supplierNameValue,
        supplierRif: rifNumber,
        taxType: taxType,
        contactName: s.contacts?.[0]?.name || s.name || '',
        contactPhone: s.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: s.contacts?.find(c => c.type === 'email')?.value || '',
        supplierAddress: {
          city: rifAddr?.city || '',
          state: rifAddr?.state || '',
          street: rifAddr?.street || '',
        },
      };
      console.log('🔍 DEBUG DROPDOWN - New state:', newState);
      return newState;
    });
    console.log('🔍 DEBUG DROPDOWN - Calling fetchSupplierPaymentMethods');
    fetchSupplierPaymentMethods(s._id);
  };

  return {
    // Loading / error
    loading,
    error,

    // Exchange rates
    usdRate,
    eurRate,

    // Alert data
    lowStockProducts,
    lowStockTotal,
    outOfStockTotal,
    expiringProducts,

    // New Product Dialog state
    isNewProductDialogOpen,
    setIsNewProductDialogOpen,
    newProduct,
    setNewProduct,
    selectedImageIndex,
    setSelectedImageIndex,
    additionalVariants,
    newProductTotals,

    // New Product Dialog handlers
    handleDragStart,
    handleDragOver,
    handleDrop,
    addAdditionalVariant,
    removeAdditionalVariant,
    updateAdditionalVariantField,
    handleSupplierSelectionForNewProduct,
    handleAddProduct,
    handleImageUpload,
    handleRemoveImage,

    // New Purchase Order Dialog state
    isNewPurchaseDialogOpen,
    setIsNewPurchaseDialogOpen,
    po,
    setPo,
    poLoading,
    poTotals,
    supplierNameInput,
    supplierRifInput,
    rifDropdownOpen,
    setRifDropdownOpen,
    purchaseDateOpen,
    setPurchaseDateOpen,
    paymentDueDateOpen,
    setPaymentDueDateOpen,
    rifInputRef,
    rifDropdownRef,

    // New Purchase Order Dialog handlers
    handleSupplierSelection,
    handleRifSelection,
    handleSupplierNameInputChange,
    handleSupplierRifInputChange,
    handleFieldChange,
    handleProductSelection,
    updateItemField,
    handleRemoveItemFromPo,
    handlePoSubmit,
    handleActualPaymentMethodChange,
    handleCreatePoFromAlert,
    handleCreatePoFromAlertBatch,
    handleRifDropdownSelect,

    // Auto receive + rate flow (simple mode default)
    poForReceiveRate,
    isReceiveRateOpen,
    setIsReceiveRateOpen,
    handleReceiveAndRate,
    handleSkipReceive,

    // Variant selection
    variantSelection,
    closeVariantSelection,
    updateVariantSelectionRow,
    confirmVariantSelection,

    // Unit selection (multi-unit products)
    unitSelection,
    openUnitSelection,
    closeUnitSelection,
    selectUnit,

    // Invoice scanning
    isScanning,
    scanResult,
    invoiceFileRef,
    invoiceFileRef2,
    handleScanInvoice,
    handleClearScan,

    // Supplier options
    supplierNameOptions,
    supplierRifOptions,
    supplierOptions,
    rifSuggestions,
    loadSupplierOptions,
    loadProductOptions,
    formatRifInput,

    // Vertical config computed values
    getPlaceholder,
    unitOptions,
    supportsVariants,
    allowsWeight,
    isNonFoodRetailVertical,
    ingredientLabel,
    variantSectionDescription,
    showLotFields,
    showExpirationFields,

    // Inline product creation (unified flow popup)
    isInlineProductDialogOpen,
    inlineProductInitialQuery,
    inlineProductLoading,
    pendingProductDraft,
    openInlineProductDialog,
    closeInlineProductDialog,
    persistPendingProductDraft,
    createInlineProduct,

    // Misc
    fetchData,
    initialPoState,
    initialNewProductState,
  };
}
