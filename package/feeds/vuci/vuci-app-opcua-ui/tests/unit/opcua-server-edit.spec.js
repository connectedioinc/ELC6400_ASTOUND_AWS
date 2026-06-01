import createWrapper from '@tests/unit/mockFactory'
import OpcuaServerEdit from '../../src/views/services/OpcuaServerEdit.vue'

const serverNodes = [
  {
    id: '1',
    name: 'Node',
    '.type': 'server_node_Server'
  }
]

function assertResultEqual(actual, expected) {
  if (expected.isValid) {
    expect(actual?.isValid).toBeTruthy()
  } else {
    expect(actual?.isValid).toBeFalsy()
    expect(actual?.message).toEqual(expected.message)
  }
}

describe('OpcuaServerEdit.vue', () => {
  it.each`
    value                       | res
    ${'opc.tcp://example:8080'} | ${{ isValid: true }}
    ${'opc.tcp://example.com'}  | ${{ isValid: true }}
    ${'http://example.com'}     | ${{ isValid: true }}
    ${'https://example.com'}    | ${{ isValid: true }}
  `('validates opc ua endpoint url', ({ value, res }) => {
    const props = {
      section: {
        id: 'Server',
        '.type': 'server'
      }
    }
    const wrapper = createWrapper(OpcuaServerEdit, { props })
    wrapper.vm.$VuciValidator.port = () => ({ isValid: true })
    wrapper.vm.$VuciValidator.protourl = () => ({ isValid: true })
    const result = wrapper.vm.validateOpcUrl(value)
    expect(result).toEqual(res)
  })

  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name', ({ name, returnedValue }) => {
    const props = {
      section: {
        id: 'Server',
        '.type': 'server'
      }
    }
    const wrapper = createWrapper(OpcuaServerEdit, { props })
    wrapper.vm.formData = { serverNodes: [{ name: 'Value', '.type': 'server_node_Server' }] }
    const result = wrapper.vm.serverNodeExists(name)
    assertResultEqual(result, returnedValue)
  })

  it.each`
    title                            | name       | expected
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name in overview', ({ name, expected }) => {
    const wrapper = createWrapper(OpcuaServerEdit, { data: () => ({ formData: { server: [{ name: 'Value' }, { name: 'Value' }] } }), props: { section: {} } })
    const result = wrapper.vm.serverExists(name)
    assertResultEqual(result, expected)
  })

  it.each([
    [51, { isValid: false, message: 'Server node limit was reached (50 max)' }],
    [36, { isValid: true }]
  ])('checks group value limit validation', (length, expected) => {
    const section = { id: 'Server' }
    const wrapper = createWrapper(OpcuaServerEdit, { props: { section } })
    wrapper.vm.formData = { serverNodes: Array(length).fill(serverNodes[0]) }
    const result = wrapper.vm.nodeLimit()
    assertResultEqual(result, expected)
  })

  it.each([
    [{ data: { id: '1', tcl: [] } }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }],
    [{ data: { id: '1' } }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }, { server: [{ id: 'Server', tcl: [] }] }]
  ])('check if values were fixed', (res, startForm, finalForm) => {
    const section = { id: 'Server', tcl: ['/test/white', '/test/black'] }
    const wrapper = createWrapper(OpcuaServerEdit, { props: { section } })
    wrapper.vm.formData = startForm
    wrapper.vm.fixTCLValue('', res)
    assertResultEqual(wrapper.vm.formData, finalForm)
  })
  it.each([
    ['/test/black', ['/test/white'], { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }],
    ['/test/green', ['/test/white'], { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }],
    ['/test/black', ['/test/white'], { server: [{ id: 'Server' }] }]
  ])('checked if values were reset', (res, values, form) => {
    const section = { id: 'Server', tcl: ['/test/white', '/test/black'] }
    const wrapper = createWrapper(OpcuaServerEdit, { props: { section } })
    wrapper.vm.formData = form
    wrapper.vm.reset(res)
    assertResultEqual(wrapper.vm.formData.server, { server: [{ id: 'Server', tcl: values }] })
  })

  it.each([
    [{ data: { path: 'test/black' } }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }],
    [{ data: { path: 'test/black' } }, { server: [{ id: 'Server', tcl: ['test/white'] }] }, { server: [{ id: 'Server', tcl: ['test/white', 'test/black'] }] }],
    [{ data: { path: 'test/white' } }, { server: [{ id: 'Server', tcl: ['test/black', 'test/white'] }] }, { server: [{ id: 'Server', tcl: ['test/black', 'test/white'] }] }],
    [{ data: { path: 'test/new' } }, { server: [{ id: 'Server', tcl: ['test/black', 'test/white'] }] }, { server: [{ id: 'Server', tcl: ['test/black', 'test/white', 'test/new'] }] }]
  ])('check if values were merged correctly', (res, startForm, finalForm) => {
    const section = { id: 'Server', tcl: ['/test/white', '/test/black'] }
    const wrapper = createWrapper(OpcuaServerEdit, { props: { section } })
    wrapper.vm.formData = startForm
    wrapper.vm.mergeData(res)
    expect(wrapper.vm.formData).toEqual(finalForm)
  })

  it('returns Server node data', () => {
    const wrapper = createWrapper(OpcuaServerEdit, { props: { section: {} } })
    const section = {
      node_id: '1111',
      '.type': 'server_node_1',
      id: '3',
      name: 'jj',
      ns: '1',
      type: '0'
    }
    expect(wrapper.vm.getServerNodeTestData(section)).toEqual({
      server: {},
      server_node: {
        node_id: section.node_id,
        ns: section.ns,
        type: section.type
      }
    })
  })
})
