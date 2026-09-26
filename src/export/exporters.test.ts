import { describe, expect, it } from 'vitest'
import { demoPlan } from '../fixtures/demoPlan'
import { HtmlExporter } from './HtmlExporter'
import { JsonExporter } from './JsonExporter'
import { LatexExporter } from './LatexExporter'
import { escapeLatex } from './render'

describe('Exporte', () => {
  it('escaped normalen LaTeX-Text und erhaelt Raw-LaTeX', async () => { expect(escapeLatex('50 % der Schueler & Schuelerinnen')).toBe('50 \\% der Schueler \\& Schuelerinnen'); const result = await new LatexExporter().export(demoPlan); expect(result.content).toContain('\\frac{a}{b}'); expect(result.content).toContain('Workshop: Der Wald und wir') })
  it('erzeugt vollstaendiges, eigenstaendiges HTML', async () => { const result = await new HtmlExporter().export(demoPlan); expect(result.content).toContain('<!doctype html>'); expect(result.content).toContain('Einfuehrung und Erkundung'); expect(result.content).toContain('class="break"') })
  it('exportiert Block-LaTeX und einfache Rich-Text-Tabellen strukturiert', async () => {
    const plan = structuredClone(demoPlan)
    plan.contentAnalysis = { type: 'doc', content: [
      { type: 'latexBlock', attrs: { latex: '\\begin{equation}\\nE = mc^2\\n\\end{equation}' } },
      { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Begriff' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Wert' }] }] }] }, { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Masse' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1 kg' }] }] }] }] },
    ] }
    const latex = await new LatexExporter().export(plan)
    const html = await new HtmlExporter().export(plan)
    expect(latex.content).toContain('\\begin{equation}')
    expect(latex.content).toContain('\\begin{tabular}{|l|l|}')
    expect(latex.content).toContain('\\textbf{Begriff}')
    expect(html.content).toContain('<pre class="latex-block">')
    expect(html.content).toContain('<table class="rich-text-table">')
    expect(html.content).toContain('<th><p>Begriff</p></th>')
  })
  it('erhält Umlaute in JSON- und HTML-Exporten', async () => {
    const plan = structuredClone(demoPlan)
    plan.metadata.title = 'Köhler & Förster: Übersicht'
    const json = await new JsonExporter().export(plan)
    const html = await new HtmlExporter().export(plan)
    expect(json.content).toContain('Köhler & Förster: Übersicht')
    expect(json.filename).toBe('Köhler_Förster_Übersicht.json')
    expect(html.content).toContain('Köhler &amp; Förster: Übersicht')
    expect(html.mimeType).toContain('charset=utf-8')
  })
})
