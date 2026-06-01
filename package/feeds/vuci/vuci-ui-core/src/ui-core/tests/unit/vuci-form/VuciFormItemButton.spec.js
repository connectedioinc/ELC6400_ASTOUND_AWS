import VuciFormItemButton from '@ui-core/vuci-form/src/VuciFormItemButton'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

const stubs = {
  'tlt-button': tltCardStub
}

describe('VuciFormItemButton.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each`
    method
    ${'_save'}
    ${'_buttonClick'}
  `('component contains $method method', ({ method }) => {
    wrapper = createWrapper(VuciFormItemButton, {
      stubs
    })
    const methods = Object.keys(wrapper.vm)
    expect(methods.includes(method)).toBeTruthy()
    expect(typeof wrapper.vm[method]).toBe('function')
  })

  it('method _save. Does nothing', () => {
    wrapper = createWrapper(VuciFormItemButton, {
      stubs
    })
    wrapper.vm._save()
  })

  it('method _buttonClick. Emits event on button click', () => {
    wrapper = createWrapper(VuciFormItemButton, {
      stubs
    })
    wrapper.vm._buttonClick()
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
