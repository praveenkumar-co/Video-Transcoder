import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://videoforge.local',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://videoforge.local',
        changeOrigin: true,
      },
      '/metrics': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://videoforge.local',
        changeOrigin: true,
      },
    },
  },
});
