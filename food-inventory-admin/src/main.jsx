import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './hooks/use-auth.jsx';
import { FeatureFlagsProvider } from './hooks/use-feature-flags.jsx';
import { ThemeProvider } from '@/components/ThemeProvider.jsx';
import './index.css';
import './custom.css';
import App from './App.jsx';

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
