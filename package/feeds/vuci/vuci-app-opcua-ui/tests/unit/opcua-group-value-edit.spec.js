import createWrapper from '@tests/unit/mockFactory'
import OpcuaGroupValueEdit from '../../src/views/services/OpcuaGroupValueEdit.vue'

const serverNodes = [
  {
    id: '1',
    name: 'Node',
    '.type': 'server_node_Server'
  }
]

describe('OpcuaGroupValueEdit.vue', () => {
  it('returns server options', () => {
    const props = {
      section: {
        id: '1',
        name: 'test',
        '.type': 'server'
      }
    }
    const wrapper = createWrapper(OpcuaGroupValueEdit, {
      data: () => ({
        formData: {
          serverNodes: [],
          server: [
            {
              id: '1',
              name: 'test',
              '.type': 'server'
            }
          ]
        }
      }),
      props
    })
    const result = wrapper.vm.getServerOptions
    expect(result).toEqual([['1', 'test']])
  })

  it('returns server node options', () => {
    const props = {
      section: {
        id: 'Server',
        name: 'test',
        '.type': 'server',
        server: 'Server'
      }
    }
    const wrapper = createWrapper(OpcuaGroupValueEdit, { data: () => ({ formData: { serverNodes, server: [] } }), props })
    const result = wrapper.vm.getServerNodeOptions
    expect(result).toEqual([[serverNodes[0].id, serverNodes[0].name]])
  })

  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name in overview', ({ name, returnedValue }) => {
    const props = {
      section: {
        id: 'Group Value',
        '.type': 'value'
      }
    }
    const wrapper = createWrapper(OpcuaGroupValueEdit, {
      data: () => ({
        formData: {
          server: [],
          serverNodes: [],
          groupValue: [
            { name: 'Value', '.type': 'value' },
            { name: 'Value', '.type': 'value' }
          ]
        }
      }),
      props
    })
    const result = wrapper.vm.valueExistsInGroup(name)
    expect(result).toEqual(returnedValue)
  })

  it('sets current server from known server node', () => {
    const props = {
      section: {
        id: 'Group Value',
        '.type': 'value',
        server_node: '5'
      }
    }
    const wrapper = createWrapper(OpcuaGroupValueEdit, {
      data: () => ({
        formData: {
          serverNodes: [
            {
              id: '1',
              '.type': 'server_node_4'
            },
            {
              id: '5',
              '.type': 'server_node_100'
            }
          ],
          server: []
        }
      }),
      props,
      global: {
        provide: {
          setSection: vi.fn()
        }
      }
    })
    wrapper.vm.loadData()
    expect(wrapper.vm.setSection).toHaveBeenCalled()
  })

  it('does not set current server when there is no node server found', () => {
    const props = {
      section: {
        id: 'Group Value',
        '.type': 'value',
        server_node: '5'
      }
    }
    const wrapper = createWrapper(OpcuaGroupValueEdit, {
      data: () => ({
        formData: {
          server: [],
          serverNodes: [
            {
              id: '1',
              '.type': 'server_node_4'
            },
            {
              id: '10',
              '.type': 'server_node_100'
            }
          ]
        }
      }),
      props
    })
    wrapper.vm.loadData()
    expect(wrapper.vm.section.server).toEqual(undefined)
  })
})
