import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect.jsx';

const initialFormState = {
    name: '', // Company Name
    rif: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentSettings: {
        defaultCreditDays: 0,
        acceptsCredit: false,
        creditLimit: 0,
        acceptedPaymentMethods: [], // ['zelle', 'efectivo_usd', 'bolivares_bcv', 'pago_movil']
        preferredPaymentMethod: '',
    },
    address: {
        street: '',
        city: '',
        state: '',
    }
};

const PAYMENT_METHODS = [
    { id: 'efectivo_usd', label: 'Efectivo USD' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'bolivares_bcv', label: '$ BCV' }, // Previously 'Bolívares (Tasa BCV)'
    { id: 'euro_bcv', label: '€ BCV' }, // New Addition
    { id: 'pago_movil', label: 'Pago Móvil' },
    { id: 'transferencia_ves', label: 'Transf. Bancaria VES' },
    { id: 'transferencia_int', label: 'Transf. Internacional' },
];

export default function SupplierDetailDialog({ open, onOpenChange, supplier, onSuccess }) {
    const [formData, setFormData] = useState(initialFormState);
    const [saving, setSaving] = useState(false);

    // Strategic Data States
    const [linkedProducts, setLinkedProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Linking Product State
    const [selectedProductToLink, setSelectedProductToLink] = useState(null);
    const [linkFormData, setLinkFormData] = useState({
        costPrice: 0,
        supplierSku: '',
        leadTimeDays: 1,
        minimumOrderQuantity: 1,
        isPreferred: true
    });
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name || '',
                rif: supplier.taxInfo?.rif || supplier.taxInfo?.taxId || '',
                contactName: supplier.contacts?.[0]?.name || '',
                contactEmail: supplier.contacts?.[0]?.email || '',
                contactPhone: supplier.contacts?.[0]?.phone || '',
                paymentSettings: {
                    defaultCreditDays: supplier.paymentSettings?.defaultCreditDays || supplier.customer?.creditInfo?.paymentTerms || 0,
                    acceptsCredit: supplier.paymentSettings?.acceptsCredit || supplier.customer?.creditInfo?.acceptsCredit || false,
                    creditLimit: supplier.paymentSettings?.creditLimit || supplier.customer?.creditInfo?.creditLimit || 0,
                    acceptedPaymentMethods: supplier.paymentSettings?.acceptedPaymentMethods || [],
                    preferredPaymentMethod: supplier.paymentSettings?.preferredPaymentMethod || supplier.preferences?.preferredPaymentMethod || '',
                },
                address: {
                    street: supplier.address?.street || '',
                    city: supplier.address?.city || '',
                    state: supplier.address?.state || '',
                }
            });

            // Load Strategic Data
            loadLinkedProducts(supplier._id || supplier.id);
            loadPurchaseHistory(supplier);
        } else {
            setFormData(initialFormState);
            setLinkedProducts([]);
            setPurchaseHistory([]);
            setSelectedProductToLink(null);
        }
    }, [supplier, open]);

    const loadLinkedProducts = async (supplierId) => {
        try {
            setLoadingProducts(true);
            const response = await fetchApi(`/products?supplierId=${supplierId}`);
            setLinkedProducts(response.data || []);
        } catch (error) {
            console.error('Error loading linked products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadPurchaseHistory = async (supplierData) => {
        try {
            // TACTIC: Send the raw Supplier ID and let the Backend's Smart Resolution handle the rest.
            // This prevents the frontend from aborting if it can't find a customerId locally.
            const targetId = supplierData._id || supplierData.id;

            if (!targetId) {
                console.error("Critical: No Supplier ID found", supplierData);
                return;
            }

            console.log("Fetching history for:", targetId);
            setLoadingHistory(true);
            const response = await fetchApi(`/purchases?supplierId=${targetId}`);
            setPurchaseHistory(response.data || []);
        } catch (error) {
            console.error('Error loading purchase history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadProductOptions = async (inputValue) => {
        try {
            const response = await fetchApi(`/products?search=${encodeURIComponent(inputValue)}&limit=10`);
            const products = response.data || [];
            return products.map(p => {
                const alreadyLinked = linkedProducts.some(lp => lp._id === p._id);
                return {
                    value: p._id,
                    label: `${p.name} (${p.sku}) ${alreadyLinked ? '(Ya vinculado)' : ''}`,
                    product: p,
                    isDisabled: alreadyLinked
                };
            });
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    };

    const handleProductSelect = (selectedOption) => {
        if (!selectedOption) {
            setSelectedProductToLink(null);
            return;
        }
        const product = selectedOption.product;
        setSelectedProductToLink(product);
        // Pre-fill form with product data
        const variant = product.variants?.[0] || {};
        setLinkFormData({
            costPrice: variant.costPrice || 0,
            supplierSku: product.sku || '',
            leadTimeDays: 1,
            minimumOrderQuantity: 1,
            isPreferred: true
        });
    };

    const handleLinkProduct = async () => {
        if (!selectedProductToLink) return;

        try {
            setLinking(true);
            const payload = {
                ...linkFormData,
                supplierId: supplier._id || supplier.id
            };

            await fetchApi(`/products/${selectedProductToLink._id}/suppliers`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            toast.success('Producto vinculado exitosamente');
            setSelectedProductToLink(null); // Clear selection
            setLinkFormData({ // Reset form
                costPrice: 0,
                supplierSku: '',
                leadTimeDays: 1,
                minimumOrderQuantity: 1,
                isPreferred: true
            });
            loadLinkedProducts(supplier._id || supplier.id); // Refresh list
        } catch (error) {
            console.error('Error linking product:', error);
            toast.error(`Error al vincular: ${error.message}`);
        } finally {
            setLinking(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDeepChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handlePaymentMethodToggle = (methodId) => {
        setFormData(prev => {
            const currentMethods = prev.paymentSettings.acceptedPaymentMethods || [];
            if (currentMethods.includes(methodId)) {
                return {
                    ...prev,
                    paymentSettings: {
                        ...prev.paymentSettings,
                        acceptedPaymentMethods: currentMethods.filter(m => m !== methodId)
                    }
                };
            } else {
                return {
                    ...prev,
                    paymentSettings: {
                        ...prev.paymentSettings,
                        acceptedPaymentMethods: [...currentMethods, methodId]
                    }
                };
            }
        });
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const payload = {
                ...formData,
                // Ensure legacy fields are populated for logic compatibility
                name: formData.name,
                contactName: formData.contactName,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone
            };

            // Basic validation
            if (!payload.name || !payload.rif) {
                toast.error('Nombre y RIF son obligatorios');
                setSaving(false);
                return;
            }

            const method = supplier ? 'PATCH' : 'POST';
            const endpoint = supplier ? `/suppliers/${supplier._id}` : '/suppliers';

            await fetchApi(endpoint, {
                method,
                body: JSON.stringify(payload)
            });



            toast.success(`Proveedor ${supplier ? 'actualizado' : 'creado'} con éxito`);
            onSuccess();
        } catch (error) {
            console.error('Error saving supplier:', error);
            toast.error(`Error al guardar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Hub Estratégico de Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
                    <DialogDescription>
                        {supplier ? `Gestiona la relación comercial con ${supplier.name}.` : 'Complete la información para registrar un nuevo proveedor.'}
                        {supplier && supplier.metrics?.averageRating > 0 && (
                            <div className="flex items-center mt-1 space-x-1">
                                <span className="text-sm font-medium">Calificación Promedio:</span>
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <svg
                                            key={star}
                                            className={`w-4 h-4 ${star <= Math.round(supplier.metrics.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    ))}
                                </div>
                                <span className="text-xs text-muted-foreground">({supplier.metrics.totalRatings || 0} calificaciones)</span>
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">Info. General</TabsTrigger>
                        <TabsTrigger value="commercial">Condiciones</TabsTrigger>
                        <TabsTrigger value="products">Productos</TabsTrigger>
                        <TabsTrigger value="history">Historial</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Razón Social / Nombre</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="Ej: Distribuidora Norte C.A."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rif">RIF / Tax ID</Label>
                                <Input
                                    id="rif"
                                    value={formData.rif}
                                    onChange={(e) => handleChange('rif', e.target.value)}
                                    placeholder="J-12345678-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Datos de Contacto Principal</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Nombre Contacto"
                                    value={formData.contactName}
                                    onChange={(e) => handleChange('contactName', e.target.value)}
                                />
                                <Input
                                    placeholder="Teléfono"
                                    value={formData.contactPhone}
                                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                                />
                                <Input
                                    placeholder="Email"
                                    className="col-span-2"
                                    value={formData.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Dirección</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Ciudad"
                                    value={formData.address.city}
                                    onChange={(e) => handleDeepChange('address', 'city', e.target.value)}
                                />
                                <Input
                                    placeholder="Estado"
                                    value={formData.address.state}
                                    onChange={(e) => handleDeepChange('address', 'state', e.target.value)}
                                />
                                <Textarea
                                    placeholder="Calle, Av, Local..."
                                    className="col-span-2 h-20"
                                    value={formData.address.street}
                                    onChange={(e) => handleDeepChange('address', 'street', e.target.value)}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="commercial" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-muted-foreground mb-2">Crédito y Plazos</h4>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="acceptsCredit"
                                        checked={formData.paymentSettings.acceptsCredit}
                                        onCheckedChange={(checked) => handleDeepChange('paymentSettings', 'acceptsCredit', checked)}
                                    />
                                    <Label htmlFor="acceptsCredit">Acepta Crédito</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label>Días de Crédito (Default)</Label>
                                    <Input
                                        type="number"
                                        value={formData.paymentSettings.defaultCreditDays}
                                        onChange={(e) => handleDeepChange('paymentSettings', 'defaultCreditDays', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Límite de Crédito</Label>
                                    <Input
                                        type="number"
                                        value={formData.paymentSettings.creditLimit}
                                        onChange={(e) => handleDeepChange('paymentSettings', 'creditLimit', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-muted-foreground mb-2">Métodos de Pago Aceptados</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {PAYMENT_METHODS.map((method) => (
                                        <div key={method.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`method-${method.id}`}
                                                checked={(formData.paymentSettings.acceptedPaymentMethods || []).includes(method.id)}
                                                onCheckedChange={() => handlePaymentMethodToggle(method.id)}
                                            />
                                            <Label htmlFor={`method-${method.id}`}>{method.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {supplier ? (
                                <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                                    <h5 className="text-sm font-medium">Vincular Nuevo Producto</h5>
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <Label className="mb-2 block">Buscar Producto</Label>
                                            <SearchableSelect
                                                placeholder="Buscar por nombre o SKU..."
                                                asyncSearch={true}
                                                loadOptions={loadProductOptions}
                                                onSelection={handleProductSelect}
                                                value={selectedProductToLink ? {
                                                    value: selectedProductToLink._id,
                                                    label: `${selectedProductToLink.name} (${selectedProductToLink.sku})`,
                                                    product: selectedProductToLink
                                                } : null}
                                                isCreatable={false}
                                            />
                                        </div>
                                        {selectedProductToLink && (
                                            <>
                                                <div className="w-32">
                                                    <Label className="mb-2 block">Costo ($)</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={linkFormData.costPrice}
                                                        onChange={(e) => setLinkFormData(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <Label className="mb-2 block">SKU Prov.</Label>
                                                    <Input
                                                        value={linkFormData.supplierSku}
                                                        onChange={(e) => setLinkFormData(prev => ({ ...prev, supplierSku: e.target.value }))}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {selectedProductToLink && (
                                        <div className="flex justify-end pt-2">
                                            <Button size="sm" onClick={handleLinkProduct} disabled={linking}>
                                                {linking ? 'Vinculando...' : 'Vincular Producto'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <div className="flex justify-between items-center">
                                <h4 className="font-medium">Productos Suministrados ({linkedProducts.length})</h4>
                            </div>
                            <div className="border rounded-md overflow-hidden">
                                {supplier ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>SKU Proveedor</TableHead>
                                                <TableHead className="text-right">Costo Acordado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingProducts ? (
                                                <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando productos...</TableCell></TableRow>
                                            ) : linkedProducts.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Este proveedor no tiene productos asociados aun.</TableCell></TableRow>
                                            ) : (
                                                linkedProducts.map(product => {
                                                    // Find supplier specific cost if needed, otherwise product cost
                                                    const supplierData = product.suppliers?.find(s => s.supplierId === supplier._id || s.supplierId === supplier.id);
                                                    const displayCost = supplierData?.costPrice || product.variants?.[0]?.costPrice || 0;
                                                    const supplierSku = supplierData?.supplierSku || '-';

                                                    return (
                                                        <TableRow key={product._id}>
                                                            <TableCell className="font-medium">{product.name}</TableCell>
                                                            <TableCell><Badge variant="outline">{product.sku}</Badge></TableCell>
                                                            <TableCell>{supplierSku}</TableCell>
                                                            <TableCell className="text-right">${displayCost.toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <p>Debe guardar el proveedor antes de asociar productos.</p>
                                        <Button variant="link" onClick={() => document.querySelector('button[type="submit"]')?.click()}>
                                            Guardar Proveedor
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4 py-4">
                        <div className="space-y-4">
                            <h4 className="font-medium">Historial de Órdenes ({purchaseHistory.length})</h4>
                            <div className="border rounded-md overflow-hidden">
                                {supplier ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nro Orden</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Monto</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Calificación</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingHistory ? (
                                                <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando historial...</TableCell></TableRow>
                                            ) : purchaseHistory.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay órdenes registradas.</TableCell></TableRow>
                                            ) : (
                                                purchaseHistory.map(po => (
                                                    <TableRow key={po._id}>
                                                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                                                        <TableCell>{format(new Date(po.purchaseDate), 'dd MMM yyyy', { locale: es })}</TableCell>
                                                        <TableCell>${po.totalAmount.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={po.status === 'received' ? 'success' : po.status === 'pending' ? 'secondary' : 'default'}>
                                                                {po.status === 'received' ? 'Recibido' : po.status === 'pending' ? 'Pendiente' : po.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {po.rating ? (
                                                                <div className="flex" title={`${po.rating} estrellas`}>
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <svg
                                                                            key={star}
                                                                            className={`w-3 h-3 ${star <= po.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                        >
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                                        </svg>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <p>Guarde el proveedor para ver su historial.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
