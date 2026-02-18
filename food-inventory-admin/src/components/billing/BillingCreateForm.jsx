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
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useCountryPlugin } from '../../country-plugins/CountryPluginContext';

// Helper pure functions for calculations
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

const BillingCreateForm = () => {
  const navigate = useNavigate();
  const traverse = useNavigate();
  const [loading, setLoading] = useState(false);

  // Country plugin for i18n
  const plugin = useCountryPlugin();
  const primaryCurrency = plugin.currencyEngine.getPrimaryCurrency();
  const allCurrencies = [primaryCurrency, ...plugin.currencyEngine.getSecondaryCurrencies()];
  const defaultTax = plugin.taxEngine.getDefaultTaxes()[0];
  const defaultTaxRate = defaultTax?.rate ?? 16;
  const defaultTaxType = defaultTax?.type ?? 'IVA';
  const fiscalIdLabel = plugin.fiscalIdentity.getFieldLabel();
  const phonePrefix = plugin.localeProvider.getPhonePrefix();

  // Customers/Products state removed in favor of async search

  const [formData, setFormData] = useState({
    type: 'invoice',
    customer: null,
    customerData: {
      name: '',
      rif: '',
      rifType: 'J',
      rifNumber: '',
      email: '',
      phone: '',
      address: ''
    },
    items: [],
    notes: '',
    paymentMethod: 'cash',

    currency: primaryCurrency.code,
    exchangeRate: 0
  });

  const { rate: bcvRate, loading: loadingRate } = useExchangeRate();

  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(null);

  useEffect(() => {
    if (bcvRate && !formData.exchangeRate) {
      setFormData(prev => ({ ...prev, exchangeRate: bcvRate }));
    }
  }, [bcvRate]);

  useEffect(() => {
    api.get('/billing/sequences')
      .then(res => setSequences(res || []))
      .catch(err => console.error('Error loading sequences:', err));
  }, []);

  // Auto-select default sequence when document type or sequences change
  useEffect(() => {
    if (sequences.length > 0 && formData.type) {
      const seq = sequences.find(s => s.type === formData.type && s.isDefault)
        || sequences.find(s => s.type === formData.type);
      if (seq) setSelectedSequence(seq._id);
    }
  }, [sequences, formData.type]);

  const [newItem, setNewItem] = useState({
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: defaultTaxRate,
    discount: 0
  });

  // Async loaders for SearchableSelect
  const loadCustomerOptions = async (inputValue) => {
    try {
      const response = await api.get(`/customers?search=${inputValue}&limit=20`);
      return response.data.map(c => ({
        label: `${c.name} - ${c.rif || c.taxId}`,
        value: c._id,
        customer: c
      }));
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  };

  // Helper to extract price from product structure
  const getProductPrice = (product) => {
    // Check for explicit price (if any)
    if (typeof product.price === 'number') return product.price;
    // Check for selling units (e.g. retail products)
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      return product.sellingUnits[0].pricePerUnit;
    }
    // Check for variants (e.g. restaurant products)
    if (product.variants && product.variants.length > 0) {
      return product.variants[0].basePrice;
    }
    return 0;
  };

  const loadProductOptions = async (inputValue) => {
    try {
      const response = await api.get(`/products?search=${inputValue}&isActive=true&limit=20`);
      // Adapt response structure if needed (some endpoints return { data: [] })
      const products = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return products.map(p => {
        const price = getProductPrice(p);
        return {
          label: `${p.name} - $${price.toFixed(2)}`,
          value: p._id,
          product: p
        };
      });
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  };

  const handleCustomerSelect = (selectedOption) => {
    // SearchableSelect returns an object { value, label, customer } or null
    if (selectedOption && selectedOption.customer) {
      const { customer } = selectedOption;
      const fullRif = customer.rif || customer.taxId || '';
      const [parsedType, ...rest] = fullRif.split('-');
      const isValidType = ['V', 'E', 'J', 'P', 'G'].includes(parsedType?.toUpperCase());
      setFormData({
        ...formData,
        customer: customer._id,
        customerData: {
          name: customer.name,
          rif: fullRif,
          rifType: isValidType ? parsedType.toUpperCase() : 'J',
          rifNumber: isValidType ? rest.join('-') : fullRif,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || ((customer.addresses && customer.addresses.length > 0) ? customer.addresses[0].street : '')
        }
      });
      toast.success('Cliente cargado');
    }
  };

  const handleProductSelect = (selectedOption) => {
    // SearchableSelect returns an object { value, label, product } or null
    if (selectedOption && selectedOption.product) {
      const { product } = selectedOption;
      const basePrice = getProductPrice(product);

      // Calculate price based on selected currency
      let finalPrice = basePrice;
      if (formData.currency === primaryCurrency.code && bcvRate) {
        finalPrice = basePrice * bcvRate;
      }

      setNewItem({
        ...newItem,
        productId: product._id,
        description: product.name,
        unitPrice: parseFloat(finalPrice.toFixed(2))
      });
      // Optional: Focus quantity input here if we had a ref
    }
  };

  const handleCurrencyChange = (newCurrency) => {
    const rate = bcvRate || 1;
    const oldCurrency = formData.currency;

    // Determine conversion factor
    let factor = 1;
    if (newCurrency === primaryCurrency.code && oldCurrency !== primaryCurrency.code) {
      // Converting TO primary currency (e.g. USD to VES)
      factor = rate;
    } else if (newCurrency !== primaryCurrency.code && oldCurrency === primaryCurrency.code) {
      // Converting FROM primary currency (e.g. VES to USD)
      factor = 1 / rate;
    }

    // Update items
    const updatedItems = formData.items.map(item => {
      const newUnitPrice = item.unitPrice * factor;
      const updatedItem = {
        ...item,
        unitPrice: newUnitPrice,
        quantity: item.quantity,
        discount: item.discount,
        taxRate: item.taxRate
      };
      // Recalculate derived fields
      return {
        ...updatedItem,
        subtotal: calculateItemSubtotal(updatedItem),
        tax: calculateItemTax(updatedItem),
        total: calculateItemTotal(updatedItem)
      };
    });

    setFormData({
      ...formData,
      currency: newCurrency,
      items: updatedItems,
      exchangeRate: bcvRate // Ensure rate is current
    });
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
        seriesId: selectedSequence,
        customer: formData.customer,
        customerName: formData.customerData.name,
        customerTaxId: formData.customerData.rif,
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
            type: defaultTaxType,
            rate: item.taxRate,
            amount: item.tax
          }
        })),
        totals: {
          subtotal: totals.subtotal,
          discounts: totals.discounts,
          taxes: [
            {
              type: defaultTaxType,
              rate: defaultTaxRate,
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
      navigate(`/billing/documents/${response._id}`);
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

      if (!selectedSequence) {
        toast.error('Selecciona una serie de facturación');
        return;
      }

      const payload = {
        type: formData.type,
        seriesId: selectedSequence,
        customer: formData.customer,
        customerName: formData.customerData.name,
        customerTaxId: formData.customerData.rif,
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
            type: defaultTaxType,
            rate: item.taxRate,
            amount: item.tax
          }
        })),
        totals: {
          subtotal: totals.subtotal,
          discounts: totals.discounts,
          taxes: [
            {
              type: defaultTaxType,
              rate: defaultTaxRate,
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
      await api.post(`/billing/documents/${response._id}/issue`);

      toast.success('Documento emitido correctamente');
      navigate(`/billing/documents/${response._id}`);
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
                <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCurrencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.currency === primaryCurrency.code && bcvRate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tasa BCV: {bcvRate.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <Label>Serie de Facturación</Label>
                <Select value={selectedSequence || ''} onValueChange={setSelectedSequence}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar serie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.filter(s => s.type === formData.type).map(seq => (
                      <SelectItem key={seq._id} value={seq._id}>
                        {seq.prefix} - {seq.name}
                      </SelectItem>
                    ))}
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
                <SearchableSelect
                  placeholder="Buscar cliente (Nombre o RIF)..."
                  asyncSearch={true}
                  loadOptions={loadCustomerOptions}
                  onChange={handleCustomerSelect}
                  noOptionsMessage={() => "No se encontraron clientes"}
                />
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
                <Label>{fiscalIdLabel} *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.customerData.rifType || 'J'}
                    onValueChange={(type) => setFormData({
                      ...formData,
                      customerData: {
                        ...formData.customerData,
                        rifType: type,
                        rif: `${type}-${formData.customerData.rifNumber || ''}`,
                      }
                    })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="J">J</SelectItem>
                      <SelectItem value="V">V</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="P">P</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={formData.customerData.rifNumber || ''}
                    onChange={(e) => {
                      const number = e.target.value.replace(/[^0-9-]/g, '');
                      setFormData({
                        ...formData,
                        customerData: {
                          ...formData.customerData,
                          rifNumber: number,
                          rif: `${formData.customerData.rifType || 'J'}-${number}`,
                        }
                      });
                    }}
                    placeholder="12345678-9"
                    className="flex-1"
                  />
                </div>
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
                  placeholder={`${phonePrefix} 412 1234567`}
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
                <SearchableSelect
                  placeholder="Buscar producto..."
                  asyncSearch={true}
                  loadOptions={loadProductOptions}
                  onChange={handleProductSelect}
                  noOptionsMessage={() => "No se encontraron productos"}
                />
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
                <Label>{defaultTaxType} %</Label>
                <Select value={newItem.taxRate.toString()} onValueChange={(value) => setNewItem({ ...newItem, taxRate: parseFloat(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value={defaultTaxRate.toString()}>{defaultTaxRate}%</SelectItem>
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
                    <TableHead className="text-right">{defaultTaxType}</TableHead>
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
                <span className="text-muted-foreground">{defaultTaxType} ({defaultTaxRate}%):</span>
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
