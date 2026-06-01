import VuciFormItemTemplate from '@ui-core/vuci-form/src/VuciFormItemTemplate'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

const stubs = {
  'tlt-form-model-item-api': tltCardStub
}

describe('VuciFormItemTemplate.vue', () => {
  it('checks if component exists', () => {
    const wrapper = createWrapper(VuciFormItemTemplate, {
      stubs
    })
    expect(wrapper.exists()).toBeTruthy()
  })
})
