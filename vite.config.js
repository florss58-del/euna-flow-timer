import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Y: 드라이브는 NAS 마운트라 실제 경로가 다르다. 심볼릭 링크를 따라가면 빌드가 깨진다.
  resolve: { preserveSymlinks: true },
})
