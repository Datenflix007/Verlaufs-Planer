// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { createPlan } from '../../domain/factories'
import PresentationEditor from './PresentationEditor.vue'

describe('Präsentationseditor: Verlauf und Folienmetadaten', () => {
  it('macht eine sichtbare Textänderung rückgängig und wiederholt sie', async () => {
    const plan = reactive(createPlan())
    const wrapper = mount(PresentationEditor, { props: { plan } })

    await wrapper.find('[title="Text"]').trigger('click')
    await wrapper.findAll('menu button').find((button) => button.text().includes('Fließtext'))!.trigger('click')
    expect(plan.presentation!.slides[0]!.elements).toHaveLength(1)
    await wrapper.find('[title="Rückgängig"]').trigger('click')
    await nextTick()
    expect(plan.presentation!.slides[0]!.elements).toHaveLength(0)
    await wrapper.find('[title="Wiederholen"]').trigger('click')
    await nextTick()
    expect(plan.presentation!.slides[0]!.elements[0]?.content.text).toBe('Text hinzufügen')
    expect(wrapper.emitted('changed')?.length).toBeGreaterThanOrEqual(3)
    wrapper.unmount()
  })

  it('speichert sichtbare Sprechernotizen und lässt den Bereich einklappen', async () => {
    const plan = reactive(createPlan())
    const wrapper = mount(PresentationEditor, { props: { plan } })
    const notes = wrapper.find('textarea[placeholder="Hier Notizen eingeben …"]')

    await notes.trigger('focus')
    await notes.setValue('Auf die Bildquelle verweisen.')
    expect(plan.presentation!.slides[0]!.notes).toBe('Auf die Bildquelle verweisen.')
    expect(wrapper.emitted('changed')?.length).toBeGreaterThan(0)
    await wrapper.find('.notes button').trigger('click')
    expect(wrapper.find('textarea[placeholder="Hier Notizen eingeben …"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('speichert Übergangstyp und Dauer über den Animations-Inspector', async () => {
    const plan = reactive(createPlan())
    const wrapper = mount(PresentationEditor, { props: { plan } })
    await wrapper.findAll('.properties nav button').find((button) => button.text() === 'Animation')!.trigger('click')
    const selects = wrapper.findAll('.properties .panel select')

    await selects[0]!.trigger('focus')
    await selects[0]!.setValue('slide')
    await selects[1]!.trigger('focus')
    await selects[1]!.setValue('700')
    expect(plan.presentation!.slides[0]!.transition).toEqual({ type: 'slide', duration: 700 })
    expect(wrapper.emitted('changed')?.length).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })
})
