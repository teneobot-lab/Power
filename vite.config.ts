import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    // Proxy configuration for Local Development
    // This forwards '/api' requests to your local backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Changed from specific IP to localhost
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path 
      }
    }
  }
});