/**
 * useInventoryData.js
 *
 * Custom hook that encapsulates ALL state, data-fetching, filtering,
 * pagination, and sorting logic for the Inventory Management module.
 *
 * Returns a single object with every piece of state and every handler
 * that the orchestrator and its child components need.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

const DEFAULT_ITEMS_PER_PAGE = 20;
const SEARCH_ITEMS_PER_PAGE = 100;
const SEARCH_DEBOUNCE_MS = 600;

export function useInventoryData({ multiWarehouseEnabled, verticalConfig }) {
  // --- core data ---
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [binLocations, setBinLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // --- add-dialog state ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [itemsToAdd, setItemsToAdd] = useState([]);
  const [variantSelection, setVariantSelection] = useState(null);
  const [newInventoryItem, setNewInventoryItem] = useState({
    productId: '',
    productName: '',
    totalQuantity: 0,
    averageCostPrice: 0,
    lots: [],
    warehouseId: '',
    binLocationId: '',
    receivedBy: '',
    notes: '',
  });
  const [productSearchInput, setProductSearchInput] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  // --- edit-dialog state ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editFormData, setEditFormData] = useState({ newQuantity: 0, reason: '', binLocationId: '' });

  // --- export state ---
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  // --- import preview state ---
  const fileInputRef = useRef(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [importReason, setImportReason] = useState('');

  // --- lots dialog state ---
  const [isLotsDialogOpen, setIsLotsDialogOpen] = useState(false);
  const [selectedInventoryForLots, setSelectedInventoryForLots] = useState(null);
  const [editingLotIndex, setEditingLotIndex] = useState(null);
  const [editingLotData, setEditingLotData] = useState(null);

  // --- column visibility ---
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
    totalValue: false,
  });

  // --- label wizard ---
  const [isLabelWizardOpen, setIsLabelWizardOpen] = useState(false);
  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);

  // --- transfer state ---
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

  // --- pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [committedSearch, setCommittedSearch] = useState('');
  const manualItemsPerPageRef = useRef(DEFAULT_ITEMS_PER_PAGE);
  const lastQueryRef = useRef({ search: null, limit: null });

  // --- sort ---
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // --- variant quantities (unused but preserved) ---
  const [variantQuantities, setVariantQuantities] = useState([]);

  // --- vertical config derived ---
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

  // --- helpers ---
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

  const normalizeId = useCallback((value) => {
    if (value === undefined || value === null) return null;
    return value.toString();
  }, []);

  const formatVariantLabel = useCallback((variant) => {
    if (!variant) return '';
    if (variant.name && variant.name.trim()) return variant.name;
    if (variant.attributes && Object.keys(variant.attributes).length > 0) {
      return Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(' · ');
    }
    return variant.sku || 'Variante';
  }, []);

  const getBinLocationName = useCallback((binLocationId) => {
    if (!binLocationId) return null;
    const bin = binLocations.find((b) => (b._id || b.id) === binLocationId);
    if (!bin) return null;
    return bin.code + (bin.zone ? ` · ${bin.zone}` : '');
  }, [binLocations]);

  const editBinOptions = useMemo(() => {
    if (!selectedItem?.warehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === selectedItem.warehouseId && bin.isActive !== false,
    );
  }, [binLocations, selectedItem]);

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

  // --- data loading ---
  const loadData = useCallback(async ({ page, limit, search, currentSortBy = sortBy, currentSortOrder = sortOrder } = {}) => {
    try {
      setLoading(true);
      setError(null);
      const safePage = Number(page ?? currentPage ?? 1);
      const safeLimit = Number(limit ?? itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE);
      const safeSearch = (search ?? committedSearch ?? '').trim();
      const usingSearch = safeSearch.length > 0;

      const queryPage = usingSearch ? 1 : safePage;
      const requestedLimit = usingSearch ? Math.max(SEARCH_ITEMS_PER_PAGE, safeLimit, 100) : safeLimit;
      const queryLimit = Math.min(100, requestedLimit);

      console.log('🔄 [InventoryManagement] Cargando datos... Página:', queryPage, 'Límite:', queryLimit, 'Search:', safeSearch, 'Sort:', currentSortBy, currentSortOrder);

      const params = new URLSearchParams({
        page: queryPage.toString(),
        limit: queryLimit.toString(),
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      });

      const [inventoryResponse, binLocationsResponse, warehousesResponse] = await Promise.all([
        fetchApi(`/inventory?${params.toString()}`),
        multiWarehouseEnabled ? fetchApi('/bin-locations') : Promise.resolve([]),
        multiWarehouseEnabled ? fetchApi('/warehouses') : Promise.resolve([]),
      ]);

      setBinLocations(Array.isArray(binLocationsResponse) ? binLocationsResponse : binLocationsResponse?.data || []);

      const warehousesList = Array.isArray(warehousesResponse) ? warehousesResponse : warehousesResponse?.data || [];
      setWarehouses(warehousesList.filter(w => w.isActive !== false && w.isDeleted !== true));

      console.log('📦 [InventoryManagement] Inventarios recibidos:', inventoryResponse?.data?.length || 0);
      console.log('📊 [InventoryManagement] Paginación:', inventoryResponse?.pagination);

      const inventoryWithAttributes = (inventoryResponse.data || []).map((item) => ({
        ...item,
        inventoryAttributes: item.attributes || item.inventoryAttributes || {},
      }));
      setInventoryData(inventoryWithAttributes);

      if (usingSearch) {
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
    } finally {
      setLoading(false);
    }
  }, [committedSearch, currentPage, itemsPerPage, multiWarehouseEnabled, sortBy, sortOrder]);

  const refreshData = useCallback(
    async (page, limit, search) => {
      await loadData({ page, limit, search });
      lastQueryRef.current = { search, limit };
    },
    [loadData],
  );

  // --- filtering effect ---
  useEffect(() => {
    console.log('🔍 [useEffect Filter] Filtrando datos...');
    console.log('🔍 [useEffect Filter] inventoryData.length:', inventoryData.length);
    const search = committedSearch.trim().toLowerCase();
    let filtered = inventoryData;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.productId?.category === filterCategory);
    }

    if (search) {
      const searchWords = search.split(/\s+/).filter(w => w.length > 0);
      filtered = filtered.filter((item) => {
        const searchableText = [
          item.productName,
          item.productSku,
          item.variantSku,
          item.productId?.name,
          item.productId?.sku,
          item.productId?.brand,
          ...(Array.isArray(item.productId?.category)
            ? item.productId.category
            : [item.productId?.category]),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(' ');
        return searchWords.every((word) => searchableText.includes(word));
      });
    }

    console.log('🔍 [useEffect Filter] filteredData.length:', filtered.length);
    setFilteredData(filtered);
  }, [inventoryData, filterCategory, committedSearch]);

  // --- search debounce ---
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

  // --- auto-refresh on search/sort change ---
  useEffect(() => {
    const effectiveLimit = committedSearch
      ? Math.max(manualItemsPerPageRef.current, SEARCH_ITEMS_PER_PAGE)
      : manualItemsPerPageRef.current;

    if (itemsPerPage !== effectiveLimit) {
      setItemsPerPage(effectiveLimit);
    }

    if (
      lastQueryRef.current.search !== committedSearch ||
      lastQueryRef.current.limit !== effectiveLimit ||
      lastQueryRef.current.sortBy !== sortBy ||
      lastQueryRef.current.sortOrder !== sortOrder
    ) {
      refreshData(1, effectiveLimit, committedSearch);
      lastQueryRef.current.sortBy = sortBy;
      lastQueryRef.current.sortOrder = sortOrder;
    }
  }, [committedSearch, itemsPerPage, refreshData, sortBy, sortOrder]);

  // --- categories ---
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
        if (trimmed) collected.push(trimmed);
        return;
      }
      if (rawCategory !== null && rawCategory !== undefined) {
        const coerced = String(rawCategory).trim();
        if (coerced) collected.push(coerced);
      }
    });
    return Array.from(new Set(collected));
  }, [inventoryData]);

  // --- pagination handlers ---
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

  // --- product search for add dialog ---
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

  // --- add dialog helpers ---
  const upsertInventoryItem = useCallback((product, variant, quantity, costPrice) => {
    if (!product) return;
    const safeQty = Number(quantity);
    const resolvedQty = (Number.isFinite(safeQty) && safeQty > 0) ? safeQty : 1;
    const resolvedCost = Number.isFinite(Number(costPrice)) ? Number(costPrice) : 0;
    const productId = normalizeId(product._id);
    const variantId = variant ? normalizeId(variant._id) : null;

    setItemsToAdd(prev => {
      const items = [...prev];
      const matchIndex = items.findIndex(item =>
        normalizeId(item.productId) === productId &&
        normalizeId(item.variantId) === variantId
      );
      if (matchIndex !== -1) {
        const existing = items[matchIndex];
        items[matchIndex] = {
          ...existing,
          quantity: Number(existing.quantity) + resolvedQty,
        };
      } else {
        items.push({
          productId,
          productName: product.name,
          productSku: variant?.sku || product.sku,
          variantId: variantId || undefined,
          variantName: variant ? formatVariantLabel(variant) : undefined,
          variantSku: variant?.sku,
          quantity: resolvedQty,
          costPrice: resolvedCost,
          isPerishable: product.isPerishable,
          lots: product.isPerishable ? [{ lotNumber: '', quantity: resolvedQty, expirationDate: '' }] : [],
          productObj: product,
        });
      }
      return items;
    });
  }, [normalizeId, formatVariantLabel]);

  const openVariantSelection = useCallback((product, variants) => {
    setVariantSelection({
      product,
      rows: variants.map(variant => ({
        variant,
        quantity: '',
        cost: variant?.costPrice != null ? variant.costPrice.toString() : '',
      })),
    });
  }, []);

  const closeVariantSelection = useCallback(() => {
    setVariantSelection(null);
  }, []);

  const confirmVariantSelection = useCallback(() => {
    if (!variantSelection) return;
    const { product, rows } = variantSelection;
    let hasValidQuantity = false;

    rows.forEach(row => {
      const quantityValue = Number(row.quantity);
      if (Number.isFinite(quantityValue) && quantityValue > 0) {
        hasValidQuantity = true;
        const costValue = Number(row.cost);
        upsertInventoryItem(
          product,
          row.variant,
          quantityValue,
          Number.isFinite(costValue) ? costValue : 0
        );
      }
    });

    if (!hasValidQuantity) {
      toast.error('Debes ingresar al menos una cantidad mayor a cero.');
      return;
    }

    closeVariantSelection();
    toast.success('Variantes agregadas a la lista.');
  }, [variantSelection, upsertInventoryItem, closeVariantSelection]);

  const handleProductSelection = (selectedOption) => {
    if (!selectedOption) return;
    const productId = selectedOption.value;
    if (!productId) return;

    fetchApi(`/products/${productId}`)
      .then((response) => {
        if (!response?.data) return;
        const product = response.data;
        const variants = Array.isArray(product.variants)
          ? product.variants.filter(v => v && v.isActive !== false)
          : [];
        if (variants.length > 0) {
          openVariantSelection(product, variants);
        } else {
          upsertInventoryItem(product, null, 1, product.averageCost || 0);
          toast.success('Producto agregado a la lista.');
        }
      })
      .catch((error) => {
        console.error('Error fetching product details:', error);
        toast.error('Error al obtener detalles del producto.');
      });
  };

  const updateItemInList = (index, field, value) => {
    setItemsToAdd(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      if (field === 'quantity') {
        next[index][field] = Number(value);
        if (next[index].lots && next[index].lots.length === 1) {
          next[index].lots[0].quantity = Number(value);
        }
      } else if (field === 'costPrice') {
        next[index][field] = Number(value);
      } else {
        next[index][field] = value;
      }
      return next;
    });
  };

  const removeItemFromList = (index) => {
    setItemsToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemLot = (itemIndex, lotIndex, field, value) => {
    setItemsToAdd(prev => {
      const next = [...prev];
      const item = next[itemIndex];
      if (!item || !item.lots || !item.lots[lotIndex]) return prev;
      next[itemIndex].lots[lotIndex][field] = value;
      return next;
    });
  };

  // Reset add-dialog state when it closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setItemsToAdd([]);
      setNewInventoryItem({
        productId: '',
        productName: '',
        totalQuantity: 0,
        averageCostPrice: 0,
        lots: [],
        warehouseId: '',
        binLocationId: '',
        receivedBy: '',
        notes: '',
      });
      setVariantSelection(null);
      setProductSearchInput('');
    }
  }, [isAddDialogOpen]);

  // --- save batch ---
  const handleSaveBatch = async () => {
    if (itemsToAdd.length === 0) {
      toast.error('La lista de inventario está vacía.');
      return;
    }

    for (const item of itemsToAdd) {
      if (item.quantity <= 0) {
        toast.error(`El producto ${item.productName} tiene cantidad 0.`);
        return;
      }
      if (item.isPerishable) {
        const totalLotQty = item.lots.reduce((sum, lot) => sum + Number(lot.quantity), 0);
        if (totalLotQty !== item.quantity) {
          toast.error(`Las cantidades de los lotes no coinciden con el total para ${item.productName}. Total: ${item.quantity}, Lotes: ${totalLotQty}`);
          return;
        }
      }
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const batchReference = `RECIBO-${timestamp}`;

    try {
      for (const item of itemsToAdd) {
        const payload = {
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          totalQuantity: Number(item.quantity),
          averageCostPrice: Number(item.costPrice),
          receivedBy: newInventoryItem.receivedBy,
          notes: newInventoryItem.notes,
          warehouseId: newInventoryItem.warehouseId || undefined,
          binLocationId: newInventoryItem.binLocationId || undefined,
          reference: batchReference,
        };

        if (item.variantId) {
          payload.variantId = item.variantId;
          payload.variantSku = item.variantSku;
        }

        if (item.isPerishable) {
          payload.lots = item.lots.map(lot => ({
            lotNumber: lot.lotNumber || 'S/L',
            quantity: Number(lot.quantity),
            expirationDate: lot.expirationDate ? new Date(lot.expirationDate) : undefined,
            costPrice: Number(item.costPrice),
            receivedDate: new Date(),
          }));
        }

        console.log('📤 [handleSaveBatch] Sending:', payload);

        try {
          await fetchApi('/inventory', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          successCount++;
        } catch (err) {
          console.error(`Error saving item ${item.productName}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        const addedItems = itemsToAdd.map(item => ({
          productId: item.productId,
          name: item.productName,
          sku: item.productSku,
          brand: item.productObj?.brand,
          costPrice: item.costPrice,
        }));
        setRecentlyAddedItems(addedItems);

        toast.success(`${successCount} productos agregados correctamente.`, {
          action: {
            label: 'Imprimir Etiquetas',
            onClick: () => setIsLabelWizardOpen(true),
          },
          duration: 8000,
        });

        document.dispatchEvent(new CustomEvent('inventory-form-success'));
        setIsAddDialogOpen(false);
        setCurrentPage(1);
        setTimeout(() => refreshData(1, itemsPerPage, committedSearch), 500);
      }

      if (failCount > 0) {
        toast.warning(`${failCount} productos fallaron al guardarse.`);
      }
    } catch (err) {
      console.error('Critical batch error:', err);
      toast.error('Error procesando el lote.');
    } finally {
      setLoading(false);
    }
  };

  // --- edit handlers ---
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
      await refreshData(currentPage, itemsPerPage, committedSearch);
    } catch (err) {
      toast.error('Error al ajustar inventario', { description: err.message });
    }
  };

  const handleDeleteItem = async (id, confirm) => {
    const ok = await confirm({
      title: '¿Eliminar este inventario?',
      description: 'Esta acción desactivará el stock asociado y no se puede deshacer.',
      destructive: true,
    });
    if (!ok) return;

    try {
      await fetchApi(`/inventory/${id}`, { method: 'DELETE' });
      toast.success('Inventario eliminado correctamente.');

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

  // --- transfer handlers ---
  const handleOpenTransfer = (item) => {
    console.log('🔍 Opening transfer for item:', item);
    let productId = null;
    if (typeof item.productId === 'string' && item.productId) {
      productId = item.productId;
    } else if (item.productId?._id) {
      productId = item.productId._id;
    } else if (item.variantId) {
      productId = typeof item.variantId === 'string' ? item.variantId : item.variantId._id;
    } else if (item._id) {
      productId = item._id;
    }
    console.log('🔍 Extracted productId:', productId);

    setTransferForm({
      productId,
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
    console.log('🔍 Transfer form state:', transferForm);
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

  // --- lot editing handlers ---
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

    const expirationDate = editingLotData.expirationDate ? new Date(editingLotData.expirationDate) : null;
    const manufacturingDate = editingLotData.manufacturingDate ? new Date(editingLotData.manufacturingDate) : null;

    if (expirationDate && manufacturingDate && expirationDate <= manufacturingDate) {
      toast.error('Validación fallida', {
        description: 'La fecha de vencimiento debe ser posterior a la fecha de fabricación',
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

      if (response?.data) {
        setSelectedInventoryForLots(response.data);
      } else {
        setSelectedInventoryForLots({
          ...selectedInventoryForLots,
          lots: updatedLots,
        });
      }

      await refreshData(currentPage, itemsPerPage, committedSearch);
      handleCancelEditLot();
    } catch (err) {
      toast.error('Error al actualizar lote', { description: err.message });
    }
  };

  // --- status badge ---
  const getStatusBadge = (item) => {
    // This is a render helper; we return the props rather than JSX
    // to avoid importing Badge in the hook. The component will render.
    if (item.alerts?.lowStock) return 'lowStock';
    if (item.alerts?.nearExpiration) return 'nearExpiration';
    return 'available';
  };

  return {
    // core data
    inventoryData,
    loading,
    error,
    filteredData,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    binLocations,
    warehouses,

    // add dialog
    isAddDialogOpen,
    setIsAddDialogOpen,
    itemsToAdd,
    setItemsToAdd,
    variantSelection,
    setVariantSelection,
    newInventoryItem,
    setNewInventoryItem,
    productSearchInput,
    setProductSearchInput,
    selectedProductDetails,
    setSelectedProductDetails,
    selectedProduct,

    // edit dialog
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedItem,
    setSelectedItem,
    editFormData,
    setEditFormData,
    editBinOptions,

    // export
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFormat,
    setExportFormat,

    // import preview
    fileInputRef,
    isPreviewDialogOpen,
    setIsPreviewDialogOpen,
    previewData,
    setPreviewData,
    previewHeaders,
    setPreviewHeaders,
    importReason,
    setImportReason,

    // lots dialog
    isLotsDialogOpen,
    setIsLotsDialogOpen,
    selectedInventoryForLots,
    setSelectedInventoryForLots,
    editingLotIndex,
    setEditingLotIndex,
    editingLotData,
    setEditingLotData,

    // columns
    visibleColumns,
    setVisibleColumns,

    // label wizard
    isLabelWizardOpen,
    setIsLabelWizardOpen,
    recentlyAddedItems,
    setRecentlyAddedItems,

    // transfer
    isTransferDialogOpen,
    setIsTransferDialogOpen,
    transferForm,
    setTransferForm,
    transferLoading,
    sourceBinOptions,
    destBinOptions,

    // pagination
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,

    // sort
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // vertical config derived
    inventoryAttributes,
    inventoryAttributeColumns,
    placeholders,
    getPlaceholder,
    categories,

    // helpers
    formatProductCategory,
    normalizeId,
    formatVariantLabel,
    getBinLocationName,
    getStatusBadge,

    // handlers
    loadData,
    refreshData,
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
    handleItemsPerPageChange,
    loadProductOptions,
    upsertInventoryItem,
    openVariantSelection,
    closeVariantSelection,
    confirmVariantSelection,
    handleProductSelection,
    updateItemInList,
    removeItemFromList,
    updateItemLot,
    handleSaveBatch,
    handleEditItem,
    handleUpdateItem,
    handleDeleteItem,
    handleOpenTransfer,
    handleSaveTransfer,
    handleStartEditLot,
    handleCancelEditLot,
    handleSaveLot,
  };
}
