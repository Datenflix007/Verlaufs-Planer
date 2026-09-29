<script setup lang="ts">
import { computed } from 'vue'
import type { PollOption, PollWidget } from '../../domain/types'

const props = withDefaults(defineProps<{
  poll: PollWidget; editing?: boolean; votes?: Record<string, number>; showResults?: boolean; allowVoting?: boolean
}>(), { editing: false, votes: () => ({}), showResults: false, allowVoting: false })
const emit = defineEmits<{ beginChange: []; changed: []; finish: []; vote: [optionId: string] }>()
const total = computed(() => Object.values(props.votes).reduce((sum, votes) => sum + votes, 0))
function changeOption(option: PollOption, event: Event): void {
  emit('beginChange'); option.label = (event.target as HTMLInputElement).value; emit('changed')
}
function changeQuestion(event: Event): void {
  emit('beginChange'); props.poll.question = (event.target as HTMLInputElement).value; emit('changed')
}
function setType(event: Event): void {
  emit('beginChange')
  props.poll.type = (event.target as HTMLSelectElement).value as PollWidget['type']
  props.poll.options = props.poll.type === 'yes-no'
    ? [{ id: crypto.randomUUID(), label: 'Ja' }, { id: crypto.randomUUID(), label: 'Nein' }]
    : [{ id: crypto.randomUUID(), label: 'Option 1' }, { id: crypto.randomUUID(), label: 'Option 2' }, { id: crypto.randomUUID(), label: 'Option 3' }]
  emit('changed')
}
function addOption(): void {
  emit('beginChange'); props.poll.options.push({ id: crypto.randomUUID(), label: `Option ${props.poll.options.length + 1}` }); emit('changed')
}
function removeOption(id: string): void {
  if (props.poll.options.length <= 2) return
  emit('beginChange'); props.poll.options = props.poll.options.filter((option) => option.id !== id); emit('changed')
}
function percentage(optionId: string): number { return total.value ? Math.round(((props.votes[optionId] ?? 0) / total.value) * 100) : 0 }
</script>

<template>
  <section class="poll-widget" :class="{ editing, results: showResults }" @pointerdown.stop>
    <template v-if="editing">
      <label>Frage<input :value="poll.question" aria-label="Abstimmungsfrage" @input="changeQuestion" /></label>
      <label>Art<select :value="poll.type" @change="setType"><option value="yes-no">Ja / Nein</option><option value="multiple-choice">Mehrfachauswahl</option></select></label>
    </template>
    <h2 v-else>{{ poll.question }}</h2>
    <div class="poll-options">
      <template v-for="option in poll.options" :key="option.id">
        <label v-if="editing" class="poll-option-edit"><input :value="option.label" :aria-label="`Antwort ${option.label}`" @input="changeOption(option, $event)" /><button v-if="poll.type === 'multiple-choice'" type="button" :disabled="poll.options.length <= 2" @click.stop="removeOption(option.id)">×</button></label>
        <button v-else type="button" class="poll-option" :disabled="!allowVoting || showResults" @click.stop="emit('vote', option.id)">
          <span>{{ option.label }}</span>
          <span v-if="showResults" class="poll-result"><i :style="{ width: `${percentage(option.id)}%` }" />{{ percentage(option.id) }} %</span>
        </button>
      </template>
    </div>
    <footer v-if="editing" class="poll-tools" role="toolbar" aria-label="Abstimmung bearbeiten"><button v-if="poll.type === 'multiple-choice'" type="button" @click.stop="addOption">+ Antwort</button><button type="button" @click.stop="emit('finish')">Bearbeitung beenden</button></footer>
    <p v-else-if="showResults" class="vote-total">{{ total }} Stimme{{ total === 1 ? '' : 'n' }}</p>
    <p v-else-if="allowVoting" class="vote-hint">Wähle eine Antwort.</p>
  </section>
</template>

<style scoped>
.poll-widget { display: grid; align-content: center; gap: clamp(8px, 1.3cqw, 16px); width: 100%; height: 100%; padding: 8%; color: #17363a; background: linear-gradient(145deg, #effafa, #d5eeee); text-align: center; }.poll-widget h2 { margin: 0; font-size: clamp(16px, 3.2cqw, 36px); }.poll-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: clamp(8px, 1.2cqw, 16px); }.poll-option { display: grid; gap: .45em; min-height: 3em; padding: .7em; color: #fff; background: #17646a; border: 2px solid #4ebdb8; border-radius: .55em; font: inherit; font-size: clamp(12px, 2cqw, 22px); font-weight: 800; }.poll-option:not(:disabled):hover { background: #0d4d55; transform: translateY(-1px); }.poll-option:disabled { cursor: default; }.poll-result { position: relative; overflow: hidden; padding: .2em .4em; background: #ffffff2b; border-radius: 999px; font-size: .75em; }.poll-result i { position: absolute; inset: 0 auto 0 0; background: #81eee1; opacity: .62; }.poll-result { isolation: isolate; }.poll-result::after { content: ''; position: absolute; inset: 0; z-index: -1; }.poll-option-edit { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .25em; }.poll-widget input, .poll-widget select { min-width: 0; padding: .4em; color: #17363a; background: #fff; border: 1px solid #6f9a9a; border-radius: .35em; font: inherit; }.poll-widget.editing > label { display: grid; gap: .2em; text-align: left; font-size: clamp(10px, 1.7cqw, 16px); font-weight: 700; }.poll-tools { display: flex; justify-content: center; gap: .5em; }.poll-tools button, .poll-option-edit button { padding: .35em .6em; color: #efffff; background: #17646a; border: 1px solid #4ebdb8; border-radius: .35em; font: inherit; }.vote-total, .vote-hint { margin: 0; color: #397078; font-size: clamp(10px, 1.7cqw, 16px); font-weight: 700; }
</style>
