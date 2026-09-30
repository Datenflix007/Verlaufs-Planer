import { describe, expect, it } from 'vitest'
import { didacticChecksForSequence } from './didacticChecks'

const stamp = '2026-09-30T12:00:00.000Z'
const sequence = { id: '00000000-0000-4000-8000-000000000001', classSubjectAssignmentId: '00000000-0000-4000-8000-000000000002', title: 'Vormärz', status: 'planned' as const, createdAt: stamp, updatedAt: stamp }
const lesson = { id: '00000000-0000-4000-8000-000000000003', teachingSequenceId: sequence.id, position: 1, title: 'Historische Lieder', status: 'planned' as const, createdAt: stamp, updatedAt: stamp }

describe('didacticChecksForSequence', () => {
  it('zeigt konkrete Planungshinweise statt eines Qualitätsurteils', () => {
    expect(didacticChecksForSequence(sequence, [{ ...lesson, digitalTools: 'Quellenboard' }], [], [])).toMatchObject([
      { id: 'missing-curriculum-reference', severity: 'attention' },
      { id: 'missing-competency-reference', severity: 'hint' },
      { id: 'missing-lesson-objective', severity: 'attention' },
      { id: 'missing-offline-fallback', severity: 'attention' },
    ])
  })

  it('entfernt erfüllte Hinweise', () => {
    expect(didacticChecksForSequence(sequence, [{ ...lesson, lessonObjective: 'Die Lernenden ordnen Quellen ein.', competenceFocus: 'Quellenkritik', digitalTools: 'Quellenboard', fallbackPlan: 'Ausdrucke' }], [{ id: '00000000-0000-4000-8000-000000000004', teachingSequenceId: sequence.id, curriculumNodeId: 'history-vormaerz', nodeKind: 'content-point', relationType: 'primary', createdAt: stamp, updatedAt: stamp }], [{ id: '00000000-0000-4000-8000-000000000005', teachingSequenceId: sequence.id, competencyId: 'history-method', role: 'primary', createdAt: stamp, updatedAt: stamp }])).toEqual([])
  })
})
