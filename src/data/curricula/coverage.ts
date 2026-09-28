import type { Curriculum, CurriculumContentPoint, CurriculumLearningArea, CurriculumProgressEntry } from '../../domain/types'

export interface CoverageBucket { total: number; touched: number; completed: number }
export interface CurriculumCoverage { competencies: CoverageBucket; contentPoints: CoverageBucket; learningAreas: CoverageBucket }

const completedStatuses = new Set(['covered', 'completed'])
const coverageFor = (ids: string[], entries: CurriculumProgressEntry[]): CoverageBucket => {
  const relevant = entries.filter((entry) => ids.includes(entry.curriculumNodeId))
  return { total: ids.length, touched: new Set(relevant.map((entry) => entry.curriculumNodeId)).size, completed: new Set(relevant.filter((entry) => completedStatuses.has(entry.status)).map((entry) => entry.curriculumNodeId)).size }
}

// This is a pure projection: neither curriculum reference data nor user progress is mutated.
export const calculateCurriculumCoverage = (curriculum: Curriculum, progressEntries: CurriculumProgressEntry[]): CurriculumCoverage => ({
  competencies: coverageFor(curriculum.competencies.map((item) => item.id), progressEntries),
  contentPoints: coverageFor(curriculum.contentPoints.map((item) => item.id), progressEntries),
  learningAreas: coverageFor(curriculum.learningAreas.map((item) => item.id), progressEntries),
})

export interface CurriculumTreeArea extends CurriculumLearningArea { competencies: Curriculum['competencies']; contentPoints: CurriculumContentPoint[] }
export const buildCurriculumTree = (curriculum: Curriculum, grade?: number): CurriculumTreeArea[] => curriculum.learningAreas
  .filter((area) => grade === undefined || (area.gradeRange.from <= grade && area.gradeRange.to >= grade))
  .map((area) => ({ ...area, competencies: curriculum.competencies.filter((competency) => area.competencyIds.includes(competency.id)), contentPoints: curriculum.contentPoints.filter((contentPoint) => area.contentPointIds.includes(contentPoint.id)) }))
