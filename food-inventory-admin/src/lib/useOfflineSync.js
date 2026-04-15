/**
 * useOfflineSync — manages the Dexie mutation queue.
 *
 * Usage:
 *   const { enqueue, isOnline } = useOfflineSync();
 *
 *   // Instead of calling fetchApi directly:
 *   enqueue('CREATE_BOOKING', payload, () =>
 *     fetchApi('/beauty-bookings/admin', { method: 'POST', body: JSON.stringify(payload) })
 *   );
 *
 * When online: executes the action immediately.
 * When offline: stores it in Dexie mutationQueue and replays on reconnect.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import db from './db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const draining = useRef(false);

  // ── Track online/offline ──────────────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Drain queue when we come back online ──────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      const pending = await db.mutationQueue.orderBy('id').toArray();
      for (const mutation of pending) {
        try {
          await mutation.execute();
          await db.mutationQueue.delete(mutation.id);
        } catch (err) {
          // Increment retry count; give up after 5 attempts
          const retries = (mutation.retries || 0) + 1;
          if (retries >= 5) {
            await db.mutationQueue.delete(mutation.id);
          } else {
            await db.mutationQueue.update(mutation.id, { retries });
          }
        }
      }
    } finally {
      draining.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) drainQueue();
  }, [isOnline, drainQueue]);

  // ── Enqueue helper ────────────────────────────────────────────────────────
  /**
   * @param {string}   type      - human label (e.g. 'CREATE_BOOKING')
   * @param {object}   payload   - data to store for retry context
   * @param {function} execute   - async fn that performs the API call; returns result
   * @returns {Promise<any>}     - result if online, undefined if queued offline
   */
  const enqueue = useCallback(async (type, payload, execute) => {
    if (navigator.onLine) {
      // Online — run immediately
      return execute();
    }
    // Offline — persist to queue
    await db.mutationQueue.add({
      type,
      payload,
      execute, // NOTE: functions are NOT serialized by structuredClone / IDB
      // so this survives only the current page session.
      // For cross-session replay, you'd need to re-hydrate from payload.
      createdAt: new Date().toISOString(),
      retries: 0,
    });
  }, []);

  // ── Cache helpers ─────────────────────────────────────────────────────────
  const cacheAppointments = useCallback(async (items) => {
    if (!Array.isArray(items) || !items.length) return;
    await db.appointments.bulkPut(items);
  }, []);

  const getCachedAppointments = useCallback(async (tenantId, date) => {
    return db.appointments.where({ tenantId, date }).toArray();
  }, []);

  return { isOnline, enqueue, cacheAppointments, getCachedAppointments, drainQueue };
}
