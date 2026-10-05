import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureAppConfig } from './config'
import { registerApiRoutes, type ApiMiddleware } from './api'

describe('standalone API router', () => {
  const servers: ReturnType<typeof createServer>[] = []
  afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))) })

  it('serves the existing plan endpoint independently of Vite', async () => {
    configureAppConfig({ DATABASE_URL: join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-api-')), 'plans.sqlite') })
    const routes: Array<{ prefix: string; handler: ApiMiddleware }> = []
    registerApiRoutes((prefix, handler) => routes.push({ prefix, handler }))
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      const route = routes.find((candidate) => (request.url ?? '').startsWith(candidate.prefix))
      if (!route) { response.statusCode = 404; response.end(); return }
      request.url = (request.url ?? '/').slice(route.prefix.length) || '/'
      route.handler(request, response, () => { response.statusCode = 500; response.end() })
    })
    servers.push(server)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Testserver hat keine TCP-Adresse.')
    const response = await fetch(`http://127.0.0.1:${address.port}/api/plans`)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([])
  })
})
