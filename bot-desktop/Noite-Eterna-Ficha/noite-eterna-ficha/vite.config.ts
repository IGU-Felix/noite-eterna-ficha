import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [vue()],
    server: {
      proxy: {
        "/api": {
          target: `http://localhost:${env.PORT || 3001}`,
          changeOrigin: true,
          configure: proxy => {
            proxy.on("proxyReq", request => {
              request.setHeader("Authorization", `Bearer ${env.DISCORD_API_KEY || ""}`)
            })
          }
        }
      }
    }
  }
})
