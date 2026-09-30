import { describe, expect, it } from 'vitest'
import { deriveCurriculumAnnotationStatus } from './curriculumProgress'

const stamp = '2026-09-30T12:00:00.000Z'
const annotation = { id: 'annotation', classSubjectAssignmentId: 'assignment', curriculumNodeId: 'node', nodeKind: 'content-point' as const, status: 'rough-planned' as const, createdAt: stamp, updatedAt: stamp }
const sequence = { id: 'sequence', classSubjectAssignmentId: 'assignment', title: 'Vormärz', status: 'planned' as const, createdAt: stamp, updatedAt: stamp }
const reference = { id: 'reference', teachingSequenceId: 'sequence', curriculumNodeId: 'node', nodeKind: 'content-point' as const, relationType: 'primary' as const, createdAt: stamp, updatedAt: stamp }
const lesson = { id: 'lesson', teachingSequenceId: 'sequence', position: 1, title: 'Quellenarbeit', status: 'planned' as const, createdAt: stamp, updatedAt: stamp }

describe('deriveCurriculumAnnotationStatus', () => {
  it('leitet Termin, Durchführung und Wiederholung aus dem Reihenbezug ab', () => {
    const scheduled = { id: 'scheduled', classSubjectAssignmentId: 'assignment', sequenceLessonId: 'lesson', date: '2026-10-08', status: 'planned' as const, contextType: 'REGULAR_LESSON' as const, createdAt: stamp, updatedAt: stamp }
    expect(deriveCurriculumAnnotationStatus(annotation, [sequence], [reference], [lesson], [scheduled])).toBe('scheduled')
    expect(deriveCurriculumAnnotationStatus(annotation, [sequence], [reference], [{ ...lesson, status: 'completed' }], [{ ...scheduled, status: 'completed' }])).toBe('completed')
    expect(deriveCurriculumAnnotationStatus(annotation, [sequence], [reference], [{ ...lesson, status: 'needs-revisit' }], [scheduled])).toBe('needs-revisit')
  })

  it('bewahrt den persönlichen Marker ohne passenden Reihenbezug', () => {
    expect(deriveCurriculumAnnotationStatus({ ...annotation, status: 'scheduled' }, [], [], [], [])).toBe('scheduled')
  })
})
