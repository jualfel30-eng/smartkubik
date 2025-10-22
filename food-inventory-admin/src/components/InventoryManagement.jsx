import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
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
  ChevronsRight
} from 'lucide-react';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';

function InventoryManagement() {
  const [inventoryData, setInventoryData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newInventoryItem, setNewInventoryItem] = useState({
    productId: '',
    totalQuantity: 0,
    averageCostPrice: 0,
    lots: [],
  });
  const [variantQuantities, setVariantQuantities] = useState([]);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [editFormData, setEditFormData] = useState({ newQuantity: 0, reason: '' });
  const [productSearchInput, setProductSearchInput] = useState('');
  const fileInputRef = useRef(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [importReason, setImportReason] = useState('');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const verticalConfig = useVerticalConfig();
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
  const placeholders = verticalConfig?.placeholders || {};
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
    return products.find((p) => p._id === newInventoryItem.productId) || null;
  }, [products, newInventoryItem.productId, selectedProductDetails]);

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

  const loadData = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [InventoryManagement] Cargando datos... Página:', page);

      const [inventoryResponse, productsList] = await Promise.all([
        fetchApi(`/inventory?page=${page}&limit=${itemsPerPage}`),
        fetchApi('/products?limit=500')  // Límite máximo permitido por el backend
      ]);

      console.log('📦 [InventoryManagement] Inventarios recibidos:', inventoryResponse?.data?.length || 0);
      console.log('📦 [InventoryManagement] Productos recibidos:', productsList?.data?.length || 0);
      console.log('📊 [InventoryManagement] Paginación:', inventoryResponse?.pagination);

      const inventoryWithAttributes = (inventoryResponse.data || []).map((item) => ({
        ...item,
        inventoryAttributes: item.attributes || item.inventoryAttributes || {},
      }));
      setInventoryData(inventoryWithAttributes);
      setProducts(productsList.data || []);

      // Actualizar información de paginación
      if (inventoryResponse?.pagination) {
        setCurrentPage(inventoryResponse.pagination.page);
        setTotalPages(inventoryResponse.pagination.totalPages);
        setTotalItems(inventoryResponse.pagination.total);
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
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    console.log('🔍 [useEffect Filter] Filtrando datos...');
    console.log('🔍 [useEffect Filter] inventoryData.length:', inventoryData.length);
    let filtered = inventoryData;
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productId?.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.productId?.category === filterCategory);
    }
    console.log('🔍 [useEffect Filter] filteredData.length:', filtered.length);
    setFilteredData(filtered);
  }, [inventoryData, searchTerm, filterCategory]);

  const categories = [...new Set(inventoryData.map(item => item.productId?.category).filter(Boolean))];

  // Funciones de paginación
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadData(newPage);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadData(1);
  };

  const getStatusBadge = (item) => {
    if (item.alerts?.lowStock) return <Badge variant="destructive">Stock Crítico</Badge>;
    if (item.alerts?.nearExpiration) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Próximo a Vencer</Badge>;
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

const handleProductSelection = (selectedOption) => {
  const newProductId = selectedOption ? selectedOption.value : '';
  setNewInventoryItem((prev) => ({
    ...prev,
    productId: newProductId,
    totalQuantity: 0,
    lots: [],
  }));
  setProductSearchInput(''); // Clear input after selection
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
            averageCostPrice: baseCost,
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
        await loadData(1);
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
      await loadData(1);
      console.log('✅ [handleAddItem] loadData() completado');
    } catch (err) {
      console.error('❌ [handleAddItem] Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditFormData({ newQuantity: item.availableQuantity, reason: '' });
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
    };

    try {
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsEditDialogOpen(false);
      toast.success('Inventario ajustado correctamente.');
      await loadData(currentPage); // Recargar datos en la página actual
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
        await loadData(currentPage - 1);
      } else {
        await loadData(currentPage);
      }
    } catch (err) {
      toast.error('Error al eliminar inventario', { description: err.message });
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

  const handleExport = (fileType) => {
    const dataToExport = filteredData.map(item => {
      const row = {
        SKU: item.productSku,
        VariantSKU: item.variantSku || '',
        Producto: item.productName,
        Categoría: item.productId?.category,
        Marca: item.productId?.brand,
        'Stock Disponible': item.availableQuantity,
        'Stock Total': item.totalQuantity,
        'Costo Promedio': item.averageCostPrice,
        'Fecha de Vencimiento (Primer Lote)': item.lots?.[0]?.expirationDate
          ? new Date(item.lots[0].expirationDate).toLocaleDateString()
          : 'N/A',
      };

      inventoryAttributeColumns.forEach(({ descriptor, header }) => {
        row[header] =
          item.inventoryAttributes?.[descriptor.key] ??
          item.attributes?.[descriptor.key] ??
          '';
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    if (fileType === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'inventario.csv');
    } else {
      XLSX.writeFile(wb, 'inventario.xlsx');
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
      await loadData(1);

    } catch (error) {
      toast.error('Error al ajustar el inventario', {
        description: error.message,
      });
    }
  };

  if (loading) return <div>Cargando inventario...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

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
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>Exportar a .xlsx</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>Exportar a .csv</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={loadData} disabled={loading} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Agregar Inventario Inicial</DialogTitle>
                  <DialogDescription>Selecciona un producto y define su stock y costo inicial.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Producto</Label>
                    <SearchableSelect
                      options={products.map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
                      onSelection={handleProductSelection}
                      inputValue={productSearchInput}
                      onInputChange={setProductSearchInput}
                      value={
                        newInventoryItem.productId
                          ? {
                              value: newInventoryItem.productId,
                              label:
                                products.find((p) => p._id === newInventoryItem.productId)?.name || productSearchInput,
                            }
                          : null
                      }
                      placeholder={getPlaceholder('search', 'Buscar producto...')}
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
                            <Input
                              className="sm:col-span-2"
                              type="number"
                              min="0"
                              value={variant.quantity}
                              onChange={(e) => handleVariantQuantityChange(index, e.target.value)}
                              placeholder="Cantidad"
                            />
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
                      <Input
                        id="totalQuantity"
                        type="number"
                        value={newInventoryItem.totalQuantity}
                        onChange={(e) =>
                          setNewInventoryItem({
                            ...newInventoryItem,
                            totalQuantity: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="averageCostPrice">Costo Promedio por Unidad ($)</Label>
                    <Input
                      id="averageCostPrice"
                      type="number"
                      value={newInventoryItem.averageCostPrice}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, averageCostPrice: e.target.value})}
                    />
                  </div>
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
                          <Input
                            type="number"
                            placeholder="Cantidad"
                            value={lot.quantity}
                            onChange={(e) => handleLotChange(index, 'quantity', e.target.value)}
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
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
                  <TableHead>Stock Disponible</TableHead>
                  <TableHead>Costo Promedio</TableHead>
                  <TableHead>Vencimiento (1er Lote)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.productSku}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">{item.productId?.brand || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.productId?.category || 'N/A'}</TableCell>
                    <TableCell>{item.availableQuantity} unidades</TableCell>
                    <TableCell>${item.averageCostPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.lots?.[0]?.expirationDate ? new Date(item.lots[0].expirationDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteItem(item._id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
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
              <Input
                id="newQuantity"
                type="number"
                value={editFormData.newQuantity}
                onChange={(e) => setEditFormData({ ...editFormData, newQuantity: e.target.value })}
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
    </div>
  );
}

export default InventoryManagement;
