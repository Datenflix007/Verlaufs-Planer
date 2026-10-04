// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createPlan } from '../../domain/factories'
import { defaultPriorities } from '../../domain/priorities'
import GeneralSection from './GeneralSection.vue'

describe('GeneralSection', () => {
  it('speichert die ausgewählte Planungspriorität und meldet die Änderung', async () => {
    const plan = createPlan('Priorisierte Planung')
    const wrapper = mount(GeneralSection, { props: { plan, priorities: defaultPriorities() } })
    const prioritySelect = wrapper.findAll('select').find((select) => select.text().includes('Blitz'))

    await prioritySelect!.setValue('lightning')

    expect(plan.metadata.priorityId).toBe('lightning')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })
})
