import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { configureAppConfig } from './server/config'
import { registerApiRoutes } from './server/api'

const apiPlugin = () => ({
  name: 'verlaufsplaner-api',
  configureServer(server: { middlewares: { use: Parameters<typeof registerApiRoutes>[0] } }) {
    registerApiRoutes(server.middlewares.use.bind(server.middlewares))
  },
})

export default defineConfig(({ mode }) => {
  const config = configureAppConfig(loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [vue(), apiPlugin()],
    server: { host: config.host, port: config.port, strictPort: true },
  }
})
