import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ← Tämä sallii subdomains
    port: 5173,
    allowedHosts: [
      'pic2data.local',
      'mantox.pic2data.local',
      'finecom.pic2data.local', 
      'admin.pic2data.local',
      '.pic2data.local' 
    ]
  }
})



