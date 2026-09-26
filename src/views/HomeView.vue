<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPlanningTemplate, getPlanningTemplates } from '../data/templates/registry'
import { useProjectStore } from '../stores/projectStore'

const store = useProjectStore()
const router = useRouter()
const newTitle = ref('')
const templateId = ref('')
const importError = ref('')
const templates = computed(() => getPlanningTemplates())

onMounted(() => store.refresh())

async function create(): Promise<void> { const plan = await store.create(newTitle.value || 'Neue Planung', getPlanningTemplate(templateId.value)); await router.push({ name: 'editor', params: { id: plan.id } }) }
async function loadJenaChatSample(): Promise<void> {
  try { const plan = await store.loadJenaChatSample(); await router.push({ name: 'editor', params: { id: plan.id } }) }
  catch (error) { importError.value = error instanceof Error ? error.message : 'JenaChat-Sample konnte nicht geladen werden.' }
}
async function open(id: string): Promise<void> { await router.push({ name: 'editor', params: { id } }) }
async function importProject(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try { const plan = await store.importProject(JSON.parse(await file.text())); await router.push({ name: 'editor', params: { id: plan.id } }) }
  catch (error) { importError.value = error instanceof Error ? error.message : 'Import fehlgeschlagen.' }
}
</script>

<template>
  <main class="home-shell">
    <header class="home-header">
      <div><p class="eyebrow">Verlaufsplaner - lokale SQLite-Datenbank</p><h1>Meine Planungen</h1><p>Strukturierte Unterrichts- und Workshop-Pläne, lokal auf diesem Rechner gespeichert.</p></div>
      <form class="new-plan" @submit.prevent="create"><input v-model="newTitle" placeholder="Titel der neuen Planung" aria-label="Titel der neuen Planung"><label>Vorlage<select v-model="templateId"><option value="">Ohne Vorlage</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name.de }}</option></select></label><button type="submit">Neue Planung</button></form>
    </header>
    <section class="home-tools">
      <label class="file-label">JSON importieren<input type="file" accept="application/json,.json" @change="importProject"></label>
      <button type="button" class="secondary" @click="loadJenaChatSample">JenaChat-Sample laden</button>
      <button type="button" class="secondary" @click="router.push({ name: 'template-settings' })">Vorlagen verwalten</button>
      <p v-if="store.migrationNotice" class="success-message">{{ store.migrationNotice }}</p>
      <p v-if="importError" class="error-message">{{ importError }}</p>
    </section>
    <section v-if="store.plans.length" class="project-grid">
      <article v-for="plan in store.plans" :key="plan.id" class="project-card">
        <p class="eyebrow">{{ plan.dateRange || 'Ohne Termin' }}</p><h2>{{ plan.title }}</h2><p>Zuletzt bearbeitet: {{ new Date(plan.updatedAt).toLocaleString('de-DE') }}</p>
        <div><button type="button" @click="open(plan.id)">Öffnen</button><button type="button" class="secondary" @click="store.duplicate(plan.id).then((copy) => open(copy.id))">Duplizieren</button><button type="button" class="danger" @click="store.remove(plan.id)">Löschen</button></div>
      </article>
    </section>
    <section v-else class="home-empty"><h2>Die erste Planung beginnt hier.</h2><p>Erstellen Sie eine Planung, laden Sie das JenaChat-Sample oder importieren Sie ein JSON-Backup.</p></section>
  </main>
</template>
