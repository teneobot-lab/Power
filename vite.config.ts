import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Penting: Polyfill process.env agar tidak crash di browser
      'process.env': {
        API_KEY: env.VITE_API_KEY || '' // Mapping VITE_API_KEY ke process.env.API_KEY
      }
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path 
        }
      }
    }
  };
});