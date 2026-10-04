<script setup lang="ts">
import { computed } from 'vue'
import { getPlanningTemplate, getPlanningTemplates } from '../../data/templates/registry'
import type { Building, PriorityDefinition, Room, WorkshopPlan } from '../../domain/types'

const props = defineProps<{ plan: WorkshopPlan; buildings?: Building[]; rooms?: Room[]; priorities?: PriorityDefinition[] }>()
const emit = defineEmits<{ changed: [] }>()
const templates = computed(() => getPlanningTemplates())
const availableRooms = computed(() => (props.rooms ?? []).filter((room) => !props.plan.metadata.buildingId || room.buildingId === props.plan.metadata.buildingId))

function switchTemplate(plan: WorkshopPlan, event: Event): void {
  const template = getPlanningTemplate((event.target as HTMLSelectElement).value)
  if (!template) { plan.settings.templateId = undefined; emit('changed'); return }
  plan.settings.templateId = template.id
  plan.settings.enabledCompetencyFrameworkIds = [...new Set([...(plan.settings.enabledCompetencyFrameworkIds ?? []), ...template.competencyFrameworkIds])]
  emit('changed')
}
function changeBuilding(event: Event): void { props.plan.metadata.buildingId = (event.target as HTMLSelectElement).value || undefined; props.plan.metadata.roomId = undefined; props.plan.metadata.location = ''; emit('changed') }
function changeRoom(event: Event): void { const room = (props.rooms ?? []).find((item) => item.id === (event.target as HTMLSelectElement).value); props.plan.metadata.roomId = room?.id; props.plan.metadata.location = room ? `${(props.buildings ?? []).find((building) => building.id === room.buildingId)?.name ?? ''} · ${room.name}` : ''; emit('changed') }
</script>

<template>
  <section class="section-card">
    <div class="section-heading"><p class="eyebrow">Dokument</p><h1>Allgemeine Angaben</h1><p>Der Rahmen fuer Ihre Planung und den spaeteren Export.</p></div>
    <div class="form-grid">
      <label class="full">Planungsvorlage<select :value="plan.settings.templateId ?? ''" @change="switchTemplate(plan, $event)"><option value="">Ohne Vorlage</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name.de }}</option></select><small>Vorlagen sind lokale Benutzerinhalte. Der Wechsel ergaenzt Referenzen und Vorschlaege, ohne vorhandene Inhalte zu loeschen.</small></label>
      <label class="full">Titel<input v-model="plan.metadata.title" required @change="emit('changed')"></label><label class="full">Untertitel<input v-model="plan.metadata.subtitle" @change="emit('changed')"></label>
      <label>Fach / Thema<input v-model="plan.metadata.subject" @change="emit('changed')"></label><label>Zielgruppe<input v-model="plan.metadata.targetGroup" @change="emit('changed')"></label><label>Institution<input v-model="plan.metadata.institution" @change="emit('changed')"></label><label>Ort<input v-model="plan.metadata.location" @change="emit('changed')"></label>
      <label v-if="priorities?.length">Priorität<select :value="plan.metadata.priorityId ?? 'medium'" @change="plan.metadata.priorityId = ($event.target as HTMLSelectElement).value || undefined; emit('changed')"><option v-for="priority in priorities" :key="priority.id" :value="priority.id">{{ priority.icon }} {{ priority.label }}</option></select></label>
      <label>Gebäude<select :value="plan.metadata.buildingId ?? ''" @change="changeBuilding"><option value="">Kein Gebäude</option><option v-for="building in buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label>Raum<select :value="plan.metadata.roomId ?? ''" :disabled="!plan.metadata.buildingId" @change="changeRoom"><option value="">Kein Raum</option><option v-for="room in availableRooms" :key="room.id" :value="room.id">{{ room.name }}</option></select><small>Gebäude und Räume verwalten Sie unter Einstellungen → Arbeitsbereich.</small></label>
      <label class="full">Autorinnen und Autoren <input :value="plan.metadata.authors.join(', ')" placeholder="Kommagetrennt" @change="plan.metadata.authors = ($event.target as HTMLInputElement).value.split(',').map((item) => item.trim()).filter(Boolean); emit('changed')"></label><label class="full">Kurzbeschreibung<textarea v-model="plan.metadata.description" rows="4" @change="emit('changed')" /></label>
    </div>
  </section>
</template>
