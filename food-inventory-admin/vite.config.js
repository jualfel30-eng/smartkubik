import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// PWA removed: workbox runtime cache was returning stale tenant data
// across sede switches. Admin is a desktop dashboard that requires
// network — no offline support needed.

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  assetsInclude: ['**/*.lottie'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    hmr: {
      clientPort: 5174
    },
    allowedHosts: [
      '5174-ivhk6k18oqaqeei2d7wum-a37efc07.manusvm.computer',
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    // Enable source maps for debugging but optimize for production
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
          ],
          // NOTE: 'icons' (lucide-react), 'charts-vendor' (recharts), xlsx and
          // jspdf are intentionally NOT pinned here.
          //  - recharts/xlsx/jspdf are only used by lazy route chunks, so
          //    Rollup emits them as pure async chunks that load on demand.
          //  - lucide-react is tree-shaken and co-located: the few icons the
          //    eager shell (App.jsx) uses stay in the entry, the rest ship
          //    inside their lazy route chunks.
          // Pinning any of these dragged Vite's __vitePreload helper into the
          // heavy chunk and forced it into the eager graph (loaded on every
          // screen, even login). Measured eager payload dropped ~245 KB gz.
        },
      },
    },
  }
})