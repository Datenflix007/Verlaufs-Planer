import type { DocumentExporter, ExportResult, ScheduleEntry, WorkshopPlan } from '../domain/types'
import { scheduleLayouts } from '../data/layouts'
import { aggregateMaterials } from '../domain/materials'
import { safeName } from './JsonExporter'
import { escapeLatex, renderRichTextLatex } from './render'

const field = (entry: ScheduleEntry, fieldName: string, materialNames: Map<string, string>): string => {
  if (fieldName === 'time') return [entry.startTime, entry.endTime].filter(Boolean).join('--')
  if (fieldName === 'materials') return entry.materialIds.map((id) => materialNames.get(id)).filter(Boolean).join(', ')
  const value = entry[fieldName as keyof ScheduleEntry]
  return typeof value === 'string' ? escapeLatex(value) : typeof value === 'object' && value ? renderRichTextLatex(value as never) : ''
}
export class LatexExporter implements DocumentExporter {
  async export(plan: WorkshopPlan): Promise<ExportResult> {
    const layout = scheduleLayouts.find((item) => item.id === plan.settings.scheduleLayoutId) ?? scheduleLayouts[0]
    const materialNames = new Map(plan.materials.map((material) => [material.id, material.name]))
    const table = plan.days.map((day) => {
      const rows = plan.schedule.filter((entry) => entry.dayId === day.id).map((entry) => layout.columns.map((column) => field(entry, column.field, materialNames)).join(' & ') + ' \\\\ \\midrule').join('\n')
      const width = (0.96 / layout.columns.length).toFixed(3)
      return `\\subsection*{${escapeLatex(day.title || day.date)}}\n\\begin{longtable}{${layout.columns.map(() => `p{${width}\\textwidth}`).join('')}}\n\\toprule\n${layout.columns.map((column) => `\\textbf{${escapeLatex(column.label)}}`).join(' & ')} \\\\ \\midrule\n${rows}\n\\end{longtable}`
    }).join('\n')
    const materials = aggregateMaterials(plan.materials, plan.schedule).map(({ material, entries }) => `\\item \\textbf{${escapeLatex(material.name)}}${material.quantity ? ` (${escapeLatex(material.quantity)})` : ''}: ${entries.length} Verwendung(en)`).join('\n')
    const content = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[ngerman]{babel}
\\usepackage[a4paper,margin=2cm]{geometry}
\\usepackage{longtable,booktabs,array,tabularx,enumitem,hyperref}
\\begin{document}
\\title{${escapeLatex(plan.metadata.title)}}
\\author{${plan.metadata.authors.map(escapeLatex).join(', ')}}
\\date{}
\\maketitle
${plan.metadata.description ? `${escapeLatex(plan.metadata.description)}\n` : ''}
\\section{Veranstaltungstage}
\\begin{itemize}${plan.days.map((day) => `\\item ${escapeLatex([day.date, day.title, day.startTime && day.endTime ? `${day.startTime}--${day.endTime}` : ''].filter(Boolean).join(' · '))}`).join('\n')}\\end{itemize}
\\section{Lernziele}\\begin{itemize}${plan.learningObjectives.map((objective) => `\\item ${escapeLatex(objective.text)}`).join('\n')}\\end{itemize}
\\section{Inhaltsanalyse}${renderRichTextLatex(plan.contentAnalysis)}
\\section{Methodisch-didaktische Analyse}${renderRichTextLatex(plan.didacticAnalysis)}
\\section{Verlaufsplan}${table}
\\section{Materialien}\\begin{itemize}${materials}\\end{itemize}
\\end{document}`
    return { filename: `${safeName(plan.metadata.title)}_${plan.days[0]?.date ?? 'planung'}.tex`, mimeType: 'application/x-tex', content }
  }
}
