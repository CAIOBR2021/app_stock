// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Usar '/api' como o gatilho para o proxy
      '/api': {
        target: 'http://localhost:10000', // Certifique-se que está 10000 aqui
        changeOrigin: true, // Necessário para o proxy funcionar corretamente
        secure: false, // Não se preocupe com certificados SSL em desenvolvimento
      },
    },
  },
});
