import { describe, expect, it } from 'vitest'
import { demoPlan } from '../fixtures/demoPlan'
import { createPlan } from '../domain/factories'
import { ensurePresentation } from '../presentation/presentation'
import { migratePlan } from './plan'

describe('Projektimport', () => {
  it('validiert aktuelle Daten und migriert versionlose Version-0-Daten', () => { expect(migratePlan(demoPlan).id).toBe(demoPlan.id); const legacy = { ...demoPlan }; delete (legacy as Partial<typeof demoPlan>).schemaVersion; expect(migratePlan(legacy).schemaVersion).toBe(3) })
  it('erganzt die Startzeitansicht bei bestehenden Planungen', () => { const legacySettings = { ...demoPlan, settings: { scheduleLayoutId: 'teaching' } }; expect(migratePlan(legacySettings).settings.timeDisplay).toBe('start') })
  it('migriert bestehende Version-1-Planungen ohne Präsentationsdaten rückwärtskompatibel', () => { expect(migratePlan({ ...demoPlan, schemaVersion: 1 }).presentation).toBeUndefined() })
  it('migriert V2-Präsentationen auf strukturierte Übergänge und erweiterte Stile', () => { const plan = createPlan(); const presentation = ensurePresentation(plan); presentation.slides[0]!.transition = { type: 'fade', duration: 400 }; const legacy = structuredClone(plan) as typeof plan & { schemaVersion: number }; legacy.schemaVersion = 2; (legacy.presentation!.slides[0]! as unknown as { transition: string }).transition = 'fade'; const migrated = migratePlan(legacy); expect(migrated.schemaVersion).toBe(3); expect(migrated.presentation?.slides[0]?.transition).toEqual({ type: 'fade', duration: 400 }) })
  it('weist unbekannte Zukunftsversionen mit einer verstandlichen Meldung ab', () => { expect(() => migratePlan({ ...demoPlan, schemaVersion: 99 })).toThrow('Schema-Version 99') })
})
