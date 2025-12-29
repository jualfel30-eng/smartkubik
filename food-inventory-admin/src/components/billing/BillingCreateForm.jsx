import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  Send,
  Calculator,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { toast } from 'sonner';
import { api } from '../../lib/api';

const BillingCreateForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    type: 'invoice',
    customer: null,
    customerData: {
      name: '',
      rif: '',
      email: '',
      phone: '',
      address: ''
    },
    items: [],
    notes: '',
    paymentMethod: 'cash',
    currency: 'VES'
  });

  const [newItem, setNewItem] = useState({
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 16,
    discount: 0
  });

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Error al cargar clientes');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer: customer._id,
        customerData: {
          name: customer.name,
          rif: customer.rif || customer.taxId,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        }
      });
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setNewItem({
        ...newItem,
        productId: product._id,
        description: product.name,
        unitPrice: product.price || 0
      });
    }
  };

  const addItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast.error('Complete los datos del item');
      return;
    }

    const item = {
      ...newItem,
      subtotal: calculateItemSubtotal(newItem),
      tax: calculateItemTax(newItem),
      total: calculateItemTotal(newItem)
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNewItem({
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 16,
      discount: 0
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateItemSubtotal = (item) => {
    return item.quantity * item.unitPrice;
  };

  const calculateItemTax = (item) => {
    const subtotal = calculateItemSubtotal(item);
    const discountAmount = (subtotal * item.discount) / 100;
    const base = subtotal - discountAmount;
    return (base * item.taxRate) / 100;
  };

  const calculateItemTotal = (item) => {
    const subtotal = calculateItemSubtotal(item);
    const discountAmount = (subtotal * item.discount) / 100;
    const tax = calculateItemTax(item);
    return subtotal - discountAmount + tax;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
    const discounts = formData.items.reduce((sum, item) => {
      const itemSubtotal = calculateItemSubtotal(item);
      return sum + (itemSubtotal * item.discount) / 100;
    }, 0);
    const taxes = formData.items.reduce((sum, item) => sum + calculateItemTax(item), 0);
    const total = subtotal - discounts + taxes;

    return { subtotal, discounts, taxes, total };
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);

      if (!formData.customerData.name || !formData.customerData.rif) {
        toast.error('Complete los datos del cliente');
        return;
      }

      if (formData.items.length === 0) {
        toast.error('Agregue al menos un item');
        return;
      }

      const totals = calculateTotals();

      const payload = {
        type: formData.type,
        customer: formData.customer,
        customerData: formData.customerData,
        items: formData.items.map(item => ({
          product: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: {
            type: 'percentage',
            value: item.discount
          },
          tax: {
            type: 'IVA',
            rate: item.taxRate,
            amount: item.tax
          }
        })),
        totals: {
          subtotal: totals.subtotal,
          discounts: totals.discounts,
          taxes: [
            {
              type: 'IVA',
              rate: 16,
              amount: totals.taxes,
              base: totals.subtotal - totals.discounts
            }
          ],
          grandTotal: totals.total
        },
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        status: 'draft'
      };

      const response = await api.post('/billing/documents', payload);
      toast.success('Documento guardado como borrador');
      navigate(`/billing/documents/${response.data._id}`);
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(error.response?.data?.message || 'Error al guardar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    try {
      setLoading(true);

      if (!formData.customerData.name || !formData.customerData.rif) {
        toast.error('Complete los datos del cliente');
        return;
      }

      if (formData.items.length === 0) {
        toast.error('Agregue al menos un item');
        return;
      }

      const totals = calculateTotals();

      const payload = {
        type: formData.type,
        customer: formData.customer,
        customerData: formData.customerData,
        items: formData.items.map(item => ({
          product: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: {
            type: 'percentage',
            value: item.discount
          },
          tax: {
            type: 'IVA',
            rate: item.taxRate,
            amount: item.tax
          }
        })),
        totals: {
          subtotal: totals.subtotal,
          discounts: totals.discounts,
          taxes: [
            {
              type: 'IVA',
              rate: 16,
              amount: totals.taxes,
              base: totals.subtotal - totals.discounts
            }
          ],
          grandTotal: totals.total
        },
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        status: 'validated'
      };

      const response = await api.post('/billing/documents', payload);

      // Emitir inmediatamente
      await api.post(`/billing/documents/${response.data._id}/issue`);

      toast.success('Documento emitido correctamente');
      navigate(`/billing/documents/${response.data._id}`);
    } catch (error) {
      console.error('Error issuing document:', error);
      toast.error(error.response?.data?.message || 'Error al emitir documento');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Documento</h1>
          <p className="text-muted-foreground">
            Crear factura, nota de crédito, nota de débito o nota de entrega
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/billing')}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Borrador
          </Button>
          <Button onClick={handleIssue} disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            Emitir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Document Type */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Tipo de Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Factura</SelectItem>
                    <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                    <SelectItem value="debit_note">Nota de Débito</SelectItem>
                    <SelectItem value="delivery_note">Nota de Entrega</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VES">Bolívares (VES)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Seleccionar Cliente Existente</Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} - {customer.rif || customer.taxId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nombre / Razón Social *</Label>
                <Input
                  value={formData.customerData.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerData: { ...formData.customerData, name: e.target.value }
                  })}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div>
                <Label>RIF / Cédula *</Label>
                <Input
                  value={formData.customerData.rif}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerData: { ...formData.customerData, rif: e.target.value }
                  })}
                  placeholder="J-123456789"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.customerData.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerData: { ...formData.customerData, email: e.target.value }
                  })}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.customerData.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerData: { ...formData.customerData, phone: e.target.value }
                  })}
                  placeholder="+58 412 1234567"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Dirección</Label>
                <Textarea
                  value={formData.customerData.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    customerData: { ...formData.customerData, address: e.target.value }
                  })}
                  placeholder="Dirección fiscal del cliente"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add Item Form */}
            <div className="grid gap-4 md:grid-cols-7 mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="md:col-span-2">
                <Label>Producto</Label>
                <Select onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Descripción del item"
                />
              </div>

              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                />
              </div>

              <div>
                <Label>Precio Unit.</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>IVA %</Label>
                <Select value={newItem.taxRate.toString()} onValueChange={(value) => setNewItem({ ...newItem, taxRate: parseFloat(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="16">16%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-7 flex justify-end">
                <Button onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Item
                </Button>
              </div>
            </div>

            {/* Items Table */}
            {formData.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.tax.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No hay items agregados</p>
                <p className="text-sm">Agregue items usando el formulario arriba</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals & Notes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales, términos y condiciones..."
              rows={6}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discounts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descuentos:</span>
                  <span className="text-red-600">-${totals.discounts.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%):</span>
                <span>${totals.taxes.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)} {formData.currency}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingCreateForm;
