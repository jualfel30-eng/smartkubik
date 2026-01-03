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
