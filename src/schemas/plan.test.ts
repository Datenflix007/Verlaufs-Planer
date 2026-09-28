import { describe, expect, it } from 'vitest'
import { demoPlan } from '../fixtures/demoPlan'
import { migratePlan } from './plan'

describe('Projektimport', () => {
  it('validiert Version 1 und migriert versionlose Version-0-Daten', () => { expect(migratePlan(demoPlan).id).toBe(demoPlan.id); const legacy = { ...demoPlan }; delete (legacy as Partial<typeof demoPlan>).schemaVersion; expect(migratePlan(legacy).schemaVersion).toBe(1) })
  it('erganzt die Startzeitansicht bei bestehenden Planungen', () => { const legacySettings = { ...demoPlan, settings: { scheduleLayoutId: 'teaching' } }; expect(migratePlan(legacySettings).settings.timeDisplay).toBe('start') })
  it('weist unbekannte Zukunftsversionen mit einer verstandlichen Meldung ab', () => { expect(() => migratePlan({ ...demoPlan, schemaVersion: 99 })).toThrow('Schema-Version 99') })
})
