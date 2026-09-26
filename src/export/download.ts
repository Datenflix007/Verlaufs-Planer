import type { ExportResult } from '../domain/types'
export function download(result: ExportResult): void { const url = URL.createObjectURL(new Blob([result.content], { type: result.mimeType })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.filename; anchor.click(); URL.revokeObjectURL(url) }
