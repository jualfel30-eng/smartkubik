import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Combobox } from '@/components/ui/combobox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Plus, Trash2 } from 'lucide-react';
import { useCRM } from '@/hooks/use-crm.js';
import { venezuelaData } from '@/lib/venezuela-data.js';
import { fetchApi } from '@/lib/api.js';
import { useFormState } from '@/context/FormStateContext.jsx';

export function NewOrderForm({ onOrderCreate }) {
  const { crmData, loading: loadingCRM } = useCRM();
  const { formState, updateFormState } = useFormState();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  const initialOrderState = {
    customerId: '',
    customerName: '',
    customerRif: '',
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

  const [newOrder, setNewOrder] = useState({ ...initialOrderState, ...(formState.newOrderForm || {}) });

  useEffect(() => {
    updateFormState('newOrderForm', newOrder);
  }, [newOrder, updateFormState]);

  const [municipios, setMunicipios] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetchApi('/products');
        if (response.success) {
          setProducts(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch products');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();

    const loadPaymentMethods = async () => {
      try {
        setLoadingPaymentMethods(true);
        const response = await fetchApi('/payments/methods');
        if (response.success) {
          const availableMethods = response.data.methods.filter(m => m.available) || [];
          setPaymentMethods(availableMethods);
          if (availableMethods.length > 0 && !newOrder.paymentMethod) {
            setNewOrder(prev => ({ ...prev, paymentMethod: availableMethods[0].id }));
          }
        } else {
          throw new Error(response.message || 'Failed to fetch payment methods');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    const selectedState = venezuelaData.find(v => v.estado === newOrder.shippingAddress.estado);
    if (selectedState) {
      setMunicipios(selectedState.municipios);
    }
  }, [newOrder.shippingAddress.estado]);

  const handleCustomerSelect = (customerId) => {
    const customer = crmData.find(c => c._id === customerId);
    if (customer) {
      setNewOrder({
        ...newOrder,
        customerId: customer._id,
        customerName: customer.name,
        customerRif: customer.taxId,
        shippingAddress: {
          ...newOrder.shippingAddress,
          direccion: customer.address?.street || newOrder.shippingAddress.direccion,
          estado: customer.address?.state || newOrder.shippingAddress.estado,
          municipio: customer.address?.municipality || newOrder.shippingAddress.municipio,
          ciudad: customer.address?.city || newOrder.shippingAddress.ciudad,
        }
      });
    }
  };

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const searchTerm = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.subcategory.toLowerCase().includes(searchTerm)
    );
  });

  const productOptions = filteredProducts.map(p => ({
    value: p._id,
    label: `${p.name} - ${p.sku} (${p.variants[0]?.stock || 0} disp.)`
  }));

  const filteredCustomers = crmData.filter(c => {
      if (!customerSearch) return true;
      const searchTerm = customerSearch.toLowerCase();
      return (
          c.name.toLowerCase().includes(searchTerm) ||
          (c.taxId && c.taxId.toLowerCase().includes(searchTerm))
      );
  });

  const customerOptions = filteredCustomers.map(c => ({
      value: c._id,
      label: `${c.name} - ${c.taxId}`
  }));


  const addProductToOrder = () => {
    if (!selectedProduct || productQuantity <= 0) return;
    const product = products.find(p => p._id === selectedProduct);
    if (!product || !product.variants || product.variants.length === 0) return;

    const variant = product.variants[0];
    
    const existingItemIndex = newOrder.items.findIndex(item => item.productId === product._id);

    if (existingItemIndex >= 0) {
      const updatedItems = [...newOrder.items];
      updatedItems[existingItemIndex].quantity += productQuantity;
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * (variant.basePrice || 0);
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      const newItem = {
        productId: product._id,
        sku: variant.sku,
        name: product.name,
        quantity: productQuantity,
        unitPrice: variant.basePrice || 0,
        total: productQuantity * (variant.basePrice || 0),
        ivaApplicable: product.ivaApplicable,
        igtfExempt: product.igtfExempt,
      };
      setNewOrder({ ...newOrder, items: [...newOrder.items, newItem] });
    }
    setSelectedProduct('');
    setProductQuantity(1);
    setProductSearch('');
  };

  const removeProductFromOrder = (productId) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter(item => item.productId !== productId)
    });
  };

  const handleCreateOrder = () => {
    if (!newOrder.customerId || newOrder.items.length === 0) {
      alert('Selecciona un cliente y agrega al menos un producto');
      return;
    }
    onOrderCreate(newOrder);
    setNewOrder({
        ...initialOrderState,
        paymentMethod: paymentMethods.length > 0 ? paymentMethods[0].id : ''
    });
  };

  // Recalculate totals considering tax flags
  const subtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const iva = newOrder.items.reduce((sum, item) => {
    return item.ivaApplicable ? sum + (item.total || 0) * 0.16 : sum;
  }, 0);
  
  const selectedPaymentMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
  const igtf = selectedPaymentMethod?.igtfApplicable 
    ? newOrder.items.reduce((sum, item) => {
        return !item.igtfExempt ? sum + (item.total || 0) * 0.03 : sum;
      }, 0)
    : 0;

  const total = subtotal + iva + igtf;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Nueva Orden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Section 1: Customer */}
        <div className="space-y-2">
          <Label>Buscar Cliente (Nombre o RIF)</Label>
          <Combobox
              options={customerOptions}
              value={newOrder.customerId}
              onChange={handleCustomerSelect}
              onInputChange={setCustomerSearch}
              placeholder="Selecciona un cliente"
              searchPlaceholder="Buscar por nombre o RIF..."
              emptyPlaceholder="No se encontraron clientes."
          />
        </div>

        {/* Section 2: Address */}
        <div className="space-y-2">
          <Label htmlFor="direccion">Dirección de Envío</Label>
          <Textarea
            id="direccion"
            value={newOrder.shippingAddress.direccion}
            onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: { ...newOrder.shippingAddress, direccion: e.target.value } })}
            placeholder="Calle, Av, Casa/Apto"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={newOrder.shippingAddress.estado}
                onValueChange={(value) => setNewOrder({ ...newOrder, shippingAddress: { ...newOrder.shippingAddress, estado: value, municipio: '' } })}
              >
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  {venezuelaData.map(item => <SelectItem key={item.estado} value={item.estado}>{item.estado}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio">Municipio</Label>
              <Select
                value={newOrder.shippingAddress.municipio}
                onValueChange={(value) => setNewOrder({ ...newOrder, shippingAddress: { ...newOrder.shippingAddress, municipio: value } })}
                disabled={!newOrder.shippingAddress.estado}
              >
                <SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger>
                <SelectContent>
                  {municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={newOrder.shippingAddress.ciudad}
                onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: { ...newOrder.shippingAddress, ciudad: e.target.value } })}
                placeholder="Ciudad"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Product Search */}
        <div className="space-y-2">
          <Label>Buscar Producto</Label>
          <div className="flex space-x-2">
            <div className="flex-grow min-w-0">
                <Combobox
                  options={productOptions}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  onInputChange={setProductSearch}
                  placeholder="Selecciona un producto"
                  searchPlaceholder="Buscar por SKU, nombre, categoría..."
                  emptyPlaceholder="No se encontraron productos."
                />
            </div>
            <Input
              type="number"
              min="1"
              value={productQuantity}
              onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
              className="w-24"
              placeholder="Cant."
            />
            <Button onClick={addProductToOrder} disabled={!selectedProduct}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Section 4: Items Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="w-[100px]">Cantidad</TableHead>
                <TableHead className="w-[120px]">Precio Unit.</TableHead>
                <TableHead className="w-[120px]">Subtotal</TableHead>
                <TableHead className="w-[100px]">IVA (16%)</TableHead>
                <TableHead className="w-[100px]">IGTF (3%)</TableHead>
                <TableHead className="w-[50px]">Acc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newOrder.items.length > 0 ? (
                newOrder.items.map((item) => {
                  const itemIva = item.ivaApplicable ? (item.total || 0) * 0.16 : 0;
                  const selectedPaymentMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
                  const itemIgtf = !item.igtfExempt && selectedPaymentMethod?.igtfApplicable ? (item.total || 0) * 0.03 : 0;
                  return (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${(item.unitPrice || 0).toFixed(2)}</TableCell>
                      <TableCell>${(item.total || 0).toFixed(2)}</TableCell>
                      <TableCell>${itemIva.toFixed(2)}</TableCell>
                      <TableCell>${itemIgtf.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan="7" className="text-center text-muted-foreground">
                    No hay productos en la orden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Section 5: Footer */}
        <div className="space-y-4 pt-4">
          {/* Payment Summary (Right-aligned) */}
          {newOrder.items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
                <Label>Resumen de Pago</Label>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA (16%):</span> <span>${iva.toFixed(2)}</span></div>
                  {igtf > 0 && <div className="flex justify-between"><span>IGTF (3%):</span> <span>${igtf.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span> <span>${total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Notes, Payment Method, and Create Button */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-4">
            <div className="flex-grow space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Input
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="Información adicional..."
                />
            </div>
            <div className="flex items-end space-x-4">
                <div className="space-y-2 w-48">
                    <Label htmlFor="paymentMethod">Forma de Pago</Label>
                    <Select 
                        value={newOrder.paymentMethod} 
                        onValueChange={(value) => setNewOrder({ ...newOrder, paymentMethod: value })}
                        disabled={loadingPaymentMethods}
                    >
                        <SelectTrigger><SelectValue placeholder={loadingPaymentMethods ? "Cargando..." : "Selecciona un método"} /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleCreateOrder} disabled={!newOrder.customerId || newOrder.items.length === 0} className="h-10">
                    Crear Orden
                </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}