import type { AppearanceColorSet, AppearancePalette } from '../domain/types'

export type AppearanceColorPreset = { light: AppearanceColorSet; dark: AppearanceColorSet }

export const appearanceColorPresets: Record<AppearancePalette, AppearanceColorPreset> = {
  lagoon: {
    light: { pageBackground: '#e8edef', surface: '#fbfcfc', raisedSurface: '#ffffff', text: '#1d2935', mutedText: '#52636b', border: '#c8d6d8', action: '#1d5960', actionText: '#ffffff' },
    dark: { pageBackground: '#142026', surface: '#1d2b31', raisedSurface: '#24363e', text: '#e7eff0', mutedText: '#b3c4c8', border: '#40545a', action: '#277f85', actionText: '#ffffff' },
  },
  forest: {
    light: { pageBackground: '#e9eee8', surface: '#fbfcfa', raisedSurface: '#ffffff', text: '#22312a', mutedText: '#52645a', border: '#c8d4c9', action: '#345c3c', actionText: '#ffffff' },
    dark: { pageBackground: '#17251e', surface: '#202f26', raisedSurface: '#293a2f', text: '#e8f0e8', mutedText: '#b5c5b5', border: '#43584a', action: '#4c8056', actionText: '#ffffff' },
  },
  berry: {
    light: { pageBackground: '#f1e9ec', surface: '#fdfbfc', raisedSurface: '#ffffff', text: '#34242c', mutedText: '#705661', border: '#dbc8d0', action: '#87374f', actionText: '#ffffff' },
    dark: { pageBackground: '#261820', surface: '#34222c', raisedSurface: '#402b36', text: '#f3e8ed', mutedText: '#d1b7c2', border: '#61414f', action: '#a54863', actionText: '#ffffff' },
  },
  citrus: {
    light: { pageBackground: '#f2eee4', surface: '#fffdf8', raisedSurface: '#ffffff', text: '#30291f', mutedText: '#6e6251', border: '#dbd2c2', action: '#80520f', actionText: '#ffffff' },
    dark: { pageBackground: '#282117', surface: '#372c1e', raisedSurface: '#443625', text: '#f4ecdd', mutedText: '#d1c0a2', border: '#625039', action: '#9a641d', actionText: '#ffffff' },
  },
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string): number => {
    const hex = color.replace('#', '')
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return 1
    const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex
    const channels = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255)
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
