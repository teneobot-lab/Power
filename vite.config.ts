
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, 
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://165.22.251.42:3000', 
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path 
      }
    }
  }
});
