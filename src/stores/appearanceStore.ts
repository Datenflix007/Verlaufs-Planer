import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppearanceSettings } from '../domain/types'
import { defaultAppearanceSettings } from '../data/workspaceDefaults'
import { appearanceColorPresets, contrastRatio } from '../data/appearanceColors'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'

const repository = new WorkspaceRepository()

export const useAppearanceStore = defineStore('appearance', () => {
  const settings = ref<AppearanceSettings>({ ...defaultAppearanceSettings })
  const systemDark = ref(false)
  let systemPreference: MediaQueryList | undefined
  const darkMode = computed(() => settings.value.mode === 'dark' || (settings.value.mode === 'system' && systemDark.value))
  const colors = computed(() => ({
    ...appearanceColorPresets[settings.value.palette][darkMode.value ? 'dark' : 'light'],
    ...settings.value.colorOverrides,
  }))
  const textContrast = computed(() => contrastRatio(colors.value.text, colors.value.surface))
  const actionContrast = computed(() => contrastRatio(colors.value.actionText, colors.value.action))

  function applyToDocument(): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = darkMode.value ? 'dark' : 'light'
    root.dataset.palette = settings.value.palette
    root.dataset.background = settings.value.background
    const cssVariables: Record<string, string> = {
      '--app-bg': colors.value.pageBackground,
      '--surface': colors.value.surface,
      '--surface-raised': colors.value.raisedSurface,
      '--text': colors.value.text,
      '--muted': colors.value.mutedText,
      '--border': colors.value.border,
      '--accent': colors.value.action,
      '--accent-strong': colors.value.action,
      '--accent-hover': `color-mix(in srgb, ${colors.value.action} 84%, ${darkMode.value ? '#ffffff' : '#000000'})`,
      '--accent-soft': `color-mix(in srgb, ${colors.value.action} 12%, ${colors.value.surface})`,
      '--accent-text': colors.value.actionText,
    }
    for (const [property, value] of Object.entries(cssVariables)) root.style.setProperty(property, value)
    root.style.setProperty('--appearance-gradient-start', settings.value.gradientStart ?? '#e5eff0')
    root.style.setProperty('--appearance-gradient-end', settings.value.gradientEnd ?? '#e8edef')
    root.style.setProperty('--appearance-image', settings.value.backgroundImageData ? `url("${settings.value.backgroundImageData}")` : 'none')
    root.style.colorScheme = darkMode.value ? 'dark' : 'light'
  }

  function apply(next: AppearanceSettings): void {
    settings.value = { ...defaultAppearanceSettings, ...next }
    if (typeof window !== 'undefined' && !systemPreference) {
      systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
      systemPreference.addEventListener('change', (event) => { systemDark.value = event.matches; applyToDocument() })
    }
    if (systemPreference) systemDark.value = systemPreference.matches
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

  return { settings, colors, textContrast, actionContrast, apply, load }
})
