import VuciFormItemInput from '@ui-core/vuci-form/src/VuciFormItemInput'
import createWrapper from '../mockFactory'
import tltCardStub from '../stubs/tltCardStub'

describe('VuciFormItemInput.vue', () => {
  it.each`
    password | result
    ${true}  | ${'tlt-input-password'}
    ${false} | ${'tlt-input'}
  `('computes component name when password is $password', ({ password, result }) => {
    const wrapper = createWrapper(VuciFormItemInput, {
      stubs: {
        'tlt-input-password': tltCardStub,
        'tlt-input': tltCardStub
      },
      propsData: {
        password
      }
    })
    expect(wrapper.vm.is).toBe(result)
  })
})
