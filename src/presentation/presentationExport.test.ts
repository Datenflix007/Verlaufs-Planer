import { describe, expect, it } from 'vitest'
import { createPlan } from '../domain/factories'
import { ensurePresentation } from './presentation'
import { buildPresentationHtml, presentationFilename } from './presentationExport'

describe('Präsentationsexport', () => {
  it('erstellt ein selbstständiges HTML mit allen Folien und Navigation', () => {
    const presentation = ensurePresentation(createPlan())
    presentation.title = 'Bio < & "Licht"'
    const slides = [
      { id: presentation.slides[0]!.id, title: 'Start < Licht', image: 'data:image/png;base64,AAAA' },
      { id: crypto.randomUUID(), title: 'Folge', image: 'data:image/png;base64,BBBB' },
    ]
    const html = buildPresentationHtml(presentation, slides)
    expect(html).toContain('<title>Bio &lt; &amp; &quot;Licht&quot;</title>')
    expect(html).toContain('alt="Start &lt; Licht"')
    expect(html).toContain('data:image/png;base64,AAAA')
    expect(html).toContain('data:image/png;base64,BBBB')
    expect(html).toContain("document.addEventListener('keydown'")
    expect((html.match(/<section class="slide/g) ?? [])).toHaveLength(2)
    expect(presentationFilename(presentation, 'pdf')).toBe('Bio_Licht.pdf')
  })
})
