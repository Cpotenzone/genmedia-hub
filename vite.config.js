/**
 * Vite Configuration for GenMedia Hub
 * 
 * - React plugin for JSX/Fast Refresh
 * - Tailwind CSS v4 via @tailwindcss/vite plugin
 * - Optimized chunking for Firebase + React dependencies
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // Dev server configuration
  server: {
    port: 3000,
    open: true,
    // Proxy API calls to Firebase Functions emulator during development
    proxy: {
      '/api': {
        target: 'http://localhost:5001/casey-genmedia/us-central1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
