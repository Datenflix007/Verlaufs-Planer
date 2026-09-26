import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SqlitePlans, readJenaChatSample } from './server/sqlitePlans'

const json = (response: ServerResponse, status: number, body?: unknown): void => {
  response.statusCode = status
  if (body === undefined) { response.end(); return }
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const sqliteApi = () => ({
  name: 'verlaufsplaner-sqlite-api',
  configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void) => void } }) {
    const plans = new SqlitePlans()
    server.middlewares.use('/api/plans', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const id = path === '/' ? undefined : decodeURIComponent(path.slice(1))
        if (request.method === 'GET' && !id) return json(response, 200, plans.list())
        if (request.method === 'GET' && id) { const plan = plans.get(id); return plan ? json(response, 200, plan) : json(response, 404, { error: 'Planung nicht gefunden.' }) }
        if (request.method === 'PUT' && id) { plans.save(await readBody(request)); return json(response, 204) }
        if (request.method === 'DELETE' && id) return json(response, plans.remove(id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungueltiges JSON.' })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/samples/jena-chat', (request, response, next) => {
      try {
        if (request.method !== 'GET') return json(response, 405, { error: 'Methode nicht erlaubt.' })
        return json(response, 200, readJenaChatSample())
      } catch (error) { next(error instanceof Error ? error : new Error(String(error))) }
    })
  },
})

export default defineConfig({
  plugins: [vue(), sqliteApi()],
})
