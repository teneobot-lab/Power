import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    // Proxy configuration for Local Development
    // This forwards '/api' requests to your local Express server (port 3000)
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Changed from remote VPS to localhost for reliable development
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path 
      }
    }
  }
});