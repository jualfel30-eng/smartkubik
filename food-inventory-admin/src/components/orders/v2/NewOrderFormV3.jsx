import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { fetchApi } from '@/lib/api.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { SearchableSelect } from './custom/SearchableSelect';
import { useAuth } from '@/hooks/use-auth.jsx';
import { toast } from 'sonner';
import ProductGridView from './ProductGridView';
import ProductSearchView from './ProductSearchView';
import ProductListView from './ProductListView';
import ViewSwitcher from './ViewSwitcher';
import useTenantViewPreferences from '@/hooks/useTenantViewPreferences';
import { OrderSidebar } from './OrderSidebar';
import { Scan } from 'lucide-react';

const initialOrderState = {
  customerId: '',
  customerName: '',
  customerRif: '',
  taxType: 'V',
  customerPhone: '',
  customerAddress: '',
  items: [],
  deliveryMethod: 'pickup',
  notes: '',
};

export function NewOrderFormV3({ onOrderCreated }) {
  const { crmData: customers } = useCrmContext();
  const { tenant, hasPermission } = useAuth();
  const canApplyDiscounts = hasPermission('orders_apply_discounts');
  const { preferences, setViewType } = useTenantViewPreferences();

  // Estados principales
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [newOrder, setNewOrder] = useState(initialOrderState);

  // Estados de búsqueda
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerRifInput, setCustomerRifInput] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Estados de descuentos
  const [generalDiscountPercentage, setGeneralDiscountPercentage] = useState(0);

  // ==================== CARGAR DATOS ====================

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      // Cargar inventarios
      const inventoriesResponse = await fetchApi('/inventories');
      const availableInventories = inventoriesResponse.data.filter(inv => inv.availableQuantity > 0);

      // Crear mapa de inventario
      const invMap = {};
      availableInventories.forEach(inv => {
        let productId;
        if (typeof inv.productId === 'object' && inv.productId !== null) {
          productId = inv.productId._id ? String(inv.productId._id) : String(inv.productId);
        } else {
          productId = String(inv.productId);
        }
        invMap[productId] = (invMap[productId] || 0) + (inv.availableQuantity || 0);
      });
      setInventoryMap(invMap);

      // Cargar productos
      const productsResponse = await fetchApi('/products');
      const allProducts = productsResponse.data;

      // Filtrar solo productos con stock
      const productsWithStock = allProducts.filter(product => {
        const productId = String(product._id);
        return invMap[productId] > 0;
      });

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  // ==================== HANDLERS ====================

  const handleFieldChange = (field, value) => {
    setNewOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerNameSelection = (selectedOption) => {
    if (selectedOption && !selectedOption.__isNew__) {
      const { customer } = selectedOption;
      const rifNumber = customer.rif?.replace(/^[VEJG]-/, '') || '';
      const taxType = customer.rif?.match(/^[VEJG]/)?.[0] || 'V';
      const phone = customer.phones?.[0]?.number || '';
      const address = customer.addresses?.[0]?.street || '';

      setNewOrder(prev => ({
        ...prev,
        customerId: customer._id,
        customerName: customer.name,
        customerRif: rifNumber,
        taxType: taxType,
        customerPhone: phone,
        customerAddress: address,
      }));
      setCustomerNameInput(customer.name);
      setCustomerRifInput(rifNumber);
    } else if (selectedOption?.__isNew__) {
      setNewOrder(prev => ({ ...prev, customerName: selectedOption.value, customerId: '' }));
      setCustomerNameInput(selectedOption.value);
    } else {
      setNewOrder(prev => ({ ...prev, customerName: '', customerId: '' }));
      setCustomerNameInput('');
    }
  };

  const handleCustomerRifSelection = (selectedOption) => {
    if (selectedOption && !selectedOption.__isNew__) {
      const { customer } = selectedOption;
      const rifNumber = customer.rif?.replace(/^[VEJG]-/, '') || '';
      const taxType = customer.rif?.match(/^[VEJG]/)?.[0] || 'V';

      setNewOrder(prev => ({
        ...prev,
        customerId: customer._id,
        customerName: customer.name,
        customerRif: rifNumber,
        taxType: taxType,
      }));
      setCustomerNameInput(customer.name);
      setCustomerRifInput(rifNumber);
    } else if (selectedOption?.__isNew__) {
      setNewOrder(prev => ({ ...prev, customerRif: selectedOption.value }));
      setCustomerRifInput(selectedOption.value);
    } else {
      setNewOrder(prev => ({ ...prev, customerRif: '' }));
      setCustomerRifInput('');
    }
  };

  const handleProductSelection = (selection) => {
    const { product } = selection;

    // Lógica simple: agregar producto con cantidad 1
    const newItem = {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      quantity: '1',
      unitPrice: product.variants?.[0]?.basePrice || product.sellingUnits?.[0]?.pricePerUnit || 0,
      finalPrice: product.variants?.[0]?.basePrice || product.sellingUnits?.[0]?.pricePerUnit || 0,
      unitOfMeasure: product.unitOfMeasure || 'unidad',
      ivaApplicable: product.ivaApplicable !== false,
    };

    setNewOrder(prev => {
      const existingIndex = prev.items.findIndex(item => item.productId === product._id);
      if (existingIndex >= 0) {
        // Incrementar cantidad
        const updatedItems = [...prev.items];
        const currentQty = parseFloat(updatedItems[existingIndex].quantity) || 0;
        updatedItems[existingIndex].quantity = String(currentQty + 1);
        return { ...prev, items: updatedItems };
      } else {
        // Agregar nuevo
        return { ...prev, items: [...prev.items, newItem] };
      }
    });
  };

  const handleQuantityChange = (productId, newQuantity) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      ),
    }));
  };

  const removeProduct = (productId) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId),
    }));
  };

  const handleCreateOrder = async () => {
    if (!newOrder.customerName || !newOrder.customerRif) {
      toast.error('Debes ingresar nombre y RIF del cliente');
      return;
    }

    if (newOrder.items.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }

    try {
      const payload = {
        ...newOrder,
        generalDiscountPercentage,
      };

      const response = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const createdOrder = response.data || response;
      toast.success('¡Orden creada con éxito!');

      // Reset form
      setNewOrder(initialOrderState);
      setCustomerNameInput('');
      setCustomerRifInput('');
      setProductSearchInput('');
      setGeneralDiscountPercentage(0);

      if (onOrderCreated) {
        onOrderCreated(createdOrder);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(`Error al crear la orden: ${error.message}`);
    }
  };

  // ==================== COMPUTED VALUES ====================

  const getItemQuantityValue = (item) => parseFloat(item.quantity) || 0;

  const getItemLineTotal = (item) => {
    const quantity = getItemQuantityValue(item);
    return item.finalPrice * quantity;
  };

  const totals = useMemo(() => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
    const generalDiscountAmount = (subtotal * generalDiscountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - generalDiscountAmount;
    const iva = newOrder.items.reduce((sum, item) => {
      const quantity = getItemQuantityValue(item);
      return item.ivaApplicable ? sum + (item.finalPrice * quantity * 0.16) : sum;
    }, 0);
    const ivaAfterDiscount = iva - (iva * generalDiscountPercentage) / 100;
    const total = subtotalAfterDiscount + ivaAfterDiscount;

    return {
      subtotal,
      subtotalAfterDiscount,
      generalDiscountAmount,
      iva,
      ivaAfterDiscount,
      total,
    };
  }, [newOrder.items, generalDiscountPercentage]);

  const isCreateDisabled = newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerRif;

  // ==================== OPTIONS ====================

  const customerOptions = useMemo(() => {
    return customers
      .filter(c => c.name?.toLowerCase().includes(customerNameInput.toLowerCase()))
      .slice(0, 10)
      .map(customer => ({
        value: customer._id,
        label: customer.name,
        customer: customer,
      }));
  }, [customers, customerNameInput]);

  const rifOptions = useMemo(() => {
    return customers
      .filter(c => {
        const rifNumber = c.rif?.replace(/^[VEJG]-/, '') || '';
        return rifNumber.includes(customerRifInput);
      })
      .slice(0, 10)
      .map(customer => {
        const rifNumber = customer.rif?.replace(/^[VEJG]-/, '') || '';
        return {
          value: rifNumber,
          label: `${rifNumber} - ${customer.name}`,
          customer: customer,
        };
      });
  }, [customers, customerRifInput]);

  const addressOptions = useMemo(() => {
    const addressSet = new Set();
    customers.forEach(customer => {
      customer.addresses?.forEach(addr => {
        if (addr.street) addressSet.add(addr.street);
      });
    });
    return Array.from(addressSet).map(address => ({ value: address, label: address }));
  }, [customers]);

  const getCustomerNameValue = () => {
    if (!newOrder.customerName) return null;
    const existing = customerOptions.find(opt => opt.value === newOrder.customerId);
    return existing || { value: newOrder.customerName, label: newOrder.customerName };
  };

  const getCustomerRifValue = () => {
    if (!newOrder.customerRif) return null;
    const existing = rifOptions.find(opt => opt.value === newOrder.customerRif);
    return existing || { value: newOrder.customerRif, label: newOrder.customerRif };
  };

  const getCustomerAddressValue = () => {
    if (!newOrder.customerAddress) return null;
    return { value: newOrder.customerAddress, label: newOrder.customerAddress };
  };

  // ==================== RENDER ====================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-6 mb-8">

      {/* ==================== COLUMNA IZQUIERDA ==================== */}
      <div className="space-y-6">

        {/* Datos del Cliente */}
        <Card>
          <CardContent className="p-6">
            <Label className="text-base font-semibold mb-4 block">Datos del Cliente</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RIF / C.I.</Label>
                <div className="flex items-center border border-input rounded-md">
                  <Select value={newOrder.taxType} onValueChange={(value) => handleFieldChange('taxType', value)}>
                    <SelectTrigger className="w-[70px] !h-10 !min-h-10 !py-2 rounded-l-md rounded-r-none !border-0 !border-r !border-input focus:z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V">V</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="J">J</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-grow">
                    <SearchableSelect
                      options={rifOptions}
                      onSelection={handleCustomerRifSelection}
                      onInputChange={(value) => setCustomerRifInput(value)}
                      inputValue={customerRifInput}
                      value={getCustomerRifValue()}
                      placeholder="Buscar RIF..."
                      customControlClass="flex h-10 w-full rounded-l-none rounded-r-md !border-0 bg-input-background px-3 py-2 text-sm ring-offset-background"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre o Razón Social</Label>
                <SearchableSelect
                  options={customerOptions}
                  onSelection={handleCustomerNameSelection}
                  onInputChange={(value) => setCustomerNameInput(value)}
                  inputValue={customerNameInput}
                  value={getCustomerNameValue()}
                  placeholder="Buscar cliente..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <SearchableSelect
                  options={addressOptions}
                  onSelection={(opt) => handleFieldChange('customerAddress', opt?.value || '')}
                  value={getCustomerAddressValue()}
                  placeholder="Dirección..."
                  isCreatable={true}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newOrder.customerPhone}
                  onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                  placeholder="04141234567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selección de Productos */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Seleccionar Productos</Label>
              <ViewSwitcher
                currentView={preferences.productViewType}
                onViewChange={setViewType}
              />
            </div>

            {preferences.productViewType === 'search' ? (
              <div className="space-y-3">
                <ProductSearchView
                  products={products}
                  onProductSelect={handleProductSelection}
                  isLoading={loadingProducts}
                  searchInput={productSearchInput}
                  onSearchInputChange={setProductSearchInput}
                  inventoryMap={inventoryMap}
                />

                {/* Barcode scanner */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Escanear código de barras</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      placeholder="Código de barras"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : preferences.productViewType === 'list' ? (
              <ProductListView
                products={products}
                onProductSelect={handleProductSelection}
                inventoryMap={inventoryMap}
              />
            ) : (
              <ProductGridView
                products={products}
                onProductSelect={handleProductSelection}
                gridColumns={preferences.gridColumns}
                showImages={preferences.showProductImages}
                showDescription={preferences.showProductDescription}
                enableCategoryFilter={preferences.enableCategoryFilter}
                inventoryMap={inventoryMap}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==================== COLUMNA DERECHA: ORDER SIDEBAR ==================== */}
      <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-6rem)]">
        <OrderSidebar
          customerName={newOrder.customerName}
          customerRif={newOrder.customerRif}
          taxType={newOrder.taxType}
          customerPhone={newOrder.customerPhone}
          customerAddress={newOrder.customerAddress}
          items={newOrder.items}
          itemsTableContent={(
            <div className="space-y-2 text-xs">
              {newOrder.items.map((item) => (
                <div key={item.productId} className="border-b pb-2 last:border-0 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground mt-1">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                        className="w-16 h-6 text-xs inline-block mr-2"
                        min="0"
                        step="0.01"
                      />
                      × ${item.finalPrice.toFixed(2)} = ${getItemLineTotal(item).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(item.productId)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          deliveryMethod={newOrder.deliveryMethod}
          deliveryContent={(
            <div className="text-sm">
              <Select value={newOrder.deliveryMethod} onValueChange={(value) => handleFieldChange('deliveryMethod', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup (Retiro)</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="envio_nacional">Envío Nacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          totals={totals}
          shippingCost={0}
          calculatingShipping={false}
          onCreateOrder={handleCreateOrder}
          isCreateDisabled={isCreateDisabled}
          notes={newOrder.notes}
          onNotesChange={(value) => handleFieldChange('notes', value)}
          generalDiscountPercentage={generalDiscountPercentage}
          onOpenGeneralDiscount={() => {
            const newDiscount = prompt('Ingresa el porcentaje de descuento:', generalDiscountPercentage);
            if (newDiscount !== null && !isNaN(newDiscount)) {
              setGeneralDiscountPercentage(parseFloat(newDiscount));
            }
          }}
          canApplyDiscounts={canApplyDiscounts}
        />
      </div>
    </div>
  );
}
