import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function splitVendorChunks(id) {
  const normalizedId = id.replaceAll('\\', '/')

  if (!normalizedId.includes('/node_modules/')) {
    return undefined
  }

  if (normalizedId.includes('/node_modules/leaflet/')) {
    return 'leaflet'
  }

  if (
    normalizedId.includes('/node_modules/react/') ||
    normalizedId.includes('/node_modules/react-dom/') ||
    normalizedId.includes('/node_modules/scheduler/')
  ) {
    return 'react'
  }

  if (normalizedId.includes('/node_modules/recharts/')) {
    return 'recharts'
  }

  if (
    normalizedId.includes('/node_modules/victory-vendor/') ||
    normalizedId.includes('/node_modules/d3-') ||
    normalizedId.includes('/node_modules/decimal.js') ||
    normalizedId.includes('/node_modules/eventemitter3/') ||
    normalizedId.includes('/node_modules/es-toolkit/') ||
    normalizedId.includes('/node_modules/clsx/')
  ) {
    return 'charts-vendor'
  }

  return undefined
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunks,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    include: ['tests/ui/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/components/SatelliteCard.jsx'],
    },
  },
})
