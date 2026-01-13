import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    // Konfigurasi Proxy untuk Local Development
    // Ini membuat request ke '/api' di localhost diteruskan ke VPS Anda
    proxy: {
      '/api': {
        target: 'http://157.245.59.65:3000', // IP VPS Anda
        changeOrigin: true,
        secure: false,
        // Optional: Ensure path isn't modified unexpectedly
        rewrite: (path) => path 
      }
    }
  }
});