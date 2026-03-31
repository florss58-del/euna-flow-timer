import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      react: 'Y:/claude/timer/node_modules/react',
      'react-dom': 'Y:/claude/timer/node_modules/react-dom',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    fs: {
      allow: ['Y:/claude/timer'],
      strict: false,
    },
  },
})
