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
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [poLoading, setPoLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [lowStockRes, expiringRes, suppliersRes, productsRes] = await Promise.all([
      fetchApi('/inventory/alerts/low-stock'),
      fetchApi('/inventory/alerts/near-expiration?days=30'),
      fetchApi('/customers?customerType=supplier'),
      fetchApi('/products')
    ]);

    if (lowStockRes.error) {
      setError(lowStockRes.error);
    } else {
      setLowStockProducts(lowStockRes.data.data || []);
    }

    if (expiringRes.error) {
      setError(expiringRes.error);
    } else {
      setExpiringProducts(expiringRes.data.data || []);
    }

    if (suppliersRes.error) {
      setError(suppliersRes.error);
    } else {
      setSuppliers(suppliersRes.data.data || []);
    }

    if (productsRes.error) {
      setError(productsRes.error);
    } else {
      setProducts(productsRes.data.data || []);
    }

    setLoading(false);
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
    const payload = {
      product: {
        sku: newProduct.sku,
        name: newProduct.name,
        category: newProduct.category,
        subcategory: newProduct.subcategory,
        brand: newProduct.brand,
        description: newProduct.description,
        ingredients: newProduct.ingredients,
        isPerishable: newProduct.isPerishable,
        shelfLifeDays: newProduct.shelfLifeDays,
        storageTemperature: newProduct.storageTemperature,
        ivaApplicable: newProduct.ivaApplicable,
        taxCategory: newProduct.taxCategory,
        isSoldByWeight: newProduct.isSoldByWeight,
        unitOfMeasure: newProduct.unitOfMeasure,
        pricingRules: { cashDiscount: 0, cardSurcharge: 0, minimumMargin: 0.2, maximumDiscount: 0.5 },
        inventoryConfig: { trackLots: true, trackExpiration: newProduct.isPerishable, minimumStock: 10, maximumStock: 100, reorderPoint: 20, reorderQuantity: 50, fefoEnabled: newProduct.isPerishable },
        variants: [{
          ...newProduct.variant,
          costPrice: newProduct.inventory.costPrice,
          sku: `${newProduct.sku}-VAR1`,
          barcode: `${newProduct.sku}-VAR1`,
        }],
      },
      supplier: {
        supplierId: newProduct.supplier.supplierId,
        newSupplierName: newProduct.supplier.newSupplierName,
        newSupplierRif: `${newProduct.supplier.rifPrefix}-${newProduct.supplier.newSupplierRif}`,
        newSupplierContactName: newProduct.supplier.newSupplierContactName,
        newSupplierContactPhone: newProduct.supplier.newSupplierContactPhone,
      },
      inventory: {
        ...newProduct.inventory
      },
      purchaseDate: new Date().toISOString(),
      notes: 'Creación de producto con compra inicial.'
    };

    if (!payload.product.isPerishable) {
      payload.inventory.expirationDate = undefined;
      payload.inventory.lotNumber = undefined;
    }

    const { data, error } = await fetchApi('/products/with-initial-purchase', { method: 'POST', body: JSON.stringify(payload) });

    if (error) {
      toast.error(`Error: ${error}`);
      return;
    }

    if (data) {
      toast.success('Producto y compra inicial creados con éxito');
      setIsNewProductDialogOpen(false);
      setNewProduct(initialNewProductState);
      fetchData();
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
      setPo(prev => ({ ...prev, supplierId: '', supplierName: '', supplierRif: '', taxType: 'J', contactName: '', contactPhone: '', contactEmail: '' }));
      return;
    }
    if (selectedOption.__isNew__) {
      setPo(prev => ({ ...prev, supplierId: '', supplierName: selectedOption.label }));
    } else {
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
    }
  };

  const handleRifSelection = (selectedOption) => {
    if (!selectedOption) {
      setPo(prev => ({ ...prev, supplierId: '', supplierName: '', supplierRif: '', taxType: 'J' }));
      return;
    }
    if (selectedOption.__isNew__) {
      const [type, ...rifParts] = selectedOption.label.split('-');
      setPo(prev => ({ ...prev, supplierId: '', supplierName: '', taxType: type, supplierRif: rifParts.join('-') }));
    } else {
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
    }
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

  const supplierRifOptions = useMemo(() =>
    suppliers
      .filter(s => s.taxInfo?.taxId)
      .map(s => ({
        value: s._id,
        label: s.taxInfo.taxId,
        customer: s,
      })),[suppliers]);

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

  const handleProductSelection = (selectedOption) => {
    if (!selectedOption) return;
    const product = selectedOption.product;
    if (!product) return;
    const variant = product.variants?.[0];
    if (!variant) return;

    const existingItem = po.items.find(item => item.productId === product._id);
    if (existingItem) {
      const updatedItems = po.items.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
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
    if (!po.supplierName || !po.supplierRif || !po.contactName) {
      toast.error('Error de Validación', { description: 'Debe completar Nombre de la Empresa, RIF y Nombre del Contacto.' });
      return;
    }

    if (!po.supplierId) {
      const fullRif = `${po.taxType}-${po.supplierRif}`;
      const rifRegex = /^[JVEGPN]-?[0-9]{8,9}$/;
      if (!rifRegex.test(fullRif)) {
        toast.error('Error de Validación', { description: 'El RIF del nuevo proveedor no es válido.' });
        return;
      }
    }

    if (po.items.length === 0) {
        toast.error('Error de Validación', { description: 'Debe agregar al menos un producto a la orden.' });
        return;
    }

    setPoLoading(true);
    const dto = {
      purchaseDate: format(po.purchaseDate, 'yyyy-MM-dd'),
      items: po.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: Number(item.quantity),
        costPrice: Number(item.costPrice),
        lotNumber: item.lotNumber || undefined,
        expirationDate: item.expirationDate || undefined,
      })),
      notes: po.notes,
    };

    if (po.supplierId) {
      dto.supplierId = po.supplierId;
    } else {
      dto.newSupplierName = po.supplierName;
      dto.newSupplierRif = `${po.taxType}-${po.supplierRif}`;
      dto.newSupplierContactName = po.contactName;
      dto.newSupplierContactPhone = po.contactPhone;
      dto.newSupplierContactEmail = po.contactEmail;
    }

    const { data, error } = await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(dto) });
    setPoLoading(false);

    if (error) {
      toast.error('Error al crear la Orden de Compra', { description: error });
      return;
    }

    if (data) {
      toast.success('Orden de Compra creada exitosamente');
      setIsNewPurchaseDialogOpen(false);
      setPo(initialPoState);
      fetchData();
    }
  };
  
  const handleCreatePoFromAlert = (product) => {
    const newItem = {
      productId: product.productId._id,
      productName: product.productName,
      productSku: product.productSku,
      quantity: 1,
      costPrice: product.lastCostPrice || 0,
      isPerishable: product.productId.isPerishable,
      lotNumber: '',
      expirationDate: '',
    };
    setPo({ ...initialPoState, items: [newItem] });
    setIsNewPurchaseDialogOpen(true);
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-start items-center space-x-4">
            <Dialog open={isNewPurchaseDialogOpen} onOpenChange={(isOpen) => { setIsNewPurchaseDialogOpen(isOpen); if (!isOpen) setPo(initialPoState); }}>
                <DialogTrigger asChild>
                    <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><PlusCircle className="mr-2 h-5 w-5" /> Añadir Inventario</Button>
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

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewPurchaseDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePoSubmit} disabled={poLoading}>{poLoading ? 'Creando...' : 'Crear Orden de Compra'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
                <DialogTrigger asChild>
                <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><PlusCircle className="mr-2 h-5 w-5" /> Compra de Producto Nuevo</Button>
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
                        <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej: Arroz Blanco" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="brand">Marca</Label>
                        <Input id="brand" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} placeholder="Ej: Diana" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="sku">SKU Principal</Label>
                        <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} placeholder="EJ: ARR-BLANCO" />
                        </div>
                    </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t">
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Ej: Bebidas" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subcategory">Sub-categoría</Label>
                        <Input id="subcategory" value={newProduct.subcategory} onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })} placeholder="Ej: Gaseosas" />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descripción detallada del producto" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="ingredients">Ingredientes</Label>
                        <Textarea id="ingredients" value={newProduct.ingredients} onChange={(e) => setNewProduct({...newProduct, ingredients: e.target.value})} placeholder="Lista de ingredientes" />
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="isPerishable" checked={newProduct.isPerishable} onCheckedChange={(checked) => setNewProduct({...newProduct, isPerishable: checked})} />
                        <Label htmlFor="isPerishable">Es Perecedero</Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="ivaApplicable" checked={!newProduct.ivaApplicable} onCheckedChange={(checked) => setNewProduct({...newProduct, ivaApplicable: !checked})} />
                        <Label htmlFor="ivaApplicable">Exento de IVA</Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="isSoldByWeight" checked={newProduct.isSoldByWeight} onCheckedChange={(checked) => setNewProduct({...newProduct, isSoldByWeight: checked})} />
                        <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unitOfMeasure">Unidad de Medida</Label>
                        <Select value={newProduct.unitOfMeasure} onValueChange={(value) => setNewProduct({...newProduct, unitOfMeasure: value})}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unidad">Unidad</SelectItem>
                            <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                            <SelectItem value="g">Gramo (g)</SelectItem>
                            <SelectItem value="lb">Libra (lb)</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    {newProduct.isPerishable && (
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
                        <Input id="variantName" value={newProduct.variant.name} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, name: e.target.value}})} placeholder="Ej: 1kg" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantUnit">Unidad</Label>
                        <Input id="variantUnit" value={newProduct.variant.unit} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, unit: e.target.value}})} placeholder="Ej: kg, unidad" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantUnitSize">Tamaño Unidad</Label>
                        <Input id="variantUnitSize" type="number" value={newProduct.variant.unitSize} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, unitSize: parseFloat(e.target.value) || 0}})} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="variantBasePrice">Precio de Venta ($)</Label>
                        <Input id="variantBasePrice" type="number" value={newProduct.variant.basePrice} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: parseFloat(e.target.value) || 0}})} />
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
                        <Input id="invCostPrice" type="number" value={newProduct.inventory.costPrice} onChange={(e) => setNewProduct({...newProduct, inventory: {...newProduct.inventory, costPrice: parseFloat(e.target.value) || 0}})} />
                        </div>
                        {newProduct.isPerishable && (
                        <>
                            <div className="space-y-2">
                            <Label htmlFor="invLotNumber">Número de Lote</Label>
                            <Input id="invLotNumber" value={newProduct.inventory.lotNumber} onChange={(e) => setNewProduct({...newProduct, inventory: {...newProduct.inventory, lotNumber: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="invExpirationDate">Fecha de Vencimiento</Label>
                            <Input id="invExpirationDate" type="date" value={newProduct.inventory.expirationDate} onChange={(e) => setNewProduct({...newProduct, inventory: {...newProduct.inventory, expirationDate: e.target.value}})} />
                            </div>
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