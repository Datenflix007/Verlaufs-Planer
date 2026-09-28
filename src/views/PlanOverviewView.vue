<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'

const store = useProjectStore()
const router = useRouter()
const error = ref('')
const viewMode = ref<'tiles' | 'list'>('tiles')

onMounted(async () => {
  try {
    await store.refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Planungen konnten nicht geladen werden.'
  }
})

async function open(id: string): Promise<void> {
  await router.push({ name: 'editor', params: { id } })
}

async function duplicate(id: string): Promise<void> {
  try {
    const copy = await store.duplicate(id)
    await open(copy.id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Planung konnte nicht dupliziert werden.'
  }
}

async function remove(id: string): Promise<void> {
  try {
    await store.remove(id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Planung konnte nicht gelöscht werden.'
  }
}
</script>

<template>
  <main class="home-shell">
    <header class="home-header">
      <div>
        <p class="eyebrow">Verlaufsplaner</p>
        <h1>Planungsübersicht</h1>
        <p>Alle gespeicherten Verlaufspläne an einem Ort.</p>
      </div>
      <div class="home-actions">
        <RouterLink class="secondary link-button" :to="{ name: 'home' }">Zum Dashboard</RouterLink>
        <button type="button" @click="router.push({ name: 'home', query: { action: 'new-plan' } })">Neue Planung</button>
      </div>
    </header>

    <p v-if="error" class="error-message home-feedback">{{ error }}</p>

    <div v-if="store.plans.length" class="overview-toolbar">
      <span class="overview-count">{{ store.plans.length }} {{ store.plans.length === 1 ? 'Planung' : 'Planungen' }}</span>
      <div class="view-toggle" role="group" aria-label="Darstellung">
        <button type="button" :class="{ active: viewMode === 'tiles' }" :aria-pressed="viewMode === 'tiles'" @click="viewMode = 'tiles'">
          <span aria-hidden="true">▦</span> Kacheln
        </button>
        <button type="button" :class="{ active: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'">
          <span aria-hidden="true">☷</span> Liste
        </button>
      </div>
    </div>

    <section v-if="store.plans.length && viewMode === 'tiles'" class="project-grid plan-overview-grid">
      <article v-for="plan in store.plans" :key="plan.id" class="project-card">
        <p class="eyebrow">{{ plan.dateRange || 'Ohne Termin' }}</p>
        <h2>{{ plan.title }}</h2>
        <p>Zuletzt bearbeitet: {{ new Date(plan.updatedAt).toLocaleString('de-DE') }}</p>
        <div>
          <button type="button" @click="open(plan.id)">Öffnen</button>
          <button type="button" class="secondary" @click="duplicate(plan.id)">Duplizieren</button>
          <button type="button" class="danger" @click="remove(plan.id)">Löschen</button>
        </div>
      </article>
    </section>
    <div v-else-if="store.plans.length" class="plan-list-wrapper">
      <table class="plan-list">
        <thead>
          <tr>
            <th scope="col">Planung</th>
            <th scope="col">Zeitraum</th>
            <th scope="col">Zuletzt bearbeitet</th>
            <th scope="col" class="actions-heading"><span class="visually-hidden">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in store.plans" :key="plan.id">
            <td class="plan-name-cell">
              <span class="plan-file-icon" aria-hidden="true">▤</span>
              <button type="button" class="plan-name" @click="open(plan.id)">{{ plan.title }}</button>
            </td>
            <td>{{ plan.dateRange || 'Ohne Termin' }}</td>
            <td>{{ new Date(plan.updatedAt).toLocaleString('de-DE') }}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="secondary" @click="open(plan.id)">Öffnen</button>
                <button type="button" class="secondary" @click="duplicate(plan.id)">Duplizieren</button>
                <button type="button" class="danger" @click="remove(plan.id)">Löschen</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <section v-else class="home-empty plan-overview-empty">
      <h2>Noch keine Planungen vorhanden.</h2>
      <p>Erstellen Sie Ihre erste Planung über das Dashboard.</p>
      <RouterLink class="secondary link-button" :to="{ name: 'home' }">Zum Dashboard</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.plan-overview-grid { margin-top: 1.5rem }
.plan-overview-empty { margin-top: 1.5rem }
.plan-overview-empty .link-button { margin-top: .5rem }
.overview-toolbar { display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem }
.overview-count { margin-right: auto; color: #5f7076; font-size: .9rem }
.view-toggle { display: inline-flex; padding: 3px; border: 1px solid #b9c8cc; border-radius: 7px; background: #fff }
.view-toggle button { display: inline-flex; align-items: center; gap: .4rem; border: 0; border-radius: 4px; padding: .4rem .65rem; color: #38545a; background: transparent }
.view-toggle button:hover { background: #eef5f5 }
.view-toggle button.active { color: #fff; background: #1d5960 }
.plan-list-wrapper { margin-top: .75rem; overflow-x: auto; border: 1px solid #c8d6d8; border-radius: 8px; background: #fbfcfc }
.plan-list { width: 100%; min-width: 760px; border-collapse: collapse; text-align: left }
.plan-list th, .plan-list td { padding: .8rem 1rem; border-bottom: 1px solid #dbe4e5 }
.plan-list th { color: #52636b; background: #f0f4f4; font-size: .8rem; font-weight: 700 }
.plan-list tbody tr:last-child td { border-bottom: 0 }
.plan-list tbody tr:hover { background: #f3f8f8 }
.plan-list td:nth-child(2), .plan-list td:nth-child(3) { color: #52636b; white-space: nowrap }
.plan-list .actions-heading { width: 1%; white-space: nowrap }
.plan-name-cell { display: flex; align-items: center; gap: .65rem; min-width: 220px }
.plan-file-icon { color: #397078; font-size: 1.15rem }
.plan-name { max-width: 100%; overflow: hidden; padding: .2rem; border-color: transparent; color: #1d2935; background: transparent; font-weight: 700; text-align: left; text-overflow: ellipsis; white-space: nowrap }
.plan-name:hover { color: #1d5960; background: transparent; text-decoration: underline }
.row-actions { display: flex; justify-content: flex-end; gap: .35rem; white-space: nowrap }
.row-actions button { padding: .4rem .55rem; font-size: .82rem }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0 }
@media (max-width: 760px) {
  .home-actions { flex-wrap: wrap }
  .home-actions > * { flex: 1 1 auto; text-align: center }
  .plan-overview-grid { margin-top: .75rem }
  .plan-list th, .plan-list td { padding: .65rem .75rem }
  .row-actions button { padding: .35rem .45rem }
}
</style>