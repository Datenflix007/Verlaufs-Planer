import type { CompetencyCatalog } from '../../domain/types'

const competencies = (area: string, values: [string, string][]) => ({
  id: area,
  title: area,
  competencies: values.map(([id, title]) => ({ id: `digcomp-3.0-${id}`, title })),
})

// Der Katalog ist ein lokaler Auswahlrahmen. Vorlagen referenzieren nur seine ID.
export const digComp30Catalog: CompetencyCatalog = {
  id: 'eu-digcomp-3.0', name: 'DigComp 3.0', subject: 'Digitale Kompetenzen', version: '3.0', source: 'EU DigComp – lokale Auswahlstruktur',
  categories: [
    competencies('1 Informations- und Datenkompetenz', [['1.1', 'Informationen durchsuchen, suchen und filtern'], ['1.2', 'Informationen bewerten'], ['1.3', 'Informationen verwalten']]),
    competencies('2 Kommunikation und Zusammenarbeit', [['2.1', 'Über digitale Technologien interagieren'], ['2.2', 'Über digitale Technologien teilen'], ['2.3', 'Zivilgesellschaftliche Teilhabe durch digitale Technologien'], ['2.4', 'Mit digitalen Technologien zusammenarbeiten'], ['2.5', 'Netiquette'], ['2.6', 'Digitale Identität verwalten']]),
    competencies('3 Digitale Inhalte erstellen', [['3.1', 'Digitale Inhalte entwickeln'], ['3.2', 'Digitale Inhalte integrieren und weiterentwickeln'], ['3.3', 'Urheberrecht und Lizenzen'], ['3.4', 'Programmieren']]),
    competencies('4 Sicherheit', [['4.1', 'Geräte schützen'], ['4.2', 'Personenbezogene Daten und Privatsphäre schützen'], ['4.3', 'Gesundheit und Wohlbefinden schützen'], ['4.4', 'Umwelt schützen']]),
    competencies('5 Probleme lösen', [['5.1', 'Technische Probleme lösen'], ['5.2', 'Bedürfnisse und technische Antworten identifizieren'], ['5.3', 'Digitale Technologien kreativ einsetzen'], ['5.4', 'Digitale Kompetenzlücken erkennen']]),
  ],
}
