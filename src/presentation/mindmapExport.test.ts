import { describe, expect, it } from 'vitest'
import { addMindmapChild, createMindmap } from './mindmap'
import { buildMindmapPdf, buildMindmapSvg, mindmapExportFilename } from './mindmapExport'

describe('Mindmap-Export', () => {
  it('erstellt ein eigenständiges SVG mit Kanten, Stilen und escaptem Text', () => {
    const mindmap = createMindmap()
    const branch = addMindmapChild(mindmap, mindmap.rootNodeId, 'Quelle < & "Autor"')!
    branch.style = { backgroundColor: '#123456', textColor: '#ffffff', borderRadius: 20 }
    const svg = buildMindmapSvg(mindmap)

    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
    expect(svg).toContain('Quelle &lt; &amp; &quot;Autor&quot;')
    expect(svg).toContain('fill="#123456"')
    expect(svg).not.toContain(branch.id)
    expect(mindmapExportFilename(mindmap, 'svg')).toBe('Thema_Mindmap.svg')
  })

  it('erstellt ein valides PDF aus einer PNG-Ausgabe', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL4zQAAAABJRU5ErkJggg=='
    const pdf = await buildMindmapPdf('Thema', png)
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-')
  })
})
