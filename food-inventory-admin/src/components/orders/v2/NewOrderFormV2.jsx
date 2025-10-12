import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SearchableSelect } from './custom/SearchableSelect';
import { MixedPaymentDialog } from './MixedPaymentDialog';
import { LocationPicker } from '@/components/ui/LocationPicker.jsx';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import ModifierSelector from '@/components/restaurant/ModifierSelector.jsx';
import { useAuth } from '@/hooks/use-auth.jsx';

const initialOrderState = {
  customerId: '',
  customerName: '',
  customerRif: '',
  taxType: 'V',
  items: [],
  paymentMethod: '',
  deliveryMethod: 'pickup',
  notes: '',
  customerLocation: null,
  useExistingLocation: true,
  shippingAddress: {
    state: 'Carabobo',
    city: 'Valencia',
    street: '',
  },
};

export function NewOrderFormV2({ onOrderCreated }) {
  const { crmData: customers, paymentMethods, loading: contextLoading } = useCrmContext();
  const { rate: bcvRate, loading: loadingRate, error: rateError } = useExchangeRate();
  const { tenant } = useAuth();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [newOrder, setNewOrder] = useState(initialOrderState);
  const [isMixedPaymentModalOpen, setIsMixedPaymentModalOpen] = useState(false);
  const [mixedPaymentData, setMixedPaymentData] = useState(null);
  const [municipios, setMunicipios] = useState([]);
  const [showModifierSelector, setShowModifierSelector] = useState(false);
  const [pendingProductConfig, setPendingProductConfig] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('none');

  // Estados separados para los inputs de búsqueda
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerRifInput, setCustomerRifInput] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const restaurantEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay
  );
  const supportsModifiers = Boolean(
    restaurantEnabled ||
    tenant?.enabledModules?.retail ||
    tenant?.enabledModules?.variants
  );
  const calculateModifierAdjustment = (item) =>
    (item?.modifiers || []).reduce(
      (sum, mod) => sum + ((mod.priceAdjustment || 0) * (mod.quantity || 1)),
      0
    );
  const getItemQuantityValue = (item) => parseFloat(item.quantity) || 0;
  const getItemFinalUnitPrice = (item) =>
    (typeof item.finalPrice === 'number' ? item.finalPrice : undefined) ??
    (typeof item.unitPrice === 'number' ? item.unitPrice : 0);

  // Debug: verificar tasa de cambio
  useEffect(() => {
    console.log('🔄 Exchange Rate Debug:', {
      bcvRate,
      loadingRate,
      rateError,
      paymentMethod: newOrder.paymentMethod,
      isVES: newOrder.paymentMethod?.toLowerCase().includes('_ves')
    });
  }, [bcvRate, loadingRate, rateError, newOrder.paymentMethod]);

  // Calculate shipping cost when delivery method, location, or order amount changes
  useEffect(() => {
    const calculateShipping = async () => {
      if (newOrder.deliveryMethod === 'pickup') {
        setShippingCost(0);
        return;
      }

      if (newOrder.deliveryMethod === 'delivery' && !newOrder.customerLocation?.coordinates) {
        setShippingCost(0);
        return;
      }

      if (newOrder.deliveryMethod === 'envio_nacional' && !newOrder.shippingAddress?.state) {
        setShippingCost(0);
        return;
      }

      setCalculatingShipping(true);
      try {
        const subtotal = newOrder.items.reduce((sum, item) => {
          const quantity = getItemQuantityValue(item);
          return sum + (getItemFinalUnitPrice(item) * quantity);
        }, 0);
        const iva = newOrder.items.reduce((sum, item) =>
          item.ivaApplicable ? sum + (getItemFinalUnitPrice(item) * getItemQuantityValue(item) * 0.16) : sum, 0);
        const orderAmount = subtotal + iva;

        const payload = {
          method: newOrder.deliveryMethod,
          orderAmount,
          ...(newOrder.deliveryMethod === 'delivery' && {
            customerLocation: newOrder.customerLocation.coordinates
          }),
          ...(newOrder.deliveryMethod === 'envio_nacional' && {
            destinationState: newOrder.shippingAddress.state,
            destinationCity: newOrder.shippingAddress.city,
          }),
        };

        const result = await fetchApi('/delivery/calculate', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setShippingCost(result.cost || 0);
      } catch (error) {
        console.error('Error calculating shipping:', error);
        setShippingCost(0);
      } finally {
        setCalculatingShipping(false);
      }
    };

    calculateShipping();
  }, [
    newOrder.deliveryMethod,
    newOrder.customerLocation,
    newOrder.shippingAddress.state,
    newOrder.shippingAddress.city,
    newOrder.items,
  ]);

  useEffect(() => {
    const selectedStateData = venezuelaData.find(v => v.estado === newOrder.shippingAddress.state);
    const newMunicipios = selectedStateData ? selectedStateData.municipios : [];
    setMunicipios(newMunicipios);

    const cityExists = newMunicipios.includes(newOrder.shippingAddress.city);
    if (!cityExists && newMunicipios.length > 0) {
      handleAddressChange('city', newMunicipios[0]);
    }
  }, [newOrder.shippingAddress.state]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const data = await fetchApi('/products');
        setProducts(data.data || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const loadAvailableTables = useCallback(async () => {
    try {
      const response = await fetchApi('/tables');
      const data = response.data || response;
      if (Array.isArray(data)) {
        const availableTables = data.filter((table) =>
          ['available', 'reserved'].includes(table.status)
        );
        setTables(availableTables);
      } else {
        setTables([]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
    }
  }, []);

  useEffect(() => {
    if (!restaurantEnabled) {
      setTables([]);
      setSelectedTable('none');
      return;
    }
    loadAvailableTables();
  }, [restaurantEnabled, loadAvailableTables]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !newOrder.paymentMethod) {
      const defaultMethod = paymentMethods.find(pm => pm.id !== 'pago_mixto');
      if (defaultMethod) {
        setNewOrder(prev => ({ ...prev, paymentMethod: defaultMethod.id }));
      }
    }
  }, [paymentMethods, newOrder.paymentMethod]);

  // --- NUEVOS MANEJADORES DE ESTADO --- 

  const handleCustomerNameInputChange = (inputValue) => {
    setCustomerNameInput(inputValue);
    // Only update customerName if user is actually typing (not when clearing after selection)
    if (inputValue) {
      setNewOrder(prev => ({
        ...prev,
        customerName: inputValue,
        customerId: '' // Resetear ID cuando cambia el texto
      }));
    }
  };

  const handleCustomerRifInputChange = (inputValue) => {
    setCustomerRifInput(inputValue);
    // Only update customerRif if user is actually typing (not when clearing after selection)
    if (inputValue) {
      setNewOrder(prev => ({
        ...prev,
        customerRif: inputValue,
        customerId: '' // Resetear ID cuando cambia el texto
      }));
    }
  };

  const handleCustomerNameSelection = (selectedOption) => {
    if (selectedOption) {
      if (selectedOption.__isNew__) {
        setNewOrder(prev => ({ ...prev, customerName: selectedOption.label, customerId: '', customerLocation: null, useExistingLocation: false }));
      } else {
        const { customer } = selectedOption;
        // Extract tax type and RIF number from taxId (format could be "V-12345678" or just "12345678")
        const fullRif = customer.taxInfo?.taxId || '';
        let taxType = customer.taxInfo?.taxType || 'V';
        let rifNumber = fullRif;

        // If taxId contains a dash, split it
        if (fullRif.includes('-')) {
          const parts = fullRif.split('-');
          taxType = parts[0];
          rifNumber = parts.slice(1).join('-');
        }

        setNewOrder(prev => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          customerRif: rifNumber,
          taxType: taxType,
          customerLocation: customer.primaryLocation || null,
          useExistingLocation: !!customer.primaryLocation
        }));
      }
    } else {
      setNewOrder(prev => ({ ...prev, customerName: '', customerId: '', customerLocation: null, useExistingLocation: false }));
    }
  };

  const handleCustomerRifSelection = (selectedOption) => {
    if (selectedOption) {
      if (selectedOption.__isNew__) {
        // When creating new, selectedOption.label is just the number without prefix
        setNewOrder(prev => ({ ...prev, customerRif: selectedOption.label, customerId: '', customerLocation: null, useExistingLocation: false }));
      } else {
        const { customer } = selectedOption;
        // Extract tax type and RIF number from taxId (format could be "V-12345678" or just "12345678")
        const fullRif = customer.taxInfo?.taxId || '';
        let taxType = customer.taxInfo?.taxType || 'V';
        let rifNumber = fullRif;

        // If taxId contains a dash, split it
        if (fullRif.includes('-')) {
          const parts = fullRif.split('-');
          taxType = parts[0];
          rifNumber = parts.slice(1).join('-');
        }

        setNewOrder(prev => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          customerRif: rifNumber,
          taxType: taxType,
          customerLocation: customer.primaryLocation || null,
          useExistingLocation: !!customer.primaryLocation
        }));
      }
    } else {
      setNewOrder(prev => ({ ...prev, customerRif: '', customerId: '', customerLocation: null, useExistingLocation: false }));
    }
  };

  const getCustomerNameValue = () => {
    if (newOrder.customerId && newOrder.customerName) {
      return { value: newOrder.customerId, label: newOrder.customerName };
    }
    if (newOrder.customerName) { // If there's a name but no ID (i.e., user is typing a new name)
      return { value: newOrder.customerName, label: newOrder.customerName };
    }
    return null;
  };

  const getCustomerRifValue = () => {
    if (newOrder.customerRif) { // Show value even if not associated with ID yet
      // Construct the full RIF display with tax type prefix
      const fullRifDisplay = `${newOrder.taxType}-${newOrder.customerRif}`;
      return {
        value: newOrder.customerId || newOrder.customerRif,
        label: fullRifDisplay
      };
    }
    return null;
  };

  // --- FIN DE NUEVOS MANEJADORES ---

  const handleFieldChange = (field, value) => {
    setNewOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setNewOrder(prev => ({ 
        ...prev, 
        shippingAddress: { ...prev.shippingAddress, [field]: value } 
    }));
  };

  const addConfiguredProductToOrder = (config, { modifiers = [], specialInstructions, priceAdjustment = 0 }) => {
    if (!config) return;

    const {
      product,
      variant,
      hasMultiUnit,
      defaultUnit,
      baseUnitPrice,
      initialQuantity,
    } = config;

    const finalUnitPrice = baseUnitPrice + priceAdjustment;

    setNewOrder(prev => {
      const newItem = {
        productId: product._id,
        name: product.name,
        sku: variant.sku,
        quantity: initialQuantity,
        unitPrice: baseUnitPrice,
        finalPrice: finalUnitPrice,
        modifiers,
        specialInstructions,
        ivaApplicable: product.ivaApplicable,
        igtfExempt: product.igtfExempt,
        isSoldByWeight: product.isSoldByWeight,
        unitOfMeasure: product.unitOfMeasure,
        hasMultipleSellingUnits: hasMultiUnit,
        sellingUnits: hasMultiUnit ? product.sellingUnits : null,
        selectedUnit: hasMultiUnit ? defaultUnit?.abbreviation : null,
      };

      const items = [...prev.items];
      const matchIndex = items.findIndex(item =>
        item.productId === newItem.productId &&
        (item.selectedUnit || null) === (newItem.selectedUnit || null) &&
        JSON.stringify(item.modifiers || []) === JSON.stringify(newItem.modifiers || []) &&
        (item.specialInstructions || '') === (newItem.specialInstructions || '')
      );

      if (matchIndex !== -1) {
        const existingQuantity = parseFloat(items[matchIndex].quantity) || 0;
        items[matchIndex] = {
          ...items[matchIndex],
          quantity: existingQuantity + newItem.quantity,
        };
      } else {
        items.push(newItem);
      }

      return { ...prev, items };
    });
  };

  const handleProductSelection = async (selectedOption) => {
    if (!selectedOption) return;
    const product = selectedOption.product;
    if (!product) return;
    const variant = product.variants?.[0];
    if (!variant) {
        alert(`El producto seleccionado (${product.name}) no tiene variantes configuradas y no se puede añadir.`);
        return;
    }
    const hasMultiUnit = product.hasMultipleSellingUnits && product.sellingUnits?.length > 0;
    const defaultUnit = hasMultiUnit ? product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0] : null;
    const baseUnitPrice = hasMultiUnit ? (defaultUnit?.pricePerUnit || 0) : (variant.basePrice || 0);
    const initialQuantity = hasMultiUnit ? (defaultUnit?.minimumQuantity || 1) : 1;

    const config = {
      product,
      variant,
      hasMultiUnit,
      defaultUnit,
      baseUnitPrice,
      initialQuantity,
    };

    setPendingProductConfig(config);

    if (!supportsModifiers) {
      addConfiguredProductToOrder(config, { modifiers: [], specialInstructions: undefined, priceAdjustment: 0 });
      setProductSearchInput('');
      setPendingProductConfig(null);
      return;
    }

    try {
      const groups = await fetchApi(`/modifier-groups/product/${product._id}`);
      if (Array.isArray(groups) && groups.length > 0) {
        setShowModifierSelector(true);
        setProductSearchInput('');
      } else {
        addConfiguredProductToOrder(config, { modifiers: [], specialInstructions: undefined, priceAdjustment: 0 });
        setProductSearchInput('');
        setPendingProductConfig(null);
      }
    } catch (error) {
      console.error('Error loading modifiers:', error);
      addConfiguredProductToOrder(config, { modifiers: [], specialInstructions: undefined, priceAdjustment: 0 });
      setProductSearchInput('');
      setPendingProductConfig(null);
    }
  };

  const handleModifierClose = () => {
    setShowModifierSelector(false);
    setPendingProductConfig(null);
  };

  const handleModifierConfirm = ({ modifiers = [], specialInstructions, priceAdjustment = 0 }) => {
    if (!pendingProductConfig) {
      handleModifierClose();
      return;
    }

    addConfiguredProductToOrder(pendingProductConfig, { modifiers, specialInstructions, priceAdjustment });
    setProductSearchInput('');
    handleModifierClose();
  };

  const handleItemQuantityChange = (productId, newQuantityStr, isSoldByWeight) => {
    let sanitizedValue;
    if (isSoldByWeight) {
      sanitizedValue = newQuantityStr.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
        return;
      }
    } else {
      sanitizedValue = newQuantityStr.replace(/[^0-9]/g, '');
    }

    const updatedItems = newOrder.items.map(item =>
      item.productId === productId ? { ...item, quantity: sanitizedValue } : item
    );
    setNewOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const handleUnitChange = (productId, newUnitAbbr) => {
    const updatedItems = newOrder.items.map(item => {
      if (item.productId === productId && item.hasMultipleSellingUnits) {
        const selectedUnit = item.sellingUnits.find(u => u.abbreviation === newUnitAbbr);
        if (selectedUnit) {
          return {
            ...item,
            selectedUnit: selectedUnit.abbreviation,
            unitPrice: selectedUnit.pricePerUnit,
            finalPrice: selectedUnit.pricePerUnit + calculateModifierAdjustment(item),
            quantity: selectedUnit.minimumQuantity || item.quantity,
          };
        }
      }
      return item;
    });
    setNewOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const removeProductFromOrder = (productId) => {
    setNewOrder(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) }));
  };

  const handlePaymentMethodChange = (value) => {
    if (value === 'pago_mixto') {
      const subtotal = newOrder.items.reduce((sum, item) => {
        const quantity = getItemQuantityValue(item);
        return sum + (getItemFinalUnitPrice(item) * quantity);
      }, 0);
      const iva = newOrder.items.reduce((sum, item) => {
        if (!item.ivaApplicable) return sum;
        const quantity = getItemQuantityValue(item);
        return sum + (getItemFinalUnitPrice(item) * quantity * 0.16);
      }, 0);
      const totalForModal = subtotal + iva;
      if (totalForModal <= 0) {
        alert("Añada productos a la orden antes de definir un pago mixto.");
        return;
      }
      setIsMixedPaymentModalOpen(true);
    } else {
      setNewOrder(prev => ({ ...prev, paymentMethod: value }));
      setMixedPaymentData(null);
    }
  };

  const handleSaveMixedPayment = (data) => {
    setMixedPaymentData(data);
    setNewOrder(prev => ({ ...prev, paymentMethod: 'pago_mixto' }));
    setIsMixedPaymentModalOpen(false);
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

    let paymentsPayload = [];
    if (mixedPaymentData) {
      paymentsPayload = mixedPaymentData.payments.map(p => ({
        amount: Number(p.amount),
        method: p.method,
        date: new Date().toISOString(),
        reference: p.reference,
      }));
    }

    const payload = {
      customerId: newOrder.customerId || undefined,
      customerName: newOrder.customerName,
      customerRif: newOrder.customerRif,
      taxType: newOrder.taxType,
      items: newOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.isSoldByWeight
          ? parseFloat(item.quantity) || 0
          : parseInt(item.quantity, 10) || 0,
        ...(item.selectedUnit && { selectedUnit: item.selectedUnit }),
        modifiers: item.modifiers || [],
        specialInstructions: item.specialInstructions,
        unitPrice: item.unitPrice,
        finalPrice: getItemFinalUnitPrice(item),
      })),
      ...(paymentsPayload.length > 0 && { payments: paymentsPayload }),
      notes: newOrder.notes,
      deliveryMethod: newOrder.deliveryMethod,
      shippingAddress: (newOrder.deliveryMethod === 'delivery' || newOrder.deliveryMethod === 'envio_nacional') && newOrder.shippingAddress.street ? newOrder.shippingAddress : undefined,
      ...(restaurantEnabled && selectedTable !== 'none' && { tableId: selectedTable }),
      subtotal: totals.subtotal,
      ivaTotal: totals.iva,
      igtfTotal: totals.igtf,
      shippingCost: totals.shipping,
      totalAmount: totals.total,
    };
    try {
      await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
      alert('¡Orden creada con éxito!');
      setNewOrder(initialOrderState);
      setMixedPaymentData(null);
      setCustomerNameInput('');
      setCustomerRifInput('');
      setProductSearchInput('');
      setSelectedTable('none');
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(`Error al crear la orden: ${error.message}`);
    }
  };

  const customerOptions = useMemo(() =>
    customers.map(customer => ({
      value: customer._id,
      label: `${customer.name} - ${customer.taxInfo?.taxId || 'N.A.'}`,
      customer: customer,
    })),[customers]);

  const rifOptions = useMemo(() =>
    customers
      .filter(customer => customer.taxInfo?.taxId)
      .map(customer => ({
        value: customer.taxInfo.taxId,
        label: customer.taxInfo.taxId,
        customer: customer,
      })),[customers]);

  const productOptions = useMemo(() => 
    products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` })), 
  [products]);

  const totals = useMemo(() => {
    const subtotal = newOrder.items.reduce((sum, item) => {
      const quantity = getItemQuantityValue(item);
      return sum + (getItemFinalUnitPrice(item) * quantity);
    }, 0);
    const iva = newOrder.items.reduce((sum, item) => {
      if (!item.ivaApplicable) return sum;
      const quantity = getItemQuantityValue(item);
      return sum + (getItemFinalUnitPrice(item) * quantity * 0.16);
    }, 0);
    
    let igtf = 0;
    if (mixedPaymentData) {
      igtf = mixedPaymentData.igtf;
    } else {
      const selectedPayMethod = paymentMethods.find(m => m.id === newOrder.paymentMethod);
      const appliesIgtf = selectedPayMethod?.igtfApplicable || false;
      if (appliesIgtf) {
        const igtfBase = newOrder.items.reduce((sum, item) => {
          if (item.igtfExempt) return sum;
          const quantity = getItemQuantityValue(item);
          return sum + (getItemFinalUnitPrice(item) * quantity);
        }, 0);
        igtf = igtfBase * 0.03;
      }
    }

    const total = subtotal + iva + igtf + shippingCost;
    return { subtotal, iva, igtf, shipping: shippingCost, total };
  }, [newOrder.items, newOrder.paymentMethod, paymentMethods, mixedPaymentData, shippingCost]);

  const isCreateDisabled = newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerRif || !newOrder.paymentMethod;

  return (
    <>
      {supportsModifiers && showModifierSelector && pendingProductConfig && (
        <ModifierSelector
          product={{
            _id: pendingProductConfig.product._id,
            name: pendingProductConfig.product.name,
            price: pendingProductConfig.baseUnitPrice,
          }}
          onClose={handleModifierClose}
          onConfirm={handleModifierConfirm}
        />
      )}
      <Card className="mb-8">
      <MixedPaymentDialog 
        isOpen={isMixedPaymentModalOpen}
        onClose={() => setIsMixedPaymentModalOpen(false)}
        totalAmount={totals.subtotal + totals.iva}
        onSave={handleSaveMixedPayment}
      />
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg space-y-4">
          <Label className="text-base font-semibold">Datos del Cliente</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>RIF / C.I.</Label>
              <div className="flex items-center gap-1">
                <div className="w-[70px] flex-shrink-0">
                  <Select value={newOrder.taxType} onValueChange={(value) => handleFieldChange('taxType', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V">V</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="J">J</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-grow">
                  <SearchableSelect
                    options={rifOptions}
                    onSelection={handleCustomerRifSelection}
                    onInputChange={handleCustomerRifInputChange}
                    inputValue={customerRifInput}
                    value={getCustomerRifValue()}
                    placeholder="Buscar o crear RIF..."
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre o Razón Social</Label>
              <SearchableSelect
                options={customerOptions}
                onSelection={handleCustomerNameSelection}
                onInputChange={handleCustomerNameInputChange}
                inputValue={customerNameInput}
                value={getCustomerNameValue()}
                placeholder="Escriba o seleccione un cliente..."
              />
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-4">
          <Label className="text-base font-semibold">Método de Entrega</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Select value={newOrder.deliveryMethod} onValueChange={(value) => handleFieldChange('deliveryMethod', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione método..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup (Retiro en tienda)</SelectItem>
                  <SelectItem value="delivery">Delivery (Entrega local)</SelectItem>
                  <SelectItem value="envio_nacional">Envío Nacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {restaurantEnabled && (
          <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Mesa (Opcional)</Label>
            <Select value={selectedTable} onValueChange={(value) => setSelectedTable(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una mesa disponible..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin mesa asignada</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table._id} value={table._id}>
                    Mesa {table.tableNumber} · {table.section} · {table.maxCapacity} personas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tables.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay mesas disponibles en este momento.
              </p>
            )}
          </div>
        )}

        {newOrder.deliveryMethod === 'delivery' && (
          <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Ubicación de Entrega</Label>

            {newOrder.customerLocation && newOrder.customerId && newOrder.useExistingLocation && (
              <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Ubicación guardada del cliente
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewOrder(prev => ({ ...prev, useExistingLocation: false }))}
                  >
                    Cambiar ubicación
                  </Button>
                </div>
                {newOrder.customerLocation.formattedAddress && (
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    {newOrder.customerLocation.formattedAddress}
                  </p>
                )}
              </div>
            )}

            {(!newOrder.useExistingLocation || !newOrder.customerLocation || !newOrder.customerId) && (
              <div>
                <LocationPicker
                  label="Selecciona la ubicación en el mapa"
                  value={newOrder.customerLocation}
                  onChange={(location) => setNewOrder(prev => ({ ...prev, customerLocation: location }))}
                />
                {!newOrder.customerId && newOrder.customerLocation && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✓ Esta ubicación se guardará automáticamente en el perfil del cliente
                  </p>
                )}
                {newOrder.customerId && newOrder.customerLocation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setNewOrder(prev => ({ ...prev, useExistingLocation: true }))}
                  >
                    Usar ubicación guardada
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {newOrder.deliveryMethod === 'envio_nacional' && (
          <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Dirección de Entrega Nacional</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Textarea
                  value={newOrder.shippingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Ej: Av. Bolívar, Edificio ABC, Piso 1, Apto 1A"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label>Municipio / Ciudad</Label>
                  <Select value={newOrder.shippingAddress.city} onValueChange={(v) => handleAddressChange('city', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {municipios.map((m, index) => <SelectItem key={`${m}-${index}`} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Productos</Label>
            <div className="flex space-x-2">
                <div className="flex-grow min-w-0">
                  <SearchableSelect
                    options={products.map(p => ({
                      value: p._id,
                      label: `${p.name} (${p.sku || 'N/A'})`,
                      product: p,
                    }))}
                    onSelection={handleProductSelection}
                    inputValue={productSearchInput}
                    onInputChange={(value) => setProductSearchInput(value)}
                    value={null}
                    placeholder={loadingProducts ? "Cargando productos..." : "Buscar y añadir producto..."}
                    isDisabled={loadingProducts}
                  />
                </div>
            </div>
            <div className="border rounded-lg mt-4"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-24">Cant.</TableHead><TableHead className="w-32">Unidad</TableHead><TableHead>Precio Unit.</TableHead><TableHead>Total</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>
              {newOrder.items.length > 0 ? (
                newOrder.items.map(item => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      {item.name}
                      <div className="text-sm text-muted-foreground">{item.sku}</div>
                      {item.hasMultipleSellingUnits && (
                        <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">Multi-unidad</div>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                          {item.modifiers.map((mod, index) => {
                            const adjustment = (Number(mod.priceAdjustment) || 0) * (mod.quantity || 1);
                            return (
                              <div key={`${mod.modifierId || mod.name}-${index}`} className="flex items-center gap-1">
                                <span>• {mod.name}{mod.quantity > 1 ? ` x${mod.quantity}` : ''}</span>
                                {adjustment !== 0 && (
                                  <span>
                                    ({adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-xs text-orange-600 dark:text-orange-300 italic mt-2">
                          ⚠ {item.specialInstructions}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Input
                          type="text"
                          inputMode={item.isSoldByWeight || item.hasMultipleSellingUnits ? "decimal" : "numeric"}
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(item.productId, e.target.value, item.isSoldByWeight || item.hasMultipleSellingUnits)}
                          className="w-20 h-8 text-center"
                        />
                        {!item.hasMultipleSellingUnits && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.unitOfMeasure}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.hasMultipleSellingUnits && item.sellingUnits ? (
                        <Select
                          value={item.selectedUnit}
                          onValueChange={(value) => handleUnitChange(item.productId, value)}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.sellingUnits.filter(u => u.isActive !== false).map((unit) => (
                              <SelectItem key={unit.abbreviation} value={unit.abbreviation}>
                                {unit.name} ({unit.abbreviation})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      ${getItemFinalUnitPrice(item).toFixed(2)}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Base: ${(Number(item.unitPrice) || 0).toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>${(getItemFinalUnitPrice(item) * getItemQuantityValue(item)).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="6" className="text-center">
                    No hay productos en la orden
                  </TableCell>
                </TableRow>
              )}
            </TableBody></Table></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea id="notes" value={newOrder.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} placeholder="Instrucciones especiales, detalles de entrega, etc." />
            </div>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>${totals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA (16%):</span><span>${totals.iva.toFixed(2)}</span></div>
                {totals.igtf > 0 && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-300">
                    <span>IGTF (3%):</span><span>${totals.igtf.toFixed(2)}</span>
                  </div>
                )}
                {totals.shipping > 0 && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-300">
                    <span>Envío:</span>
                    <span>
                      {calculatingShipping ? 'Calculando...' : `$${totals.shipping.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total:</span><span>${totals.total.toFixed(2)}</span></div>
                {bcvRate && newOrder.paymentMethod && newOrder.paymentMethod.toLowerCase().includes('_ves') && (
                  <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tasa BCV:</span>
                      <span>1 USD = {bcvRate.toFixed(2)} Bs</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-green-600">
                      <span>Total en Bolívares:</span>
                      <span>{(totals.total * bcvRate).toFixed(2)} Bs</span>
                    </div>
                  </div>
                )}
                {loadingRate && !bcvRate && newOrder.paymentMethod && newOrder.paymentMethod.toLowerCase().includes('_ves') && (
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    Cargando tasa de cambio...
                  </div>
                )}
              </div>
              {/* Payment selector moved to footer for desktop */}
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end items-center pt-6 gap-4">
        {/* Mobile layout */}
        <div className="sm:hidden w-full space-y-2">
            <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select value={newOrder.paymentMethod} onValueChange={handlePaymentMethodChange} disabled={contextLoading}>
                    <SelectTrigger><SelectValue placeholder="Forma de Pago" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}</SelectContent>
                </Select>
            </div>
            <Button onClick={handleCreateOrder} disabled={isCreateDisabled} size="lg" className="bg-[#FB923C] text-white hover:bg-[#F97316] w-full">Crear Orden</Button>
            <Button
              variant="outline"
              onClick={() => {
                setNewOrder(initialOrderState);
                setSelectedTable('none');
              }}
              className="w-full"
            >
              Limpiar Formulario
            </Button>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:flex justify-end items-center gap-2 w-full">
          <Button
            variant="outline"
            onClick={() => {
              setNewOrder(initialOrderState);
              setSelectedTable('none');
            }}
            className="w-auto"
          >
            Limpiar Formulario
          </Button>
          <Select value={newOrder.paymentMethod} onValueChange={handlePaymentMethodChange} disabled={contextLoading}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Forma de Pago" /></SelectTrigger>
              <SelectContent>{paymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}</SelectContent>
          </Select>
          <Button id="create-order-button" onClick={handleCreateOrder} disabled={isCreateDisabled} size="lg" className="bg-[#FB923C] text-white hover:bg-[#F97316] w-48">Crear Orden</Button>
        </div>
      </CardFooter>
      </Card>
    </>
  );
}
