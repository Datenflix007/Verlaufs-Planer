<script setup lang="ts">
import { ref, watch } from 'vue'
import { createId } from '../../domain/factories'
import type { InventoryMaterial, Material, MaterialResourceType, WorkshopPlan } from '../../domain/types'
import LearningStudioView from '../../views/LearningStudioView.vue'

const props = defineProps<{ plan: WorkshopPlan; inventory?: InventoryMaterial[] }>()
const emit = defineEmits<{ changed: []; digitalView: [active: boolean] }>()
const selectedInventoryId = ref('')
const activeMaterialView = ref<'plan' | 'digital'>('plan')
watch(activeMaterialView, (view) => emit('digitalView', view === 'digital'))
const types: MaterialResourceType[] = ['physical', 'file', 'worksheet', 'link', 'interactive-html']
function add(): void { props.plan.materials.push({ id: createId(), name: '', resourceType: 'physical' }); emit('changed') }
function addFromInventory(): void {
  const source = props.inventory?.find((material) => material.id === selectedInventoryId.value)
  if (!source || props.plan.materials.some((material) => material.inventoryMaterialId === source.id)) return
  props.plan.materials.push({ id: createId(), name: source.name, quantity: source.quantity, description: source.description, category: source.category, resourceType: source.resourceType, inventoryMaterialId: source.id })
  selectedInventoryId.value = ''; emit('changed')
}
function remove(material: Material): void { props.plan.materials = props.plan.materials.filter((item) => item.id !== material.id); props.plan.schedule.forEach((entry) => entry.materialIds = entry.materialIds.filter((id) => id !== material.id)); emit('changed') }
function returnToPlanMaterials(): void { activeMaterialView.value = 'plan' }
</script>

<template>
  <LearningStudioView v-if="activeMaterialView === 'digital'" :plan-id="plan.id" embedded @exit-plan="returnToPlanMaterials" />
  <section v-else class="section-card materials-section-card">
    <div class="section-heading with-action"><div><p class="eyebrow">Ressourcen</p><h1>Materialien</h1><p>Physische Planmaterialien und wiederverwendbare digitale Lernmedien für diese Stunde.</p></div><button type="button" @click="add">+ Material</button></div>
    <div class="material-mode-tabs" role="tablist" aria-label="Materialansicht">
      <button type="button" role="tab" :aria-selected="activeMaterialView === 'plan'" :class="{ active: activeMaterialView === 'plan' }" @click="activeMaterialView = 'plan'">Planmaterialien</button>
      <button type="button" role="tab" :aria-selected="false" @click="activeMaterialView = 'digital'">Digitaler Baukasten</button>
    </div>
    <div>
    <div v-if="inventory?.length" class="inventory-picker"><label>Material aus Bestand<select v-model="selectedInventoryId"><option value="">Auswählen</option><option v-for="material in inventory" :key="material.id" :value="material.id">{{ material.name }} · {{ material.scope === 'personal' ? 'Privatbestand' : material.scope === 'room' ? 'Raum' : 'Gebäude' }}</option></select></label><button type="button" class="secondary" :disabled="!selectedInventoryId" @click="addFromInventory">Zum Plan hinzufügen</button></div>
    <div class="materials-table"><div class="materials-header"><span>Name</span><span>Menge</span><span>Typ</span><span>Beschreibung</span><span /></div><div v-for="material in plan.materials" :key="material.id" class="materials-row"><input v-model="material.name" placeholder="z. B. Moderationskarten" @change="emit('changed')"><input v-model="material.quantity" placeholder="Anzahl" @change="emit('changed')"><select v-model="material.resourceType" @change="emit('changed')"><option v-for="type in types" :key="type" :value="type">{{ type }}</option></select><input v-model="material.description" placeholder="optional" @change="emit('changed')"><button type="button" class="danger" aria-label="Material entfernen" @click="remove(material)">×</button></div></div>
    </div>
  </section>
</template>

<style scoped>
.material-mode-tabs { display: flex; gap: .35rem; margin: -1rem 0 1.2rem; padding-bottom: .65rem; border-bottom: 1px solid #c8d6d8 }
.material-mode-tabs button { padding: .45rem .7rem; border: 1px solid transparent; border-radius: 5px; color: #536870; background: transparent; font-size: .86rem }
.material-mode-tabs button.active { color: #174a50; border-color: #b8d1d3; background: #eaf3f3; font-weight: 700 }
</style>
