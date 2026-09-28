import { createId } from '../domain/factories'
import type { Presentation, PresentationElement, PresentationLayoutType, PresentationShapeType, PresentationSlide, PresentationThemeId, WorkshopPlan } from '../domain/types'
import { duplicateMindmap } from './mindmap'

const now = (): string => new Date().toISOString()
// Presentation data is persisted as JSON; serializing it also unwraps Vue's reactive proxies.
export function clonePresentationData<T extends Presentation | PresentationSlide | PresentationElement>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
export const orderedSlides = (presentation: Presentation): PresentationSlide[] => [...presentation.slides].sort((left, right) => left.position - right.position)

export const presentationThemes: Array<{ id: PresentationThemeId; label: string; background: string; primary: string; secondary: string; text: string; headingFont: string; bodyFont: string }> = [
  { id: 'schlicht', label: 'Schlicht', background: '#f7fbfb', primary: '#17646a', secondary: '#78aeb0', text: '#17363a', headingFont: 'Inter, sans-serif', bodyFont: 'Inter, sans-serif' },
  { id: 'tafelstil', label: 'Tafelstil', background: '#183d37', primary: '#d0efd7', secondary: '#8ebca0', text: '#f3f6e9', headingFont: 'Georgia, serif', bodyFont: 'Inter, sans-serif' },
  { id: 'neon', label: 'Neon', background: '#15152d', primary: '#69f7e0', secondary: '#b48cff', text: '#f5f0ff', headingFont: 'Arial Black, sans-serif', bodyFont: 'Inter, sans-serif' },
  { id: 'arbeitsblatt', label: 'Arbeitsblatt', background: '#fffdf6', primary: '#567b49', secondary: '#8fad83', text: '#263d25', headingFont: 'Georgia, serif', bodyFont: 'Georgia, serif' },
  { id: 'natur', label: 'Natur', background: '#e9f3e7', primary: '#34724c', secondary: '#98c78d', text: '#173b29', headingFont: 'Georgia, serif', bodyFont: 'Inter, sans-serif' },
]
export const presentationTheme = (id: PresentationThemeId) => presentationThemes.find((theme) => theme.id === id) ?? presentationThemes[0]!

export function createSlide(position: number, title = ''): PresentationSlide {
  const timestamp = now()
  return { id: createId(), position, title, layoutType: 'title', background: {}, notes: '', transition: { type: 'fade', duration: 400 }, elements: [], createdAt: timestamp, updatedAt: timestamp }
}
export function ensurePresentation(plan: WorkshopPlan): Presentation {
  if (plan.presentation) return plan.presentation
  const timestamp = now()
  plan.presentation = { id: createId(), planId: plan.id, title: plan.metadata.title, themeId: 'schlicht', slides: [createSlide(0)], recentColors: [], createdAt: timestamp, updatedAt: timestamp }
  return plan.presentation
}
export function normaliseSlidePositions(presentation: Presentation): void {
  presentation.slides = orderedSlides(presentation).map((slide, position) => ({ ...slide, position }))
  presentation.updatedAt = now()
}
export function insertSlide(presentation: Presentation, afterSlideId?: string): PresentationSlide {
  const slides = orderedSlides(presentation)
  const index = afterSlideId ? Math.max(0, slides.findIndex((slide) => slide.id === afterSlideId) + 1) : slides.length
  const slide = createSlide(index)
  slides.splice(index, 0, slide); presentation.slides = slides; normaliseSlidePositions(presentation)
  return slide
}
export function duplicateSlide(presentation: Presentation, slideId: string): PresentationSlide | undefined {
  const source = presentation.slides.find((slide) => slide.id === slideId)
  if (!source) return undefined
  const copy = clonePresentationData(source); const timestamp = now(); copy.id = createId(); copy.position = source.position + 1; copy.title = `${source.title || 'Folie'} (Kopie)`; copy.createdAt = timestamp; copy.updatedAt = timestamp
  copy.elements = copy.elements.map((element) => ({ ...element, id: createId(), content: element.content.mindmap ? { ...element.content, mindmap: duplicateMindmap(element.content.mindmap) } : element.content, createdAt: timestamp, updatedAt: timestamp }))
  presentation.slides.push(copy); normaliseSlidePositions(presentation); return copy
}
export function moveSlide(presentation: Presentation, slideId: string, destination: number): void {
  const slides = orderedSlides(presentation); const sourceIndex = slides.findIndex((slide) => slide.id === slideId)
  if (sourceIndex < 0) return
  const [slide] = slides.splice(sourceIndex, 1); if (!slide) return
  slides.splice(Math.max(0, Math.min(destination, slides.length)), 0, slide); presentation.slides = slides; normaliseSlidePositions(presentation)
}
export function deleteSlide(presentation: Presentation, slideId: string): boolean {
  const count = presentation.slides.length; presentation.slides = presentation.slides.filter((slide) => slide.id !== slideId)
  if (presentation.slides.length === count) return false
  normaliseSlidePositions(presentation); return true
}
export function createElement(type: PresentationElement['type'], position: { x: number; y: number }, options: Partial<PresentationElement> = {}): PresentationElement {
  const timestamp = now()
  const base: PresentationElement = { id: createId(), type, x: position.x, y: position.y, width: type === 'text' ? 420 : type === 'icon' ? 100 : 280, height: type === 'text' ? 120 : type === 'icon' ? 100 : 190, rotation: 0, zIndex: 1, style: { opacity: 1 }, content: {}, createdAt: timestamp, updatedAt: timestamp, ...options }
  if (type === 'text' && !base.content.text) base.content.text = 'Text hinzufügen'
  if (type === 'shape') { if (!base.content.shape) base.content.shape = 'rectangle'; if (!base.style.backgroundColor) base.style.backgroundColor = '#397078' }
  if (type === 'image') base.content.src = ''
  if (type === 'icon') base.content.icon = '★'
  return base
}
export function createTextElement(kind: 'title' | 'subtitle' | 'body' | 'caption', position = { x: 120, y: 110 }): PresentationElement {
  const preset = { title: { text: 'Titel hinzufügen', size: 52, weight: 800 }, subtitle: { text: 'Untertitel hinzufügen', size: 32, weight: 600 }, body: { text: 'Text hinzufügen', size: 23, weight: 400 }, caption: { text: 'Beschriftung', size: 16, weight: 500 } }[kind]
  return createElement('text', position, { width: kind === 'body' ? 520 : 720, height: kind === 'body' ? 170 : 90, style: { fontSize: preset.size, fontWeight: preset.weight, opacity: 1 }, content: { text: preset.text } })
}
export function createShape(shape: PresentationShapeType, position = { x: 180, y: 180 }): PresentationElement {
  const line = shape === 'line' || shape === 'arrow'
  return createElement('shape', position, { width: line ? 360 : 280, height: line ? 8 : 180, style: { backgroundColor: line ? 'transparent' : '#397078', stroke: '#17646a', strokeWidth: line ? 5 : 0, borderRadius: shape === 'roundedRectangle' ? 20 : 0, opacity: 1 }, content: { shape } })
}
export const presentationLayouts: Array<{ id: PresentationLayoutType; label: string; description: string }> = [
  { id: 'blank', label: 'Leer', description: 'Freie Folie' }, { id: 'title', label: 'Titel', description: 'Titel und Untertitel' }, { id: 'titleContent', label: 'Titel + Inhalt', description: 'Titel und Text' }, { id: 'twoColumn', label: 'Zwei Spalten', description: 'Gegenüberstellung' }, { id: 'imageText', label: 'Bild + Text', description: 'Bild und Erklärung' }, { id: 'section', label: 'Abschnitt', description: 'Kapiteltrenner' }, { id: 'closing', label: 'Abschluss', description: 'Zusammenfassung' },
]
export function applySlideLayout(slide: PresentationSlide, layout: PresentationLayoutType): void {
  slide.layoutType = layout
  const additions: PresentationElement[] = []
  if (layout === 'title' || layout === 'section' || layout === 'closing') { additions.push(createTextElement('title', { x: 120, y: layout === 'section' ? 270 : 170 })); additions.push(createTextElement('subtitle', { x: 125, y: layout === 'section' ? 390 : 285 })) }
  if (layout === 'titleContent') { additions.push(createTextElement('title', { x: 100, y: 90 })); additions.push(createTextElement('body', { x: 110, y: 240 })) }
  if (layout === 'twoColumn') { additions.push(createTextElement('title', { x: 90, y: 70 })); additions.push(createTextElement('body', { x: 100, y: 220 })); additions.push(createTextElement('body', { x: 690, y: 220 })) }
  if (layout === 'imageText') { additions.push(createTextElement('title', { x: 90, y: 70 })); additions.push(createElement('image', { x: 90, y: 220 }, { width: 490, height: 360 })); additions.push(createTextElement('body', { x: 660, y: 255 })) }
  slide.elements.push(...additions.map((element, index) => ({ ...element, zIndex: slide.elements.length + index + 1 }))); slide.updatedAt = now()
}
export function bringToFront(slide: PresentationSlide, elementId: string): void { const element = slide.elements.find((item) => item.id === elementId); if (element) element.zIndex = Math.max(0, ...slide.elements.map((item) => item.zIndex)) + 1 }
export function sendToBack(slide: PresentationSlide, elementId: string): void { const element = slide.elements.find((item) => item.id === elementId); if (element) element.zIndex = Math.min(0, ...slide.elements.map((item) => item.zIndex)) - 1 }
export function slideIndex(presentation: Presentation, slideId: string): number { return orderedSlides(presentation).findIndex((slide) => slide.id === slideId) }
export function nextSlide(presentation: Presentation, slideId: string): PresentationSlide | undefined { const slides = orderedSlides(presentation); return slides[slideIndex(presentation, slideId) + 1] }
