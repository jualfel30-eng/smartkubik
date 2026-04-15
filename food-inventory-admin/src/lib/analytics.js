/**
 * SmartKubik analytics — thin event tracker.
 *
 * In development: logs to console.
 * In production: pushes to Microsoft Clarity (if VITE_CLARITY_ID is set)
 * and can be extended with any analytics provider.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('appointment_created', { serviceId, professionalId });
 */

const isDev = import.meta.env.DEV;

/**
 * Track a custom event.
 * @param {string} name   Event name (snake_case)
 * @param {object} props  Additional properties
 */
export function trackEvent(name, props = {}) {
  if (isDev) {
    console.debug('[analytics]', name, props);
    return;
  }
  try {
    // Microsoft Clarity custom event
    if (typeof window.clarity === 'function') {
      window.clarity('event', name);
      // Clarity supports custom tags for filtering
      Object.entries(props).forEach(([k, v]) => {
        if (v != null) window.clarity('set', k, String(v));
      });
    }
    // Extend here with other providers (Segment, PostHog, etc.)
  } catch (_) {}
}

/**
 * Identify the current user (for session attribution).
 * @param {string} userId
 * @param {object} traits  e.g. { tenantId, plan }
 */
export function identifyUser(userId, traits = {}) {
  if (isDev) {
    console.debug('[analytics] identify', userId, traits);
    return;
  }
  try {
    if (typeof window.clarity === 'function') {
      window.clarity('identify', userId, undefined, undefined, traits.tenantId);
    }
  } catch (_) {}
}

/**
 * Inject Microsoft Clarity script once per session.
 * Call from App.jsx or a top-level effect.
 * @param {string} clarityId   VITE_CLARITY_ID env var value
 */
export function initClarity(clarityId) {
  if (!clarityId || document.getElementById('ms-clarity')) return;
  const script = document.createElement('script');
  script.id = 'ms-clarity';
  script.type = 'text/javascript';
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityId}");
  `;
  document.head.appendChild(script);
}
