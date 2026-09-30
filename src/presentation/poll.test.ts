import { describe, expect, it } from 'vitest'
import { createPlan } from '../domain/factories'
import { WorkshopPlanSchema } from '../schemas/plan'
import { duplicateSlide, ensurePresentation } from './presentation'
import { createPollElement, duplicatePoll } from './poll'

describe('Abstimmung als Präsentationselement', () => {
  it('erstellt eine valide Ja-Nein-Abstimmung', () => {
    const element = createPollElement()
    expect(element.content.poll).toMatchObject({ type: 'yes-no', options: [{ label: 'Ja' }, { label: 'Nein' }] })
  })

  it('dupliziert Widget und Antwortoptionen mit neuen IDs', () => {
    const plan = createPlan()
    const presentation = ensurePresentation(plan)
    const element = createPollElement()
    presentation.slides[0]!.elements.push(element)
    const directCopy = duplicatePoll(element.content.poll!)
    const slideCopy = duplicateSlide(presentation, presentation.slides[0]!.id)!

    expect(directCopy.id).not.toBe(element.content.poll!.id)
    expect(directCopy.options.map((option) => option.id)).not.toEqual(element.content.poll!.options.map((option) => option.id))
    expect(slideCopy.elements[0]!.content.poll?.id).not.toBe(element.content.poll!.id)
    expect(WorkshopPlanSchema.safeParse(plan).success).toBe(true)
  })
})
