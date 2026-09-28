import { ref } from 'vue'
import { defineStore } from 'pinia'
export type EditorSection = 'general' | 'dates' | 'objectives' | 'competencies' | 'content' | 'didactics' | 'schedule' | 'materials'
export const useEditorStore = defineStore('editor', () => { const section = ref<EditorSection>('general'); const exportOpen = ref(false); return { section, exportOpen } })
