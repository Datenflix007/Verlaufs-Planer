import type { RichTextDocument, RichTextMark, RichTextNode } from '../domain/types'

export const escapeHtml = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
export const escapeLatex = (text: string): string => text.replace(/[&%$#_{}~^\\]/g, (character) => ({
  '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '{': '\\{', '}': '\\}',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}', '\\': '\\textbackslash{}',
})[character] ?? character)
const latexMark = (value: string, mark: RichTextMark): string => ({ bold: `\\textbf{${value}}`, italic: `\\emph{${value}}`, underline: `\\underline{${value}}`, code: `\\texttt{${value}}` }[mark.type] ?? value)
const htmlMark = (value: string, mark: RichTextMark): string => ({ bold: `<strong>${value}</strong>`, italic: `<em>${value}</em>`, underline: `<u>${value}</u>`, code: `<code>${value}</code>`, link: `<a href="${escapeHtml(String(mark.attrs?.href ?? '#'))}">${value}</a>` }[mark.type] ?? value)

function latexTableCell(node: RichTextNode): string {
  const content = (node.content ?? []).map(latexNode).join('').replace(/\n{2,}/g, ' ').trim()
  return node.type === 'tableHeader' ? `\\textbf{${content}}` : content
}
function latexTable(node: RichTextNode): string {
  const rows = (node.content ?? []).filter((child) => child.type === 'tableRow')
  const columnCount = Math.max(1, ...rows.map((row) => (row.content ?? []).length))
  const spec = `|${Array.from({ length: columnCount }, () => 'l').join('|')}|`
  const content = rows.map((row) => `${(row.content ?? []).map(latexTableCell).join(' & ')} \\\\ \\hline`).join('\n')
  return `\\begin{tabular}{${spec}}\n\\hline\n${content}\n\\end{tabular}\n`
}
function latexNode(node: RichTextNode): string {
  if (node.type === 'text') return (node.marks ?? []).reduce((value, mark) => latexMark(value, mark), escapeLatex(node.text ?? ''))
  if (node.type === 'latexInline') return String(node.attrs?.latex ?? '')
  if (node.type === 'latexBlock') return `${String(node.attrs?.latex ?? '')}\n`
  if (node.type === 'table') return latexTable(node)
  const content = (node.content ?? []).map(latexNode).join('')
  if (node.type === 'paragraph') return `${content}\n\n`
  if (node.type === 'heading') return `${['\\section', '\\subsection', '\\subsubsection'][Math.min(2, Math.max(0, Number(node.attrs?.level ?? 1) - 1))]}{${content}}\n`
  if (node.type === 'bulletList') return `\\begin{itemize}\n${content}\\end{itemize}\n`
  if (node.type === 'orderedList') return `\\begin{enumerate}\n${content}\\end{enumerate}\n`
  if (node.type === 'listItem') return `\\item ${content}\n`
  if (node.type === 'blockquote') return `\\begin{quote}${content}\\end{quote}\n`
  return content
}
function htmlNode(node: RichTextNode): string {
  if (node.type === 'text') return (node.marks ?? []).reduce((value, mark) => htmlMark(value, mark), escapeHtml(node.text ?? ''))
  if (node.type === 'latexInline') return `<code class="latex">${escapeHtml(String(node.attrs?.latex ?? ''))}</code>`
  if (node.type === 'latexBlock') return `<pre class="latex-block">${escapeHtml(String(node.attrs?.latex ?? ''))}</pre>`
  const content = (node.content ?? []).map(htmlNode).join('')
  if (node.type === 'paragraph') return `<p>${content}</p>`
  if (node.type === 'heading') return `<h${Math.min(3, Number(node.attrs?.level ?? 1))}>${content}</h${Math.min(3, Number(node.attrs?.level ?? 1))}>`
  if (node.type === 'bulletList') return `<ul>${content}</ul>`
  if (node.type === 'orderedList') return `<ol>${content}</ol>`
  if (node.type === 'listItem') return `<li>${content}</li>`
  if (node.type === 'blockquote') return `<blockquote>${content}</blockquote>`
  if (node.type === 'table') return `<table class="rich-text-table">${content}</table>`
  if (node.type === 'tableRow') return `<tr>${content}</tr>`
  if (node.type === 'tableHeader') return `<th>${content}</th>`
  if (node.type === 'tableCell') return `<td>${content}</td>`
  return content
}
export const renderRichTextLatex = (document?: RichTextDocument): string => (document?.content ?? []).map(latexNode).join('')
export const renderRichTextHtml = (document?: RichTextDocument): string => (document?.content ?? []).map(htmlNode).join('')
export const richTextPlain = (document?: RichTextDocument): string => (document?.content ?? []).map((node) => node.type === 'text' ? node.text ?? '' : richTextPlain({ type: 'doc', content: node.content ?? [] })).join(' ')
