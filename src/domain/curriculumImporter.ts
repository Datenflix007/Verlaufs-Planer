import type { Curriculum } from './types'
import { CurriculumSchema } from '../schemas/curriculum'

export class CurriculumImportError extends Error { constructor(message: string, readonly code: 'MISSING_SOURCE' | 'UNSUPPORTED_FORMAT' | 'INVALID_CURRICULUM') { super(message) } }
export interface CurriculumImportSource { format: 'json'; sourceUrl: string; content?: unknown }
export interface CurriculumImporter {
  parseSource(source: CurriculumImportSource): unknown
  extractStructure(raw: unknown): Pick<Curriculum, 'competencyDomains' | 'learningAreas' | 'contentPoints'>
  extractCompetencies(raw: unknown): Curriculum['competencies']
  extractReferences(raw: unknown): Pick<Curriculum, 'sourceId' | 'applicability'>
  validate(raw: unknown): Curriculum
  import(source: CurriculumImportSource): Curriculum
}

export class JsonCurriculumImporter implements CurriculumImporter {
  parseSource(source: CurriculumImportSource): unknown {
    if (!source.sourceUrl.trim() || source.content === undefined) throw new CurriculumImportError('Die Curriculumquelle fehlt oder ist nicht lesbar.', 'MISSING_SOURCE')
    return source.content
  }
  validate(raw: unknown): Curriculum { const parsed = CurriculumSchema.safeParse(raw); if (!parsed.success) throw new CurriculumImportError(`Das Curriculum ist ungültig: ${parsed.error.issues[0]?.message ?? 'unbekannter Fehler'}`, 'INVALID_CURRICULUM'); return parsed.data as Curriculum }
  extractStructure(raw: unknown) { const value = this.validate(raw); return { competencyDomains: value.competencyDomains, learningAreas: value.learningAreas, contentPoints: value.contentPoints } }
  extractCompetencies(raw: unknown) { return this.validate(raw).competencies }
  extractReferences(raw: unknown) { const value = this.validate(raw); return { sourceId: value.sourceId, applicability: value.applicability } }
  import(source: CurriculumImportSource): Curriculum { return this.validate(this.parseSource(source)) }
}
