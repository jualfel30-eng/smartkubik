import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Globe, ShoppingBag, RefreshCw, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';

const MobileStorefrontConfig = lazy(() => import('./MobileStorefrontConfig.jsx'));
const MobileStorefrontOrders = lazy(() => import('./MobileStorefrontOrders.jsx'));

const TABS = [
  { id: 'config', label: 'Mi Sitio', icon: Globe },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
];

export default function MobileStorefrontPage() {
  const [activeTab, setActiveTab] = useState('config');
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedTabs = useRef({ config: true, orders: false });

  const loadOrderCount = useCallback(async () => {
    try {
      const res = await fetchApi('/restaurant-orders?limit=100');
      const orders = res.data ?? [];
      setActiveOrderCount(
        orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
      );
    } catch {
      // silent — badge is non-critical
    }
  }, []);

  useEffect(() => {
    loadOrderCount();
  }, [loadOrderCount]);

  useEffect(() => {
    if (activeTab === 'orders') loadedTabs.current.orders = true;
  }, [activeTab]);

  const handleRefresh = () => {
    haptics.tap();
    setRefreshKey((k) => k + 1);
    loadOrderCount();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Mi sitio web</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full text-muted-foreground active:bg-muted/50 no-tap-highlight"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { haptics.tap(); setActiveTab(tab.id); }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap no-tap-highlight transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon size={14} />
                {tab.label}
                {tab.id === 'orders' && activeOrderCount > 0 && (
                  <motion.span
                    key={activeOrderCount}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                  >
                    {activeOrderCount}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        <Suspense fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }>
          {activeTab === 'config' && (
            <MobileStorefrontConfig key={`config-${refreshKey}`} />
          )}
          {activeTab === 'orders' && loadedTabs.current.orders && (
            <MobileStorefrontOrders
              key={`orders-${refreshKey}`}
              onCountChange={setActiveOrderCount}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
