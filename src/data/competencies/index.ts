import type { CompetencyCatalog } from '../../domain/types'
import { digComp30Catalog } from './digcomp30'

// Referenzrahmen sind versionierte Projektdaten. Fachliche Lehrplaene werden
// separat ueber die Curriculum-Registry bereitgestellt.
export const bundledCompetencyCatalogs: CompetencyCatalog[] = [digComp30Catalog]
