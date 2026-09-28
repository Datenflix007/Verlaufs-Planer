import { describe, expect, it } from 'vitest'
import { demoPlan } from '../fixtures/demoPlan'
import { aggregateMaterials } from './materials'
import { synchronizeTime, totalDayMinutes } from './schedule'

describe('Zeit- und Materiallogik', () => {
  it('berechnet Ende und Tagesdauer ohne manuelle Werte zu ueberschreiben', () => { expect(synchronizeTime({ ...demoPlan.schedule[0], startTime: '09:00', durationMinutes: 15 }, 'duration').endTime).toBe('09:15'); expect(totalDayMinutes(demoPlan.schedule, demoPlan.days[0].id)).toBe(140) })
  it('fasst zentral referenzierte Materialien genau einmal zusammen', () => { const cards = aggregateMaterials(demoPlan.materials, demoPlan.schedule).find((usage) => usage.material.name === 'Klemmbretter'); expect(cards?.entries).toHaveLength(2) })
})
