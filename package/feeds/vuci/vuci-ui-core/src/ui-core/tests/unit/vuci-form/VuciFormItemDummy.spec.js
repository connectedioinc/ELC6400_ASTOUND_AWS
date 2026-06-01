import VuciFormItemDummy from '@ui-core/vuci-form/src/VuciFormItemDummy'
import createWrapper from '../mockFactory'

describe('VuciFormItemDummy.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('component contains validate method', () => {
    const method = 'validate'
    wrapper = createWrapper(VuciFormItemDummy)
    const methods = Object.keys(wrapper.vm)
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  it('computes displayed text value from model', () => {
    const model = 'someValue'
    wrapper = createWrapper(VuciFormItemDummy)
    wrapper.vm.model = model
    expect(wrapper.vm.displayText).toBe(model)
  })

  it('method validate. Always resolves true', async () => {
    wrapper = createWrapper(VuciFormItemDummy)
    const res = wrapper.vm.validate()
    expect(res).toBeTruthy()
  })
})
