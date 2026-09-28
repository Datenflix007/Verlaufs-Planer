<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { columnsFromMarkdownHeader } from '../domain/schedulePatterns'
import type { SchedulePattern } from '../domain/types'
import { SchedulePatternRepository } from '../repositories/SchedulePatternRepository'

const repository = new SchedulePatternRepository()
const patterns = ref<SchedulePattern[]>([])
const name = ref('')
const markdown = ref('|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|')
const message = ref('')
const error = ref('')
const loading = ref(true)

async function refresh(): Promise<void> {
  loading.value = true
  try { patterns.value = await repository.list() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Die Verlaufsplan-Muster konnten nicht geladen werden.' }
  finally { loading.value = false }
}
onMounted(() => void refresh())

async function create(): Promise<void> {
  const label = name.value.trim()
  if (!label) { error.value = 'Bitte geben Sie einen Namen für das Muster an.'; return }
  try {
    const now = new Date().toISOString()
    await repository.save({ id: `pattern-${crypto.randomUUID().slice(0, 8)}`, name: label, markdown: markdown.value.trim(), columns: columnsFromMarkdownHeader(markdown.value), createdAt: now, updatedAt: now, isBuiltIn: false })
    name.value = ''; message.value = `Muster „${label}“ gespeichert.`; error.value = ''; await refresh()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Das Muster konnte nicht gespeichert werden.' }
}

async function remove(pattern: SchedulePattern): Promise<void> {
  if (!window.confirm(`Muster „${pattern.name}“ löschen?`)) return
  try { await repository.remove(pattern.id); message.value = `Muster „${pattern.name}“ gelöscht.`; error.value = ''; await refresh() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Das Muster konnte nicht gelöscht werden.' }
}
</script>

<template>
  <main class="settings-shell">
    <header class="settings-header"><div><p class="eyebrow">Einstellungen</p><h1>Verlaufsplan-Muster</h1><p>Muster liegen lokal in SQLite. Der Markdown-Tabellenkopf ist die gespeicherte, nachvollziehbare Definition der Spalten.</p></div><RouterLink class="secondary link-button" :to="{ name: 'home' }">Zurück</RouterLink></header>
    <section class="settings-card">
      <div class="section-heading"><h2>Neues Muster</h2><p>Eine Kopfzeile wie <code>|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|</code> erzeugt die passenden Eingabespalten.</p></div>
      <form class="template-form" @submit.prevent="create">
        <label>Name<input v-model="name" required placeholder="z. B. Lernaufgaben-orientierter Verlaufsplan"></label>
        <label>Markdown-Tabellenkopf<textarea v-model="markdown" rows="3" required spellcheck="false" /></label>
        <p class="form-hint">Unterstützt werden Zeit, Abschnitt, Lerngegenstand oder Gegenstand, Lehrerhandeln, Schülerhandeln, Materialien und Anmerkung. Die Schreibweise „Abschitt“ wird ebenfalls erkannt.</p>
        <div class="template-actions"><button type="submit">Muster in SQLite speichern</button></div>
      </form>
    </section>
    <section class="settings-card"><div class="section-heading"><h2>Gespeicherte Muster</h2><p>Die beiden Standardmuster werden beim ersten Start der Datenbank angelegt. Eigene Muster können Sie hier wieder entfernen.</p></div><p v-if="loading" class="empty-state">Muster werden geladen ...</p><p v-else-if="!patterns.length" class="empty-state">Noch keine Verlaufsplan-Muster vorhanden.</p><article v-for="pattern in patterns" :key="pattern.id" class="template-card"><div><h3>{{ pattern.name }} <small v-if="pattern.isBuiltIn">Standard</small></h3><code class="markdown-pattern">{{ pattern.markdown }}</code></div><div class="template-actions"><button v-if="!pattern.isBuiltIn" type="button" class="danger" @click="remove(pattern)">Löschen</button></div></article></section>
    <p v-if="message" class="success-message">{{ message }}</p><p v-if="error" class="error-message">{{ error }}</p>
  </main>
</template>
