<script setup lang="ts">
import type { TimelineEntry, TimelineWidget } from '../../domain/types'

const props = withDefaults(defineProps<{ timeline: TimelineWidget; editing?: boolean }>(), { editing: false })
const emit = defineEmits<{ beginChange: []; changed: []; finish: [] }>()

function changeEntry(entry: TimelineEntry, key: 'date' | 'title' | 'description', event: Event): void {
  emit('beginChange')
  entry[key] = (event.target as HTMLInputElement).value
  emit('changed')
}
function addEntry(): void {
  emit('beginChange')
  props.timeline.entries.push({ id: crypto.randomUUID(), date: 'Neu', title: 'Neues Ereignis', description: 'Beschreibung' })
  emit('changed')
}
function removeEntry(id: string): void {
  if (props.timeline.entries.length <= 1) return
  emit('beginChange')
  props.timeline.entries = props.timeline.entries.filter((entry) => entry.id !== id)
  emit('changed')
}
function setOrientation(event: Event): void {
  emit('beginChange')
  props.timeline.orientation = (event.target as HTMLSelectElement).value as TimelineWidget['orientation']
  emit('changed')
}
</script>

<template>
  <section
    class="timeline-widget"
    :class="[timeline.orientation, { editing }]"
    :style="{ '--timeline-count': timeline.entries.length }"
    @pointerdown.stop
  >
    <div class="timeline-track" aria-hidden="true" />
    <article v-for="entry in timeline.entries" :key="entry.id" class="timeline-entry">
      <span class="timeline-marker" :style="{ background: entry.color }" aria-hidden="true" />
      <template v-if="editing">
        <input class="timeline-date" :value="entry.date" :aria-label="`Zeitpunkt für ${entry.title}`" @input="changeEntry(entry, 'date', $event)" />
        <input class="timeline-title" :value="entry.title" :aria-label="`Titel für ${entry.date}`" @input="changeEntry(entry, 'title', $event)" />
        <input class="timeline-description" :value="entry.description" :aria-label="`Beschreibung für ${entry.title}`" @input="changeEntry(entry, 'description', $event)" />
        <button type="button" :disabled="timeline.entries.length <= 1" :aria-label="`Ereignis ${entry.title} entfernen`" @click.stop="removeEntry(entry.id)">×</button>
      </template>
      <template v-else>
        <small>{{ entry.date }}</small>
        <strong>{{ entry.title }}</strong>
        <p v-if="entry.description">{{ entry.description }}</p>
      </template>
    </article>
    <div v-if="editing" class="timeline-tools" role="toolbar" aria-label="Zeitstrahl bearbeiten">
      <button type="button" @click.stop="addEntry">+ Ereignis</button>
      <label>Ausrichtung
        <select :value="timeline.orientation" @change="setOrientation">
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertikal</option>
        </select>
      </label>
      <button type="button" @click.stop="emit('finish')">Bearbeitung beenden</button>
    </div>
  </section>
</template>

<style scoped>
.timeline-widget { position: relative; display: grid; min-width: 0; min-height: 0; width: 100%; height: 100%; padding: 13% 4% 7%; color: #17363a; background: linear-gradient(145deg, #f8fcfc, #e4f1f0); container-type: inline-size; }
.timeline-widget.horizontal { grid-template-columns: repeat(var(--timeline-count, 3), minmax(0, 1fr)); }
.timeline-track { position: absolute; z-index: 0; top: 51%; right: 8%; left: 8%; height: max(3px, .45cqw); border-radius: 999px; background: linear-gradient(90deg, #21b8b0, #5d9de0, #a98ae9); }
.timeline-entry { position: relative; z-index: 1; display: grid; align-content: start; gap: .35em; min-width: 0; padding: 0 .8em; text-align: center; }
.timeline-marker { justify-self: center; width: 1.15em; height: 1.15em; margin-top: calc(50% - .58em); border: .22em solid #fff; border-radius: 50%; background: #21b8b0; box-shadow: 0 0 0 .16em #21b8b044; }
.timeline-entry small { color: #397078; font-size: clamp(9px, 1.7cqw, 15px); font-weight: 800; }
.timeline-entry strong { font-size: clamp(10px, 2.1cqw, 19px); }
.timeline-entry p { margin: 0; color: #45666b; font-size: clamp(8px, 1.55cqw, 14px); line-height: 1.25; }
.timeline-widget.editing { padding-top: 18%; }
.timeline-widget.editing .timeline-entry { align-content: center; }
.timeline-widget input { min-width: 0; width: 100%; padding: .35em; color: inherit; background: #fff; border: 1px solid #76a8a8; border-radius: .35em; font: inherit; }
.timeline-widget .timeline-date { color: #397078; font-size: clamp(9px, 1.5cqw, 13px); font-weight: 700; }
.timeline-widget .timeline-title { font-weight: 800; font-size: clamp(10px, 1.9cqw, 17px); }
.timeline-widget .timeline-description { font-size: clamp(8px, 1.45cqw, 13px); }
.timeline-entry button { justify-self: center; padding: .05em .38em; color: #fff; background: #a54753; border-color: #fff; border-radius: .3em; }
.timeline-tools { position: absolute; z-index: 3; top: .5em; left: .5em; display: flex; align-items: center; flex-wrap: wrap; gap: .35em; padding: .35em; color: #eaffff; background: #173b40e8; border: 1px solid #66aaa7; border-radius: .4em; font-size: clamp(8px, 1.5cqw, 13px); }
.timeline-tools button, .timeline-tools select { padding: .25em .45em; color: inherit; background: #17646a; border: 1px solid #6ed5d0; border-radius: .25em; font: inherit; }
.timeline-tools label { display: flex; align-items: center; gap: .25em; }
.timeline-widget.vertical { grid-template-columns: 1fr; grid-template-rows: repeat(var(--timeline-count, 3), minmax(0, 1fr)); padding: 6% 7% 6% 18%; }
.timeline-widget.vertical .timeline-track { top: 8%; bottom: 8%; left: 14%; width: max(3px, .45cqw); height: auto; background: linear-gradient(#21b8b0, #5d9de0, #a98ae9); }
.timeline-widget.vertical .timeline-entry { grid-template-columns: 1.1em 1fr; grid-template-rows: auto auto; align-content: center; text-align: left; }
.timeline-widget.vertical .timeline-marker { grid-row: 1 / span 2; margin: 0; }
.timeline-widget.vertical .timeline-entry p { grid-column: 2; }
</style>
