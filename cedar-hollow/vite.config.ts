import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: { port: Number(process.env.PORT) || 5174 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
})
