import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card.jsx';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { ShelfLabelWizard } from './inventory/ShelfLabelWizard';
import { InventoryToolbar } from './inventory/InventoryToolbar';
import { InventoryTable } from './inventory/InventoryTable';
import { InventoryPagination } from './inventory/InventoryPagination';
import { InventoryAddDialog } from './inventory/InventoryAddDialog';
import { InventoryEditDialog } from './inventory/InventoryEditDialog';
import { InventoryImportDialog } from './inventory/InventoryImportDialog';
import { InventoryLotsDialog } from './inventory/InventoryLotsDialog';
import { InventoryTransferDialog } from './inventory/InventoryTransferDialog';
import { useInventoryData } from './inventory/useInventoryData';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { useVerticalConfig } from '@/hooks/useVerticalConfig.js';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { useConfirm } from '@/hooks/use-confirm';

function InventoryManagement() {
  const [ConfirmDialog, confirm] = useConfirm();
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const verticalConfig = useVerticalConfig();

  const inv = useInventoryData({ multiWarehouseEnabled, verticalConfig });

  // --- Export / Import handlers (use XLSX, so kept in orchestrator) ---

  const handleDownloadTemplate = useCallback(() => {
    const baseHeaders = ['SKU', 'VariantSKU', 'NuevaCantidad'];
    const attributeHeaders = inv.inventoryAttributeColumns.map(({ header }) => header);
    const headers = [...baseHeaders, ...attributeHeaders];

    const buildRow = (sku, variantSku, quantity) => {
      const row = { SKU: sku, VariantSKU: variantSku || '', NuevaCantidad: quantity };
      inv.inventoryAttributeColumns.forEach(({ header, descriptor }) => {
        row[header] = descriptor.required ? `Ej_${descriptor.key}` : '';
      });
      return row;
    };

    const exampleRows = [0, 1, 2].map((index) => {
      const sample = inv.inventoryData[index];
      if (sample) {
        return buildRow(sample.productSku, sample.variantSku, index === 0 ? 100 : index === 1 ? 50 : 25);
      }
      return buildRow(`SKU-00${index + 1}`, '', index === 0 ? 100 : index === 1 ? 50 : 25);
    });

    const sheetRows = [headers, ...exampleRows.map((row) => headers.map((header) => row[header] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla de Inventario");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_ajuste_inventario.xlsx');
  }, [inv.inventoryData, inv.inventoryAttributeColumns]);

  const openExportDialog = useCallback((format) => {
    inv.setExportFormat(format);
    inv.setIsExportDialogOpen(true);
  }, [inv]);

  const getExportColumns = useCallback(() => {
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
    const iAttrs = inv.inventoryAttributeColumns.map(({ descriptor }) => ({
      key: `iAttr_${descriptor.key}`,
      label: `Attr: ${descriptor.label || descriptor.key}`,
      defaultChecked: false,
    }));
    return [...baseColumns, ...iAttrs];
  }, [inv.inventoryAttributeColumns]);

  const handleConfirmExport = useCallback(async (selectedColumnKeys) => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '10000' });
      const response = await fetchApi(`/inventory?${params.toString()}`);
      let allItems = response.data || [];

      if (typeof inv.searchTerm === 'string' && inv.searchTerm.trim()) {
        const searchLower = inv.searchTerm.trim().toLowerCase();
        allItems = allItems.filter(item => {
          const candidates = [item.productName, item.productSku, item.variantSku, item.productId?.name, item.productId?.sku]
            .filter(Boolean).map(v => String(v).toLowerCase());
          return candidates.some(v => v.includes(searchLower));
        });
      }

      if (inv.filterCategory && inv.filterCategory !== 'all') {
        allItems = allItems.filter(item => item.productId?.category === inv.filterCategory);
      }

      const inventoryWithAttributes = allItems.map((item) => ({
        ...item,
        inventoryAttributes: item.attributes || item.inventoryAttributes || {},
      }));

      if (inventoryWithAttributes.length === 0) {
        toast.warning("No hay datos para exportar.");
        return;
      }

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
        inv.inventoryAttributeColumns.forEach(({ descriptor }) => {
          const key = `iAttr_${descriptor.key}`;
          if (selectedColumnKeys.includes(key)) {
            row[`Attr: ${descriptor.label}`] = item.inventoryAttributes?.[descriptor.key] ?? item.attributes?.[descriptor.key] ?? '';
          }
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      if (inv.exportFormat === 'csv') {
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
  }, [inv.searchTerm, inv.filterCategory, inv.exportFormat, inv.inventoryAttributeColumns]);

  const handleImport = useCallback(() => {
    inv.fileInputRef.current.click();
  }, [inv.fileInputRef]);

  const handleFileSelect = useCallback((e) => {
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
            rawHeaders.forEach((header, index) => { rowData[header] = row[index]; });
            return rowData;
          })
          .filter(row => row.SKU && row.NuevaCantidad !== undefined && row.NuevaCantidad !== '');

        if (rows.length === 0) {
          throw new Error("No se encontraron filas con datos válidos en el archivo. Asegúrate de que las columnas SKU y NuevaCantidad tengan valores.");
        }

        if (!rawHeaders.includes('SKU') || !rawHeaders.includes('NuevaCantidad')) {
          throw new Error("El archivo debe contener las columnas 'SKU' y 'NuevaCantidad'.");
        }

        const requiredAttributeHeaders = inv.inventoryAttributeColumns
          .filter(({ descriptor }) => descriptor.required)
          .map(({ header }) => header);
        const missingAttributeHeaders = requiredAttributeHeaders.filter(header => !rawHeaders.includes(header));
        if (missingAttributeHeaders.length > 0) {
          throw new Error(`Faltan columnas de atributos obligatorias: ${missingAttributeHeaders.join(', ')}`);
        }

        inv.setPreviewHeaders(rawHeaders);
        inv.setPreviewData(rows);
        inv.setIsPreviewDialogOpen(true);
      } catch (err) {
        toast.error("Error al procesar el archivo", { description: err.message });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  }, [inv]);

  const handleConfirmImport = useCallback(async () => {
    if (!inv.importReason) {
      toast.error('La razón del ajuste es obligatoria.');
      return;
    }

    const normalizedItems = inv.previewData
      .map(row => {
        if (!row.SKU) return null;
        const newQuantity = Number(row.NuevaCantidad);
        if (Number.isNaN(newQuantity)) return null;

        const attributesPayload = {};
        Object.entries(row).forEach(([key, value]) => {
          if (key.startsWith('inventoryAttr_')) {
            const attrKey = key.replace('inventoryAttr_', '').trim();
            if (attrKey && value !== undefined && value !== null && String(value).trim() !== '') {
              attributesPayload[attrKey] = typeof value === 'string' ? value.trim() : value;
            }
          }
        });

        return {
          SKU: String(row.SKU).trim(),
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

    try {
      const response = await fetchApi('/inventory/bulk-adjust', {
        method: 'POST',
        body: JSON.stringify({ items: normalizedItems, reason: inv.importReason }),
      });

      inv.setIsPreviewDialogOpen(false);
      inv.setImportReason('');
      toast.success(response?.message || 'Inventario ajustado masivamente con éxito.');
      inv.refreshData(1, inv.itemsPerPage, inv.searchTerm);
    } catch (error) {
      toast.error('Error al ajustar el inventario', { description: error.message });
    }
  }, [inv]);

  // --- Sort handler for InventoryTable ---
  const handleSort = useCallback((field, order) => {
    inv.setSortBy(field);
    inv.setSortOrder(order);
  }, [inv]);

  // --- View lots handler ---
  const handleViewLots = useCallback((item) => {
    inv.setSelectedInventoryForLots(item);
    inv.setIsLotsDialogOpen(true);
  }, [inv]);

  // --- Delete handler (wraps hook's version with confirm from useConfirm) ---
  const handleDeleteItem = useCallback(async (id) => {
    await inv.handleDeleteItem(id, confirm);
  }, [inv, confirm]);

  // --- Search placeholder ---
  const searchPlaceholder = useMemo(
    () => inv.getPlaceholder('search', 'Buscar por nombre, SKU o marca...'),
    [inv.getPlaceholder],
  );

  // --- Early returns for loading/error ---
  if (inv.loading && inv.inventoryData.length === 0 && !inv.searchTerm && inv.filterCategory === 'all') {
    return <div>Cargando inventario...</div>;
  }
  if (inv.error && inv.inventoryData.length === 0) {
    return <div className="text-destructive">Error: {inv.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <InventoryToolbar
          onImport={handleImport}
          onDownloadTemplate={handleDownloadTemplate}
          onOpenExportDialog={openExportDialog}
          onRefresh={inv.loadData}
          loading={inv.loading}
          onOpenLabelWizard={() => inv.setIsLabelWizardOpen(true)}
          onAddInventory={() => inv.setIsAddDialogOpen(true)}
          fileInputRef={inv.fileInputRef}
          onFileSelect={handleFileSelect}
          inventoryAttributeColumns={inv.inventoryAttributeColumns}
          searchTerm={inv.searchTerm}
          onSearchChange={inv.setSearchTerm}
          searchPlaceholder={searchPlaceholder}
          visibleColumns={inv.visibleColumns}
          onVisibleColumnsChange={inv.setVisibleColumns}
          filterCategory={inv.filterCategory}
          onFilterCategoryChange={inv.setFilterCategory}
          categories={inv.categories}
        />

        <InventoryAddDialog
          isAddDialogOpen={inv.isAddDialogOpen}
          setIsAddDialogOpen={inv.setIsAddDialogOpen}
          newInventoryItem={inv.newInventoryItem}
          setNewInventoryItem={inv.setNewInventoryItem}
          multiWarehouseEnabled={multiWarehouseEnabled}
          warehouses={inv.warehouses}
          binLocations={inv.binLocations}
          loadProductOptions={inv.loadProductOptions}
          handleProductSelection={inv.handleProductSelection}
          variantSelection={inv.variantSelection}
          closeVariantSelection={inv.closeVariantSelection}
          confirmVariantSelection={inv.confirmVariantSelection}
          setVariantSelection={inv.setVariantSelection}
          itemsToAdd={inv.itemsToAdd}
          updateItemInList={inv.updateItemInList}
          removeItemFromList={inv.removeItemFromList}
          updateItemLot={inv.updateItemLot}
          handleSaveBatch={inv.handleSaveBatch}
          loading={inv.loading}
        />
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          <InventoryTable
            data={inv.filteredData}
            loading={inv.loading}
            visibleColumns={inv.visibleColumns}
            sortBy={inv.sortBy}
            sortOrder={inv.sortOrder}
            onSort={handleSort}
            multiWarehouseEnabled={multiWarehouseEnabled}
            binLocations={inv.binLocations}
            warehouses={inv.warehouses}
            formatProductCategory={inv.formatProductCategory}
            getBinLocationName={inv.getBinLocationName}
            getStatusBadge={inv.getStatusBadge}
            onEdit={inv.handleEditItem}
            onDelete={handleDeleteItem}
            onTransfer={inv.handleOpenTransfer}
            onViewLots={handleViewLots}
          />

          <InventoryPagination
            currentPage={inv.currentPage}
            totalPages={inv.totalPages}
            totalItems={inv.totalItems}
            itemsPerPage={inv.itemsPerPage}
            onPageChange={inv.handlePageChange}
            onPreviousPage={inv.handlePreviousPage}
            onNextPage={inv.handleNextPage}
            onItemsPerPageChange={inv.handleItemsPerPageChange}
          />
        </CardContent>
      </Card>

      <InventoryEditDialog
        isEditDialogOpen={inv.isEditDialogOpen}
        setIsEditDialogOpen={inv.setIsEditDialogOpen}
        selectedItem={inv.selectedItem}
        editFormData={inv.editFormData}
        setEditFormData={inv.setEditFormData}
        handleUpdateItem={inv.handleUpdateItem}
        multiWarehouseEnabled={multiWarehouseEnabled}
        editBinOptions={inv.editBinOptions}
      />

      <InventoryImportDialog
        isPreviewDialogOpen={inv.isPreviewDialogOpen}
        setIsPreviewDialogOpen={inv.setIsPreviewDialogOpen}
        previewData={inv.previewData}
        previewHeaders={inv.previewHeaders}
        importReason={inv.importReason}
        setImportReason={inv.setImportReason}
        handleConfirmImport={handleConfirmImport}
      />

      <InventoryLotsDialog
        isLotsDialogOpen={inv.isLotsDialogOpen}
        setIsLotsDialogOpen={inv.setIsLotsDialogOpen}
        selectedInventoryForLots={inv.selectedInventoryForLots}
        editingLotIndex={inv.editingLotIndex}
        editingLotData={inv.editingLotData}
        setEditingLotData={inv.setEditingLotData}
        handleStartEditLot={inv.handleStartEditLot}
        handleCancelEditLot={inv.handleCancelEditLot}
        handleSaveLot={inv.handleSaveLot}
      />

      <InventoryTransferDialog
        isTransferDialogOpen={inv.isTransferDialogOpen}
        setIsTransferDialogOpen={inv.setIsTransferDialogOpen}
        transferForm={inv.transferForm}
        setTransferForm={inv.setTransferForm}
        transferLoading={inv.transferLoading}
        handleSaveTransfer={inv.handleSaveTransfer}
        warehouses={inv.warehouses}
        sourceBinOptions={inv.sourceBinOptions}
        destBinOptions={inv.destBinOptions}
      />

      <ExportOptionsDialog
        open={inv.isExportDialogOpen}
        onClose={() => inv.setIsExportDialogOpen(false)}
        onExport={handleConfirmExport}
        columns={getExportColumns()}
        title={inv.exportFormat === 'xlsx' ? "Exportar a Excel" : "Exportar a CSV"}
      />

      <ShelfLabelWizard
        isOpen={inv.isLabelWizardOpen}
        onClose={() => inv.setIsLabelWizardOpen(false)}
        initialSelectedItems={inv.recentlyAddedItems}
      />

      <ConfirmDialog />
    </div>
  );
}

export default InventoryManagement;
