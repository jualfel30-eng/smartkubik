import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Combobox } from '@/components/ui/combobox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Plus, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { venezuelaData } from '@/lib/venezuela-data.js';

const initialOrderState = {
  customerId: '',
  customerName: '',
  customerRif: '',
  taxType: 'V',
  items: [],
  paymentMethod: '',
  notes: '',
  shippingAddress: {
    state: 'Carabobo',
    city: 'Valencia',
    street: '',
  },
};

export function NewOrderFormV2({ onOrderCreated }) {
  const { crmData: customers, paymentMethods, loading: contextLoading } = useCrmContext();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [newOrder, setNewOrder] = useState(initialOrderState);

  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    const selectedState = venezuelaData.find(v => v.estado === newOrder.shippingAddress.state);
    setMunicipios(selectedState ? selectedState.municipios : []);
    if (selectedState && !selectedState.municipios.some(m => m.municipio === newOrder.shippingAddress.city)) {
      handleAddressChange('city', selectedState.municipios[0]?.municipio || '');
    }
  }, [newOrder.shippingAddress.state]);

  // UI State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);

  // Fetch products for the combobox
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetchApi('/products');
        setProducts(response.data || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Set default payment method once loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && !newOrder.paymentMethod) {
      setNewOrder(prev => ({ ...prev, paymentMethod: paymentMethods[0].id }));
    }
  }, [paymentMethods, newOrder.paymentMethod]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setNewOrder(prev => ({
        ...prev,
        customerId: customer._id,
        customerName: customer.name,
        customerRif: customer.taxInfo?.taxId || '',
        taxType: customer.taxInfo?.taxType || 'V',
      }));
    }
  };

  const handleFieldChange = (field, value) => {
    setNewOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setNewOrder(prev => ({ 
        ...prev, 
        shippingAddress: { ...prev.shippingAddress, [field]: value } 
    }));
  };

  const addProductToOrder = () => {
    if (!selectedProduct || productQuantity <= 0) return;
    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    const variant = product.variants?.[0];
    if (!variant) {
        alert(`El producto seleccionado (${product.name}) no tiene variantes configuradas y no se puede añadir.`);
        return;
    }

    const existingItem = newOrder.items.find(item => item.productId === product._id);

    if (existingItem) {
      const updatedItems = newOrder.items.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + productQuantity } 
          : item
      );
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      const newItem = {
        productId: product._id,
        name: product.name,
        sku: variant.sku,
        quantity: productQuantity,
        unitPrice: variant.basePrice || 0,
        ivaApplicable: product.ivaApplicable,
        igtfExempt: product.igtfExempt,
      };
      setNewOrder({ ...newOrder, items: [...newOrder.items, newItem] });
    }

    setSelectedProduct('');
    setProductQuantity(1);
  };

  const removeProductFromOrder = (productId) => {
    setNewOrder(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) }));
  };

  const handleCreateOrder = async () => {
    if (newOrder.items.length === 0) {
      alert('Agrega al menos un producto a la orden.');
      return;
    }
    if (!newOrder.customerName || !newOrder.customerRif) {
      alert('Debes proporcionar el nombre y RIF del cliente.');
      return;
    }
    if (!newOrder.paymentMethod) {
        alert('Debes seleccionar un método de pago.');
        return;
    }

    const payload = {
      customerId: newOrder.customerId || undefined,
      customerName: newOrder.customerName,
      customerRif: newOrder.customerRif,
      taxType: newOrder.taxType,
      items: newOrder.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      paymentMethod: newOrder.paymentMethod,
      notes: newOrder.notes,
      shippingAddress: newOrder.shippingAddress.street ? newOrder.shippingAddress : undefined,
    };

    try {
      await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
      alert('¡Orden creada con éxito!');
      setNewOrder(initialOrderState);
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(`Error al crear la orden: ${error.message}`);
    }
  };

  const customerOptions = useMemo(() => 
    customers.map(c => ({ value: c._id, label: `${c.name} - ${c.taxInfo?.taxId || 'Sin RIF'}` })), 
  [customers]);

  const productOptions = useMemo(() => 
    products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` })), 
  [products]);

  const totals = useMemo(() => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const iva = newOrder.items.reduce((sum, item) => 
        item.ivaApplicable ? sum + (item.unitPrice * item.quantity * 0.16) : sum, 0);
    
    const selectedPayMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
    const appliesIgtf = selectedPayMethod?.igtfApplicable || false;

    const igtf = appliesIgtf 
      ? newOrder.items.reduce((sum, item) => 
          !item.igtfExempt ? sum + (item.unitPrice * item.quantity * 0.03) : sum, 0)
      : 0;

    const total = subtotal + iva + igtf;
    return { subtotal, iva, igtf, total };
  }, [newOrder.items, newOrder.paymentMethod, paymentMethods]);

  const isCreateDisabled = newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerRif || !newOrder.paymentMethod;

  return (
    <Card className="mb-8">
      <CardHeader><CardTitle>Crear Nueva Orden (V2)</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg space-y-4">
          <Label className="text-base font-semibold">Datos del Cliente</Label>
          <Combobox 
            options={customerOptions} 
            value={newOrder.customerId} 
            onChange={handleCustomerSelect} 
            placeholder="Buscar cliente existente..."
            searchPlaceholder="Buscar por nombre o RIF..."
            emptyPlaceholder={contextLoading ? "Cargando clientes..." : "No se encontraron clientes."}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre o Razón Social</Label>
              <Input id="customerName" value={newOrder.customerName} onChange={(e) => handleFieldChange('customerName', e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="taxType">Tipo</Label>
                <Select value={newOrder.taxType} onValueChange={(value) => handleFieldChange('taxType', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="customerRif">RIF / C.I.</Label>
                <Input id="customerRif" value={newOrder.customerRif} onChange={(e) => handleFieldChange('customerRif', e.target.value)} placeholder="123456789" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-4">
          <Label className="text-base font-semibold">Dirección de Envío</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={newOrder.shippingAddress.state} onValueChange={(v) => handleAddressChange('state', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {venezuelaData.map(e => <SelectItem key={e.estado} value={e.estado}>{e.estado}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Municipio</Label>
              <Select value={newOrder.shippingAddress.city} onValueChange={(v) => handleAddressChange('city', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {municipios.map(m => <SelectItem key={m.municipio} value={m.municipio}>{m.municipio}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Dirección o Calle</Label>
              <Textarea value={newOrder.shippingAddress.street} onChange={(e) => handleAddressChange('street', e.target.value)} placeholder="Ej: Av. Bolívar, Edificio ABC, Piso 1, Apto 1A" />
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Productos</Label>
            <div className="flex space-x-2">
                <div className="flex-grow min-w-0"><Combobox options={productOptions} value={selectedProduct} onChange={setSelectedProduct} placeholder="Selecciona un producto" searchPlaceholder="Buscar por SKU o nombre..." emptyPlaceholder={loadingProducts ? "Cargando productos..." : "No hay productos."} /></div>
                <Input type="number" min="1" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-24" placeholder="Cant." />
                <Button onClick={addProductToOrder} disabled={!selectedProduct}><Plus className="h-4 w-4 mr-2" /> Añadir</Button>
            </div>
            <div className="border rounded-lg mt-4"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio Unit.</TableHead><TableHead>Total</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{newOrder.items.length > 0 ? newOrder.items.map(item => (<TableRow key={item.productId}><TableCell>{item.name}<div className="text-sm text-muted-foreground">{item.sku}</div></TableCell><TableCell>{item.quantity}</TableCell><TableCell>${(item.unitPrice || 0).toFixed(2)}</TableCell><TableCell>${((item.unitPrice || 0) * item.quantity).toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan="5" className="text-center">No hay productos en la orden</TableCell></TableRow>}</TableBody></Table></div>
        </div>

        <div className="p-4 border rounded-lg space-y-4">
          <Label className="text-base font-semibold">Dirección de Envío</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={newOrder.shippingAddress.state} onValueChange={(v) => handleAddressChange('state', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {venezuelaData.map(e => <SelectItem key={e.estado} value={e.estado}>{e.estado}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Municipio</Label>
              <Select value={newOrder.shippingAddress.city} onValueChange={(v) => handleAddressChange('city', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {municipios.map(m => <SelectItem key={m.municipio} value={m.municipio}>{m.municipio}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Dirección o Calle</Label>
              <Textarea value={newOrder.shippingAddress.street} onChange={(e) => handleAddressChange('street', e.target.value)} placeholder="Ej: Av. Bolívar, Edificio ABC, Piso 1, Apto 1A" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea id="notes" value={newOrder.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} placeholder="Instrucciones especiales, detalles de entrega, etc." />
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>${totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>IVA (16%):</span><span>${totals.iva.toFixed(2)}</span></div>
              {totals.igtf > 0 && <div className="flex justify-between text-orange-600"><span>IGTF (3%):</span><span>${totals.igtf.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total:</span><span>${totals.total.toFixed(2)}</span></div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="w-1/3">
            <Select value={newOrder.paymentMethod} onValueChange={(value) => handleFieldChange('paymentMethod', value)} disabled={contextLoading}>
                <SelectTrigger><SelectValue placeholder="Forma de Pago" /></SelectTrigger>
                <SelectContent>{paymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}</SelectContent>
            </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewOrder(initialOrderState)}>Limpiar Formulario</Button>
          <Button onClick={handleCreateOrder} disabled={isCreateDisabled}>Crear Orden</Button>
        </div>
      </CardFooter>
    </Card>
  );
}