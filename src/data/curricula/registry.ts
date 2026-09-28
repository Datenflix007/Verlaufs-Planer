import history from './thuringia/gymnasium/history/2021.json'
import informatics from './thuringia/gymnasium/informatics/2012.json'
import mediaInformatics from './thuringia/gymnasium/media-informatics/2024.json'
import sources from './thuringia/gymnasium/sources.json'
import type { Curriculum, CurriculumContentPoint, CurriculumLearningArea } from '../../domain/types'
import { CurriculumSchema, CurriculumSourceSchema } from '../../schemas/curriculum'
import { buildCurriculumTree } from './coverage'

export const committedCurriculumSources = sources.map((source) => CurriculumSourceSchema.parse(source))
export const committedCurricula: Curriculum[] = [history, informatics, mediaInformatics].map((curriculum) => CurriculumSchema.parse(curriculum) as Curriculum)
export const getCurricula = (): Curriculum[] => committedCurricula
export const getCurriculum = (id: string): Curriculum | undefined => committedCurricula.find((curriculum) => curriculum.id === id)
export const getCurriculaBySubject = (subjectId: string): Curriculum[] => committedCurricula.filter((curriculum) => curriculum.subject.id === subjectId)
export const getApplicableCurriculum = (query: { state: 'TH'; schoolType: 'gymnasium'; subjectId: string; grade: number; schoolYear: string }): Curriculum | undefined => committedCurricula.find((curriculum) => curriculum.jurisdiction === query.state && curriculum.schoolType === query.schoolType && curriculum.subject.id === query.subjectId && curriculum.applicability.some((item) => item.grades.includes(query.grade) && (!item.schoolYearFrom || item.schoolYearFrom <= query.schoolYear) && (!item.schoolYearTo || item.schoolYearTo >= query.schoolYear)))
export const getLearningAreas = (curriculumId: string, grade?: number): CurriculumLearningArea[] => (getCurriculum(curriculumId)?.learningAreas ?? []).filter((area) => grade === undefined || (area.gradeRange.from <= grade && area.gradeRange.to >= grade))
export const getCompetenciesForLearningArea = (curriculumId: string, areaId: string) => { const curriculum = getCurriculum(curriculumId); const area = curriculum?.learningAreas.find((item) => item.id === areaId); return curriculum?.competencies.filter((item) => area?.competencyIds.includes(item.id)) ?? [] }
export const getContentPointsForLearningArea = (curriculumId: string, areaId: string): CurriculumContentPoint[] => { const curriculum = getCurriculum(curriculumId); return curriculum?.contentPoints.filter((item) => item.learningAreaId === areaId) ?? [] }
export const getCurriculumTree = (curriculumId: string, grade?: number) => { const curriculum = getCurriculum(curriculumId); return curriculum ? buildCurriculumTree(curriculum, grade) : [] }

export interface CurriculumSearchResult { curriculumId: string; subjectId: string; subjectName: string; nodeType: 'competency-domain' | 'learning-area' | 'competency' | 'content-point'; nodeId: string; title: string; gradeRange?: { from: number; to: number }; tags?: string[] }
export const searchCurricula = (query: string, filters: { subjectId?: string; grade?: number } = {}): CurriculumSearchResult[] => {
  const needle = query.trim().toLocaleLowerCase('de')
  if (!needle) return []
  const results: CurriculumSearchResult[] = []
  for (const curriculum of committedCurricula) {
    if (filters.subjectId && curriculum.subject.id !== filters.subjectId) continue
    results.push(
      ...curriculum.competencyDomains.map((item) => ({ curriculumId: curriculum.id, subjectId: curriculum.subject.id, subjectName: curriculum.subject.name.de, nodeType: 'competency-domain' as const, nodeId: item.id, title: item.title })),
      ...curriculum.learningAreas.map((item) => ({ curriculumId: curriculum.id, subjectId: curriculum.subject.id, subjectName: curriculum.subject.name.de, nodeType: 'learning-area' as const, nodeId: item.id, title: item.title, gradeRange: item.gradeRange })),
      ...curriculum.competencies.map((item) => ({ curriculumId: curriculum.id, subjectId: curriculum.subject.id, subjectName: curriculum.subject.name.de, nodeType: 'competency' as const, nodeId: item.id, title: item.normalizedLabel ?? item.text, gradeRange: item.gradeRange, tags: item.tags })),
      ...curriculum.contentPoints.map((item) => ({ curriculumId: curriculum.id, subjectId: curriculum.subject.id, subjectName: curriculum.subject.name.de, nodeType: 'content-point' as const, nodeId: item.id, title: item.title, tags: item.kind ? [item.kind] : undefined })),
    )
  }
  return results.filter((item) => `${item.subjectId} ${item.subjectName} ${item.title} ${(item.tags ?? []).join(' ')}`.toLocaleLowerCase('de').includes(needle)).filter((item) => !filters.grade || !item.gradeRange || (item.gradeRange.from <= filters.grade && item.gradeRange.to >= filters.grade))
}
