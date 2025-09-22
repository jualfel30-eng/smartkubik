import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Combobox } from '@/components/ui/combobox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import * as XLSX from 'xlsx';
import { fetchApi } from '../lib/api';
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
  const fileInputRef = useRef(null);

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

      console.log('Respuesta de API /inventory:', inventoryItems);
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
      setIsAddDialogOpen(false);
      setNewInventoryItem({ productId: '', totalQuantity: 0, averageCostPrice: 0, lots: [] });
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

  const handleImport = () => {};

  if (loading) return <div>Cargando inventario...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-start items-center space-x-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><Plus className="h-5 w-5 mr-2" />Agregar Inventario</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar Inventario Inicial</DialogTitle>
                <DialogDescription>Selecciona un producto y define su stock y costo inicial.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Producto</Label>
                  <Combobox
                    options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
                    value={newInventoryItem.productId}
                    onChange={(value) => setNewInventoryItem({...newInventoryItem, productId: value})}
                    placeholder="Seleccionar producto"
                    searchPlaceholder="Buscar producto..."
                    emptyPlaceholder="No se encontraron productos."
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
          <Button variant="outline" size="sm" onClick={handleImport}><Upload className="h-4 w-4 mr-2" />Importar</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>Exportar a .xlsx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>Exportar a .csv</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
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
    </div>
  );
}

export default InventoryManagement;