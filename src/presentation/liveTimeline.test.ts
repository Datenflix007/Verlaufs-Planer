import { describe, expect, it } from 'vitest'
import { createPlan } from '../domain/factories'
import { applyTimelineUpdate, timelineUpdate } from './liveTimeline'
import { ensurePresentation } from './presentation'
import { createTimelineElement } from './timeline'

describe('Live-Zeitstrahl im Vortrag', () => {
  it('überträgt einen unveränderlichen Zeitstrahl-Snapshot an dasselbe Widget', () => {
    const presentation = ensurePresentation(createPlan())
    const element = createTimelineElement()
    presentation.slides[0]!.elements.push(element)
    const event = timelineUpdate(presentation.slides[0]!.id, element.id, element.content.timeline!)
    element.content.timeline!.entries[0]!.date = '1788'
    const audience = structuredClone(presentation)
    audience.slides[0]!.elements[0]!.content.timeline!.entries[0]!.date = 'Alt'

    expect(applyTimelineUpdate(audience, event)).toBe(true)
    expect(audience.slides[0]!.elements[0]!.content.timeline!.entries[0]!.date).toBe('1789')
  })

  it('verwirft Updates für eine fremde Folie oder ein fremdes Widget', () => {
    const presentation = ensurePresentation(createPlan())
    const element = createTimelineElement()
    presentation.slides[0]!.elements.push(element)
    const event = timelineUpdate(presentation.slides[0]!.id, element.id, element.content.timeline!)

    expect(applyTimelineUpdate(presentation, { ...event, slideId: crypto.randomUUID() })).toBe(false)
    expect(applyTimelineUpdate(presentation, { ...event, elementId: crypto.randomUUID() })).toBe(false)
  })
})
