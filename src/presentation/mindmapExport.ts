import type { MindmapNode, MindmapWidget } from '../domain/types'
import { safeName } from '../export/JsonExporter'
import { colorForNode, layoutMindmap, MINDMAP_HEIGHT, MINDMAP_WIDTH } from './mindmap'
import { widgetColorSet } from './widgetDesign'

const escapeXml = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const backgrounds = { schlicht: '#f7fbfb', organisch: '#f1f7ed', tafel: '#183d37', neon: '#15152d', pastell: '#fbf1f8' }
const nodeSize = (node: MindmapNode, mindmap: MindmapWidget) => node.id === mindmap.rootNodeId ? { width: 180, height: 88 } : { width: 154, height: 72 }

function textLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines = ['', '']
  for (const word of words) {
    const target = lines[0].length + word.length <= 18 ? 0 : 1
    lines[target] = `${lines[target]}${lines[target] ? ' ' : ''}${word}`
  }
  return lines.filter(Boolean).map((line, index, all) => index === all.length - 1 && words.join(' ').length > lines.join(' ').length ? `${line.slice(0, 16)}…` : line)
}

/** Creates an editable standalone SVG from the persisted Mindmap model. */
export function buildMindmapSvg(mindmap: MindmapWidget): string {
  const palette = widgetColorSet(mindmap.settings.colorSet)
  const layout = layoutMindmap(mindmap)
  const edges = layout.edges.map(({ edge, path, color }) => `<path d="${path}" fill="none" stroke="${escapeXml(edge.style.color ?? color)}" stroke-width="${edge.style.width ?? 2}" stroke-linecap="round"/>`).join('')
  const nodes = layout.nodes.map(({ node, x, y, color }) => {
    const { width, height } = nodeSize(node, mindmap)
    const left = x - width / 2; const top = y - height / 2
    const fill = node.style.backgroundColor ?? (mindmap.settings.design === 'schlicht' ? palette.surface : backgrounds[mindmap.settings.design])
    const textColor = node.style.textColor ?? (mindmap.settings.design === 'tafel' ? '#f3f6e9' : mindmap.settings.design === 'neon' ? '#f5f0ff' : palette.text)
    const radius = node.style.borderRadius ?? (mindmap.settings.design === 'organisch' ? 26 : 12)
    const image = node.image ? `<image href="${escapeXml(node.image.source)}" x="${left + 8}" y="${top + 7}" width="${width - 16}" height="28" preserveAspectRatio="xMidYMid ${node.image.fit === 'contain' ? 'meet' : node.image.fit === 'cover' ? 'slice' : 'none'}"/>` : ''
    const lines = textLines(node.text)
    const textY = top + (node.image ? 49 : height / 2 - (lines.length - 1) * 9)
    const labels = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`).join('')
    return `<g><rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${radius}" fill="${escapeXml(fill)}" stroke="${escapeXml(node.style.borderColor ?? colorForNode(mindmap, node.id) ?? color)}" stroke-width="${node.style.borderWidth ?? (node.id === mindmap.rootNodeId ? 3 : 2)}"/>${image}<text x="${x}" y="${textY}" fill="${escapeXml(textColor)}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="${node.style.fontSize ?? 16}" font-weight="${node.style.fontWeight ?? 600}">${labels}</text></g>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${MINDMAP_WIDTH}" height="${MINDMAP_HEIGHT}" viewBox="0 0 ${MINDMAP_WIDTH} ${MINDMAP_HEIGHT}" role="img" aria-label="Mindmap"><rect width="100%" height="100%" fill="${backgrounds[mindmap.settings.design] ?? palette.surface}"/>${edges}${nodes}</svg>`
}

export function mindmapExportFilename(mindmap: MindmapWidget, extension: 'svg' | 'png' | 'pdf'): string {
  const root = mindmap.nodes.find((node) => node.id === mindmap.rootNodeId)?.text || 'Mindmap'
  return `${safeName(root)}_Mindmap.${extension}`
}

export async function svgToPngDataUrl(svg: string): Promise<string> {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.src = source
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Die Mindmap konnte nicht als PNG gerendert werden.')) })
    const canvas = document.createElement('canvas')
    canvas.width = MINDMAP_WIDTH * 2; canvas.height = MINDMAP_HEIGHT * 2
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Der Browser stellt keinen Canvas-Export bereit.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function buildMindmapPdf(title: string, png: string): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  const image = await pdf.embedPng(png)
  const page = pdf.addPage([MINDMAP_WIDTH, MINDMAP_HEIGHT])
  page.drawImage(image, { x: 0, y: 0, width: MINDMAP_WIDTH, height: MINDMAP_HEIGHT })
  return pdf.save()
}
