import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu.jsx';
import { getXLSX } from '@/lib/xlsxLazy';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import InlineEditableCell from './inline-edit/InlineEditableCell';
import ProductVariantsPopover from './inline-edit/ProductVariantsPopover';
import SellingUnitsPopover from './inline-edit/SellingUnitsPopover';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { toast } from 'sonner';
import { fetchApi } from '../lib/api';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { useInventoryCache } from '@/hooks/useInventoryCache';
import { useConsumables } from '@/hooks/useConsumables';
import { useSupplies } from '@/hooks/useSupplies';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { UnitTypeFields } from './UnitTypes';
import { BarcodeScannerDialog } from '@/components/BarcodeScannerDialog.jsx';
import { CONSUMABLE_TYPES, SUPPLY_CATEGORIES } from '@/types/consumables';
import { TagInput } from '@/components/ui/tag-input.jsx';
import { ShelfLabelWizard } from './inventory/ShelfLabelWizard';
import { PricingStrategySelector } from '@/components/PricingStrategySelector.jsx';
import { ProductPricingAccordion } from '@/components/ProductPricingAccordion.jsx';
import { ProductPriceListManager } from '@/components/ProductPriceListManager.jsx';
import { PriceListsManager } from '@/components/PriceListsManager.jsx';
import { VolumeDiscountsManager } from '@/components/VolumeDiscountsManager.jsx';
import { LocationPricingManager } from '@/components/LocationPricingManager.jsx';
import { usePricingCalculator } from '@/hooks/usePricingCalculator';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  X,
  Layers,
  Wrench,
  Scan,
  ArrowRightLeft,
  Factory,
  Camera,
  Loader2,
  Printer,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  FileSpreadsheet,
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
// TagInput imported from '@/components/ui/tag-input.jsx'

const createVariantTemplate = (options = {}) => {
  const { name = '', unit = 'unidad' } = options;
  return {
    name,
    sku: '',
    barcode: '',
    unit,
    unitSize: 1,
    basePrice: 0,
    wholesalePrice: 0,
    costPrice: 0,
    pricingStrategy: {
      mode: 'manual',
      autoCalculate: false,
      markupPercentage: 30,
      marginPercentage: 25,
    },
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
  units
    .filter((unit) => unit && (unit.name || unit.abbreviation)) // Filter out units without name or abbreviation
    .map((unit) => {
      const {
        conversionFactorInput,
        pricePerUnitInput,
        costPerUnitInput,
        ...rest
      } = unit || {};

      // INVERSION LOGIC:
      // Case A: User modified input (conversionFactorInput is defined) -> Input is "Units Per Base" -> Factor = 1 / Input
      // Case B: User did NOT modify (conversionFactorInput is undefined) -> Keep existing conversionFactor

      let parsedConversion = 0;

      if (conversionFactorInput !== undefined) {
        const parsedInput = parseDecimalInput(conversionFactorInput) ?? 0;
        // Calculate multiplier (1/x) for backend
        parsedConversion = parsedInput > 0 ? (1 / parsedInput) : 0;
      } else {
        // Keep existing factor if untouched
        parsedConversion = rest?.conversionFactor ?? 0;
      }

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
        // Save the multiplier (0.05) to DB, but keep the input (20) if needed for immediate UI
        conversionFactor: parsedConversion,
        pricePerUnit: parsedPrice,
        costPerUnit: parsedCost,
        minimumQuantity: Number(rest?.minimumQuantity) || 0,
        incrementStep: Number(rest?.incrementStep) || 0,
        isSoldByWeight: rest.isSoldByWeight || false,
      };
    });

const SHELF_LIFE_MULTIPLIERS = { days: 1, months: 30, years: 365 };
const shelfLifeValueToDays = (value, unit) => Math.round((Number(value) || 0) * (SHELF_LIFE_MULTIPLIERS[unit] || 1));
const shelfLifeDaysToValue = (days, unit) => {
  const d = Number(days) || 0;
  const m = SHELF_LIFE_MULTIPLIERS[unit] || 1;
  return m === 1 ? d : Math.round((d / m) * 100) / 100;
};

const initialNewProductState = {
  productType: 'simple', // 'simple', 'consumable', 'supply'
  sku: '',
  name: '',
  initialInventoryQuantity: 0,
  initialInventoryWarehouseId: '', // empty = backend uses tenant default warehouse
  category: [],
  subcategory: [],
  brand: '',
  origin: '',
  description: '',
  ingredients: '',
  isPerishable: false,
  sendToKitchen: true, // Default to true for restaurant products
  shelfLifeDays: 0,
  shelfLifeUnit: 'days',
  shelfLifeValue: 0,
  storageTemperature: 'ambiente',
  ivaApplicable: true,
  ivaRate: 16, // Default to standard rate (16%) — Venezuela IVA general
  taxCategory: 'general',
  isSoldByWeight: false,
  unitOfMeasure: 'unidad',
  hasMultipleSellingUnits: false,
  hasAdditionalVariants: false,
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
    wholesaleEnabled: false,
    wholesaleMinQuantity: 1,
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

function ProductsManagement({ defaultProductType = 'simple', showSalesFields = true }) {
  const [ConfirmDialog, confirm] = useConfirm();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const lastFetchRef = useRef('');
  const abortControllerRef = useRef(null);
  // Ref to detect filter/search changes so we reset to page 1 only when they actually change.
  // Must match ALL fields compared in the effect below, otherwise undefined !== value
  // triggers a false "filtersChanged" on first run and resets pagination unexpectedly.
  const prevFiltersRef = useRef({
    searchTerm: '',
    statusFilter: 'all',
    filterCategory: 'all',
    defaultProductType,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProductState);
  // Warehouses for Stock Inicial selector in create dialog
  const { flags: featureFlags } = useFeatureFlags();
  const multiWarehouseEnabled = featureFlags?.MULTI_WAREHOUSE;
  const [warehouses, setWarehouses] = useState([]);
  useEffect(() => {
    if (!isAddDialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi('/warehouses');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (cancelled) return;
        setWarehouses(list);
        // Pre-select default warehouse (isDefault=true) or first active
        const defaultWh = list.find((w) => w.isDefault) || list.find((w) => w.isActive !== false);
        if (defaultWh && !newProduct.initialInventoryWarehouseId) {
          setNewProduct((prev) => ({
            ...prev,
            initialInventoryWarehouseId: defaultWh._id || defaultWh.id,
          }));
        }
      } catch (err) {
        console.error('Error loading warehouses for create dialog:', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddDialogOpen]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const defaultProductColumns = {
    sku: true,
    name: true,
    brand: true,
    category: true,
    isSoldByWeight: true,
    price: true,
    cost: true,
    wholesalePrice: false,
    variants: true,
    promotion: true,
    status: true,
    actions: true
  };
  const [visibleColumns, setVisibleColumnsRaw] = useState(() => {
    try {
      const saved = localStorage.getItem('smartkubik_prod_columns');
      if (saved) return { ...defaultProductColumns, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaultProductColumns;
  });
  const setVisibleColumns = (updater) => {
    setVisibleColumnsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('smartkubik_prod_columns', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [additionalVariants, setAdditionalVariants] = useState([]);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [barcodeCaptureTarget, setBarcodeCaptureTarget] = useState(null);
  const [isLabelScanning, setIsLabelScanning] = useState(false);
  const [labelScanResult, setLabelScanResult] = useState(null);
  const labelFileRef = useRef(null);
  const [isLabelWizardOpen, setIsLabelWizardOpen] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  // Tracks which variants have the "advanced pricing" toggle expanded.
  // Keyed by variant SKU. Auto-set true on dialog open if variant already
  // has advanced data (preserves visibility when editing existing config).
  const [advancedPricingExpanded, setAdvancedPricingExpanded] = useState({});
  const dragImageIndex = useRef(null);
  const manualPageLimitRef = useRef(DEFAULT_PAGE_LIMIT);

  // Estados para importación masiva
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  // Estados para preview de imágenes
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');

  // Estados para exportación
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx'); // 'xlsx' or 'csv'

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

  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateInventoryData } = useInventoryCache();
  const navigate = useNavigate();

  // Get vertical directly from tenant (more reliable than verticalConfig)
  const tenantVertical = tenant?.vertical || tenant?.verticalProfile?.key || verticalConfig?.baseVertical;

  // Quick Create draft autosave: persists newProduct to localStorage so the
  // user does not lose work on accidental close/refresh. Tenant-scoped key,
  // 24h TTL, debounced 1s on every change while the dialog is open.
  const draftKey = tenant?._id ? `productCreateDraft:${tenant._id}` : null;
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftPromptShown, setDraftPromptShown] = useState(false);

  // Autosave: debounced 1s while dialog is open
  useEffect(() => {
    if (!isAddDialogOpen || !draftKey) return undefined;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          savedAt: Date.now(),
          product: newProduct,
        }));
      } catch (err) {
        // localStorage full or disabled — silent fail
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isAddDialogOpen, newProduct, draftKey]);

  // On dialog open, check for existing draft and offer to restore
  useEffect(() => {
    if (!isAddDialogOpen) {
      setDraftPromptShown(false);
      setPendingDraft(null);
      return;
    }
    if (!draftKey || draftPromptShown) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setDraftPromptShown(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const { savedAt, product } = parsed || {};
      if (!product || typeof savedAt !== 'number' || Date.now() - savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey);
        setDraftPromptShown(true);
        return;
      }
      // Only offer if the draft has meaningful content (avoid prompts on empty form)
      const hasContent = product?.name?.trim?.() || product?.brand?.trim?.()
        || (product?.variant && (product.variant.basePrice > 0 || product.variant.costPrice > 0));
      if (hasContent) {
        setPendingDraft(product);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
    setDraftPromptShown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddDialogOpen, draftKey]);

  const isNonFoodRetailVertical = useMemo(() => {
    if (!verticalConfig) return false;
    return verticalConfig.baseVertical === 'RETAIL' && verticalConfig.allowsWeight === false;
  }, [verticalConfig]);

  const supportsVariants = verticalConfig?.supportsVariants !== false;
  const isRestaurant = tenantVertical === 'FOOD_SERVICE';

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
      baseProduct.productType = defaultProductType; // Set type from prop
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

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadProducts = useCallback(async (page = 1, limit = 25, status = 'all', search = '', category = 'all', productType = 'simple', currentSortBy = sortBy, currentSortOrder = sortOrder) => {
    const trimmedSearch = (search || '').trim();
    const requestKey = JSON.stringify({ page, limit, status, search: trimmedSearch, category, productType, sortBy: currentSortBy, sortOrder: currentSortOrder });

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
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
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
      // Caché por params (React Query): al reentrar al módulo con los mismos
      // filtros, devuelve del cache al instante. Las mutaciones invalidan
      // ['products'] vía invalidateInventoryData → fetchQuery refetcha.
      const response = await queryClient.fetchQuery({
        queryKey: ['products', tenant?.id, requestKey],
        queryFn: () => fetchApi(`/products${queryString}`, { signal: controller.signal }),
        staleTime: 120_000,
      });

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
  }, [sortBy, sortOrder]);

  // Reset to page 1 ONLY when filter/search values actually change (not on page/limit change)
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.searchTerm !== searchTerm ||
      prev.statusFilter !== statusFilter ||
      prev.filterCategory !== filterCategory ||
      prev.defaultProductType !== defaultProductType ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder;

    if (filtersChanged) {
      prevFiltersRef.current = { searchTerm, statusFilter, filterCategory, defaultProductType, sortBy, sortOrder };
      if (currentPage !== 1) {
        setCurrentPage(1);
        // Don't need to call loadProducts here — the currentPage change will trigger the load effect below
        return;
      }
    }

    // Determine effective limit: when searching, increase default to SEARCH_PAGE_LIMIT
    // but only if the user hasn't manually changed it
    const trimmedSearch = searchTerm.trim();
    const effectiveLimit = manualPageLimitRef.current !== DEFAULT_PAGE_LIMIT
      ? manualPageLimitRef.current
      : trimmedSearch
        ? SEARCH_PAGE_LIMIT
        : DEFAULT_PAGE_LIMIT;

    if (pageLimit !== effectiveLimit) {
      setPageLimit(effectiveLimit);
      return; // Let the pageLimit change re-trigger this effect
    }

    const delay = trimmedSearch ? 800 : 0;
    const timeoutId = setTimeout(() => {
      loadProducts(currentPage, pageLimit, statusFilter, trimmedSearch, filterCategory, defaultProductType, sortBy, sortOrder);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currentPage, pageLimit, statusFilter, searchTerm, filterCategory, defaultProductType, sortBy, sortOrder, loadProducts]);

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
      // NO hacer trim aquí - se hará en onBlur del Input
      // Esto permite escribir espacios mientras se edita
      return rawValue === '' ? null : rawValue;
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
        onBlur={(event) => {
          // Re-normalizar al perder el foco para limpiar espacios extras
          const trimmed = event.target.value?.trim();
          if (trimmed !== event.target.value) {
            onValueChange(trimmed);
          }
        }}
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
      if (field === 'costPrice' || field === 'basePrice' || field === 'wholesalePrice') {
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
        if (value === '' || value === null || value === undefined) {
          nextValue = '';
        } else {
          const parsed = parseFloat(value);
          nextValue = Number.isNaN(parsed) ? '' : parsed;
        }
      }
      if (field === 'basePrice' || field === 'costPrice' || field === 'wholesalePrice') {
        if (value === '' || value === null || value === undefined) {
          nextValue = '';
        } else {
          const parsed = parseFloat(value);
          nextValue = Number.isNaN(parsed) ? '' : parsed;
        }
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

  const handleScanLabel = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 3) {
      toast.error('Máximo 3 imágenes permitidas');
      if (labelFileRef.current) labelFileRef.current.value = '';
      return;
    }

    setIsLabelScanning(true);
    setLabelScanResult(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      const response = await fetchApi('/products/scan-label', {
        method: 'POST',
        body: formData,
      });

      if (response.success && response.data) {
        const d = response.data;

        setNewProduct(prev => ({
          ...prev,
          name: d.name || prev.name,
          brand: d.brand || prev.brand,
          description: d.description || prev.description,
          ingredients: d.ingredients || prev.ingredients,
          origin: d.origin || prev.origin,
          isPerishable: d.isPerishable ?? prev.isPerishable,
          shelfLifeDays: d.shelfLifeDays || prev.shelfLifeDays,
          shelfLifeValue: d.shelfLifeDays || prev.shelfLifeValue,
          storageTemperature: d.storageTemperature || prev.storageTemperature,
          unitOfMeasure: d.unitOfMeasure || prev.unitOfMeasure,
          category: d.matchedCategory ? [d.matchedCategory] : (d.category ? [d.category] : prev.category),
          subcategory: d.matchedSubcategory ? [d.matchedSubcategory] : (d.subcategory ? [d.subcategory] : prev.subcategory),
        }));

        setLabelScanResult({
          confidence: d.overallConfidence,
          categoryMatched: !!d.matchedCategory,
          suggestedCategory: d.category,
          allergens: d.allergens || [],
          attributes: d.attributes || {},
        });

        const pct = Math.round(d.overallConfidence * 100);
        toast.success(`Etiqueta escaneada con ${pct}% de confianza`);
      } else {
        toast.error('No se pudo escanear la etiqueta');
      }
    } catch (err) {
      toast.error(err.message || 'Error al escanear la etiqueta');
    } finally {
      setIsLabelScanning(false);
      if (labelFileRef.current) labelFileRef.current.value = '';
    }
  };

  const handleClearLabelScan = () => {
    setLabelScanResult(null);
    setNewProduct(initialNewProductState);
    toast.info('Escaneo descartado. Formulario restaurado.');
  };

  const handleAddProduct = async (mode = 'close') => {
    const productAttributesPayload = serializeAttributes(
      newProduct.attributes,
      productAttributes,
    );
    // Quick Create defaults: backend currently treats brand as @IsNotEmpty and
    // expects category/subcategory arrays. When the user skips these in the
    // collapsed "Más opciones" section, we fill placeholders so the product is
    // created without friction. Acceptable tradeoff vs. blocking creation; the
    // user can refine these in Edit at any time. Reassess if analytics shows
    // a sustained >20% of catalog stuck on these placeholders.
    const rawCategory = normalizeStringList(newProduct.category);
    const rawSubcategory = normalizeStringList(newProduct.subcategory);
    const normalizedCategory = rawCategory.length > 0 ? rawCategory : ['Sin clasificar'];
    const normalizedSubcategory = rawSubcategory.length > 0 ? rawSubcategory : ['General'];
    const normalizedBrand = (newProduct.brand && newProduct.brand.trim()) || 'Genérico';

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
          : position === 1
            ? (newProduct.sku || '')
            : (newProduct.sku ? `${newProduct.sku}-VAR${position}` : '');

      const normalizedVariant = {
        ...variant,
        name: variant.name && variant.name.trim() ? variant.name.trim() : (position === 1 ? 'Principal' : `Variante ${position}`),
        sku: trimmedSku,
        unit: variant.unit || newProduct.unitOfMeasure || 'unidad',
        unitSize: Number(variant.unitSize) || 1,
        costPrice: Number(variant.costPrice) || 0,
        basePrice: Number(variant.basePrice) || 0,
        wholesalePrice: Number(variant.wholesalePrice) || undefined,
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

    const extraVariantsPayload = newProduct.hasAdditionalVariants
      ? additionalVariants
          .map((variant, index) => buildVariantPayload(variant, index + 2))
          .filter(Boolean)
      : [];

    const payload = {
      ...newProduct,
      brand: normalizedBrand,
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
        wholesaleEnabled: newProduct.pricingRules?.wholesaleEnabled || false,
        wholesaleMinQuantity: newProduct.pricingRules?.wholesaleMinQuantity || 1,
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
      initialInventoryQuantity: Number(newProduct.initialInventoryQuantity) || 0,
      // Forward selected warehouse to backend; empty string falls back to default
      ...(newProduct.initialInventoryWarehouseId && {
        initialInventoryWarehouseId: newProduct.initialInventoryWarehouseId,
      }),
    };

    delete payload.shelfLifeValue;
    if (!payload.isPerishable) {
      delete payload.shelfLifeDays;
      delete payload.shelfLifeUnit;
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

      // Producto nuevo (puede auto-crear inventario) → refresca el contenedor.
      invalidateInventoryData();

      console.log('🔍 DEBUG - Created Product:', createdProduct);
      console.log('🔍 DEBUG - Product ID:', createdProduct._id);
      console.log('🔍 DEBUG - Product Type:', newProduct.productType);

      // If product is consumable or supply, create the corresponding config.
      // Note: useConsumables/useSupplies hooks return { success, error } and never
      // throw — so a try/catch around await would never fire. We must inspect the
      // result.success boolean explicitly. Earlier code did try/catch only and
      // missed silent backend validation failures (the most common: empty
      // category/type fields), which left products created without their
      // companion config. The follow-up symptom was a confusing flow where the
      // SuppliesTab/ConsumablesTab dialog appeared empty and forced re-entry.
      if (newProduct.productType === 'consumable') {
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
        if (!configResult?.success) {
          const detail = configResult?.error || 'Validación fallida';
          alert(`Producto creado, pero la configuración como consumible falló: ${detail}. Completa la configuración desde la pestaña Consumibles.`);
        }
      } else if (newProduct.productType === 'supply') {
        const configResult = await createSupplyConfig({
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
        if (!configResult?.success) {
          const detail = configResult?.error || 'Validación fallida';
          alert(`Producto creado, pero la configuración como suministro falló: ${detail}. Completa la configuración desde la pestaña Suministros.`);
        }
      }

      // 1. Add to local state immediately
      setProducts(prev => [createdProduct, ...prev]);

      // 2. Reset state per submit mode and optionally close dialog
      document.dispatchEvent(new CustomEvent('product-form-success'));
      if (draftKey) {
        try { localStorage.removeItem(draftKey); } catch (e) { /* noop */ }
      }
      setAdditionalVariants([]);
      if (mode === 'duplicate') {
        // Preserve marca/categoría/IVA/unitOfMeasure/productType so the user
        // can quickly create another product of the same family.
        setNewProduct((prev) => ({
          ...initialNewProductState,
          productType: prev.productType,
          brand: prev.brand,
          category: prev.category,
          subcategory: prev.subcategory,
          ivaRate: prev.ivaRate,
          ivaApplicable: prev.ivaApplicable,
          unitOfMeasure: prev.unitOfMeasure,
          isPerishable: prev.isPerishable,
          sendToKitchen: prev.sendToKitchen,
          isSoldByWeight: prev.isSoldByWeight,
          initialInventoryWarehouseId: prev.initialInventoryWarehouseId,
        }));
      } else if (mode === 'another') {
        setNewProduct(initialNewProductState);
      } else {
        setIsAddDialogOpen(false);
        setNewProduct(initialNewProductState);
      }

      // Success feedback. ProductsManagement only renders for productType
      // 'simple' (Mercancía) or 'raw_material' (Materias Primas), so creating
      // a Consumible/Suministro from this Sheet leaves the user staring at a
      // list filtered out of their new product. Auto-redirect to the
      // corresponding tab on close-mode success so the product lands somewhere
      // visible. For batch modes ('another'/'duplicate') the user is in flow
      // and we keep them in the form.
      const productLabel = createdProduct?.name?.trim() || 'Producto';
      const PRODUCT_TYPE_TAB = {
        simple: 'products',
        raw_material: 'raw-materials',
        consumable: 'consumables',
        supply: 'supplies',
      };
      const PRODUCT_TYPE_LABEL = {
        simple: 'Mercancía',
        raw_material: 'Materias Primas',
        consumable: 'Consumibles',
        supply: 'Suministros',
      };
      const currentTab = PRODUCT_TYPE_TAB[defaultProductType];
      const targetTab = PRODUCT_TYPE_TAB[newProduct.productType];
      const needsRedirect = !!targetTab && targetTab !== currentTab;

      if (mode === 'close') {
        if (needsRedirect) {
          navigate(`?tab=${targetTab}`, { replace: false });
          toast.success(`"${productLabel}" creado en ${PRODUCT_TYPE_LABEL[newProduct.productType]}`);
        } else if (newProduct.productType === 'simple') {
          toast.success(`"${productLabel}" creado`, {
            action: {
              label: 'Ir al POS',
              onClick: () => navigate('/orders/new'),
            },
            duration: 6000,
          });
        } else {
          toast.success(`"${productLabel}" creado`);
        }
      } else {
        toast.success(`"${productLabel}" creado`);
      }

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
        wholesalePrice: Number(variant.wholesalePrice) || undefined,
        images: Array.isArray(variant.images) ? variant.images : [],
        pricingStrategy: variant.pricingStrategy || undefined,
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
      sku: editingProduct.sku, // Added SKU to payload
      category: normalizedCategory,
      subcategory: normalizedSubcategory,
      brand: editingProduct.brand,
      origin: editingProduct.attributes?.origin || editingProduct.origin || '',
      description: editingProduct.description,
      ingredients: editingProduct.ingredients,
      inventoryConfig: {
        ...editingProduct.inventoryConfig,
        minimumStock: Number(editingProduct.inventoryConfig.minimumStock) || 0,
        maximumStock: Number(editingProduct.inventoryConfig.maximumStock) || 0,
        reorderPoint: Number(editingProduct.inventoryConfig.reorderPoint) || 0,
        reorderQuantity: Number(editingProduct.inventoryConfig.reorderQuantity) || 0,
      },
      isSoldByWeight: editingProduct.isSoldByWeight,
      unitOfMeasure: editingProduct.unitOfMeasure,
      hasMultipleSellingUnits: editingProduct.hasMultipleSellingUnits,
      sellingUnits: editingProduct.hasMultipleSellingUnits
        ? sanitizeSellingUnitsForPayload(editingProduct.sellingUnits)
        : [],
      ivaApplicable: editingProduct.ivaApplicable,
      ivaRate: editingProduct.ivaRate,
      isPerishable: editingProduct.isPerishable,
      shelfLifeDays: editingProduct.shelfLifeDays,
      shelfLifeUnit: editingProduct.isPerishable ? (editingProduct.shelfLifeUnit || 'days') : undefined,
      storageTemperature: editingProduct.isPerishable ? (editingProduct.storageTemperature || 'ambiente') : undefined,
      pricingRules: {
        ...(editingProduct.pricingRules || {}),
        bulkDiscountEnabled: editingProduct.pricingRules?.bulkDiscountEnabled || false,
        bulkDiscountRules: editingProduct.pricingRules?.bulkDiscountEnabled
          ? (editingProduct.pricingRules?.bulkDiscountRules || [])
          : [],
        wholesaleEnabled: editingProduct.pricingRules?.wholesaleEnabled || false,
        wholesaleMinQuantity: editingProduct.pricingRules?.wholesaleMinQuantity || 1,
      },
      hasActivePromotion: editingProduct.hasActivePromotion || false,
      ...(editingProduct.hasActivePromotion && editingProduct.promotion && {
        promotion: {
          ...editingProduct.promotion,
          isActive: true,
        }
      }),
      variants: sanitizedVariants,
      sendToKitchen: editingProduct.sendToKitchen, // CRITICAL: Ensure this is saved
      isActive: editingProduct.isActive ?? true,
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
      invalidateInventoryData();

      // Success - no need to reload, already updated!
    } catch (err) {
      // 4. Rollback on error
      setProducts(previousProducts);
      alert(`Error al actualizar el producto: ${err.message}`);

      // Optionally reload to ensure consistency
      // Optionally reload to ensure consistency
      loadProducts(currentPage, pageLimit, statusFilter, searchTerm, filterCategory, defaultProductType);
    }
  };

  /**
   * handleInlineUpdate
   * 
   * Handles inline editing of product fields (Price, Cost, Category, etc.)
   * Supports optimistic updates and Undo functionality.
   * 
   * @param {string} productId 
   * @param {string} field - 'basePrice', 'costPrice', 'category', 'name'
   * @param {any} value - New value
   * @param {number} variantIndex - Index of variant if applicable (default -1)
   */
  const handleInlineUpdate = async (productId, field, value, variantIndex = -1) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    // 1. Create a deep clone to modify and send
    const updatedProduct = JSON.parse(JSON.stringify(product));

    // 2. Apply change
    if (variantIndex >= 0 && updatedProduct.variants && updatedProduct.variants[variantIndex]) {
      // Updating a specific variant
      updatedProduct.variants[variantIndex][field] = Number(value);
    } else {
      // Updating root field or simple product logic
      if (field === 'name' || field === 'sku' || field === 'brand') {
        updatedProduct[field] = value;
      } else if (field === 'category') {
        // Handle category array (split by comma for tag-like behavior)
        if (typeof value === 'string') {
          const splitCategories = value.split(',').map(c => {
            const raw = c.trim();
            if (!raw) return null;
            // Normalize: Check if exists case-insensitive in global 'categories' state
            const existing = categories.find(cat => cat.toLowerCase() === raw.toLowerCase());
            return existing || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(); // Default Title Case
          }).filter(Boolean);

          // Deduplicate
          updatedProduct.category = [...new Set(splitCategories)];
        } else {
          updatedProduct.category = [value];
        }
      } else {
        // Price/Cost for simple product (usually stored in variants[0])
        if (updatedProduct.variants && updatedProduct.variants.length > 0) {
          updatedProduct.variants[0][field] = Number(value);
        }
      }
    }

    // 3. Optimistic Update
    const previousProducts = [...products];
    setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));

    // 4. Undo Functionality
    const revert = () => {
      setProducts(previousProducts);
      toast.info("Cambio deshecho");
    };

    // 5. Send to Server
    // Construct payload - essential to send variants array if variants changed
    const payload = {
      category: updatedProduct.category,
      variants: updatedProduct.variants, // This sends ALL variants
      name: updatedProduct.name,
      sku: updatedProduct.sku,
      brand: updatedProduct.brand
    };
    try {
      await fetchApi(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      invalidateInventoryData();
      // Only confirm success after the server acknowledges the change.
      toast.success('Actualizado', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            revert();
            // Fire reversion PATCH
            fetchApi(`/products/${productId}`, {
              method: 'PATCH',
              body: JSON.stringify({ variants: product.variants, category: product.category, brand: product.brand })
            }).catch(err => console.error("Undo failed on server", err));
          }
        },
        duration: 4000
      });
    } catch (error) {
      console.error("Inline update failed", error);
      toast.error("Error al guardar cambio");
      setProducts(previousProducts); // Rollback
    }
  };

  /**
   * handleSellingUnitInlineUpdate
   *
   * Handles inline editing of selling unit prices (pricePerUnit, costPerUnit).
   *
   * @param {string} productId
   * @param {number} unitIndex - Index of the selling unit in sellingUnits array
   * @param {string} field - 'pricePerUnit' | 'costPerUnit'
   * @param {any} value - New value
   */
  const handleSellingUnitInlineUpdate = async (productId, unitIndex, field, value) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const updatedProduct = JSON.parse(JSON.stringify(product));

    if (updatedProduct.sellingUnits && updatedProduct.sellingUnits[unitIndex]) {
      updatedProduct.sellingUnits[unitIndex][field] = Number(value);
    }

    const previousProducts = [...products];
    setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));

    const revert = () => {
      setProducts(previousProducts);
      toast.info("Cambio deshecho");
    };

    const payload = {
      sellingUnits: updatedProduct.sellingUnits,
      hasMultipleSellingUnits: updatedProduct.hasMultipleSellingUnits,
    };

    toast.success('Actualizado', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          revert();
          fetchApi(`/products/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify({ sellingUnits: product.sellingUnits })
          }).catch(err => console.error("Undo failed on server", err));
        }
      },
      duration: 4000
    });

    try {
      await fetchApi(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      invalidateInventoryData();
    } catch (error) {
      console.error("Selling unit inline update failed", error);
      toast.error("Error al guardar cambio");
      setProducts(previousProducts);
    }
  };

  const handleToggleProductStatus = async (product) => {
    const newStatus = !product.isActive;
    const previousProducts = products;
    try {
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isActive: newStatus } : p));
      await fetchApi(`/products/${product._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      invalidateInventoryData();
      toast.success(newStatus ? `"${product.name}" activado` : `"${product.name}" desactivado`);
    } catch (err) {
      setProducts(previousProducts);
      toast.error(`Error al cambiar estado: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const ok = await confirm({
      title: '¿Eliminar este producto?',
      description: 'Esta acción no se puede deshacer.',
      destructive: true,
    });
    if (!ok) return;

    // OPTIMISTIC UPDATE: Remove from UI immediately
    const previousProducts = products;

    try {
      // 1. Remove from UI immediately
      setProducts(prev => prev.filter(p => p._id !== productId));

      // 2. Delete from backend
      await fetchApi(`/products/${productId}`, { method: 'DELETE' });
      invalidateInventoryData();

      // Success - already removed from UI!
    } catch (err) {
      // 3. Rollback on error
      setProducts(previousProducts);
      alert(`Error: ${err.message}`);
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

  const handleDownloadTemplate = async () => {
    const XLSX = await getXLSX();
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
      "shelfLifeUnit",
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
      "variantWholesalePrice",
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
          shelfLifeUnit: "years",
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
          variantWholesalePrice: 1.35,
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
        shelfLifeUnit: "days",
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
        variantWholesalePrice: 2.0,
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
    reader.onload = async (event) => {
      try {
        const XLSX = await getXLSX();
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

      // Helper function to convert string to boolean
      const parseBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim();
          return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sí';
        }
        return Boolean(value);
      };

      // Helper function to convert string to array
      const parseArray = (value) => {
        if (Array.isArray(value)) return value;
        if (!value || String(value).trim() === '') return [];
        if (typeof value === 'string') {
          // Split by comma and trim each element
          return value.split(',').map(item => item.trim()).filter(item => item !== '');
        }
        return [String(value)];
      };

      // Helper function to parse number
      const parseNumber = (value) => {
        if (typeof value === 'number') return value;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      };

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

      // Transform category and subcategory to arrays
      if (normalizedRow.category !== undefined) {
        normalizedRow.category = parseArray(normalizedRow.category);
      } else {
        normalizedRow.category = []; // Ensure it's always an array
      }

      if (normalizedRow.subcategory !== undefined) {
        normalizedRow.subcategory = parseArray(normalizedRow.subcategory);
      } else {
        normalizedRow.subcategory = []; // Ensure it's always an array
      }

      // Transform boolean fields
      if (normalizedRow.isSoldByWeight !== undefined) {
        normalizedRow.isSoldByWeight = parseBoolean(normalizedRow.isSoldByWeight);
      } else {
        normalizedRow.isSoldByWeight = false;
      }

      if (normalizedRow.isPerishable !== undefined) {
        normalizedRow.isPerishable = parseBoolean(normalizedRow.isPerishable);
      } else {
        normalizedRow.isPerishable = false;
      }

      if (normalizedRow.ivaApplicable !== undefined) {
        normalizedRow.ivaApplicable = parseBoolean(normalizedRow.ivaApplicable);
      } else {
        normalizedRow.ivaApplicable = true; // Default to true as per backend DTO
      }

      // Transform numeric fields
      const numericFields = [
        'variantUnitSize', 'variantBasePrice', 'variantCostPrice', 'variantWholesalePrice',
        'shelfLifeDays', 'minimumStock', 'maximumStock', 'reorderPoint', 'reorderQuantity'
      ];
      numericFields.forEach(field => {
        if (normalizedRow[field] !== undefined && normalizedRow[field] !== null && normalizedRow[field] !== '') {
          normalizedRow[field] = parseNumber(normalizedRow[field]);
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

    // Debug: Log the payload being sent
    console.log('📦 Sending bulk import payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetchApi('/products/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsPreviewDialogOpen(false);
      const successMessage = response?.message || `${payload.products.length} productos importados exitosamente.`;
      alert(successMessage);
      // Invalida ANTES de recargar para que fetchQuery traiga datos frescos.
      invalidateInventoryData();
      loadProducts(currentPage, pageLimit, statusFilter, searchTerm, filterCategory, defaultProductType); // Recargar la lista de productos

    } catch (error) {
      console.error("Bulk import failed:", error);
      console.error("Error details:", error.message, error.stack);
      // Show more detailed error to user
      alert(`Error al importar productos: ${error.message || 'Error desconocido'}`);
      throw error; // Let dialog handle it
    }
  };

  const openExportDialog = (format) => {
    setExportFormat(format);
    setIsExportDialogOpen(true);
  };

  const getExportColumns = () => {
    const baseColumns = [
      { key: 'sku', label: 'SKU', defaultChecked: true },
      { key: 'name', label: 'Nombre', defaultChecked: true },
      { key: 'category', label: 'Categoría', defaultChecked: true },
      { key: 'subcategory', label: 'Subcategoría', defaultChecked: true },
      { key: 'brand', label: 'Marca', defaultChecked: true },
      { key: 'description', label: 'Descripción', defaultChecked: false },
      { key: 'isSoldByWeight', label: 'Vendible por Peso', defaultChecked: false },
      { key: 'unitOfMeasure', label: 'Unidad de Medida', defaultChecked: true },
      { key: 'variantName', label: 'Variante Nombre', defaultChecked: true },
      { key: 'variantSku', label: 'Variante SKU', defaultChecked: true },
      { key: 'variantCost', label: 'Variante Costo', defaultChecked: true },
      { key: 'variantPrice', label: 'Variante Precio', defaultChecked: true },
      { key: 'variantWholesalePrice', label: 'Variante P. Mayor', defaultChecked: false },
    ];

    const pAttrs = productAttributeColumns.map(({ descriptor }) => ({
      key: `pAttr_${descriptor.key}`,
      label: `Attr: ${descriptor.label || descriptor.key}`,
      defaultChecked: false
    }));

    const vAttrs = variantAttributeColumns.map(({ descriptor }) => ({
      key: `vAttr_${descriptor.key}`,
      label: `Attr Var: ${descriptor.label || descriptor.key}`,
      defaultChecked: false
    }));

    return [...baseColumns, ...pAttrs, ...vAttrs];
  };

  const handleConfirmExport = async (selectedColumnKeys) => {
    try {
      const XLSX = await getXLSX();
      // 1. Fetch ALL data matching current filters (using high limit)
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Backend now supports up to 10000
      });

      if (statusFilter === 'active') {
        params.set('isActive', 'true');
      } else if (statusFilter === 'inactive') {
        params.set('isActive', 'false');
      } else {
        params.set('includeInactive', 'true');
      }

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      if (filterCategory && filterCategory !== 'all') {
        params.set('category', filterCategory);
      }

      params.set('productType', defaultProductType);

      const response = await fetchApi(`/products?${params.toString()}`);
      const allProducts = response.data || [];

      if (allProducts.length === 0) {
        toast.warning("No hay datos para exportar con los filtros actuales.");
        return;
      }

      // 2. Process data based on selected columns
      const processedData = allProducts.map(p => {
        const variantsToExport = (p.variants && p.variants.length > 0) ? p.variants : [{}];
        const pRows = [];

        variantsToExport.forEach(v => {
          const row = {};

          if (selectedColumnKeys.includes('sku')) row['SKU'] = p.sku;
          if (selectedColumnKeys.includes('name')) row['Nombre'] = p.name;
          if (selectedColumnKeys.includes('category')) row['Categoría'] = Array.isArray(p.category) ? p.category.join(', ') : p.category;
          if (selectedColumnKeys.includes('subcategory')) row['Subcategoría'] = Array.isArray(p.subcategory) ? p.subcategory.join(', ') : p.subcategory;
          if (selectedColumnKeys.includes('brand')) row['Marca'] = p.brand;
          if (selectedColumnKeys.includes('description')) row['Descripción'] = p.description;
          if (selectedColumnKeys.includes('isSoldByWeight')) row['Vendible por Peso'] = p.isSoldByWeight ? 'Sí' : 'No';
          if (selectedColumnKeys.includes('unitOfMeasure')) row['Unidad de Medida'] = p.unitOfMeasure;
          if (selectedColumnKeys.includes('variantName')) row['Variante Nombre'] = v.name || '';
          if (selectedColumnKeys.includes('variantSku')) row['Variante SKU'] = v.sku || '';
          if (selectedColumnKeys.includes('variantCost')) row['Variante Costo'] = v.costPrice || 0;
          if (selectedColumnKeys.includes('variantPrice')) row['Variante Precio'] = v.basePrice || 0;
          if (selectedColumnKeys.includes('variantWholesalePrice')) row['Variante P. Mayor'] = v.wholesalePrice || 0;

          // Attributes
          productAttributeColumns.forEach(({ descriptor }) => {
            const key = `pAttr_${descriptor.key}`;
            if (selectedColumnKeys.includes(key)) {
              row[`Attr: ${descriptor.label}`] = (p.attributes && p.attributes[descriptor.key]) ?? '';
            }
          });

          variantAttributeColumns.forEach(({ descriptor }) => {
            const key = `vAttr_${descriptor.key}`;
            if (selectedColumnKeys.includes(key)) {
              const vAttrs = v.attributes || {};
              row[`Attr Var: ${descriptor.label}`] = vAttrs[descriptor.key] ?? '';
            }
          });

          pRows.push(row);
        });

        return pRows;
      }).flat();

      // 3. Generate File
      const ws = XLSX.utils.json_to_sheet(processedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      if (exportFormat === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `productos_${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }

      toast.success(`Exportación completada: ${processedData.length} filas.`);

    } catch (error) {
      console.error("Export failed", error);
      throw error;
    }
  };

  if (loading && products.length === 0 && !searchTerm && filterCategory === 'all') return <div>Cargando productos...</div>;
  if (error && products.length === 0) return <div className="text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Consolidated toolbar: Search + Category + Status + "..." menu + primary CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px] shrink-0">
            <SelectValue placeholder="Todas las categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categories.map((cat, i) => (
              <SelectItem key={`cat-${i}-${cat}`} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[170px] shrink-0">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>

        {/* Consolidated "..." menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" title="Mas opciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar plantilla
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => document.getElementById('bulk-upload-input').click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importar archivo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openExportDialog('xlsx')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a .xlsx
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openExportDialog('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a .csv
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => setIsLabelWizardOpen(true)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir etiquetas
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={visibleColumns.sku} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, sku: checked }))}>SKU</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.name} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, name: checked }))}>Producto</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.brand} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, brand: checked }))}>Marca</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, category: checked }))}>Categoria</DropdownMenuCheckboxItem>
            {!isNonFoodRetailVertical && (
              <DropdownMenuCheckboxItem checked={visibleColumns.isSoldByWeight} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, isSoldByWeight: checked }))}>Vendible por Peso</DropdownMenuCheckboxItem>
            )}
            <DropdownMenuCheckboxItem checked={visibleColumns.price} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, price: checked }))}>Precio</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.cost} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, cost: checked }))}>Costo</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.wholesalePrice} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, wholesalePrice: checked }))}>P. Mayor</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.variants} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, variants: checked }))}>Variantes</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.promotion} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, promotion: checked }))}>Promocion</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: checked }))}>Estado</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.actions} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, actions: checked }))}>Acciones</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          type="file"
          id="bulk-upload-input"
          style={{ display: 'none' }}
          accept=".xlsx, .xls"
          onChange={handleBulkUpload}
        />

        {/* Primary CTA */}
        <PriceListsManager />
        <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button
            id="add-product-button"
            size="lg"
            className="bg-[#FB923C] hover:bg-[#F97316] text-white"
            onClick={() => setIsAddDialogOpen(true)}
          ><Plus className="h-5 w-5 mr-2" /> Agregar Producto</Button>
          <SheetContent
            side="right"
            className="!inset-4 !top-4 !bottom-4 !right-4 !h-auto !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-2rem)] rounded-xl border overflow-hidden flex flex-col p-0"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between pr-8">
                <div>
                  <SheetTitle>Agregar Nuevo Producto</SheetTitle>
                  <SheetDescription>Completa la información para crear un nuevo producto en el catálogo.</SheetDescription>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="file"
                    ref={labelFileRef}
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    className="hidden"
                    onChange={handleScanLabel}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLabelScanning}
                    onClick={() => labelFileRef.current?.click()}
                  >
                    {isLabelScanning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Escaneando...</>
                    ) : (
                      <><Camera className="h-4 w-4 mr-2" /> Escanear Etiqueta</>
                    )}
                  </Button>
                </div>
              </div>
              {labelScanResult && (
                <div className="mt-3 p-3 bg-info-muted border border-info/30 rounded-md text-sm">
                  <div className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
                    <CheckCircle className="h-4 w-4" />
                    <span className="flex-1">Etiqueta escaneada — {Math.round(labelScanResult.confidence * 100)}% confianza</span>
                    <button
                      type="button"
                      onClick={handleClearLabelScan}
                      className="p-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Descartar escaneo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-1 text-info dark:text-blue-300 space-y-0.5">
                    {labelScanResult.categoryMatched ? (
                      <p>✓ Categoría encontrada en tu catálogo</p>
                    ) : labelScanResult.suggestedCategory ? (
                      <p>⚠ Categoría sugerida: "{labelScanResult.suggestedCategory}" (nueva)</p>
                    ) : null}
                    {labelScanResult.allergens.length > 0 && (
                      <p>⚠ Alérgenos detectados: {labelScanResult.allergens.join(', ')}</p>
                    )}
                    {Object.keys(labelScanResult.attributes).length > 0 && (
                      <p>ℹ {Object.keys(labelScanResult.attributes).length} dato(s) adicional(es) extraído(s)</p>
                    )}
                  </div>
                </div>
              )}
            </SheetHeader>

            {pendingDraft && (
              <div className="px-6 pt-4">
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-3">
                  <div className="flex-1 text-sm">
                    <p className="font-medium">Tienes un producto en borrador</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pendingDraft.name?.trim() || 'Sin nombre todavía'} — guardado durante tu última sesión. ¿Continuar editándolo?
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewProduct(pendingDraft);
                      setPendingDraft(null);
                    }}
                  >
                    Continuar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (draftKey) {
                        try { localStorage.removeItem(draftKey); } catch (e) { /* noop */ }
                      }
                      setPendingDraft(null);
                    }}
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            )}

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
                    <SelectItem value="raw_material">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Materia Prima</div>
                          <div className="text-xs text-muted-foreground">Ingredientes para producción</div>
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
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-x-8">
                <div className="space-y-2">
                  <Label>Imágenes (máx. 3)</Label>
                  <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50">
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

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU Principal (Opcional)</Label>
                      <Input
                        id="sku"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        placeholder="Ej: PROD-001 (Automático si se deja vacío)"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría</Label>
                      <TagInput
                        id="category"
                        value={newProduct.category}
                        onChange={(tags) => setNewProduct({ ...newProduct, category: tags })}
                        placeholder={getPlaceholder('category', 'Ej: Bebidas, Alimentos')}
                        helpText="Coma (,) o Enter para agregar. Múltiples categorías ayudan a la IA a encontrar productos."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Sub-categoría</Label>
                      <TagInput
                        id="subcategory"
                        value={newProduct.subcategory}
                        onChange={(tags) => setNewProduct({ ...newProduct, subcategory: tags })}
                        placeholder={getPlaceholder('subcategory', 'Ej: Gaseosas, Refrescos')}
                        helpText="Coma (,) o Enter para agregar. Facilita la búsqueda."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {(productAttributes.length > 0 || !isNonFoodRetailVertical) && (
                <div className="pt-6 border-t">
                  <h4 className="text-lg font-medium mb-4">Detalles del Producto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {productAttributes.map((attr) => (
                      <div key={attr.key} className="space-y-2">
                        <Label>
                          {attr.label}
                          {attr.required ? <span className="text-destructive"> *</span> : null}
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
                    {!isNonFoodRetailVertical && (
                      <div className="space-y-2">
                        <Label htmlFor="unitOfMeasure">Unidad de Medida Base</Label>
                        <Select
                          value={newProduct.unitOfMeasure}
                          onValueChange={(value) =>
                            setNewProduct({ ...newProduct, unitOfMeasure: value })
                          }
                        >
                          <SelectTrigger id="unitOfMeasure">
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
                      </div>
                    )}
                    {!isNonFoodRetailVertical && newProduct.productType === 'simple' && (
                      <div className="space-y-2">
                        <Label htmlFor="ivaRate">IVA Aplicable</Label>
                        <Select
                          value={String(newProduct.ivaRate ?? 16)}
                          onValueChange={(value) =>
                            setNewProduct({
                              ...newProduct,
                              ivaRate: Number(value),
                              ivaApplicable: Number(value) > 0
                            })
                          }
                        >
                          <SelectTrigger id="ivaRate">
                            <SelectValue placeholder="Seleccione tasa de IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Exento (0%)</SelectItem>
                            <SelectItem value="8">Reducido (8%)</SelectItem>
                            <SelectItem value="16">Normal (16%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Collapsible className="pt-6 border-t">
                <CollapsibleTrigger className="group flex items-center gap-2 w-full text-left hover:bg-muted/40 rounded-md px-2 py-2 -mx-2 transition-colors">
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
                  <div className="flex-1">
                    <h4 className="text-base font-medium">Más opciones</h4>
                    <p className="text-xs text-muted-foreground">
                      Descripción, ingredientes, perecedero, vida útil, temperatura…
                    </p>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className={`space-y-2 ${isNonFoodRetailVertical ? 'col-span-2' : ''}`}>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        placeholder={getDynamicPlaceholder('description', newProduct.productType)}
                      />
                    </div>
                    {!isNonFoodRetailVertical && (
                      <div className="space-y-2">
                        <Label htmlFor="ingredients">{ingredientLabel}</Label>
                        <Textarea
                          id="ingredients"
                          value={newProduct.ingredients}
                          onChange={(e) => setNewProduct({ ...newProduct, ingredients: e.target.value })}
                          placeholder={isNonFoodRetailVertical ? 'Describe la composición del producto' : 'Lista de ingredientes'}
                        />
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

                    {/* Send to Kitchen Toggle (Restaurant Only) */}
                    {isRestaurant && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="sendToKitchen"
                          checked={newProduct.sendToKitchen !== false}
                          onCheckedChange={(checked) =>
                            setNewProduct({ ...newProduct, sendToKitchen: checked })
                          }
                        />
                        <Label htmlFor="sendToKitchen">Enviar a Cocina / Comanda</Label>
                      </div>
                    )}
                    {verticalConfig?.allowsWeight && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="isSoldByWeight" checked={newProduct.isSoldByWeight} onCheckedChange={(checked) => setNewProduct({ ...newProduct, isSoldByWeight: checked })} />
                        <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
                      </div>
                    )}
                    {!isNonFoodRetailVertical && newProduct.isPerishable && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="shelfLifeValue">Vida Útil</Label>
                          <div className="flex gap-2">
                            <NumberInput
                              id="shelfLifeValue"
                              className="flex-1"
                              value={newProduct.shelfLifeValue ?? ''}
                              onValueChange={(val) => setNewProduct({
                                ...newProduct,
                                shelfLifeValue: val,
                                shelfLifeDays: shelfLifeValueToDays(val, newProduct.shelfLifeUnit),
                              })}
                              step={1}
                              min={0}
                              placeholder="Cantidad"
                            />
                            <Select
                              value={newProduct.shelfLifeUnit || 'days'}
                              onValueChange={(unit) => setNewProduct({
                                ...newProduct,
                                shelfLifeUnit: unit,
                                shelfLifeDays: shelfLifeValueToDays(newProduct.shelfLifeValue, unit),
                              })}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="days">Días</SelectItem>
                                <SelectItem value="months">Meses</SelectItem>
                                <SelectItem value="years">Años</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="storageTemperature">Temperatura de Almacenamiento</Label>
                          <Select value={newProduct.storageTemperature} onValueChange={(value) => setNewProduct({ ...newProduct, storageTemperature: value })}>
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
                </CollapsibleContent>
              </Collapsible>

              {/* Configuración de Inventario (Stock min/max/reorden) intencionalmente oculta en CREAR.
                  Razones: requiere historia de venta para tener valores informados (Cooper's Just-In-Time UX),
                  los defaults pre-llenos son ancla psicológica falsa (Tversky-Kahneman 1974), y los
                  competidores (Shopify/Square/Lightspeed) la mueven a un módulo dedicado post-creación.
                  El state inventoryConfig en initialNewProductState mantiene defaults razonables
                  (10/100/20/50) que el backend acepta por @IsObject. El usuario los ajusta después
                  desde Editar Producto → Tab Inventario, donde tiene contexto real. */}

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

              {/* Unidades múltiples para mercancía y materias primas (comida) */}
              {(newProduct.productType === 'simple' || newProduct.productType === 'raw_material') && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium">
                        {newProduct.productType === 'raw_material' ? 'Unidades de Medida Múltiples' : 'Unidades de Venta Múltiples'}
                      </h4>
                      <p className="text-sm text-muted-foreground">Configura diferentes unidades (kg, g, lb, cajas, etc.)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasMultipleSellingUnits"
                        checked={newProduct.hasMultipleSellingUnits}
                        onCheckedChange={(checked) => setNewProduct({ ...newProduct, hasMultipleSellingUnits: checked })}
                      />
                      <Label htmlFor="hasMultipleSellingUnits">Habilitar</Label>
                    </div>
                  </div>

                  {newProduct.hasMultipleSellingUnits && (
                    <div className="mb-4 p-3 bg-info-muted border border-info/30 rounded-md">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">⚠️ IMPORTANTE - Configuración de Contenido:</p>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                        El inventario SIEMPRE se guarda en <span className="font-bold">"{newProduct.unitOfMeasure}"</span> (la unidad más grande/principal).
                        Aquí debes definir <span className="font-bold">cuántas unidades de venta</span> están contenidas en 1 unidad principal.
                      </p>
                      <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-semibold">Ejemplos:</p>
                        <p>• Si la unidad base es "Saco" y vendes en "kg": Contenido = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">20</span> (1 Saco trae 20 kg)</p>
                        <p>• Si la unidad base es "Caja" y vendes en "Unidad": Contenido = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 Caja trae 24 unidades)</p>
                        <p>• Si la unidad base es "Kg" y vendes en "g": Contenido = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1000</span> (1 Kg trae 1000 g)</p>
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
                                setNewProduct({ ...newProduct, sellingUnits: units });
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
                                }}
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                              <Checkbox
                                id={`new-su-weight-${index}`}
                                checked={unit.isSoldByWeight || false}
                                onCheckedChange={(checked) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].isSoldByWeight = checked;
                                  setNewProduct({ ...newProduct, sellingUnits: units });
                                }}
                              />
                              <Label htmlFor={`new-su-weight-${index}`}>Vendido por peso</Label>
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                Contenido por {newProduct.unitOfMeasure}
                                <span className="text-xs text-muted-foreground p-1">(¿Cuántos {unit.abbreviation || 'unidad'} tiene 1 {newProduct.unitOfMeasure}?)</span>
                              </Label>
                              <Input
                                type="number"
                                step="0.001"
                                inputMode="decimal"
                                placeholder={getPlaceholder('sellingUnitConversion', 'Ej: 20')}
                                value={
                                  unit.conversionFactorInput ??
                                  (unit.conversionFactor ? normalizeDecimalInput(parseFloat((1 / unit.conversionFactor).toFixed(4)).toString()) : '')
                                }
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    // We keep the raw input (e.g. "20") for UI
                                    // We calculate the factor (e.g. 0.05) for internal logic if needed immediately
                                    const parsedInput = parseDecimalInput(rawValue);
                                    const calculatedFactor = parsedInput > 0 ? (1 / parsedInput) : null;

                                    return {
                                      ...currentUnit,
                                      conversionFactorInput: rawValue,
                                      conversionFactor: calculatedFactor,
                                    };
                                  });
                                  setNewProduct({ ...newProduct, sellingUnits: units });
                                }}
                                onBlur={() => {
                                  const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                    if (unitIndex !== index) {
                                      return currentUnit;
                                    }
                                    const normalizedInput = normalizeDecimalInput(currentUnit.conversionFactorInput ?? '');
                                    // Recalculate factor on blur just to be safe and clean up input
                                    const parsedInput = parseDecimalInput(normalizedInput);
                                    const calculatedFactor = parsedInput > 0 ? (1 / parsedInput) : null;

                                    return {
                                      ...currentUnit,
                                      conversionFactorInput: normalizedInput,
                                      conversionFactor: calculatedFactor,
                                    };
                                  });
                                  setNewProduct({ ...newProduct, sellingUnits: units });
                                }}
                              />
                              <p className="text-xs text-muted-foreground font-medium text-info mt-1">
                                {unit.conversionFactorInput ? (
                                  `1 ${newProduct.unitOfMeasure} contiene ${unit.conversionFactorInput} ${unit.abbreviation || 'unidad'}`
                                ) : (
                                  `Define el contenido`
                                )}
                              </p>
                            </div>
                            {showSalesFields && (
                              <div className="space-y-2">
                                <Label>Precio/Unidad ($)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  placeholder={getPlaceholder('sellingUnitPrice', 'Ej: 15.00')}
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
                                    setNewProduct({ ...newProduct, sellingUnits: units });
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
                                    setNewProduct({ ...newProduct, sellingUnits: units });
                                  }}
                                />
                              </div>
                            )}
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
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
                                  setNewProduct({ ...newProduct, sellingUnits: units });
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
                                    setNewProduct({ ...newProduct, sellingUnits: units });
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
                                    setNewProduct({ ...newProduct, sellingUnits: units });
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

              {supportsVariants && (
                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium">Variantes adicionales</h4>
                      <p className="text-sm text-muted-foreground">
                        {isNonFoodRetailVertical
                          ? 'Crea combinaciones adicionales (talla, color, etc.) para este producto.'
                          : 'Agrega presentaciones adicionales (tamaños, empaques, sabores, etc.) para este producto.'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasAdditionalVariants"
                        checked={newProduct.hasAdditionalVariants}
                        onCheckedChange={(checked) => {
                          setNewProduct({ ...newProduct, hasAdditionalVariants: !!checked });
                          if (checked && additionalVariants.length === 0) {
                            addAdditionalVariant();
                          }
                        }}
                      />
                      <Label htmlFor="hasAdditionalVariants">Habilitar</Label>
                    </div>
                  </div>

                  {newProduct.hasAdditionalVariants && (
                    <div className="space-y-4">
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Unidad</Label>
                              <Select
                                value={variant.unit || newProduct.unitOfMeasure || ''}
                                onValueChange={(value) => updateAdditionalVariantField(index, 'unit', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona unidad" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={newProduct.unitOfMeasure || 'unidad'}>{newProduct.unitOfMeasure || 'unidad'}</SelectItem>
                                  {newProduct.sellingUnits
                                    .filter((u) => u.abbreviation || u.name)
                                    .map((u, i) => (
                                      <SelectItem key={i} value={u.abbreviation || u.name}>{u.name} ({u.abbreviation})</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Precio costo ($)</Label>
                              <NumberInput
                                value={variant.costPrice ?? ''}
                                onValueChange={(val) => updateAdditionalVariantField(index, 'costPrice', val)}
                                step={0.01}
                                min={0}
                                placeholder="Precio costo"
                              />
                            </div>
                            {showSalesFields && (
                              <div className="space-y-2">
                                <Label>Precio venta ($)</Label>
                                <NumberInput
                                  value={variant.basePrice ?? ''}
                                  onValueChange={(val) => updateAdditionalVariantField(index, 'basePrice', val)}
                                  step={0.01}
                                  min={0}
                                  placeholder="Precio venta"
                                />
                              </div>
                            )}
                            {showSalesFields && newProduct.pricingRules?.wholesaleEnabled && (
                              <div className="space-y-2">
                                <Label>Precio mayorista ($)</Label>
                                <NumberInput
                                  value={variant.wholesalePrice ?? ''}
                                  onValueChange={(val) => updateAdditionalVariantField(index, 'wholesalePrice', val)}
                                  step={0.01}
                                  min={0}
                                  placeholder="Precio mayorista"
                                />
                              </div>
                            )}
                          </div>
                          {variantAttributes.length > 0 && (
                            <div className="border-t pt-4 mt-2">
                              <h6 className="text-sm font-medium mb-3">Atributos específicos</h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {variantAttributes.map((attr) => (
                                  <div key={attr.key} className="space-y-2">
                                    <Label>
                                      {attr.label}
                                      {attr.required ? <span className="text-destructive"> *</span> : null}
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
                      <Button type="button" variant="outline" size="sm" onClick={addAdditionalVariant}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar variante
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2 mt-6">
                <div className="border-2 border-sky-500/40 bg-sky-500/5 rounded-lg p-4">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-sky-500" />
                    Precios
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    La variante principal se crea automáticamente con el nombre, SKU y unidad del producto.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variantCostPrice">Precio Costo ($)</Label>
                      <NumberInput
                        id="variantCostPrice"
                        value={newProduct.variant.costPrice ?? ''}
                        onValueChange={(val) =>
                          setNewProduct({ ...newProduct, variant: { ...newProduct.variant, costPrice: val } })
                        }
                        step={0.01}
                        min={0}
                        placeholder="Precio costo"
                      />
                    </div>
                    {/* Precio de Venta solo para mercancía */}
                    {newProduct.productType === 'simple' && showSalesFields && (
                      <div className="space-y-2">
                        <Label htmlFor="variantBasePrice">
                          Precio de Venta ($)
                          {newProduct.variant.pricingStrategy?.mode !== 'manual' &&
                            newProduct.variant.pricingStrategy?.autoCalculate && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Auto-calculado
                              </Badge>
                            )}
                        </Label>
                        <NumberInput
                          id="variantBasePrice"
                          value={newProduct.variant.basePrice ?? ''}
                          onValueChange={(val) =>
                            setNewProduct({ ...newProduct, variant: { ...newProduct.variant, basePrice: val } })
                          }
                          step={0.01}
                          min={0}
                          placeholder="Precio venta"
                          disabled={
                            newProduct.variant.pricingStrategy?.mode !== 'manual' &&
                            newProduct.variant.pricingStrategy?.autoCalculate
                          }
                        />
                      </div>
                    )}
                    {/* Precio Mayorista solo si está habilitado */}
                    {newProduct.productType === 'simple' && showSalesFields && newProduct.pricingRules?.wholesaleEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="variantWholesalePrice">Precio Mayorista ($)</Label>
                        <NumberInput
                          id="variantWholesalePrice"
                          value={newProduct.variant.wholesalePrice ?? ''}
                          onValueChange={(val) =>
                            setNewProduct({ ...newProduct, variant: { ...newProduct.variant, wholesalePrice: val } })
                          }
                          step={0.01}
                          min={0}
                          placeholder="Precio mayorista"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ProductPricingAccordion (descuentos, mayorista, promociones,
                    pricing strategy auto-calculada) intencionalmente oculto en CREAR.
                    Razón: son power features que requieren contexto post-creación
                    (historial de venta, comportamiento del cliente, costos negociados).
                    Stripe/Shopify/Linear coinciden: crear primero, configurar después.
                    El accordion permanece disponible en el Edit dialog (mismo componente,
                    misma data) — el usuario lo configura cuando ya tiene el producto. */}

                {variantAttributes.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-base font-medium mb-4">Atributos de la Variante</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {variantAttributes.map((attr) => (
                        <div key={attr.key} className="space-y-2">
                          <Label>
                            {attr.label}
                            {attr.required ? <span className="text-destructive"> *</span> : null}
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
                {/* Variantes adicionales (presentaciones, tallas, colores, sabores)
                    intencionalmente omitidas en CREAR. La variante principal se crea
                    automáticamente con los datos del producto; agregar variantes
                    adicionales requiere decisiones de pricing/SKU/atributos por
                    variante que escalan la complejidad cognitiva (cada variante
                    duplica el formulario). El Edit dialog permite agregar variantes
                    cuando ya se tiene el producto creado y contexto sobre qué
                    presentaciones tienen sentido. */}
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
                        <NumberInput
                          id="defaultQuantityPerUse"
                          value={newProduct.consumableConfig.defaultQuantityPerUse ?? ''}
                          onValueChange={(val) => setNewProduct({
                            ...newProduct,
                            consumableConfig: {
                              ...newProduct.consumableConfig,
                              defaultQuantityPerUse: val
                            }
                          })}
                          step={0.01}
                          min={0}
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

                        {(newProduct.supplyConfig.safetyInfo.requiresPPE || newProduct.supplyConfig.safetyInfo.isHazardous) && (
                          <>
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
                          </>
                        )}
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

              {/* Stock Inicial — prominent, at the bottom of the form
                  but BEFORE the footer, so the user fills it before clicking Create.
                  Goal: ship-ready product immediately after creation. */}
              <div className="mt-6 border-2 border-emerald-500/40 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-500" />
                      Stock inicial
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Indica cuánto inventario tienes hoy. Al crear el producto, ya quedará listo para vender.
                    </p>
                  </div>
                </div>
                <div className={multiWarehouseEnabled && warehouses.length > 1 ? 'grid grid-cols-2 gap-4' : ''}>
                  <div className="space-y-2">
                    <Label htmlFor="initialInventoryQuantity">Cantidad inicial</Label>
                    <Input
                      id="initialInventoryQuantity"
                      type="number"
                      min="0"
                      step="any"
                      value={newProduct.initialInventoryQuantity ?? 0}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        initialInventoryQuantity: e.target.value === '' ? 0 : Number(e.target.value),
                      })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si no tienes existencia aún, déjalo en 0.
                    </p>
                  </div>
                  {multiWarehouseEnabled && warehouses.length > 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="initialInventoryWarehouseId">Almacén destino</Label>
                      <Select
                        value={newProduct.initialInventoryWarehouseId || ''}
                        onValueChange={(v) => setNewProduct({ ...newProduct, initialInventoryWarehouseId: v })}
                      >
                        <SelectTrigger id="initialInventoryWarehouseId">
                          <SelectValue placeholder="Selecciona almacén" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => {
                            const id = w._id || w.id;
                            return (
                              <SelectItem key={id} value={id}>
                                {w.name}
                                {w.isDefault && <span className="text-xs text-muted-foreground ml-2">(predeterminado)</span>}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Por defecto se asigna al almacén principal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-card">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <div className="inline-flex">
                <Button
                  className="rounded-r-none"
                  onClick={() => handleAddProduct('close')}
                >
                  Crear Producto
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="rounded-l-none border-l border-l-white/20 px-2"
                      aria-label="Más opciones de creación"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleAddProduct('another')}>
                      <span className="flex-1">Crear y agregar otro</span>
                      <span className="text-xs text-muted-foreground ml-3">Limpia todo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAddProduct('duplicate')}>
                      <span className="flex-1">Crear y duplicar</span>
                      <span className="text-xs text-muted-foreground ml-3">Preserva marca/categoría</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <Card>
        <CardHeader />
        <CardContent>
          {!loading && totalProducts === 0 && !searchTerm && filterCategory === 'all' && statusFilter === 'all' ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="h-16 w-16 rounded-full bg-[#FB923C]/10 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-[#FB923C]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tu catálogo está vacío</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Crea tu primer producto para empezar a vender. Solo necesitas tipo, nombre y un precio — el resto puedes completarlo después.
              </p>
              <Button
                size="lg"
                className="bg-[#FB923C] hover:bg-[#F97316] text-white"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-5 w-5 mr-2" /> Agregar mi primer producto
              </Button>
            </div>
          ) : (
          <><div className="rounded-md border relative">
            {loading && <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  {visibleColumns.sku && (
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[8%]"
                      onClick={() => {
                        if (sortBy === 'sku') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('sku');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>SKU</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'sku' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[30%]"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Producto</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.brand && (
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[8%]"
                      onClick={() => {
                        if (sortBy === 'brand') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('brand');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Marca</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'brand' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.category && (
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[9%]"
                      onClick={() => {
                        if (sortBy === 'category') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('category');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Categoría</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'category' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {!isNonFoodRetailVertical && visibleColumns.isSoldByWeight && <TableHead className="text-center w-[6%]">Por peso</TableHead>}
                  {showSalesFields && visibleColumns.price && (
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors w-[9%]"
                      onClick={() => {
                        if (sortBy === 'price') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('price');
                          setSortOrder('desc'); // Por defecto descendente para precio (más caro arriba)
                        }
                      }}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Precio Venta</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'price' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.cost && (
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors w-[7%]"
                      onClick={() => {
                        if (sortBy === 'cost') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('cost');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Costo</span>
                        <span className="text-muted-foreground">
                          {sortBy === 'cost' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </TableHead>
                  )}
                  {showSalesFields && visibleColumns.wholesalePrice && <TableHead className="text-right w-[7%]">P. Mayor</TableHead>}
                  {visibleColumns.variants && <TableHead className="w-[7%]">Variantes</TableHead>}
                  {showSalesFields && visibleColumns.promotion && <TableHead className="w-[7%]">Promocion</TableHead>}
                  {visibleColumns.status && <TableHead className="w-[6%]">Estado</TableHead>}
                  {visibleColumns.actions && <TableHead className="w-[7%]">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product._id}>
                    {visibleColumns.sku && (
                      <TableCell>
                        <InlineEditableCell
                          value={product.sku}
                          type="text"
                          onSave={(val) => handleInlineUpdate(product._id, 'sku', val)}
                          className="font-mono text-sm"
                        />
                      </TableCell>
                    )}
                    {visibleColumns.name && (
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <InlineEditableCell
                            value={product.name}
                            type="text"
                            onSave={(val) => handleInlineUpdate(product._id, 'name', val)}
                            className="font-medium text-slate-800 dark:text-slate-100"
                          />
                          <span className="text-[10px] text-slate-400 font-mono sm:hidden">{product.brand}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.brand && (
                      <TableCell>
                        <InlineEditableCell
                          value={product.brand || ''}
                          type="text"
                          onSave={(val) => handleInlineUpdate(product._id, 'brand', val)}
                          className="w-[100px] text-xs text-slate-500 font-medium dark:text-slate-400"
                          placeholder="Sin marca"
                        />
                      </TableCell>
                    )}
                    {visibleColumns.category && (
                      <TableCell>
                        <InlineEditableCell
                          value={Array.isArray(product.category) ? product.category.join(', ') : (product.category || '')}
                          type="text"
                          suggestions={categories}
                          onSave={(val) => handleInlineUpdate(product._id, 'category', val)}
                          className="w-[120px] text-xs text-slate-500 font-medium dark:text-slate-400"
                        />
                      </TableCell>
                    )}
                    {!isNonFoodRetailVertical && visibleColumns.isSoldByWeight && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={product.isSoldByWeight || false}
                          onCheckedChange={(checked) => handleInlineUpdate(product._id, 'isSoldByWeight', checked)}
                          aria-label="Seleccionar si se vende por peso"
                        />
                      </TableCell>
                    )}
                    {showSalesFields && visibleColumns.price && (
                      <TableCell className="text-right">
                        {product.variants?.length > 1 ? (
                          <ProductVariantsPopover
                            variants={product.variants}
                            onUpdateVariant={(idx, field, val) => handleInlineUpdate(product._id, field, val, idx)}
                          >
                            <div className="font-medium cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              ${(product.variants[0]?.basePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-xs text-blue-500 font-bold group-hover:underline decoration-blue-500">(+)</span>
                            </div>
                          </ProductVariantsPopover>
                        ) : product.hasMultipleSellingUnits && product.sellingUnits?.length > 0 ? (
                          <SellingUnitsPopover
                            sellingUnits={product.sellingUnits}
                            unitOfMeasure={product.unitOfMeasure}
                            onUpdateSellingUnit={(idx, field, val) => handleSellingUnitInlineUpdate(product._id, idx, field, val)}
                          >
                            <div className="font-medium cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              ${((product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0])?.pricePerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-xs text-emerald-500 font-bold group-hover:underline decoration-emerald-500">(+)</span>
                            </div>
                          </SellingUnitsPopover>
                        ) : (
                          <InlineEditableCell
                            value={product.variants?.[0]?.basePrice || 0}
                            type="currency"
                            onSave={(val) => handleInlineUpdate(product._id, 'basePrice', val)}
                            className="justify-end font-medium"
                          />
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.cost && (
                      <TableCell className="text-right">
                        {product.variants?.length > 1 ? (
                          <ProductVariantsPopover
                            variants={product.variants}
                            onUpdateVariant={(idx, field, val) => handleInlineUpdate(product._id, field, val, idx)}
                          >
                            <div className="text-muted-foreground cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              ${(product.variants[0]?.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-blue-500 font-bold group-hover:underline decoration-blue-500">(+)</span>
                            </div>
                          </ProductVariantsPopover>
                        ) : product.hasMultipleSellingUnits && product.sellingUnits?.length > 0 ? (
                          <SellingUnitsPopover
                            sellingUnits={product.sellingUnits}
                            unitOfMeasure={product.unitOfMeasure}
                            onUpdateSellingUnit={(idx, field, val) => handleSellingUnitInlineUpdate(product._id, idx, field, val)}
                          >
                            <div className="text-muted-foreground cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              ${((product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0])?.costPerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-emerald-500 font-bold group-hover:underline decoration-emerald-500">(+)</span>
                            </div>
                          </SellingUnitsPopover>
                        ) : (
                          <InlineEditableCell
                            value={product.variants?.[0]?.costPrice || 0}
                            type="currency"
                            onSave={(val) => handleInlineUpdate(product._id, 'costPrice', val)}
                            className="justify-end text-muted-foreground"
                          />
                        )}
                      </TableCell>
                    )}
                    {showSalesFields && visibleColumns.wholesalePrice && (
                      <TableCell className="text-right">
                        {product.variants?.length > 1 ? (
                          <ProductVariantsPopover
                            variants={product.variants}
                            onUpdateVariant={(idx, field, val) => handleInlineUpdate(product._id, field, val, idx)}
                          >
                            <div className="text-info cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              {product.variants[0]?.wholesalePrice ? `$${(product.variants[0].wholesalePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              <span className="text-[10px] text-blue-500 font-bold group-hover:underline decoration-blue-500">(+)</span>
                            </div>
                          </ProductVariantsPopover>
                        ) : product.hasMultipleSellingUnits && product.sellingUnits?.length > 0 ? (
                          <SellingUnitsPopover
                            sellingUnits={product.sellingUnits}
                            unitOfMeasure={product.unitOfMeasure}
                            onUpdateSellingUnit={(idx, field, val) => handleSellingUnitInlineUpdate(product._id, idx, field, val)}
                          >
                            <div className="text-info cursor-pointer inline-flex items-center justify-end gap-1 group hover:bg-muted/50 p-1 rounded transition-colors">
                              {product.variants?.[0]?.wholesalePrice ? `$${(product.variants[0].wholesalePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              <span className="text-[10px] text-emerald-500 font-bold group-hover:underline decoration-emerald-500">(+)</span>
                            </div>
                          </SellingUnitsPopover>
                        ) : (
                          <InlineEditableCell
                            value={product.variants?.[0]?.wholesalePrice || 0}
                            type="currency"
                            onSave={(val) => handleInlineUpdate(product._id, 'wholesalePrice', val)}
                            className="justify-end text-info"
                          />
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.variants && <TableCell>{product.variants.length}</TableCell>}
                    {showSalesFields && visibleColumns.promotion && (
                      <TableCell>
                        {product.hasActivePromotion && product.promotion?.isActive ? (
                          <Badge className="bg-warning/10 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            -{product.promotion.discountPercentage}% OFF
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={product.isActive ?? true}
                                onCheckedChange={() => handleToggleProductStatus(product)}
                                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500"
                                aria-label={product.isActive ? 'Activo' : 'Inactivo'}
                              />
                              {product.isActive
                                ? <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                                : <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
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
                            // Ensure top-level origin is copied to attributes for display
                            if (productToEdit.origin && !productToEdit.attributes.origin) {
                              productToEdit.attributes.origin = productToEdit.origin;
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
                            // Initialize pricingRules fields if missing (for legacy products)
                            if (!productToEdit.pricingRules) {
                              productToEdit.pricingRules = {};
                            }
                            if (productToEdit.pricingRules.wholesaleEnabled === undefined) {
                              productToEdit.pricingRules.wholesaleEnabled = false;
                            }
                            if (productToEdit.pricingRules.wholesaleMinQuantity === undefined) {
                              productToEdit.pricingRules.wholesaleMinQuantity = 1;
                            }
                            if (productToEdit.pricingRules.bulkDiscountEnabled === undefined) {
                              productToEdit.pricingRules.bulkDiscountEnabled = false;
                            }
                            if (!productToEdit.pricingRules.bulkDiscountRules) {
                              productToEdit.pricingRules.bulkDiscountRules = [];
                            }
                            // Fix: Map legacy attributes.storageCondition to native storageTemperature if missing
                            if (!productToEdit.storageTemperature && productToEdit.attributes?.storageCondition) {
                              const map = { 'Ambiente': 'ambiente', 'Refrigerado': 'refrigerado', 'Congelado': 'congelado' };
                              productToEdit.storageTemperature = map[productToEdit.attributes.storageCondition] || productToEdit.attributes.storageCondition.toLowerCase();
                            }
                            productToEdit.sellingUnits = productToEdit.sellingUnits.map((unit) => {
                              // Calculate inverted factor for display (e.g. 1 / 0.05 = 20)
                              const factor = unit?.conversionFactor;

                              // If conversionFactorInput exists (draft), use it. 
                              // Otherwise, calculate from factor: 1/factor
                              let conversionSource = unit?.conversionFactorInput || '';
                              if (!conversionSource && factor) {
                                conversionSource = parseFloat((1 / factor).toFixed(4)).toString();
                              }

                              const priceSource =
                                unit?.pricePerUnitInput ?? unit?.pricePerUnit ?? '';
                              const costSource =
                                unit?.costPerUnitInput ?? unit?.costPerUnit ?? '';
                              return {
                                ...unit,
                                conversionFactorInput: normalizeDecimalInput(conversionSource),
                                // Keep original factor internally
                                conversionFactor: factor,
                                pricePerUnitInput: normalizeDecimalInput(priceSource),
                                pricePerUnit: parseDecimalInput(priceSource),
                                costPerUnitInput: normalizeDecimalInput(costSource),
                                costPerUnit: parseDecimalInput(costSource),
                              };
                            });
                            productToEdit.category = normalizeStringList(productToEdit.category);
                            productToEdit.subcategory = normalizeStringList(productToEdit.subcategory);
                            const unit = productToEdit.shelfLifeUnit || 'days';
                            productToEdit.shelfLifeUnit = unit;
                            productToEdit.shelfLifeValue = shelfLifeDaysToValue(productToEdit.shelfLifeDays, unit);
                            // Auto-expand advanced pricing for variants that already have data
                            const initialExpanded = {};
                            (productToEdit.variants || []).forEach((v) => {
                              const hasData =
                                (v.customPrices?.length > 0) ||
                                (v.volumeDiscounts?.length > 0) ||
                                (v.locationPricing?.length > 0);
                              if (hasData && v.sku) initialExpanded[v.sku] = true;
                            });
                            setAdvancedPricingExpanded(initialExpanded);
                            setEditingProduct(productToEdit);
                            setIsEditDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteProduct(product._id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
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
          </div></>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      {
        editingProduct && (
          <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <SheetContent
              side="right"
              className="!inset-4 !top-4 !bottom-4 !right-4 !h-auto !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-2rem)] rounded-xl border overflow-hidden flex flex-col p-0"
            >
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <SheetTitle>Editar Producto: {editingProduct.name}</SheetTitle>
                <SheetDescription>Modifica la información del producto y sus precios.</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="esencial" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="mx-6 mt-4 self-start">
                  <TabsTrigger value="esencial">Esencial</TabsTrigger>
                  <TabsTrigger value="inventario">Inventario</TabsTrigger>
                  <TabsTrigger value="precios">Precios</TabsTrigger>
                  <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
                </TabsList>
                <TabsContent value="esencial" className="flex-1 overflow-y-auto mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-6">
                {/* Identidad del producto: Nombre (50%) + Marca (25%) + SKU (25%) */}
                <div className="col-span-2 grid grid-cols-4 gap-x-6 gap-y-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-name">Nombre del Producto</Label>
                    <Input id="edit-name" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="edit-brand">Marca</Label>
                    <Input id="edit-brand" value={editingProduct.brand} onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="edit-sku">SKU base</Label>
                    <Input
                      id="edit-sku"
                      value={editingProduct.sku}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    />
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      ⚠️ Cambiar el SKU actualizará todo el historial de inventario. Asegúrese de que el nuevo SKU sea único.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <TagInput
                    id="edit-category"
                    value={Array.isArray(editingProduct.category) ? editingProduct.category : (editingProduct.category ? [editingProduct.category] : [])}
                    onChange={(tags) => setEditingProduct({ ...editingProduct, category: tags })}
                    placeholder="Ej: Bebidas, Alimentos"
                    helpText="Escribe una categoría y presiona coma (,) o Enter para agregar. Puedes agregar múltiples categorías para ayudar a la IA a encontrar productos más fácilmente."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subcategory">Sub-categoría</Label>
                  <TagInput
                    id="edit-subcategory"
                    value={Array.isArray(editingProduct.subcategory) ? editingProduct.subcategory : (editingProduct.subcategory ? [editingProduct.subcategory] : [])}
                    onChange={(tags) => setEditingProduct({ ...editingProduct, subcategory: tags })}
                    placeholder="Ej: Gaseosas, Refrescos"
                    helpText="Escribe una sub-categoría y presiona coma (,) o Enter para agregar. Esto facilita la búsqueda sin necesidad de ser experto."
                  />
                </div>
                {productAttributes.length > 0 && (
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-medium">Atributos del Producto</h4>
                      <p className="text-xs text-muted-foreground">
                        Se guardarán en la ficha del producto.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {productAttributes.filter(attr => attr.key !== 'storageCondition').map((attr) => (
                        <div key={attr.key} className="space-y-2">
                          <Label>
                            {attr.label}
                            {attr.required ? <span className="text-destructive"> *</span> : null}
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
                <div className={isNonFoodRetailVertical ? "col-span-2 space-y-2" : "space-y-2"}>
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea id="edit-description" value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} />
                </div>
                {!isNonFoodRetailVertical && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-ingredients">{ingredientLabel}</Label>
                    <Textarea
                      id="edit-ingredients"
                      value={editingProduct.ingredients}
                      onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                      placeholder={isNonFoodRetailVertical ? 'Describe la composición del producto' : 'Lista de ingredientes'}
                    />
                  </div>
                )}

                {/* Configuración operativa: IVA + Vendido por Peso + Estado */}
                <div className="col-span-2 grid grid-cols-3 gap-4 items-end">
                  {!isNonFoodRetailVertical && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-ivaRate">IVA Aplicable</Label>
                      <Select
                        value={String(editingProduct.ivaRate ?? (editingProduct.ivaApplicable ? 16 : 0))}
                        onValueChange={(value) =>
                          setEditingProduct({
                            ...editingProduct,
                            ivaRate: Number(value),
                            ivaApplicable: Number(value) > 0
                          })
                        }
                      >
                        <SelectTrigger id="edit-ivaRate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Exento (0%)</SelectItem>
                          <SelectItem value="8">Reducido (8%)</SelectItem>
                          <SelectItem value="16">Normal (16%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {verticalConfig?.allowsWeight && (
                    <div className="flex items-center space-x-2 rounded-md border px-3 py-2 h-10">
                      <Checkbox id="edit-isSoldByWeight" checked={editingProduct.isSoldByWeight} onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, isSoldByWeight: checked })} />
                      <Label htmlFor="edit-isSoldByWeight" className="cursor-pointer">Vendido por Peso</Label>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-md border px-3 py-2 h-10">
                    <Label htmlFor="edit-isActive" className="text-sm font-medium cursor-pointer">Estado</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${editingProduct.isActive ?? true ? 'text-success' : 'text-muted-foreground'}`}>
                        {editingProduct.isActive ?? true ? 'Activo' : 'Inactivo'}
                      </span>
                      <Switch
                        id="edit-isActive"
                        checked={editingProduct.isActive ?? true}
                        onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, isActive: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Pricing — visible inline when product has only the
                    auto-created "Estándar" variant. For products with real
                    variants (size/color), show a hint pointing to Avanzado. */}
                {(() => {
                  const variants = editingProduct.variants || [];
                  const hasMultipleVariants = variants.length > 1;
                  const v = variants[0];

                  if (hasMultipleVariants) {
                    return (
                      <div className="col-span-2 border-t pt-4 mt-2">
                        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/40 border border-border/50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">Precios por variante</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Este producto tiene {variants.length} variantes. Configura precios individuales en la pestaña <span className="font-medium">Avanzado</span>.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (!v) return null;

                  const cost = Number(v.costPrice) || 0;
                  const price = Number(v.basePrice) || 0;
                  const isAutoCalculated =
                    v.pricingStrategy?.mode !== 'manual' &&
                    v.pricingStrategy?.autoCalculate;
                  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                  const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;

                  return (
                    <div className="col-span-2 border-t pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-medium">Precios</h4>
                        <p className="text-xs text-muted-foreground">
                          Para listas, descuentos por volumen o sucursal: pestaña <span className="font-medium">Precios</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-quick-costPrice">Precio costo ($)</Label>
                          <Input
                            id="edit-quick-costPrice"
                            type="number"
                            value={v.costPrice ?? ''}
                            onChange={(e) => handleEditVariantFieldChange(0, 'costPrice', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-quick-basePrice" className="flex items-center gap-2">
                            Precio venta ($)
                            {isAutoCalculated && (
                              <Badge variant="secondary" className="text-xs">Calculado</Badge>
                            )}
                          </Label>
                          <Input
                            id="edit-quick-basePrice"
                            type="number"
                            value={v.basePrice ?? ''}
                            onChange={(e) => handleEditVariantFieldChange(0, 'basePrice', e.target.value)}
                            placeholder="0.00"
                            disabled={isAutoCalculated}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Margen / Markup</Label>
                          <div className="px-3 py-2 rounded-md border bg-muted/30 text-sm">
                            {cost > 0 && price > 0 ? (
                              <span>
                                <span className="font-medium">{margin.toFixed(1)}%</span>
                                <span className="text-muted-foreground"> margen · </span>
                                <span className="font-medium">{markup.toFixed(1)}%</span>
                                <span className="text-muted-foreground"> markup</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Ingresa costo y precio</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                  </div>
                </TabsContent>

                <TabsContent value="inventario" className="flex-1 overflow-y-auto mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-6">

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

                {/* Edit Send to Kitchen (Restaurant Only) */}
                {isRestaurant && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="edit-sendToKitchen"
                      checked={editingProduct.sendToKitchen !== false}
                      onCheckedChange={(checked) =>
                        setEditingProduct({ ...editingProduct, sendToKitchen: checked })
                      }
                    />
                    <Label htmlFor="edit-sendToKitchen">Enviar a Cocina / Comanda</Label>
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
                      <Label htmlFor="edit-shelfLifeValue">Vida Útil</Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-shelfLifeValue"
                          type="number"
                          className="flex-1"
                          value={editingProduct.shelfLifeValue ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditingProduct({
                              ...editingProduct,
                              shelfLifeValue: val,
                              shelfLifeDays: shelfLifeValueToDays(val, editingProduct.shelfLifeUnit || 'days'),
                            });
                          }}
                        />
                        <Select
                          value={editingProduct.shelfLifeUnit || 'days'}
                          onValueChange={(unit) => setEditingProduct({
                            ...editingProduct,
                            shelfLifeUnit: unit,
                            shelfLifeDays: shelfLifeValueToDays(editingProduct.shelfLifeValue, unit),
                          })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Días</SelectItem>
                            <SelectItem value="months">Meses</SelectItem>
                            <SelectItem value="years">Años</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                        <NumberInput
                          id="edit-minimumStock"
                          value={editingProduct.inventoryConfig.minimumStock ?? ''}
                          onValueChange={(val) => setEditingProduct({ ...editingProduct, inventoryConfig: { ...editingProduct.inventoryConfig, minimumStock: val } })}
                          step={1}
                          min={0}
                          placeholder="Stock mínimo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maximumStock">Stock Máximo</Label>
                        <NumberInput
                          id="edit-maximumStock"
                          value={editingProduct.inventoryConfig.maximumStock ?? ''}
                          onValueChange={(val) => setEditingProduct({ ...editingProduct, inventoryConfig: { ...editingProduct.inventoryConfig, maximumStock: val } })}
                          step={1}
                          min={0}
                          placeholder="Stock máximo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderPoint">Punto de Reorden</Label>
                        <NumberInput
                          id="edit-reorderPoint"
                          value={editingProduct.inventoryConfig.reorderPoint ?? ''}
                          onValueChange={(val) => setEditingProduct({ ...editingProduct, inventoryConfig: { ...editingProduct.inventoryConfig, reorderPoint: val } })}
                          step={1}
                          min={0}
                          placeholder="Punto de reorden"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderQuantity">Cantidad de Reorden</Label>
                        <NumberInput
                          id="edit-reorderQuantity"
                          value={editingProduct.inventoryConfig.reorderQuantity ?? ''}
                          onValueChange={(val) => setEditingProduct({ ...editingProduct, inventoryConfig: { ...editingProduct.inventoryConfig, reorderQuantity: val } })}
                          step={1}
                          min={0}
                          placeholder="Cantidad de reorden"
                        />
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                </TabsContent>

                <TabsContent value="precios" className="flex-1 overflow-y-auto mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-6">

                {/* Clarifying note: this tab vs Avanzado */}
                <div className="col-span-2 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    <strong>Reglas de precio del producto.</strong> Lo que configures aquí (estrategia, descuentos por volumen, mayorista, promoción) <strong>aplica a todas las variantes</strong> del producto. Si necesitas precios distintos por variante específica (talla, color, etc.), ve a la pestaña <strong>Avanzado</strong>.
                  </p>
                </div>

                {/* Precios y Descuentos — Accordion unificado (Edit) */}
                <div className="col-span-2">
                  <ProductPricingAccordion
                    product={editingProduct}
                    onProductChange={setEditingProduct}
                    useInputForNumbers={true}
                  />
                </div>
                  </div>
                </TabsContent>

                <TabsContent value="avanzado" className="flex-1 overflow-y-auto mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-6">

                {!isNonFoodRetailVertical && (
                  <div className="col-span-2">
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
                      <div className="mb-4 p-3 bg-info-muted border border-info/30 rounded-md">
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
                                  setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
                                  }}
                                />
                              </div>
                              <div className="flex items-center space-x-2 pt-8">
                                <Checkbox
                                  id={`edit-su-weight-${index}`}
                                  checked={unit.isSoldByWeight || false}
                                  onCheckedChange={(checked) => {
                                    const units = [...editingProduct.sellingUnits];
                                    units[index].isSoldByWeight = checked;
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
                                  }}
                                />
                                <Label htmlFor={`edit-su-weight-${index}`}>Vendido por peso</Label>
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                  Contenido por {editingProduct.unitOfMeasure}
                                  <span className="text-xs text-muted-foreground p-1">(¿Cuántos {unit.abbreviation || 'unidad'} tiene 1 {editingProduct.unitOfMeasure}?)</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  inputMode="decimal"
                                  placeholder={getPlaceholder('sellingUnitConversion', 'Ej: 20')}
                                  value={
                                    unit.conversionFactorInput ??
                                    (unit.conversionFactor ? normalizeDecimalInput(parseFloat((1 / unit.conversionFactor).toFixed(4)).toString()) : '')
                                  }
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                      if (unitIndex !== index) {
                                        return currentUnit;
                                      }
                                      // Logic: Input = Units per Base. Factor = 1 / Input.
                                      // We save rawInput for UI, and calculatedFactor for potential immediate logic
                                      const parsedInput = parseDecimalInput(rawValue);
                                      const calculatedFactor = parsedInput > 0 ? (1 / parsedInput) : null;

                                      return {
                                        ...currentUnit,
                                        conversionFactorInput: rawValue,
                                        conversionFactor: calculatedFactor,
                                      };
                                    });
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
                                  }}
                                  onBlur={() => {
                                    const units = editingProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                      if (unitIndex !== index) {
                                        return currentUnit;
                                      }
                                      const normalizedInput = normalizeDecimalInput(currentUnit.conversionFactorInput ?? '');
                                      // Re-calculate on blur
                                      const parsedInput = parseDecimalInput(normalizedInput);
                                      const calculatedFactor = parsedInput > 0 ? (1 / parsedInput) : null;

                                      return {
                                        ...currentUnit,
                                        conversionFactorInput: normalizedInput,
                                        conversionFactor: calculatedFactor,
                                      };
                                    });
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
                                  }}
                                />
                                <p className="text-xs text-muted-foreground font-medium text-info mt-1">
                                  {unit.conversionFactorInput ? (
                                    `1 ${editingProduct.unitOfMeasure} contiene ${unit.conversionFactorInput} ${unit.abbreviation || 'unidad'}`
                                  ) : (
                                    `Define el contenido`
                                  )}
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                    setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                      setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                                      setEditingProduct({ ...editingProduct, sellingUnits: units });
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
                            <Select
                              value={variant.unit || editingProduct.unitOfMeasure || ''}
                              onValueChange={(value) => handleEditVariantFieldChange(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona unidad" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={editingProduct.unitOfMeasure || 'unidad'}>{editingProduct.unitOfMeasure || 'unidad'}</SelectItem>
                                {(editingProduct.sellingUnits || [])
                                  .filter((u) => u.abbreviation || u.name)
                                  .map((u, i) => (
                                    <SelectItem key={i} value={u.abbreviation || u.name}>{u.name} ({u.abbreviation})</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {!isNonFoodRetailVertical && (
                          <div className="space-y-2">
                            <Label>Tamaño de unidad</Label>
                            <Input
                              type="number"
                              value={variant.unitSize ?? ''}
                              onChange={(e) => handleEditVariantFieldChange(index, 'unitSize', e.target.value)}
                              placeholder="1"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Precio costo ($)</Label>
                          <Input
                            type="number"
                            value={variant.costPrice ?? ''}
                            onChange={(e) => handleEditVariantFieldChange(index, 'costPrice', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Precio venta ($)
                            {variant.pricingStrategy?.mode !== 'manual' &&
                              variant.pricingStrategy?.autoCalculate && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Auto-calculado
                                </Badge>
                              )}
                          </Label>
                          <Input
                            type="number"
                            value={variant.basePrice ?? ''}
                            onChange={(e) => handleEditVariantFieldChange(index, 'basePrice', e.target.value)}
                            placeholder="0.00"
                            disabled={
                              variant.pricingStrategy?.mode !== 'manual' &&
                              variant.pricingStrategy?.autoCalculate
                            }
                          />
                        </div>
                        {editingProduct?.pricingRules?.wholesaleEnabled && (
                          <div className="space-y-2">
                            <Label>Precio mayorista ($)</Label>
                            <Input
                              type="number"
                              value={variant.wholesalePrice ?? ''}
                              onChange={(e) => handleEditVariantFieldChange(index, 'wholesalePrice', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </div>

                      {/* Pricing Strategy Selector para edición */}
                      {showSalesFields && (
                        <div className="mt-4">
                          <PricingStrategySelector
                            strategy={variant.pricingStrategy || {
                              mode: 'manual',
                              autoCalculate: false,
                              markupPercentage: 30,
                              marginPercentage: 25,
                            }}
                            costPrice={variant.costPrice || 0}
                            basePrice={variant.basePrice || 0}
                            onStrategyChange={(strategy) =>
                              handleEditVariantFieldChange(index, 'pricingStrategy', strategy)
                            }
                            onPriceChange={(price) =>
                              handleEditVariantFieldChange(index, 'basePrice', price)
                            }
                          />
                        </div>
                      )}

                      {/* Advanced pricing per variant — collapsed by default, auto-expand if data exists */}
                      {showSalesFields && variant.sku && (() => {
                        const isExpanded = !!advancedPricingExpanded[variant.sku];
                        const hasData =
                          (variant.customPrices?.length > 0) ||
                          (variant.volumeDiscounts?.length > 0) ||
                          (variant.locationPricing?.length > 0);
                        return (
                          <div className="mt-6 rounded-md border bg-muted/20">
                            <button
                              type="button"
                              onClick={() =>
                                setAdvancedPricingExpanded((prev) => ({
                                  ...prev,
                                  [variant.sku]: !prev[variant.sku],
                                }))
                              }
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors rounded-md"
                            >
                              <div className="flex items-center gap-2 text-left">
                                <span className="text-sm font-medium">Precios avanzados</span>
                                <span className="text-xs text-muted-foreground">
                                  (listas, volumen, sucursal)
                                </span>
                                {hasData && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Configurado
                                  </Badge>
                                )}
                              </div>
                              <Switch
                                checked={isExpanded}
                                onCheckedChange={(checked) =>
                                  setAdvancedPricingExpanded((prev) => ({
                                    ...prev,
                                    [variant.sku]: checked,
                                  }))
                                }
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Habilitar precios avanzados"
                              />
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-4 border-t">
                                <div className="mt-3 p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                                    <strong>Precios específicos de esta variante.</strong> Solo aplican a esta variante. Para reglas que apliquen a todas las variantes del producto, usa la pestaña <strong>Precios</strong>.
                                  </p>
                                </div>

                                {editingProduct?._id && (
                                  <ProductPriceListManager
                                    productId={editingProduct._id}
                                    variantSku={variant.sku}
                                    basePrice={variant.basePrice || 0}
                                    customPrices={variant.customPrices || []}
                                    onChange={(customPrices) =>
                                      handleEditVariantFieldChange(index, 'customPrices', customPrices)
                                    }
                                  />
                                )}

                                <VolumeDiscountsManager
                                  basePrice={variant.basePrice || 0}
                                  volumeDiscounts={variant.volumeDiscounts || []}
                                  onChange={(volumeDiscounts) =>
                                    handleEditVariantFieldChange(index, 'volumeDiscounts', volumeDiscounts)
                                  }
                                />

                                <LocationPricingManager
                                  basePrice={variant.basePrice || 0}
                                  locationPricing={variant.locationPricing || []}
                                  locations={[]}
                                  onChange={(locationPricing) =>
                                    handleEditVariantFieldChange(index, 'locationPricing', locationPricing)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {variantAttributes.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h6 className="text-sm font-medium mb-3">Atributos específicos</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {variantAttributes.map((attr) => (
                              <div key={`${index}-${attr.key}`} className="space-y-2">
                                <Label>
                                  {attr.label}
                                  {attr.required ? <span className="text-destructive"> *</span> : null}
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
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-card">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdateProduct}>Guardar Cambios</Button>
              </div>
            </SheetContent>
          </Sheet>
        )
      }

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
      <ExportOptionsDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleConfirmExport}
        columns={getExportColumns()}
        title={exportFormat === 'xlsx' ? "Exportar a Excel" : "Exportar a CSV"}
      />
      <ShelfLabelWizard
        isOpen={isLabelWizardOpen}
        onClose={() => setIsLabelWizardOpen(false)}
      />
      <ConfirmDialog />
    </div >
  );
}

export default ProductsManagement;
