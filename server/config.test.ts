import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAppConfig } from './config'

describe('loadAppConfig', () => {
  it('keeps the local installation loopback-only with portable data defaults', () => {
    const config = loadAppConfig({}, '/srv/verlaufsplaner')
    expect(config).toMatchObject({ mode: 'local', host: '127.0.0.1', port: 5173, secureCookies: false })
    expect(config.databasePath).toBe(resolve('/srv/verlaufsplaner', 'data/verlaufsplaner.sqlite'))
    expect(config.storagePath).toBe(resolve('/srv/verlaufsplaner', 'data/storage'))
  })

  it('allows an explicit LAN configuration and enables secure cookies behind HTTPS', () => {
    const config = loadAppConfig({ APP_MODE: 'network', HOST: '0.0.0.0', PORT: '8787', DATABASE_URL: 'persistent/data.sqlite', STORAGE_PATH: 'persistent/storage', BASE_URL: 'https://verlaufsplaner.example.de' }, '/app')
    expect(config).toMatchObject({ mode: 'network', host: '0.0.0.0', port: 8787, secureCookies: true })
    expect(config.databasePath).toBe(resolve('/app', 'persistent/data.sqlite'))
    expect(config.storagePath).toBe(resolve('/app', 'persistent/storage'))
  })

  it('rejects an unsafe local bind and malformed configuration', () => {
    expect(() => loadAppConfig({ HOST: '0.0.0.0' })).toThrow('APP_MODE=network')
    expect(() => loadAppConfig({ PORT: '0' })).toThrow('PORT')
    expect(() => loadAppConfig({ BASE_URL: 'ftp://example.test' })).toThrow('BASE_URL')
  })
})
