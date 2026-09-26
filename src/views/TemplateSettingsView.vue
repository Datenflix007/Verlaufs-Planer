<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { download } from '../export/download'
import type { PlanningTemplate } from '../domain/types'
import { scheduleLayouts } from '../data/layouts'
import { getPlanningTemplates, getTemplateReferenceOptions, registerLocalTemplate, removeLocalTemplate } from '../data/templates/registry'

const templates = ref<PlanningTemplate[]>([])
const message = ref('')
const error = ref('')
const name = ref('')
const selectedReferenceIds = ref<string[]>([])
const layoutId = ref('teaching')
const references = computed(() => getTemplateReferenceOptions())
const refresh = (): void => { templates.value = getPlanningTemplates(); message.value = ''; error.value = '' }
onMounted(refresh)

function create(): void {
  const label = name.value.trim()
  if (!label) { error.value = 'Bitte geben Sie einen Namen fuer die Vorlage an.'; return }
  const template = registerLocalTemplate({ schemaVersion: 1, id: `user-${crypto.randomUUID().slice(0, 8)}`, name: { de: label }, version: '1.0.0', competencyFrameworkIds: selectedReferenceIds.value, scheduleLayoutIds: [layoutId.value], defaultScheduleLayoutId: layoutId.value, source: { type: 'local' } })
  name.value = ''; selectedReferenceIds.value = []; layoutId.value = 'teaching'; refresh(); message.value = `Vorlage „${template.name.de}“ angelegt.`
}
function toggleReference(id: string, checked: boolean): void { selectedReferenceIds.value = checked ? [...new Set([...selectedReferenceIds.value, id])] : selectedReferenceIds.value.filter((item) => item !== id) }
function exportTemplate(template: PlanningTemplate): void { download({ filename: `${template.id}.verlaufsplan-template.json`, mimeType: 'application/json;charset=utf-8', content: JSON.stringify(template, null, 2) }) }
function remove(template: PlanningTemplate): void { removeLocalTemplate(template.id); refresh(); message.value = 'Vorlage gelöscht.' }
async function importTemplate(event: Event): Promise<void> { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; try { const template = registerLocalTemplate(JSON.parse(await file.text())); refresh(); message.value = `Vorlage „${template.name.de}“ importiert.` } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Die Vorlage konnte nicht importiert werden.' } finally { input.value = '' } }
</script>

<template>
  <main class="settings-shell">
    <header class="settings-header"><div><p class="eyebrow">Einstellungen</p><h1>Eigene Vorlagen</h1><p>Vorlagen sind lokale Benutzerinhalte. Das Projekt liefert keine fachgebundenen Vorlagen mit.</p></div><RouterLink class="secondary link-button" :to="{ name: 'home' }">Zurueck</RouterLink></header>
    <section class="settings-card">
      <div class="section-heading"><h2>Neue Vorlage</h2><p>Eine Vorlage kopiert keine Lehrplandaten. Sie speichert nur lokale Einstellungen und stabile Referenz-IDs.</p></div>
      <form class="template-form" @submit.prevent="create">
        <label>Name<input v-model="name" required placeholder="z. B. Geschichte Klasse 8"></label>
        <fieldset><legend>Referenzsysteme</legend><label v-for="reference in references" :key="reference.id" class="reference-option"><input type="checkbox" :checked="selectedReferenceIds.includes(reference.id)" @change="toggleReference(reference.id, ($event.target as HTMLInputElement).checked)"><span><small>{{ reference.kind === 'curriculum' ? 'Curriculum' : 'Kompetenzrahmen' }}</small>{{ reference.name }}</span></label></fieldset>
        <label>Verlaufsplanlayout<select v-model="layoutId"><option v-for="layout in scheduleLayouts" :key="layout.id" :value="layout.id">{{ layout.name }}</option></select></label>
        <div class="template-actions"><button type="submit">Vorlage speichern</button><label class="file-label">Vorlage importieren<input type="file" accept="application/json,.json" @change="importTemplate"></label></div>
      </form>
    </section>
    <section class="settings-card"><div class="section-heading"><h2>Vorlagenbibliothek</h2><p>Exportierte Vorlagen bleiben Benutzerinhalte und werden nicht nach `src/data/` geschrieben.</p></div><p v-if="!templates.length" class="empty-state">Noch keine eigenen Vorlagen.</p><article v-for="template in templates" :key="template.id" class="template-card"><div><h3>{{ template.name.de }}</h3><small>{{ template.id }} · {{ template.competencyFrameworkIds.join(', ') || 'keine Referenzsysteme' }}</small></div><div class="template-actions"><button type="button" class="secondary" @click="exportTemplate(template)">Exportieren</button><button type="button" class="danger" @click="remove(template)">Löschen</button></div></article></section>
    <p v-if="message" class="success-message">{{ message }}</p><p v-if="error" class="error-message">{{ error }}</p>
  </main>
</template>
