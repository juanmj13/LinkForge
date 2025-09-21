import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:3001' } },
  build: { rollupOptions: { input: {
    online: 'online.html',
    configuracion: 'configuracion.html',
    analisis: 'analisis.html',
    vehiculos: 'vehiculos.html',
    ayuda: 'ayuda.html',
  }}}
});
