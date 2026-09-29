import type { WidgetColorSet } from '../domain/types'

export interface WidgetColorPalette {
  id: WidgetColorSet
  label: string
  accent: string
  accentStrong: string
  accentSoft: string
  surface: string
  surfaceStrong: string
  text: string
  muted: string
  branches: string[]
}

export const widgetColorSets: WidgetColorPalette[] = [
  { id: 'ozean', label: 'Ozean', accent: '#17b9b2', accentStrong: '#167e88', accentSoft: '#c8f2ef', surface: '#effbfa', surfaceStrong: '#d7f0ee', text: '#16393e', muted: '#54757a', branches: ['#17b9b2', '#438fe1', '#8b75df', '#65af86', '#e3a247'] },
  { id: 'sonnenuntergang', label: 'Sonnenuntergang', accent: '#f06b4f', accentStrong: '#b74646', accentSoft: '#ffe1d8', surface: '#fff8f4', surfaceStrong: '#ffece3', text: '#4b2b32', muted: '#876169', branches: ['#f06b4f', '#f4a340', '#d65d8a', '#8e6ad9', '#df3f4b'] },
  { id: 'wald', label: 'Wald', accent: '#4e9a6a', accentStrong: '#276348', accentSoft: '#d8f0df', surface: '#f5fbf5', surfaceStrong: '#e3f2e4', text: '#183d2b', muted: '#5f796b', branches: ['#4e9a6a', '#87b94c', '#2e8f8b', '#bb9a45', '#708bca'] },
  { id: 'violett', label: 'Violett', accent: '#8b6be8', accentStrong: '#5c45a8', accentSoft: '#e9e2ff', surface: '#faf8ff', surfaceStrong: '#eee9ff', text: '#302852', muted: '#71698b', branches: ['#8b6be8', '#c06be3', '#587bd9', '#e27b9a', '#57aaa3'] },
  { id: 'monochrom', label: 'Monochrom', accent: '#516272', accentStrong: '#283744', accentSoft: '#dce4e8', surface: '#fafcfd', surfaceStrong: '#edf2f4', text: '#1f2d36', muted: '#667782', branches: ['#516272', '#718797', '#344b5c', '#8798a2', '#5f7688'] },
]

export function widgetColorSet(id?: WidgetColorSet): WidgetColorPalette {
  return widgetColorSets.find((palette) => palette.id === id) ?? widgetColorSets[0]!
}

export function widgetColorStyle(id?: WidgetColorSet): Record<string, string> {
  const palette = widgetColorSet(id)
  return {
    '--widget-accent': palette.accent,
    '--widget-accent-strong': palette.accentStrong,
    '--widget-accent-soft': palette.accentSoft,
    '--widget-surface': palette.surface,
    '--widget-surface-strong': palette.surfaceStrong,
    '--widget-text': palette.text,
    '--widget-muted': palette.muted,
  }
}
