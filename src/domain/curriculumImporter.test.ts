import { describe, expect, it } from 'vitest'
import { committedCurricula } from '../data/curricula/registry'
import { CurriculumImportError, JsonCurriculumImporter } from './curriculumImporter'

describe('CurriculumImporter', () => {
  it('validiert eine vorhandene Referenzquelle ohne Inhalte zu erfinden', () => { const importer = new JsonCurriculumImporter(); const curriculum = importer.import({ format: 'json', sourceUrl: 'https://example.test/curriculum.json', content: committedCurricula[0] }); expect(curriculum.id).toBe(committedCurricula[0]?.id); expect(importer.extractReferences(curriculum).sourceId).toBeTruthy() })
  it('weist fehlende oder ungültige Quellen explizit zurück', () => { const importer = new JsonCurriculumImporter(); expect(() => importer.import({ format: 'json', sourceUrl: '', content: undefined })).toThrow(CurriculumImportError); expect(() => importer.import({ format: 'json', sourceUrl: 'https://example.test/bad.json', content: {} })).toThrow('ungültig') })
})
