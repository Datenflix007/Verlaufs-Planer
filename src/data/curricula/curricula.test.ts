import { describe, expect, it } from 'vitest'
import { calculateCurriculumCoverage } from './coverage'
import { committedCurricula, committedCurriculumSources, getApplicableCurriculum, getContentPointsForLearningArea, getCurriculumTree, getLearningAreas, searchCurricula } from './registry'

describe('committed Thueringer Gymnasium-Curricula', () => {
  it('validiert alle Datensaetze und ihre stabilen Referenzen', () => {
    const sourceIds = new Set(committedCurriculumSources.map((source) => source.id)); const ids = new Set<string>()
    for (const curriculum of committedCurricula) {
      expect(sourceIds.has(curriculum.sourceId)).toBe(true)
      for (const node of [...curriculum.competencyDomains, ...curriculum.competencies, ...curriculum.learningAreas, ...curriculum.contentPoints]) { expect(ids.has(node.id)).toBe(false); ids.add(node.id); expect(sourceIds.has(node.sourceRef.sourceId)).toBe(true) }
      for (const area of curriculum.learningAreas) { expect(area.competencyIds.every((id) => curriculum.competencies.some((item) => item.id === id))).toBe(true); expect(area.contentPointIds.every((id) => curriculum.contentPoints.some((item) => item.id === id))).toBe(true) }
      for (const point of curriculum.contentPoints) expect(curriculum.learningAreas.some((area) => area.id === point.learningAreaId)).toBe(true)
      for (const relation of curriculum.relations) { expect(ids.has(relation.fromId)).toBe(true); expect(ids.has(relation.toId)).toBe(true) }
    }
  })
  it('liefert Geschichte, Informatik und Medienbildung nach Klassenstufe', () => {
    const history = getApplicableCurriculum({ state: 'TH', schoolType: 'gymnasium', subjectId: 'subject-history', grade: 7, schoolYear: '2026/27' })
    const informatics = getApplicableCurriculum({ state: 'TH', schoolType: 'gymnasium', subjectId: 'subject-informatics', grade: 10, schoolYear: '2026/27' })
    const media = getApplicableCurriculum({ state: 'TH', schoolType: 'gymnasium', subjectId: 'subject-media-informatics', grade: 5, schoolYear: '2026/27' })
    expect(history?.competencyDomains.length).toBeGreaterThan(0); expect(history?.competencies.length).toBeGreaterThan(0); expect(getLearningAreas(history!.id, 7).length).toBeGreaterThan(0)
    expect(informatics?.contentPoints.length).toBeGreaterThan(0); expect(media?.contentPoints.length).toBeGreaterThan(0); expect(getContentPointsForLearningArea(media!.id, media!.learningAreas[0].id).length).toBeGreaterThan(0)
  })
  it('baut Lehrplanbaeume, sucht fachlich und berechnet Fortschritt ohne Referenzdaten zu veraendern', () => {
    const history = committedCurricula.find((curriculum) => curriculum.id === 'th-gym-history-2021')!
    const area = history.learningAreas.find((item) => item.gradeRange.from === 7)!
    expect(getCurriculumTree(history.id, 7)).toHaveLength(1)
    expect(searchCurricula('Weimarer Republik', { subjectId: history.subject.id, grade: 9 }).some((result) => result.nodeType === 'content-point')).toBe(true)
    const coverage = calculateCurriculumCoverage(history, [{ id: 'progress-1', teachingContextId: 'context-1', curriculumNodeId: area.contentPointIds[0], status: 'covered' }])
    expect(coverage.competencies).toMatchObject({ total: history.competencies.length, touched: 0, completed: 0 })
    expect(coverage.contentPoints).toMatchObject({ total: history.contentPoints.length, touched: 1, completed: 1 })
  })
})
