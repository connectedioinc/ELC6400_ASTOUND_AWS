import CollectionEdit from '../../src/views/services/CollectionEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Collection section', () => {
  let wrapper
  const section = { enabled: '1', id: '1', input: ['3', '4'], output: '2' }
  const provide = {
    azureSections: () => ({})
  }
  beforeEach(() => {
    wrapper = createWrapper(CollectionEdit, {
      global: { provide },
      propsData: {
        section
      }
    })
    wrapper.setData({
      formData: {
        outputs: [{ id: '2' }],
        inputs: [{ id: '3' }, { id: '4' }]
      }
    })
  })
  it('returns error message when section is enabled', () => {
    expect(wrapper.vm.validate()).rejects.toEqual('All data inputs assigned to this collection should be configured')
  })
  it('returns undefined when section is not enabled', () => {
    wrapper = createWrapper(CollectionEdit, {
      global: { provide },
      propsData: {
        section: { enabled: '0', id: '1', input: ['3', '4'], output: '2' }
      }
    })
    wrapper.setData({
      formData: {
        outputs: [{ id: '2' }],
        inputs: [
          { id: '3', name: 'input1' },
          { id: '4', name: 'input2' }
        ]
      }
    })
    expect(wrapper.vm.validate()).resolves.toEqual({})
  })
})
