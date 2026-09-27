import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SqlitePlans, SqliteSchedulePatterns, SqliteWorkspaceSettings } from './server/sqlitePlans'

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
    const schedulePatterns = new SqliteSchedulePatterns()
    const workspace = new SqliteWorkspaceSettings()
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
    server.middlewares.use('/api/schedule-patterns', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const id = path === '/' ? undefined : decodeURIComponent(path.slice(1))
        if (request.method === 'GET' && !id) return json(response, 200, schedulePatterns.list())
        if (request.method === 'GET' && id) { const pattern = schedulePatterns.get(id); return pattern ? json(response, 200, pattern) : json(response, 404, { error: 'Verlaufsplan-Muster nicht gefunden.' }) }
        if (request.method === 'PUT' && id) { const body = await readBody(request) as { id?: string }; if (body.id !== id) return json(response, 400, { error: 'Muster-ID stimmt nicht mit der Adresse überein.' }); schedulePatterns.save(body as never); return json(response, 204) }
        if (request.method === 'DELETE' && id) return json(response, schedulePatterns.remove(id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungültiges JSON.' })
        if (error instanceof Error && error.message.includes('mitgelieferten')) return json(response, 409, { error: error.message })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/workspace', (request, response, next) => {
      void (async () => {
        if (request.method === 'GET') return json(response, 200, workspace.get())
        if (request.method === 'PUT') return json(response, 200, workspace.save(await readBody(request) as never))
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungültiges JSON.' })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
  },
})

export default defineConfig({
  plugins: [vue(), sqliteApi()],
})
