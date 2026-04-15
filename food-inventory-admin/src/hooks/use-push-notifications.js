import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

const STORAGE_KEY = 'smk_push_subscribed';
const DECLINED_KEY = 'smk_push_declined_at';
const DECLINE_DAYS = 30;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function wasRecentlyDeclined() {
  const raw = localStorage.getItem(DECLINED_KEY);
  if (!raw) return false;
  return (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24) < DECLINE_DAYS;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [vapidKey, setVapidKey] = useState(null);
  const [supported] = useState(() =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  );

  // Fetch VAPID key on load
  useEffect(() => {
    if (!supported) return;
    fetchApi('/notification-center/push/vapid-key')
      .then(res => { if (res?.publicKey) setVapidKey(res.publicKey); })
      .catch(() => {});
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !vapidKey) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        localStorage.setItem(DECLINED_KEY, String(Date.now()));
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await fetchApi('/notification-center/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      localStorage.setItem(STORAGE_KEY, '1');
      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      return false;
    }
  }, [supported, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetchApi('/notification-center/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      localStorage.removeItem(STORAGE_KEY);
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
  }, [supported]);

  // Should we show the prompt?
  const shouldPrompt =
    supported &&
    vapidKey &&
    permission === 'default' &&
    !subscribed &&
    !wasRecentlyDeclined();

  return { supported, permission, subscribed, shouldPrompt, subscribe, unsubscribe };
}
