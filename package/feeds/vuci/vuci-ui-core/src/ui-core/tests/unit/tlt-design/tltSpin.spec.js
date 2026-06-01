import tltSpin from '@ui-core/tlt-design/layout/tltSpin.vue'
import createWrapper from '../mockFactory'

describe('tltSpin.vue', () => {
  it.each`
    spinning | modalOpen | result
    ${true}  | ${true}   | ${''}
  `('tests spinning watcher', async ({ spinning, modalOpen, result }) => {
    const wrapper = createWrapper(tltSpin)
    wrapper.vm.store.modalOpen = modalOpen
    wrapper.vm.store.spinning = spinning
    await wrapper.vm.$nextTick()
    expect(document.body.style.overflow).toBe(result)
  })
})
