import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Landmark, ArrowUpDown, List, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileBankAccountCard from './MobileBankAccountCard.jsx';
import MobileCreateBankAccount from './MobileCreateBankAccount.jsx';
import MobileAdjustBalance from './MobileAdjustBalance.jsx';
import MobileBankMovements from './MobileBankMovements.jsx';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MobileBankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Sheet states
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [adjustAccount, setAdjustAccount] = useState(null);
  const [movementsAccount, setMovementsAccount] = useState(null);
  const [deleteAccount, setDeleteAccount] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pull to refresh
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const THRESHOLD = 64;

  // Carousel scroll ref
  const scrollRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [acctRes, balRes] = await Promise.all([
        fetchApi('/bank-accounts?page=1&limit=100'),
        fetchApi('/bank-accounts/balance/by-currency'),
      ]);
      setAccounts(acctRes.data || acctRes || []);
      setBalances(balRes || {});
    } catch (error) {
      toast.error('Error al cargar cuentas', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    await loadData();
  }, [loadData]);

  // Pull-to-refresh handlers
  const onTouchStart = useCallback((e) => {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dist = Math.max(0, e.touches[0].clientY - startY.current);
    if (dist > 0) {
      setPulling(true);
      setPullDist(Math.min(dist * 0.5, THRESHOLD * 1.5));
    }
  }, []);
  const onTouchEnd = useCallback(async () => {
    if (pullDist >= THRESHOLD) {
      await handleRefresh();
    }
    startY.current = null;
    setPulling(false);
    setPullDist(0);
  }, [pullDist, handleRefresh]);

  // Carousel scroll snap detection
  const handleCarouselScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || accounts.length === 0) return;
    const cardWidth = el.firstChild?.offsetWidth || 280;
    const gap = 12;
    const idx = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.max(0, Math.min(idx, accounts.length - 1)));
  }, [accounts.length]);

  const scrollToIndex = useCallback((idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstChild?.offsetWidth || 280;
    const gap = 12;
    el.scrollTo({ left: idx * (cardWidth + gap), behavior: 'smooth' });
    setActiveIndex(idx);
    haptics.select();
  }, []);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteAccount) return;
    setDeleting(true);
    try {
      await fetchApi(`/bank-accounts/${deleteAccount._id}`, { method: 'DELETE' });
      haptics.error();
      toast.success('Cuenta eliminada');
      setDeleteAccount(null);
      if (activeIndex >= accounts.length - 1 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      }
      loadData();
    } catch (error) {
      toast.error('Error al eliminar', { description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  const currentAccount = accounts[activeIndex] || null;
  const maskedForDelete = deleteAccount?.accountNumber?.slice(-4) || '----';

  // Currency totals
  const currencyEntries = Object.entries(balances).filter(([, v]) => v != null);

  return (
    <div
      className="md:hidden mobile-content-pad pb-24"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      {pulling && (
        <div className="flex justify-center py-2">
          <RefreshCw
            size={18}
            className={`text-muted-foreground transition-transform ${pullDist >= THRESHOLD ? 'animate-spin text-primary' : ''}`}
            style={{ transform: `rotate(${(pullDist / THRESHOLD) * 360}deg)` }}
          />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Cuentas Bancarias</h1>
        <button
          onClick={() => { haptics.tap(); setCreateOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.96] transition-transform"
        >
          <Plus size={16} /> Nueva
        </button>
      </header>

      {loading ? (
        /* Skeleton */
        <div className="space-y-4">
          <div className="h-[190px] bg-card rounded-2xl border border-border animate-pulse mx-auto w-[85vw] max-w-[340px]" />
          <div className="grid grid-cols-4 gap-3 px-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Landmark size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No hay cuentas bancarias</p>
          <p className="text-xs mt-1">Toca "+ Nueva" para crear una</p>
        </div>
      ) : (
        <>
          {/* Card Carousel */}
          <div className="relative -mx-4 mb-2">
            <div
              ref={scrollRef}
              onScroll={handleCarouselScroll}
              className="flex gap-3 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {accounts.map((acct, idx) => (
                <div
                  key={acct._id}
                  className="snap-center"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <MobileBankAccountCard
                    account={acct}
                    isActive={idx === activeIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          {accounts.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-5">
              {accounts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToIndex(idx)}
                  className={`rounded-full transition-all duration-200 ${
                    idx === activeIndex
                      ? 'w-6 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action Buttons for current card */}
          {currentAccount && (
            <motion.div
              key={currentAccount._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-4 gap-3 mb-6"
            >
              <ActionBtn
                icon={ArrowUpDown}
                label="Ajustar"
                onClick={() => { haptics.tap(); setAdjustAccount(currentAccount); }}
              />
              <ActionBtn
                icon={List}
                label="Movimientos"
                onClick={() => { haptics.tap(); setMovementsAccount(currentAccount); }}
              />
              <ActionBtn
                icon={Edit3}
                label="Editar"
                onClick={() => { haptics.tap(); setEditAccount(currentAccount); }}
              />
              <ActionBtn
                icon={Trash2}
                label="Eliminar"
                onClick={() => { haptics.tap(); setDeleteAccount(currentAccount); }}
                className="text-destructive"
              />
            </motion.div>
          )}

          {/* Account details for current card */}
          {currentAccount && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAccount._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="bg-card rounded-[var(--mobile-radius-lg,12px)] border border-border p-4 space-y-2.5 mb-6"
              >
                {currentAccount.accountHolderName && (
                  <DetailRow label="Titular" value={currentAccount.accountHolderName} />
                )}
                <DetailRow label="Número" value={currentAccount.accountNumber} />
                <DetailRow
                  label="Tipo"
                  value={currentAccount.accountType === 'ahorro' ? 'Ahorro' : 'Corriente'}
                />
                {currentAccount.branchName && (
                  <DetailRow label="Sucursal" value={currentAccount.branchName} />
                )}
                {currentAccount.swiftCode && (
                  <DetailRow label="SWIFT" value={currentAccount.swiftCode} />
                )}
                {currentAccount.notes && (
                  <DetailRow label="Notas" value={currentAccount.notes} />
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Currency Totals */}
          {currencyEntries.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                Totales por moneda
              </p>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: STAGGER(0.06) }}
                className="grid grid-cols-2 gap-3"
              >
                {currencyEntries.map(([currency, total]) => {
                  const isUSD = currency === 'USD';
                  const count = accounts.filter(a => a.currency === currency).length;
                  return (
                    <motion.div
                      key={currency}
                      variants={listItem}
                      className={`p-4 rounded-[var(--mobile-radius-lg,12px)] border ${
                        isUSD
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-blue-500/20 bg-blue-500/5'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{currency}</span>
                      <AnimatedNumber
                        value={total}
                        format={(n) => formatCurrency(n, currency)}
                        className={`block text-lg font-bold tabular-nums mt-1 ${isUSD ? 'text-emerald-400' : 'text-blue-400'}`}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {count} {count === 1 ? 'cuenta' : 'cuentas'}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          )}
        </>
      )}

      {/* Create/Edit Sheet */}
      <MobileCreateBankAccount
        open={createOpen || !!editAccount}
        onClose={() => { setCreateOpen(false); setEditAccount(null); }}
        account={editAccount}
        onSuccess={loadData}
      />

      {/* Adjust Balance Sheet */}
      <MobileAdjustBalance
        open={!!adjustAccount}
        onClose={() => setAdjustAccount(null)}
        account={adjustAccount}
        onSuccess={loadData}
      />

      {/* Movements Sheet */}
      <MobileBankMovements
        open={!!movementsAccount}
        onClose={() => setMovementsAccount(null)}
        account={movementsAccount}
      />

      {/* Delete Confirmation Sheet */}
      <MobileActionSheet
        open={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
        title="Eliminar cuenta"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteAccount(null)}
              className="flex-1 py-3 rounded-xl font-medium text-sm border border-border bg-card text-foreground active:scale-[0.98] transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-destructive text-destructive-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        }
      >
        <div className="px-4 pb-4 text-center">
          <p className="text-sm font-medium">
            ¿Eliminar la cuenta {deleteAccount?.bankName} ****{maskedForDelete}?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </MobileActionSheet>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border active:bg-muted transition-colors text-muted-foreground ${className}`}
    >
      <Icon size={18} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[65%] truncate">{value}</span>
    </div>
  );
}
