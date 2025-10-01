import { useState, useEffect, useRef, useCallback } from 'react';
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
import * as XLSX from 'xlsx';
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
  RefreshCw
} from 'lucide-react';

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
  const [editFormData, setEditFormData] = useState({ newQuantity: 0, reason: '' });
  const [productSearchInput, setProductSearchInput] = useState('');
  const fileInputRef = useRef(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [importReason, setImportReason] = useState('');

  const handleLotChange = (index, field, value) => {
    const updatedLots = [...newInventoryItem.lots];
    updatedLots[index][field] = value;
    setNewInventoryItem({ ...newInventoryItem, lots: updatedLots });
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [inventoryItems, productsList] = await Promise.all([
        fetchApi('/inventory'),
        fetchApi('/products')
      ]);

      setInventoryData(inventoryItems.data || []);
      setProducts(productsList.data || []);

    } catch (err) {
      setError(err.message);
      setInventoryData([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
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
    setFilteredData(filtered);
  }, [inventoryData, searchTerm, filterCategory]);

  const categories = [...new Set(inventoryData.map(item => item.productId?.category).filter(Boolean))];

  const getStatusBadge = (item) => {
    if (item.alerts?.lowStock) return <Badge variant="destructive">Stock Crítico</Badge>;
    if (item.alerts?.nearExpiration) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Próximo a Vencer</Badge>;
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  const handleProductSelection = (selectedOption) => {
    const newProductId = selectedOption ? selectedOption.value : '';
    setNewInventoryItem({ ...newInventoryItem, productId: newProductId });
    setProductSearchInput(''); // Clear input after selection
  };

  const handleAddItem = async () => {
    if (!newInventoryItem.productId) {
      alert('Por favor, selecciona un producto.');
      return;
    }

    const selectedProduct = products.find(p => p._id === newInventoryItem.productId);
    if (!selectedProduct) {
        alert('Producto seleccionado no es válido.');
        return;
    }

    const payload = {
      productId: selectedProduct._id,
      productSku: selectedProduct.sku,
      productName: selectedProduct.name,
      totalQuantity: Number(newInventoryItem.totalQuantity),
      averageCostPrice: Number(newInventoryItem.averageCostPrice),
      lots: newInventoryItem.lots.map(lot => ({
        lotNumber: lot.lotNumber,
        quantity: Number(lot.quantity),
        expirationDate: lot.expirationDate ? new Date(lot.expirationDate) : undefined,
        costPrice: Number(newInventoryItem.averageCostPrice), // Usar el costo promedio por ahora
        receivedDate: new Date(), // Usar fecha actual por ahora
      })),
    };

    if (!selectedProduct.isPerishable) {
      delete payload.lots;
    }

    try {
      await fetchApi('/inventory', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });
      document.dispatchEvent(new CustomEvent('inventory-form-success'));
      setIsAddDialogOpen(false);
      setNewInventoryItem({ productId: '', totalQuantity: 0, averageCostPrice: 0, lots: [] });
      setProductSearchInput('');
      loadData(); // Recargar datos
    } catch (err) {
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
      loadData(); // Recargar datos
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteItem = (id) => console.log("Delete item logic needs to be connected to the API", id);

  const handleDownloadTemplate = () => {
    const headers = ['SKU', 'NuevaCantidad'];
    const exampleSkus = inventoryData.slice(0, 3).map(item => item.productSku);
    const exampleData = [
      [exampleSkus[0] || 'SKU-001', 100],
      [exampleSkus[1] || 'SKU-002', 50],
      [exampleSkus[2] || 'PROD-ABC', 250],
    ];

    const data = [headers, ...exampleData];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla de Inventario");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_ajuste_inventario.xlsx');
  };

  const handleExport = (fileType) => {
    const dataToExport = filteredData.map(item => ({
      'SKU': item.productSku,
      'Producto': item.productName,
      'Categoría': item.productId?.category,
      'Marca': item.productId?.brand,
      'Stock Disponible': item.availableQuantity,
      'Stock Total': item.totalQuantity,
      'Costo Promedio': item.averageCostPrice,
      'Fecha de Vencimiento (Primer Lote)': item.lots?.[0]?.expirationDate ? new Date(item.lots[0].expirationDate).toLocaleDateString() : 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `inventario.${fileType}`);
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

        const headers = json[0];
        const rows = json.slice(1).map(row => {
          let rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });
          return rowData;
        }).filter(row => row.SKU && row.NuevaCantidad !== undefined && row.NuevaCantidad !== '');

        if (rows.length === 0) {
          throw new Error("No se encontraron filas con datos válidos en el archivo. Asegúrate de que las columnas SKU y NuevaCantidad tengan valores.");
        }

        // Validate required columns
        if (!headers.includes('SKU') || !headers.includes('NuevaCantidad')) {
          throw new Error("El archivo debe contener las columnas 'SKU' y 'NuevaCantidad'.");
        }

        setPreviewHeaders(headers);
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

    const validItems = previewData
      .map(row => ({
        SKU: row.SKU,
        NuevaCantidad: Number(row.NuevaCantidad),
      }))
      .filter(item => item.SKU && !isNaN(item.NuevaCantidad));

    if (validItems.length === 0) {
      toast.error('No hay datos válidos para importar.');
      return;
    }

    const payload = {
      items: validItems,
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
      loadData(); // Reload data to show changes

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
        <div>
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
                      options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
                      onSelection={handleProductSelection}
                      inputValue={productSearchInput}
                      onInputChange={setProductSearchInput}
                      value={
                        newInventoryItem.productId
                          ? { 
                              value: newInventoryItem.productId, 
                              label: products.find(p => p._id === newInventoryItem.productId)?.name || productSearchInput
                            }
                          : null
                      }
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalQuantity">Cantidad Inicial</Label>
                    <Input
                      id="totalQuantity"
                      type="number"
                      value={newInventoryItem.totalQuantity}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, totalQuantity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averageCostPrice">Costo Promedio por Unidad ($)</Label>
                    <Input
                      id="averageCostPrice"
                      type="number"
                      value={newInventoryItem.averageCostPrice}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, averageCostPrice: e.target.value})}
                    />
                  </div>
                  {(() => {
                    const selectedProduct = products.find(p => p._id === newInventoryItem.productId);
                    if (selectedProduct && selectedProduct.isPerishable) {
                      return (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h4 className="font-medium">Lotes del Producto Perecedero</h4>
                          {newInventoryItem.lots.map((lot, index) => (
                            <div key={index} className="grid grid-cols-4 gap-2 items-center">
                              <Input placeholder="Nro. Lote" value={lot.lotNumber} onChange={(e) => handleLotChange(index, 'lotNumber', e.target.value)} />
                              <Input type="number" placeholder="Cantidad" value={lot.quantity} onChange={(e) => handleLotChange(index, 'quantity', e.target.value)} />
                              <Input type="date" placeholder="Vencimiento" value={lot.expirationDate} onChange={(e) => handleLotChange(index, 'expirationDate', e.target.value)} />
                              <Button variant="ghost" size="sm" onClick={() => removeLot(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={addLot}>
                            <Plus className="h-4 w-4 mr-2" /> Agregar Lote
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                  placeholder="Buscar por nombre, SKU o marca..."
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