import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './hooks/use-auth.jsx';
import { FeatureFlagsProvider } from './hooks/use-feature-flags.jsx';
import { ThemeProvider } from '@/components/ThemeProvider.jsx';
import './index.css';
import './custom.css';
import './styles/mobile-tokens.css';
import App from './App.jsx';

// Unregister any previously installed service worker and drop its caches.
// The PWA was retired because workbox runtimeCaching returned stale tenant
// responses across sede switches.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => { /* noop */ });
  if (window.caches?.keys) {
    window.caches.keys().then((keys) => {
      keys.forEach((key) => window.caches.delete(key));
    }).catch(() => { /* noop */ });
  }
}

// Prevent scroll from accidentally changing values in number inputs.
// When a focused number input detects a wheel event, blur it so the scroll
// passes through to the page instead of incrementing/decrementing the value.
document.addEventListener('wheel', () => {
  if (document.activeElement?.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <FeatureFlagsProvider>
            <App />
          </FeatureFlagsProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
);
