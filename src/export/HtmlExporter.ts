import type { DocumentExporter, ExportResult, ScheduleEntry, WorkshopPlan } from '../domain/types'
import { scheduleLayouts } from '../data/layouts'
import { aggregateMaterials } from '../domain/materials'
import { safeName } from './JsonExporter'
import { escapeHtml, renderRichTextHtml } from './render'

const value = (entry: ScheduleEntry, field: string, materialNames: Map<string, string>): string => {
  if (field === 'time') return escapeHtml([entry.startTime, entry.endTime].filter(Boolean).join('–'))
  if (field === 'materials') return escapeHtml(entry.materialIds.map((id) => materialNames.get(id)).filter(Boolean).join(', '))
  const raw = entry[field as keyof ScheduleEntry]
  return typeof raw === 'string' ? escapeHtml(raw) : typeof raw === 'object' && raw ? renderRichTextHtml(raw as never) : ''
}
export class HtmlExporter implements DocumentExporter {
  async export(plan: WorkshopPlan): Promise<ExportResult> {
    const layout = scheduleLayouts.find((item) => item.id === plan.settings.scheduleLayoutId) ?? scheduleLayouts[0]
    const materialNames = new Map(plan.materials.map((material) => [material.id, material.name]))
    const schedule = plan.days.map((day) => `<section><h3>${escapeHtml(day.title || day.date)}</h3><table><thead><tr>${layout.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${plan.schedule.filter((entry) => entry.dayId === day.id).map((entry) => `<tr class="${entry.type === 'break' ? 'break' : ''}">${layout.columns.map((column) => `<td>${value(entry, column.field, materialNames)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`).join('')
    const materials = aggregateMaterials(plan.materials, plan.schedule).map(({ material, entries }) => `<li><strong>${escapeHtml(material.name)}</strong>${material.quantity ? ` (${escapeHtml(material.quantity)})` : ''} – ${entries.length} Verwendung(en)</li>`).join('')
    const content = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(plan.metadata.title)}</title><style>
@page { size: A4; margin: 18mm } body { font: 11pt/1.55 system-ui,sans-serif; color:#17212b; max-width: 900px; margin:auto } h1 { font-size:2em; margin-bottom:0 } h2 { margin-top:2.4em; border-bottom:1px solid #cbd5e1; padding-bottom:.25em } h3 { margin-top:1.5em } table { width:100%; border-collapse:collapse; font-size:9pt; break-inside:auto } th,td { border:1px solid #cbd5e1; vertical-align:top; padding:.45rem; text-align:left } th { background:#eaf0f2 } tr { break-inside:avoid } tr.break td { background:#f8f3e8; font-style:italic } .meta { color:#52616b } .latex { background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:.08em .25em } @media print { body { max-width:none } }
</style></head><body><header><h1>${escapeHtml(plan.metadata.title)}</h1>${plan.metadata.subtitle ? `<p>${escapeHtml(plan.metadata.subtitle)}</p>` : ''}<p class="meta">${escapeHtml([plan.metadata.subject, plan.metadata.targetGroup, plan.metadata.institution, plan.metadata.location].filter(Boolean).join(' · '))}</p></header>
${plan.metadata.description ? `<p>${escapeHtml(plan.metadata.description)}</p>` : ''}<h2>Veranstaltungstage</h2><ul>${plan.days.map((day) => `<li>${escapeHtml([day.date, day.title, day.startTime && day.endTime ? `${day.startTime}–${day.endTime}` : ''].filter(Boolean).join(' · '))}</li>`).join('')}</ul><h2>Lernziele</h2><ul>${plan.learningObjectives.map((objective) => `<li>${escapeHtml(objective.text)}</li>`).join('')}</ul><h2>Inhaltsanalyse</h2>${renderRichTextHtml(plan.contentAnalysis)}<h2>Methodisch-didaktische Analyse</h2>${renderRichTextHtml(plan.didacticAnalysis)}<h2>Verlaufsplan</h2>${schedule}<h2>Materialien</h2><ul>${materials}</ul></body></html>`
    return { filename: `${safeName(plan.metadata.title)}.html`, mimeType: 'text/html;charset=utf-8', content }
  }
}
