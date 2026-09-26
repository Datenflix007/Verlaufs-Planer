<script setup lang="ts">
import type { WorkshopPlan } from '../../domain/types'
import { HtmlExporter } from '../../export/HtmlExporter'
import { JsonExporter } from '../../export/JsonExporter'
import { LatexExporter } from '../../export/LatexExporter'
import { download } from '../../export/download'
const props = defineProps<{ plan: WorkshopPlan }>()
const emit = defineEmits<{ close: [] }>()
async function exportFile(kind: 'json' | 'html' | 'latex'): Promise<void> { const exporter = kind === 'json' ? new JsonExporter() : kind === 'html' ? new HtmlExporter() : new LatexExporter(); download(await exporter.export(props.plan)) }
async function printPdf(): Promise<void> { const result = await new HtmlExporter().export(props.plan); const tab = window.open('', '_blank'); if (!tab) return; tab.document.write(result.content); tab.document.close(); tab.addEventListener('load', () => tab.print(), { once: true }) }
</script>
<template><div class="modal-backdrop" @click.self="emit('close')"><section class="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title"><div class="dialog-title"><h2 id="export-title">Exportieren</h2><button type="button" aria-label="Dialog schliessen" @click="emit('close')">×</button></div><p>Alle Formate werden aus dem strukturierten Projekt erzeugt.</p><div class="export-actions"><button type="button" @click="exportFile('json')">JSON-Backup</button><button type="button" @click="exportFile('html')">HTML-Datei</button><button type="button" @click="exportFile('latex')">LaTeX (.tex)</button><button type="button" @click="printPdf">Drucken / PDF speichern</button></div></section></div></template>
