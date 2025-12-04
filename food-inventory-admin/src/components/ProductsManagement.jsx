import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { fetchApi } from '../lib/api';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useConsumables } from '@/hooks/useConsumables';
import { useSupplies } from '@/hooks/useSupplies';
import { UnitTypeFields } from './UnitTypes';
import { BarcodeScannerDialog } from '@/components/BarcodeScannerDialog.jsx';
import { CONSUMABLE_TYPES, SUPPLY_CATEGORIES } from '@/types/consumables';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  X,
  Layers,
  Wrench,
  Scan
} from 'lucide-react';

const UNASSIGNED_SELECT_VALUE = '__UNASSIGNED__';
const DEFAULT_PAGE_LIMIT = 25;
const SEARCH_PAGE_LIMIT = 50;

// ============================================================================
// IMAGE COMPRESSION UTILITY
// ============================================================================
/**
 * Compresses and optimizes an image file before upload
 * - Resizes to max 800x800px
 * - Converts to JPEG at 80% quality
 * - Returns base64 string
 * - Max size after compression: 500KB
 */
const compressAndConvertImage = (file) => {
  return new Promise((resolve, reject) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      reject(new Error('Solo se permiten imágenes JPEG, PNG o WebP'));
      return;
    }

    // Validate file size (max 10MB before compression)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      reject(new Error('La imagen es demasiado grande. Máximo 10MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 800x800, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG at 80% quality
          const base64 = canvas.toDataURL('image/jpeg', 0.8);

          // Check size limit (500KB after compression)
          const sizeInKB = (base64.length * 3) / 4 / 1024;
          if (sizeInKB > 500) {
            reject(new Error(`Imagen demasiado grande después de compresión: ${sizeInKB.toFixed(0)}KB. Máximo: 500KB`));
          } else {
            resolve(base64);
          }
        } catch (error) {
          reject(new Error(`Error al procesar imagen: ${error.message}`));
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

// Tag Input Component for categories/subcategories
const TagInput = ({ value = [], onChange, placeholder, id, helpText }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const tag = inputValue.trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-background">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
        />
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};

const createVariantTemplate = (options = {}) => {
  const { name = '', unit = 'unidad' } = options;
  return {
    name,
    sku: '',
    barcode: '',
    unit,
    unitSize: 1,
    basePrice: 0,
    costPrice: 0,
    images: [],
    attributes: {},
  };
};

const normalizeStringList = (input) => {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item === null || item === undefined) {
          return '';
        }
        return String(item).trim();
      })
      .filter((item) => item.length > 0);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }
    return [trimmed];
  }

  if (input === null || input === undefined) {
    return [];
  }

  const coerced = String(input).trim();
  return coerced ? [coerced] : [];
};

const normalizeDecimalInput = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue.toString() : '';
  }

  if (typeof rawValue !== 'string') {
    return '';
  }

  const value = rawValue.trim();

  if (value === '' || value === '.' || value === '-.' || value === '-') {
    return value;
  }

  if (value.startsWith('.')) {
    return `0${value}`;
  }

  if (value.startsWith('-.')) {
    return `-0${value.slice(1)}`;
  }

  return value;
};

const parseDecimalInput = (value) => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  const normalized = normalizeDecimalInput(value);

  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '-.' ||
    normalized === '-'
  ) {
    return null;
  }

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const sanitizeSellingUnitsForPayload = (units = []) =>
  units.map((unit) => {
    const {
      conversionFactorInput,
      pricePerUnitInput,
      costPerUnitInput,
      ...rest
    } = unit || {};

    const parsedConversion =
      parseDecimalInput(
        conversionFactorInput !== undefined ? conversionFactorInput : rest?.conversionFactor
      ) ?? 0;

    const parsedPrice =
      parseDecimalInput(
        pricePerUnitInput !== undefined ? pricePerUnitInput : rest?.pricePerUnit
      ) ?? 0;

    const parsedCost =
      parseDecimalInput(
        costPerUnitInput !== undefined ? costPerUnitInput : rest?.costPerUnit
      ) ?? 0;

    return {
      ...rest,
      conversionFactor: parsedConversion,
      pricePerUnit: parsedPrice,
      costPerUnit: parsedCost,
      minimumQuantity: Number(rest?.minimumQuantity) || 0,
      incrementStep: Number(rest?.incrementStep) || 0,
    };
  });

const initialNewProductState = {
  productType: 'simple', // 'simple', 'consumable', 'supply'
  sku: '',
  name: '',
  category: [],
  subcategory: [],
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
  hasMultipleSellingUnits: false,
  sellingUnits: [],
  attributes: {},
  // UnitType fields (Global UoM System)
  unitTypeId: undefined,
  defaultUnit: undefined,
  purchaseUnit: undefined,
  stockUnit: undefined,
  consumptionUnit: undefined,
  // Consumable-specific fields
  consumableConfig: {
    consumableType: 'container',
    isReusable: false,
    isAutoDeducted: true,
    defaultQuantityPerUse: 1,
    notes: '',
  },
  // Supply-specific fields
  supplyConfig: {
    supplyCategory: 'cleaning',
    supplySubcategory: '',
    requiresTracking: false,
    requiresAuthorization: false,
    usageDepartment: '',
    estimatedMonthlyConsumption: 0,
    safetyInfo: {
      requiresPPE: false,
      isHazardous: false,
      storageRequirements: '',
      handlingInstructions: '',
    },
    notes: '',
  },
  inventoryConfig: {
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 20,
    reorderQuantity: 50,
    trackLots: true,
    trackExpiration: true,
    fefoEnabled: true,
  },
  pricingRules: {
    cashDiscount: 0,
    cardSurcharge: 0,
    minimumMargin: 0.2,
    maximumDiscount: 0.5,
    bulkDiscountEnabled: false,
    bulkDiscountRules: [],
  },
  hasActivePromotion: false,
  promotion: {
    discountPercentage: 0,
    reason: '',
    startDate: new Date(),
    endDate: new Date(),
    durationDays: 7,
    isActive: false,
    autoDeactivate: true,
  },
  variant: {
    ...createVariantTemplate({ name: 'Estándar' }),
  },
};

function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const productTypeFilter = 'simple'; // Solo mercancía en este módulo
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const lastFetchRef = useRef('');
  const abortControllerRef = useRef(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProductState);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [additionalVariants, setAdditionalVariants] = useState([]);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [barcodeCaptureTarget, setBarcodeCaptureTarget] = useState(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const dragImageIndex = useRef(null);
  const manualPageLimitRef = useRef(DEFAULT_PAGE_LIMIT);

  // Estados para importación masiva
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  // Estados para preview de imágenes
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');

  const verticalConfig = useVerticalConfig();
  const { createConsumableConfig } = useConsumables();
  const { createSupplyConfig } = useSupplies();
  const productAttributes = useMemo(
    () => (verticalConfig?.attributeSchema || []).filter((attr) => attr.scope === 'product'),
    [verticalConfig],
  );
  const variantAttributes = useMemo(
    () => (verticalConfig?.attributeSchema || []).filter((attr) => attr.scope === 'variant'),
    [verticalConfig],
  );
  const unitOptions = useMemo(() => {
    const defaults = Array.isArray(verticalConfig?.defaultUnits)
      ? verticalConfig.defaultUnits
      : [];
    const fallback = ['unidad', 'kg', 'gramos', 'lb', 'litros', 'ml', 'galones', 'paquete', 'caja'];
    const combined = [...defaults, ...fallback.filter((unit) => !defaults.includes(unit))];
    return combined;
  }, [verticalConfig]);

  const placeholders = useMemo(() => verticalConfig?.placeholders || {}, [verticalConfig]);
  const getPlaceholder = useCallback(
    (key, fallback) => (placeholders[key] && placeholders[key].trim() !== '' ? placeholders[key] : fallback),
    [placeholders],
  );

  // Dynamic placeholders based on product type
  const getDynamicPlaceholder = useCallback((field, productType) => {
    const placeholdersByType = {
      simple: {
        name: 'Ej: Arroz Blanco Premium',
        brand: 'Ej: Diana',
        sku: 'Ej: ARR-BLANCO-001',
        description: 'Describe el producto, sus características y beneficios para el cliente',
        unitOfMeasure: 'unidad',
      },
      consumable: {
        name: 'Ej: Vaso Plástico 16oz',
        brand: 'Ej: Dart',
        sku: 'Ej: VASO-16OZ',
        description: 'Especifica el tamaño, material y uso del consumible',
        unitOfMeasure: 'unidad',
      },
      supply: {
        name: 'Ej: Detergente Industrial',
        brand: 'Ej: Clorox',
        sku: 'Ej: DET-IND-5L',
        description: 'Indica el uso, concentración y aplicaciones del suministro',
        unitOfMeasure: 'litros',
      },
    };

    return placeholdersByType[productType]?.[field] || placeholdersByType.simple[field];
  }, []);

  const productAttributeColumns = useMemo(
    () =>
      productAttributes.map((descriptor) => ({
        descriptor,
        header: `productAttr_${descriptor.key}`,
      })),
    [productAttributes],
  );

  const variantAttributeColumns = useMemo(
    () =>
      variantAttributes.map((descriptor) => ({
        descriptor,
        header: `variantAttr_${descriptor.key}`,
      })),
    [variantAttributes],
  );

  const dynamicAttributeLabels = useMemo(
    () =>
      [...productAttributeColumns, ...variantAttributeColumns].map(
        ({ descriptor }) => descriptor.label || descriptor.key,
      ),
    [productAttributeColumns, variantAttributeColumns],
  );
  const hasDynamicTemplateColumns = dynamicAttributeLabels.length > 0;

  const isNonFoodRetailVertical = useMemo(() => {
    if (!verticalConfig) {
      return false;
    }
    const baseVertical = verticalConfig.baseVertical;
    const allowsWeight = verticalConfig.allowsWeight;
    return baseVertical === 'RETAIL' && allowsWeight === false;
  }, [verticalConfig]);
  const supportsVariants = verticalConfig?.supportsVariants !== false;

  const ingredientLabel = isNonFoodRetailVertical ? 'Composición' : 'Ingredientes';

  const handleDragStart = (index) => {
    dragImageIndex.current = index;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

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

    setNewProduct({
      ...newProduct,
      variant: {
        ...newProduct.variant,
        images: images
      }
    });
    setSelectedImageIndex(newSelectedIndex >= 0 ? newSelectedIndex : 0);

    dragImageIndex.current = null;
  };

useEffect(() => {
  if (isAddDialogOpen) {
    const baseProduct = JSON.parse(JSON.stringify(initialNewProductState));
    const defaultUnit = unitOptions[0] || baseProduct.unitOfMeasure;
    baseProduct.unitOfMeasure = defaultUnit;
    baseProduct.variant.unit = defaultUnit;
    baseProduct.attributes = {};
    baseProduct.variant.attributes = {};
    if (isNonFoodRetailVertical) {
      baseProduct.isPerishable = false;
      baseProduct.ivaApplicable = true;
      baseProduct.hasMultipleSellingUnits = false;
      baseProduct.isSoldByWeight = false;
    }
    setNewProduct(baseProduct);
    setSelectedImageIndex(0);
    setAdditionalVariants([]);
  }
}, [isAddDialogOpen, unitOptions, isNonFoodRetailVertical]);

  const loadProducts = useCallback(async (page = 1, limit = 25, status = 'all', search = '', category = 'all', productType = 'simple') => {
    const trimmedSearch = (search || '').trim();
    const requestKey = JSON.stringify({ page, limit, status, search: trimmedSearch, category, productType });

    // Cancel any in-flight request to avoid stale results overriding new searches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastFetchRef.current = requestKey;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status === 'active') {
        params.set('isActive', 'true');
      } else if (status === 'inactive') {
        params.set('isActive', 'false');
      } else {
        params.set('includeInactive', 'true');
      }

      // Add search parameter if provided
      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }

      // Add category filter if not 'all'
      if (category && category !== 'all') {
        params.set('category', category);
      }

      // Force product type to simple (mercancía) in este módulo
      if (productType) {
        params.set('productType', productType);
      }

      const queryString = `?${params.toString()}`;
      const response = await fetchApi(`/products${queryString}`, { signal: controller.signal });

      if (lastFetchRef.current !== requestKey) {
        return;
      }
      setProducts(response.data || []);
      setTotalProducts(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
    } catch (err) {
      if (controller.signal.aborted || lastFetchRef.current !== requestKey) {
        return;
      }
      setError(err.message);
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(0);
    } finally {
      if (lastFetchRef.current === requestKey) {
        setLoading(false);
      }
    }
  }, []);

  // Load products when filters change - debounce search
  // OPTIMIZED: Consolidate all data loading into single useEffect to prevent cascade
  useEffect(() => {
    // Auto-adjust page limit based on search (sync, no separate effect)
    const trimmedSearch = searchTerm.trim();
    const targetLimit = trimmedSearch ? SEARCH_PAGE_LIMIT : (manualPageLimitRef.current || DEFAULT_PAGE_LIMIT);

    // Determine if we need to load data
    const hasFilters = trimmedSearch !== '' || statusFilter !== 'all' || filterCategory !== 'all';
    const page = hasFilters ? 1 : currentPage;

    // Debounce only for search, instant for other changes
    const delay = trimmedSearch ? 800 : 0;

    // Keep limit in sync before fetching to avoid double requests
    if (pageLimit !== targetLimit) {
      setPageLimit(targetLimit);
      if (hasFilters && currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      // Reset to page 1 for filter changes
      if (hasFilters && currentPage !== 1) {
        setCurrentPage(1);
      }

      loadProducts(page, targetLimit, statusFilter, trimmedSearch, filterCategory, productTypeFilter);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currentPage, statusFilter, searchTerm, filterCategory, productTypeFilter, pageLimit, loadProducts]);

  // Cancel any pending fetch when the component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Sync filtered products (keep this simple one)
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const categories = [...new Set(products.flatMap(p => Array.isArray(p.category) ? p.category : [p.category]).filter(Boolean))];

  const normalizeAttributeValue = (attr, rawValue) => {
    if (rawValue === UNASSIGNED_SELECT_VALUE) {
      return null;
    }
    if (attr.type === 'boolean') {
      if (rawValue === null || rawValue === undefined) {
        return null;
      }
      return Boolean(rawValue);
    }
    if (attr.type === 'number') {
      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        return null;
      }
      const parsed = Number(rawValue);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      return null;
    }
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      return trimmed === '' ? null : trimmed;
    }
    return rawValue;
  };

  const formatAttributeValueForInput = (attr, value) => {
    if (value === undefined || value === null) {
      return attr.type === 'boolean' ? false : '';
    }
    if (attr.type === 'boolean') {
      return Boolean(value);
    }
    return String(value);
  };

  const renderAttributeControl = (attr, storedValue, onValueChange) => {
    if (attr.type === 'boolean') {
      const boolValue = formatAttributeValueForInput(attr, storedValue);
      return (
        <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
          <Switch checked={boolValue} onCheckedChange={(checked) => onValueChange(checked)} />
          <span className="text-xs text-muted-foreground">{boolValue ? 'Sí' : 'No'}</span>
        </div>
      );
    }

    if (attr.type === 'enum' && Array.isArray(attr.options) && attr.options.length > 0) {
      const stringValue = formatAttributeValueForInput(attr, storedValue);
      const selectValue = stringValue && stringValue !== '' ? stringValue : undefined;
      const sanitizedOptions = attr.options
        .filter((option) => option !== null && option !== undefined)
        .map((option) => (typeof option === 'string' ? option : String(option)))
        .filter((option) => option.trim() !== '');
      return (
        <Select
          value={selectValue}
          onValueChange={(val) =>
            onValueChange(val === UNASSIGNED_SELECT_VALUE ? null : val)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={`Selecciona ${attr.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_SELECT_VALUE}>Sin asignar</SelectItem>
            {sanitizedOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (attr.ui?.widget === 'textarea') {
      const textValue = formatAttributeValueForInput(attr, storedValue);
      return (
        <Textarea
          value={textValue}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={attr.ui?.helperText || ''}
        />
      );
    }

    const inputType = attr.type === 'number' ? 'number' : 'text';
    const inputValue = formatAttributeValueForInput(attr, storedValue);
    return (
      <Input
        type={inputType}
        value={inputValue}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={attr.ui?.helperText || ''}
      />
    );
  };

  const handleProductAttributeChange = (attr, rawValue) => {
    const normalized = normalizeAttributeValue(attr, rawValue);
    setNewProduct((prev) => {
      const nextAttributes = { ...(prev.attributes || {}) };
      if (normalized === null) {
        delete nextAttributes[attr.key];
      } else {
        nextAttributes[attr.key] = normalized;
      }
      return { ...prev, attributes: nextAttributes };
    });
  };

  const handleVariantAttributeChange = (attr, rawValue) => {
    const normalized = normalizeAttributeValue(attr, rawValue);
    setNewProduct((prev) => {
      const nextVariant = {
        ...(prev.variant || {}),
        attributes: { ...(prev.variant?.attributes || {}) },
      };
      if (normalized === null) {
        delete nextVariant.attributes[attr.key];
      } else {
        nextVariant.attributes[attr.key] = normalized;
      }
      return { ...prev, variant: nextVariant };
    });
  };

  const addAdditionalVariant = () => {
    setAdditionalVariants((prev) => {
      const nextIndex = prev.length + 2;
      const defaultSkuPrefix = newProduct.sku ? `${newProduct.sku}-VAR${nextIndex}` : '';
      const defaultUnit = newProduct.unitOfMeasure || 'unidad';
      return [
        ...prev,
        {
          ...createVariantTemplate({ name: '', unit: defaultUnit }),
          sku: defaultSkuPrefix,
        },
      ];
    });
  };

  const updateAdditionalVariantField = useCallback((index, field, value) => {
    setAdditionalVariants((prev) => {
      const next = [...prev];
      if (!next[index]) {
        return prev;
      }
      let nextValue = value;
      if (field === 'unitSize') {
        const parsed = parseFloat(value);
        nextValue = Number.isNaN(parsed) ? 0 : parsed;
      }
      if (field === 'costPrice' || field === 'basePrice') {
        const parsed = parseFloat(value);
        nextValue = Number.isNaN(parsed) ? 0 : parsed;
      }
      next[index] = { ...next[index], [field]: nextValue };
      return next;
    });
  }, []);

  const handleAdditionalVariantAttributeChange = (variantIndex, attr, rawValue) => {
    const normalized = normalizeAttributeValue(attr, rawValue);
    setAdditionalVariants((prev) => {
      const next = [...prev];
      const current = next[variantIndex];
      if (!current) {
        return prev;
      }
      const attributes = { ...(current.attributes || {}) };
      if (normalized === null) {
        delete attributes[attr.key];
      } else {
        attributes[attr.key] = normalized;
      }
      next[variantIndex] = { ...current, attributes };
      return next;
    });
  };

  const removeAdditionalVariant = (index) => {
    setAdditionalVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateEditingVariant = useCallback((index, updater) => {
    setEditingProduct((prev) => {
      if (!prev || !Array.isArray(prev.variants) || !prev.variants[index]) {
        return prev;
      }
      const nextVariants = prev.variants.map((variant, idx) =>
        idx === index ? updater({ ...variant }) : variant,
      );
      return { ...prev, variants: nextVariants };
    });
  }, []);

  const addEditingVariant = () => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const nextVariant = {
        ...createVariantTemplate({
          name: `Variante ${prev.variants.length + 1}`,
          unit: prev.unitOfMeasure || 'unidad',
        }),
      };
      return {
        ...prev,
        variants: [...(prev.variants || []), nextVariant],
      };
    });
  };

  const removeEditingVariant = (index) => {
    setEditingProduct((prev) => {
      if (!prev || !Array.isArray(prev.variants) || prev.variants.length <= 1) {
        return prev;
      }
      const nextVariants = prev.variants.filter((_, idx) => idx !== index);
      return { ...prev, variants: nextVariants };
    });
  };

  const handleEditVariantFieldChange = useCallback((index, field, value) => {
    updateEditingVariant(index, (variant) => {
      let nextValue = value;
      if (field === 'unitSize') {
        const parsed = parseFloat(value);
        nextValue = Number.isNaN(parsed) ? 0 : parsed;
      }
      if (field === 'basePrice' || field === 'costPrice') {
        const parsed = parseFloat(value);
        nextValue = Number.isNaN(parsed) ? 0 : parsed;
      }
      if (field === 'name' || field === 'sku' || field === 'barcode' || field === 'unit') {
        nextValue = typeof value === 'string' ? value : '';
      }
      return {
        ...variant,
        [field]: nextValue,
      };
    });
  }, [updateEditingVariant]);

  const openBarcodeScanner = useCallback((target) => {
    setBarcodeCaptureTarget(target);
    setIsBarcodeDialogOpen(true);
  }, []);

  const handleBarcodeDetected = useCallback(
    (rawValue) => {
      const code = (rawValue || '').trim();
      if (!code) return;

      if (barcodeCaptureTarget?.scope === 'additional' && typeof barcodeCaptureTarget.index === 'number') {
        updateAdditionalVariantField(barcodeCaptureTarget.index, 'barcode', code);
      } else if (barcodeCaptureTarget?.scope === 'edit' && typeof barcodeCaptureTarget.index === 'number') {
        handleEditVariantFieldChange(barcodeCaptureTarget.index, 'barcode', code);
      } else {
        setNewProduct((prev) => ({
          ...prev,
          variant: { ...prev.variant, barcode: code },
        }));
      }

      toast.success('Código de barras capturado');
      setIsBarcodeDialogOpen(false);
      setBarcodeCaptureTarget(null);
    },
    [barcodeCaptureTarget, handleEditVariantFieldChange, updateAdditionalVariantField]
  );

  const handleEditProductAttributeChange = (attr, rawValue) => {
    const normalized = normalizeAttributeValue(attr, rawValue);
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const nextAttributes = { ...(prev.attributes || {}) };
      if (normalized === null) {
        delete nextAttributes[attr.key];
      } else {
        nextAttributes[attr.key] = normalized;
      }
      return { ...prev, attributes: nextAttributes };
    });
  };

  const handleEditVariantAttributeChange = (variantIndex, attr, rawValue) => {
    const normalized = normalizeAttributeValue(attr, rawValue);
    updateEditingVariant(variantIndex, (variant) => {
      const nextAttributes = { ...(variant.attributes || {}) };
      if (normalized === null) {
        delete nextAttributes[attr.key];
      } else {
        nextAttributes[attr.key] = normalized;
      }
      return { ...variant, attributes: nextAttributes };
    });
  };

  const serializeAttributes = (attributes, schema) => {
    if (!attributes || !schema || schema.length === 0) {
      return undefined;
    }

    const result = {};
    schema.forEach((attr) => {
      if (!Object.prototype.hasOwnProperty.call(attributes, attr.key)) {
        return;
      }
      const value = attributes[attr.key];
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (attr.type === 'number') {
        const parsed = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(parsed)) {
          result[attr.key] = parsed;
        }
        return;
      }
      if (attr.type === 'boolean') {
        result[attr.key] = Boolean(value);
        return;
      }
      result[attr.key] = value;
    });

    return Object.keys(result).length > 0 ? result : undefined;
  };

  const handleAddProduct = async () => {
    const productAttributesPayload = serializeAttributes(
      newProduct.attributes,
      productAttributes,
    );
    const normalizedCategory = normalizeStringList(newProduct.category);
    const normalizedSubcategory = normalizeStringList(newProduct.subcategory);

    const buildVariantPayload = (variant, position) => {
      if (!variant) {
        return null;
      }
      const attributesPayload = serializeAttributes(
        variant.attributes,
        variantAttributes,
      );

      const trimmedSku =
        variant.sku && typeof variant.sku === 'string' && variant.sku.trim().length > 0
          ? variant.sku.trim()
          : `${newProduct.sku}-VAR${position}`;

      const normalizedVariant = {
        ...variant,
        sku: trimmedSku,
        unit: variant.unit || newProduct.unitOfMeasure || 'unidad',
        unitSize: Number(variant.unitSize) || 1,
        costPrice: Number(variant.costPrice) || 0,
        basePrice: Number(variant.basePrice) || 0,
        images: Array.isArray(variant.images) ? variant.images : [],
      };

      if (attributesPayload) {
        normalizedVariant.attributes = attributesPayload;
      } else {
        delete normalizedVariant.attributes;
      }

      return normalizedVariant;
    };

    const primaryVariantPayload = buildVariantPayload(newProduct.variant, 1);

    const extraVariantsPayload = additionalVariants
      .map((variant, index) => buildVariantPayload(variant, index + 2))
      .filter(Boolean);

    const payload = {
      ...newProduct,
      category: normalizedCategory,
      subcategory: normalizedSubcategory,
      attributes: productAttributesPayload,
      variants: [
        primaryVariantPayload,
        ...extraVariantsPayload,
      ].filter(Boolean),
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        minimumMargin: 0.2,
        maximumDiscount: 0.5,
        bulkDiscountEnabled: newProduct.pricingRules?.bulkDiscountEnabled || false,
        bulkDiscountRules: newProduct.pricingRules?.bulkDiscountEnabled
          ? (newProduct.pricingRules?.bulkDiscountRules || [])
          : [],
      },
      igtfExempt: false,
      hasMultipleSellingUnits: newProduct.hasMultipleSellingUnits,
      sellingUnits: newProduct.hasMultipleSellingUnits
        ? sanitizeSellingUnitsForPayload(newProduct.sellingUnits)
        : [],
      hasActivePromotion: newProduct.hasActivePromotion || false,
      ...(newProduct.hasActivePromotion && newProduct.promotion && {
        promotion: {
          ...newProduct.promotion,
          isActive: true,
        }
      }),
    };

    if (!payload.isPerishable) {
      delete payload.shelfLifeDays;
      delete payload.storageTemperature;
    }

    if (!productAttributesPayload) {
      delete payload.attributes;
    }

    delete payload.variant;

    if (!payload.hasMultipleSellingUnits) {
      payload.sellingUnits = [];
    }

    // Remove consumable/supply configs from payload - they'll be created separately
    delete payload.consumableConfig;
    delete payload.supplyConfig;

    try {
      // OPTIMIZED: Add new product to list instead of reloading everything
      const response = await fetchApi('/products', { method: 'POST', body: JSON.stringify(payload) });
      const createdProduct = response.data || response;

      console.log('🔍 DEBUG - Created Product:', createdProduct);
      console.log('🔍 DEBUG - Product ID:', createdProduct._id);
      console.log('🔍 DEBUG - Product Type:', newProduct.productType);

      // If product is consumable or supply, create the corresponding config
      if (newProduct.productType === 'consumable') {
        console.log('🔍 DEBUG - Creating consumable config with productId:', createdProduct._id);
        try {
          const configResult = await createConsumableConfig({
            productId: createdProduct._id,
            consumableType: newProduct.consumableConfig.consumableType,
            isReusable: newProduct.consumableConfig.isReusable,
            isAutoDeducted: newProduct.consumableConfig.isAutoDeducted,
            defaultQuantityPerUse: newProduct.consumableConfig.defaultQuantityPerUse,
            unitOfMeasure: newProduct.unitOfMeasure || 'unidad',
            notes: newProduct.consumableConfig.notes,
            isActive: true,
          });
          console.log('✅ DEBUG - Consumable config result:', configResult);
        } catch (configErr) {
          console.error('❌ DEBUG - Error creating consumable config:', configErr);
          console.error('❌ DEBUG - Error details:', {
            message: configErr.message,
            stack: configErr.stack,
            productId: createdProduct._id,
            productType: newProduct.productType,
          });
          alert('Producto creado, pero hubo un error al configurarlo como consumible. Por favor, configúralo manualmente desde la pestaña de Consumibles.');
        }
      } else if (newProduct.productType === 'supply') {
        try {
          await createSupplyConfig({
            productId: createdProduct._id,
            supplyCategory: newProduct.supplyConfig.supplyCategory,
            supplySubcategory: newProduct.supplyConfig.supplySubcategory,
            requiresTracking: newProduct.supplyConfig.requiresTracking,
            requiresAuthorization: newProduct.supplyConfig.requiresAuthorization,
            usageDepartment: newProduct.supplyConfig.usageDepartment,
            estimatedMonthlyConsumption: newProduct.supplyConfig.estimatedMonthlyConsumption,
            safetyInfo: newProduct.supplyConfig.safetyInfo,
            notes: newProduct.supplyConfig.notes,
            isActive: true,
          });
        } catch (configErr) {
          console.error('Error creating supply config:', configErr);
          alert('Producto creado, pero hubo un error al configurarlo como suministro. Por favor, configúralo manualmente desde la pestaña de Suministros.');
        }
      }

      // 1. Add to local state immediately
      setProducts(prev => [createdProduct, ...prev]);

      // 2. Close dialog and reset state
      document.dispatchEvent(new CustomEvent('product-form-success'));
      setIsAddDialogOpen(false);
      setNewProduct(initialNewProductState);
      setAdditionalVariants([]);

      // No need to reload - already added to list!
    } catch (err) {
      const errorMessage =
        typeof err?.message === 'string' && err.message.includes('duplicate key')
          ? 'Ya existe un producto con este SKU. Por favor utiliza un SKU diferente.'
          : err?.message || 'Ocurrió un error inesperado al crear el producto.';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const productAttributesPayload = serializeAttributes(
      editingProduct.attributes,
      productAttributes,
    );
    const normalizedCategory = normalizeStringList(editingProduct.category);
    const normalizedSubcategory = normalizeStringList(editingProduct.subcategory);
    const sanitizedVariants = (editingProduct.variants || []).map((variant) => {
      const sanitizedAttributes = serializeAttributes(variant.attributes, variantAttributes);
      const trimmedSku =
        variant.sku && typeof variant.sku === 'string' ? variant.sku.trim() : variant.sku;
      const nextVariant = {
        ...variant,
        sku: trimmedSku,
        unit: variant.unit || editingProduct.unitOfMeasure || 'unidad',
        unitSize: Number(variant.unitSize) || 1,
        costPrice: Number(variant.costPrice) || 0,
        basePrice: Number(variant.basePrice) || 0,
        images: Array.isArray(variant.images) ? variant.images : [],
      };
      if (sanitizedAttributes !== undefined) {
        nextVariant.attributes = sanitizedAttributes;
      } else if (variant.attributes && Object.keys(variant.attributes).length === 0) {
        nextVariant.attributes = {};
      } else {
        delete nextVariant.attributes;
      }
      return nextVariant;
    });

    const payload = {
      name: editingProduct.name,
      category: normalizedCategory,
      subcategory: normalizedSubcategory,
      brand: editingProduct.brand,
      description: editingProduct.description,
      ingredients: editingProduct.ingredients,
      inventoryConfig: editingProduct.inventoryConfig,
      isSoldByWeight: editingProduct.isSoldByWeight,
      unitOfMeasure: editingProduct.unitOfMeasure,
      hasMultipleSellingUnits: editingProduct.hasMultipleSellingUnits,
      sellingUnits: editingProduct.hasMultipleSellingUnits
        ? sanitizeSellingUnitsForPayload(editingProduct.sellingUnits)
        : [],
      ivaApplicable: editingProduct.ivaApplicable,
      isPerishable: editingProduct.isPerishable,
      shelfLifeDays: editingProduct.shelfLifeDays,
      storageTemperature: editingProduct.storageTemperature,
      pricingRules: {
        ...(editingProduct.pricingRules || {}),
        bulkDiscountEnabled: editingProduct.pricingRules?.bulkDiscountEnabled || false,
        bulkDiscountRules: editingProduct.pricingRules?.bulkDiscountEnabled
          ? (editingProduct.pricingRules?.bulkDiscountRules || [])
          : [],
      },
      hasActivePromotion: editingProduct.hasActivePromotion || false,
      ...(editingProduct.hasActivePromotion && editingProduct.promotion && {
        promotion: {
          ...editingProduct.promotion,
          isActive: true,
        }
      }),
      variants: sanitizedVariants,
    };

    if (productAttributesPayload !== undefined) {
      payload.attributes = productAttributesPayload;
    } else if (editingProduct.attributes && Object.keys(editingProduct.attributes).length === 0) {
      payload.attributes = {};
    }

    // OPTIMISTIC UPDATE: Update UI immediately, save in background
    const previousProducts = products; // Store for rollback
    const updatedProduct = { ...editingProduct, ...payload };

    try {
      // 1. Update local state immediately (optimistic)
      setProducts(prev => prev.map(p =>
        p._id === editingProduct._id ? updatedProduct : p
      ));

      // 2. Close dialog immediately (better UX)
      setIsEditDialogOpen(false);
      setEditingProduct(null);

      // 3. Save to backend in background
      await fetchApi(`/products/${editingProduct._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Success - no need to reload, already updated!
    } catch (err) {
      // 4. Rollback on error
      setProducts(previousProducts);
      alert(`Error al actualizar el producto: ${err.message}`);

      // Optionally reload to ensure consistency
      loadProducts(currentPage, pageLimit, statusFilter, searchTerm, filterCategory, productTypeFilter);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      // OPTIMISTIC UPDATE: Remove from UI immediately
      const previousProducts = products;

      try {
        // 1. Remove from UI immediately
        setProducts(prev => prev.filter(p => p._id !== productId));

        // 2. Delete from backend
        await fetchApi(`/products/${productId}`, { method: 'DELETE' });

        // Success - already removed from UI!
      } catch (err) {
        // 3. Rollback on error
        setProducts(previousProducts);
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const currentImages = newProduct.variant.images || [];

    if (currentImages.length + files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }

    try {
      // Show loading state
      const loadingMessage = `Comprimiendo ${files.length} imagen(es)...`;
      console.log(loadingMessage);

      // Compress and convert all images to optimized base64
      const newImages = await Promise.all(
        files.map(file => compressAndConvertImage(file))
      );

      setNewProduct({
        ...newProduct,
        variant: {
          ...newProduct.variant,
          images: [...currentImages, ...newImages]
        }
      });

      console.log(`✓ ${files.length} imagen(es) comprimida(s) exitosamente`);
    } catch (error) {
      alert(`Error al procesar imágenes: ${error.message}`);
    }
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...newProduct.variant.images];
    updatedImages.splice(index, 1);
    
    if (index === selectedImageIndex) {
      setSelectedImageIndex(0);
    } else if (index < selectedImageIndex) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }

    setNewProduct({
      ...newProduct,
      variant: {
        ...newProduct.variant,
        images: updatedImages
      }
    });
  };

  const handleEditImageUpload = async (variantIndex, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    // Get current images to check limit before processing
    const currentVariant = editingProduct.variants[variantIndex];
    const currentImages = Array.isArray(currentVariant.images) ? currentVariant.images : [];

    if (currentImages.length + files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }

    try {
      // Show loading state
      const loadingMessage = `Comprimiendo ${files.length} imagen(es)...`;
      console.log(loadingMessage);

      // Compress and convert all images to optimized base64
      const newImages = await Promise.all(
        files.map(file => compressAndConvertImage(file))
      );

      // Update variant with compressed images
      updateEditingVariant(variantIndex, (variant) => {
        return {
          ...variant,
          images: [...currentImages, ...newImages],
        };
      });

      console.log(`✓ ${files.length} imagen(es) comprimida(s) exitosamente`);
    } catch (error) {
      alert(`Error al procesar imágenes: ${error.message}`);
    }
  };

  const handleEditRemoveImage = (variantIndex, imageIndex) => {
    updateEditingVariant(variantIndex, (variant) => {
      const currentImages = Array.isArray(variant.images) ? [...variant.images] : [];
      if (imageIndex < 0 || imageIndex >= currentImages.length) {
        return variant;
      }
      currentImages.splice(imageIndex, 1);
      return {
        ...variant,
        images: currentImages,
      };
    });
  };

  const handleDownloadTemplate = () => {
    const baseHeaders = [
      "sku",
      "name",
      "category",
      "subcategory",
      "brand",
      "unitOfMeasure",
      "isSoldByWeight",
      "description",
      "ingredients",
      "isPerishable",
      "shelfLifeDays",
      "storageTemperature",
      "ivaApplicable",
      "taxCategory",
      "minimumStock",
      "maximumStock",
      "reorderPoint",
      "reorderQuantity",
      "variantName",
      "variantSku",
      "variantBarcode",
      "variantUnit",
      "variantUnitSize",
      "variantBasePrice",
      "variantCostPrice",
      "image1",
      "image2",
      "image3",
    ];
    const attributeHeaders = [
      ...productAttributeColumns.map((column) => column.header),
      ...variantAttributeColumns.map((column) => column.header),
    ];
    const headers = [...baseHeaders, ...attributeHeaders];

    const fillAttributes = (row, samples = {}) => {
      productAttributeColumns.forEach(({ header, descriptor }) => {
        row[header] =
          samples.product?.[descriptor.key] ??
          "";
      });
      variantAttributeColumns.forEach(({ header, descriptor }) => {
        row[header] =
          samples.variant?.[descriptor.key] ??
          "";
      });
      return row;
    };

    const exampleRows = [
      fillAttributes(
        {
          sku: "SKU-001",
          name: "Arroz Blanco 1kg",
          category: "Granos",
          subcategory: "Arroz",
          brand: "MarcaA",
          unitOfMeasure: "unidad",
          isSoldByWeight: false,
          description: "Arroz de grano largo",
          ingredients: "Arroz",
          isPerishable: false,
          shelfLifeDays: 365,
          storageTemperature: "ambiente",
          ivaApplicable: true,
          taxCategory: "general",
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 20,
          reorderQuantity: 50,
          variantName: "Bolsa 1kg",
          variantSku: "SKU-001-1KG",
          variantBarcode: "7591234567890",
          variantUnit: "kg",
          variantUnitSize: 1,
          variantBasePrice: 1.5,
          variantCostPrice: 0.8,
          image1: "https://example.com/arroz.jpg",
        },
      ),
      fillAttributes({
        sku: "SKU-002",
        name: "Leche Entera 1L",
        category: "Lácteos",
        subcategory: "Leche",
        brand: "MarcaB",
        unitOfMeasure: "unidad",
        isSoldByWeight: false,
        description: "Leche pasteurizada",
        ingredients: "Leche de vaca",
        isPerishable: true,
        shelfLifeDays: 15,
        storageTemperature: "refrigerado",
        ivaApplicable: true,
        taxCategory: "general",
        minimumStock: 20,
        maximumStock: 200,
        reorderPoint: 30,
        reorderQuantity: 100,
        variantName: "Caja 1L",
        variantSku: "SKU-002-1L",
        variantBarcode: "7591234567891",
        variantUnit: "litro",
        variantUnitSize: 1,
        variantBasePrice: 2.2,
        variantCostPrice: 1.5,
        image1: "https://example.com/leche.jpg",
      }),
    ];

    const sheetData = [
      headers,
      ...exampleRows.map((row) => headers.map((header) => row[header] ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla de Productos");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_productos.xlsx');
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("El archivo está vacío o no tiene datos.");
        }

        // Validar que las cabeceras existan
        const headers = Object.keys(json[0]);
        const requiredHeaders = ["sku", "name", "category", "variantName", "variantUnit", "variantUnitSize", "variantBasePrice", "variantCostPrice"];
        const requiredAttributeHeaders = [
          ...productAttributeColumns
            .filter(({ descriptor }) => descriptor.required)
            .map(({ header }) => header),
          ...variantAttributeColumns
            .filter(({ descriptor }) => descriptor.required)
            .map(({ header }) => header),
        ];

        const missingHeaders = [...requiredHeaders, ...requiredAttributeHeaders].filter(
          (h) => !headers.includes(h),
        );

        if (missingHeaders.length > 0) {
          throw new Error(`El archivo no contiene las siguientes columnas obligatorias: ${missingHeaders.join(', ')}`);
        }

        setPreviewHeaders(headers);
        setPreviewData(json);
        setIsPreviewDialogOpen(true);

      } catch (err) {
        alert(`Error al procesar el archivo: ${err.message}`);
      }
  };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset file input
  };

  const handleConfirmImport = async () => {
    const normalizedProducts = previewData.map((row) => {
      const productAttributesPayload = {};
      const variantAttributesPayload = {};
      const normalizedRow = { ...row };

      Object.entries(row).forEach(([key, value]) => {
        if (key.startsWith('productAttr_')) {
          const attrKey = key.replace('productAttr_', '').trim();
          delete normalizedRow[key];
          if (attrKey && value !== undefined && value !== null && String(value).trim() !== '') {
            productAttributesPayload[attrKey] =
              typeof value === 'string' ? value.trim() : value;
          }
        } else if (key.startsWith('variantAttr_')) {
          const attrKey = key.replace('variantAttr_', '').trim();
          delete normalizedRow[key];
          if (attrKey && value !== undefined && value !== null && String(value).trim() !== '') {
            variantAttributesPayload[attrKey] =
              typeof value === 'string' ? value.trim() : value;
          }
        }
      });

      if (Object.keys(productAttributesPayload).length > 0) {
        normalizedRow.productAttributes = productAttributesPayload;
      }
      if (Object.keys(variantAttributesPayload).length > 0) {
        normalizedRow.variantAttributes = variantAttributesPayload;
      }

      return normalizedRow;
    });

    const payload = {
      products: normalizedProducts,
    };

    try {
      await fetchApi('/products/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsPreviewDialogOpen(false);
      alert(`${payload.products.length} productos importados exitosamente.`);
      loadProducts(currentPage, pageLimit, statusFilter, searchTerm, filterCategory, productTypeFilter); // Recargar la lista de productos

    } catch (error) {
      alert(`Error al importar los productos: ${error.message}`);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredProducts.map((p) => {
      const variant = p.variants?.[0] || {};
      const row = {
        SKU: p.sku,
        Nombre: p.name,
        Categoría: p.category,
        Subcategoría: p.subcategory,
        Marca: p.brand,
        Descripción: p.description,
        'Vendible por Peso': p.isSoldByWeight ? 'Sí' : 'No',
        'Unidad de Medida': p.unitOfMeasure,
        'Variante Nombre': variant?.name,
        'Variante SKU': variant?.sku,
        'Variante Precio Costo': variant?.costPrice,
        'Variante Precio Venta': variant?.basePrice,
      };

      productAttributeColumns.forEach(({ descriptor }) => {
        const headerLabel = descriptor.label
          ? `Atributo Producto (${descriptor.key}) - ${descriptor.label}`
          : `Atributo Producto (${descriptor.key})`;
        row[headerLabel] = (p.attributes && p.attributes[descriptor.key]) ?? '';
      });

      variantAttributeColumns.forEach(({ descriptor }) => {
        const headerLabel = descriptor.label
          ? `Atributo Variante (${descriptor.key}) - ${descriptor.label}`
          : `Atributo Variante (${descriptor.key})`;
        const variantAttrs =
          (variant && variant.attributes) || {};
        row[headerLabel] = variantAttrs[descriptor.key] ?? '';
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'productos.xlsx');
  };

  const handleExportCsv = () => {
    const dataToExport = filteredProducts.map((p) => {
      const variant = p.variants?.[0] || {};
      const row = {
        SKU: p.sku,
        Nombre: p.name,
        Categoría: p.category,
        Subcategoría: p.subcategory,
        Marca: p.brand,
        Descripción: p.description,
        'Vendible por Peso': p.isSoldByWeight ? 'Sí' : 'No',
        'Unidad de Medida': p.unitOfMeasure,
        'Variante Nombre': variant?.name,
        'Variante SKU': variant?.sku,
        'Variante Precio Costo': variant?.costPrice,
        'Variante Precio Venta': variant?.basePrice,
      };

      productAttributeColumns.forEach(({ descriptor }) => {
        const headerLabel = descriptor.label
          ? `Atributo Producto (${descriptor.key}) - ${descriptor.label}`
          : `Atributo Producto (${descriptor.key})`;
        row[headerLabel] = (p.attributes && p.attributes[descriptor.key]) ?? '';
      });

      variantAttributeColumns.forEach(({ descriptor }) => {
        const headerLabel = descriptor.label
          ? `Atributo Variante (${descriptor.key}) - ${descriptor.label}`
          : `Atributo Variante (${descriptor.key})`;
        const variantAttrs =
          (variant && variant.attributes) || {};
        row[headerLabel] = variantAttrs[descriptor.key] ?? '';
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'productos.csv');
  };

  if (loading) return <div>Cargando productos...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
          <div className="flex justify-start items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Acciones en Lote</Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent>
              {hasDynamicTemplateColumns ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onSelect={handleDownloadTemplate}>
                      Descargar Plantilla
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs text-left space-y-1">
                    <p className="font-semibold">Plantilla adaptada a la vertical</p>
                    <p>
                      Incluye columnas <code>VariantSKU</code> y <code>{'productAttr_{clave}'}</code> / <code>{'variantAttr_{clave}'}</code> para los atributos configurados: {dynamicAttributeLabels.join(', ')}. Los nombres deben coincidir con la configuración del producto/variante.
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenuItem onSelect={handleDownloadTemplate}>
                  Descargar Plantilla
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => document.getElementById('bulk-upload-input').click()}>
                Importar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleExportExcel}>
                Exportar como Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCsv}>
                Exportar como CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            id="bulk-upload-input"
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
            onChange={handleBulkUpload}
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button id="add-product-button" size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><Plus className="h-5 w-5 mr-2" /> Agregar Producto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                <DialogDescription>Completa la información para crear un nuevo producto en el catálogo.</DialogDescription>
              </DialogHeader>

              {/* Product Type Selector */}
              <div className="px-6 py-4 border-b bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="productType" className="text-base font-semibold">Tipo de Producto *</Label>
                  <Select
                    value={newProduct.productType}
                    onValueChange={(value) => setNewProduct({ ...newProduct, productType: value })}
                  >
                    <SelectTrigger id="productType" className="w-full">
                      <SelectValue placeholder="Selecciona el tipo de producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Mercancía</div>
                            <div className="text-xs text-muted-foreground">Productos para venta directa</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="consumable">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Consumible</div>
                            <div className="text-xs text-muted-foreground">Vasos, bolsas, cubiertos, etc.</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="supply">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Suministro</div>
                            <div className="text-xs text-muted-foreground">Limpieza, oficina, mantenimiento</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecciona el tipo de producto para mostrar los campos relevantes
                  </p>
                </div>
              </div>

              <div className="space-y-6 py-4 px-6 overflow-y-auto flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                  <div className="md:col-span-1 space-y-2">
                    <Label>Imágenes (máx. 3)</Label>
                    <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50">
                      {newProduct.variant.images && newProduct.variant.images.length > 0 ? (
                         <img
                          src={newProduct.variant.images[selectedImageIndex]}
                          alt={`product-image-${selectedImageIndex}`}
                          className="h-full w-full object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                            e.target.onerror = null;
                          }}
                         />
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
                                className={`w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary/50 transition-all ${selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                onClick={(e) => {
                                  if (e.detail === 1) {
                                    // Single click - select image
                                    setSelectedImageIndex(index);
                                  } else if (e.detail === 2) {
                                    // Double click - open preview
                                    setPreviewImageSrc(image);
                                    setIsImagePreviewOpen(true);
                                  }
                                }}
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                                  e.target.onerror = null;
                                }}
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
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder={getDynamicPlaceholder('name', newProduct.productType)}
                    />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      placeholder={getDynamicPlaceholder('brand', newProduct.productType)}
                    />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU Principal</Label>
                    <Input
                      id="sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder={getDynamicPlaceholder('sku', newProduct.productType)}
                    />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Código de Barras (UPC) (Opcional)</Label>
                    <div className="flex items-center gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openBarcodeScanner({ scope: 'create' })}
                        title="Escanear código con cámara"
                      >
                        <Scan className="h-4 w-4" />
                        <span className="sr-only">Escanear código</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escanea con la cámara o usa una pistola USB enfocando este campo.
                    </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <TagInput
                      id="category"
                      value={newProduct.category}
                      onChange={(tags) => setNewProduct({ ...newProduct, category: tags })}
                      placeholder={getPlaceholder('category', 'Ej: Bebidas, Alimentos')}
                      helpText="Escribe una categoría y presiona coma (,) o Enter para agregar. Puedes agregar múltiples categorías para ayudar a la IA a encontrar productos más fácilmente."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub-categoría</Label>
                    <TagInput
                      id="subcategory"
                      value={newProduct.subcategory}
                      onChange={(tags) => setNewProduct({ ...newProduct, subcategory: tags })}
                      placeholder={getPlaceholder('subcategory', 'Ej: Gaseosas, Refrescos')}
                      helpText="Escribe una sub-categoría y presiona coma (,) o Enter para agregar. Esto facilita la búsqueda sin necesidad de ser experto."
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder={getDynamicPlaceholder('description', newProduct.productType)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="ingredients">{ingredientLabel}</Label>
                    <Textarea
                      id="ingredients"
                      value={newProduct.ingredients}
                      onChange={(e) => setNewProduct({ ...newProduct, ingredients: e.target.value })}
                      placeholder={isNonFoodRetailVertical ? 'Describe la composición del producto' : 'Lista de ingredientes'}
                    />
                  </div>
                  {productAttributes.length > 0 && (
                    <div className="col-span-2 border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium">Atributos del Producto</h4>
                        <p className="text-sm text-muted-foreground">
                          Personaliza campos específicos de la vertical activa.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productAttributes.map((attr) => (
                          <div key={attr.key} className="space-y-2">
                            <Label>
                              {attr.label}
                              {attr.required ? <span className="text-red-500"> *</span> : null}
                            </Label>
                            {renderAttributeControl(
                              attr,
                              newProduct.attributes?.[attr.key],
                              (rawValue) => handleProductAttributeChange(attr, rawValue),
                            )}
                            {attr.ui?.helperText && (
                              <p className="text-xs text-muted-foreground">{attr.ui.helperText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isNonFoodRetailVertical && (
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="isPerishable"
                        checked={newProduct.isPerishable}
                        onCheckedChange={(checked) =>
                          setNewProduct({ ...newProduct, isPerishable: checked })
                        }
                      />
                      <Label htmlFor="isPerishable">Es Perecedero</Label>
                    </div>
                  )}
                  {verticalConfig?.allowsWeight && (
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox id="isSoldByWeight" checked={newProduct.isSoldByWeight} onCheckedChange={(checked) => setNewProduct({...newProduct, isSoldByWeight: checked})} />
                      <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
                    </div>
                  )}
                  {!isNonFoodRetailVertical && (
                    <div className="space-y-2">
                      <Label htmlFor="unitOfMeasure">Unidad de Medida Base (Inventario)</Label>
                      <Select
                        value={newProduct.unitOfMeasure}
                        onValueChange={(value) =>
                          setNewProduct({ ...newProduct, unitOfMeasure: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={getDynamicPlaceholder('unitOfMeasure', newProduct.productType)} />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Esta es la unidad en la que se guardará el inventario
                      </p>
                    </div>
                  )}
                  {/* IVA solo para mercancía */}
                  {!isNonFoodRetailVertical && newProduct.productType === 'simple' && (
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="ivaApplicable"
                        checked={!newProduct.ivaApplicable}
                        onCheckedChange={(checked) =>
                          setNewProduct({ ...newProduct, ivaApplicable: !checked })
                        }
                      />
                      <Label htmlFor="ivaApplicable">Exento de IVA</Label>
                    </div>
                  )}
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

                {newProduct.inventoryConfig && (
                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Configuración de Inventario</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minimumStock">Stock Mínimo</Label>
                        <Input id="minimumStock" type="number" value={newProduct.inventoryConfig.minimumStock} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, minimumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maximumStock">Stock Máximo</Label>
                        <Input id="maximumStock" type="number" value={newProduct.inventoryConfig.maximumStock} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, maximumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderPoint">Punto de Reorden</Label>
                        <Input id="reorderPoint" type="number" value={newProduct.inventoryConfig.reorderPoint} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, reorderPoint: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderQuantity">Cantidad de Reorden</Label>
                        <Input id="reorderQuantity" type="number" value={newProduct.inventoryConfig.reorderQuantity} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, reorderQuantity: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sistema Global de Unidades de Medida - Solo para CONSUMABLES y SUPPLIES */}
                {(newProduct.productType === 'consumable' || newProduct.productType === 'supply') && (
                  <div className="col-span-2 border-t pt-4 mt-4">
                    <UnitTypeFields
                      unitTypeId={newProduct.unitTypeId}
                      defaultUnit={newProduct.defaultUnit}
                      purchaseUnit={newProduct.purchaseUnit}
                      stockUnit={newProduct.stockUnit}
                      consumptionUnit={newProduct.consumptionUnit}
                      onChange={(data) => setNewProduct({ ...newProduct, ...data })}
                      showConversions={true}
                      className="space-y-4"
                    />
                  </div>
                )}

                {/* Descuentos solo para mercancía */}
                {newProduct.productType === 'simple' && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">Descuentos por Volumen</h4>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulkDiscountEnabled"
                        checked={newProduct.pricingRules?.bulkDiscountEnabled || false}
                        onCheckedChange={(checked) =>
                          setNewProduct({
                            ...newProduct,
                            pricingRules: {
                              ...newProduct.pricingRules,
                              bulkDiscountEnabled: checked,
                              bulkDiscountRules: checked ? (newProduct.pricingRules?.bulkDiscountRules || []) : []
                            }
                          })
                        }
                      />
                      <Label htmlFor="bulkDiscountEnabled">Activar Descuentos por Volumen</Label>
                    </div>
                  </div>

                  {newProduct.pricingRules?.bulkDiscountEnabled && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Configura descuentos automáticos basados en la cantidad comprada
                      </p>
                      {(newProduct.pricingRules?.bulkDiscountRules || []).map((rule, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                            <Label>Cantidad Mínima</Label>
                            <Input
                              type="number"
                              min="1"
                              value={rule.minQuantity}
                              onChange={(e) => {
                                const rules = [...(newProduct.pricingRules?.bulkDiscountRules || [])];
                                rules[index] = {...rules[index], minQuantity: parseInt(e.target.value) || 1};
                                setNewProduct({
                                  ...newProduct,
                                  pricingRules: {...newProduct.pricingRules, bulkDiscountRules: rules}
                                });
                              }}
                              placeholder="Ej: 10"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label>Descuento (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={rule.discountPercentage}
                              onChange={(e) => {
                                const rules = [...(newProduct.pricingRules?.bulkDiscountRules || [])];
                                rules[index] = {...rules[index], discountPercentage: parseFloat(e.target.value) || 0};
                                setNewProduct({
                                  ...newProduct,
                                  pricingRules: {...newProduct.pricingRules, bulkDiscountRules: rules}
                                });
                              }}
                              placeholder="Ej: 10"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const rules = [...(newProduct.pricingRules?.bulkDiscountRules || [])];
                              rules.splice(index, 1);
                              setNewProduct({
                                ...newProduct,
                                pricingRules: {...newProduct.pricingRules, bulkDiscountRules: rules}
                              });
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const rules = [...(newProduct.pricingRules?.bulkDiscountRules || [])];
                          rules.push({ minQuantity: 1, discountPercentage: 0 });
                          setNewProduct({
                            ...newProduct,
                            pricingRules: {...newProduct.pricingRules, bulkDiscountRules: rules}
                          });
                        }}
                      >
                        + Agregar Regla de Descuento
                      </Button>
                    </div>
                  )}
                </div>
                )}

                {/* Promociones solo para mercancía */}
                {newProduct.productType === 'simple' && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">Promoción/Oferta Especial</h4>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasActivePromotion"
                        checked={newProduct.hasActivePromotion || false}
                        onCheckedChange={(checked) =>
                          setNewProduct({
                            ...newProduct,
                            hasActivePromotion: checked,
                          })
                        }
                      />
                      <Label htmlFor="hasActivePromotion">Activar Promoción</Label>
                    </div>
                  </div>

                  {newProduct.hasActivePromotion && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Configura una oferta temporal para este producto
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Porcentaje de Descuento (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={newProduct.promotion?.discountPercentage || 0}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                promotion: {
                                  ...newProduct.promotion,
                                  discountPercentage: parseFloat(e.target.value) || 0,
                                }
                              })
                            }
                            placeholder="Ej: 20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo de Promoción</Label>
                          <Select
                            value={newProduct.promotion?.reason || ''}
                            onValueChange={(value) =>
                              setNewProduct({
                                ...newProduct,
                                promotion: {
                                  ...newProduct.promotion,
                                  reason: value,
                                }
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promocion_temporal">Promoción Temporal</SelectItem>
                              <SelectItem value="liquidacion">Liquidación</SelectItem>
                              <SelectItem value="temporada">Oferta de Temporada</SelectItem>
                              <SelectItem value="lanzamiento">Lanzamiento</SelectItem>
                              <SelectItem value="black_friday">Black Friday</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Fecha de Inicio</Label>
                          <Input
                            type="date"
                            value={newProduct.promotion?.startDate ? new Date(newProduct.promotion.startDate).toISOString().split('T')[0] : ''}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                promotion: {
                                  ...newProduct.promotion,
                                  startDate: new Date(e.target.value),
                                }
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Duración (días) o Fecha de Fin</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Días"
                              value={newProduct.promotion?.durationDays || ''}
                              onChange={(e) => {
                                const days = parseInt(e.target.value) || 0;
                                const startDate = newProduct.promotion?.startDate || new Date();
                                const endDate = new Date(startDate);
                                endDate.setDate(endDate.getDate() + days);

                                setNewProduct({
                                  ...newProduct,
                                  promotion: {
                                    ...newProduct.promotion,
                                    durationDays: days,
                                    endDate: endDate,
                                  }
                                });
                              }}
                              className="w-24"
                            />
                            <Input
                              type="date"
                              value={newProduct.promotion?.endDate ? new Date(newProduct.promotion.endDate).toISOString().split('T')[0] : ''}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  promotion: {
                                    ...newProduct.promotion,
                                    endDate: new Date(e.target.value),
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="autoDeactivate"
                          checked={newProduct.promotion?.autoDeactivate !== false}
                          onCheckedChange={(checked) =>
                            setNewProduct({
                              ...newProduct,
                              promotion: {
                                ...newProduct.promotion,
                                autoDeactivate: checked,
                              }
                            })
                          }
                        />
                        <Label htmlFor="autoDeactivate">
                          Desactivar automáticamente cuando termine la fecha
                        </Label>
                      </div>

                      {newProduct.promotion?.discountPercentage > 0 && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                            Vista Previa de la Promoción
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {newProduct.promotion?.discountPercentage}% de descuento
                            {newProduct.promotion?.startDate && newProduct.promotion?.endDate && (
                              <> desde {new Date(newProduct.promotion.startDate).toLocaleDateString()} hasta {new Date(newProduct.promotion.endDate).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Unidades múltiples solo para mercancía en verticales de comida */}
                {!isNonFoodRetailVertical && newProduct.productType === 'simple' && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium">Unidades de Venta Múltiples</h4>
                      <p className="text-sm text-muted-foreground">Configura diferentes unidades de venta (kg, g, lb, cajas, etc.)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasMultipleSellingUnits"
                        checked={newProduct.hasMultipleSellingUnits}
                        onCheckedChange={(checked) => setNewProduct({...newProduct, hasMultipleSellingUnits: checked})}
                      />
                      <Label htmlFor="hasMultipleSellingUnits">Habilitar</Label>
                    </div>
                  </div>

                  {newProduct.hasMultipleSellingUnits && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">⚠️ IMPORTANTE - Unidad Base del Inventario:</p>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                        El inventario SIEMPRE se guarda en <span className="font-bold">"{newProduct.unitOfMeasure}"</span>.
                        El Factor de Conversión indica cuántas unidades base equivalen a 1 unidad de venta.
                      </p>
                      <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-semibold">Ejemplos:</p>
                        <p>• Si la unidad base es "gramos" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1000</span> (1 kg = 1000 g)</p>
                        <p>• Si la unidad base es "gramos" y vendes en "g": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 g = 1 g)</p>
                        <p>• Si la unidad base es "kg" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 kg = 1 kg)</p>
                        <p>• Si la unidad base es "unidad" y vendes en "caja de 24": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 caja = 24 unidades)</p>
                      </div>
                    </div>
                  )}

                  {newProduct.hasMultipleSellingUnits && (
                    <div className="space-y-4">
                      {newProduct.sellingUnits.map((unit, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Unidad {index + 1}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const units = [...newProduct.sellingUnits];
                                units.splice(index, 1);
                                setNewProduct({...newProduct, sellingUnits: units});
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label>Nombre</Label>
                              <Input
                                placeholder={getPlaceholder('sellingUnitName', 'Ej: Kilogramos')}
                                value={unit.name || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].name = e.target.value;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Abreviación</Label>
                              <Input
                                placeholder={getPlaceholder('sellingUnitAbbreviation', 'Ej: kg')}
                                value={unit.abbreviation || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].abbreviation = e.target.value;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                Factor Conversión
                                <span className="text-xs text-muted-foreground">(Cuántos {newProduct.unitOfMeasure} = 1 {unit.abbreviation || 'unidad'})</span>
                              </Label>
                              <Input
                                type="number"
                                step="0.001"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitConversion', 'Ej: 1000')}
                                value={
                                  unit.conversionFactorInput ??
                                  normalizeDecimalInput(unit.conversionFactor ?? '')
                                }
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const parsed = parseDecimalInput(rawValue);
                                    return {
                                      ...currentUnit,
                                      conversionFactorInput: rawValue,
                                      conversionFactor: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                                onBlur={() => {
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const normalizedInput = normalizeDecimalInput(currentUnit.conversionFactorInput ?? '');
                                    const parsed = parseDecimalInput(normalizedInput);
                                    return {
                                      ...currentUnit,
                                      conversionFactorInput: normalizedInput,
                                      conversionFactor: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                1 {unit.abbreviation || 'unidad'} = {parseDecimalInput(
                                  (unit.conversionFactorInput ?? unit.conversionFactor)
                                ) ?? 0} {newProduct.unitOfMeasure}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Precio/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitPrice', 'Ej: 20.00')}
                                value={
                                  unit.pricePerUnitInput ??
                                  normalizeDecimalInput(unit.pricePerUnit ?? '')
                                }
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const parsed = parseDecimalInput(rawValue);
                                    return {
                                      ...currentUnit,
                                      pricePerUnitInput: rawValue,
                                      pricePerUnit: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                                onBlur={() => {
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const normalizedInput = normalizeDecimalInput(currentUnit.pricePerUnitInput ?? '');
                                    const parsed = parseDecimalInput(normalizedInput);
                                    return {
                                      ...currentUnit,
                                      pricePerUnitInput: normalizedInput,
                                      pricePerUnit: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Costo/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitCost', 'Ej: 12.00')}
                                value={
                                  unit.costPerUnitInput ??
                                  normalizeDecimalInput(unit.costPerUnit ?? '')
                                }
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const parsed = parseDecimalInput(rawValue);
                                    return {
                                      ...currentUnit,
                                      costPerUnitInput: rawValue,
                                      costPerUnit: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                                onBlur={() => {
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const normalizedInput = normalizeDecimalInput(currentUnit.costPerUnitInput ?? '');
                                    const parsed = parseDecimalInput(normalizedInput);
                                    return {
                                      ...currentUnit,
                                      costPerUnitInput: normalizedInput,
                                      costPerUnit: parsed !== null ? parsed : null,
                                    };
                                  });
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cant. Mínima</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={getPlaceholder('sellingUnitMinQty', 'Ej: 0.5')}
                                value={unit.minimumQuantity || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].minimumQuantity = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Incremento</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={getPlaceholder('sellingUnitIncrement', 'Ej: 0.5')}
                                value={unit.incrementStep || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].incrementStep = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2 flex items-end">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`default-${index}`}
                                  checked={unit.isDefault || false}
                                  onCheckedChange={(checked) => {
                                    const units = newProduct.sellingUnits.map((u, i) => ({
                                      ...u,
                                      isDefault: i === index ? checked : false
                                    }));
                                    setNewProduct({...newProduct, sellingUnits: units});
                                  }}
                                />
                                <Label htmlFor={`default-${index}`}>Por defecto</Label>
                              </div>
                            </div>
                            <div className="space-y-2 flex items-end">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`active-${index}`}
                                  checked={unit.isActive !== false}
                                  onCheckedChange={(checked) => {
                                    const units = [...newProduct.sellingUnits];
                                    units[index].isActive = checked;
                                    setNewProduct({...newProduct, sellingUnits: units});
                                  }}
                                />
                                <Label htmlFor={`active-${index}`}>Activa</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewProduct({
                            ...newProduct,
                            sellingUnits: [...newProduct.sellingUnits, {
                              name: '',
                              abbreviation: '',
                              conversionFactor: 1,
                              conversionFactorInput: '1',
                              pricePerUnit: 0,
                              pricePerUnitInput: '',
                              costPerUnit: 0,
                              costPerUnitInput: '',
                              isActive: true,
                              isDefault: newProduct.sellingUnits.length === 0,
                              minimumQuantity: 0,
                              incrementStep: 0
                            }]
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Unidad
                      </Button>
                    </div>
                  )}
                </div>
                )}

                <div className="col-span-2 border-t pt-4 mt-4">
                  <h4 className="text-lg font-medium mb-4">Variante Inicial (Requerida)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variantName">Nombre Variante</Label>
                      <Input
                        id="variantName"
                        value={newProduct.variant.name}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            variant: { ...newProduct.variant, name: e.target.value },
                          })
                        }
                        placeholder={getPlaceholder('variantName', 'Ej: 1kg')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantSku">SKU Variante</Label>
                      <Input
                        id="variantSku"
                        value={newProduct.variant.sku}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            variant: { ...newProduct.variant, sku: e.target.value },
                          })
                        }
                        placeholder={getPlaceholder('variantSku', 'Ej: ARR-BLANCO-1KG')}
                      />
                    </div>
                    {!isNonFoodRetailVertical && (
                      <div className="space-y-2">
                        <Label htmlFor="variantUnit">Unidad</Label>
                        <Input
                          id="variantUnit"
                          value={newProduct.variant.unit}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              variant: { ...newProduct.variant, unit: e.target.value },
                            })
                          }
                          placeholder={getPlaceholder('variantUnit', 'Ej: kg, unidad')}
                        />
                      </div>
                    )}
                    {!isNonFoodRetailVertical && (
                      <div className="space-y-2">
                        <Label htmlFor="variantUnitSize">Tamaño Unidad</Label>
                        <Input
                          id="variantUnitSize"
                          type="number"
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
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="variantCostPrice">Precio Costo ($)</Label>
                      <Input
                        id="variantCostPrice"
                        type="number"
                        value={newProduct.variant.costPrice}
                        onFocus={() => {
                          if (newProduct.variant.costPrice === 0) {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: ''}});
                          }
                        }}
                        onChange={(e) => {
                          setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: e.target.value }});
                        }}
                        onBlur={() => {
                          const price = parseFloat(newProduct.variant.costPrice);
                          if (isNaN(price) || newProduct.variant.costPrice === '') {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: 0}});
                          } else {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: price}});
                          }
                        }}
                      />
                    </div>
                    {/* Precio de Venta solo para mercancía */}
                    {newProduct.productType === 'simple' && (
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
                    )}
                  </div>
                  {variantAttributes.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h5 className="text-base font-medium mb-4">Atributos de la Variante</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {variantAttributes.map((attr) => (
                          <div key={attr.key} className="space-y-2">
                            <Label>
                              {attr.label}
                              {attr.required ? <span className="text-red-500"> *</span> : null}
                            </Label>
                            {renderAttributeControl(
                              attr,
                              newProduct.variant?.attributes?.[attr.key],
                              (rawValue) => handleVariantAttributeChange(attr, rawValue),
                            )}
                            {attr.ui?.helperText && (
                              <p className="text-xs text-muted-foreground">{attr.ui.helperText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {supportsVariants && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-base font-medium">Variantes adicionales</h5>
                          <p className="text-sm text-muted-foreground">
                            {isNonFoodRetailVertical
                              ? 'Crea combinaciones adicionales (talla, color, etc.) para este producto.'
                              : 'Agrega presentaciones adicionales (tamaños, empaques, sabores, etc.) para este producto.'}
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addAdditionalVariant}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar variante
                        </Button>
                      </div>
                      {additionalVariants.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          El producto usará únicamente la variante inicial hasta que agregues más opciones.
                        </p>
                      )}
                      {additionalVariants.map((variant, index) => (
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
                                placeholder={
                                  getPlaceholder(
                                    'variantAdditionalSku',
                                    `Ej: ${newProduct.sku || 'SKU'}-VAR${index + 2}`,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Código de barras</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={variant.barcode}
                                  onChange={(e) => updateAdditionalVariantField(index, 'barcode', e.target.value)}
                                  placeholder="Opcional"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openBarcodeScanner({ scope: 'additional', index })}
                                  title="Escanear código con cámara"
                                >
                                  <Scan className="h-4 w-4" />
                                  <span className="sr-only">Escanear código</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Precio costo ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={variant.costPrice ?? 0}
                                onChange={(e) => updateAdditionalVariantField(index, 'costPrice', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Precio venta ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={variant.basePrice ?? 0}
                                onChange={(e) => updateAdditionalVariantField(index, 'basePrice', e.target.value)}
                              />
                            </div>
                          </div>
                          {variantAttributes.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                              <h6 className="text-sm font-medium mb-3">Atributos específicos</h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {variantAttributes.map((attr) => (
                                  <div key={attr.key} className="space-y-2">
                                    <Label>
                                      {attr.label}
                                      {attr.required ? <span className="text-red-500"> *</span> : null}
                                    </Label>
                                    {renderAttributeControl(
                                      attr,
                                      variant.attributes?.[attr.key],
                                      (rawValue) => handleAdditionalVariantAttributeChange(index, attr, rawValue),
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Configuración de Consumibles */}
                {newProduct.productType === 'consumable' && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <h4 className="text-lg font-medium mb-4">Configuración de Consumible</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="consumableType">Tipo de Consumible *</Label>
                        <Select
                          value={newProduct.consumableConfig.consumableType}
                          onValueChange={(value) => setNewProduct({
                            ...newProduct,
                            consumableConfig: { ...newProduct.consumableConfig, consumableType: value }
                          })}
                        >
                          <SelectTrigger id="consumableType">
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONSUMABLE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="defaultQuantityPerUse">Cantidad por Uso *</Label>
                        <Input
                          id="defaultQuantityPerUse"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newProduct.consumableConfig.defaultQuantityPerUse}
                          onChange={(e) => setNewProduct({
                            ...newProduct,
                            consumableConfig: {
                              ...newProduct.consumableConfig,
                              defaultQuantityPerUse: parseFloat(e.target.value) || 0
                            }
                          })}
                          placeholder="Ej: 1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isReusable"
                          checked={newProduct.consumableConfig.isReusable}
                          onCheckedChange={(checked) => setNewProduct({
                            ...newProduct,
                            consumableConfig: { ...newProduct.consumableConfig, isReusable: checked }
                          })}
                        />
                        <Label htmlFor="isReusable">¿Es Reusable?</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAutoDeducted"
                          checked={newProduct.consumableConfig.isAutoDeducted}
                          onCheckedChange={(checked) => setNewProduct({
                            ...newProduct,
                            consumableConfig: { ...newProduct.consumableConfig, isAutoDeducted: checked }
                          })}
                        />
                        <Label htmlFor="isAutoDeducted">Deducción Automática</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consumableNotes">Notas (Opcional)</Label>
                      <Textarea
                        id="consumableNotes"
                        value={newProduct.consumableConfig.notes}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          consumableConfig: { ...newProduct.consumableConfig, notes: e.target.value }
                        })}
                        placeholder="Notas adicionales sobre el consumible"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Configuración de Suministros */}
                {newProduct.productType === 'supply' && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <h4 className="text-lg font-medium mb-4">Configuración de Suministro</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplyCategory">Categoría *</Label>
                        <Select
                          value={newProduct.supplyConfig.supplyCategory}
                          onValueChange={(value) => setNewProduct({
                            ...newProduct,
                            supplyConfig: { ...newProduct.supplyConfig, supplyCategory: value }
                          })}
                        >
                          <SelectTrigger id="supplyCategory">
                            <SelectValue placeholder="Selecciona la categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLY_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplySubcategory">Subcategoría</Label>
                        <Input
                          id="supplySubcategory"
                          value={newProduct.supplyConfig.supplySubcategory}
                          onChange={(e) => setNewProduct({
                            ...newProduct,
                            supplyConfig: { ...newProduct.supplyConfig, supplySubcategory: e.target.value }
                          })}
                          placeholder="Ej: Detergentes"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="usageDepartment">Departamento de Uso</Label>
                        <Input
                          id="usageDepartment"
                          value={newProduct.supplyConfig.usageDepartment}
                          onChange={(e) => setNewProduct({
                            ...newProduct,
                            supplyConfig: { ...newProduct.supplyConfig, usageDepartment: e.target.value }
                          })}
                          placeholder="Ej: Cocina, Limpieza, Administración"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimatedMonthlyConsumption">Consumo Mensual Estimado</Label>
                        <Input
                          id="estimatedMonthlyConsumption"
                          type="number"
                          min="0"
                          value={newProduct.supplyConfig.estimatedMonthlyConsumption}
                          onChange={(e) => setNewProduct({
                            ...newProduct,
                            supplyConfig: {
                              ...newProduct.supplyConfig,
                              estimatedMonthlyConsumption: parseFloat(e.target.value) || 0
                            }
                          })}
                          placeholder="Ej: 10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requiresTracking"
                          checked={newProduct.supplyConfig.requiresTracking}
                          onCheckedChange={(checked) => setNewProduct({
                            ...newProduct,
                            supplyConfig: { ...newProduct.supplyConfig, requiresTracking: checked }
                          })}
                        />
                        <Label htmlFor="requiresTracking">Requiere Seguimiento</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requiresAuthorization"
                          checked={newProduct.supplyConfig.requiresAuthorization}
                          onCheckedChange={(checked) => setNewProduct({
                            ...newProduct,
                            supplyConfig: { ...newProduct.supplyConfig, requiresAuthorization: checked }
                          })}
                        />
                        <Label htmlFor="requiresAuthorization">Requiere Autorización</Label>
                      </div>
                    </div>

                    {/* Safety Information */}
                    <div className="border-t pt-4 mt-4">
                      <h5 className="text-base font-medium mb-3">Información de Seguridad</h5>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="requiresPPE"
                              checked={newProduct.supplyConfig.safetyInfo.requiresPPE}
                              onCheckedChange={(checked) => setNewProduct({
                                ...newProduct,
                                supplyConfig: {
                                  ...newProduct.supplyConfig,
                                  safetyInfo: { ...newProduct.supplyConfig.safetyInfo, requiresPPE: checked }
                                }
                              })}
                            />
                            <Label htmlFor="requiresPPE">Requiere EPP (Equipo de Protección Personal)</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="isHazardous"
                              checked={newProduct.supplyConfig.safetyInfo.isHazardous}
                              onCheckedChange={(checked) => setNewProduct({
                                ...newProduct,
                                supplyConfig: {
                                  ...newProduct.supplyConfig,
                                  safetyInfo: { ...newProduct.supplyConfig.safetyInfo, isHazardous: checked }
                                }
                              })}
                            />
                            <Label htmlFor="isHazardous">Material Peligroso</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="storageRequirements">Requisitos de Almacenamiento</Label>
                          <Textarea
                            id="storageRequirements"
                            value={newProduct.supplyConfig.safetyInfo.storageRequirements}
                            onChange={(e) => setNewProduct({
                              ...newProduct,
                              supplyConfig: {
                                ...newProduct.supplyConfig,
                                safetyInfo: {
                                  ...newProduct.supplyConfig.safetyInfo,
                                  storageRequirements: e.target.value
                                }
                              }
                            })}
                            placeholder="Ej: Mantener en lugar fresco y seco, alejado de fuentes de calor"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="handlingInstructions">Instrucciones de Manejo</Label>
                          <Textarea
                            id="handlingInstructions"
                            value={newProduct.supplyConfig.safetyInfo.handlingInstructions}
                            onChange={(e) => setNewProduct({
                              ...newProduct,
                              supplyConfig: {
                                ...newProduct.supplyConfig,
                                safetyInfo: {
                                  ...newProduct.supplyConfig.safetyInfo,
                                  handlingInstructions: e.target.value
                                }
                              }
                            })}
                            placeholder="Ej: Usar guantes al manipular, evitar contacto con la piel"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplyNotes">Notas (Opcional)</Label>
                      <Textarea
                        id="supplyNotes"
                        value={newProduct.supplyConfig.notes}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          supplyConfig: { ...newProduct.supplyConfig, notes: e.target.value }
                        })}
                        placeholder="Notas adicionales sobre el suministro"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddProduct}>Crear Producto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
      <Card>
        <CardHeader />
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={getPlaceholder('search', 'Buscar por nombre, SKU o marca...')}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="inactive">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Variantes</TableHead>
                  <TableHead>Promoción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product._id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.brand}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(product.category) ? product.category : [product.category]).filter(Boolean).map((cat, idx) => (
                          <Badge key={idx} variant="outline">{cat}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{product.variants.length}</TableCell>
                    <TableCell>
                      {product.hasActivePromotion && product.promotion?.isActive ? (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          -{product.promotion.discountPercentage}% OFF
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.isActive ?
                        <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/>Activo</Badge> :
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1"/>Inactivo</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          const productToEdit = JSON.parse(JSON.stringify(product));
                          if (!productToEdit.variants || productToEdit.variants.length === 0) {
                            productToEdit.variants = [{
                              name: 'Estándar',
                              basePrice: 0,
                              costPrice: 0,
                              attributes: {},
                            }];
                          } else {
                            productToEdit.variants = productToEdit.variants.map((variant) => ({
                              ...variant,
                              attributes: variant.attributes || {},
                            }));
                          }
                          if (!productToEdit.attributes) {
                            productToEdit.attributes = {};
                          }
                          if (!productToEdit.inventoryConfig) { // Defensive check
                            productToEdit.inventoryConfig = { minimumStock: 10, maximumStock: 100, reorderPoint: 20, reorderQuantity: 50, trackLots: true, trackExpiration: true, fefoEnabled: true };
                          }
                          if (productToEdit.isSoldByWeight === undefined) {
                            productToEdit.isSoldByWeight = false;
                          }
                          if (productToEdit.unitOfMeasure === undefined) {
                            productToEdit.unitOfMeasure = 'unidad';
                          }
                          if (productToEdit.hasMultipleSellingUnits === undefined) {
                            productToEdit.hasMultipleSellingUnits = false;
                          }
                          if (!productToEdit.sellingUnits) {
                            productToEdit.sellingUnits = [];
                          }
                          productToEdit.sellingUnits = productToEdit.sellingUnits.map((unit) => {
                            const conversionSource =
                              unit?.conversionFactorInput ?? unit?.conversionFactor ?? '';
                            const priceSource =
                              unit?.pricePerUnitInput ?? unit?.pricePerUnit ?? '';
                            const costSource =
                              unit?.costPerUnitInput ?? unit?.costPerUnit ?? '';
                            return {
                              ...unit,
                              conversionFactorInput: normalizeDecimalInput(conversionSource),
                              conversionFactor: parseDecimalInput(conversionSource),
                              pricePerUnitInput: normalizeDecimalInput(priceSource),
                              pricePerUnit: parseDecimalInput(priceSource),
                              costPerUnitInput: normalizeDecimalInput(costSource),
                              costPerUnit: parseDecimalInput(costSource),
                            };
                          });
                          productToEdit.category = normalizeStringList(productToEdit.category);
                          productToEdit.subcategory = normalizeStringList(productToEdit.subcategory);
                          setEditingProduct(productToEdit);
                          setIsEditDialogOpen(true);
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteProduct(product._id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredProducts.length} de {totalProducts} productos
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Label htmlFor="pageLimit" className="text-sm">Mostrar:</Label>
                <Select value={pageLimit.toString()} onValueChange={(value) => {
                  const parsed = parseInt(value, 10);
                  manualPageLimitRef.current = parsed;
                  setPageLimit(parsed);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>

                <div className="flex items-center space-x-1">
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Producto: {editingProduct.name}</DialogTitle>
              <DialogDescription>Modifica la información del producto y sus precios.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Producto</Label>
                <Input id="edit-name" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoría</Label>
                <TagInput
                  id="edit-category"
                  value={Array.isArray(editingProduct.category) ? editingProduct.category : (editingProduct.category ? [editingProduct.category] : [])}
                  onChange={(tags) => setEditingProduct({...editingProduct, category: tags})}
                  placeholder="Ej: Bebidas, Alimentos"
                  helpText="Escribe una categoría y presiona coma (,) o Enter para agregar. Puedes agregar múltiples categorías para ayudar a la IA a encontrar productos más fácilmente."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subcategory">Sub-categoría</Label>
                <TagInput
                  id="edit-subcategory"
                  value={Array.isArray(editingProduct.subcategory) ? editingProduct.subcategory : (editingProduct.subcategory ? [editingProduct.subcategory] : [])}
                  onChange={(tags) => setEditingProduct({...editingProduct, subcategory: tags})}
                  placeholder="Ej: Gaseosas, Refrescos"
                  helpText="Escribe una sub-categoría y presiona coma (,) o Enter para agregar. Esto facilita la búsqueda sin necesidad de ser experto."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Input id="edit-brand" value={editingProduct.brand} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU base</Label>
                <Input
                  id="edit-sku"
                  value={editingProduct.sku}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Este SKU identifica al producto dentro del sistema y no puede modificarse. Actualiza los SKU y códigos de barras desde la sección de variantes.
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea id="edit-description" value={editingProduct.description} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-ingredients">{ingredientLabel}</Label>
                <Textarea
                  id="edit-ingredients"
                  value={editingProduct.ingredients}
                  onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                  placeholder={isNonFoodRetailVertical ? 'Describe la composición del producto' : 'Lista de ingredientes'}
                />
              </div>
              {productAttributes.length > 0 && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">Atributos del Producto</h4>
                    <p className="text-sm text-muted-foreground">
                      Se guardarán en la ficha del producto.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productAttributes.map((attr) => (
                      <div key={attr.key} className="space-y-2">
                        <Label>
                          {attr.label}
                          {attr.required ? <span className="text-red-500"> *</span> : null}
                        </Label>
                        {renderAttributeControl(
                          attr,
                          editingProduct.attributes?.[attr.key],
                          (rawValue) => handleEditProductAttributeChange(attr, rawValue),
                        )}
                        {attr.ui?.helperText && (
                          <p className="text-xs text-muted-foreground">{attr.ui.helperText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verticalConfig?.allowsWeight && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="edit-isSoldByWeight" checked={editingProduct.isSoldByWeight} onCheckedChange={(checked) => setEditingProduct({...editingProduct, isSoldByWeight: checked})} />
                  <Label htmlFor="edit-isSoldByWeight">Vendido por Peso</Label>
                </div>
              )}

              {!isNonFoodRetailVertical && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="edit-ivaApplicable"
                    checked={!editingProduct.ivaApplicable}
                    onCheckedChange={(checked) =>
                      setEditingProduct({ ...editingProduct, ivaApplicable: !checked })
                    }
                  />
                  <Label htmlFor="edit-ivaApplicable">Exento de IVA</Label>
                </div>
              )}

              {!isNonFoodRetailVertical && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="edit-isPerishable"
                    checked={editingProduct.isPerishable}
                    onCheckedChange={(checked) =>
                      setEditingProduct({ ...editingProduct, isPerishable: checked })
                    }
                  />
                  <Label htmlFor="edit-isPerishable">Es Perecedero</Label>
                </div>
              )}

              {!isNonFoodRetailVertical && (
                <div className="space-y-2">
                  <Label htmlFor="edit-unitOfMeasure">Unidad de Medida Base (Inventario)</Label>
                  <Select
                    value={editingProduct.unitOfMeasure}
                    onValueChange={(value) =>
                      setEditingProduct({ ...editingProduct, unitOfMeasure: value })
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
                  <p className="text-xs text-muted-foreground">
                    Esta es la unidad en la que se guardará el inventario
                  </p>
                </div>
              )}

              {!isNonFoodRetailVertical && editingProduct.isPerishable && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-shelfLifeDays">Vida Útil (días)</Label>
                    <Input
                      id="edit-shelfLifeDays"
                      type="number"
                      value={editingProduct.shelfLifeDays || 0}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          shelfLifeDays: parseInt(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-storageTemperature">Temperatura de Almacenamiento</Label>
                    <Select
                      value={editingProduct.storageTemperature || 'ambiente'}
                      onValueChange={(value) =>
                        setEditingProduct({ ...editingProduct, storageTemperature: value })
                      }
                    >
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

              {editingProduct.inventoryConfig && (
                <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Configuración de Inventario</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-minimumStock">Stock Mínimo</Label>
                        <Input id="edit-minimumStock" type="number" value={editingProduct.inventoryConfig.minimumStock} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, minimumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maximumStock">Stock Máximo</Label>
                        <Input id="edit-maximumStock" type="number" value={editingProduct.inventoryConfig.maximumStock} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, maximumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderPoint">Punto de Reorden</Label>
                        <Input id="edit-reorderPoint" type="number" value={editingProduct.inventoryConfig.reorderPoint} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, reorderPoint: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderQuantity">Cantidad de Reorden</Label>
                        <Input id="edit-reorderQuantity" type="number" value={editingProduct.inventoryConfig.reorderQuantity} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, reorderQuantity: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                </div>
              )}

              <div className="col-span-2 border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">Descuentos por Volumen</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-bulkDiscountEnabled"
                      checked={editingProduct.pricingRules?.bulkDiscountEnabled || false}
                      onCheckedChange={(checked) =>
                        setEditingProduct({
                          ...editingProduct,
                          pricingRules: {
                            ...(editingProduct.pricingRules || {}),
                            bulkDiscountEnabled: checked,
                            bulkDiscountRules: checked ? (editingProduct.pricingRules?.bulkDiscountRules || []) : []
                          }
                        })
                      }
                    />
                    <Label htmlFor="edit-bulkDiscountEnabled">Activar Descuentos por Volumen</Label>
                  </div>
                </div>

                {editingProduct.pricingRules?.bulkDiscountEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Configura descuentos automáticos basados en la cantidad comprada
                    </p>
                    {(editingProduct.pricingRules?.bulkDiscountRules || []).map((rule, index) => (
                      <div key={index} className="flex gap-3 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Cantidad Mínima</Label>
                          <Input
                            type="number"
                            min="1"
                            value={rule.minQuantity}
                            onChange={(e) => {
                              const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
                              rules[index] = {...rules[index], minQuantity: parseInt(e.target.value) || 1};
                              setEditingProduct({
                                ...editingProduct,
                                pricingRules: {...editingProduct.pricingRules, bulkDiscountRules: rules}
                              });
                            }}
                            placeholder="Ej: 10"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Descuento (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={rule.discountPercentage}
                            onChange={(e) => {
                              const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
                              rules[index] = {...rules[index], discountPercentage: parseFloat(e.target.value) || 0};
                              setEditingProduct({
                                ...editingProduct,
                                pricingRules: {...editingProduct.pricingRules, bulkDiscountRules: rules}
                              });
                            }}
                            placeholder="Ej: 10"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
                            rules.splice(index, 1);
                            setEditingProduct({
                              ...editingProduct,
                              pricingRules: {...editingProduct.pricingRules, bulkDiscountRules: rules}
                            });
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const rules = [...(editingProduct.pricingRules?.bulkDiscountRules || [])];
                        rules.push({ minQuantity: 1, discountPercentage: 0 });
                        setEditingProduct({
                          ...editingProduct,
                          pricingRules: {...editingProduct.pricingRules, bulkDiscountRules: rules}
                        });
                      }}
                    >
                      + Agregar Regla de Descuento
                    </Button>
                  </div>
                )}
              </div>

              {/* Sección de Promociones/Ofertas en Edit */}
              <div className="col-span-2 border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">Promoción/Oferta Especial</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-hasActivePromotion"
                      checked={editingProduct.hasActivePromotion || false}
                      onCheckedChange={(checked) =>
                        setEditingProduct({
                          ...editingProduct,
                          hasActivePromotion: checked,
                        })
                      }
                    />
                    <Label htmlFor="edit-hasActivePromotion">Activar Promoción</Label>
                  </div>
                </div>

                {editingProduct.hasActivePromotion && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configura una oferta temporal para este producto
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Porcentaje de Descuento (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editingProduct.promotion?.discountPercentage || 0}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              promotion: {
                                ...(editingProduct.promotion || {}),
                                discountPercentage: parseFloat(e.target.value) || 0,
                              }
                            })
                          }
                          placeholder="Ej: 20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Promoción</Label>
                        <Select
                          value={editingProduct.promotion?.reason || ''}
                          onValueChange={(value) =>
                            setEditingProduct({
                              ...editingProduct,
                              promotion: {
                                ...(editingProduct.promotion || {}),
                                reason: value,
                              }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="promocion_temporal">Promoción Temporal</SelectItem>
                            <SelectItem value="liquidacion">Liquidación</SelectItem>
                            <SelectItem value="temporada">Oferta de Temporada</SelectItem>
                            <SelectItem value="lanzamiento">Lanzamiento</SelectItem>
                            <SelectItem value="black_friday">Black Friday</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha de Inicio</Label>
                        <Input
                          type="date"
                          value={editingProduct.promotion?.startDate ? new Date(editingProduct.promotion.startDate).toISOString().split('T')[0] : ''}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              promotion: {
                                ...(editingProduct.promotion || {}),
                                startDate: new Date(e.target.value),
                              }
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Duración (días) o Fecha de Fin</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Días"
                            value={editingProduct.promotion?.durationDays || ''}
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || 0;
                              const startDate = editingProduct.promotion?.startDate || new Date();
                              const endDate = new Date(startDate);
                              endDate.setDate(endDate.getDate() + days);

                              setEditingProduct({
                                ...editingProduct,
                                promotion: {
                                  ...(editingProduct.promotion || {}),
                                  durationDays: days,
                                  endDate: endDate,
                                }
                              });
                            }}
                            className="w-24"
                          />
                          <Input
                            type="date"
                            value={editingProduct.promotion?.endDate ? new Date(editingProduct.promotion.endDate).toISOString().split('T')[0] : ''}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                promotion: {
                                  ...(editingProduct.promotion || {}),
                                  endDate: new Date(e.target.value),
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-autoDeactivate"
                        checked={editingProduct.promotion?.autoDeactivate !== false}
                        onCheckedChange={(checked) =>
                          setEditingProduct({
                            ...editingProduct,
                            promotion: {
                              ...(editingProduct.promotion || {}),
                              autoDeactivate: checked,
                            }
                          })
                        }
                      />
                      <Label htmlFor="edit-autoDeactivate">
                        Desactivar automáticamente cuando termine la fecha
                      </Label>
                    </div>

                    {editingProduct.promotion?.discountPercentage > 0 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          Vista Previa de la Promoción
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {editingProduct.promotion?.discountPercentage}% de descuento
                          {editingProduct.promotion?.startDate && editingProduct.promotion?.endDate && (
                            <> desde {new Date(editingProduct.promotion.startDate).toLocaleDateString()} hasta {new Date(editingProduct.promotion.endDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isNonFoodRetailVertical && (
              <div className="col-span-2 border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium">Unidades de Venta Múltiples</h4>
                    <p className="text-sm text-muted-foreground">Configura diferentes unidades de venta (kg, g, lb, cajas, etc.)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-hasMultipleSellingUnits"
                      checked={editingProduct.hasMultipleSellingUnits || false}
                      onCheckedChange={(checked) => {
                        setEditingProduct({
                          ...editingProduct,
                          hasMultipleSellingUnits: checked,
                          sellingUnits: checked ? (editingProduct.sellingUnits || []) : []
                        });
                      }}
                    />
                    <Label htmlFor="edit-hasMultipleSellingUnits">Habilitar</Label>
                  </div>
                </div>

                {editingProduct.hasMultipleSellingUnits && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">⚠️ IMPORTANTE - Unidad Base del Inventario:</p>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                      El inventario SIEMPRE se guarda en <span className="font-bold">"{editingProduct.unitOfMeasure}"</span>.
                      El Factor de Conversión indica cuántas unidades base equivalen a 1 unidad de venta.
                    </p>
                    <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                      <p className="font-semibold">Ejemplos:</p>
                      <p>• Si la unidad base es "gramos" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1000</span> (1 kg = 1000 g)</p>
                      <p>• Si la unidad base es "gramos" y vendes en "g": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 g = 1 g)</p>
                      <p>• Si la unidad base es "kg" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 kg = 1 kg)</p>
                      <p>• Si la unidad base es "unidad" y vendes en "caja de 24": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 caja = 24 unidades)</p>
                    </div>
                  </div>
                )}

                {editingProduct.hasMultipleSellingUnits && (
                  <div className="space-y-4">
                    {(editingProduct.sellingUnits || []).map((unit, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">Unidad {index + 1}</h5>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const units = [...editingProduct.sellingUnits];
                              units.splice(index, 1);
                              setEditingProduct({...editingProduct, sellingUnits: units});
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                              <Input
                                placeholder={getPlaceholder('sellingUnitName', 'Ej: Kilogramos')}
                              value={unit.name || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].name = e.target.value;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Abreviación</Label>
                              <Input
                                placeholder={getPlaceholder('sellingUnitAbbreviation', 'Ej: kg')}
                              value={unit.abbreviation || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].abbreviation = e.target.value;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              Factor Conversión
                              <span className="text-xs text-muted-foreground">(Cuántos {editingProduct.unitOfMeasure} = 1 {unit.abbreviation || 'unidad'})</span>
                            </Label>
                              <Input
                                type="number"
                                step="0.001"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitConversion', 'Ej: 1000')}
                              value={
                                unit.conversionFactorInput ??
                                normalizeDecimalInput(unit.conversionFactor ?? '')
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const parsed = parseDecimalInput(rawValue);
                                  return {
                                    ...currentUnit,
                                    conversionFactorInput: rawValue,
                                    conversionFactor: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                              onBlur={() => {
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const normalizedInput = normalizeDecimalInput(currentUnit.conversionFactorInput ?? '');
                                  const parsed = parseDecimalInput(normalizedInput);
                                  return {
                                    ...currentUnit,
                                    conversionFactorInput: normalizedInput,
                                    conversionFactor: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              1 {unit.abbreviation || 'unidad'} = {parseDecimalInput(
                                (unit.conversionFactorInput ?? unit.conversionFactor)
                              ) ?? 0} {editingProduct.unitOfMeasure}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Precio/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitPrice', 'Ej: 20.00')}
                              value={
                                unit.pricePerUnitInput ??
                                normalizeDecimalInput(unit.pricePerUnit ?? '')
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const parsed = parseDecimalInput(rawValue);
                                  return {
                                    ...currentUnit,
                                    pricePerUnitInput: rawValue,
                                    pricePerUnit: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                              onBlur={() => {
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const normalizedInput = normalizeDecimalInput(currentUnit.pricePerUnitInput ?? '');
                                  const parsed = parseDecimalInput(normalizedInput);
                                  return {
                                    ...currentUnit,
                                    pricePerUnitInput: normalizedInput,
                                    pricePerUnit: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Costo/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitCost', 'Ej: 12.00')}
                              value={
                                unit.costPerUnitInput ??
                                normalizeDecimalInput(unit.costPerUnit ?? '')
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const parsed = parseDecimalInput(rawValue);
                                  return {
                                    ...currentUnit,
                                    costPerUnitInput: rawValue,
                                    costPerUnit: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                              onBlur={() => {
                                const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                  if (unitIndex !== index) {
                                    return currentUnit;
                                  }
                                  const normalizedInput = normalizeDecimalInput(currentUnit.costPerUnitInput ?? '');
                                  const parsed = parseDecimalInput(normalizedInput);
                                  return {
                                    ...currentUnit,
                                    costPerUnitInput: normalizedInput,
                                    costPerUnit: parsed !== null ? parsed : null,
                                  };
                                });
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cant. Mínima</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={getPlaceholder('sellingUnitMinQty', 'Ej: 0.5')}
                              value={unit.minimumQuantity || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].minimumQuantity = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Incremento</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={getPlaceholder('sellingUnitIncrement', 'Ej: 0.5')}
                              value={unit.incrementStep || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].incrementStep = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-default-${index}`}
                                checked={unit.isDefault || false}
                                onCheckedChange={(checked) => {
                                  const units = editingProduct.sellingUnits.map((u, i) => ({
                                    ...u,
                                    isDefault: i === index ? checked : false
                                  }));
                                  setEditingProduct({...editingProduct, sellingUnits: units});
                                }}
                              />
                              <Label htmlFor={`edit-default-${index}`}>Por defecto</Label>
                            </div>
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-active-${index}`}
                                checked={unit.isActive !== false}
                                onCheckedChange={(checked) => {
                                  const units = [...editingProduct.sellingUnits];
                                  units[index].isActive = checked;
                                  setEditingProduct({...editingProduct, sellingUnits: units});
                                }}
                              />
                              <Label htmlFor={`edit-active-${index}`}>Activa</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProduct({
                          ...editingProduct,
                          sellingUnits: [...(editingProduct.sellingUnits || []), {
                            name: '',
                            abbreviation: '',
                            conversionFactor: 1,
                            conversionFactorInput: '1',
                            pricePerUnit: 0,
                            pricePerUnitInput: '',
                            costPerUnit: 0,
                            costPerUnitInput: '',
                            isActive: true,
                            isDefault: (editingProduct.sellingUnits || []).length === 0,
                            minimumQuantity: 0,
                            incrementStep: 0
                          }]
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Unidad
                    </Button>
                  </div>
                )}
              </div>
              )}
              
              <div className="col-span-2 border-t pt-4 mt-4 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">Variantes</h4>
                    <p className="text-sm text-muted-foreground">
                      Edita los datos de cada variante. Los cambios se guardarán al confirmar.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addEditingVariant}>
                    <Plus className="h-4 w-4 mr-2" /> Agregar variante
                  </Button>
                </div>

                {editingProduct.variants.map((variant, index) => (
                  <div key={variant._id || index} className="border rounded-lg bg-muted/15 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h5 className="text-base font-medium">Variante {index + 1}</h5>
                        <p className="text-xs text-muted-foreground">
                          SKU actual: {variant.sku || 'Sin SKU definido'}
                        </p>
                      </div>
                      {editingProduct.variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditingVariant(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar variante</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => handleEditVariantFieldChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => handleEditVariantFieldChange(index, 'sku', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Código de barras</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={variant.barcode || ''}
                            onChange={(e) => handleEditVariantFieldChange(index, 'barcode', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openBarcodeScanner({ scope: 'edit', index })}
                            title="Escanear código con cámara"
                          >
                            <Scan className="h-4 w-4" />
                            <span className="sr-only">Escanear código</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {!isNonFoodRetailVertical && (
                        <div className="space-y-2">
                          <Label>Unidad</Label>
                          <Input
                            value={variant.unit || ''}
                            onChange={(e) => handleEditVariantFieldChange(index, 'unit', e.target.value)}
                          />
                        </div>
                      )}
                      {!isNonFoodRetailVertical && (
                        <div className="space-y-2">
                          <Label>Tamaño de unidad</Label>
                          <Input
                            type="number"
                            value={variant.unitSize ?? 0}
                            onChange={(e) => handleEditVariantFieldChange(index, 'unitSize', e.target.value)}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Precio costo ($)</Label>
                        <Input
                          type="number"
                          value={variant.costPrice ?? 0}
                          onChange={(e) => handleEditVariantFieldChange(index, 'costPrice', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio venta ($)</Label>
                        <Input
                          type="number"
                          value={variant.basePrice ?? 0}
                          onChange={(e) => handleEditVariantFieldChange(index, 'basePrice', e.target.value)}
                        />
                      </div>
                    </div>

                    {variantAttributes.length > 0 && (
                      <div className="border-t pt-4 mt-4">
                        <h6 className="text-sm font-medium mb-3">Atributos específicos</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {variantAttributes.map((attr) => (
                            <div key={`${index}-${attr.key}`} className="space-y-2">
                              <Label>
                                {attr.label}
                                {attr.required ? <span className="text-red-500"> *</span> : null}
                              </Label>
                              {renderAttributeControl(
                                attr,
                                variant.attributes?.[attr.key],
                                (rawValue) => handleEditVariantAttributeChange(index, attr, rawValue),
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4 mt-4">
                      <Label>Imágenes (máx. 3)</Label>
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleEditImageUpload(index, e)}
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(variant.images || []).map((image, imageIdx) => (
                          <div key={imageIdx} className="relative">
                            <img
                              src={image}
                              alt={`variant-${index}-image-${imageIdx}`}
                              className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary/50 transition-all"
                              onClick={() => {
                                setPreviewImageSrc(image);
                                setIsImagePreviewOpen(true);
                              }}
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                                e.target.onerror = null; // Prevent infinite loop
                              }}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-0 right-0"
                              onClick={() => handleEditRemoveImage(index, imageIdx)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateProduct}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <BarcodeScannerDialog
        open={isBarcodeDialogOpen}
        onOpenChange={(open) => {
          setIsBarcodeDialogOpen(open);
          if (!open) {
            setBarcodeCaptureTarget(null);
          }
        }}
        onDetected={handleBarcodeDetected}
        description="Usa la cámara del dispositivo o un lector USB para rellenar el campo de código seleccionado."
      />

      {/* Diálogo de Previsualización de Importación */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Previsualización de Importación de Productos</DialogTitle>
            <DialogDescription>
              Se encontraron {previewData.length} productos para crear. Revisa los datos antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {previewHeaders.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header] || '')}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmImport}>Confirmar Importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Preview de Imagen */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
            <DialogDescription>
              Haz click fuera de la imagen o presiona ESC para cerrar
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-6 pt-0 max-h-[80vh]">
            <img
              src={previewImageSrc}
              alt="Vista previa"
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCI+SW1hZ2VuIG5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+';
                e.target.onerror = null;
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsManagement;
