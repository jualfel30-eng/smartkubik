import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  acceptProof as apiAcceptProof,
  confirmPaymentRequest as apiConfirm,
  getPendingCount,
  listPaymentRequests,
  markAwaitingSettlement as apiAwaiting,
  rejectProof as apiRejectProof,
  resendPaymentLink as apiResend,
} from '@/lib/paymentRequestsApi';

/**
 * Reactive pending count for the navbar badge.
 *
 * Polling is the source of truth (every 60 s when tab is visible). The
 * NotificationContext also calls `refresh()` whenever it receives a
 * payment-request.* event over Socket.IO — Batch D wires that.
 *
 * 60s default is conservative — payment proofs are not as bursty as
 * orders, and the toast that fires on submission already alerts the user.
 */
export function usePendingPaymentRequestsCount({
  enabled = true,
  intervalMs = 60_000,
} = {}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await getPendingCount();
      if (mountedRef.current) setCount(next);
    } catch (err) {
      // Silent fail — the badge missing is preferable to a noisy error.
      // The pending-count endpoint is cheap; a transient outage isn't worth
      // alerting the cashier mid-shift.
      console.warn('pending-count fetch failed', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs, refresh]);

  // Refresh aggressively when the user returns to the tab — they may have
  // missed a Socket.IO event while backgrounded.
  useEffect(() => {
    if (!enabled) return undefined;
    const onFocus = () => refresh();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refresh]);

  return { count, loading, refresh };
}

/**
 * Paginated list view backing the PaymentReviewSheet. Defaults to status
 * `submitted` because that's the queue the tenant works through — other
 * statuses are available via the `status` arg for the dedicated route page.
 */
export function usePaymentRequestsList({
  status = 'submitted',
  entityType,
  page = 1,
  limit = 20,
  enabled = true,
} = {}) {
  const [state, setState] = useState({
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
    loading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await listPaymentRequests({
        status,
        entityType,
        page,
        limit,
      });
      if (mountedRef.current) {
        setState({
          ...result,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((s) => ({ ...s, loading: false, error: err }));
      }
    }
  }, [enabled, entityType, limit, page, status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

/**
 * Action wrappers for the review flow. Each one shows a toast on
 * success/failure and returns the freshly-mutated PaymentRequest so the
 * caller can update local state without a refetch round-trip.
 */
export function usePaymentRequestActions() {
  const [busy, setBusy] = useState(false);

  const wrap = useCallback(async (action, successMsg) => {
    setBusy(true);
    try {
      const result = await action();
      if (successMsg) toast.success(successMsg);
      return result;
    } catch (err) {
      toast.error(err.message || 'Operación falló');
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    busy,
    acceptProof: (prId, proofId, note) =>
      wrap(() => apiAcceptProof(prId, proofId, { note }), 'Comprobante aceptado'),
    rejectProof: (prId, proofId, reason, note) =>
      wrap(
        () => apiRejectProof(prId, proofId, { reason, note }),
        'Solicitud actualizada',
      ),
    confirmRequest: (prId) =>
      wrap(() => apiConfirm(prId), 'Pago confirmado'),
    markAwaiting: (prId) =>
      wrap(() => apiAwaiting(prId), 'Marcado como pendiente del banco'),
    resendLink: (prId, phone) =>
      wrap(
        () => apiResend(prId, { phone }),
        phone ? `Link enviado a ${phone}` : 'Link reenviado',
      ),
  };
}
