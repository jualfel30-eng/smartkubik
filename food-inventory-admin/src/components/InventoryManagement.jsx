import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { ShelfLabelWizard } from './inventory/ShelfLabelWizard';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  Package,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  ArrowRightLeft,
  Printer,
  Loader2
} from 'lucide-react';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';

const DEFAULT_ITEMS_PER_PAGE = 20;
const SEARCH_ITEMS_PER_PAGE = 100;
const SEARCH_DEBOUNCE_MS = 600;

function InventoryManagement() {
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [binLocations, setBinLocations] = useState([]);
  const [newInventoryItem, setNewInventoryItem] = useState({
    productId: '',
    productName: '',
    totalQuantity: 0,
    averageCostPrice: 0,
    lots: [],
    warehouseId: '',
    binLocationId: '',
  });

  // Estados para exportación
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [variantQuantities, setVariantQuantities] = useState([]);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [editFormData, setEditFormData] = useState({ newQuantity: 0, reason: '', binLocationId: '' });
  const fileInputRef = useRef(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [importReason, setImportReason] = useState('');
  const [isLotsDialogOpen, setIsLotsDialogOpen] = useState(false);
  const [selectedInventoryForLots, setSelectedInventoryForLots] = useState(null);
  const [editingLotIndex, setEditingLotIndex] = useState(null);
  const [editingLotData, setEditingLotData] = useState(null);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    sku: true,
    product: true,
    category: true,
    available: true,
    cost: true,
    location: true,
    expiration: true,
    lots: true,
    status: true,
    actions: true,
    sellingPrice: false,
    totalValue: false
  });

  const [isLabelWizardOpen, setIsLabelWizardOpen] = useState(false);

  // Estados para transferencias
  const [warehouses, setWarehouses] = useState([]);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: '',
    productName: '',
    productSku: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    sourceBinLocationId: '',
    destinationBinLocationId: '',
    quantity: '',
    reason: '',
    availableQuantity: 0,
  });
  const [transferLoading, setTransferLoading] = useState(false);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [committedSearch, setCommittedSearch] = useState('');
  const verticalConfig = useVerticalConfig();
  const manualItemsPerPageRef = useRef(DEFAULT_ITEMS_PER_PAGE);
  const lastQueryRef = useRef({ search: null, limit: null });
  const inventoryAttributes = useMemo(
    () => (verticalConfig?.attributeSchema || []).filter((attr) => attr.scope === 'inventory'),
    [verticalConfig],
  );
  const inventoryAttributeColumns = useMemo(
    () =>
      inventoryAttributes.map((descriptor) => ({
        descriptor,
        header: `inventoryAttr_${descriptor.key}`,
      })),
    [inventoryAttributes],
  );
  const placeholders = useMemo(() => verticalConfig?.placeholders || {}, [verticalConfig]);
  const getPlaceholder = useCallback(
    (key, fallback) => (placeholders[key] && placeholders[key].trim() !== '' ? placeholders[key] : fallback),
    [placeholders],
  );
  const selectedProduct = useMemo(() => {
    if (
      selectedProductDetails &&
      selectedProductDetails._id === newInventoryItem.productId
    ) {
      return selectedProductDetails;
    }
    return null;
  }, [newInventoryItem.productId, selectedProductDetails]);

  const formatVariantLabel = useCallback((variant) => {
    if (!variant) {
      return '';
    }
    if (variant.name && variant.name.trim()) {
      return variant.name;
    }
    if (variant.attributes && Object.keys(variant.attributes).length > 0) {
      return Object.entries(variant.attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ');
    }
    return variant.sku || 'Variante';
  }, []);

  const formatProductCategory = useCallback((category) => {
    if (Array.isArray(category)) {
      const cleaned = category
        .map((value) => (typeof value === 'string' ? value.trim() : String(value || '')))
        .filter((value) => value.length > 0);
      return cleaned.length > 0 ? cleaned.join(', ') : 'N/A';
    }

    if (typeof category === 'string') {
      const trimmed = category.trim();
      return trimmed || 'N/A';
    }

    if (category === null || category === undefined) {
      return 'N/A';
    }

    const coerced = String(category).trim();
    return coerced || 'N/A';
  }, []);
  const useVariantInventory = useMemo(() => {
    if (!selectedProduct) {
      return false;
    }

    // BACKWARD COMPATIBILITY: Solo usar variantes si existen y tienen datos válidos
    // Productos antiguos sin variantes seguirán funcionando normalmente
    const hasVariants = Array.isArray(selectedProduct.variants) &&
      selectedProduct.variants.length > 0;

    if (!hasVariants) {
      console.log('📦 [useVariantInventory] Producto SIN variantes (formato antiguo o sin variantes)');
      return false;
    }

    // Verificar que las variantes tengan el formato correcto
    const hasValidVariants = selectedProduct.variants.some(v => v._id || v.sku);

    if (!hasValidVariants) {
      console.warn('⚠️ [useVariantInventory] Producto tiene array de variantes pero sin datos válidos');
      return false;
    }

    console.log('✅ [useVariantInventory] Producto CON variantes válidas:', selectedProduct.variants.length);
    return true;
  }, [selectedProduct]);

  // Determine the step for quantity inputs based on product configuration
  const quantityStep = useMemo(() => {
    return selectedProduct?.isSoldByWeight ? 0.001 : 1;
  }, [selectedProduct]);

  const handleLotChange = (index, field, value) => {
    const updatedLots = [...newInventoryItem.lots];
    updatedLots[index][field] = value;
    setNewInventoryItem({ ...newInventoryItem, lots: updatedLots });
  };

  const handleVariantQuantityChange = (index, value) => {
    setVariantQuantities((prev) => {
      const next = [...prev];
      if (!next[index]) {
        return prev;
      }
      next[index] = { ...next[index], quantity: value };
      return next;
    });
  };

  const addLot = () => {
    setNewInventoryItem({
      ...newInventoryItem,
      lots: [...newInventoryItem.lots, { lotNumber: '', quantity: 0, expirationDate: '' }]
    });
  };

  const removeLot = (index) => {
    const updatedLots = newInventoryItem.lots.filter((_, i) => i !== index);
    setNewInventoryItem({ ...newInventoryItem, lots: updatedLots });
  };

  const loadData = useCallback(async ({ page, limit, search } = {}) => {
    try {
      setLoading(true);
      setError(null);
      const safePage = Number(page ?? currentPage ?? 1);
      const safeLimit = Number(limit ?? itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE);
      const safeSearch = (search ?? committedSearch ?? '').trim();
      const usingSearch = safeSearch.length > 0;

      // Cuando hay búsqueda, pedimos una sola página amplia y filtramos en frontend
      const queryPage = usingSearch ? 1 : safePage;
      // Backend limita a 100, así que nunca pedimos más que eso
      const requestedLimit = usingSearch ? Math.max(SEARCH_ITEMS_PER_PAGE, safeLimit, 100) : safeLimit;
      const queryLimit = Math.min(100, requestedLimit);

      console.log('🔄 [InventoryManagement] Cargando datos... Página:', queryPage, 'Límite:', queryLimit, 'Search:', safeSearch);

      const params = new URLSearchParams({
        page: queryPage.toString(),
        limit: queryLimit.toString(),
      });

      // Nota: evitamos pasar el search al backend para no depender de su lógica (ej. solo busca por SKU).

      // Fetch inventory, bin locations, and warehouses in parallel (if multi-warehouse enabled)
      const [inventoryResponse, binLocationsResponse, warehousesResponse] = await Promise.all([
        fetchApi(`/inventory?${params.toString()}`),
        multiWarehouseEnabled ? fetchApi('/bin-locations') : Promise.resolve([]),
        multiWarehouseEnabled ? fetchApi('/warehouses') : Promise.resolve([]),
      ]);

      // Update bin locations state
      setBinLocations(Array.isArray(binLocationsResponse) ? binLocationsResponse : binLocationsResponse?.data || []);

      // Update warehouses state
      const warehousesList = Array.isArray(warehousesResponse) ? warehousesResponse : warehousesResponse?.data || [];
      setWarehouses(warehousesList.filter(w => w.isActive !== false && w.isDeleted !== true));

      console.log('📦 [InventoryManagement] Inventarios recibidos:', inventoryResponse?.data?.length || 0);
      console.log('📊 [InventoryManagement] Paginación:', inventoryResponse?.pagination);

      const inventoryWithAttributes = (inventoryResponse.data || []).map((item) => ({
        ...item,
        inventoryAttributes: item.attributes || item.inventoryAttributes || {},
      }));
      setInventoryData(inventoryWithAttributes);

      // Actualizar información de paginación
      if (usingSearch) {
        // Una sola página con los resultados descargados; el filtro de texto se aplica en frontend
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(inventoryWithAttributes.length);
      } else if (inventoryResponse?.pagination) {
        setCurrentPage(inventoryResponse.pagination.page);
        setTotalPages(inventoryResponse.pagination.totalPages);
        setTotalItems(inventoryResponse.pagination.total);
      } else {
        setCurrentPage(queryPage);
        setTotalPages(1);
        setTotalItems(inventoryWithAttributes.length);
      }

      console.log('✅ [InventoryManagement] Datos actualizados en estado');

    } catch (err) {
      console.error('❌ [InventoryManagement] Error al cargar datos:', err);
      setError(err.message);
      setInventoryData([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [committedSearch, currentPage, itemsPerPage, multiWarehouseEnabled]);

  const refreshData = useCallback(
    async (page, limit, search) => {
      await loadData({ page, limit, search });
      lastQueryRef.current = { search, limit };
    },
    [loadData],
  );

  useEffect(() => {
    console.log('🔍 [useEffect Filter] Filtrando datos...');
    console.log('🔍 [useEffect Filter] inventoryData.length:', inventoryData.length);
    const search = committedSearch.trim().toLowerCase();
    let filtered = inventoryData;

    // Filtro por categoría (igual exacto)
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.productId?.category === filterCategory);
    }

    // Filtro por texto (nombre, SKU, variant SKU)
    if (search) {
      filtered = filtered.filter((item) => {
        const candidates = [
          item.productName,
          item.productSku,
          item.variantSku,
          item.productId?.name,
          item.productId?.sku,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return candidates.some((value) => value.includes(search));
      });
    }

    console.log('🔍 [useEffect Filter] filteredData.length:', filtered.length);
    setFilteredData(filtered);
  }, [inventoryData, filterCategory, committedSearch]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed === '') {
      setCommittedSearch('');
      return;
    }
    const timeoutId = setTimeout(() => {
      setCommittedSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const effectiveLimit = committedSearch
      ? Math.max(manualItemsPerPageRef.current, SEARCH_ITEMS_PER_PAGE)
      : manualItemsPerPageRef.current;

    if (itemsPerPage !== effectiveLimit) {
      setItemsPerPage(effectiveLimit);
    }

    if (
      lastQueryRef.current.search !== committedSearch ||
      lastQueryRef.current.limit !== effectiveLimit
    ) {
      refreshData(1, effectiveLimit, committedSearch);
    }
  }, [committedSearch, itemsPerPage, refreshData]);

  const categories = useMemo(() => {
    const collected = [];

    inventoryData.forEach((item) => {
      const rawCategory = item.productId?.category;

      if (Array.isArray(rawCategory)) {
        rawCategory
          .map((value) => (typeof value === 'string' ? value.trim() : String(value || '')))
          .filter((value) => value.length > 0)
          .forEach((value) => collected.push(value));
        return;
      }

      if (typeof rawCategory === 'string') {
        const trimmed = rawCategory.trim();
        if (trimmed) {
          collected.push(trimmed);
        }
        return;
      }

      if (rawCategory !== null && rawCategory !== undefined) {
        const coerced = String(rawCategory).trim();
        if (coerced) {
          collected.push(coerced);
        }
      }
    });

    return Array.from(new Set(collected));
  }, [inventoryData]);

  // Funciones de paginación
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      refreshData(newPage, itemsPerPage, committedSearch);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const handleItemsPerPageChange = (newLimit) => {
    manualItemsPerPageRef.current = newLimit;
    const effectiveLimit = committedSearch
      ? Math.max(newLimit, SEARCH_ITEMS_PER_PAGE)
      : newLimit;
    setItemsPerPage(effectiveLimit);
    setCurrentPage(1);
    refreshData(1, effectiveLimit, committedSearch);
  };

  const getStatusBadge = (item) => {
    if (item.alerts?.lowStock) return <Badge variant="destructive">Stock Crítico</Badge>;
    if (item.alerts?.nearExpiration) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Próximo a Vencer</Badge>;
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  // Helper to get bin location display name
  const getBinLocationName = useCallback((binLocationId) => {
    if (!binLocationId) return null;
    const bin = binLocations.find((b) => (b._id || b.id) === binLocationId);
    if (!bin) return null;
    return bin.code + (bin.zone ? ` · ${bin.zone}` : '');
  }, [binLocations]);

  // Filter bin locations by warehouse for edit dialog
  const editBinOptions = useMemo(() => {
    if (!selectedItem?.warehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === selectedItem.warehouseId && bin.isActive !== false,
    );
  }, [binLocations, selectedItem]);

  const loadProductOptions = useCallback(async (searchQuery) => {
    try {
      const response = await fetchApi(
        `/products?search=${encodeURIComponent(searchQuery)}&limit=20`
      );

      return (response.data || []).map((p) => ({
        value: p._id,
        label: `${p.name} (${p.sku})`,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }, []);

  const handleProductSelection = (selectedOption) => {
    const newProductId = selectedOption ? selectedOption.value : '';
    const newProductLabel = selectedOption ? selectedOption.label : '';

    setNewInventoryItem((prev) => ({
      ...prev,
      productId: newProductId,
      productName: newProductLabel,
      totalQuantity: 0,
      lots: [],
    }));
    setSelectedProductDetails(null);

    if (newProductId) {
      fetchApi(`/products/${newProductId}`)
        .then((response) => {
          if (response?.data) {
            setSelectedProductDetails(response.data);
          }
        })
        .catch((error) => {
          console.error('Error fetching product detail:', error);
        });
    }
  };

  useEffect(() => {
    if (!isAddDialogOpen) {
      setVariantQuantities([]);
      return;
    }
    if (!useVariantInventory || !selectedProduct) {
      setVariantQuantities([]);
      return;
    }

    setVariantQuantities((prev) => {
      const previousById = new Map(prev.map((entry) => [entry.variantId, entry]));
      const next = (selectedProduct.variants || []).map((variant) => {
        const existing = previousById.get(variant._id);
        return {
          variantId: variant._id,
          variantSku: variant.sku,
          name: formatVariantLabel(variant),
          quantity: existing ? existing.quantity : '',
          cost: existing ? existing.cost : '',
        };
      });
      return next;
    });
  }, [isAddDialogOpen, useVariantInventory, selectedProduct, formatVariantLabel]);

  useEffect(() => {
    if (!useVariantInventory) {
      return;
    }
    const total = variantQuantities.reduce((sum, item) => {
      const qty = Number(item.quantity);
      return sum + (Number.isNaN(qty) ? 0 : qty);
    }, 0);
    setNewInventoryItem((prev) => {
      if (prev.totalQuantity === total) {
        return prev;
      }
      return { ...prev, totalQuantity: total };
    });
  }, [useVariantInventory, variantQuantities]);

  const handleAddItem = async () => {
    if (!newInventoryItem.productId) {
      alert('Por favor, selecciona un producto.');
      return;
    }

    if (!selectedProduct) {
      alert('Producto seleccionado no es válido.');
      return;
    }

    const selectedProductRef = selectedProduct;
    const baseCost = Number(newInventoryItem.averageCostPrice);

    console.log('🎯 [handleAddItem] Iniciando creación de inventario');
    console.log('🎯 [handleAddItem] useVariantInventory:', useVariantInventory);
    console.log('🎯 [handleAddItem] selectedProduct:', selectedProductRef);

    if (useVariantInventory) {
      const variantEntries = variantQuantities
        .map((entry) => ({
          ...entry,
          quantity: Number(entry.quantity),
        }))
        .filter((entry) => entry.quantity > 0);

      console.log('📝 [handleAddItem] variantEntries:', variantEntries);

      if (variantEntries.length === 0) {
        alert('Define al menos una cantidad para las variantes.');
        return;
      }

      try {
        for (const entry of variantEntries) {
          const payload = {
            productId: selectedProductRef._id,
            productSku: entry.variantSku || `${selectedProductRef.sku}-${entry.variantId}`,
            productName: entry.name
              ? `${selectedProductRef.name} - ${entry.name}`
              : selectedProductRef.name,
            variantId: entry.variantId,
            variantSku: entry.variantSku,
            totalQuantity: entry.quantity,
            averageCostPrice: Number(entry.cost) || baseCost,
          };

          console.log('📤 [handleAddItem] Enviando payload:', payload);
          const response = await fetchApi('/inventory', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          console.log('✅ [handleAddItem] Respuesta del servidor:', response);
        }

        console.log('🎉 [handleAddItem] Todas las variantes creadas, cerrando diálogo y recargando...');
        document.dispatchEvent(new CustomEvent('inventory-form-success'));
        setIsAddDialogOpen(false);
        setNewInventoryItem({
          productId: '',
          totalQuantity: 0,
          averageCostPrice: 0,
          lots: [],
        });
        setVariantQuantities([]);
        setProductSearchInput('');

        // IMPORTANTE: Volver a la primera página para ver el nuevo inventario
        setCurrentPage(1);
        // Esperar un momento antes de recargar para dar tiempo al backend
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('🔄 [handleAddItem] Llamando a loadData() en página 1...');
        await refreshData(1, itemsPerPage, committedSearch);
        console.log('✅ [handleAddItem] loadData() completado');
      } catch (err) {
        console.error('❌ [handleAddItem] Error:', err);
        alert(`Error: ${err.message}`);
      }
      return;
    }

    const payload = {
      productId: selectedProductRef._id,
      productSku: selectedProductRef.sku,
      productName: selectedProductRef.name,
      totalQuantity: Number(newInventoryItem.totalQuantity),
      averageCostPrice: baseCost,
      lots: newInventoryItem.lots.map((lot) => ({
        lotNumber: lot.lotNumber,
        quantity: Number(lot.quantity),
        expirationDate: lot.expirationDate ? new Date(lot.expirationDate) : undefined,
        costPrice: baseCost,
        receivedDate: new Date(),
      })),
    };

    if (!selectedProductRef.isPerishable) {
      delete payload.lots;
    }

    // Add warehouse and bin location if multi-warehouse is enabled
    if (multiWarehouseEnabled && newInventoryItem.warehouseId) {
      payload.warehouseId = newInventoryItem.warehouseId;
      if (newInventoryItem.binLocationId) {
        payload.binLocationId = newInventoryItem.binLocationId;
      }
    }

    console.log('📤 [handleAddItem] Enviando payload (producto sin variantes):', payload);

    try {
      const response = await fetchApi('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      console.log('✅ [handleAddItem] Respuesta del servidor:', response);

      document.dispatchEvent(new CustomEvent('inventory-form-success'));
      setIsAddDialogOpen(false);
      setNewInventoryItem({ productId: '', totalQuantity: 0, averageCostPrice: 0, lots: [] });
      setVariantQuantities([]);
      setProductSearchInput('');

      // IMPORTANTE: Volver a la primera página para ver el nuevo inventario
      setCurrentPage(1);
      // Esperar un momento antes de recargar
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🔄 [handleAddItem] Llamando a loadData() en página 1...');
      await refreshData(1, itemsPerPage, committedSearch);
      console.log('✅ [handleAddItem] loadData() completado');
    } catch (err) {
      console.error('❌ [handleAddItem] Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditFormData({
      newQuantity: item.availableQuantity,
      reason: '',
      binLocationId: item.binLocationId || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !editFormData.reason) {
      alert('La razón del ajuste es obligatoria.');
      return;
    }

    const payload = {
      inventoryId: selectedItem._id,
      newQuantity: Number(editFormData.newQuantity),
      reason: editFormData.reason,
      binLocationId: editFormData.binLocationId || undefined,
    };

    try {
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsEditDialogOpen(false);
      toast.success('Inventario ajustado correctamente.');
      await refreshData(currentPage, itemsPerPage, committedSearch); // Recargar datos en la página actual
    } catch (err) {
      toast.error('Error al ajustar inventario', { description: err.message });
    }
  };

  const handleDeleteItem = async (id) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este inventario? Esta acción desactivará el stock asociado.');
    if (!confirmed) return;

    try {
      await fetchApi(`/inventory/${id}`, { method: 'DELETE' });
      toast.success('Inventario eliminado correctamente.');

      // Si estamos en una página > 1 y solo quedaba 1 item, volver a la página anterior
      const itemsInCurrentPage = filteredData.length;
      if (itemsInCurrentPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        await refreshData(currentPage - 1, itemsPerPage, committedSearch);
      } else {
        await refreshData(currentPage, itemsPerPage, committedSearch);
      }
    } catch (err) {
      toast.error('Error al eliminar inventario', { description: err.message });
    }
  };

  const handleOpenTransfer = (item) => {
    console.log('🔍 Opening transfer for item:', item);

    // Handle both populated productId (object) and unpopulated (string)
    // Also fallback to variantId if productId is null/undefined
    let productId = null;
    if (typeof item.productId === 'string' && item.productId) {
      productId = item.productId;
    } else if (item.productId?._id) {
      productId = item.productId._id;
    } else if (item.variantId) {
      // Use variantId when productId is null (common in inventory records)
      productId = typeof item.variantId === 'string' ? item.variantId : item.variantId._id;
    } else if (item._id) {
      // Last resort: use the inventory item's own _id
      productId = item._id;
    }

    console.log('🔍 Extracted productId:', productId);

    setTransferForm({
      productId: productId,
      productName: item.productName,
      productSku: item.productSku,
      sourceWarehouseId: item.warehouseId || '',
      destinationWarehouseId: '',
      sourceBinLocationId: item.binLocationId || '',
      destinationBinLocationId: '',
      quantity: '',
      reason: '',
      availableQuantity: item.availableQuantity || 0,
    });
    setIsTransferDialogOpen(true);
  };

  const handleSaveTransfer = async () => {
    // Debug: log the transfer form state
    console.log('🔍 Transfer form state:', transferForm);

    // Validaciones
    if (!transferForm.productId) {
      console.error('❌ productId is missing:', transferForm.productId);
      toast.error('Producto no especificado.');
      return;
    }
    if (!transferForm.sourceWarehouseId) {
      toast.error('Selecciona el almacén de origen.');
      return;
    }
    if (!transferForm.destinationWarehouseId) {
      toast.error('Selecciona el almacén de destino.');
      return;
    }
    if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) {
      toast.error('El almacén de origen y destino no pueden ser el mismo.');
      return;
    }
    const qty = Number(transferForm.quantity);
    if (!qty || qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }
    if (qty > transferForm.availableQuantity) {
      toast.error(`Stock insuficiente. Disponible: ${transferForm.availableQuantity}`);
      return;
    }

    setTransferLoading(true);
    try {
      await fetchApi('/inventory-movements/transfers', {
        method: 'POST',
        body: JSON.stringify({
          productId: transferForm.productId,
          sourceWarehouseId: transferForm.sourceWarehouseId,
          destinationWarehouseId: transferForm.destinationWarehouseId,
          sourceBinLocationId: transferForm.sourceBinLocationId || undefined,
          destinationBinLocationId: transferForm.destinationBinLocationId || undefined,
          quantity: qty,
          reason: transferForm.reason || undefined,
        }),
      });

      toast.success('Transferencia realizada correctamente.');
      setIsTransferDialogOpen(false);
      setTransferForm({
        productId: '',
        productName: '',
        productSku: '',
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        sourceBinLocationId: '',
        destinationBinLocationId: '',
        quantity: '',
        reason: '',
        availableQuantity: 0,
      });
      await refreshData(currentPage, itemsPerPage, committedSearch);
    } catch (err) {
      toast.error('Error al realizar transferencia', { description: err.message });
    } finally {
      setTransferLoading(false);
    }
  };

  // Bin locations filtered by warehouse for transfer dialog
  const sourceBinOptions = useMemo(() => {
    if (!transferForm.sourceWarehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === transferForm.sourceWarehouseId && bin.isActive !== false,
    );
  }, [binLocations, transferForm.sourceWarehouseId]);

  const destBinOptions = useMemo(() => {
    if (!transferForm.destinationWarehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === transferForm.destinationWarehouseId && bin.isActive !== false,
    );
  }, [binLocations, transferForm.destinationWarehouseId]);

  // Funciones para editar lotes
  const handleStartEditLot = (index, lot) => {
    setEditingLotIndex(index);
    setEditingLotData({
      lotNumber: lot.lotNumber || '',
      quantity: lot.quantity || 0,
      costPrice: lot.costPrice || 0,
      expirationDate: lot.expirationDate ? new Date(lot.expirationDate).toISOString().split('T')[0] : '',
      manufacturingDate: lot.manufacturingDate ? new Date(lot.manufacturingDate).toISOString().split('T')[0] : '',
    });
  };

  const handleCancelEditLot = () => {
    setEditingLotIndex(null);
    setEditingLotData(null);
  };

  const handleSaveLot = async () => {
    if (!selectedInventoryForLots || editingLotIndex === null || !editingLotData) return;

    // Validaciones
    const expirationDate = editingLotData.expirationDate ? new Date(editingLotData.expirationDate) : null;
    const manufacturingDate = editingLotData.manufacturingDate ? new Date(editingLotData.manufacturingDate) : null;

    if (expirationDate && manufacturingDate && expirationDate <= manufacturingDate) {
      toast.error('Validación fallida', {
        description: 'La fecha de vencimiento debe ser posterior a la fecha de fabricación'
      });
      return;
    }

    try {
      const updatedLots = [...selectedInventoryForLots.lots];
      updatedLots[editingLotIndex] = {
        ...updatedLots[editingLotIndex],
        lotNumber: editingLotData.lotNumber,
        quantity: Number(editingLotData.quantity),
        costPrice: Number(editingLotData.costPrice),
        expirationDate: editingLotData.expirationDate ? new Date(editingLotData.expirationDate).toISOString() : undefined,
        manufacturingDate: editingLotData.manufacturingDate ? new Date(editingLotData.manufacturingDate).toISOString() : undefined,
        receivedDate: updatedLots[editingLotIndex].receivedDate || new Date().toISOString(),
      };

      const response = await fetchApi(`/inventory/${selectedInventoryForLots._id}/lots`, {
        method: 'PATCH',
        body: JSON.stringify({ lots: updatedLots }),
      });

      toast.success('Lote actualizado correctamente');

      // Actualizar el estado local con la respuesta del servidor
      if (response?.data) {
        setSelectedInventoryForLots(response.data);
      } else {
        setSelectedInventoryForLots({
          ...selectedInventoryForLots,
          lots: updatedLots,
        });
      }

      // Recargar datos de la tabla
      await refreshData(currentPage, itemsPerPage, committedSearch);

      // Cerrar modo edición
      handleCancelEditLot();
    } catch (err) {
      toast.error('Error al actualizar lote', { description: err.message });
    }
  };

  const handleDownloadTemplate = () => {
    const baseHeaders = ['SKU', 'VariantSKU', 'NuevaCantidad'];
    const attributeHeaders = inventoryAttributeColumns.map(({ header }) => header);
    const headers = [...baseHeaders, ...attributeHeaders];

    const buildRow = (sku, variantSku, quantity) => {
      const row = {
        SKU: sku,
        VariantSKU: variantSku || '',
        NuevaCantidad: quantity,
      };
      inventoryAttributeColumns.forEach(({ header, descriptor }) => {
        row[header] = descriptor.required ? `Ej_${descriptor.key}` : '';
      });
      return row;
    };

    const exampleRows = [0, 1, 2].map((index) => {
      const sample = inventoryData[index];
      if (sample) {
        return buildRow(
          sample.productSku,
          sample.variantSku,
          index === 0 ? 100 : index === 1 ? 50 : 25,
        );
      }
      return buildRow(
        `SKU-00${index + 1}`,
        '',
        index === 0 ? 100 : index === 1 ? 50 : 25,
      );
    });

    const sheetRows = [
      headers,
      ...exampleRows.map((row) => headers.map((header) => row[header] ?? '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla de Inventario");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_ajuste_inventario.xlsx');
  };

  const openExportDialog = (format) => {
    setExportFormat(format);
    setIsExportDialogOpen(true);
  };

  const getExportColumns = () => {
    const baseColumns = [
      { key: 'sku', label: 'SKU', defaultChecked: true },
      { key: 'variantSku', label: 'Variant SKU', defaultChecked: true },
      { key: 'product', label: 'Producto', defaultChecked: true },
      { key: 'category', label: 'Categoría', defaultChecked: true },
      { key: 'brand', label: 'Marca', defaultChecked: true },
      { key: 'available', label: 'Stock Disponible', defaultChecked: true },
      { key: 'total', label: 'Stock Total', defaultChecked: true },
      { key: 'cost', label: 'Costo Promedio', defaultChecked: true },
      { key: 'expiration', label: 'Fecha Vencimiento (1er Lote)', defaultChecked: true },
    ];

    const iAttrs = inventoryAttributeColumns.map(({ descriptor }) => ({
      key: `iAttr_${descriptor.key}`,
      label: `Attr: ${descriptor.label || descriptor.key}`,
      defaultChecked: false
    }));

    return [...baseColumns, ...iAttrs];
  };

  const handleConfirmExport = async (selectedColumnKeys) => {
    try {
      // 1. Fetch ALL data (using high limit)
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Backend now supports up to 10000
      });

      const response = await fetchApi(`/inventory?${params.toString()}`);
      let allItems = response.data || [];

      // Aplicar los mismos filtros que en frontend si es necesario
      if (typeof committedSearch === 'string' && committedSearch.trim()) {
        const searchLower = committedSearch.trim().toLowerCase();
        allItems = allItems.filter(item => {
          const candidates = [
            item.productName,
            item.productSku,
            item.variantSku,
            item.productId?.name,
            item.productId?.sku,
          ].filter(Boolean).map(v => String(v).toLowerCase());
          return candidates.some(v => v.includes(searchLower));
        });
      }

      if (filterCategory && filterCategory !== 'all') {
        allItems = allItems.filter(item => item.productId?.category === filterCategory);
      }

      const inventoryWithAttributes = allItems.map((item) => ({
        ...item,
        inventoryAttributes: item.attributes || item.inventoryAttributes || {},
      }));

      if (inventoryWithAttributes.length === 0) {
        toast.warning("No hay datos para exportar.");
        return;
      }

      // 2. Process Data
      const dataToExport = inventoryWithAttributes.map(item => {
        const row = {};

        if (selectedColumnKeys.includes('sku')) row['SKU'] = item.productSku;
        if (selectedColumnKeys.includes('variantSku')) row['VariantSKU'] = item.variantSku || '';
        if (selectedColumnKeys.includes('product')) row['Producto'] = item.productName;
        if (selectedColumnKeys.includes('category')) row['Categoría'] = item.productId?.category;
        if (selectedColumnKeys.includes('brand')) row['Marca'] = item.productId?.brand;
        if (selectedColumnKeys.includes('available')) row['Stock Disponible'] = item.availableQuantity;
        if (selectedColumnKeys.includes('total')) row['Stock Total'] = item.totalQuantity;
        if (selectedColumnKeys.includes('cost')) row['Costo Promedio'] = item.averageCostPrice;
        if (selectedColumnKeys.includes('expiration')) {
          row['Fecha de Vencimiento (Primer Lote)'] = item.lots?.[0]?.expirationDate
            ? new Date(item.lots[0].expirationDate).toLocaleDateString()
            : 'N/A';
        }

        inventoryAttributeColumns.forEach(({ descriptor }) => {
          const key = `iAttr_${descriptor.key}`;
          if (selectedColumnKeys.includes(key)) {
            row[`Attr: ${descriptor.label}`] =
              item.inventoryAttributes?.[descriptor.key] ??
              item.attributes?.[descriptor.key] ??
              '';
          }
        });

        return row;
      });

      // 3. Generate File
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      if (exportFormat === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'inventario.csv');
      } else {
        XLSX.writeFile(wb, 'inventario.xlsx');
      }

      toast.success(`Exportación completada: ${dataToExport.length} filas.`);

    } catch (err) {
      console.error("Export error", err);
      throw err;
    }
  };

  const handleImport = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          throw new Error("El archivo está vacío o no tiene datos.");
        }

        const rawHeaders = json[0].map(header => (header ?? '').toString().trim());
        const rows = json
          .slice(1)
          .map(row => {
            const rowData = {};
            rawHeaders.forEach((header, index) => {
              rowData[header] = row[index];
            });
            return rowData;
          })
          .filter(row => row.SKU && row.NuevaCantidad !== undefined && row.NuevaCantidad !== '');

        if (rows.length === 0) {
          throw new Error("No se encontraron filas con datos válidos en el archivo. Asegúrate de que las columnas SKU y NuevaCantidad tengan valores.");
        }

        // Validate required columns
        if (!rawHeaders.includes('SKU') || !rawHeaders.includes('NuevaCantidad')) {
          throw new Error("El archivo debe contener las columnas 'SKU' y 'NuevaCantidad'.");
        }

        const requiredAttributeHeaders = inventoryAttributeColumns
          .filter(({ descriptor }) => descriptor.required)
          .map(({ header }) => header);
        const missingAttributeHeaders = requiredAttributeHeaders.filter(header => !rawHeaders.includes(header));
        if (missingAttributeHeaders.length > 0) {
          throw new Error(`Faltan columnas de atributos obligatorias: ${missingAttributeHeaders.join(', ')}`);
        }

        setPreviewHeaders(rawHeaders);
        setPreviewData(rows);
        setIsPreviewDialogOpen(true);

      } catch (err) {
        toast.error("Error al procesar el archivo", { description: err.message });
      }
    };
    reader.readAsBinaryString(file);

    // Reset file input
    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    if (!importReason) {
      toast.error('La razón del ajuste es obligatoria.');
      return;
    }

    const normalizedItems = previewData
      .map(row => {
        if (!row.SKU) return null;
        const newQuantity = Number(row.NuevaCantidad);
        if (Number.isNaN(newQuantity)) return null;

        const attributesPayload = {};
        Object.entries(row).forEach(([key, value]) => {
          if (key.startsWith('inventoryAttr_')) {
            const attrKey = key.replace('inventoryAttr_', '').trim();
            if (attrKey && value !== undefined && value !== null && String(value).trim() !== '') {
              attributesPayload[attrKey] =
                typeof value === 'string' ? value.trim() : value;
            }
          }
        });

        return {
          SKU: row.SKU,
          NuevaCantidad: newQuantity,
          variantSku: row.VariantSKU ? String(row.VariantSKU).trim() : undefined,
          attributes: Object.keys(attributesPayload).length > 0 ? attributesPayload : undefined,
        };
      })
      .filter(Boolean);

    if (normalizedItems.length === 0) {
      toast.error('No hay datos válidos para importar.');
      return;
    }

    const payload = {
      items: normalizedItems,
      reason: importReason,
    };

    try {
      await fetchApi('/inventory/bulk-adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsPreviewDialogOpen(false);
      setImportReason('');
      toast.success('Inventario ajustado masivamente con éxito.');

      // Volver a la primera página después de importar masivamente
      setCurrentPage(1);
      await refreshData(1, itemsPerPage, committedSearch);

    } catch (error) {
      toast.error('Error al ajustar el inventario', {
        description: error.message,
      });
    }
  };

  if (loading && inventoryData.length === 0 && !searchTerm && filterCategory === 'all') return <div>Cargando inventario...</div>;
  if (error && inventoryData.length === 0) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-start items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"><Upload className="h-4 w-4 mr-2" />Importar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleImport}>Importar Archivo</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDownloadTemplate}>Descargar Plantilla</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx, .csv"
            onChange={handleFileSelect}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openExportDialog('xlsx')}>Exportar a .xlsx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openExportDialog('csv')}>Exportar a .csv</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={loadData} disabled={loading} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsLabelWizardOpen(true)} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" /> Imprimir Etiquetas
          </Button>
        </div>
        <div className="space-y-4">
          {inventoryAttributeColumns.length > 0 && (
            <Alert variant="info">
              <AlertTitle>Plantilla dinámica por vertical</AlertTitle>
              <AlertDescription>
                {`Además de SKU y NuevaCantidad, incluye la columna VariantSKU y las columnas `}
                <code>{`inventoryAttr_{clave}`}</code>
                {` para los siguientes atributos: `}
                {inventoryAttributeColumns
                  .map(({ descriptor }) => descriptor.label || descriptor.key)
                  .join(', ')}
                . Los valores deben coincidir con los atributos configurados en Productos.
              </AlertDescription>
            </Alert>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button id="add-inventory-button" size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full sm:w-auto"><Plus className="h-5 w-5 mr-2" />Agregar Inventario</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Agregar Inventario Inicial</DialogTitle>
                <DialogDescription>Selecciona un producto y define su stock y costo inicial.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Producto</Label>
                  <SearchableSelect
                    asyncSearch={true}
                    loadOptions={loadProductOptions}
                    minSearchLength={2}
                    debounceMs={300}
                    onSelection={handleProductSelection}
                    value={
                      newInventoryItem.productId
                        ? {
                          value: newInventoryItem.productId,
                          label: newInventoryItem.productName || '',
                        }
                        : null
                    }
                    placeholder={getPlaceholder('search', 'Buscar producto (mín. 2 caracteres)...')}
                  />
                </div>
                {useVariantInventory ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Cantidad por variante</Label>
                      <span className="text-sm text-muted-foreground">
                        Total: {variantQuantities.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {variantQuantities.map((variant, index) => (
                        <div
                          key={variant.variantId || variant.variantSku || index}
                          className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center border rounded-md p-3"
                        >
                          <div className="sm:col-span-4">
                            <p className="text-sm font-medium text-foreground">
                              {variant.name || variant.variantSku || `Variante ${index + 1}`}
                            </p>
                            {variant.variantSku ? (
                              <p className="text-xs text-muted-foreground">SKU: {variant.variantSku}</p>
                            ) : null}
                          </div>
                          <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                            <NumberInput
                              min={0}
                              step={quantityStep}
                              value={variant.quantity ?? ''}
                              onValueChange={(val) => handleVariantQuantityChange(index, val)}
                              placeholder="Cant."
                            />
                            <NumberInput
                              min={0}
                              step={0.01}
                              value={variant.cost ?? ''}
                              onValueChange={(val) => {
                                setVariantQuantities((prev) => {
                                  const next = [...prev];
                                  if (!next[index]) return prev;
                                  next[index] = { ...next[index], cost: val };
                                  return next;
                                });
                              }}
                              placeholder="Costo"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {variantQuantities.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Configura variantes en el catálogo para distribuir el inventario inicial.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="totalQuantity">Cantidad Inicial</Label>
                    <NumberInput
                      id="totalQuantity"
                      value={newInventoryItem.totalQuantity ?? ''}
                      onValueChange={(val) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          totalQuantity: val,
                        })
                      }
                      min={0}
                      step={quantityStep}
                      placeholder="Cantidad inicial"
                    />
                  </div>
                )}
                {/* Warehouse and Bin Location selectors - only show when multi-warehouse is enabled */}
                {multiWarehouseEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Almacén</Label>
                      <Select
                        value={newInventoryItem.warehouseId}
                        onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, warehouseId: v, binLocationId: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar almacén" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                              {wh.code} · {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {binLocations.filter(b => b.warehouseId === newInventoryItem.warehouseId).length > 0 && (
                      <div className="space-y-2">
                        <Label>Ubicación (opcional)</Label>
                        <Select
                          value={newInventoryItem.binLocationId}
                          onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, binLocationId: v === 'none' ? '' : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin ubicación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin ubicación</SelectItem>
                            {binLocations
                              .filter(b => b.warehouseId === newInventoryItem.warehouseId)
                              .map((bin) => (
                                <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                                  {bin.code} - {bin.zone || 'N/A'}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                {/* Only show average cost when NOT using variant inventory */}
                {!useVariantInventory && (
                  <div className="space-y-2">
                    <Label htmlFor="averageCostPrice">Costo Promedio por Unidad ($)</Label>
                    <NumberInput
                      id="averageCostPrice"
                      value={newInventoryItem.averageCostPrice ?? ''}
                      onValueChange={(val) => setNewInventoryItem({ ...newInventoryItem, averageCostPrice: val })}
                      step={0.01}
                      min={0}
                      placeholder="Costo promedio"
                    />
                  </div>
                )}
                {selectedProduct && selectedProduct.isPerishable ? (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <h4 className="font-medium">Lotes del Producto Perecedero</h4>
                    {newInventoryItem.lots.map((lot, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 items-center">
                        <Input
                          placeholder="Nro. Lote"
                          value={lot.lotNumber}
                          onChange={(e) => handleLotChange(index, 'lotNumber', e.target.value)}
                        />
                        <NumberInput
                          placeholder="Cantidad"
                          value={lot.quantity ?? ''}
                          onValueChange={(val) => handleLotChange(index, 'quantity', val)}
                          min={0}
                          step={quantityStep}
                        />
                        <Input
                          type="date"
                          placeholder="Vencimiento"
                          value={lot.expirationDate}
                          onChange={(e) => handleLotChange(index, 'expirationDate', e.target.value)}
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeLot(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addLot}>
                      <Plus className="h-4 w-4 mr-2" /> Agregar Lote
                    </Button>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddItem}>Agregar a Inventario</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader />
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={getPlaceholder('search', 'Buscar por nombre, SKU o marca...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Columnas</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={visibleColumns.sku} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, sku: checked }))}>SKU</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.product} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, product: checked }))}>Producto</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, category: checked }))}>Categoría</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.available} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, available: checked }))}>Stock</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.cost} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, cost: checked }))}>Costo</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.location} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, location: checked }))}>Ubicación</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.expiration} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, expiration: checked }))}>Vencimiento</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.lots} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, lots: checked }))}>Lotes</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.sellingPrice} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, sellingPrice: checked }))}>Precio Venta</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.totalValue} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, totalValue: checked }))}>Valor Total</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: checked }))}>Estado</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.actions} onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, actions: checked }))}>Acciones</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category, index) => (
                  <SelectItem key={`category-${index}-${category}`} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border relative">
            {loading && <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.sku && <TableHead>SKU</TableHead>}
                  {visibleColumns.product && <TableHead>Producto</TableHead>}
                  {visibleColumns.category && <TableHead>Categoría</TableHead>}
                  {visibleColumns.available && <TableHead>Stock Disponible</TableHead>}
                  {visibleColumns.cost && <TableHead>Costo Promedio</TableHead>}
                  {visibleColumns.sellingPrice && <TableHead>Precio Venta</TableHead>}
                  {visibleColumns.totalValue && <TableHead>Valor Total</TableHead>}
                  {multiWarehouseEnabled && binLocations.length > 0 && visibleColumns.location && <TableHead>Ubicación</TableHead>}
                  {visibleColumns.expiration && <TableHead>Vencimiento (1er Lote)</TableHead>}
                  {visibleColumns.lots && <TableHead>Lotes</TableHead>}
                  {visibleColumns.status && <TableHead>Estado</TableHead>}
                  {visibleColumns.actions && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item._id}>
                    {visibleColumns.sku && <TableCell className="font-medium">{item.productSku}</TableCell>}
                    {visibleColumns.product && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">{item.productId?.brand || 'N/A'}</div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.category && <TableCell>{formatProductCategory(item.productId?.category)}</TableCell>}
                    {visibleColumns.available && <TableCell>{item.availableQuantity} unidades</TableCell>}
                    {visibleColumns.cost && <TableCell>${item.averageCostPrice.toFixed(2)}</TableCell>}
                    {visibleColumns.sellingPrice && (
                      <TableCell>
                        ${(() => {
                          const variants = item.productId?.variants || [];
                          const variant = item.variantSku
                            ? variants.find(v => v.sku === item.variantSku)
                            : variants[0];
                          const price = variant?.basePrice || 0;
                          return price.toFixed(2);
                        })()}
                      </TableCell>
                    )}
                    {visibleColumns.totalValue && (
                      <TableCell>
                        ${(() => {
                          const variants = item.productId?.variants || [];
                          const variant = item.variantSku
                            ? variants.find(v => v.sku === item.variantSku)
                            : variants[0];
                          const price = variant?.basePrice || 0;
                          return (item.availableQuantity * price).toFixed(2);
                        })()}
                      </TableCell>
                    )}
                    {multiWarehouseEnabled && binLocations.length > 0 && visibleColumns.location && (
                      <TableCell>
                        {getBinLocationName(item.binLocationId) ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{getBinLocationName(item.binLocationId)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin ubicación</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.expiration && (
                      <TableCell>
                        {item.lots && item.lots.length > 0 ? (
                          <span>{new Date(item.lots[0].expirationDate).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.lots && (
                      <TableCell>
                        {item.lots && item.lots.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInventoryForLots(item);
                              setIsLotsDialogOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            {item.lots.length === 1 ? 'Ver lote' : `Ver ${item.lots.length} lotes`}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin lotes</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.status && <TableCell>{getStatusBadge(item)}</TableCell>}
                    {visibleColumns.actions && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}><Edit className="h-4 w-4" /></Button>
                          {multiWarehouseEnabled && warehouses.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTransfer(item)}
                              title="Transferir a otro almacén"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleDeleteItem(item._id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{' '}
                  {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector de items por página */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items por página:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(val) => handleItemsPerPageChange(Number(val))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botones de navegación */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Números de página */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar Inventario: {selectedItem?.productName}</DialogTitle>
            <DialogDescription>
              Modifica la cantidad de stock. Esto creará un movimiento de ajuste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Input value={`${selectedItem?.productName} (${selectedItem?.productSku})`} disabled />
            </div>
            <div className="space-y-2">
              <Label>Cantidad Actual (Disponible)</Label>
              <Input value={selectedItem?.availableQuantity} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newQuantity">Nueva Cantidad Total</Label>
              <NumberInput
                id="newQuantity"
                value={editFormData.newQuantity ?? ''}
                onValueChange={(val) => setEditFormData({ ...editFormData, newQuantity: val })}
                min={0}
                placeholder="Nueva cantidad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Razón del Ajuste</Label>
              <Input
                id="reason"
                value={editFormData.reason}
                onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                placeholder="Ej: Conteo físico, corrección de error, etc."
              />
            </div>
            {/* Bin location selector - only show when bins exist for the inventory's warehouse */}
            {multiWarehouseEnabled && editBinOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="binLocation">Ubicación (opcional)</Label>
                <Select
                  value={editFormData.binLocationId || 'none'}
                  onValueChange={(v) => setEditFormData({ ...editFormData, binLocationId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger id="binLocation">
                    <SelectValue placeholder="Seleccionar ubicación..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {editBinOptions.map((bin) => (
                      <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                        {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateItem}>Guardar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Previsualización de Importación</DialogTitle>
            <DialogDescription>
              Se encontraron {previewData.length} registros para actualizar. Revisa los datos antes de confirmar.
              Las columnas requeridas son 'SKU' y 'NuevaCantidad'.
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
                    {previewHeaders.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Label htmlFor="importReason">Razón del Ajuste Masivo</Label>
            <Input
              id="importReason"
              value={importReason}
              onChange={(e) => setImportReason(e.target.value)}
              placeholder="Ej: Conteo físico anual, corrección de sistema, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmImport}>Confirmar Importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualización de Lotes */}
      <Dialog open={isLotsDialogOpen} onOpenChange={setIsLotsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lotes del Producto</DialogTitle>
            <DialogDescription>
              {selectedInventoryForLots && (
                <div className="mt-2">
                  <div className="font-semibold text-lg">{selectedInventoryForLots.productName}</div>
                  <div className="text-sm text-muted-foreground">
                    SKU: {selectedInventoryForLots.productSku} | Total en inventario: {selectedInventoryForLots.availableQuantity} unidades
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {selectedInventoryForLots?.lots && selectedInventoryForLots.lots.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nro. Lote</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Unitario</TableHead>
                    <TableHead>Fecha de Vencimiento</TableHead>
                    <TableHead>Fecha de Fabricación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInventoryForLots.lots.map((lot, index) => {
                    const expirationDate = lot.expirationDate ? new Date(lot.expirationDate) : null;
                    const manufacturingDate = lot.manufacturingDate ? new Date(lot.manufacturingDate) : null;
                    const today = new Date();
                    const daysUntilExpiry = expirationDate ? Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)) : null;

                    let statusBadge = null;
                    if (daysUntilExpiry !== null) {
                      if (daysUntilExpiry < 0) {
                        statusBadge = <Badge variant="destructive">Vencido</Badge>;
                      } else if (daysUntilExpiry <= 7) {
                        statusBadge = <Badge variant="destructive">Vence en {daysUntilExpiry}d</Badge>;
                      } else if (daysUntilExpiry <= 30) {
                        statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Vence en {daysUntilExpiry}d</Badge>;
                      } else {
                        statusBadge = <Badge variant="outline">OK</Badge>;
                      }
                    }

                    const isEditing = editingLotIndex === index;

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input
                              value={editingLotData?.lotNumber || ''}
                              onChange={(e) => setEditingLotData({ ...editingLotData, lotNumber: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            lot.lotNumber || 'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <NumberInput
                              value={editingLotData?.quantity ?? ''}
                              onValueChange={(val) => setEditingLotData({ ...editingLotData, quantity: val })}
                              className="w-24"
                              min={0}
                            />
                          ) : (
                            `${lot.quantity || 0} unidades`
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <NumberInput
                              step={0.01}
                              value={editingLotData?.costPrice ?? ''}
                              onValueChange={(val) => setEditingLotData({ ...editingLotData, costPrice: val })}
                              className="w-24"
                              min={0}
                            />
                          ) : (
                            `$${(lot.costPrice || 0).toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingLotData?.expirationDate || ''}
                              onChange={(e) => setEditingLotData({ ...editingLotData, expirationDate: e.target.value })}
                              className="w-40"
                            />
                          ) : (
                            expirationDate ? expirationDate.toLocaleDateString() : 'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingLotData?.manufacturingDate || ''}
                              onChange={(e) => setEditingLotData({ ...editingLotData, manufacturingDate: e.target.value })}
                              className="w-40"
                            />
                          ) : (
                            manufacturingDate ? manufacturingDate.toLocaleDateString() : 'N/A'
                          )}
                        </TableCell>
                        <TableCell>{statusBadge}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex space-x-1">
                              <Button size="sm" onClick={handleSaveLot} variant="default">
                                Guardar
                              </Button>
                              <Button size="sm" onClick={handleCancelEditLot} variant="outline">
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditLot(index, lot)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay lotes registrados para este producto
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLotsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Transferencia entre Almacenes */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferir Inventario</DialogTitle>
            <DialogDescription>
              Transfiere stock de un almacén a otro. Se generarán dos movimientos vinculados (salida y entrada).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Producto info */}
            <div className="space-y-2">
              <Label>Producto</Label>
              <Input
                value={`${transferForm.productName} (${transferForm.productSku})`}
                disabled
              />
            </div>

            {/* Stock disponible info */}
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Stock disponible: </span>
              <span className="font-semibold">{transferForm.availableQuantity} unidades</span>
            </div>

            {/* Almacén origen */}
            <div className="space-y-2">
              <Label htmlFor="sourceWarehouse">Almacén Origen *</Label>
              <Select
                value={transferForm.sourceWarehouseId || 'none'}
                onValueChange={(v) =>
                  setTransferForm({
                    ...transferForm,
                    sourceWarehouseId: v === 'none' ? '' : v,
                    sourceBinLocationId: '',
                  })
                }
              >
                <SelectTrigger id="sourceWarehouse">
                  <SelectValue placeholder="Seleccionar almacén origen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bin origen (opcional) */}
            {sourceBinOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sourceBin">Ubicación Origen (opcional)</Label>
                <Select
                  value={transferForm.sourceBinLocationId || 'none'}
                  onValueChange={(v) =>
                    setTransferForm({ ...transferForm, sourceBinLocationId: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger id="sourceBin">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {sourceBinOptions.map((bin) => (
                      <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                        {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Almacén destino */}
            <div className="space-y-2">
              <Label htmlFor="destWarehouse">Almacén Destino *</Label>
              <Select
                value={transferForm.destinationWarehouseId || 'none'}
                onValueChange={(v) =>
                  setTransferForm({
                    ...transferForm,
                    destinationWarehouseId: v === 'none' ? '' : v,
                    destinationBinLocationId: '',
                  })
                }
              >
                <SelectTrigger id="destWarehouse">
                  <SelectValue placeholder="Seleccionar almacén destino..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {warehouses
                    .filter((wh) => (wh._id || wh.id) !== transferForm.sourceWarehouseId)
                    .map((wh) => (
                      <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bin destino (opcional) */}
            {destBinOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="destBin">Ubicación Destino (opcional)</Label>
                <Select
                  value={transferForm.destinationBinLocationId || 'none'}
                  onValueChange={(v) =>
                    setTransferForm({ ...transferForm, destinationBinLocationId: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger id="destBin">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {destBinOptions.map((bin) => (
                      <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                        {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cantidad */}
            <div className="space-y-2">
              <Label htmlFor="transferQty">Cantidad a Transferir *</Label>
              <NumberInput
                id="transferQty"
                value={transferForm.quantity ?? ''}
                onValueChange={(val) => setTransferForm({ ...transferForm, quantity: val })}
                min={0.0001}
                max={transferForm.availableQuantity}
                placeholder="Cantidad"
              />
            </div>

            {/* Razón (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="transferReason">Razón (opcional)</Label>
              <Input
                id="transferReason"
                value={transferForm.reason}
                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                placeholder="Ej: Reabastecimiento sucursal, balance de stock, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferDialogOpen(false)}
              disabled={transferLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTransfer} disabled={transferLoading}>
              {transferLoading ? 'Procesando...' : 'Confirmar Transferencia'}
            </Button>
          </DialogFooter>
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
    </div>
  );
}

export default InventoryManagement;
