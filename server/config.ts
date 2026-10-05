import { resolve } from 'node:path'

export type AppMode = 'local' | 'network' | 'server'

export interface AppConfig {
  mode: AppMode
  host: string
  port: number
  databasePath: string
  storagePath: string
  baseUrl?: URL
  sessionSecret?: string
  secureCookies: boolean
}

type Environment = Record<string, string | undefined>

const appModes = new Set<AppMode>(['local', 'network', 'server'])

const optional = (value: string | undefined): string | undefined => value?.trim() || undefined

const readPort = (value: string | undefined): number => {
  if (!value?.trim()) return 5173
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT muss eine ganze Zahl zwischen 1 und 65535 sein.')
  return port
}

const readBaseUrl = (value: string | undefined): URL | undefined => {
  const raw = optional(value)
  if (!raw) return undefined
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('BASE_URL muss eine vollständige http(s)-URL sein.') }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('BASE_URL muss mit http:// oder https:// beginnen.')
  return url
}

/**
 * Central runtime configuration shared by the Vite development adapter and future
 * production bootstrap. Paths stay relative to the process working directory so a
 * Raspberry Pi service can relocate persistent data without code changes.
 */
export function loadAppConfig(environment: Environment = process.env, cwd = process.cwd()): AppConfig {
  const rawMode = optional(environment.APP_MODE) ?? 'local'
  if (!appModes.has(rawMode as AppMode)) throw new Error('APP_MODE muss local, network oder server sein.')
  const mode = rawMode as AppMode
  const host = optional(environment.HOST) ?? '127.0.0.1'
  if (host === '0.0.0.0' && mode === 'local') throw new Error('HOST=0.0.0.0 erfordert APP_MODE=network oder APP_MODE=server.')

  const baseUrl = readBaseUrl(environment.BASE_URL)
  const databasePath = resolve(cwd, optional(environment.DATABASE_URL) ?? 'data/verlaufsplaner.sqlite')
  const storagePath = resolve(cwd, optional(environment.STORAGE_PATH) ?? 'data/storage')
  const sessionSecret = optional(environment.SESSION_SECRET)

  return {
    mode,
    host,
    port: readPort(environment.PORT),
    databasePath,
    storagePath,
    baseUrl,
    sessionSecret,
    secureCookies: baseUrl?.protocol === 'https:',
  }
}

let configuredAppConfig: AppConfig | undefined

/** Sets the process-wide server configuration once during application bootstrap. */
export const configureAppConfig = (environment: Environment, cwd = process.cwd()): AppConfig => {
  configuredAppConfig = loadAppConfig(environment, cwd)
  return configuredAppConfig
}

/**
 * Repository modules can be imported directly in tests. In that case they use
 * deterministic local defaults instead of unrelated environment variables from
 * the test runner.
 */
export const appConfig = (): AppConfig => configuredAppConfig ?? loadAppConfig({}, process.cwd())
