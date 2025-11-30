import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { fetchApi } from '@/lib/api';
import { AlertTriangle, Clock, PlusCircle, Trash2, CalendarIcon, Package, XCircle, Plus } from 'lucide-react';
import PurchaseHistory from './PurchaseHistory.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { SearchableSelect } from './orders/v2/custom/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox.jsx';

const initialNewProductState = {
  sku: '',
  name: '',
  category: '',
  subcategory: '',
  brand: '',
  description: '',
  ingredients: '',
  isPerishable: false,
  shelfLifeDays: 0,
  storageTemperature: 'ambiente',
  ivaApplicable: true,
  taxCategory: 'general',
  isSoldByWeight: false,
  unitOfMeasure: 'unidad',
  variant: {
    name: 'Estándar',
    unit: 'unidad',
    unitSize: 1,
    basePrice: 0,
    costPrice: 0,
    images: []
  },
  inventory: {
    quantity: 1,
    costPrice: 0,
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
    rifPrefix: 'J',
  }
};

const initialPoState = {
  supplierId: '',
  supplierName: '',
  supplierRif: '',
  taxType: 'J',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  purchaseDate: new Date(),
  items: [],
  notes: '',
  paymentTerms: {
    isCredit: false,
    paymentDueDate: null,
    paymentMethods: [],
    customPaymentMethod: '',
    requiresAdvancePayment: false,
    advancePaymentPercentage: 0,
  }
};

export default function ComprasManagement() {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for New Product Dialog
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProductState);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const dragImageIndex = useRef(null);

  // State for New Purchase Order Dialog
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [po, setPo] = useState(initialPoState);
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [supplierRifInput, setSupplierRifInput] = useState('');
  const [variantSelection, setVariantSelection] = useState(null);
  const [additionalVariants, setAdditionalVariants] = useState([]);

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
    if (!verticalConfig) {
      return false;
    }
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [lowStockData, expiringData, suppliersData, productsData] = await Promise.all([
        fetchApi('/inventory/alerts/low-stock'),
        fetchApi('/inventory/alerts/near-expiration?days=30'),
        fetchApi('/customers?customerType=supplier'),
        fetchApi('/products')
      ]);
      setLowStockProducts(lowStockData.data || []);
      setExpiringProducts(expiringData.data || []);
      setSuppliers(suppliersData.data || []);
      setProducts(productsData.data || []);

    } catch (err) {
      setError(err.message);
      setLowStockProducts([]);
      setExpiringProducts([]);
      setSuppliers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (!isNewProductDialogOpen) {
      return;
    }
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
      inventory: {
        ...initialNewProductState.inventory,
      },
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
      if (!prev[index]) {
        return prev;
      }
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
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
        }
      }));
    }
  };

  const handleAddProduct = async () => {
    const normalizedSku = (newProduct.sku || '').trim();
    const baseCost = Number(newProduct.inventory.costPrice) || 0;

    const buildVariantPayload = (variant, index) => {
      if (!variant) return null;
      const trimmedName = (variant.name || '').trim();
      const fallbackName = index === 1 ? 'Estándar' : `Variante ${index}`;
      const name = trimmedName !== '' ? trimmedName : fallbackName;

      const normalizedVariantSku = (variant.sku || '').trim();
      const generatedSku =
        normalizedVariantSku !== ''
          ? normalizedVariantSku
          : `${normalizedSku || 'SKU'}-VAR${index}`;

      const normalizedBarcode = (variant.barcode || '').trim();
      const barcode = normalizedBarcode !== '' ? normalizedBarcode : generatedSku;

      const unit =
        (variant.unit || '').trim() ||
        newProduct.unitOfMeasure ||
        unitOptions[0] ||
        'unidad';

      const unitSize = Number(variant.unitSize) || 1;
      const basePrice = Number(variant.basePrice) || 0;
      const resolvedCost =
        variant.costPrice !== undefined && variant.costPrice !== ''
          ? Number(variant.costPrice)
          : baseCost;
      const costPrice = Number.isFinite(resolvedCost) && resolvedCost >= 0 ? resolvedCost : 0;

      return {
        name,
        sku: generatedSku,
        barcode,
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
        costPrice:
          newProduct.variant.costPrice !== undefined && newProduct.variant.costPrice !== ''
            ? newProduct.variant.costPrice
            : baseCost,
      },
      1,
    );

    const extraVariants = supportsVariants
      ? additionalVariants
          .map((variant, index) => buildVariantPayload(variant, index + 2))
          .filter(Boolean)
      : [];

    const variantsPayload = [primaryVariant, ...extraVariants].filter(Boolean);

    const isPerishable = !isNonFoodRetailVertical && newProduct.isPerishable;

    const inventoryConfig = {
      trackLots: showLotFields,
      trackExpiration: showExpirationFields && isPerishable,
      minimumStock: 10,
      maximumStock: 100,
      reorderPoint: 20,
      reorderQuantity: 50,
      fefoEnabled: showExpirationFields && isPerishable,
    };

    const productPayload = {
      sku: normalizedSku,
      name: newProduct.name,
      category: newProduct.category,
      subcategory: newProduct.subcategory,
      brand: newProduct.brand,
      description: newProduct.description,
      ingredients: newProduct.ingredients,
      isPerishable,
      shelfLifeDays: isPerishable ? Number(newProduct.shelfLifeDays) || 0 : undefined,
      storageTemperature: isPerishable ? newProduct.storageTemperature : undefined,
      ivaApplicable: newProduct.ivaApplicable,
      taxCategory: newProduct.taxCategory,
      isSoldByWeight: allowsWeight ? newProduct.isSoldByWeight : false,
      unitOfMeasure: newProduct.unitOfMeasure,
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 0.2,
        maximumDiscount: 0.5,
      },
      inventoryConfig,
      variants: variantsPayload,
    };

    if (!isPerishable) {
      delete productPayload.shelfLifeDays;
      delete productPayload.storageTemperature;
    }

    const inventoryPayload = {
      quantity: Number(newProduct.inventory.quantity) || 0,
      costPrice: baseCost,
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
    };

    if (supplierPayload.supplierId) {
      delete supplierPayload.newSupplierName;
      delete supplierPayload.newSupplierContactName;
      delete supplierPayload.newSupplierContactPhone;
    } else {
      const rifNumber = (newProduct.supplier.newSupplierRif || '').trim();
      supplierPayload.newSupplierRif = `${newProduct.supplier.rifPrefix}-${rifNumber}`;
    }

    const payload = {
      product: productPayload,
      supplier: supplierPayload,
      inventory: inventoryPayload,
      purchaseDate: new Date().toISOString(),
      notes: 'Creación de producto con compra inicial.',
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

  // --- Handlers for New Purchase Order Dialog ---
  const handleSupplierSelection = (selectedOption) => {
    if (!selectedOption) {
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
      }));
      return;
    }
    if (selectedOption.__isNew__) {
      setSupplierNameInput('');
      setPo(prev => ({ ...prev, supplierId: '', supplierName: selectedOption.label }));
    } else {
      setSupplierNameInput('');
      const { customer } = selectedOption;
      // Extract tax type and RIF number from taxId (format: "J-12345678")
      const fullRif = customer.taxInfo?.taxId || '';
      const [taxType, ...rifParts] = fullRif.split('-');
      const rifNumber = rifParts.join('').replace(/[^0-9]/g, '');

      const normalizedTaxType =
        (taxType || customer.taxInfo?.taxType || 'J').toUpperCase();
      setPo(prev => ({
        ...prev,
        supplierId: customer._id,
        supplierName: customer.companyName || customer.name,
        supplierRif: rifNumber,
        taxType: normalizedTaxType,
        contactName: customer.contacts?.[0]?.name || customer.name || '',
        contactPhone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: customer.contacts?.find(c => c.type === 'email')?.value || '',
      }));
    }
  };

  const handleRifSelection = (selectedOption) => {
    if (!selectedOption) {
      setSupplierRifInput('');
      setPo(prev => ({
        ...prev,
        supplierId: '',
        supplierName: '',
        supplierRif: '',
        taxType: 'J',
      }));
      return;
    }
    if (selectedOption.__isNew__) {
      const [type, ...rifParts] = selectedOption.label.split('-');
      setSupplierRifInput('');
      const cleanRif = rifParts.join('').replace(/[^0-9]/g, '');
      setPo(prev => {
        const normalizedTaxType = (type || prev.taxType || 'J').toUpperCase();
        return {
          ...prev,
          supplierId: '',
          supplierName: '',
          taxType: normalizedTaxType,
          supplierRif: cleanRif,
        };
      });
    } else {
      setSupplierRifInput('');
      const { customer } = selectedOption;
      // Extract tax type and RIF number from taxId (format: "J-12345678")
      const fullRif = customer.taxInfo?.taxId || '';
      const [taxType, ...rifParts] = fullRif.split('-');
      const rifNumber = rifParts.join('').replace(/[^0-9]/g, '');

      setPo(prev => ({
        ...prev,
        supplierId: customer._id,
        supplierName: customer.companyName || customer.name,
        supplierRif: rifNumber,
        taxType: (taxType || customer.taxInfo?.taxType || 'J').toUpperCase(),
        contactName: customer.contacts?.[0]?.name || customer.name || '',
        contactPhone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
        contactEmail: customer.contacts?.find(c => c.type === 'email')?.value || '',
      }));
    }
  };

  const handleSupplierNameInputChange = (inputValue = '', actionMeta) => {
    if (actionMeta?.action === 'clear-input') {
      setSupplierNameInput('');
      return;
    }

    if (actionMeta?.action && actionMeta.action !== 'input-change') {
      return;
    }

    setSupplierNameInput(inputValue);

    if (inputValue) {
      setPo(prev => ({
        ...prev,
        supplierId: '',
        supplierName: inputValue,
      }));
    }
  };

  const handleSupplierRifInputChange = (inputValue = '', actionMeta) => {
    if (actionMeta?.action === 'clear-input') {
      setSupplierRifInput('');
      return;
    }

    if (actionMeta?.action && actionMeta.action !== 'input-change') {
      return;
    }

    const sanitized = inputValue.replace(/\s+/g, '').toUpperCase();
    setSupplierRifInput(sanitized);

    setPo(prev => {
      if (!sanitized) {
        return {
          ...prev,
          supplierId: '',
          supplierRif: '',
          taxType: prev.taxType || 'J',
        };
      }

      let taxType = prev.taxType || 'J';
      let rifNumber = sanitized;

      const dashParts = sanitized.split('-').filter(Boolean);
      if (dashParts.length > 1 && /^[JVEGPN]$/.test(dashParts[0])) {
        taxType = dashParts[0];
        rifNumber = dashParts.slice(1).join('-');
      } else if (/^[JVEGPN]\d/.test(sanitized)) {
        taxType = sanitized.charAt(0);
        rifNumber = sanitized.slice(1);
      }

      rifNumber = rifNumber.replace(/[^0-9]/g, '');

      return {
        ...prev,
        supplierId: '',
        supplierRif: rifNumber,
        taxType,
      };
    });
  };

  const handleFieldChange = (field, value) => {
    setPo(prev => ({ ...prev, [field]: value }));
  };

  const supplierNameOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s._id,
      label: s.companyName || s.name,
      customer: s,
    })),[suppliers]);

  const supplierRifOptions = useMemo(() => {
    const options = suppliers
      .filter(s => s.taxInfo?.taxId)
      .map(s => ({
        value: s._id,
        label: s.taxInfo.taxId,
        customer: s,
      }));
    return options;
  }, [suppliers]);

  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s._id,
      label: s.companyName || s.name,
      supplier: s,
    })),[suppliers]);

  const productOptions = useMemo(() => 
    products.map(p => ({ 
      value: p._id, 
      label: `${p.name} (${p.sku || 'N/A'})`, 
      product: p 
    })), 
  [products]);

  const normalizeId = useCallback((value) => {
    if (value === undefined || value === null) return null;
    return value.toString();
  }, []);

  const upsertPurchaseItem = useCallback((product, variant, quantity, costPrice) => {
    if (!product || !quantity || Number.isNaN(quantity) || quantity <= 0) {
      return;
    }

    const productId = normalizeId(product._id);
    const variantId = variant ? normalizeId(variant._id) : null;
    const resolvedCost = Number.isFinite(costPrice) ? costPrice : 0;

    setPo(prev => {
      const items = [...prev.items];
      const matchIndex = items.findIndex(item =>
        normalizeId(item.productId) === productId &&
        normalizeId(item.variantId) === variantId
      );

      if (matchIndex !== -1) {
        const existing = items[matchIndex];
        const existingQty = Number(existing.quantity) || 0;
        items[matchIndex] = {
          ...existing,
          quantity: existingQty + quantity,
          costPrice: resolvedCost,
        };
      } else {
        items.push({
          productId,
          productName: product.name,
          productSku: variant?.sku || product.sku,
          variantId: variantId || undefined,
          variantName: variant?.name,
          variantSku: variant?.sku,
          quantity,
          costPrice: resolvedCost,
          isPerishable: product.isPerishable,
          lotNumber: '',
          expirationDate: '',
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
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        return;
      }
      hasValidQuantity = true;
      const costValue = Number(
        row.costPrice !== '' ? row.costPrice : row.variant?.costPrice ?? 0
      );
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
    setPo({ ...po, items: newItems });
  };

  const handlePoSubmit = async () => {
    const supplierNameTrimmed = po.supplierName?.trim() || '';
    const supplierRifTrimmed = po.supplierRif?.toString().trim() || '';
    const contactNameTrimmed = po.contactName?.trim() || '';
    const contactPhoneTrimmed = po.contactPhone?.trim() || '';
    const contactEmailTrimmed = po.contactEmail?.trim() || '';

    const missingFields = [
      { label: 'Nombre de la Empresa', value: supplierNameTrimmed },
      { label: 'RIF', value: supplierRifTrimmed },
      { label: 'Nombre del Contacto', value: contactNameTrimmed },
    ].filter(field => !field.value);

    if (missingFields.length > 0) {
      const fieldsList = missingFields.map(field => field.label).join(', ');
      toast.error('Error de Validación', { description: `Falta completar: ${fieldsList}.` });
      return;
    }

    const normalizedTaxType = (po.taxType || 'J').toUpperCase();
    const rifDigits = supplierRifTrimmed.replace(/[^0-9]/g, '');

    if (!po.supplierId) {
      const rifForValidation = `${normalizedTaxType}-${rifDigits}`;
      const rifRegex = /^[JVEGPN]-?[0-9]{8,9}$/;
      if (!rifDigits || !rifRegex.test(rifForValidation)) {
        toast.error('Error de Validación', { description: 'El RIF del nuevo proveedor no es válido.' });
        return;
      }
    }

    if (po.items.length === 0) {
        toast.error('Error de Validación', { description: 'Debe agregar al menos un producto a la orden.' });
        return;
    }

    setPoLoading(true);

    // Calculate total amount for advance payment
    const totalAmount = po.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice)), 0);
    const advancePaymentAmount = po.paymentTerms.requiresAdvancePayment
      ? (totalAmount * (po.paymentTerms.advancePaymentPercentage / 100))
      : 0;
    const remainingBalance = totalAmount - advancePaymentAmount;

    // Build payment methods array
    const allPaymentMethods = [...po.paymentTerms.paymentMethods];
    if (po.paymentTerms.customPaymentMethod.trim()) {
      allPaymentMethods.push(po.paymentTerms.customPaymentMethod.trim());
    }

    // Calculate credit days if payment due date is set
    let creditDays = 0;
    if (po.paymentTerms.isCredit && po.paymentTerms.paymentDueDate) {
      const purchaseDate = new Date(po.purchaseDate);
      const dueDate = new Date(po.paymentTerms.paymentDueDate);
      creditDays = Math.ceil((dueDate - purchaseDate) / (1000 * 60 * 60 * 24));
    }

    const dto = {
      purchaseDate: format(po.purchaseDate, 'yyyy-MM-dd'),
      items: po.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.costPrice) || 0,
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
        paymentDueDate: po.paymentTerms.paymentDueDate ? format(po.paymentTerms.paymentDueDate, 'yyyy-MM-dd') : undefined,
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
    }

    try {
      await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(dto) });
      toast.success('Orden de Compra creada exitosamente');
      setIsNewPurchaseDialogOpen(false);
      setPo(initialPoState);
      setSupplierNameInput('');
      setSupplierRifInput('');
      fetchData();
    } catch (error) {
      toast.error('Error al crear la Orden de Compra', { description: error.message });
    } finally {
      setPoLoading(false);
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

    const costPrice =
      variantToUse?.costPrice ??
      alertItem.lastCostPrice ??
      0;

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

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-start items-center gap-4">
            <Dialog
              open={isNewPurchaseDialogOpen}
              onOpenChange={(isOpen) => {
                setIsNewPurchaseDialogOpen(isOpen);
                if (!isOpen) {
                  setPo(initialPoState);
                  setSupplierNameInput('');
                  setSupplierRifInput('');
                }
              }}
            >
                <DialogTrigger asChild>
                    <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto"><PlusCircle className="mr-2 h-5 w-5" /> Añadir Inventario</Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle><DialogDescription>Crea una nueva orden de compra para reabastecer tu inventario.</DialogDescription></DialogHeader>

                    <div className="space-y-6 p-1 overflow-y-auto flex-1">
                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="text-lg font-semibold">Proveedor</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>RIF del Proveedor</Label>
                                    <SearchableSelect
                                        isCreatable
                                        options={supplierRifOptions}
                                        onSelection={handleRifSelection}
                                        onInputChange={handleSupplierRifInputChange}
                                        inputValue={supplierRifInput}
                                        value={po.supplierRif ? { value: po.supplierId || po.supplierRif, label: `${po.taxType}-${po.supplierRif}` } : null}
                                        placeholder="Escriba o seleccione un RIF..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nombre o Razón Social</Label>
                                    <SearchableSelect
                                        isCreatable
                                        options={supplierNameOptions}
                                        onSelection={handleSupplierSelection}
                                        onInputChange={handleSupplierNameInputChange}
                                        inputValue={supplierNameInput}
                                        value={po.supplierId ? { value: po.supplierId, label: po.supplierName } : po.supplierName ? { value: po.supplierName, label: po.supplierName } : null}
                                        placeholder="Escriba o seleccione un proveedor..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nombre del Contacto</Label>
                                    <Input value={po.contactName} onChange={e => handleFieldChange('contactName', e.target.value)} />
                                </div>
                                <div className="space-y-2"><Label>Teléfono del Contacto</Label><Input value={po.contactPhone} onChange={e => handleFieldChange('contactPhone', e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="text-lg font-semibold">Términos de Pago</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="isCredit"
                                        checked={po.paymentTerms.isCredit}
                                        onCheckedChange={(checked) => setPo(prev => ({
                                            ...prev,
                                            paymentTerms: { ...prev.paymentTerms, isCredit: checked, paymentDueDate: checked ? prev.paymentTerms.paymentDueDate : null }
                                        }))}
                                    />
                                    <Label htmlFor="isCredit">¿Acepta crédito?</Label>
                                </div>
                                {po.paymentTerms.isCredit && (
                                    <div className="space-y-2">
                                        <Label>Fecha de Vencimiento del Pago</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {po.paymentTerms.paymentDueDate ? format(po.paymentTerms.paymentDueDate, "PPP") : <span>Selecciona fecha de pago</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={po.paymentTerms.paymentDueDate}
                                                    onSelect={(date) => setPo(prev => ({
                                                        ...prev,
                                                        paymentTerms: { ...prev.paymentTerms, paymentDueDate: date }
                                                    }))}
                                                    disabled={(date) => date < po.purchaseDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                                <div className="col-span-2 space-y-2">
                                    <Label>Métodos de Pago Aceptados (selecciona uno o varios)</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                                        {[
                                            { value: 'efectivo', label: 'Efectivo' },
                                            { value: 'transferencia', label: 'Transferencia Bancaria' },
                                            { value: 'pago_movil', label: 'Pago Móvil' },
                                            { value: 'pos', label: 'Punto de Venta' },
                                            { value: 'zelle', label: 'Zelle' },
                                            { value: 'binance', label: 'Binance' },
                                            { value: 'paypal', label: 'PayPal' },
                                        ].map(method => (
                                            <div key={method.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`payment-${method.value}`}
                                                    checked={po.paymentTerms.paymentMethods.includes(method.value)}
                                                    onCheckedChange={(checked) => {
                                                        setPo(prev => ({
                                                            ...prev,
                                                            paymentTerms: {
                                                                ...prev.paymentTerms,
                                                                paymentMethods: checked
                                                                    ? [...prev.paymentTerms.paymentMethods, method.value]
                                                                    : prev.paymentTerms.paymentMethods.filter(m => m !== method.value)
                                                            }
                                                        }));
                                                    }}
                                                />
                                                <Label htmlFor={`payment-${method.value}`} className="text-sm font-normal cursor-pointer">{method.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Método de Pago Personalizado (opcional)</Label>
                                    <Input
                                        value={po.paymentTerms.customPaymentMethod}
                                        onChange={e => setPo(prev => ({
                                            ...prev,
                                            paymentTerms: { ...prev.paymentTerms, customPaymentMethod: e.target.value }
                                        }))}
                                        placeholder="Ej: Cripto, Bitcoin, USDT, etc."
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="requiresAdvancePayment"
                                        checked={po.paymentTerms.requiresAdvancePayment}
                                        onCheckedChange={(checked) => setPo(prev => ({
                                            ...prev,
                                            paymentTerms: { ...prev.paymentTerms, requiresAdvancePayment: checked }
                                        }))}
                                    />
                                    <Label htmlFor="requiresAdvancePayment">¿Requiere adelanto?</Label>
                                </div>
                                {po.paymentTerms.requiresAdvancePayment && (
                                    <div className="space-y-2">
                                        <Label>Porcentaje de Adelanto (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={po.paymentTerms.advancePaymentPercentage}
                                            onChange={e => setPo(prev => ({
                                                ...prev,
                                                paymentTerms: { ...prev.paymentTerms, advancePaymentPercentage: Number(e.target.value) }
                                            }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="text-lg font-semibold">Ítems de la Compra</h3>
                            <div className="space-y-2">
                                <Label>Buscar Producto para Agregar</Label>
                                <SearchableSelect
                                    options={productOptions}
                                    onSelection={handleProductSelection}
                                    value={null} // Always clear after selection
                                    placeholder={loading ? "Cargando productos..." : "Buscar y añadir producto..."}
                                    isDisabled={loading}
                                />
                            </div>
                            <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Producto / Variante</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Costo Unit.</TableHead>
                                    <TableHead>Nro. Lote</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item, index) => (
                                    <TableRow key={`${item.productId}-${item.variantId || 'base'}-${index}`}>
                                        <TableCell>
                                          <div className="font-medium">{item.productName}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.variantName
                                              ? `${item.variantName} · ${item.productSku}`
                                              : item.productSku}
                                          </div>
                                        </TableCell>
                                        <TableCell><Input type="number" value={item.quantity} onChange={e => updateItemField(index, 'quantity', e.target.value)} className="w-24" /></TableCell>
                                        <TableCell><Input type="number" value={item.costPrice} onChange={e => updateItemField(index, 'costPrice', e.target.value)} className="w-32" /></TableCell>
                                        <TableCell>{item.isPerishable && <Input placeholder="Nro. Lote" className="w-32" value={item.lotNumber} onChange={e => updateItemField(index, 'lotNumber', e.target.value)} />}</TableCell>
                                        <TableCell>{item.isPerishable && <Input type="date" className="w-40" value={item.expirationDate} onChange={e => updateItemField(index, 'expirationDate', e.target.value)} />}</TableCell>
                                        <TableCell>${(Number(item.quantity) * Number(item.costPrice)).toFixed(2)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromPo(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha de Compra</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{po.purchaseDate ? format(po.purchaseDate, "PPP") : <span>Selecciona una fecha</span>}</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={po.purchaseDate} onSelect={(date) => setPo(prev => ({...prev, purchaseDate: date}))} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2"><Label>Notas</Label><Textarea value={po.notes} onChange={e => setPo(prev => ({...prev, notes: e.target.value}))} /></div>
                        </div>
                    </div>

                    <DialogFooter className="flex-shrink-0">
                        <Button variant="outline" onClick={() => setIsNewPurchaseDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePoSubmit} disabled={poLoading}>{poLoading ? 'Creando...' : 'Crear Orden de Compra'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
                <DialogTrigger asChild>
                <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto"><PlusCircle className="mr-2 h-5 w-5" /> Compra de Producto Nuevo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>Agregar Nuevo Producto con Inventario</DialogTitle>
                    <DialogDescription>Completa la información para crear un nuevo producto y su inventario inicial.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 px-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                    <div className="md:col-span-1 space-y-2">
                        <Label>Imágenes (máx. 3)</Label>
                        <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50">
                        {newProduct.variant.images && newProduct.variant.images.length > 0 ? (
                            <img src={newProduct.variant.images[selectedImageIndex]} alt={`product-image-${selectedImageIndex}`} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                            <div className="text-center">
                            <Package className="mx-auto h-8 w-8" />
                            <p className="mt-1 text-sm">Subir imágenes</p>
                            </div>
                        )}
                        </label>
                        <Input id="images" type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <div className="w-full border rounded-lg p-2 mt-2">
                            <div className="flex gap-2 justify-center">
                                {newProduct.variant.images && newProduct.variant.images.map((image, index) => (
                                <div 
                                    key={image}
                                    className="relative"
                                    draggable="true"
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(index)}
                                >
                                    {index === 0 && (
                                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" variant="secondary">
                                        Portada
                                    </Badge>
                                    )}
                                    <img 
                                    src={image} 
                                    alt={`product-thumb-${index}`} 
                                    className={`w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 ${selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                    />
                                    <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full z-10" 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                    >
                                    <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                                ))}
                                {newProduct.variant.images && newProduct.variant.images.length > 0 && newProduct.variant.images.length < 3 && (
                                <label htmlFor="images" className="cursor-pointer flex items-center justify-center w-14 h-14 border-2 border-dashed rounded text-muted-foreground hover:bg-muted/50">
                                    <Plus className="h-8 w-8" />
                                </label>
                                )}
                            </div>
                        </div>
                        {newProduct.variant.images.length >= 2 && (
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Arrastra para organizar la portada.
                            </p>
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Producto</Label>
                        <Input
                          id="name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder={getPlaceholder('productName', 'Ej: Arroz Blanco')}
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="brand">Marca</Label>
                        <Input
                          id="brand"
                          value={newProduct.brand}
                          onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                          placeholder={getPlaceholder('brand', 'Ej: Diana')}
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="sku">SKU Principal</Label>
                        <Input
                          id="sku"
                          value={newProduct.sku}
                          onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                          placeholder={getPlaceholder('sku', 'Ej: ARR-BLANCO')}
                        />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="barcode">Código de Barras (UPC)</Label>
                          <Input
                            id="barcode"
                            value={newProduct.variant.barcode}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                variant: { ...newProduct.variant, barcode: e.target.value },
                              })
                            }
                            placeholder={getPlaceholder('barcode', 'Ej: 7591234567890')}
                          />
                        </div>
                    </div>
                    </div>

                    {supportsVariants && (
                      <div className="col-span-2 border-t pt-4 mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-base font-medium">Variantes adicionales</h5>
                            <p className="text-sm text-muted-foreground">{variantSectionDescription}</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addAdditionalVariant}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar variante
                          </Button>
                        </div>
                        {additionalVariants.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            El producto usará únicamente la variante principal hasta que agregues más opciones.
                          </p>
                        ) : (
                          additionalVariants.map((variant, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <h6 className="font-medium">Variante {index + 2}</h6>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAdditionalVariant(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar variante</span>
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Nombre</Label>
                                  <Input
                                    value={variant.name}
                                    onChange={(e) => updateAdditionalVariantField(index, 'name', e.target.value)}
                                    placeholder={getPlaceholder('variantAdditionalName', 'Ej: Talla M / Color Azul')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>SKU</Label>
                                  <Input
                                    value={variant.sku}
                                    onChange={(e) => updateAdditionalVariantField(index, 'sku', e.target.value)}
                                    placeholder={getPlaceholder('variantAdditionalSku', `Ej: ${newProduct.sku || 'SKU'}-VAR${index + 2}`)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Código de barras</Label>
                                  <Input
                                    value={variant.barcode}
                                    onChange={(e) => updateAdditionalVariantField(index, 'barcode', e.target.value)}
                                    placeholder="Opcional"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Unidad</Label>
                                  <Input
                                    value={variant.unit || ''}
                                    onChange={(e) => updateAdditionalVariantField(index, 'unit', e.target.value)}
                                    placeholder={getPlaceholder('variantUnit', 'Ej: unidad')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Tamaño unidad</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.unitSize ?? ''}
                                    onChange={(e) => updateAdditionalVariantField(index, 'unitSize', e.target.value)}
                                    placeholder="1"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Precio costo ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.costPrice ?? ''}
                                    onChange={(e) => updateAdditionalVariantField(index, 'costPrice', e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Precio venta ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.basePrice ?? ''}
                                    onChange={(e) => updateAdditionalVariantField(index, 'basePrice', e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t">
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Input
                          id="category"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                          placeholder={getPlaceholder('category', 'Ej: Bebidas')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subcategory">Sub-categoría</Label>
                        <Input
                          id="subcategory"
                          value={newProduct.subcategory}
                          onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                          placeholder={getPlaceholder('subcategory', 'Ej: Gaseosas')}
                        />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          placeholder={getPlaceholder('description', 'Descripción detallada del producto')}
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="ingredients">{ingredientLabel}</Label>
                        <Textarea
                          id="ingredients"
                          value={newProduct.ingredients}
                          onChange={(e) => setNewProduct({...newProduct, ingredients: e.target.value})}
                          placeholder={
                            isNonFoodRetailVertical
                              ? 'Describe la composición del producto'
                              : 'Lista de ingredientes'
                          }
                        />
                    </div>
                    {!isNonFoodRetailVertical && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="isPerishable"
                          checked={newProduct.isPerishable}
                          onCheckedChange={(checked) => setNewProduct({...newProduct, isPerishable: checked})}
                        />
                        <Label htmlFor="isPerishable">Es Perecedero</Label>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="ivaApplicable" checked={!newProduct.ivaApplicable} onCheckedChange={(checked) => setNewProduct({...newProduct, ivaApplicable: !checked})} />
                        <Label htmlFor="ivaApplicable">Exento de IVA</Label>
                    </div>
                    {allowsWeight && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="isSoldByWeight"
                          checked={newProduct.isSoldByWeight}
                          onCheckedChange={(checked) => setNewProduct({...newProduct, isSoldByWeight: checked})}
                        />
                        <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
                      </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="unitOfMeasure">Unidad de Medida</Label>
                        <Select
                          value={newProduct.unitOfMeasure}
                          onValueChange={(value) =>
                            setNewProduct((prev) => ({
                              ...prev,
                              unitOfMeasure: value,
                              variant: { ...prev.variant, unit: value },
                            }))
                          }
                        >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {unitOptions.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    {!isNonFoodRetailVertical && newProduct.isPerishable && (
                        <>
                        <div className="space-y-2">
                            <Label htmlFor="shelfLifeDays">Vida Útil (días)</Label>
                            <Input id="shelfLifeDays" type="number" value={newProduct.shelfLifeDays} onChange={(e) => setNewProduct({...newProduct, shelfLifeDays: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="storageTemperature">Temperatura de Almacenamiento</Label>
                            <Select value={newProduct.storageTemperature} onValueChange={(value) => setNewProduct({...newProduct, storageTemperature: value})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una temperatura" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ambiente">Ambiente</SelectItem>
                                <SelectItem value="refrigerado">Refrigerado</SelectItem>
                                <SelectItem value="congelado">Congelado</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        </>
                    )}
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Variante Inicial (Requerida)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="variantName">Nombre Variante</Label>
                        <Input
                          id="variantName"
                          value={newProduct.variant.name}
                          onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, name: e.target.value}})}
                          placeholder={getPlaceholder('variantName', 'Ej: 1kg')}
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantUnit">Unidad</Label>
                        <Input
                          id="variantUnit"
                          value={newProduct.variant.unit}
                          onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, unit: e.target.value}})}
                          placeholder={getPlaceholder('variantUnit', 'Ej: kg, unidad')}
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantUnitSize">Tamaño Unidad</Label>
                        <Input
                          id="variantUnitSize"
                          type="number"
                          step="0.01"
                          value={newProduct.variant.unitSize}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              variant: {
                                ...newProduct.variant,
                                unitSize: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantBasePrice">Precio de Venta ($)</Label>
                        <Input
                          id="variantBasePrice"
                          type="number"
                          value={newProduct.variant.basePrice}
                          onFocus={() => {
                            if (newProduct.variant.basePrice === 0) {
                              setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: ''}});
                            }
                          }}
                          onChange={(e) => {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: e.target.value }});
                          }}
                          onBlur={() => {
                            const price = parseFloat(newProduct.variant.basePrice);
                            if (isNaN(price) || newProduct.variant.basePrice === '') {
                              setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: 0}});
                            } else {
                              setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: price}});
                            }
                          }}
                        />
                        </div>
                    </div>
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Inventario Inicial</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="invQuantity">Cantidad Inicial</Label>
                        <Input id="invQuantity" type="number" value={newProduct.inventory.quantity} onChange={(e) => setNewProduct({...newProduct, inventory: {...newProduct.inventory, quantity: parseInt(e.target.value) || 0}})} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="invCostPrice">Precio Costo ($)</Label>
                        <Input
                          id="invCostPrice"
                          type="number"
                          value={newProduct.inventory.costPrice}
                          onFocus={() => {
                            if (newProduct.inventory.costPrice === 0) {
                              setNewProduct({...newProduct, inventory: {...newProduct.inventory, costPrice: ''}});
                            }
                          }}
                          onChange={(e) => {
                            setNewProduct({...newProduct, inventory: {...newProduct.inventory, costPrice: e.target.value }});
                          }}
                          onBlur={() => {
                            const price = parseFloat(newProduct.inventory.costPrice);
                            if (isNaN(price) || newProduct.inventory.costPrice === '') {
                              setNewProduct({...newProduct, inventory: {...newProduct.inventory, costPrice: 0}});
                            } else {
                              setNewProduct({...newProduct, inventory: {...newProduct.inventory, costPrice: price}});
                            }
                          }}
                        />
                        </div>
                        {showLotFields && newProduct.isPerishable && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="invLotNumber">Número de Lote</Label>
                              <Input
                                id="invLotNumber"
                                value={newProduct.inventory.lotNumber}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    inventory: {
                                      ...newProduct.inventory,
                                      lotNumber: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Opcional"
                              />
                            </div>
                            {showExpirationFields && (
                              <div className="space-y-2">
                                <Label htmlFor="invExpirationDate">Fecha de Vencimiento</Label>
                                <Input
                                  id="invExpirationDate"
                                  type="date"
                                  value={newProduct.inventory.expirationDate}
                                  onChange={(e) =>
                                    setNewProduct({
                                      ...newProduct,
                                      inventory: {
                                        ...newProduct.inventory,
                                        expirationDate: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </div>
                            )}
                          </>
                        )}
                    </div>
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-4">
                      <h4 className="text-lg font-medium mb-4">Proveedor</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre de la Empresa</Label>
                          <SearchableSelect
                            isCreatable
                            options={supplierOptions}
                            onSelection={handleSupplierSelectionForNewProduct}
                            value={
                              newProduct.supplier.supplierId
                                ? { value: newProduct.supplier.supplierId, label: newProduct.supplier.newSupplierName }
                                : newProduct.supplier.newSupplierName
                                  ? { value: newProduct.supplier.newSupplierName, label: newProduct.supplier.newSupplierName }
                                  : null
                            }
                            placeholder="Escriba o seleccione un proveedor..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RIF</Label>
                          <div className="flex space-x-2">
                            <Select 
                              value={newProduct.supplier.rifPrefix} 
                              onValueChange={(val) => setNewProduct({...newProduct, supplier: {...newProduct.supplier, rifPrefix: val}})}
                              disabled={!newProduct.supplier.isNew}
                            >
                              <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{['J', 'V', 'E', 'G', 'P', 'N'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input 
                              value={newProduct.supplier.newSupplierRif} 
                              onChange={(e) => setNewProduct({...newProduct, supplier: {...newProduct.supplier, newSupplierRif: e.target.value}})} 
                              placeholder="12345678-9" 
                              disabled={!newProduct.supplier.isNew}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre del Vendedor</Label>
                          <Input 
                            value={newProduct.supplier.newSupplierContactName} 
                            onChange={(e) => setNewProduct({...newProduct, supplier: {...newProduct.supplier, newSupplierContactName: e.target.value}})} 
                            disabled={!newProduct.supplier.isNew}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono del Vendedor</Label>
                          <Input 
                            value={newProduct.supplier.newSupplierContactPhone} 
                            onChange={(e) => setNewProduct({...newProduct, supplier: {...newProduct.supplier, newSupplierContactPhone: e.target.value}})} 
                            disabled={!newProduct.supplier.isNew}
                          />
                        </div>
                      </div>
                    </div>

                </div>
                <DialogFooter className="px-6 pb-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsNewProductDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddProduct}>Crear Producto</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={Boolean(variantSelection)} onOpenChange={(open) => { if (!open) closeVariantSelection(); }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Seleccionar variantes</DialogTitle>
                  <DialogDescription>
                    Define las cantidades por variante para {variantSelection?.product?.name || 'el producto seleccionado'}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {variantSelection?.rows?.map((row, index) => {
                    const variantId = row.variant?._id || `variant-${index}`;
                    return (
                      <div key={variantId} className="border rounded-lg p-4 space-y-3">
                        <div>
                          <div className="font-medium">{row.variant?.name}</div>
                          <div className="text-xs text-muted-foreground">{row.variant?.sku}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`variant-qty-${variantId}`}>Cantidad</Label>
                            <Input
                              id={`variant-qty-${variantId}`}
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) => updateVariantSelectionRow(index, 'quantity', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`variant-cost-${variantId}`}>Costo unitario</Label>
                            <Input
                              id={`variant-cost-${variantId}`}
                              type="number"
                              min="0"
                              value={row.costPrice}
                              onChange={(e) => updateVariantSelectionRow(index, 'costPrice', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!variantSelection?.rows?.length && (
                    <p className="text-sm text-muted-foreground">
                      No hay variantes disponibles para este producto.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeVariantSelection}>Cancelar</Button>
                  <Button onClick={confirmVariantSelection}>Agregar a la orden</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center space-x-2"><AlertTriangle className="h-5 w-5 text-red-500" /><span>Productos con Bajo Stock</span></CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Disponible</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map(item => (
                    <TableRow key={item._id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.productSku}</TableCell>
                      <TableCell><Badge variant="destructive">{item.availableQuantity}</Badge></TableCell>
                      <TableCell><Button size="sm" onClick={() => handleCreatePoFromAlert(item)}>Crear OC</Button></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan="4" className="text-center">No hay productos con bajo stock.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center space-x-2"><Clock className="h-5 w-5 text-orange-500" /><span>Productos Próximos a Vencer</span></CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead>Vence</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {expiringProducts.length > 0 ? (
                  expiringProducts.map(item => (
                    item.lots.map(lot => (
                      <TableRow key={`${item._id}-${lot.lotNumber}`}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{lot.lotNumber}</TableCell>
                        <TableCell><Badge variant="secondary">{new Date(lot.expirationDate).toLocaleDateString()}</Badge></TableCell>
                        <TableCell><Button size="sm" onClick={() => handleCreatePoFromAlert(item)}>Crear OC</Button></TableCell>
                      </TableRow>
                    ))
                  ))
                ) : (
                  <TableRow><TableCell colSpan="4" className="text-center">No hay productos próximos a vencer.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <PurchaseHistory />
      </div>
    </div>
  );
}
