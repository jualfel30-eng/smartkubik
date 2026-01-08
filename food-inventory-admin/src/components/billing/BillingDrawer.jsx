import React, { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "../ui/sheet";
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import InvoiceDeliveryDialog from './InvoiceDeliveryDialog';
import { useCrmContext } from '../../context/CrmContext';

const BillingDrawer = ({ isOpen, onClose, order, onOrderUpdated }) => {
    const navigate = useNavigate();
    const { rate: bcvRate, loading: loadingRate } = useExchangeRate();
    const { paymentMethods, paymentMethodsLoading } = useCrmContext();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        type: 'invoice',
        issueDate: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
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
        paymentMethod: '', // Will be set from order or default payment method
        currency: 'VES',
        exchangeRate: 1,
        amountBs: 0
    });

    const [newItem, setNewItem] = useState({
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 16,
        discount: 0
    });

    const initializeFormFromOrder = useCallback((orderData, fullCustomer = null) => {
        if (!orderData) return;

        // Map Order Items to Billing Items
        const items = (orderData.items || []).map(item => {
            const rawName = item.productName || item.product?.name || item.name || item.description || 'Producto';
            const modifiersDesc = item.modifiers && item.modifiers.length > 0
                ? ` (${item.modifiers.map(m => m.name).join(', ')})`
                : '';
            const description = rawName + modifiersDesc;
            const unitPrice = item.unitPrice || item.price || item.finalPrice || 0;
            const unit = item.selectedUnit || item.unit || 'Unid';

            return {
                productId: item.productId || item.product?._id || item.product,
                description: description,
                quantity: item.quantity || 1,
                unit: unit,
                unitPrice: unitPrice,
                taxRate: 16,
                discount: 0,
                subtotal: (item.quantity || 1) * unitPrice,
                tax: ((item.quantity || 1) * unitPrice * 0.16),
                total: ((item.quantity || 1) * unitPrice * 1.16)
            };
        });

        // Map Customer
        let customerId = typeof orderData.customer === 'object' ? orderData.customer?._id : (orderData.customerId || orderData.customer);

        // Try to get RIF/TaxID from various places, prioritizing Full Customer Record
        let rif = '';

        if (fullCustomer) {
            rif = fullCustomer.rif || fullCustomer.taxId || fullCustomer.taxInfo?.taxId || '';
        }

        // Fallback to Order Data if Customer fetch failed or missing
        if (!rif) {
            // 1. Check taxInfo object (Primary source in Backend Schema)
            if (orderData.taxInfo?.customerTaxId) {
                const type = orderData.taxInfo.customerTaxType || '';
                const number = orderData.taxInfo.customerTaxId;
                rif = (type && !number.includes(type)) ? `${type}-${number}` : number;
            }
            // 2. Check explicitly projected fields
            else if (orderData.customerRif) {
                rif = orderData.taxType ? `${orderData.taxType}-${orderData.customerRif}` : orderData.customerRif;
            }
            else if (orderData.customerTaxId) rif = orderData.customerTaxId;
            else if (orderData.rif) rif = orderData.rif;
            // 3. Fallback to Customer Object inside Order
            else if (typeof orderData.customer === 'object') {
                rif = orderData.customer.rif || orderData.customer.taxId || orderData.customer.taxInfo?.taxId || '';
            }
        }

        let customerData = {
            name: (fullCustomer?.name) || orderData.customerName || '',
            rif: rif,
            email: (fullCustomer?.email || fullCustomer?.contacts?.find(c => c.type === 'email')?.value) || orderData.customerEmail || '',
            phone: (fullCustomer?.phone || fullCustomer?.contacts?.find(c => c.type === 'phone')?.value) || orderData.customerPhone || '',
            address: (fullCustomer?.address) ||
                (orderData.shipping?.address ?
                    [orderData.shipping.address.street, orderData.shipping.address.city, orderData.shipping.address.state].filter(Boolean).join(', ') : '')
        };

        // If address is still empty, look deeper
        if (!customerData.address && fullCustomer?.billingAddress) {
            customerData.address = fullCustomer.billingAddress.street || '';
        }

        // Get Payment Method from payments history (use actual method ID from backend)
        const paymentsList = orderData.paymentRecords || orderData.payments || [];
        let paymentMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto')?.id || ''; // Default to first non-mixed method

        if (paymentsList.length > 0) {
            const successfulPayments = paymentsList.filter(p => p.status === 'approved' || p.isConfirmed === true);
            const paymentToUse = successfulPayments.length > 0 ? successfulPayments[successfulPayments.length - 1] : paymentsList[paymentsList.length - 1];

            if (paymentToUse && paymentToUse.method) {
                // Use the method ID directly from the payment record (no mapping needed)
                paymentMethod = paymentToUse.method;
            }
        }

        // Calculate total for pre-filling Bs amount
        const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

        setFormData({
            type: 'invoice',
            issueDate: new Date().toISOString().split('T')[0],
            customer: customerId,
            customerData,
            items,
            notes: `Orden #${orderData.orderNumber}`,
            paymentMethod,
            currency: 'VES',
            exchangeRate: bcvRate || orderData.exchangeRate || 1,
            amountBs: orderData.totalAmountVes || (totalAmount * (bcvRate || orderData.exchangeRate || 1))
        });
    }, [bcvRate]);

    // Effect: When opened, fetch FRESH order details AND full customer details
    useEffect(() => {
        if (order && isOpen) {
            // 1. Initial optimistic load from prop
            initializeFormFromOrder(order);

            // 2. Fetch fresh data from API
            const fetchFreshOrderAndCustomer = async () => {
                setLoading(true);
                try {
                    const response = await api.get(`/orders/${order._id}`);
                    const freshOrder = response.data || response;

                    // Fetch full Customer data because Order only stores ID and Name
                    let fullCustomer = null;
                    if (freshOrder.customerId || freshOrder.customer) {
                        const cId = typeof freshOrder.customer === 'object' ? freshOrder.customer._id : (freshOrder.customerId || freshOrder.customer);
                        try {
                            const custRes = await api.get(`/customers/${cId}`);
                            fullCustomer = custRes.data || custRes;
                        } catch (err) {
                            console.warn("Could not fetch full customer details", err);
                        }
                    }

                    // Merge fresh data with critical context from props (like phone number from chat)
                    const orderWithContext = {
                        ...freshOrder,
                        // Preserve phone from prop if missing in DB, as prop might come from Chat context
                        customerPhone: freshOrder.customerPhone || order.customerPhone,
                        customerEmail: freshOrder.customerEmail || order.customerEmail
                    };

                    initializeFormFromOrder(orderWithContext, fullCustomer);
                } catch (error) {
                    console.error("Error fetching fresh order details:", error);
                    toast.error('Error al actualizar datos de la orden');
                } finally {
                    setLoading(false);
                }
            };
            fetchFreshOrderAndCustomer();
        }
    }, [order, isOpen, initializeFormFromOrder]);

    const [sequences, setSequences] = useState([]);
    const [selectedSequence, setSelectedSequence] = useState(null);
    const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
    const [issuedInvoice, setIssuedInvoice] = useState(null);

    const loadSequences = async () => {
        try {
            const response = await api.get('/billing/sequences');
            const list = response || [];
            setSequences(list);
        } catch (error) {
            console.error('Error loading sequences:', error);
            toast.error('Error al cargar secuencias de facturación');
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadCustomers();
            loadProducts();
            loadSequences();
        }
    }, [isOpen]);

    // Auto-select sequence when type changes or sequences load
    useEffect(() => {
        if (sequences.length > 0 && formData.type) {
            const typeMap = {
                'invoice': 'invoice',
                'credit_note': 'credit_note',
                'debit_note': 'debit_note',
                'delivery_note': 'delivery_note'
            };
            const mappedType = typeMap[formData.type];
            // Find default sequence for this type
            const seq = sequences.find(s => s.type === mappedType && s.isDefault) || sequences.find(s => s.type === mappedType);
            if (seq) {
                setSelectedSequence(seq._id);
            }
        }
    }, [sequences, formData.type]);


    const loadCustomers = async () => {
        try {
            const response = await api.get('/customers');
            const list = response.data || response; // Handle diverse response structures
            setCustomers(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    const loadProducts = async () => {
        try {
            const response = await api.get('/products');
            const list = response.data || response;
            setProducts(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const handleCustomerSelect = (customerId) => {
        const customer = customers.find(c => c._id === customerId);
        if (customer) {
            setFormData(prev => ({
                ...prev,
                customer: customer._id,
                customerData: {
                    name: customer.name,
                    rif: customer.rif || customer.taxId || customer.taxInfo?.taxId || '',
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address || customer.billingAddress?.street || ''
                }
            }));
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

        // IGTF viene de la orden (ya fue calculado en payments)
        const igtf = order?.igtfTotal || 0;

        const total = subtotal - discounts + taxes + igtf;

        return { subtotal, discounts, taxes, igtf, total };
    };

    const handleSaveDraft = async () => {
        await submitForm('draft');
    };

    const handleIssue = async () => {
        await submitForm('validated');
    };

    const submitForm = async (status) => {
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

            if (!selectedSequence) {
                toast.error('No se ha seleccionado una serie de facturación');
                return;
            }

            const totals = calculateTotals();

            const payload = {
                type: formData.type,
                issueDate: formData.issueDate, // Fecha de emisión
                seriesId: selectedSequence, // Added seriesId
                customerName: formData.customerData.name, // Added raw customerName
                customerTaxId: formData.customerData.rif, // Added raw customerTaxId
                customer: formData.customer,
                customerData: formData.customerData, // Kept for legacy compatibility if needed
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
                        },
                        ...(totals.igtf > 0 ? [{
                            type: 'IGTF',
                            rate: 3,
                            amount: totals.igtf,
                            base: totals.subtotal - totals.discounts + totals.taxes
                        }] : [])
                    ],
                    grandTotal: totals.total
                },
                currency: formData.currency,
                paymentMethod: formData.paymentMethod,
                notes: formData.notes,
                status: status === 'validated' ? 'validated' : 'draft',
                relatedOrderId: order?._id
            };

            const response = await api.post('/billing/documents', payload);

            if (status === 'validated') {
                await api.post(`/billing/documents/${response._id}/issue`);

                // Fetch the issued document to get fiscal data (controlNumber, etc)
                const issuedDoc = await api.get(`/billing/documents/${response._id}`);

                // Build complete invoice with data from payload + issued document
                const completeInvoice = {
                    ...issuedDoc,
                    items: payload.items,
                    totals: payload.totals,
                    customerData: payload.customerData,
                    fiscalData: issuedDoc.fiscalData || {
                        controlNumber: issuedDoc.controlNumber || '',
                        hash: issuedDoc.hash || '',
                        verificationUrl: issuedDoc.verificationUrl || '',
                        imprenta: issuedDoc.imprenta || {}
                    },
                    exchangeRate: formData.exchangeRate || bcvRate || 1,
                    paymentMethod: payload.paymentMethod
                };

                // Set invoice data and open delivery dialog
                setIssuedInvoice(completeInvoice);
                // UX CHANGE: Don't open delivery dialog, return immediately to parent to next step
                // setShowDeliveryDialog(true);
                toast.success('Factura emitida exitosamente');
                onClose(completeInvoice); // Pass invoice back to parent immediately

                // if (onOrderUpdated) onOrderUpdated(); // Removed to prevent premature close

                // Do not close drawer here, wait for delivery dialog to be closed
                // onClose();
            } else {
                toast.success('Borrador creado');

                if (onOrderUpdated) onOrderUpdated();
                onClose();
            }
        } catch (error) {
            console.error('Error saving document:', error);

            // Handle "Order already has invoice" error gracefully
            if (error.response?.data?.message && (error.response.data.message.includes('already has a billing document') || error.response.data.message.includes('ya tiene una factura'))) {
                toast.warning('Esta orden ya fue facturada. Actualizando estado...');
                if (onOrderUpdated) onOrderUpdated();
                // Close drawer to refresh parent state
                onClose();
            } else {
                toast.error(error.response?.data?.message || 'Error al guardar documento');
            }
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="right" className="sm:max-w-[800px] w-full overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Facturación de Orden {order?.orderNumber}</SheetTitle>
                        <SheetDescription>
                            Complete los datos para generar el documento fiscal verificado.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 pb-20 p-6">
                        {/* Document Type */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Datos del Documento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
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
                                        <Label>Serie</Label>
                                        <Select value={selectedSequence || ''} onValueChange={setSelectedSequence}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione serie" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sequences.filter(s => s.type === formData.type).map(seq => (
                                                    <SelectItem key={seq._id} value={seq._id}>
                                                        {seq.name} ({seq.prefix}{seq.currentNumber})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Fecha de Emisión *</Label>
                                        <Input
                                            type="date"
                                            value={formData.issueDate}
                                            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div>
                                        <Label>Método de Pago</Label>
                                        <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione método de pago" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(pm => (
                                                    pm.id !== 'pago_mixto' && (
                                                        <SelectItem key={pm.id} value={pm.id}>
                                                            {pm.name}
                                                        </SelectItem>
                                                    )
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <User className="h-4 w-4" />
                                    Cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <Label>Buscar Cliente</Label>
                                        <Select onValueChange={handleCustomerSelect} value={formData.customer || ''}>
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
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label>Dirección</Label>
                                        <Input
                                            value={formData.customerData.address}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                customerData: { ...formData.customerData, address: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items Table */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Desc</TableHead>
                                        <TableHead className="text-right">Cant</TableHead>
                                        <TableHead className="text-right">Precio</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium text-xs">{item.description}</TableCell>
                                            <TableCell className="text-right">
                                                {item.quantity}
                                                {item.unit && <span className="text-[10px] text-muted-foreground ml-1">({item.unit})</span>}
                                            </TableCell>
                                            <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
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
                                    {formData.items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">Sin items</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* NEW Item Form */}
                        <div className="grid gap-2 grid-cols-4 items-end border p-2 rounded bg-muted/20">
                            <div className="col-span-2">
                                <Label className="text-xs">Descripción</Label>
                                <Input
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="Info extra"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Monto</Label>
                                <Input
                                    type="number"
                                    value={newItem.unitPrice}
                                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) })}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <Button size="sm" onClick={addItem} className="h-8"> <Plus className="w-3 h-3" /> </Button>
                        </div>


                        {/* Totals */}
                        <div className="space-y-2 pt-4 border-t">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>${totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IVA (16%):</span>
                                <span>${totals.taxes.toFixed(2)}</span>
                            </div>
                            {totals.igtf > 0 && (
                                <div className="flex justify-between text-sm text-orange-600">
                                    <span className="flex items-center gap-1">
                                        <span>IGTF (3%):</span>
                                        <span className="text-[10px]">De pagos registrados</span>
                                    </span>
                                    <span>${totals.igtf.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>Total USD:</span>
                                <span>${totals.total.toFixed(2)}</span>
                            </div>

                            {/* Exchange Rate and Bs Amount - Required by SENIAT */}
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Tasa de Cambio BCV (Bs/$)
                                        {loadingRate && <span className="ml-1">(Cargando...)</span>}
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.exchangeRate || bcvRate || ''}
                                        disabled
                                        className="h-8 text-sm bg-muted"
                                        title="Tasa oficial del BCV - No modificable por transparencia fiscal"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Tasa oficial BCV (no modificable)
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Total en Bs *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={(totals.total * (formData.exchangeRate || bcvRate || 1)).toFixed(2)}
                                        disabled
                                        className="h-8 text-sm font-bold bg-muted"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Calculado automáticamente
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2">
                                <span>Total Bs:</span>
                                <span>Bs {(totals.total * (formData.exchangeRate || bcvRate || 1)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                            <Button variant="outline" className="w-full" onClick={handleSaveDraft} disabled={loading}>
                                Guardar Borrador
                            </Button>
                            <Button className="w-full" onClick={handleIssue} disabled={loading}>
                                <Send className="mr-2 h-4 w-4" />
                                Emitir Factura
                            </Button>
                        </div>

                    </div>
                </SheetContent>
            </Sheet>

            {/* Invoice Delivery Dialog */}
            <InvoiceDeliveryDialog
                isOpen={showDeliveryDialog}
                onClose={() => {
                    setShowDeliveryDialog(false);
                    // Pass the created invoice data back to parent to allow immediate state update
                    onClose(issuedInvoice);
                }}
                invoice={issuedInvoice}
                customerEmail={formData.customerData.email}
                customerPhone={formData.customerData.phone}
            />
        </>
    );
};

export default BillingDrawer;
