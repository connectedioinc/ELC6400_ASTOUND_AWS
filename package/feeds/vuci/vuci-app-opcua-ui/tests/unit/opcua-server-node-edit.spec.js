import createWrapper from '@tests/unit/mockFactory'
import OpcuaServerNodeEdit from '../../src/views/services/OpcuaServerNodeEdit.vue'

describe('OpcuaServerNodeEdit.vue', () => {
  it('check if revalidates all section fields', () => {
    const props = {
      section: {
        id: 'Node',
        '.type': 'server_node_Server'
      }
    }
    const wrapper = createWrapper(OpcuaServerNodeEdit, { props })
    const self = {
      vuciSection: {
        validate: vi.fn()
      }
    }
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })

  it('returns rule', () => {
    const props = {
      section: {
        id: 'Node',
        '.type': 'server_node_Server'
      }
    }
    const wrapper = createWrapper(OpcuaServerNodeEdit, { props })
    const s = { type: '0' }
    const result = wrapper.vm.getIDRule(s)
    expect(result).toEqual('range(0,4294967295)')
  })

  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name in overview', ({ name, returnedValue }) => {
    const props = {
      section: {
        id: 'Node',
        '.type': 'server_node_Server'
      }
    }
    const wrapper = createWrapper(OpcuaServerNodeEdit, { props })
    wrapper.vm.formData = {
      serverNodes: [
        {
          name: 'Value',
          '.type': 'server_node_Server'
        },
        {
          name: 'Value',
          '.type': 'server_node_Server'
        }
      ]
    }
    const result = wrapper.vm.nodeExistsInServer(name)
    expect(result).toEqual(returnedValue)
  })
})
