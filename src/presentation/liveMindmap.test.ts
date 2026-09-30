import { describe, expect, it } from 'vitest'
import { createPlan } from '../domain/factories'
import { createMindmapElement, addMindmapChild } from './mindmap'
import { applyMindmapUpdate, mindmapUpdate } from './liveMindmap'
import { ensurePresentation } from './presentation'

describe('Live-Mindmap im Vortrag', () => {
  it('überträgt einen Snapshot auf dieselbe Folie und dasselbe Widget', () => {
    const presentation = ensurePresentation(createPlan())
    const element = createMindmapElement()
    presentation.slides[0]!.elements.push(element)
    const event = mindmapUpdate(presentation.slides[0]!.id, element.id, element.content.mindmap!)
    addMindmapChild(element.content.mindmap!, element.content.mindmap!.rootNodeId, 'Licht')
    expect(event.mindmap.nodes).toHaveLength(1)
    const audience = structuredClone(presentation)
    audience.slides[0]!.elements[0]!.content.mindmap!.nodes[0]!.text = 'Alt'
    expect(applyMindmapUpdate(audience, mindmapUpdate(presentation.slides[0]!.id, element.id, element.content.mindmap!))).toBe(true)
    expect(audience.slides[0]!.elements[0]!.content.mindmap!.nodes.map(node => node.text)).toEqual(['Thema', 'Licht'])
  })

  it('verwirft Updates für eine fremde Widget-ID oder Folie', () => {
    const presentation = ensurePresentation(createPlan())
    const element = createMindmapElement()
    presentation.slides[0]!.elements.push(element)
    const event = mindmapUpdate(presentation.slides[0]!.id, element.id, element.content.mindmap!)
    expect(applyMindmapUpdate(presentation, { ...event, slideId: crypto.randomUUID() })).toBe(false)
    expect(applyMindmapUpdate(presentation, { ...event, elementId: crypto.randomUUID() })).toBe(false)
    expect(applyMindmapUpdate(presentation, { ...event, mindmap: { ...event.mindmap, id: crypto.randomUUID() } })).toBe(false)
  })
})
