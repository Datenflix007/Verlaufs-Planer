import { describe, expect, it } from 'vitest'
import { parsePlanningTemplate } from '../../schemas/planningTemplate'
import { getPlanningTemplates, registerLocalTemplate } from './registry'

describe('lokale Planungsvorlagen', () => {
  it('liefert keine mitgelieferte Vorlagenbibliothek', () => expect(getPlanningTemplates()).toEqual([]))
  it('validiert Version und Referenzkonsistenz', () => {
    expect(() => parsePlanningTemplate({ id: 'ohne-version', name: { de: 'Ohne Version' }, version: '1.0.0' })).toThrow()
    expect(() => parsePlanningTemplate({ schemaVersion: 1, id: 'meine-vorlage', name: { de: 'Meine Vorlage' }, version: '1.0.0', competencyFrameworkIds: ['eu-digcomp-3.0'], defaultCompetencyFrameworkId: 'anderer-rahmen' })).toThrow(/Standard-Kompetenzrahmen/)
    expect(() => registerLocalTemplate({ schemaVersion: 1, id: 'unbekannt', name: { de: 'Unbekannt' }, version: '1.0.0', competencyFrameworkIds: ['nicht-vorhanden'] })).toThrow(/unbekannten Kompetenzrahmen/)
  })
})
