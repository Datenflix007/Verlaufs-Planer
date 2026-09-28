import { toPng } from 'html-to-image'
import type { Presentation } from '../domain/types'
import { safeName } from '../export/JsonExporter'
import { escapeHtml } from '../export/render'
import { orderedSlides } from './presentation'

export interface RenderedSlide { id: string; title: string; image: string }

export async function capturePresentation(stage: HTMLElement, presentation: Presentation): Promise<RenderedSlide[]> {
  await document.fonts.ready
  const slides = orderedSlides(presentation)
  const result: RenderedSlide[] = []
  for (const slide of slides) {
    const node = [...stage.querySelectorAll<HTMLElement>('.export-slide')].find(item => item.dataset.slideId === slide.id)
    if (!node) throw new Error(`Folie ${slide.title || slide.id} konnte nicht für den Export gerendert werden.`)
    await Promise.all([...node.querySelectorAll('img')].map(image => image.decode().catch(() => undefined)))
    result.push({ id: slide.id, title: slide.title || `Folie ${slide.position + 1}`, image: await toPng(node, { pixelRatio: 1, width: 1280, height: 720 }) })
  }
  return result
}

export function buildPresentationHtml(presentation: Presentation, slides: RenderedSlide[]): string {
  const title = escapeHtml(presentation.title)
  const pages = slides.map((slide, index) => `<section class="slide${index === 0 ? ' active' : ''}" aria-label="${escapeHtml(slide.title)}"><img src="${slide.image}" alt="${escapeHtml(slide.title)}"></section>`).join('')
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#10191b;color:#e9f7f5;font-family:system-ui,sans-serif}main{min-height:100vh;display:grid;grid-template-rows:minmax(0,1fr)auto}.viewport{display:grid;place-items:center;min-height:0;padding:1rem}.slide{display:none;width:min(100%,calc((100vh - 78px)*16/9));aspect-ratio:16/9}.slide.active{display:block}.slide img{display:block;width:100%;height:100%;object-fit:contain}footer{display:flex;align-items:center;justify-content:center;gap:1rem;min-height:48px;background:#173137}button{color:#ebfaf8;background:#17656b;border:1px solid #4c9b9c;border-radius:5px;padding:.35rem .7rem;cursor:pointer}button:disabled{opacity:.4;cursor:default}@media print{main{display:block}.viewport{display:block;padding:0}.slide,.slide.active{display:block;break-after:page;width:100vw;height:100vh}.slide img{object-fit:contain}footer{display:none}@page{size:landscape;margin:0}}
  </style></head><body><main><div class="viewport">${pages}</div><footer><button id="previous" type="button" aria-label="Vorherige Folie">←</button><span id="counter"></span><button id="next" type="button" aria-label="Nächste Folie">→</button></footer></main><script>
const slides=[...document.querySelectorAll('.slide')];let index=0;const counter=document.getElementById('counter');const previous=document.getElementById('previous');const next=document.getElementById('next');function show(number){if(!slides.length)return;slides[index].classList.remove('active');index=Math.max(0,Math.min(slides.length-1,number));slides[index].classList.add('active');counter.textContent='Folie '+(index+1)+' / '+slides.length;previous.disabled=index===0;next.disabled=index===slides.length-1}previous.addEventListener('click',()=>show(index-1));next.addEventListener('click',()=>show(index+1));document.addEventListener('keydown',event=>{if(['ArrowRight','PageDown',' '].includes(event.key))show(index+1);if(['ArrowLeft','PageUp'].includes(event.key))show(index-1)});show(0);
  </script></body></html>`
}

export async function buildPresentationPdf(presentation: Presentation, slides: RenderedSlide[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(presentation.title)
  for (const slide of slides) {
    const image = await pdf.embedPng(slide.image)
    const page = pdf.addPage([960, 540])
    page.drawImage(image, { x: 0, y: 0, width: 960, height: 540 })
  }
  return pdf.save()
}

export function presentationFilename(presentation: Presentation, extension: 'pdf' | 'html'): string {
  return `${safeName(presentation.title || 'Praesentation')}.${extension}`
}
