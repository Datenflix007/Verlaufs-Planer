import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { createPlan } from '../domain/factories'
import { applySlideLayout, clonePresentationData, createElement, createShape, createTextElement, deleteSlide, duplicateSlide, ensurePresentation, insertSlide, moveSlide, nextSlide, orderedSlides } from './presentation'
import { openPresentationChannel, type PresentationChannelEvent } from './presenterChannel'

describe('Präsentations-Folien und Einstiegspunkte', () => {
  it('bewahrt die stabile ID eines verknüpften Slides beim Einfügen und Verschieben', () => {
    const plan = createPlan('Biologie'); const presentation = ensurePresentation(plan); const targetId = presentation.slides[0]!.id
    plan.schedule.push({ id: crypto.randomUUID(), dayId: plan.days[0]!.id, type: 'phase', materialIds: [], presentationEntryPoint: { id: crypto.randomUUID(), slideId: targetId, createdAt: new Date().toISOString() } })
    insertSlide(presentation, undefined); insertSlide(presentation, undefined); moveSlide(presentation, targetId, 2)
    expect(plan.schedule[0]!.presentationEntryPoint?.slideId).toBe(targetId)
    expect(orderedSlides(presentation).map((slide) => slide.id)).toContain(targetId)
  })
  it('gibt Duplikaten neue IDs, einschließlich ihrer Elemente', () => {
    const presentation = ensurePresentation(createPlan()); const source = presentation.slides[0]!
    source.elements.push(createElement('text', { x: 10, y: 10 }))
    const copy = duplicateSlide(presentation, source.id)!
    expect(copy.id).not.toBe(source.id); expect(copy.elements[0]?.id).not.toBe(source.elements[0]?.id)
  })
  it('kopiert reaktive Präsentationen für den Verlauf und dupliziert reaktive Folien und Elemente', () => {
    const presentation = reactive(ensurePresentation(createPlan()))
    const source = presentation.slides[0]!
    source.elements.push(createTextElement('body'))

    const snapshot = clonePresentationData(presentation)
    source.elements[0]!.content.text = 'Bearbeitet'
    expect(snapshot.slides[0]!.elements[0]!.content.text).toBe('Text hinzufügen')

    const elementCopy = clonePresentationData(source.elements[0]!)
    expect(elementCopy).toEqual(source.elements[0])
    expect(elementCopy).not.toBe(source.elements[0])

    const slideCopy = duplicateSlide(presentation, source.id)!
    expect(slideCopy.id).not.toBe(source.id)
    expect(slideCopy.elements[0]!.id).not.toBe(source.elements[0]!.id)
    expect(slideCopy.elements[0]!.content.text).toBe('Bearbeitet')
  })
  it('entfernt eine verknüpfte Folie ohne die Referenz umzubiegen', () => {
    const plan = createPlan(); const presentation = ensurePresentation(plan); const target = presentation.slides[0]!
    plan.schedule.push({ id: crypto.randomUUID(), dayId: plan.days[0]!.id, type: 'phase', materialIds: [], presentationEntryPoint: { id: crypto.randomUUID(), slideId: target.id, createdAt: new Date().toISOString() } })
    deleteSlide(presentation, target.id)
    expect(plan.schedule[0]!.presentationEntryPoint?.slideId).toBe(target.id)
    expect(presentation.slides.find((slide) => slide.id === target.id)).toBeUndefined()
  })
  it('behält eine Verknüpfung beim Bearbeiten und Löschen einer anderen Folie', () => {
    const plan = createPlan(); const presentation = ensurePresentation(plan); const target = presentation.slides[0]!; const other = insertSlide(presentation, target.id)
    plan.schedule.push({ id: crypto.randomUUID(), dayId: plan.days[0]!.id, type: 'phase', materialIds: [], presentationEntryPoint: { id: crypto.randomUUID(), slideId: target.id, createdAt: new Date().toISOString() } })
    const currentTarget = presentation.slides.find((slide) => slide.id === target.id)!; currentTarget.title = 'Bearbeitet'; deleteSlide(presentation, other.id)
    expect(plan.schedule[0]!.presentationEntryPoint?.slideId).toBe(target.id); expect(presentation.slides[0]?.title).toBe('Bearbeitet')
  })
  it('bestimmt die nächste Folie nur über die aktuelle Reihenfolge', () => {
    const presentation = ensurePresentation(createPlan()); const second = insertSlide(presentation, presentation.slides[0]!.id)
    expect(nextSlide(presentation, presentation.slides[0]!.id)?.id).toBe(second.id)
  })
  it('überträgt SLIDE_CHANGE mit der stabilen Slide-ID über BroadcastChannel', async () => {
    const id = crypto.randomUUID(); const sender = openPresentationChannel(id); const receiver = openPresentationChannel(id)
    const received = new Promise<PresentationChannelEvent>((resolve) => { receiver.onmessage = (event: MessageEvent<PresentationChannelEvent>) => resolve(event.data) })
    sender.postMessage({ type: 'SLIDE_CHANGE', slideId: crypto.randomUUID() } satisfies PresentationChannelEvent)
    await expect(received).resolves.toMatchObject({ type: 'SLIDE_CHANGE' })
    sender.close(); receiver.close()
  })
  it('erstellt Text, Bild und Form mit eindeutigen Element-IDs', () => {
    const presentation = ensurePresentation(createPlan()); const slide = presentation.slides[0]!
    const title = createTextElement('title'); const image = createElement('image', { x: 40, y: 50 }); const shape = createShape('roundedRectangle')
    slide.elements.push(title, image, shape)
    expect(new Set(slide.elements.map((element) => element.id)).size).toBe(3)
    expect(title.content.text).toBe('Titel hinzufügen'); expect(shape.content.shape).toBe('roundedRectangle')
  })
  it('fügt ein Layout nicht-destruktiv zu vorhandenen Elementen hinzu', () => {
    const presentation = ensurePresentation(createPlan()); const slide = presentation.slides[0]!; const existing = createTextElement('body'); slide.elements.push(existing)
    applySlideLayout(slide, 'titleContent')
    expect(slide.elements.some((element) => element.id === existing.id)).toBe(true); expect(slide.elements.length).toBeGreaterThan(1)
  })
  it('belässt Inhalte beim Theme-Wechsel unverändert', () => {
    const presentation = ensurePresentation(createPlan()); const element = createTextElement('body'); presentation.slides[0]!.elements.push(element)
    presentation.themeId = 'natur'
    expect(presentation.slides[0]!.elements[0]?.id).toBe(element.id); expect(presentation.slides[0]!.elements[0]?.content.text).toBe('Text hinzufügen')
  })
})
