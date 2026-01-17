
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env': {
        API_KEY: env.VITE_API_KEY || ''
      }
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://178.128.106.33:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path 
        }
      }
    }
  };
});
