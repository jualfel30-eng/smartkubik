import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Landmark } from 'lucide-react';
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

  // Delete handler
  const handleDelete = async () => {
    if (!deleteAccount) return;
    setDeleting(true);
    try {
      await fetchApi(`/bank-accounts/${deleteAccount._id}`, { method: 'DELETE' });
      haptics.error();
      toast.success('Cuenta eliminada');
      setDeleteAccount(null);
      loadData();
    } catch (error) {
      toast.error('Error al eliminar', { description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  // Group accounts by currency for currency card counts
  const currencyGroups = {};
  for (const acct of accounts) {
    const c = acct.currency || 'USD';
    if (!currencyGroups[c]) currencyGroups[c] = [];
    currencyGroups[c].push(acct);
  }

  // Currency card refs for scroll-to
  const accountRefs = useRef({});
  const scrollToCurrency = (currency) => {
    haptics.tap();
    const firstAcct = currencyGroups[currency]?.[0];
    if (firstAcct && accountRefs.current[firstAcct._id]) {
      accountRefs.current[firstAcct._id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const maskedForDelete = deleteAccount?.accountNumber?.slice(-4) || '----';

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
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Cuentas Bancarias</h1>
        <button
          onClick={() => { haptics.tap(); setCreateOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.96] transition-transform"
        >
          <Plus size={16} /> Nueva
        </button>
      </header>

      {/* Currency Summary Cards */}
      {!loading && Object.keys(balances).length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: STAGGER(0.06) }}
          className="flex gap-3 overflow-x-auto scrollbar-hide mb-5 -mx-1 px-1"
        >
          {Object.entries(balances).map(([currency, total]) => {
            const count = currencyGroups[currency]?.length || 0;
            const isUSD = currency === 'USD';
            return (
              <motion.button
                key={currency}
                variants={listItem}
                onClick={() => scrollToCurrency(currency)}
                className={`flex-shrink-0 min-w-[150px] p-4 rounded-[var(--mobile-radius-lg,12px)] border text-left active:scale-[0.97] transition-transform ${
                  isUSD
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
              >
                <span className="text-xs font-semibold text-muted-foreground">{currency}</span>
                <AnimatedNumber
                  value={total}
                  format={(n) => formatCurrency(n, currency)}
                  className={`block text-xl font-bold tabular-nums mt-1 ${isUSD ? 'text-emerald-400' : 'text-blue-400'}`}
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {count} {count === 1 ? 'cuenta' : 'cuentas'}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Account List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-card rounded-[var(--mobile-radius-lg,12px)] border border-border animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Landmark size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No hay cuentas bancarias</p>
          <p className="text-xs mt-1">Toca "+ Nueva" para crear una</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Cuentas activas
          </p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: STAGGER(0.04) }}
            className="space-y-3"
          >
            {accounts.map((acct) => (
              <motion.div
                key={acct._id}
                variants={listItem}
                ref={(el) => { accountRefs.current[acct._id] = el; }}
              >
                <MobileBankAccountCard
                  account={acct}
                  onAdjust={(a) => setAdjustAccount(a)}
                  onMovements={(a) => setMovementsAccount(a)}
                  onEdit={(a) => setEditAccount(a)}
                  onDelete={(a) => setDeleteAccount(a)}
                />
              </motion.div>
            ))}
          </motion.div>
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

