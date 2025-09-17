import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Search, X, ShoppingCart, Clock, CheckCircle, XCircle, DollarSign, Trash2, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { venezuelaData } from '@/lib/venezuela-data.js';

const statusMap = {
  draft: { label: 'Borrador', colorClassName: 'bg-gray-200 text-gray-800' },
  pending: { label: 'Pendiente', colorClassName: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmado', colorClassName: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Procesando', colorClassName: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Enviado', colorClassName: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Entregado', colorClassName: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', colorClassName: 'bg-red-100 text-red-800' },
  refunded: { label: 'Reembolsado', colorClassName: 'bg-pink-100 text-pink-800' },
};
const orderStatuses = Object.keys(statusMap);

const initialNewOrderState = {
  customerId: '',
  customerName: '',
  items: [],
  paymentMethod: '',
  notes: '',
  shippingAddress: {
    estado: 'Carabobo',
    municipio: 'Valencia',
    ciudad: 'Valencia',
    direccion: ''
  },
  taxInfo: {
    customerTaxType: 'V',
    customerTaxId: ''
  }
};

function NewOrderForm() {
  const [newOrder, setNewOrder] = useState(initialNewOrderState);
  const [products, setProducts] = useState([]);
  const { crmData: customers, loading: crmLoading, loadCustomers } = useCrmContext();

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetchApi('/products');
        setProducts(response.data || []);
      } catch (err) { console.error("Failed to load products", err); }
    };
    
    const loadPaymentMethods = async () => {
      try {
        setLoadingPaymentMethods(true);
        const response = await fetchApi('/payments/methods');
        if (response.success) {
          const availableMethods = response.data.methods.filter(m => m.available) || [];
          setPaymentMethods(availableMethods);
          if (availableMethods.length > 0) {
            setNewOrder(prev => ({ ...prev, paymentMethod: availableMethods[0].id }));
          }
        } else {
          throw new Error(response.message || 'Failed to fetch payment methods');
        }
      } catch (err) {
        console.error("Failed to load payment methods:", err);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadProducts();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    const selectedState = venezuelaData.find(v => v.estado === newOrder.shippingAddress.estado);
    setMunicipios(selectedState ? selectedState.municipios : []);
  }, [newOrder.shippingAddress.estado]);

  const handleCustomerNameChange = (e) => {
    const name = e.target.value;
    setNewOrder(prev => ({ ...prev, customerName: name, customerId: '' }));
    setCustomerSearch(name);
    setShowCustomerSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleCustomerSelect = (customer) => {
    setNewOrder(prev => ({
      ...prev,
      customerId: customer._id,
      customerName: customer.name,
      shippingAddress: {
        ...prev.shippingAddress,
        direccion: customer.addresses?.[0]?.street || prev.shippingAddress.direccion,
        estado: customer.addresses?.[0]?.state || prev.shippingAddress.estado,
        municipio: customer.addresses?.[0]?.municipality || prev.shippingAddress.municipio,
        ciudad: customer.addresses?.[0]?.city || prev.shippingAddress.ciudad,
      },
      taxInfo: {
        ...prev.taxInfo,
        customerTaxId: customer.taxInfo?.taxId || '',
        customerTaxType: customer.taxInfo?.taxType || 'V',
      }
    }));
    setCustomerSearch(customer.name);
    setShowCustomerSuggestions(false);
  };

  const handleCustomerKeyDown = (e) => {
    if (showCustomerSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prevIndex =>
          prevIndex < filteredCustomers.length - 1 ? prevIndex + 1 : prevIndex
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex > -1 && filteredCustomers[highlightedIndex]) {
          handleCustomerSelect(filteredCustomers[highlightedIndex]);
        }
      }
    }
  };

  const handleProductSelect = (product) => {
    const existingItem = newOrder.items.find(item => item.productId === product._id);
    if (existingItem) {
      return;
    }

    const variant = product.variants?.[0];
    const newItem = {
      productId: product._id,
      sku: variant.sku,
      name: product.name,
      quantity: 1,
      unitPrice: variant.basePrice || 0,
      total: variant.basePrice || 0,
      ivaApplicable: product.ivaApplicable,
      igtfExempt: product.igtfExempt,
    };
    setNewOrder(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  const handleProductKeyDown = (e) => {
    if (showProductSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedProductIndex(prevIndex =>
          prevIndex < filteredProducts.length - 1 ? prevIndex + 1 : prevIndex
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedProductIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedProductIndex > -1 && filteredProducts[highlightedProductIndex]) {
          handleProductSelect(filteredProducts[highlightedProductIndex]);
        }
      }
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    const updatedItems = newOrder.items.map(item => {
      if (item.productId === productId) {
        const newTotal = item.unitPrice * quantity;
        return { ...item, quantity, total: newTotal };
      }
      return item;
    });
    setNewOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const removeProductFromOrder = (productId) => {
    setNewOrder(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) }));
  };

  const handleAddressChange = (field, value) => {
    const newAddress = { ...newOrder.shippingAddress, [field]: value };
    if (field === 'estado') {
      newAddress.municipio = '';
    }
    setNewOrder(p => ({ ...p, shippingAddress: newAddress }));
  };

  const handleCreateOrder = async () => {
    if ((!newOrder.customerId && !newOrder.customerName) || newOrder.items.length === 0) {
      return alert('Selecciona o ingresa un cliente y agrega al menos un producto');
    }

    let customerId = newOrder.customerId;

    if (!customerId && newOrder.customerName) {
      const existingCustomerByTaxId = customers.find(
        c => c.taxInfo?.taxId === newOrder.taxInfo.customerTaxId && newOrder.taxInfo.customerTaxId
      );

      if (existingCustomerByTaxId) {
        customerId = existingCustomerByTaxId._id;
      } else {
        try {
          const newCustomerPayload = {
            name: newOrder.customerName,
            customerType: 'individual',
          };
          if (newOrder.taxInfo.customerTaxId) {
              newCustomerPayload.taxInfo = {
                  taxType: newOrder.taxInfo.customerTaxType,
                  taxId: newOrder.taxInfo.customerTaxId
              }
          }
          const response = await fetchApi('/customers', {
            method: 'POST',
            body: JSON.stringify(newCustomerPayload),
          });
          customerId = response.data._id;
          loadCustomers();
        } catch (err) {
          return alert(`Error al crear el nuevo cliente: ${err.message}`);
        }
      }
    }

    if (!customerId) {
        return alert('No se pudo obtener el ID del cliente.');
    }

    const { subtotal, iva, igtf, total } = totals;

    const payload = {
      ...newOrder,
      customerId,
      subtotal,
      ivaTotal: iva,
      igtfTotal: igtf,
      totalAmount: total,
      status: 'draft',
      items: newOrder.items.map(({ productId, quantity, unitPrice, total }) => ({ productId, quantity, unitPrice, total }))
    };

    try {
      await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
      setNewOrder({
        ...initialNewOrderState,
        paymentMethod: paymentMethods.length > 0 ? paymentMethods[0].id : ''
      });
      setCustomerSearch('');
    } catch (err) { alert(`Error al crear la orden: ${err.message}`); }
  };

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      customerSearch === '' ||
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.taxInfo?.taxId && `${c.taxInfo.taxType}-${c.taxInfo.taxId}`.toLowerCase().includes(customerSearch.toLowerCase()))
    ), [customers, customerSearch]);

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      productSearch === '' ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase()))
    ), [products, productSearch]);

  const totals = useMemo(() => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const iva = newOrder.items.reduce((sum, item) => item.ivaApplicable ? sum + (item.total || 0) * 0.16 : sum, 0);
    const selectedPaymentMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
    const igtf = selectedPaymentMethod?.igtfApplicable
      ? newOrder.items.reduce((sum, item) => !item.igtfExempt ? sum + (item.total || 0) * 0.03 : sum, 0)
      : 0;
    return { subtotal, iva, igtf, total: subtotal + iva + igtf };
  }, [newOrder.items, newOrder.paymentMethod, paymentMethods]);

  return (
    <Card className="mb-4">
      <CardHeader><CardTitle>Crear Nueva Orden</CardTitle></CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* Customer and Address */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label>Buscar o Crear Cliente</Label>
              <Input
                type="text"
                placeholder="Escribe un nombre para buscar o crear..."
                value={newOrder.customerName || customerSearch}
                onChange={handleCustomerNameChange}
                onFocus={() => setShowCustomerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                onKeyDown={handleCustomerKeyDown}
              />
              {showCustomerSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full bg-popover border rounded-md mt-1 max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer, index) => (
                    <div
                      key={customer._id}
                      className={`p-2 cursor-pointer ${
                        index === highlightedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
                      }`}
                      onMouseDown={() => handleCustomerSelect(customer)}
                    >
                      {customer.name} - {customer.taxInfo?.taxType}-{customer.taxInfo?.taxId}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
                <Label>Documento de Identificación</Label>
                <div className="flex items-center gap-2">
                    <div className="w-20">
                        <Select value={newOrder.taxInfo.customerTaxType} onValueChange={(v) => setNewOrder(p => ({ ...p, taxInfo: { ...p.taxInfo, customerTaxType: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="V">V</SelectItem>
                                <SelectItem value="E">E</SelectItem>
                                <SelectItem value="J">J</SelectItem>
                                <SelectItem value="G">G</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <Input id="taxId" value={newOrder.taxInfo.customerTaxId} onChange={(e) => setNewOrder(p => ({ ...p, taxInfo: { ...p.taxInfo, customerTaxId: e.target.value } }))} placeholder="Número"/>
                    </div>
                </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección de Envío</Label>
            <Textarea id="direccion" value={newOrder.shippingAddress.direccion} onChange={(e) => handleAddressChange('direccion', e.target.value)} placeholder="Calle, Av, Casa/Apto"/>
          </div>
          <div className="w-full md:w-1/2 pr-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select value={newOrder.shippingAddress.estado} onValueChange={(v) => handleAddressChange('estado', v)}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>{venezuelaData.map(i => <SelectItem key={i.estado} value={i.estado}>{i.estado}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipio">Municipio</Label>
                <Select value={newOrder.shippingAddress.municipio} onValueChange={(v) => handleAddressChange('municipio', v)} disabled={!newOrder.shippingAddress.estado}>
                  <SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger>
                  <SelectContent>{municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" value={newOrder.shippingAddress.ciudad} onChange={(e) => handleAddressChange('ciudad', e.target.value)} placeholder="Ciudad"/>
              </div>
            </div>
          </div>
        </div>
        {/* Product Search */}
        <div className="space-y-2 relative">
          <Label>Buscar Producto</Label>
          <Input
            type="text"
            placeholder="Escribe un nombre de producto para buscar..."
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setShowProductSuggestions(true);
              setHighlightedProductIndex(-1);
            }}
            onFocus={() => setShowProductSuggestions(true)}
            onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
            onKeyDown={handleProductKeyDown}
          />
          {showProductSuggestions && filteredProducts.length > 0 && (
            <div className="absolute z-10 w-full bg-popover border rounded-md mt-1 max-h-60 overflow-y-auto">
              {filteredProducts.map((product, index) => (
                <div
                  key={product._id}
                  className={`p-2 cursor-pointer ${
                    index === highlightedProductIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
                  }`}
                  onMouseDown={() => handleProductSelect(product)}
                >
                  {product.name} - {product.sku} (Stock: {product.variants?.[0]?.stock ?? 0})
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Items Table */}
        <div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-[100px]">Cantidad</TableHead><TableHead className="w-[120px]">Precio Unit.</TableHead><TableHead className="w-[120px]">Subtotal</TableHead><TableHead className="w-[100px]">IVA</TableHead><TableHead className="w-[100px]">IGTF</TableHead><TableHead className="w-[50px]">Acc.</TableHead></TableRow></TableHeader><TableBody>{newOrder.items.length > 0 ? newOrder.items.map(item => { const itemIva = item.ivaApplicable ? (item.total || 0) * 0.16 : 0; const selectedPaymentMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod); const itemIgtf = !item.igtfExempt && selectedPaymentMethod?.igtfApplicable ? (item.total || 0) * 0.03 : 0; return (<TableRow key={item.productId}><TableCell><div className="font-medium">{item.name}</div><div className="text-sm text-muted-foreground">{item.sku}</div></TableCell><TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)} className="w-20"/></TableCell><TableCell>${(item.unitPrice || 0).toFixed(2)}</TableCell><TableCell>${(item.total || 0).toFixed(2)}</TableCell><TableCell>${itemIva.toFixed(2)}</TableCell><TableCell>${itemIgtf.toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>);}) : <TableRow><TableCell colSpan="7" className="text-center text-muted-foreground">No hay productos en la orden.</TableCell></TableRow>}</TableBody></Table></div>
        {/* Footer */}
        <div className="space-y-4 pt-4">
          {newOrder.items.length > 0 && (<div className="flex justify-end"><div className="w-full md:w-1/2 lg:w-1/3 space-y-2"><Label>Resumen de Pago</Label><div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal:</span> <span>${totals.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>IVA (16%):</span> <span>${totals.iva.toFixed(2)}</span></div>{totals.igtf > 0 && <div className="flex justify-between"><span>IGTF (3%):</span> <span>${totals.igtf.toFixed(2)}</span></div>}<div className="flex justify-between font-bold border-t pt-1"><span>Total:</span> <span>${totals.total.toFixed(2)}</span></div></div></div></div>)}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-4"><div className="flex-grow space-y-2"><Label htmlFor="notes">Notas Adicionales</Label><Input id="notes" value={newOrder.notes} onChange={(e) => setNewOrder(p => ({ ...p, notes: e.target.value }))} placeholder="Información adicional..."/></div><div className="flex items-end space-x-4"><div className="space-y-2 w-48"><Label htmlFor="paymentMethod">Forma de Pago</Label><Select value={newOrder.paymentMethod} onValueChange={(v) => setNewOrder(p => ({ ...p, paymentMethod: v }))} disabled={loadingPaymentMethods}><SelectTrigger><SelectValue placeholder={loadingPaymentMethods ? "Cargando..." : "Selecciona un método"} /></SelectTrigger><SelectContent>{paymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}</SelectContent></Select></div><Button onClick={handleCreateOrder} disabled={!newOrder.customerId && !newOrder.customerName || newOrder.items.length === 0} className="h-10">Crear Orden</Button></div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    try { setLoading(true); const response = await fetchApi('/orders'); setOrders(response.data || []); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try { 
      await fetchApi(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }); 
      loadOrders();
    } catch (err) { alert(`Error al actualizar estado: ${err.message}`); }
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => statusFilter === 'all' || order.status === statusFilter)
      .filter(order => searchTerm === '' || order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [orders, searchTerm, statusFilter]);

  const orderStats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todaysOrders = orders.filter(o => new Date(o.createdAt).setHours(0, 0, 0, 0) === today);
    return {
      totalSalesToday: todaysOrders.reduce((acc, o) => (o.status !== 'cancelled' && o.status !== 'refunded') ? acc + o.totalAmount : acc, 0),
      pendingCount: orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length,
      completedCount: orders.filter(o => o.status === 'delivered').length,
      cancelledCount: orders.filter(o => ['cancelled', 'refunded'].includes(o.status)).length,
    };
  }, [orders]);

  const getStatusBadge = (status) => {
    const statusInfo = statusMap[status] || { label: status, colorClassName: 'bg-gray-200' };
    return <Badge className={statusInfo.colorClassName}>{statusInfo.label}</Badge>;
  };

  if (loading) return <div>Cargando órdenes...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Gestión de Órdenes</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content on the left */}
        <div className="flex-grow space-y-6">
          <NewOrderForm />

          {/* TABLA DE ORDENES (HISTORIAL) */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>Historial de Órdenes</CardTitle><CardDescription>Visualiza y administra todas las órdenes.</CardDescription></div>
                <Button onClick={loadOrders} disabled={loading} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por # o cliente..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Estados</SelectItem>
                    {orderStatuses.map(status => (
                      <SelectItem key={status} value={status}>{statusMap[status].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Orden</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <Select onValueChange={(newStatus) => handleStatusChange(order._id, newStatus)} value={order.status}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Cambiar estado" /></SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map(status => (
                                <SelectItem key={status} value={status}>{statusMap[status].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky sidebar on the right */}
        <div className="lg:w-56 lg:sticky top-6 h-fit space-y-4">
          <Card className="aspect-square relative p-4 flex flex-col justify-between">
            <div>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base font-bold mt-2">Ventas del Día</CardTitle>
            </div>
            <div className="self-end">
              <div className="text-3xl font-bold">${orderStats.totalSalesToday.toFixed(2)}</div>
            </div>
          </Card>
          <Card className="aspect-square relative p-4 flex flex-col justify-between">
            <div>
              <Clock className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base font-bold mt-2">Órdenes Pendientes</CardTitle>
            </div>
            <div className="self-end">
              <div className="text-3xl font-bold">{orderStats.pendingCount}</div>
            </div>
          </Card>
          <Card className="aspect-square relative p-4 flex flex-col justify-between">
            <div>
              <CheckCircle className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base font-bold mt-2">Completadas</CardTitle>
            </div>
            <div className="self-end">
              <div className="text-3xl font-bold">{orderStats.completedCount}</div>
            </div>
          </Card>
          <Card className="aspect-square relative p-4 flex flex-col justify-between">
            <div>
              <XCircle className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base font-bold mt-2">Canceladas</CardTitle>
            </div>
            <div className="self-end">
              <div className="text-3xl font-bold">{orderStats.cancelledCount}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OrdersManagement;
