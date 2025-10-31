import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Combobox } from '@/components/ui/combobox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Plus, Trash2, Percent } from 'lucide-react';
import { fetchApi } from '@/lib/api.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { venezuelaData } from '@/lib/venezuela-data.js';
import { SearchableSelect } from './custom/SearchableSelect';
import { LocationPicker } from '@/components/ui/LocationPicker.jsx';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import ModifierSelector from '@/components/restaurant/ModifierSelector.jsx';
import { useAuth } from '@/hooks/use-auth.jsx';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.jsx';

const initialOrderState = {
  customerId: '',
  customerName: '',
  customerRif: '',
  taxType: 'V',
  items: [],
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

const formatDecimalString = (value, decimals = 3) => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '') || '0';
};

export function NewOrderFormV2({ onOrderCreated }) {
  const { crmData: customers, loading: contextLoading } = useCrmContext();
  const { rate: bcvRate, loading: loadingRate, error: rateError } = useExchangeRate();
  const { tenant, hasPermission } = useAuth();
  const canApplyDiscounts = hasPermission('orders_apply_discounts');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [newOrder, setNewOrder] = useState(initialOrderState);
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

  // Estados para descuentos
  const [showItemDiscountDialog, setShowItemDiscountDialog] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState(null);
  const [itemDiscountPercentage, setItemDiscountPercentage] = useState(0);
  const [itemDiscountReason, setItemDiscountReason] = useState('');
  const [showGeneralDiscountDialog, setShowGeneralDiscountDialog] = useState(false);
  const [generalDiscountPercentage, setGeneralDiscountPercentage] = useState(0);
  const [generalDiscountReason, setGeneralDiscountReason] = useState('');
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
      rateError
    });
  }, [bcvRate, loadingRate, rateError]);

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

  // Ref to prevent duplicate loading in React Strict Mode
  const hasLoadedProducts = useRef(false);

  useEffect(() => {
    const loadProducts = async () => {
      // Prevent duplicate calls in React Strict Mode
      if (hasLoadedProducts.current) {
        console.log('⏭️ [NewOrderForm] Products already loading/loaded, skipping');
        return;
      }
      hasLoadedProducts.current = true;

      try {
        setLoadingProducts(true);

        // Load ALL inventories with pagination (max 100 per request)
        let allInventories = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
          const inventoryResponse = await fetchApi(`/inventory?page=${currentPage}&limit=100`);
          const inventories = inventoryResponse.data || [];
          allInventories = [...allInventories, ...inventories];

          const pagination = inventoryResponse.pagination;
          if (pagination && currentPage < pagination.totalPages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        }

        console.log('📦 [NewOrderForm] Total inventories loaded:', allInventories.length);

        // Filter only active inventories with available quantity > 0
        const availableInventories = allInventories.filter(inv =>
          inv.isActive && inv.availableQuantity > 0
        );

        console.log('✅ [NewOrderForm] Available inventories:', availableInventories.length);

        // DEBUG: Log first inventory to see structure
        if (availableInventories.length > 0) {
          console.log('🔍 [NewOrderForm] First inventory sample:', availableInventories[0]);
          console.log('🔍 [NewOrderForm] First productId type:', typeof availableInventories[0].productId);
          console.log('🔍 [NewOrderForm] First productId value:', availableInventories[0].productId);
        }

        // Get unique product IDs from inventories (handle populated objects)
        const productIds = [...new Set(availableInventories.map(inv => {
          // Backend populates productId with full product object
          if (typeof inv.productId === 'object' && inv.productId !== null) {
            // Check if it's a populated product with _id
            if (inv.productId._id) {
              return String(inv.productId._id);
            }
            // Check if it's an ObjectId {$oid: "..."}
            if (inv.productId.$oid) {
              return inv.productId.$oid;
            }
          }
          // Fallback to string conversion
          return String(inv.productId);
        }))];

        console.log('🔑 [NewOrderForm] Unique product IDs from inventory:', productIds.length);
        console.log('🔑 [NewOrderForm] Sample product IDs:', productIds.slice(0, 5));

        // Load ALL products with pagination and rate limiting delay
        if (productIds.length > 0) {
          // Add initial delay before first products request to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

          let allProducts = [];
          let productPage = 1;
          let hasMoreProducts = true;

          while (hasMoreProducts) {
            const productsResponse = await fetchApi(`/products?page=${productPage}&limit=100`);
            const products = productsResponse.data || [];
            allProducts = [...allProducts, ...products];

            const productPagination = productsResponse.pagination;
            if (productPagination && productPage < productPagination.totalPages) {
              productPage++;
              // Add delay to avoid rate limiting (increased to 300ms)
              await new Promise(resolve => setTimeout(resolve, 300));
            } else {
              hasMoreProducts = false;
            }
          }

          console.log('📋 [NewOrderForm] Total products loaded:', allProducts.length);
          console.log('📋 [NewOrderForm] Sample product._id:', allProducts.slice(0, 5).map(p => p._id));

          // Filter only products that have inventory (convert both to strings for comparison)
          const productsWithStock = allProducts.filter(p => {
            const productIdStr = String(p._id);
            return productIds.includes(productIdStr);
          });

          console.log('🎯 [NewOrderForm] Products with stock:', productsWithStock.length);

          setProducts(productsWithStock);
        } else {
          console.log('⚠️ [NewOrderForm] No product IDs found, setting empty products');
          setProducts([]);
        }
      } catch (err) {
        console.error("❌ [NewOrderForm] Failed to fetch products with inventory:", err);
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
      promotionInfo,
    } = config;

    const finalUnitPrice = baseUnitPrice + priceAdjustment;

    setNewOrder(prev => {
      const newItem = {
        productId: product._id,
        name: product.name,
        sku: variant.sku,
        variantId: variant._id,
        variantSku: variant.sku,
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
        promotionInfo: promotionInfo || null,
        quantityEntryMode: product.isSoldByWeight ? 'quantity' : 'quantity',
        amountInput: '',
      };

      const items = [...prev.items];
      const matchIndex = items.findIndex(item =>
        item.productId === newItem.productId &&
        (item.selectedUnit || null) === (newItem.selectedUnit || null) &&
        item.variantId === newItem.variantId &&
        JSON.stringify(item.modifiers || []) === JSON.stringify(newItem.modifiers || []) &&
        (item.specialInstructions || '') === (newItem.specialInstructions || '')
      );

      if (matchIndex !== -1) {
        const existingItem = items[matchIndex];
        const existingQuantity = parseFloat(existingItem.quantity) || 0;
        const additionalQuantity = parseFloat(newItem.quantity) || 0;
        const mergedQuantity = existingQuantity + additionalQuantity;
        const quantityValue = existingItem.isSoldByWeight || existingItem.hasMultipleSellingUnits
          ? formatDecimalString(mergedQuantity)
          : String(Math.round(mergedQuantity));

        const updatedItem = {
          ...existingItem,
          quantity: quantityValue,
        };

        if (existingItem.isSoldByWeight && existingItem.quantityEntryMode === 'amount') {
          const price = getItemFinalUnitPrice(existingItem);
          const amount = price * (parseFloat(quantityValue) || 0);
          updatedItem.amountInput = amount > 0 ? amount.toFixed(2) : '';
        }

        items[matchIndex] = updatedItem;
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
    let baseUnitPrice = hasMultiUnit ? (defaultUnit?.pricePerUnit || 0) : (variant.basePrice || 0);
    const initialQuantity = hasMultiUnit ? (defaultUnit?.minimumQuantity || 1) : 1;

    // Apply promotional discount if active
    let promotionInfo = null;
    if (product.hasActivePromotion && product.promotion?.isActive) {
      const now = new Date();
      const startDate = new Date(product.promotion.startDate);
      const endDate = new Date(product.promotion.endDate);

      // Check if promotion is currently valid
      if (now >= startDate && now <= endDate) {
        const discountPercentage = product.promotion.discountPercentage || 0;
        const discountedPrice = baseUnitPrice * (1 - discountPercentage / 100);
        promotionInfo = {
          originalPrice: baseUnitPrice,
          discountPercentage,
          reason: product.promotion.reason,
        };
        baseUnitPrice = discountedPrice;
      }
    }

    const config = {
      product,
      variant,
      hasMultiUnit,
      defaultUnit,
      baseUnitPrice,
      initialQuantity,
      promotionInfo,
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
      // Modifier groups are optional (used mainly in restaurant vertical)
      // If user doesn't have permissions or feature is not enabled, just add product without modifiers
      if (error.message?.includes('permissions') || error.message?.includes('Forbidden')) {
        console.log('ℹ️ [NewOrderForm] Modifier groups not available for this tenant (expected for non-restaurant verticals)');
      } else {
        console.warn('⚠️ [NewOrderForm] Could not load modifier groups:', error.message);
      }
      // Continue normal flow - add product without modifiers
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

    const updatedItems = newOrder.items.map(item => {
      if (item.productId !== productId) {
        return item;
      }

      const nextItem = {
        ...item,
        quantity: sanitizedValue,
      };

      if (item.isSoldByWeight && item.quantityEntryMode === 'amount') {
        const price = getItemFinalUnitPrice(nextItem);
        const quantityNumeric = parseFloat(sanitizedValue) || 0;
        const amount = price * quantityNumeric;
        nextItem.amountInput = quantityNumeric > 0 && price > 0 ? amount.toFixed(2) : sanitizedValue ? '0.00' : '';
      }

      return nextItem;
    });
    setNewOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const handleItemEntryModeChange = (productId, mode) => {
    if (!mode) return;

    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.productId !== productId || !item.isSoldByWeight) {
          return item;
        }

        if (mode === 'amount') {
          const quantityNumeric = getItemQuantityValue(item);
          const price = getItemFinalUnitPrice(item);
          const initialAmount =
            quantityNumeric > 0 && price > 0 ? (quantityNumeric * price).toFixed(2) : '';
          return {
            ...item,
            quantityEntryMode: 'amount',
            amountInput: initialAmount,
          };
        }

        return {
          ...item,
          quantityEntryMode: 'quantity',
          amountInput: '',
        };
      }),
    }));
  };

  const handleItemAmountChange = (productId, newAmountStr) => {
    let sanitizedValue = newAmountStr.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) {
      return;
    }

    const updatedItems = newOrder.items.map(item => {
      if (item.productId !== productId || !item.isSoldByWeight) {
        return item;
      }

      const price = getItemFinalUnitPrice(item);
      const amountNumeric = parseFloat(sanitizedValue);
      let quantityString = item.quantity;

      if (!sanitizedValue) {
        quantityString = '';
      } else if (!Number.isNaN(amountNumeric) && price > 0) {
        const computedQuantity = amountNumeric / price;
        quantityString = formatDecimalString(computedQuantity);
      } else {
        quantityString = '0';
      }

      return {
        ...item,
        amountInput: sanitizedValue,
        quantity: quantityString,
      };
    });

    setNewOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const handleUnitChange = (productId, newUnitAbbr) => {
    const updatedItems = newOrder.items.map(item => {
      if (item.productId === productId && item.hasMultipleSellingUnits) {
        const selectedUnit = item.sellingUnits.find(u => u.abbreviation === newUnitAbbr);
        if (selectedUnit) {
          const basePrice = selectedUnit.pricePerUnit;
          const modifierAdjustment = calculateModifierAdjustment(item);
          const nextFinalPrice = basePrice + modifierAdjustment;
          let nextQuantity = selectedUnit.minimumQuantity ?? item.quantity;

          if (item.isSoldByWeight && item.quantityEntryMode === 'amount') {
            const amountNumeric = parseFloat(item.amountInput);
            if (!Number.isNaN(amountNumeric) && amountNumeric > 0 && nextFinalPrice > 0) {
              nextQuantity = formatDecimalString(amountNumeric / nextFinalPrice);
            } else if (!item.amountInput) {
              nextQuantity = '';
            } else {
              nextQuantity = '0';
            }
          }

          return {
            ...item,
            selectedUnit: selectedUnit.abbreviation,
            unitPrice: basePrice,
            finalPrice: nextFinalPrice,
            quantity: nextQuantity,
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

  // Funciones para manejar descuentos en items individuales
  const handleOpenItemDiscount = (item) => {
    setSelectedItemForDiscount(item);
    setItemDiscountPercentage(item.discountPercentage || 0);
    setItemDiscountReason(item.discountReason || '');
    setShowItemDiscountDialog(true);
  };

  const handleApplyItemDiscount = () => {
    if (!selectedItemForDiscount) return;

    if (itemDiscountPercentage < 0 || itemDiscountPercentage > 100) {
      toast.error('El descuento debe estar entre 0% y 100%');
      return;
    }

    if (itemDiscountPercentage > 0 && !itemDiscountReason) {
      toast.error('Debes proporcionar una razón para el descuento');
      return;
    }

    const updatedItems = newOrder.items.map(item => {
      if (item.productId === selectedItemForDiscount.productId) {
        const discountAmount = (item.unitPrice * itemDiscountPercentage) / 100;
        const nextFinalPrice = item.unitPrice - discountAmount;
        const updatedItem = {
          ...item,
          discountPercentage: itemDiscountPercentage,
          discountAmount: discountAmount,
          discountReason: itemDiscountReason,
          finalPrice: nextFinalPrice,
        };
        if (item.isSoldByWeight && item.quantityEntryMode === 'amount') {
          const amountNumeric = parseFloat(item.amountInput);
          if (!Number.isNaN(amountNumeric) && amountNumeric > 0 && nextFinalPrice > 0) {
            updatedItem.quantity = formatDecimalString(amountNumeric / nextFinalPrice);
          }
        }
        return updatedItem;
      }
      return item;
    });

    setNewOrder(prev => ({ ...prev, items: updatedItems }));
    setShowItemDiscountDialog(false);
    setSelectedItemForDiscount(null);
    setItemDiscountPercentage(0);
    setItemDiscountReason('');
    toast.success('Descuento aplicado correctamente');
  };

  // Funciones para manejar descuento general a la orden
  const handleOpenGeneralDiscount = () => {
    setGeneralDiscountPercentage(newOrder.generalDiscountPercentage || 0);
    setGeneralDiscountReason(newOrder.generalDiscountReason || '');
    setShowGeneralDiscountDialog(true);
  };

  const handleApplyGeneralDiscount = () => {
    if (generalDiscountPercentage < 0 || generalDiscountPercentage > 100) {
      toast.error('El descuento debe estar entre 0% y 100%');
      return;
    }

    if (generalDiscountPercentage > 0 && !generalDiscountReason) {
      toast.error('Debes proporcionar una razón para el descuento');
      return;
    }

    setNewOrder(prev => ({
      ...prev,
      generalDiscountPercentage: generalDiscountPercentage,
      generalDiscountReason: generalDiscountReason,
    }));

    setShowGeneralDiscountDialog(false);
    setGeneralDiscountPercentage(0);
    setGeneralDiscountReason('');
    toast.success('Descuento general aplicado correctamente');
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

    const payload = {
      customerId: newOrder.customerId || undefined,
      customerName: newOrder.customerName,
      customerRif: newOrder.customerRif,
      taxType: newOrder.taxType,
      items: newOrder.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        variantSku: item.variantSku,
        quantity: item.isSoldByWeight
          ? parseFloat(item.quantity) || 0
          : parseInt(item.quantity, 10) || 0,
        ...(item.selectedUnit && { selectedUnit: item.selectedUnit }),
        modifiers: item.modifiers || [],
        specialInstructions: item.specialInstructions,
        unitPrice: item.unitPrice,
        finalPrice: getItemFinalUnitPrice(item),
        ...(item.discountPercentage && {
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          discountReason: item.discountReason,
        }),
      })),
      notes: newOrder.notes,
      deliveryMethod: newOrder.deliveryMethod,
      shippingAddress: (newOrder.deliveryMethod === 'delivery' || newOrder.deliveryMethod === 'envio_nacional') && newOrder.shippingAddress.street ? newOrder.shippingAddress : undefined,
      ...(restaurantEnabled && selectedTable !== 'none' && { tableId: selectedTable }),
      subtotal: totals.subtotal,
      ivaTotal: totals.iva,
      igtfTotal: totals.igtf,
      shippingCost: totals.shipping,
      totalAmount: totals.total,
      ...(newOrder.generalDiscountPercentage && {
        generalDiscountPercentage: newOrder.generalDiscountPercentage,
        generalDiscountReason: newOrder.generalDiscountReason,
      }),
    };
    try {
      await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
      alert('¡Orden creada con éxito!');
      setNewOrder(initialOrderState);
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

    // Aplicar descuento general al subtotal
    const generalDiscountAmount = (subtotal * (newOrder.generalDiscountPercentage || 0)) / 100;
    const subtotalAfterDiscount = subtotal - generalDiscountAmount;

    const iva = newOrder.items.reduce((sum, item) => {
      if (!item.ivaApplicable) return sum;
      const quantity = getItemQuantityValue(item);
      return sum + (getItemFinalUnitPrice(item) * quantity * 0.16);
    }, 0);

    // Aplicar descuento al IVA también
    const ivaAfterDiscount = iva - (iva * (newOrder.generalDiscountPercentage || 0)) / 100;

    // IGTF will be calculated at payment confirmation time based on selected method
    const igtf = 0;

    const total = subtotalAfterDiscount + ivaAfterDiscount + igtf + shippingCost;
    return {
      subtotal,
      subtotalAfterDiscount,
      generalDiscountAmount,
      iva,
      ivaAfterDiscount,
      igtf,
      shipping: shippingCost,
      total
    };
  }, [newOrder.items, newOrder.generalDiscountPercentage, shippingCost]);

  const isCreateDisabled = newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerRif;

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
            <div className="border rounded-lg mt-4"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-24">Cant.</TableHead><TableHead className="w-32">Unidad</TableHead><TableHead>Precio Unit.</TableHead><TableHead>Total</TableHead>{canApplyDiscounts && <TableHead className="w-28 text-center">Descuentos</TableHead>}<TableHead className="w-20 text-center">Borrar</TableHead></TableRow></TableHeader><TableBody>
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
                      <div className="space-y-2">
                        {item.isSoldByWeight && (
                          <ToggleGroup
                            type="single"
                            size="sm"
                            value={item.quantityEntryMode || 'quantity'}
                            onValueChange={(value) => handleItemEntryModeChange(item.productId, value)}
                            className="justify-start"
                          >
                            <ToggleGroupItem value="quantity" aria-label="Ingresar por peso">
                              Peso
                            </ToggleGroupItem>
                            <ToggleGroupItem value="amount" aria-label="Ingresar por monto">
                              $
                            </ToggleGroupItem>
                          </ToggleGroup>
                        )}
                        {item.isSoldByWeight && item.quantityEntryMode === 'amount' ? (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.amountInput ?? ''}
                                onChange={(e) => handleItemAmountChange(item.productId, e.target.value)}
                                placeholder="Monto"
                                className="w-24 h-8 text-center"
                              />
                              <span className="ml-2 text-xs text-muted-foreground">USD</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ≈ {formatDecimalString(getItemQuantityValue(item))}{' '}
                              {item.hasMultipleSellingUnits
                                ? item.selectedUnit || item.unitOfMeasure
                                : item.unitOfMeasure}
                            </div>
                          </div>
                        ) : (
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
                      {item.promotionInfo ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through text-muted-foreground">
                              ${item.promotionInfo.originalPrice.toFixed(2)}
                            </span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${getItemFinalUnitPrice(item).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            🎉 -{item.promotionInfo.discountPercentage}% descuento
                          </div>
                        </div>
                      ) : (
                        <>
                          ${getItemFinalUnitPrice(item).toFixed(2)}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Base: ${(Number(item.unitPrice) || 0).toFixed(2)}
                            </div>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      ${(getItemFinalUnitPrice(item) * getItemQuantityValue(item)).toFixed(2)}
                      {!canApplyDiscounts && item.discountPercentage > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                          Descuento: -{item.discountPercentage}%
                        </div>
                      )}
                    </TableCell>
                    {canApplyDiscounts && (
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenItemDiscount(item)}
                            title="Aplicar descuento"
                            className="h-8 w-8"
                          >
                            <Percent className="h-4 w-4 text-blue-500" />
                          </Button>
                          {item.discountPercentage > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                              -{item.discountPercentage}%
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
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
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <div className="flex items-center gap-2">
                    <span>${totals.subtotal.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenGeneralDiscount}
                      title="Aplicar descuento general"
                      className="h-6 w-6 p-0"
                    >
                      <Percent className="h-3 w-3 text-blue-500" />
                    </Button>
                  </div>
                </div>
                {newOrder.generalDiscountPercentage > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Descuento ({newOrder.generalDiscountPercentage}%):</span>
                    <span>-${totals.generalDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>IVA (16%):</span><span>${totals.ivaAfterDiscount.toFixed(2)}</span></div>
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
                {bcvRate && (
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
                {loadingRate && !bcvRate && (
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
          <Button id="create-order-button" onClick={handleCreateOrder} disabled={isCreateDisabled} size="lg" className="bg-[#FB923C] text-white hover:bg-[#F97316] w-48">Crear Orden</Button>
        </div>
      </CardFooter>
      </Card>

      {/* Dialog para descuento en item individual */}
      <Dialog open={showItemDiscountDialog} onOpenChange={setShowItemDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Descuento al Producto</DialogTitle>
            <DialogDescription>
              {selectedItemForDiscount && `Producto: ${selectedItemForDiscount.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItemForDiscount && (
              <>
                <div className="space-y-2">
                  <Label>Precio Original</Label>
                  <div className="text-lg font-semibold">
                    ${selectedItemForDiscount.unitPrice?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-percentage">Porcentaje de Descuento (%)</Label>
                  <Input
                    id="discount-percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={itemDiscountPercentage}
                    onChange={(e) => setItemDiscountPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="Ej: 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-reason">Razón del Descuento</Label>
                  <Select value={itemDiscountReason} onValueChange={setItemDiscountReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una razón" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venta_mayor">Venta al Mayor</SelectItem>
                      <SelectItem value="cliente_frecuente">Cliente Frecuente</SelectItem>
                      <SelectItem value="promocion">Promoción</SelectItem>
                      <SelectItem value="ajuste_precio">Ajuste de Precio</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {itemDiscountPercentage > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Nuevo Precio</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${((selectedItemForDiscount.unitPrice || 0) * (1 - itemDiscountPercentage / 100)).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ahorro: ${((selectedItemForDiscount.unitPrice || 0) * itemDiscountPercentage / 100).toFixed(2)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDiscountDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyItemDiscount}>
              Aplicar Descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para descuento general a la orden */}
      <Dialog open={showGeneralDiscountDialog} onOpenChange={setShowGeneralDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Descuento General a la Orden</DialogTitle>
            <DialogDescription>
              Este descuento se aplicará al subtotal completo de la orden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subtotal Actual</Label>
              <div className="text-lg font-semibold">
                ${totals.subtotal.toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-discount-percentage">Porcentaje de Descuento (%)</Label>
              <Input
                id="general-discount-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={generalDiscountPercentage}
                onChange={(e) => setGeneralDiscountPercentage(parseFloat(e.target.value) || 0)}
                placeholder="Ej: 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-discount-reason">Razón del Descuento</Label>
              <Select value={generalDiscountReason} onValueChange={setGeneralDiscountReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una razón" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta_mayor">Venta al Mayor</SelectItem>
                  <SelectItem value="cliente_frecuente">Cliente Frecuente</SelectItem>
                  <SelectItem value="promocion">Promoción Especial</SelectItem>
                  <SelectItem value="ajuste_precio">Ajuste de Precio</SelectItem>
                  <SelectItem value="compensacion">Compensación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {generalDiscountPercentage > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Descuento:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    -${((totals.subtotal * generalDiscountPercentage) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nuevo Subtotal:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${(totals.subtotal * (1 - generalDiscountPercentage / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  * El IVA se calculará sobre el monto con descuento
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneralDiscountDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyGeneralDiscount}>
              Aplicar Descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
