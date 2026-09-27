import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppearanceSettings } from '../domain/types'
import { defaultAppearanceSettings } from '../data/workspaceDefaults'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'

const repository = new WorkspaceRepository()

export const useAppearanceStore = defineStore('appearance', () => {
  const settings = ref<AppearanceSettings>({ ...defaultAppearanceSettings })
  let systemPreference: MediaQueryList | undefined

  function applyToDocument(): void {
    if (typeof document === 'undefined') return
    const dark = settings.value.mode === 'dark' || (settings.value.mode === 'system' && systemPreference?.matches)
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.palette = settings.value.palette
    root.dataset.background = settings.value.background
    root.style.colorScheme = dark ? 'dark' : 'light'
  }

  function apply(next: AppearanceSettings): void {
    settings.value = { ...defaultAppearanceSettings, ...next }
    if (typeof window !== 'undefined' && !systemPreference) {
      systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
      systemPreference.addEventListener('change', applyToDocument)
    }
    applyToDocument()
  }

  async function load(): Promise<void> {
    try {
      const workspace = await repository.get()
      apply(workspace.appearance)
    } catch {
      apply(defaultAppearanceSettings)
    }
  }

  return { settings, apply, load }
})
