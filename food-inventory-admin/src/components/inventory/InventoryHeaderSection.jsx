/**
 * InventoryHeaderSection.jsx
 * Module header: title + universal search + KPI cards + quick actions.
 * Renders above the tab bar in InventoryDashboard.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { DUR, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import InventoryKPICards from './InventoryKPICards';
import InventoryQuickActions from './InventoryQuickActions';
import DailyStreak from './DailyStreak';

// ─── Universal Search ────────────────────────────────────────────
function UniversalSearch({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const [prodRes, suppRes, poRes] = await Promise.allSettled([
        fetchApi(`/products?search=${encodeURIComponent(q)}&limit=5`),
        fetchApi(`/suppliers?search=${encodeURIComponent(q)}&limit=5`),
        fetchApi(`/purchase-orders?search=${encodeURIComponent(q)}&limit=5`),
      ]);

      const products = prodRes.status === 'fulfilled'
        ? (prodRes.value?.data || prodRes.value || []).slice(0, 5)
        : [];
      const suppliers = suppRes.status === 'fulfilled'
        ? (suppRes.value?.data || suppRes.value || []).slice(0, 5)
        : [];
      const orders = poRes.status === 'fulfilled'
        ? (poRes.value?.data || poRes.value || []).slice(0, 5)
        : [];

      setResults({ products, suppliers, orders });
    } catch {
      setResults({ products: [], suppliers: [], orders: [] });
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    if (type === 'product') onNavigate?.('products', { search: item.name || item.sku });
    else if (type === 'supplier') onNavigate?.('suppliers', { search: item.name || item.tradeName });
    else if (type === 'order') onNavigate?.('purchases', { search: item.orderNumber });
  };

  const hasResults = results && (results.products.length || results.suppliers.length || results.orders.length);
  const noResults = results && !hasResults && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Buscar productos, proveedores, ordenes... (⌘K)"
          className="pl-9 pr-8 h-9 bg-card border-border/50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (hasResults || noResults || searching) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className="absolute top-full mt-1 w-full bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {searching && (
              <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
            )}
            {noResults && !searching && (
              <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados para "{query}"</div>
            )}
            {hasResults && !searching && (
              <div className="max-h-72 overflow-y-auto">
                {results.products.length > 0 && (
                  <ResultGroup
                    title={`Productos (${results.products.length})`}
                    items={results.products}
                    getLabel={(p) => p.name}
                    getSub={(p) => p.sku}
                    onSelect={(p) => handleSelect('product', p)}
                  />
                )}
                {results.suppliers.length > 0 && (
                  <ResultGroup
                    title={`Proveedores (${results.suppliers.length})`}
                    items={results.suppliers}
                    getLabel={(s) => s.name || s.tradeName}
                    getSub={(s) => s.supplierNumber}
                    onSelect={(s) => handleSelect('supplier', s)}
                  />
                )}
                {results.orders.length > 0 && (
                  <ResultGroup
                    title={`Ordenes (${results.orders.length})`}
                    items={results.orders}
                    getLabel={(o) => o.orderNumber}
                    getSub={(o) => o.status}
                    onSelect={(o) => handleSelect('order', o)}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultGroup({ title, items, getLabel, getSub, onSelect }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">{title}</div>
      {items.map((item, i) => (
        <button
          key={item._id || i}
          onClick={() => onSelect(item)}
          className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between"
        >
          <span className="text-sm font-medium truncate">{getLabel(item)}</span>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">{getSub(item)}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Header ────────────────────────────────────────────────
export default function InventoryHeaderSection({
  kpiData,
  kpiLoading,
  onKPIClick,
  onNavigateToTab,
  onAddInventory,
  onReceivePO,
  onNewPO,
  onNewTransfer,
  pendingPOCount,
  multiLocationEnabled,
}) {
  return (
    <div className="space-y-4">
      {/* Title row + search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion de Inventario</h1>
          <p className="text-muted-foreground">Administra tus productos, niveles de stock y ordenes de compra.</p>
        </div>
        <div className="flex items-center gap-3">
          <DailyStreak />
          <UniversalSearch onNavigate={onNavigateToTab} />
        </div>
      </div>

      {/* KPI Cards */}
      <InventoryKPICards data={kpiData} loading={kpiLoading} onCardClick={onKPIClick} />

      {/* Quick Actions */}
      <InventoryQuickActions
        onAddInventory={onAddInventory}
        onReceivePO={onReceivePO}
        onNewPO={onNewPO}
        onNewTransfer={onNewTransfer}
        pendingPOCount={pendingPOCount}
        multiLocationEnabled={multiLocationEnabled}
      />
    </div>
  );
}
