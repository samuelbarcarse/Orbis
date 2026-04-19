import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ArcGIS packages ship as pre-built ES modules — Vite must not try to
  // re-bundle them or it will fail on their dynamic worker imports.
  optimizeDeps: {
    exclude: ['@arcgis/core', '@arcgis/map-components', '@esri/calcite-components'],
  },

  server: {
    port: 5173,
    host: true,
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
      // Public GeoJSON feed (no-auth) served by the Express server
      '/vessels.geojson': 'http://localhost:3001',
    },
  },
});
