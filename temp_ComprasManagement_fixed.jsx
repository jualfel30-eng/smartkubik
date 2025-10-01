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
import { useDebounce } from '@/hooks/use-debounce';
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
  const [poLoading, setPoLoading] = useState(false);
  const [supplierRifInput, setSupplierRifInput] = useState('');
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

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
    if (isNewProductDialogOpen) {
      setSelectedImageIndex(0);
    }
  }, [isNewProductDialogOpen]);

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
    // (Implementation remains the same)
  };

  const handleImageUpload = (e) => {
    // (Implementation remains the same)
  };

  const handleRemoveImage = (index) => {
    // (Implementation remains the same)
  };

  // --- Handlers for New Purchase Order Dialog ---
  const handleSupplierNameInputChange = (value) => {
    setSupplierNameInput(value);
    setPo(prev => ({ ...prev, supplierName: value, supplierId: '' }));
  };

  const handleSupplierRifInputChange = (value) => {
    setSupplierRifInput(value);
    const [type, ...rifParts] = value.split('-');
    if (rifParts.length > 0) {
        setPo(prev => ({ ...prev, taxType: type, supplierRif: rifParts.join('-'), supplierId: '' }));
    } else {
        setPo(prev => ({ ...prev, supplierRif: value, supplierId: '' }));
    }
  };

  const handleSupplierSelection = (selectedOption) => {
    if (!selectedOption) {
      setPo(prev => ({ ...prev, supplierId: '', supplierName: '', supplierRif: '', taxType: 'J', contactName: '', contactPhone: '', contactEmail: '' }));
      setSupplierNameInput('');
      setSupplierRifInput('');
      return;
    }
    const { customer } = selectedOption;
    setPo(prev => ({
      ...prev,
      supplierId: customer._id,
      supplierName: customer.companyName || customer.name,
      supplierRif: customer.taxInfo?.taxId || '',
      taxType: customer.taxInfo?.taxType || 'J',
      contactName: customer.contacts?.[0]?.name || customer.name || '',
      contactPhone: customer.contacts?.find(c => c.type === 'phone')?.value || '',
      contactEmail: customer.contacts?.find(c => c.type === 'email')?.value || '',
    }));
    setSupplierNameInput('');
    setSupplierRifInput('');
  };

  const handleRifSelection = (selectedOption) => {
    handleSupplierSelection(selectedOption); // Same logic
  };

  const handleFieldChange = (field, value) => {
    setPo(prev => ({ ...prev, [field]: value }));
  };

  const supplierNameOptions = useMemo(() =>
    suppliers.map(s => ({ value: s._id, label: s.companyName || s.name, customer: s }))
  , [suppliers]);

  const supplierRifOptions = useMemo(() =>
    suppliers.filter(s => s.taxInfo?.taxId).map(s => ({ value: s._id, label: s.taxInfo.taxId, customer: s }))
  , [suppliers]);

  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({ value: s._id, label: s.companyName || s.name, supplier: s }))
  , [suppliers]);

  const productOptions = useMemo(() => 
    products.map(p => ({ value: p._id, label: `${p.name} (${p.sku || 'N/A'})`, product: p }))
  , [products]);

  const handleProductSelection = (selectedOption) => {
    if (!selectedOption) return;
    const product = selectedOption.product;
    if (!product) return;
    const variant = product.variants?.[0];
    if (!variant) return;

    const existingItem = po.items.find(item => item.productId === product._id);
    if (existingItem) {
      const updatedItems = po.items.map(item => 
        item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setPo(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem = {
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        costPrice: variant.costPrice || 0,
        isPerishable: product.isPerishable,
        lotNumber: '',
        expirationDate: '',
      };
      setPo(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
    setProductSearchInput('');
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
    // (Implementation remains the same)
  };
  
  const handleCreatePoFromAlert = (product) => {
    // (Implementation remains the same)
  };

  const resetPoForm = () => {
    setPo(initialPoState);
    setSupplierRifInput('');
    setSupplierNameInput('');
    setProductSearchInput('');
  }

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-start items-center gap-4">
            <Dialog open={isNewPurchaseDialogOpen} onOpenChange={(isOpen) => { setIsNewPurchaseDialogOpen(isOpen); if (!isOpen) resetPoForm(); }}>
                <DialogTrigger asChild>
                    <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto"><PlusCircle className="mr-2 h-5 w-5" /> Añadir Inventario</Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl">
                    <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle><DialogDescription>Crea una nueva orden de compra para reabastecer tu inventario.</DialogDescription></DialogHeader>
                    
                    <div className="space-y-6 p-1">
                        <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="text-lg font-semibold">Proveedor</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>RIF del Proveedor</Label>
                                    <SearchableSelect
                                        isCreatable
                                        options={supplierRifOptions}
                                        onSelection={handleRifSelection}
                                        inputValue={supplierRifInput}
                                        onInputChange={handleSupplierRifInputChange}
                                        value={po.supplierRif ? { value: po.supplierId || po.supplierRif, label: po.supplierRif.startsWith(po.taxType) ? po.supplierRif : `${po.taxType}-${po.supplierRif}` } : null}
                                        placeholder="Escriba o seleccione un RIF..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nombre o Razón Social</Label>
                                    <SearchableSelect
                                        isCreatable
                                        options={supplierNameOptions}
                                        onSelection={handleSupplierSelection}
                                        inputValue={supplierNameInput}
                                        onInputChange={handleSupplierNameInputChange}
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
                            <h3 className="text-lg font-semibold">Ítems de la Compra</h3>
                            <div className="space-y-2">
                                <Label>Buscar Producto para Agregar</Label>
                                <SearchableSelect
                                    options={productOptions}
                                    onSelection={handleProductSelection}
                                    inputValue={productSearchInput}
                                    onInputChange={setProductSearchInput}
                                    value={null} // Always clear after selection
                                    placeholder={loading ? "Cargando productos..." : "Buscar y añadir producto..."}
                                    isDisabled={loading}
                                />
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Costo Unit.</TableHead><TableHead>Nro. Lote</TableHead><TableHead>Vencimiento</TableHead><TableHead>Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {po.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.productName}</TableCell>
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
                           {/* Other fields remain the same */}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewPurchaseDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePoSubmit} disabled={poLoading}>{poLoading ? 'Creando...' : 'Crear Orden de Compra'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Other Dialog remains the same */}
      </div>

      {/* Other content remains the same */}
    </div>
  );
}
