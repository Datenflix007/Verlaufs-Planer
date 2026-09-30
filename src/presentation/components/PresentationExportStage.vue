<script setup lang="ts">
import { computed } from 'vue'
import type { Presentation } from '../../domain/types'
import { orderedSlides } from '../presentation'
import SlideCanvas from './SlideCanvas.vue'

const props = defineProps<{ presentation: Presentation }>()
const slides = computed(() => orderedSlides(props.presentation))
</script>

<template>
  <div class="presentation-export-stage" aria-hidden="true">
    <div v-for="slide in slides" :key="slide.id" class="export-slide" :data-slide-id="slide.id">
      <SlideCanvas :slide="slide" :theme-id="presentation.themeId" readonly />
    </div>
  </div>
</template>

<style scoped>
.presentation-export-stage { position: fixed; left: -10000px; top: 0; width: 1280px; pointer-events: none; }
.export-slide { width: 1280px; height: 720px; overflow: hidden; }
.export-slide :deep(.slide-canvas) { width: 1280px; height: 720px; box-shadow: none; }
</style>
