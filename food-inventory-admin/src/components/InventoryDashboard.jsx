import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProductsManagementWithTabs from '@/components/ProductsManagementWithTabs.jsx';
import InventoryManagement from '@/components/InventoryManagement.jsx';
import ComprasManagement from '@/components/ComprasManagement.jsx';
import WarehousesAndBinsManager from '@/components/WarehousesAndBinsManager.jsx';
import InventoryMovementsPanel from '@/components/InventoryMovementsPanel.jsx';
import InventoryAlertsPanel from '@/components/InventoryAlertsPanel.jsx';
import SuppliersManagement from '@/components/SuppliersManagement.jsx';
import InventoryReportsPanel from '@/components/InventoryReportsPanel.jsx';
import TransferOrdersPanel from '@/components/TransferOrdersPanel.jsx';
import InventoryHeaderSection from '@/components/inventory/InventoryHeaderSection.jsx';
import InventoryModuleCards from '@/components/inventory/InventoryModuleCards.jsx';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { useVerticalKey } from '@/hooks/useVerticalConfig.js';
import { fetchApi } from '@/lib/api';
import { DUR, EASE, SPRING } from '@/lib/motion';

// URL compatibility
const TAB_COMPAT = {
  'warehouses': 'inventory-warehouses',
};

const PRODUCT_SUB_TABS = ['products', 'raw-materials', 'consumables', 'supplies', 'pricing-engine', 'dedup'];

// Map any tab to its parent module card
function getModuleForTab(tab) {
  if (PRODUCT_SUB_TABS.includes(tab)) return 'productos';
  if (['inventory', 'inventory-warehouses'].includes(tab)) return 'inventario';
  if (['inventory-movements', 'transfers'].includes(tab)) return 'movimientos';
  if (['purchases', 'suppliers', 'inventory-alerts'].includes(tab)) return 'compras';
  if (tab === 'inventory-reports') return 'reportes';
  return null;
}

// Module labels for breadcrumb
const MODULE_LABELS = {
  productos: 'Productos',
  inventario: 'Inventario',
  movimientos: 'Movimientos',
  compras: 'Compras',
  reportes: 'Reportes',
};

// Module selector options for the dropdown navigator
const MODULE_SELECTOR = [
  { id: 'productos', label: 'Productos', icon: Package, defaultTab: 'products' },
  { id: 'inventario', label: 'Inventario', icon: Warehouse, defaultTab: 'inventory' },
  { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight, defaultTab: 'inventory-movements' },
  { id: 'compras', label: 'Compras', icon: ShoppingCart, defaultTab: 'purchases' },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, defaultTab: 'inventory-reports' },
];

// Sub-navigation config for modules with multiple sections
const MODULE_SUB_NAV = {
  inventario: [
    { tab: 'inventory', label: 'Stock' },
    // inventory-warehouses added dynamically if enabled
  ],
  movimientos: [
    { tab: 'inventory-movements', label: 'Movimientos' },
    // transfers added dynamically if enabled
  ],
  compras: [
    { tab: 'purchases', label: 'Compras' },
    { tab: 'suppliers', label: 'Proveedores' },
    { tab: 'inventory-alerts', label: 'Alertas' },
  ],
};

export default function InventoryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const raw = searchParams.get('tab');
    if (!raw) return null; // null = show cards landing
    return TAB_COMPAT[raw] || raw;
  });
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const multiLocationEnabled = flags.MULTI_LOCATION;
  const verticalKey = useVerticalKey();
  const isBeautyProfile = ['barbershop-salon', 'clinic-spa'].includes(verticalKey);
  const showWarehouses = multiWarehouseEnabled && !isBeautyProfile;

  // KPI state
  const [kpiData, setKpiData] = useState({ products: 0, value: 0, lowStock: 0, pendingPOs: 0, inTransit: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  // Sync activeTab from URL
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw) {
      const mapped = TAB_COMPAT[raw] || raw;
      if (mapped !== activeTab) setActiveTab(mapped);
    }
  }, [searchParams, activeTab]);

  // Deep-link from notification: ?productId= forces the inventory tab
  const highlightProductId = searchParams.get('productId');
  useEffect(() => {
    if (highlightProductId && activeTab !== 'inventory') {
      setActiveTab('inventory');
    }
  }, [highlightProductId, activeTab]);

  // Navigate to a tab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  // Go back to cards landing
  const handleBackToCards = () => {
    setActiveTab(null);
    setSearchParams({}, { replace: true });
  };

  // Fetch KPI data
  const fetchKPIs = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [prodRes, alertRes, poRes, toRes] = await Promise.allSettled([
        fetchApi('/products?limit=1'),
        fetchApi('/inventory-alerts?limit=1'),
        fetchApi('/purchases?status=pending&limit=1'),
        fetchApi('/transfer-orders?status=in_transit&limit=1'),
      ]);
      setKpiData({
        products: prodRes.status === 'fulfilled' ? (prodRes.value?.pagination?.total || 0) : 0,
        value: 0,
        lowStock: alertRes.status === 'fulfilled' ? (alertRes.value?.pagination?.total || 0) : 0,
        pendingPOs: poRes.status === 'fulfilled' ? (poRes.value?.pagination?.total || 0) : 0,
        inTransit: toRes.status === 'fulfilled' ? (toRes.value?.pagination?.total || 0) : 0,
      });
    } catch {
      // Keep defaults
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { fetchKPIs(); }, [fetchKPIs]);

  // KPI card click
  const handleKPIClick = (key) => {
    const map = { products: 'products', value: 'inventory', lowStock: 'inventory-alerts', pendingPOs: 'purchases', inTransit: 'transfers' };
    if (map[key]) handleTabChange(map[key]);
  };

  // Current module
  const currentModule = activeTab ? getModuleForTab(activeTab) : null;

  // Build sub-nav for current module
  const getSubNav = () => {
    if (!currentModule) return null;
    const base = MODULE_SUB_NAV[currentModule];
    if (!base) return null;

    const items = [...base];
    if (currentModule === 'inventario' && showWarehouses) {
      items.push({ tab: 'inventory-warehouses', label: 'Almacenes' });
    }
    if (currentModule === 'movimientos' && multiLocationEnabled) {
      items.push({ tab: 'transfers', label: 'Traslados' });
    }
    // Only show sub-nav if module has 2+ sections
    return items.length > 1 ? items : null;
  };

  const subNav = getSubNav();

  return (
    <div className="space-y-5">
      {/* Header: KPIs + Search + Quick Actions */}
      <InventoryHeaderSection
        kpiData={kpiData}
        kpiLoading={kpiLoading}
        onKPIClick={handleKPIClick}
        onNavigateToTab={handleTabChange}
        onAddInventory={() => handleTabChange('inventory')}
        onReceivePO={() => handleTabChange('purchases')}
        onNewPO={() => handleTabChange('purchases')}
        onNewTransfer={() => handleTabChange('transfers')}
        pendingPOCount={kpiData.pendingPOs}
        multiLocationEnabled={multiLocationEnabled}
      />

      {/* Main content area */}
      <AnimatePresence mode="wait">
        {!activeTab ? (
          /* ─── Cards Landing ─── */
          <motion.div
            key="cards-landing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            <InventoryModuleCards
              onSelectModule={handleTabChange}
              kpiData={kpiData}
              showWarehouses={showWarehouses}
              multiLocationEnabled={multiLocationEnabled}
            />
          </motion.div>
        ) : (
          /* ─── Module Content ─── */
          <motion.div
            key={`module-${currentModule || activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            {/* Module navigator: dropdown + sub-nav pills */}
            <div className="flex items-center gap-3 mb-4">
              {/* Module selector dropdown — lateral navigation between modules */}
              <Select
                value={currentModule || ''}
                onValueChange={(moduleId) => {
                  if (moduleId === '__cards__') {
                    handleBackToCards();
                    return;
                  }
                  const mod = MODULE_SELECTOR.find(m => m.id === moduleId);
                  if (mod) handleTabChange(mod.defaultTab);
                }}
              >
                <SelectTrigger className="w-[200px] h-9 gap-2">
                  <SelectValue>
                    {(() => {
                      const mod = MODULE_SELECTOR.find(m => m.id === currentModule);
                      if (!mod) return 'Seleccionar modulo';
                      const Icon = mod.icon;
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {mod.label}
                        </span>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Back to cards option */}
                  <SelectItem value="__cards__">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <LayoutGrid className="h-4 w-4" />
                      Ver todos los modulos
                    </span>
                  </SelectItem>
                  {/* Module options */}
                  {MODULE_SELECTOR.map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <SelectItem key={mod.id} value={mod.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {mod.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Sub-navigation pills (only if module has 2+ sections) */}
              {subNav && (
                <div className="flex items-center gap-1 border-l border-border/50 pl-3">
                  {subNav.map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => handleTabChange(item.tab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === item.tab
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Module content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.fast, ease: EASE.out }}
              >
                {PRODUCT_SUB_TABS.includes(activeTab) && (
                  <ProductsManagementWithTabs activeSubTab={activeTab} />
                )}
                {activeTab === 'inventory' && <InventoryManagement highlightProductId={highlightProductId} />}
                {activeTab === 'inventory-movements' && <InventoryMovementsPanel />}
                {activeTab === 'inventory-alerts' && <InventoryAlertsPanel />}
                {activeTab === 'inventory-reports' && <InventoryReportsPanel />}
                {activeTab === 'inventory-warehouses' && showWarehouses && <WarehousesAndBinsManager />}
                {activeTab === 'purchases' && <ComprasManagement />}
                {activeTab === 'suppliers' && <SuppliersManagement />}
                {activeTab === 'transfers' && multiLocationEnabled && <TransferOrdersPanel />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
