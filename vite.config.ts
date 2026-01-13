import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    // Proxy configuration for Local Development
    // This forwards '/api' requests to your VPS backend server
    proxy: {
      '/api': {
        target: 'http://157.245.59.65:3000', // DIRECT TO VPS IP
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path 
      }
    }
  }
});