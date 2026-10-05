import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { configureAppConfig } from './config'
import { registerApiRoutes, type ApiMiddleware } from './api'

const config = configureAppConfig(process.env)
const publicDirectory = resolve(process.cwd(), 'dist')
const contentTypes: Record<string, string> = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' }

const routes: Array<{ prefix: string; handler: ApiMiddleware }> = []
registerApiRoutes((prefix, handler) => routes.push({ prefix, handler }))

const serveApi = async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
  const originalUrl = request.url ?? '/'
  const pathname = new URL(originalUrl, 'http://localhost').pathname
  const route = routes.find((candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`))
  if (!route) return false
  request.url = originalUrl.slice(route.prefix.length) || '/'
  await new Promise<void>((resolveRequest, rejectRequest) => {
    response.once('finish', resolveRequest)
    route.handler(request, response, (error) => error ? rejectRequest(error) : resolveRequest())
  })
  return true
}

const serveApplication = (request: IncomingMessage, response: ServerResponse): void => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const requested = pathname === '/' ? 'index.html' : `.${pathname}`
  const candidate = resolve(publicDirectory, requested)
  const file = candidate.startsWith(`${publicDirectory}${sep}`) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : resolve(publicDirectory, 'index.html')
  if (!existsSync(file)) { response.statusCode = 503; response.end('Die Produktionsdateien fehlen. Führen Sie zuerst npm run build aus.'); return }
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase()
  response.statusCode = 200
  response.setHeader('content-type', contentTypes[extension] ?? 'application/octet-stream')
  response.setHeader('cache-control', file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable')
  createReadStream(file).pipe(response)
}

const server = createServer((request, response) => {
  void serveApi(request, response).then((handled) => { if (!handled) serveApplication(request, response) }).catch((error: unknown) => {
    response.statusCode = 500
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Interner Serverfehler.' }))
  })
})

server.listen(config.port, config.host, () => {
  console.log(`Verlaufsplaner läuft unter http://${config.host}:${config.port}`)
})
