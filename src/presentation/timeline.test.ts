import { describe, expect, it } from 'vitest'
import { createPlan } from '../domain/factories'
import { WorkshopPlanSchema } from '../schemas/plan'
import { duplicateSlide, ensurePresentation } from './presentation'
import { createTimelineElement, duplicateTimeline } from './timeline'

describe('Zeitstrahl als Präsentationselement', () => {
  it('erstellt einen validen Zeitstrahl mit editierbaren Ereignissen', () => {
    const element = createTimelineElement()
    expect(element.type).toBe('timeline')
    expect(element.content.timeline?.entries).toHaveLength(3)
    expect(new Set(element.content.timeline?.entries.map((entry) => entry.id)).size).toBe(3)
  })

  it('dupliziert Zeitstrahlen und Ereignisse mit neuen IDs', () => {
    const plan = createPlan()
    const presentation = ensurePresentation(plan)
    const element = createTimelineElement()
    presentation.slides[0]!.elements.push(element)
    const directCopy = duplicateTimeline(element.content.timeline!)
    const slideCopy = duplicateSlide(presentation, presentation.slides[0]!.id)!

    expect(directCopy.id).not.toBe(element.content.timeline?.id)
    expect(directCopy.entries.map((entry) => entry.id)).not.toEqual(element.content.timeline?.entries.map((entry) => entry.id))
    expect(slideCopy.elements[0]!.content.timeline?.id).not.toBe(element.content.timeline?.id)
    expect(WorkshopPlanSchema.safeParse(plan).success).toBe(true)
  })
})
