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
import { venezuelaData } from '@/lib/venezuela-data.js';
import { fetchApi } from '@/lib/api.js';
import { useFormState } from '@/context/FormStateContext.jsx';
import { useCrmContext } from '@/context/CrmContext.jsx';

export function NewOrderForm({ onOrderCreated }) {
  const { crmData, paymentMethods, loading: contextLoading } = useCrmContext();
  const { formState, updateFormState } = useFormState();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const initialOrderState = {
    customerId: '',
    customerName: '',
    customerRif: '',
    taxType: 'V',
    items: [],
    paymentMethod: '',
    notes: '',
    shippingAddress: {
      estado: 'Carabobo',
      municipio: 'Valencia',
      ciudad: 'Valencia',
      direccion: ''
    }
  };

  const [newOrder, setNewOrder] = useState({ ...initialOrderState });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const data = await fetchApi('/products');
        setProducts(data || []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (paymentMethods.length > 0 && !newOrder.paymentMethod) {
      setNewOrder(prev => ({ ...prev, paymentMethod: paymentMethods[0].id }));
    }
  }, [paymentMethods]);

  const [municipios, setMunicipios] = useState([]);
  useEffect(() => {
    const selectedState = venezuelaData.find(v => v.estado === newOrder.shippingAddress.estado);
    if (selectedState) setMunicipios(selectedState.municipios);
  }, [newOrder.shippingAddress.estado]);

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');

  const handleCustomerSelect = (customerId) => {
    const customer = crmData.find(c => c._id === customerId);
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

  const handleManualCustomerChange = (field, value) => {
    setNewOrder(prev => ({ ...prev, [field]: value }));
  };

  const productOptions = useMemo(() => 
    products
      .filter(p => p.variants && p.variants.length > 0)
      .map(p => ({
        value: p._id,
        label: `${p.name} - ${p.variants[0]?.sku || p.sku}`
      })), 
  [products]);

  const customerOptions = useMemo(() => 
    crmData.map(c => ({
        value: c._id,
        label: `${c.name} - ${c.taxInfo?.taxId || 'Sin RIF'}`
    })), 
  [crmData]);

  const addProductToOrder = () => {
    if (!selectedProduct || productQuantity <= 0) return;
    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    const variant = product.variants[0];
    const existingItemIndex = newOrder.items.findIndex(item => item.productId === product._id);

    if (existingItemIndex >= 0) {
      const updatedItems = [...newOrder.items];
      updatedItems[existingItemIndex].quantity += productQuantity;
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * (variant.basePrice || 0);
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      const newItem = { productId: product._id, sku: variant.sku, name: product.name, quantity: productQuantity, unitPrice: variant.basePrice || 0, total: productQuantity * (variant.basePrice || 0), ivaApplicable: product.ivaApplicable, igtfExempt: product.igtfExempt };
      setNewOrder({ ...newOrder, items: [...newOrder.items, newItem] });
    }
    setSelectedProduct('');
    setProductQuantity(1);
    setProductSearch('');
  };

  const removeProductFromOrder = (productId) => {
    setNewOrder({ ...newOrder, items: newOrder.items.filter(item => item.productId !== productId) });
  };

  const handleCreateOrder = async () => {
    if (newOrder.items.length === 0) { alert('Agrega al menos un producto.'); return; }
    if (!newOrder.customerName || !newOrder.customerRif) { alert('Debes proporcionar nombre y RIF del cliente.'); return; }

    const payload = { ...newOrder, customerId: newOrder.customerId || undefined };

    try {
      await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
      alert('¡Orden creada con éxito!');
      onOrderCreated();
      setNewOrder({ ...initialOrderState });
    } catch (error) {
      console.error('Error creating order:', error);
      alert(`Error al crear la orden: ${error.message}`);
    }
  };

  const { subtotal, iva, igtf, total } = useMemo(() => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const iva = newOrder.items.reduce((sum, item) => item.ivaApplicable ? sum + (item.total || 0) * 0.16 : sum, 0);
    const selectedPaymentMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
    const igtf = selectedPaymentMethod?.igtfApplicable ? newOrder.items.reduce((sum, item) => !item.igtfExempt ? sum + (item.total || 0) * 0.03 : sum, 0) : 0;
    const total = subtotal + iva + igtf;
    return { subtotal, iva, igtf, total };
  }, [newOrder.items, newOrder.paymentMethod, paymentMethods]);

  const isCreateDisabled = newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerRif;

  return (
    <Card className="mb-8">
      <CardHeader><CardTitle>Crear Nueva Orden</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 p-4 border rounded-lg">
          <Label>Datos del Cliente</Label>
          <div className="space-y-2">
            <Label className="text-sm font-normal">Buscar Cliente Existente</Label>
            <Combobox options={customerOptions} value={newOrder.customerId} onChange={handleCustomerSelect} onInputChange={setCustomerSearch} placeholder="Selecciona un cliente" searchPlaceholder="Buscar por nombre o RIF..." emptyPlaceholder="No se encontraron clientes." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre o Razón Social</Label>
              <Input id="customerName" value={newOrder.customerName} onChange={(e) => handleManualCustomerChange('customerName', e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="taxType">Tipo</Label>
                <Select value={newOrder.taxType} onValueChange={(value) => handleManualCustomerChange('taxType', value)}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="customerRif">RIF / C.I.</Label>
                <Input id="customerRif" value={newOrder.customerRif} onChange={(e) => handleManualCustomerChange('customerRif', e.target.value)} placeholder="123456789" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Buscar Producto</Label>
          <div className="flex space-x-2">
            <div className="flex-grow min-w-0"><Combobox options={productOptions} value={selectedProduct} onChange={setSelectedProduct} onInputChange={setProductSearch} placeholder="Selecciona un producto" searchPlaceholder="Buscar por SKU, nombre..." emptyPlaceholder="No se encontraron productos." /></div>
            <Input type="number" min="1" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-24" placeholder="Cant." />
            <Button onClick={addProductToOrder} disabled={!selectedProduct}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Total</TableHead><TableHead>Acc.</TableHead></TableRow></TableHeader><TableBody>{newOrder.items.length > 0 ? newOrder.items.map(item => (<TableRow key={item.productId}><TableCell>{item.name}<div className="text-sm text-muted-foreground">{item.sku}</div></TableCell><TableCell>{item.quantity}</TableCell><TableCell>${(item.unitPrice || 0).toFixed(2)}</TableCell><TableCell>${(item.total || 0).toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan="5" className="text-center">No hay productos</TableCell></TableRow>}</TableBody></Table></div>
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>IVA (16%):</span><span>${iva.toFixed(2)}</span></div>
              {igtf > 0 && <div className="flex justify-between"><span>IGTF (3%):</span><span>${igtf.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total:</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Select value={newOrder.paymentMethod} onValueChange={(value) => setNewOrder({ ...newOrder, paymentMethod: value })} disabled={contextLoading}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Forma de Pago" /></SelectTrigger><SelectContent>{paymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}</SelectContent></Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewOrder({...initialOrderState})}>Limpiar</Button>
          <Button onClick={handleCreateOrder} disabled={isCreateDisabled}>Crear Orden</Button>
        </div>
      </CardFooter>
    </Card>
  );
}