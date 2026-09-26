<script setup lang="ts">
import { Node } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { RichTextDocument } from '../../domain/types'

const props = defineProps<{ modelValue: RichTextDocument; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: RichTextDocument] }>()

const LatexInline = Node.create({
  name: 'latexInline', inline: true, group: 'inline', atom: true,
  addAttributes: () => ({ latex: { default: '' } }),
  parseHTML: () => [{ tag: 'span[data-latex]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', { 'data-latex': HTMLAttributes.latex, class: 'latex-node' }, HTMLAttributes.latex],
})
const LatexBlock = Node.create({
  name: 'latexBlock', group: 'block', atom: true,
  addAttributes: () => ({ latex: { default: '' } }),
  parseHTML: () => [{ tag: 'pre[data-latex-block]' }],
  renderHTML: ({ HTMLAttributes }) => ['pre', { 'data-latex-block': HTMLAttributes.latex, class: 'latex-block-node' }, HTMLAttributes.latex],
})

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Superscript, Subscript, LatexInline, LatexBlock, Table.configure({ resizable: false }), TableRow, TableHeader, TableCell],
  editorProps: { attributes: { 'aria-label': props.label } },
  onUpdate: ({ editor: instance }) => emit('update:modelValue', instance.getJSON() as RichTextDocument),
})

const latexDialogOpen = ref(false)
const latexKind = ref<'inline' | 'block'>('inline')
const latexSource = ref('')

watch(() => props.modelValue, (value) => {
  if (editor.value && JSON.stringify(editor.value.getJSON()) !== JSON.stringify(value)) editor.value.commands.setContent(value, { emitUpdate: false })
}, { deep: true })

function openLatexDialog(kind: 'inline' | 'block'): void {
  latexKind.value = kind
  latexSource.value = ''
  latexDialogOpen.value = true
}
function insertLatex(): void {
  const latex = latexSource.value.trim()
  if (!latex) return
  editor.value?.chain().focus().insertContent({ type: latexKind.value === 'block' ? 'latexBlock' : 'latexInline', attrs: { latex } }).run()
  latexDialogOpen.value = false
}
function insertTable(): void { editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() }
function link(): void {
  const href = window.prompt('Link-Adresse:')
  if (href) editor.value?.chain().focus().extendMarkRange('link').setLink({ href }).run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="rich-editor">
    <div class="editor-toolbar" role="toolbar" :aria-label="`${label} formatieren`">
      <button type="button" title="Fett" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()"><b>B</b></button>
      <button type="button" title="Kursiv" :class="{ active: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" title="Unterstrichen" :class="{ active: editor?.isActive('underline') }" @click="editor?.chain().focus().toggleUnderline().run()"><u>U</u></button>
      <button type="button" title="Ueberschrift" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" title="Aufzaehlung" @click="editor?.chain().focus().toggleBulletList().run()">Liste</button>
      <button type="button" title="Nummerierte Liste" @click="editor?.chain().focus().toggleOrderedList().run()">1. Liste</button>
      <button type="button" title="Zitat" @click="editor?.chain().focus().toggleBlockquote().run()">Zitat</button>
      <button type="button" title="Link" @click="link">Link</button>
      <button type="button" title="Hochgestellt" @click="editor?.chain().focus().toggleSuperscript().run()">x2</button>
      <button type="button" title="Tiefgestellt" @click="editor?.chain().focus().toggleSubscript().run()">x2</button>
      <button type="button" title="Einfache Tabelle mit Kopfzeile einfuegen" @click="insertTable">Tabelle</button>
      <button type="button" title="LaTeX innerhalb eines Satzes einfuegen" @click="openLatexDialog('inline')">Inline-TeX</button>
      <button type="button" title="Eigenstaendigen LaTeX-Block einfuegen" @click="openLatexDialog('block')">Block-TeX</button>
      <span class="toolbar-spacer" />
      <button type="button" title="Rueckgaengig" @click="editor?.chain().focus().undo().run()">&#8630;</button>
      <button type="button" title="Wiederholen" @click="editor?.chain().focus().redo().run()">&#8631;</button>
    </div>
    <EditorContent :editor="editor" class="editor-page" />
    <div v-if="latexDialogOpen" class="inline-dialog-backdrop" @click.self="latexDialogOpen = false">
      <section class="latex-dialog" role="dialog" aria-modal="true" aria-labelledby="latex-dialog-title">
        <div class="dialog-title"><h2 id="latex-dialog-title">{{ latexKind === 'block' ? 'Block-LaTeX einfuegen' : 'Inline-LaTeX einfuegen' }}</h2><button type="button" aria-label="Dialog schliessen" @click="latexDialogOpen = false">&times;</button></div>
        <p v-if="latexKind === 'block'">Der Inhalt wird im TeX-Export unveraendert als eigener Block uebernommen, etwa eine Gleichungs- oder Tabellenumgebung.</p>
        <p v-else>Der Inhalt wird im TeX-Export unveraendert an der Cursorposition uebernommen.</p>
        <label>LaTeX-Quelltext<textarea v-model="latexSource" :rows="latexKind === 'block' ? 9 : 3" :placeholder="latexKind === 'block' ? '\\begin{equation}\nE = mc^2\n\\end{equation}' : '\\frac{a}{b}'" autofocus /></label>
        <div class="dialog-actions"><button type="button" class="secondary" @click="latexDialogOpen = false">Abbrechen</button><button type="button" :disabled="!latexSource.trim()" @click="insertLatex">Einfuegen</button></div>
      </section>
    </div>
  </div>
</template>
