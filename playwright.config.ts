import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

const root = process.cwd()
const qaDirectory = mkdtempSync(join(tmpdir(), 'verlaufsplaner-e2e-'))
const port = 5199

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium', channel: 'msedge', headless: true },
  webServer: {
    command: `node "${resolve(root, 'node_modules/vite/bin/vite.js')}" "${root}" --config "${resolve(root, 'vite.config.ts')}" --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: qaDirectory,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
