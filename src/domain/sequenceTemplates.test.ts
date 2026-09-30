import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSequenceTemplate, getSequenceTemplates, saveSequenceTemplate } from './sequenceTemplates'

const stamp = '2026-09-30T12:00:00.000Z'
beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() })
})
afterEach(() => vi.unstubAllGlobals())

describe('lokale Reihenvorlagen', () => {
  it('behält die didaktische Struktur, aber keine Termine, Detailpläne oder Reflexionen', () => {
    const sequence = { id: '00000000-0000-4000-8000-000000000001', classSubjectAssignmentId: '00000000-0000-4000-8000-000000000002', title: 'Vormärz', status: 'completed' as const, createdAt: stamp, updatedAt: stamp }
    const template = createSequenceTemplate(sequence, [{ id: 'ref', teachingSequenceId: sequence.id, curriculumNodeId: 'history-vormaerz', nodeKind: 'content-point', relationType: 'primary', createdAt: stamp, updatedAt: stamp }], [{ id: 'competency', teachingSequenceId: sequence.id, competencyId: 'history-method', role: 'primary', createdAt: stamp, updatedAt: stamp }], [{ id: 'lesson', teachingSequenceId: sequence.id, position: 1, title: 'Quellen lesen', plannedDate: '2026-09-04', scheduledLessonId: 'scheduled', planId: 'plan', digitalTools: 'Quellenboard', fallbackPlan: 'Ausdrucke', status: 'completed', createdAt: stamp, updatedAt: stamp }])
    saveSequenceTemplate(template)
    expect(getSequenceTemplates()).toMatchObject([{ name: 'Vormärz', curriculumReferences: [{ curriculumNodeId: 'history-vormaerz' }], competencies: [{ competencyId: 'history-method' }], lessons: [{ title: 'Quellen lesen', digitalTools: 'Quellenboard', fallbackPlan: 'Ausdrucke' }] }])
    expect(getSequenceTemplates()[0].lessons[0]).not.toHaveProperty('plannedDate')
    expect(getSequenceTemplates()[0].lessons[0]).not.toHaveProperty('planId')
  })
})
