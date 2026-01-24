import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { Combobox } from '@/components/ui/combobox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Plus, Trash2, Percent, Scan, ShoppingCart, List, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { fetchApi } from '@/lib/api.js';
import { useCrmContext } from '@/context/CrmContext.jsx';
import { venezuelaData } from '@/lib/venezuela-data.js';
import { SearchableSelect } from './custom/SearchableSelect';
import { LocationPicker } from '@/components/ui/LocationPicker.jsx';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import ModifierSelector from '@/components/restaurant/ModifierSelector.jsx';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { useAuth } from '@/hooks/use-auth.jsx';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.jsx';
import { BarcodeScannerDialog } from '@/components/BarcodeScannerDialog.jsx';
import { RecipeCustomizerDialog } from './RecipeCustomizerDialog.jsx';
import { ChefHat } from 'lucide-react';
import ProductGridView from './ProductGridView';
import ProductSearchView from './ProductSearchView';
import ProductListView from './ProductListView';
import ViewSwitcher from './ViewSwitcher';
import useTenantViewPreferences from '@/hooks/useTenantViewPreferences';
import { OrderSidebar } from './OrderSidebar';

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
  assignedTo: '', // Employee who attended the order
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

import { useMediaQuery } from '@/hooks/use-media-query';

export function NewOrderFormV2({ onOrderCreated, isEmbedded = false, initialCustomer = null, existingOrder = null, onOrderUpdated = null, initialTableId = null, initialWaiterId = null }) {
  const { crmData: customers } = useCrmContext();
  const [activeTab, setActiveTab] = useState('products');
  const [activeOrder, setActiveOrder] = useState(existingOrder || null);
  const [isEditMode, setIsEditMode] = useState(!!existingOrder);

  useEffect(() => {
    if (existingOrder) {
      setActiveOrder(existingOrder);
      setIsEditMode(true);
    }
  }, [existingOrder]);

  // Ref to prevent useEffect race condition when updating orders
  const previousOrderId = useRef(null);


  // Efecto para inicializar mesa (si se pasa)
  useEffect(() => {
    if (initialTableId && !existingOrder) {
      setSelectedTable(initialTableId);
    }
  }, [initialTableId, existingOrder]);

  // Efecto para inicializar mesero asignado (si se pasa desde la mesa)
  useEffect(() => {
    if (initialWaiterId && !existingOrder) {
      setNewOrder(prev => ({
        ...prev,
        assignedTo: initialWaiterId
      }));
    }
  }, [initialWaiterId, existingOrder]);

  // Efecto para inicializar con cliente (si se pasa)
  useEffect(() => {
    if (initialCustomer && !existingOrder) {
      const addr = initialCustomer.address || '';
      setNewOrder(prev => ({
        ...prev,
        customerId: initialCustomer.customerId,
        customerName: initialCustomer.name,
        customerPhone: initialCustomer.phone,
        customerRif: initialCustomer.taxId || prev.customerRif,
        taxType: initialCustomer.taxType || prev.taxType,
        customerEmail: initialCustomer.email || prev.customerEmail,
        customerAddress: addr || initialCustomer.customerAddress || prev.customerAddress,
        customerLocation: initialCustomer.location || prev.customerLocation,
        // Set delivery method to delivery if we have an address and it's from WhatsApp
        deliveryMethod: (isEmbedded && (addr || initialCustomer.customerAddress)) ? 'delivery' : prev.deliveryMethod,
      }));
      setCustomerNameInput(initialCustomer.name || '');
      if (initialCustomer.taxId) {
        setCustomerRifInput(initialCustomer.taxId);
      }
    }
  }, [initialCustomer, existingOrder]);

  // Efecto para cargar orden existente
  useEffect(() => {
    // Modified: Allow reloading if activeOrder changes (even if ID is same) to support updates (e.g. sending to kitchen)
    if (activeOrder) {
      console.log('Loading existing order into form:', activeOrder);
      setIsEditMode(true);
      previousOrderId.current = activeOrder._id;

      const itemsMapped = activeOrder.items.map(item => ({
        productId: item.productId._id || item.productId, // Handle both populated and unpopulated
        productName: item.productName || item.product?.name,
        name: item.productName || item.product?.name,
        variantId: item.variantId,
        variantSku: item.variantSku,
        sku: item.productSku,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        isSoldByWeight: false,
        selectedUnit: item.selectedUnit,
        modifiers: item.modifiers || [],
        specialInstructions: item.specialInstructions,
        removedIngredients: item.removedIngredients || [],
        ivaApplicable: true,
        discountPercentage: item.discountPercentage || 0,
        discountAmount: item.discountAmount || 0,
        discountReason: item.discountReason,
        productType: item.productType || 'standard',
        hasMultipleSellingUnits: !!item.selectedUnit,
        _id: item._id, // Critical for updates
        status: item.status || 'pending',
        addedAt: item.addedAt,
        promotionInfo: {
          discountPercentage: 0,
          originalPrice: item.unitPrice
        }
      }));

      setNewOrder({
        customerId: activeOrder.customer?._id || activeOrder.customerId || '',
        customerName: activeOrder.customerName || '',
        customerRif: activeOrder.customerRif || activeOrder.customer?.taxInfo?.taxId || '',
        taxType: activeOrder.taxType || (activeOrder.customerRif ? activeOrder.customerRif.charAt(0) : 'V'),
        customerPhone: activeOrder.customerPhone || '',
        customerAddress: activeOrder.customerAddress || (activeOrder.shippingAddress?.street ? activeOrder.shippingAddress.street : ''),
        items: itemsMapped,
        deliveryMethod: activeOrder.fulfillmentType === 'delivery_local' ? 'delivery'
          : activeOrder.fulfillmentType === 'delivery_national' ? 'envio_nacional'
            : activeOrder.fulfillmentType === 'pickup' ? 'pickup'
              : 'pickup', // Default/fallback
        notes: activeOrder.notes || '',
        shippingAddress: activeOrder.shipping?.address || {
          state: 'Carabobo',
          city: 'Valencia',
          street: '',
        },
        generalDiscountPercentage: activeOrder.generalDiscountPercentage || 0,
        generalDiscountReason: activeOrder.generalDiscountReason || '',
        customerLocation: activeOrder.shipping?.address?.coordinates ? {
          lat: activeOrder.shipping.address.coordinates.lat,
          lng: activeOrder.shipping.address.coordinates.lng,
          formattedAddress: activeOrder.shipping.address.street
        } : null,
        useExistingLocation: true,
        assignedTo: activeOrder.assignedTo?._id || activeOrder.assignedTo || '',
      });

      // CRITICAL: Restore table selection so updates don't lose the table association
      if (activeOrder.tableId) {
        setSelectedTable(activeOrder.tableId._id || activeOrder.tableId); // Handle object or string
      } else {
        setSelectedTable('none');
      }

      // Update auxiliary inputs that drive UI
      const rifValue = activeOrder.customerRif || activeOrder.customer?.taxInfo?.taxId;
      setCustomerNameInput(activeOrder.customerName || '');

      if (rifValue) {
        const parts = rifValue.split('-');
        if (parts.length > 1) {
          setCustomerRifInput(parts[1]);
        } else {
          setCustomerRifInput(rifValue);
        }
      }

      if (activeOrder.tableId) {
        setSelectedTable(activeOrder.tableId);
      }
    }
  }, [activeOrder]);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const shouldRenderMobileLayout = isEmbedded || !isDesktop;

  const { rate: bcvRate, loading: loadingRate, error: rateError } = useExchangeRate();
  const { tenant, hasPermission } = useAuth();
  const canApplyDiscounts = hasPermission('orders_apply_discounts');

  // Determine context for draft key
  const draftContext = useMemo(() => {
    if (initialTableId) return `table_${initialTableId}`;
    if (isEmbedded) return 'whatsapp';
    return 'pos';
  }, [initialTableId, isEmbedded]);

  const { saveDraft, loadDraft, clearDraft, hasDraft } = useOrderDraft(tenant?.id, draftContext);

  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  const { preferences, loading: loadingPreferences, setViewType } = useTenantViewPreferences();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [newOrder, setNewOrder] = useState(initialOrderState);
  const [municipios, setMunicipios] = useState([]);
  const [showModifierSelector, setShowModifierSelector] = useState(false);
  const [pendingProductConfig, setPendingProductConfig] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('none');
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Estados separados para los inputs de búsqueda
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerRifInput, setCustomerRifInput] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isBarcodeLookup, setIsBarcodeLookup] = useState(false);
  const [continuousScan, setContinuousScan] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // Estados para descuentos
  const [showItemDiscountDialog, setShowItemDiscountDialog] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState(null);
  const [itemDiscountPercentage, setItemDiscountPercentage] = useState(0);
  const [itemDiscountReason, setItemDiscountReason] = useState('');
  const [showGeneralDiscountDialog, setShowGeneralDiscountDialog] = useState(false);
  const [generalDiscountPercentage, setGeneralDiscountPercentage] = useState(0);
  const [generalDiscountReason, setGeneralDiscountReason] = useState('');

  // Customization state
  const [showRecipeCustomizer, setShowRecipeCustomizer] = useState(false);
  const [customizerItem, setCustomizerItem] = useState(null);

  // Payment Drawer State
  const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
  const [processingOrderData, setProcessingOrderData] = useState(null);

  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const customerSearchTimeout = useRef(null);

  // Auto-lookup customer by phone when entered manually (POS or WhatsApp fallback)
  useEffect(() => {
    // Evitar error si newOrder aún no está definido (aunque aquí debería estarlo)
    if (!newOrder) return;

    const phone = newOrder.customerPhone;

    // Solo buscar si:
    // 1. Hay un teléfono de al menos 8 dígitos
    // 2. NO estamos editando una orden existente
    // 3. NO tenemos ya un customerId asignado (para no sobrescribir selecciones manuales)
    if (!phone || phone.length < 8 || existingOrder || (newOrder.customerId && newOrder.customerId !== '')) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetchApi(`/customers?search=${encodeURIComponent(phone)}&limit=1`);
        const customers = response?.data || [];

        if (customers.length > 0) {
          const customer = customers[0];

          // Extraer RIF y tipo
          const fullRif = customer.taxInfo?.taxId || '';
          let taxType = customer.taxInfo?.taxType || 'V';
          let rifNumber = fullRif;

          if (fullRif.includes('-')) {
            const parts = fullRif.split('-');
            taxType = parts[0];
            rifNumber = parts.slice(1).join('-');
          }

          // Obtener dirección (más robusto: chequear addresses array y primaryLocation)
          const address = customer.primaryLocation?.address ||
            (customer.addresses && customer.addresses.length > 0 ? customer.addresses[0].street : '');

          setNewOrder(prev => ({
            ...prev,
            customerId: customer._id,
            customerName: customer.name,
            customerRif: rifNumber,
            taxType: taxType,
            customerAddress: address || prev.customerAddress,
            customerEmail: customer.email || prev.customerEmail,
            customerLocation: customer.primaryLocation || null,
            // Si encontramos dirección, ponemos delivery por defecto (especialmente útil para WhatsApp)
            deliveryMethod: address ? 'delivery' : prev.deliveryMethod,
          }));

          setCustomerNameInput(customer.name);
          setCustomerRifInput(rifNumber);
          toast.success(`Cliente encontrado: ${customer.name}`);
        }
      } catch (error) {
        console.error('Error in phone auto-lookup:', error);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [newOrder.customerPhone, existingOrder, newOrder.customerId]);

  // ========== DRAFT FUNCTIONALITY ==========

  // Check for draft on mount
  useEffect(() => {
    if (!existingOrder && !initialCustomer && hasDraft()) {
      const draft = loadDraft();
      if (draft) {
        setPendingDraft(draft);
        setShowDraftDialog(true);
      }
    }
  }, [existingOrder, initialCustomer, hasDraft, loadDraft]);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (existingOrder) return; // Don't save drafts when editing existing orders

    const timeoutId = setTimeout(() => {
      // Only save if there's meaningful data
      if (newOrder.items.length > 0 || newOrder.customerName || newOrder.customerRif) {
        saveDraft(newOrder);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newOrder, existingOrder, saveDraft]);

  // Draft handling functions
  const handleLoadDraft = () => {
    if (pendingDraft) {
      setNewOrder(pendingDraft);
      setShowDraftDialog(false);
      toast.success('Borrador cargado');
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
    setPendingDraft(null);
    toast.info('Borrador descartado');
  };

  const handleClearCurrentDraft = () => {
    clearDraft();
    setNewOrder(initialOrderState);
    toast.info('Orden reiniciada');
  };

  // Listen for clear-order-form event from parent component
  useEffect(() => {
    const handleClearEvent = () => {
      handleClearCurrentDraft();
    };

    document.addEventListener('clear-order-form', handleClearEvent);
    return () => document.removeEventListener('clear-order-form', handleClearEvent);
  }, []);

  // ========== END DRAFT FUNCTIONALITY ==========
  const barcodeInputRef = useRef(null);
  const lastScannedRef = useRef({ code: '', at: 0 });
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
    const handleShortcutFocus = (event) => {
      if (
        event.key?.toLowerCase() === 'b' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const tag = event.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) {
          return;
        }
        event.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcutFocus);
    return () => window.removeEventListener('keydown', handleShortcutFocus);
  }, []);

  useEffect(() => {
    const handleShortcutFocus = (event) => {
      if (
        event.key?.toLowerCase() === 'b' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        // Avoid stealing focus when typing inside inputs/textareas/selects
        const tag = event.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) {
          return;
        }
        event.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcutFocus);
    return () => window.removeEventListener('keydown', handleShortcutFocus);
  }, []);

  useEffect(() => {
    const selectedStateData = venezuelaData.find(v => v.estado === newOrder.shippingAddress.state);
    const newMunicipios = selectedStateData ? selectedStateData.municipios : [];
    setMunicipios(newMunicipios);

    const cityExists = newMunicipios.includes(newOrder.shippingAddress.city);
    if (!cityExists && newMunicipios.length > 0) {
      handleAddressChange('city', newMunicipios[0]);
    }
  }, [newOrder.shippingAddress.state, newOrder.shippingAddress.city]);

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

        // Helper for parallel fetching
        const fetchAllPages = async (baseUrl) => {
          const firstPage = await fetchApi(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=1&limit=100`);
          let allItems = firstPage.data || firstPage.products || []; // Adapt to different response structures
          const totalPages = firstPage.pagination?.totalPages || 1;

          if (totalPages > 1) {
            const promises = [];
            for (let i = 2; i <= totalPages; i++) {
              promises.push(fetchApi(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${i}&limit=100`));
            }
            const responses = await Promise.all(promises);
            responses.forEach(res => {
              if (res.data || res.products) {
                allItems = [...allItems, ...(res.data || res.products)];
              }
            });
          }
          return allItems;
        };

        // 1. Determine Vertical / Mode
        const isRestaurant = Boolean(
          tenant?.vertical === 'food-service' ||
          tenant?.settings?.vertical === 'food-service' ||
          restaurantEnabled
        );
        console.log('🏭 [NewOrderForm] Vertical Logic:', { vertical: tenant?.vertical, isRestaurant });

        // 2. Fetch DATA in Parallel
        // For Restaurants: We need ALL active products (even if no inventory record exists)
        // For Retail: We typically only need products with inventory, but fetching all and filtering is safer/consistent
        const [allActiveProducts, allInventories] = await Promise.all([
          fetchAllPages('/products?isActive=true'),
          fetchAllPages('/inventory?')
        ]);

        console.log(`📦 [NewOrderForm] Loaded ${allActiveProducts.length} Products and ${allInventories.length} Inventory Records`);

        // 3. Create Inventory Map
        const invMap = {};
        allInventories.forEach(inv => {
          let productId;
          if (typeof inv.productId === 'object' && inv.productId !== null) {
            productId = inv.productId._id ? String(inv.productId._id) : (inv.productId.$oid || String(inv.productId));
          } else {
            productId = String(inv.productId);
          }
          invMap[productId] = (invMap[productId] || 0) + (inv.availableQuantity || 0);
        });
        setInventoryMap(invMap);

        // 4. Merge and Filter
        const validProducts = allActiveProducts.filter(product => {
          const productId = String(product._id);
          const stock = invMap[productId] || 0;
          const type = product.productType || 'simple';

          // Restaurant Logic
          if (isRestaurant) {
            // HIDE Raw Materials / Supplies from POS (unless they are explicitly set as saleable, which we assume 'simple' implies)
            // We assume 'supply', 'raw_material', 'consumable' are back-of-house items not for direct sale in a restaurant POS
            if (['supply', 'raw_material', 'consumable'].includes(type) || product.isIngredient) {
              return false;
            }
            // Show EVERYTHING else active (Made-to-Order has 0 stock)
            return true;
          }

          // Retail Logic: Only show if stock > 0
          return stock > 0;
        });

        console.log(`✅ [NewOrderForm] Final Display Products: ${validProducts.length} (Filtered from ${allActiveProducts.length})`);
        setProducts(validProducts);

      } catch (err) {
        console.error("❌ [NewOrderForm] Failed to load products/inventory:", err);
        toast.error("Error al cargar productos. Por favor recargue la página.");
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [tenant, restaurantEnabled]); // Added dependencies to re-run if tenant loads late


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

  // Load employees for order assignment
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const response = await fetchApi('/payroll/employees?status=active');
        const employeeList = response.data || response || [];
        setEmployees(employeeList);
      } catch (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, []);

  // --- NUEVOS MANEJADORES DE ESTADO --- 

  const handleCustomerNameInputChange = (inputValue) => {
    setCustomerNameInput(inputValue);
    triggerCustomerSearch(inputValue);
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
    triggerCustomerSearch(inputValue);
    // Only update customerRif if user is actually typing (not when clearing after selection)
    if (inputValue) {
      setNewOrder(prev => ({
        ...prev,
        customerRif: inputValue,
        customerId: '' // Resetear ID cuando cambia el texto
      }));
    }
  };

  const triggerCustomerSearch = (term) => {
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }
    if (!term || term.length < 2) {
      setCustomerSearchResults([]);
      setIsSearchingCustomers(false);
      return;
    }
    setIsSearchingCustomers(true);
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const resp = await fetchApi(`/customers?search=${encodeURIComponent(term)}&limit=10`);
        const list = resp?.data || resp?.customers || [];
        setCustomerSearchResults(list);
      } catch (error) {
        console.error('Customer search failed:', error);
        setCustomerSearchResults([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);
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

        // Get phone and address from customer
        const phoneContact = customer.contacts && customer.contacts.length > 0
          ? customer.contacts.find(c => c.type === 'phone' || c.type === 'whatsapp')
          : null;
        const phone = phoneContact ? phoneContact.value : '';
        const address = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0].street : '';

        setNewOrder(prev => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          customerRif: rifNumber,
          taxType: taxType,
          customerPhone: phone,
          customerAddress: address,
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

        // Get phone and address from customer
        const phoneContact = customer.contacts && customer.contacts.length > 0
          ? customer.contacts.find(c => c.type === 'phone' || c.type === 'whatsapp')
          : null;
        const phone = phoneContact ? phoneContact.value : '';
        const address = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0].street : '';

        setNewOrder(prev => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          customerRif: rifNumber,
          taxType: taxType,
          customerPhone: phone,
          customerAddress: address,
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

  const handleCustomerAddressSelection = (selectedOption) => {
    if (selectedOption) {
      const addressValue = selectedOption.__isNew__ ? selectedOption.value : selectedOption.value;
      setNewOrder(prev => ({ ...prev, customerAddress: addressValue }));
    } else {
      setNewOrder(prev => ({ ...prev, customerAddress: '' }));
    }
  };

  const getCustomerAddressValue = () => {
    if (newOrder.customerAddress) {
      return { value: newOrder.customerAddress, label: newOrder.customerAddress };
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

  const addConfiguredProductToOrder = useCallback((config, { modifiers = [], specialInstructions, priceAdjustment = 0 }) => {
    if (!config) return;

    const {
      product,
      variant,
      hasMultiUnit,
      defaultUnit,
      baseUnitPrice,
      initialQuantity,
      promotionInfo,
      originalVariantPrice,
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
        baseVariantPrice: originalVariantPrice,
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
  }, []);

  const handleProductSelection = useCallback(
    async (selectedOption) => {
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
        originalVariantPrice: variant.basePrice || 0,
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
    },
    [addConfiguredProductToOrder, supportsModifiers]
  );

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

  const findProductByBarcode = useCallback(
    (code) => {
      const normalized = (code || '').trim();
      if (!normalized) return null;

      return products.find((product) => {
        const productBarcode = product.barcode ? String(product.barcode).trim() : '';
        if (productBarcode && productBarcode === normalized) {
          return true;
        }
        if (Array.isArray(product.variants)) {
          return product.variants.some((variant) => {
            const variantBarcode = variant?.barcode ? String(variant.barcode).trim() : '';
            return variantBarcode === normalized;
          });
        }
        return false;
      });
    },
    [products]
  );

  const handleBarcodeLookup = useCallback(
    async (codeValue, options = {}) => {
      const normalized = (codeValue || barcodeSearch).trim();
      if (!normalized) return;

      setIsBarcodeLookup(true);
      const productMatch = findProductByBarcode(normalized);
      try {
        if (productMatch) {
          await handleProductSelection({
            value: productMatch._id,
            label: `${productMatch.name} (${productMatch.sku || 'N/A'})`,
            product: productMatch,
          });
          setBarcodeSearch('');
          setProductSearchInput('');
          toast.success('Producto añadido por código de barras');
        } else {
          // Fallback: buscar en backend para casos en que el producto no está en el listado local
          const resp = await fetchApi(`/products/lookup/barcode/${encodeURIComponent(normalized)}`);
          const data = resp?.data || resp;
          if (data?.product) {
            const fetchedProduct = {
              ...data.product,
              variants: data.product.variants?.length
                ? data.product.variants
                : data.variant
                  ? [data.variant]
                  : [],
            };
            await handleProductSelection({
              value: fetchedProduct._id,
              label: `${fetchedProduct.name} (${fetchedProduct.sku || 'N/A'})`,
              product: fetchedProduct,
            });
            setBarcodeSearch('');
            setProductSearchInput('');
            toast.success('Producto añadido por código de barras');
          } else {
            toast.error('No se encontró un producto con ese código de barras');
          }
        }
      } catch (error) {
        console.error('Error al agregar producto escaneado:', error);
        toast.error('No se pudo agregar el producto escaneado');
      } finally {
        setIsBarcodeLookup(false);
        if (!options.keepScannerOpen) {
          setIsBarcodeScannerOpen(false);
        }
      }
    },
    [barcodeSearch, findProductByBarcode, handleProductSelection]
  );

  const handleBarcodeDetected = useCallback(
    (value) => {
      const normalized = (value || '').trim();
      if (!normalized) return;
      const now = Date.now();
      if (
        lastScannedRef.current.code === normalized &&
        now - lastScannedRef.current.at < 1200
      ) {
        return;
      }
      lastScannedRef.current = { code: normalized, at: now };
      setBarcodeSearch(normalized);
      handleBarcodeLookup(normalized, { keepScannerOpen: continuousScan }).finally(() => {
        if (!continuousScan) {
          setIsBarcodeScannerOpen(false);
        }
      });
    },
    [continuousScan, handleBarcodeLookup]
  );

  const handleBarcodeInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleBarcodeLookup();
    }
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
        // Check if newUnitAbbr matches base unit (handle both explicit value and "unidad" fallback)
        const isBaseUnit = newUnitAbbr === (item.unitOfMeasure || 'unidad');

        if (isBaseUnit) {
          const basePrice = item.promotionInfo?.originalPrice
            ? item.promotionInfo.originalPrice
            : (Number(item.baseVariantPrice) || Number(item.baseUnitPrice) || 0); // Revert to stored base price
          // Recalculate if needed
          const modifierAdjustment = calculateModifierAdjustment(item);
          const nextFinalPrice = basePrice + modifierAdjustment;
          // Use original quantity if switching back to base, or keep current
          let nextQuantity = item.quantity;


          if (item.isSoldByWeight && item.quantityEntryMode === 'amount') {
            const amountNumeric = parseFloat(item.amountInput);
            if (!Number.isNaN(amountNumeric) && amountNumeric > 0 && nextFinalPrice > 0) {
              nextQuantity = formatDecimalString(amountNumeric / nextFinalPrice);
            }
          }

          return {
            ...item,
            selectedUnit: item.unitOfMeasure || 'unidad', // Or null/undefined if you want to clear specific selection
            unitPrice: basePrice,
            finalPrice: nextFinalPrice,
            quantity: nextQuantity
          };
        }

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

  // Funciones para personalizar recetas
  const handleOpenCustomizer = (item) => {
    setCustomizerItem(item);
    setShowRecipeCustomizer(true);
  };

  const handleConfirmCustomization = (removedIngredients) => {
    if (!customizerItem) return;

    console.log('[DEBUG] Confirming customization with removedIngredients:', removedIngredients);
    setNewOrder(prev => {
      const updatedItems = prev.items.map(item => {
        if (item === customizerItem) {
          console.log('[DEBUG] Updating item with removedIngredients:', removedIngredients);
          return { ...item, removedIngredients };
        }
        return item;
      });
      console.log('[DEBUG] New items state:', updatedItems);
      return { ...prev, items: updatedItems };
    });
    setShowRecipeCustomizer(false);
    setCustomizerItem(null);
    toast.success('Ingredientes actualizados');
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

  const handleCreateOrder = async (options = { autoWizard: true, reset: true }) => {
    if (newOrder.items.length === 0) {
      alert('Agrega al menos un producto a la orden.');
      return;
    }
    if (!newOrder.customerName || !newOrder.customerRif) {
      alert('Debes proporcionar el nombre y RIF del cliente.');
      return;
    }

    // Validación para cliente nuevo sin dirección
    if (!newOrder.customerId && !newOrder.customerAddress) {
      alert('Para clientes nuevos, es obligatorio ingresar la dirección.');
      return;
    }

    const payload = {
      customerName: newOrder.customerName,
      source: 'pos',
      items: newOrder.items.map(item => {
        // Extract productId correctly (handle both populated object and direct ID)
        const productIdValue = typeof item.productId === 'object' && item.productId?._id
          ? item.productId._id
          : item.productId;

        // Ensure quantity is number
        return {
          productId: productIdValue,
          productName: item.productName,
          quantity: item.isSoldByWeight
            ? parseFloat(item.quantity) || 0
            : parseInt(item.quantity, 10) || 0,
          ...(item.selectedUnit && { selectedUnit: item.selectedUnit }),
          modifiers: item.modifiers || [],
          specialInstructions: item.specialInstructions,
          removedIngredients: item.removedIngredients || [],
          unitPrice: item.unitPrice,
          finalPrice: getItemFinalUnitPrice(item),
          ivaApplicable: item.ivaApplicable,
          ...(item.discountPercentage && {
            discountPercentage: item.discountPercentage,
            discountAmount: item.discountAmount,
            discountReason: item.discountReason,
          }),
          // Pass back preserved metadata so backend doesn't treat as new
          ...(item._id && { _id: item._id }),
          ...(item.status && { status: item.status }),
          ...(item.addedAt && { addedAt: item.addedAt }),
        };
      }),
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
      // Critical: Send customer data for persistence during creation
      customerId: newOrder.customerId || undefined,
      customerRif: newOrder.customerRif,
      taxType: newOrder.taxType,
      customerPhone: newOrder.customerPhone,
      customerEmail: newOrder.customerEmail,
      customerAddress: newOrder.customerAddress,
    };
    try {
      let response;
      let orderData;

      if (isEditMode && activeOrder) {
        // UPDATE MODE
        const updatePayload = {
          items: payload.items,
          customerRif: payload.customerRif,        // PRESERVE CUSTOMER DATA
          taxType: payload.taxType,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail, // Added email to update payload
          customerAddress: payload.customerAddress,
          subtotal: payload.subtotal,
          ivaTotal: payload.ivaTotal,
          igtfTotal: payload.igtfTotal,
          shippingCost: payload.shippingCost,
          totalAmount: payload.totalAmount,
          generalDiscountPercentage: payload.generalDiscountPercentage,
          generalDiscountReason: payload.generalDiscountReason,
          notes: payload.notes,
          tableId: payload.tableId,
        };

        response = await fetchApi(`/orders/${activeOrder._id}`, { method: 'PATCH', body: JSON.stringify(updatePayload) });
        orderData = response.data || response;
        toast.success('Orden actualizada correctamente');

        if (onOrderUpdated) {
          onOrderUpdated(orderData);
        }
      } else {
        // CREATE MODE
        response = await fetchApi('/orders', { method: 'POST', body: JSON.stringify(payload) });
        orderData = response.data || response;
        toast.success('Orden creada correctamente');

        // FIXED: Only call onOrderCreated (triggering parent modal) if autoWizard is TRUE
        // If we are just sending to kitchen (autoWizard: false), we stay in form.
        if (onOrderCreated && options.autoWizard) {
          onOrderCreated(orderData, options.autoWizard);
        }
      }

      // Reset form if creating new, but maybe keep open if editing? 
      // User specific flow: "Send to Kitchen" usually means "Save and Close" or "Save and Keep Open".
      // Let's reset for now or follow callback interaction.
      // Reset form if creating new AND reset option is true
      if (!isEditMode && options.reset !== false) {
        setNewOrder(initialOrderState);
        setCustomerNameInput('');
        setCustomerRifInput('');
        setProductSearchInput('');
        setSelectedTable('none');
      }

      return orderData; // Return data for chaining
    } catch (error) {
      console.error('Error processing order:', error);
      alert(`Error al procesar la orden: ${error.message}`);
      return null;
    }
  };

  // Función específica para "Enviar a Cocina" (Guardar/actualizar Y enviar items nuevos a cocina)
  const handleSendToKitchen = async () => {
    // Primero guarda/actualiza la orden - PERO NO ABRE WIZARD (autoWizard: false)
    // IMPORTANT: reset: false to keep form open and allow adding more items
    const savedOrder = await handleCreateOrder({ autoWizard: false, reset: false });

    if (savedOrder && savedOrder._id) {
      // Switch to Edit Mode immediately for smooth flow
      setActiveOrder(savedOrder);
      setIsEditMode(true);
      // NOTE: Removed previousOrderId.current update here to allow useEffect to re-hydrate/merge items correctly

      try {
        // Check for items that should be sent to kitchen logic
        // Only send items that have 'sendToKitchen' flag (will be filtered by backend, but we can prevent empty call)

        // Luego envía los items nuevos a cocina manualmente
        await fetchApi('/kitchen-display/send-new-items', {
          method: 'POST',
          body: JSON.stringify({ orderId: savedOrder._id }),
        });
        toast.success('Items enviados a cocina');
      } catch (error) {
        console.error('Error sending to kitchen:', error);
        toast.warning('Orden guardada pero hubo un problema enviando a cocina');
      }
    }
  };

  // Función para enviar un solo item a cocina Y persistirlo en la orden
  const handleSendSingleItemToKitchen = async (item) => {
    if (!isEditMode || !activeOrder) {
      toast.error('Debe existir una orden para enviar items individuales');
      return;
    }

    try {
      // Step 1: Persist ALL current items (including the new one) via PATCH
      const productIdValue = typeof item.productId === 'object' && item.productId?._id
        ? item.productId._id
        : item.productId;

      const updatePayload = {
        items: newOrder.items.map(i => {
          const itemProductId = typeof i.productId === 'object' && i.productId?._id
            ? i.productId._id
            : i.productId;

          return {
            productId: itemProductId,
            productName: i.productName,
            quantity: i.isSoldByWeight
              ? parseFloat(i.quantity) || 0
              : parseInt(i.quantity, 10) || 0,
            ...(i.selectedUnit && { selectedUnit: i.selectedUnit }),
            modifiers: i.modifiers || [],
            specialInstructions: i.specialInstructions,
            removedIngredients: i.removedIngredients || [],
            unitPrice: i.unitPrice,
            finalPrice: getItemFinalUnitPrice(i),
            ivaApplicable: i.ivaApplicable,
            ...(i.discountPercentage && {
              discountPercentage: i.discountPercentage,
              discountAmount: i.discountAmount,
              discountReason: i.discountReason,
            }),
            ...(i._id && { _id: i._id }),
            ...(i.status && { status: i.status }),
            ...(i.addedAt && { addedAt: i.addedAt }),
          };
        }),
        customerRif: newOrder.customerRif,
        taxType: newOrder.taxType,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail,
        customerAddress: newOrder.customerAddress,
        subtotal: totals.subtotal,
        ivaTotal: totals.iva,
        igtfTotal: totals.igtf,
        shippingCost: totals.shipping,
        totalAmount: totals.total,
        generalDiscountPercentage: newOrder.generalDiscountPercentage,
        generalDiscountReason: newOrder.generalDiscountReason,
        notes: newOrder.notes,
        ...(restaurantEnabled && selectedTable !== 'none' && { tableId: selectedTable }),
      };

      const response = await fetchApi(`/orders/${activeOrder._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });

      const updatedOrder = response.data || response;

      // Step 2: Find the newly persisted item (it will have _id now)
      const persistedItem = updatedOrder.items.find(i => {
        const iProductId = typeof i.productId === 'object' && i.productId?._id
          ? i.productId._id
          : i.productId;

        return (
          iProductId === productIdValue &&
          i.quantity === (item.isSoldByWeight ? parseFloat(item.quantity) : parseInt(item.quantity, 10)) &&
          i.specialInstructions === item.specialInstructions &&
          // Compare modifiers
          JSON.stringify(i.modifiers || []) === JSON.stringify(item.modifiers || [])
        );
      });

      if (!persistedItem || !persistedItem._id) {
        throw new Error('No se pudo encontrar el item persistido');
      }

      // Step 3: Send to kitchen using the real _id
      await fetchApi('/kitchen-display/send-single-item', {
        method: 'POST',
        body: JSON.stringify({
          orderId: updatedOrder._id,
          itemId: persistedItem._id,
          productName: item.name || item.productName,
          quantity: persistedItem.quantity,
          modifiers: (persistedItem.modifiers || []).map(m => m.name || m),
          specialInstructions: persistedItem.specialInstructions,
        }),
      });

      // Step 4: Update local state with the updated order
      setActiveOrder(updatedOrder);
      setNewOrder({
        ...newOrder,
        items: updatedOrder.items.map(i => ({
          ...i,
          productId: typeof i.productId === 'object' ? i.productId._id : i.productId,
          name: i.productName,
        })),
      });

      // Step 5: Notify parent if callback exists
      if (onOrderUpdated) {
        onOrderUpdated(updatedOrder);
      }

      toast.success(`"${item.name || item.productName}" enviado a cocina y agregado a la cuenta`);
    } catch (error) {
      console.error('Error sending single item to kitchen:', error);
      toast.error('Error al enviar item a cocina');
    }
  };

  const handlePayOrder = async () => {
    // Guardar y abrir wizard (autoWizard: true)
    const savedOrder = await handleCreateOrder({ autoWizard: true });
    if (savedOrder) {
      // Clear draft after successful order creation
      clearDraft();

      // Si estamos en modo edición (mesas) y damos "Pagar/Cerrar",
      // forzamos la llamada a onOrderCreated para que el padre abra el Wizard de Pagos inmediatamente
      if (isEditMode && onOrderCreated) {
        onOrderCreated(savedOrder, true);
      } else {
        setProcessingOrderData(savedOrder);
        setIsProcessingDrawerOpen(true);
      }
    }
  };

  const customerOptions = useMemo(() => {
    const source =
      customerSearchResults.length > 0 ? customerSearchResults : customers;
    return source.map(customer => ({
      value: customer._id,
      label: `${customer.name} - ${customer.taxInfo?.taxId || 'N.A.'}`,
      customer: customer,
    }));
  }, [customers, customerSearchResults]);

  const rifOptions = useMemo(() => {
    const source =
      customerSearchResults.length > 0 ? customerSearchResults : customers;
    return source
      .filter(customer => customer.taxInfo?.taxId)
      .map(customer => ({
        value: customer.taxInfo.taxId,
        label: customer.taxInfo.taxId,
        customer: customer,
      }));
  }, [customers, customerSearchResults]);

  const addressOptions = useMemo(() => {
    const addressSet = new Set();
    customers.forEach(customer => {
      if (customer.addresses && customer.addresses.length > 0) {
        customer.addresses.forEach(addr => {
          if (addr.street) {
            addressSet.add(addr.street);
          }
        });
      }
    });
    return Array.from(addressSet).map(address => ({
      value: address,
      label: address,
    }));
  }, [customers]);

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

  // Helper function to render items table for sidebar
  const renderItemsTable = () => {
    if (newOrder.items.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">No hay productos</p>;
    }

    return (
      <div className="space-y-2">
        {newOrder.items.map((item, index) => {
          const quantity = getItemQuantityValue(item);
          const unitPrice = getItemFinalUnitPrice(item);
          const itemTotal = quantity * unitPrice;

          return (
            <div key={item._id || `${item.productId}-${index}`} className="flex justify-between items-start text-sm border-b pb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {quantity} x ${unitPrice.toFixed(2)}
                </p>
              </div>
              <p className="font-semibold ml-2">${itemTotal.toFixed(2)}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to render full items table with all controls
  const renderFullItemsTable = () => {
    if (newOrder.items.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-8">
          No hay productos agregados
        </div>
      );
    }

    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="w-24">Cant.</TableHead>
              <TableHead className="w-32">Unidad</TableHead>
              <TableHead>Precio Unit.</TableHead>
              <TableHead>Total</TableHead>
              {canApplyDiscounts && <TableHead className="w-28 text-center">Descuentos</TableHead>}
              {isEditMode && existingOrder && tenant?.vertical === 'FOOD_SERVICE' && <TableHead className="w-24 text-center">Cocina</TableHead>}
              <TableHead className="w-20 text-center">Borrar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newOrder.items.map((item, index) => (
              <TableRow key={item._id || `${item.productId}-${index}`}>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="font-medium truncate max-w-[180px] cursor-help">
                          {item.name}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px] cursor-help">
                          {item.sku}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{item.sku}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {item.hasMultipleSellingUnits && (
                    <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">Multi-unidad</div>
                  )}

                  {/* BOTÓN PERSONALIZAR (Solo si es restaurante/comida y no es supply) */}
                  {restaurantEnabled && !['supply', 'raw_material'].includes(item.productType) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 mt-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => handleOpenCustomizer(item)}
                      title="Personalizar Ingredientes"
                    >
                      <ChefHat className="h-3 w-3 mr-1" />
                      <span className="text-[10px]">Personalizar</span>
                    </Button>
                  )}

                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <div className="text-xs text-red-500 mt-1 font-medium">
                      ❌ Sin: {item.removedIngredients.length} ingrediente(s)
                    </div>
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
                        {(!item.hasMultipleSellingUnits || !item.sellingUnits || item.sellingUnits.length === 0) && (
                          <SelectItem value={item.unitOfMeasure || 'unidad'}>
                            {item.unitOfMeasure || 'UD'}
                          </SelectItem>
                        )}
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
                {isEditMode && existingOrder && tenant?.vertical === 'FOOD_SERVICE' && (
                  <TableCell className="text-center">
                    {!item._id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendSingleItemToKitchen(item)}
                        className="text-xs h-7 px-2"
                      >
                        📨 Enviar
                      </Button>
                    ) : (
                      <span className="text-xs text-green-600">✓ En cocina</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => removeProductFromOrder(item.productId)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Helper function to render delivery content for sidebar
  const renderDeliveryContent = () => {
    if (newOrder.deliveryMethod === 'pickup') {
      return <p className="text-sm">Retiro en tienda</p>;
    }

    if (newOrder.deliveryMethod === 'delivery') {
      if (newOrder.customerLocation?.formattedAddress) {
        return <p className="text-sm">{newOrder.customerLocation.formattedAddress}</p>;
      }
      return <p className="text-sm text-muted-foreground">Ubicación pendiente</p>;
    }

    if (newOrder.deliveryMethod === 'envio_nacional') {
      const { street, city, state } = newOrder.shippingAddress;
      if (street) {
        return <p className="text-sm">{street}, {city}, {state}</p>;
      }
      return <p className="text-sm text-muted-foreground">Dirección pendiente</p>;
    }

    return null;
  };

  return (
    <>
      {/* Draft confirmation dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrador encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes una orden sin terminar. ¿Deseas continuar donde lo dejaste?
              {pendingDraft && (
                <div className="mt-2 text-sm space-y-1">
                  <p>• {pendingDraft.items?.length || 0} items</p>
                  {pendingDraft.customerName && <p>• Cliente: {pendingDraft.customerName}</p>}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadDraft}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {shouldRenderMobileLayout ? (
        /* MOBILE / EMBEDDED LAYOUT (Single Column with Tabs) */
        <div className="h-full flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-4 pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products" className="gap-2">
                  <List className="h-4 w-4" />
                  Productos
                </TabsTrigger>
                <TabsTrigger value="order" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orden ({newOrder.items.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="products" className="flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden">
              {/* Products View embedded content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Búsqueda</Label>
                  <ViewSwitcher
                    currentView={preferences.productViewType}
                    onViewChange={setViewType}
                  />
                </div>

                {preferences.productViewType === 'search' ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex-grow min-w-0">
                      <ProductSearchView
                        products={products}
                        onProductSelect={handleProductSelection}
                        isLoading={loadingProducts}
                        searchInput={productSearchInput}
                        onSearchInputChange={(value) => setProductSearchInput(value)}
                        inventoryMap={inventoryMap}
                      />
                    </div>
                    <div className="flex w-full flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">Escanear</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={barcodeSearch}
                          onChange={(e) => setBarcodeSearch(e.target.value)}
                          placeholder="Código..."
                          className="flex-1 h-9 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setIsBarcodeScannerOpen(true)}
                        >
                          <Scan className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9"
                          onClick={() => handleBarcodeLookup()}
                          disabled={!barcodeSearch.trim()}
                        >
                          <Plus className="h-4 w-4" />
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
                    gridColumns={2} // Force 2 cols for narrow view
                    showImages={preferences.showProductImages}
                    showDescription={false} // Hide description to save space
                    enableCategoryFilter={preferences.enableCategoryFilter}
                    inventoryMap={inventoryMap}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="order" className="flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden">
              {/* Customer Data Section */}
              <div className="space-y-4 border rounded-lg p-3 bg-card/50">
                <Label className="text-sm font-semibold">Cliente</Label>
                <div className="space-y-3">
                  {/* Tax Type + RIF + Customer Name in same row */}
                  <div className="flex gap-2">
                    <Select value={newOrder.taxType} onValueChange={(value) => handleFieldChange('taxType', value)}>
                      <SelectTrigger className="w-[65px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="J">J</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        options={rifOptions}
                        onSelection={handleCustomerRifSelection}
                        onInputChange={handleCustomerRifInputChange}
                        inputValue={customerRifInput}
                        value={getCustomerRifValue()}
                        placeholder="RIF..."
                        isLoading={isSearchingCustomers}
                        customControlClass="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        options={customerOptions}
                        onSelection={handleCustomerNameSelection}
                        onInputChange={handleCustomerNameInputChange}
                        inputValue={customerNameInput}
                        value={getCustomerNameValue()}
                        placeholder="Nombre..."
                        isLoading={isSearchingCustomers}
                        customControlClass="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      />
                    </div>
                  </div>

                  {/* NUEVOS CAMPOS DE CONTACTO PARA MÓVIL/EMBEDDED */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newOrder.customerPhone || ''}
                      onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                      placeholder="Teléfono"
                      className="h-9 text-sm"
                    />
                    <Input
                      type="email"
                      value={newOrder.customerEmail || ''}
                      onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                      placeholder="Email"
                      className="h-9 text-sm"
                    />
                  </div>
                  <SearchableSelect
                    options={addressOptions}
                    onSelection={handleCustomerAddressSelection}
                    value={getCustomerAddressValue()}
                    placeholder="Dirección..."
                    isCreatable={true}
                    onInputChange={(val) => {
                      if (val && val !== newOrder.customerAddress) {
                        handleFieldChange('customerAddress', val);
                      }
                    }}
                    customControlClass="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  />
                </div>
              </div>

              {/* Order Items Summary */}
              <OrderSidebar
                customerName={newOrder.customerName}
                customerRif={`${newOrder.taxType}-${newOrder.customerRif}`}
                taxType={newOrder.taxType}
                customerPhone={newOrder.customerPhone}
                customerAddress={newOrder.customerAddress}
                items={newOrder.items}
                itemsTableContent={renderItemsTable()}
                fullItemsTable={renderFullItemsTable()}
                deliveryMethod={newOrder.deliveryMethod}
                deliveryContent={renderDeliveryContent()}
                totals={totals}
                shippingCost={shippingCost}
                calculatingShipping={calculatingShipping}
                bcvRate={bcvRate}
                loadingRate={loadingRate}
                onCreateOrder={handlePayOrder}
                isCreateDisabled={isCreateDisabled}
                notes={newOrder.notes}
                onNotesChange={(value) => handleFieldChange('notes', value)}
                handleFieldChange={handleFieldChange}
                generalDiscountPercentage={newOrder.generalDiscountPercentage}
                onOpenGeneralDiscount={canApplyDiscounts ? handleOpenGeneralDiscount : undefined}
                canApplyDiscounts={canApplyDiscounts}
                isEmbedded={true}
                onSendToKitchen={tenant?.vertical === 'FOOD_SERVICE' ? handleSendToKitchen : undefined}
                isEditMode={isEditMode}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* DESKTOP / FULLSCREEN LAYOUT (Flexible 2 Columns) */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(400px,45%)] gap-4 mb-8 lg:h-[calc(100vh-12rem)]">
          {/* LEFT COLUMN - Products ONLY - Independent scroll */}
          <div className="space-y-6 lg:overflow-y-auto lg:pr-2">
            {/* Products Section */}
            <div className="p-4 border rounded-lg space-y-4 bg-card">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Productos</Label>
                <ViewSwitcher
                  currentView={preferences.productViewType}
                  onViewChange={setViewType}
                />
              </div>

              {preferences.productViewType === 'search' ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex-grow min-w-0">
                    <ProductSearchView
                      products={products}
                      onProductSelect={handleProductSelection}
                      isLoading={loadingProducts}
                      searchInput={productSearchInput}
                      onSearchInputChange={(value) => setProductSearchInput(value)}
                      inventoryMap={inventoryMap}
                    />
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-[360px]">
                    <Label className="text-sm text-muted-foreground">Escanear / código de barras</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={barcodeSearch}
                        onChange={(e) => setBarcodeSearch(e.target.value)}
                        onKeyDown={handleBarcodeInputKeyDown}
                        ref={barcodeInputRef}
                        placeholder="Escanea aquí o pega el código"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsBarcodeScannerOpen(true)}
                        title="Escanear con cámara"
                      >
                        <Scan className="h-4 w-4" />
                        <span className="sr-only">Abrir escáner</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBarcodeLookup()}
                        disabled={!barcodeSearch.trim()}
                      >
                        Agregar
                      </Button>
                      <Button
                        type="button"
                        variant={continuousScan ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          const next = !continuousScan;
                          setContinuousScan(next);
                          setIsBarcodeScannerOpen(next);
                          if (next) {
                            barcodeInputRef.current?.focus();
                          }
                        }}
                        title="Modo escáner continuo (mantiene cámara abierta)"
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        {continuousScan ? "Escáner activo" : "Escáner en vivo"}
                      </Button>
                    </div>
                    {isBarcodeLookup && (
                      <span className="text-xs text-blue-600 dark:text-blue-300">Buscando producto por código...</span>
                    )}
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
            </div>
          </div>

          {/* RIGHT COLUMN - Customer/Delivery sections + OrderSidebar - Independent scroll */}
          <div className="space-y-4 lg:overflow-y-auto lg:pl-2">
            {/* Customer Data Section */}
            <div className="p-4 border rounded-lg space-y-4 bg-card">
              <Label className="text-base font-semibold">Datos del Cliente</Label>
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
                        onInputChange={handleCustomerRifInputChange}
                        inputValue={customerRifInput}
                        value={getCustomerRifValue()}
                        placeholder="Escriba para buscar RIF..."
                        isLoading={isSearchingCustomers}
                        customControlClass="flex h-10 w-full rounded-l-none rounded-r-md !border-0 bg-input-background px-3 py-2 text-sm ring-offset-background"
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
                    placeholder="Escriba para buscar cliente..."
                    isLoading={isSearchingCustomers}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  <Input
                    id="customerPhone"
                    value={newOrder.customerPhone || ''}
                    onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                    placeholder="04141234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Correo Electrónico</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newOrder.customerEmail || ''}
                    onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                    placeholder="cliente@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Dirección</Label>
                <SearchableSelect
                  options={addressOptions}
                  onSelection={handleCustomerAddressSelection}
                  value={getCustomerAddressValue()}
                  placeholder="Escriba la dirección o seleccione..."
                  isCreatable={true}
                  onInputChange={(val) => {
                    // Update address directly as user types if it's text input
                    if (val && val !== newOrder.customerAddress) {
                      handleFieldChange('customerAddress', val);
                    }
                  }}
                />
              </div>

              {/* Employee Selector */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Atendido Por</Label>
                <Select
                  value={newOrder.assignedTo || 'unassigned'}
                  onValueChange={(value) => handleFieldChange('assignedTo', value === 'unassigned' ? '' : value)}
                  disabled={loadingEmployees}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder={loadingEmployees ? "Cargando empleados..." : "Seleccione empleado..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.customer?.name || emp.name || 'Sin Nombre'} {emp.position ? `- ${emp.position}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Empleado responsable de atender esta orden
                </p>
              </div>
            </div>

            {/* Location Picker - if delivery */}
            {newOrder.deliveryMethod === 'delivery' && (
              <div className="p-4 border rounded-lg space-y-4 bg-card">
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

            {/* Shipping Address - if envio_nacional */}
            {newOrder.deliveryMethod === 'envio_nacional' && (
              <div className="p-4 border rounded-lg space-y-4 bg-card">
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

            {/* Restaurant Tables - if enabled */}
            {restaurantEnabled && (
              <div className="p-4 border rounded-lg space-y-4 bg-card">
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

            {/* Order Summary - OrderSidebar */}
            <OrderSidebar
              customerName={newOrder.customerName}
              customerRif={`${newOrder.taxType}-${newOrder.customerRif}`}
              taxType={newOrder.taxType}
              customerPhone={newOrder.customerPhone}
              customerAddress={newOrder.customerAddress}
              items={newOrder.items}
              itemsTableContent={renderItemsTable()}
              fullItemsTable={renderFullItemsTable()}
              deliveryMethod={newOrder.deliveryMethod}
              deliveryContent={renderDeliveryContent()}
              totals={totals}
              shippingCost={shippingCost}
              calculatingShipping={calculatingShipping}
              bcvRate={bcvRate}
              loadingRate={loadingRate}
              onCreateOrder={handlePayOrder}
              isCreateDisabled={isCreateDisabled}
              notes={newOrder.notes}
              onNotesChange={(value) => handleFieldChange('notes', value)}
              handleFieldChange={handleFieldChange}
              generalDiscountPercentage={newOrder.generalDiscountPercentage}
              onOpenGeneralDiscount={canApplyDiscounts ? handleOpenGeneralDiscount : undefined}
              canApplyDiscounts={canApplyDiscounts}
              // Only pass onSendToKitchen if it's a restaurant, enabling the 2-button layout
              onSendToKitchen={tenant?.vertical === 'FOOD_SERVICE' ? handleSendToKitchen : undefined}
              isEditMode={isEditMode}
            />
          </div>
        </div>
      )}

      <BarcodeScannerDialog
        open={isBarcodeScannerOpen}
        onOpenChange={setIsBarcodeScannerOpen}
        onDetected={handleBarcodeDetected}
        autoClose={!continuousScan}
        description="Escanea con la cámara o usa tu lector USB; añadiremos el producto si hay coincidencia."
      />

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
                    type="text"
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
                type="text"
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
      {/* Dialog para personalizar receta */}
      <RecipeCustomizerDialog
        open={showRecipeCustomizer}
        onOpenChange={setShowRecipeCustomizer}
        product={customizerItem}
        initialRemovedIngredients={customizerItem?.removedIngredients || []}
        onConfirm={handleConfirmCustomization}
      />

      {/* Payment Processing Drawer */}
      {processingOrderData && (
        <OrderProcessingDrawer
          open={isProcessingDrawerOpen}
          onOpenChange={setIsProcessingDrawerOpen}
          order={processingOrderData}
          fullScreen={false}
          onOrderUpdated={(updated) => {
            // If order updated in drawer (e.g. paid), update local state or notify parent
            if (onOrderUpdated) onOrderUpdated(updated);
            // Optionally close drawer if status is final? 
            // OrderProcessingDrawer handles its own flow.
          }}
        />
      )}
    </>
  );
}
