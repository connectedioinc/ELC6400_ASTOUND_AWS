import createWrapper from '@tests/unit/mockFactory'
import OpcuaServer from '../../src/views/services/OpcuaServer.vue'

const stubs = {
  'tlt-horizontal-card': { template: '<div></div>' }
}

describe('OpcuaServer.vue', () => {
  it.each([
    [{ data: { id: '1', tcl: [] } }, { id: 'Server', tcl: ['test/white', 'test/black'] }, { id: 'Server', tcl: ['test/white', 'test/black'] }],
    [{ data: { id: '1' } }, { id: 'Server', tcl: ['test/white', 'test/black'] }, { id: 'Server', tcl: [] }]
  ])('check if values were fixed', (res, startForm, finalForm) => {
    const wrapper = createWrapper(OpcuaServer, { global: { stubs } })
    wrapper.vm.formData = { opcua: [startForm] }
    wrapper.vm.fixTCLValue('', res)
    expect(wrapper.vm.formData).toEqual({ opcua: [finalForm] })
  })

  it.each([
    ['/test/black', [{ id: 'Server', tcl: ['test/white'] }], [{ id: 'Server', tcl: ['test/white', '/test/black'] }]],
    ['/test/green', [{ id: 'Server', tcl: ['test/white', '/test/black'] }], [{ id: 'Server', tcl: ['test/white', '/test/black'] }]]
  ])('checked if values were reset', (res, values, form) => {
    const wrapper = createWrapper(OpcuaServer, { global: { stubs } })
    wrapper.vm.formData = { opcua: form }
    wrapper.vm.reset(res)
    expect(wrapper.vm.formData.opcua).toEqual(values)
  })

  it.each([
    [{ data: { path: 'test/black' } }, { id: 'Server', tcl: ['test/white', 'test/black'] }, { id: 'Server', tcl: ['test/white', 'test/black'] }],
    [{ data: { path: 'test/black' } }, { id: 'Server', tcl: ['test/white'] }, { id: 'Server', tcl: ['test/white', 'test/black'] }],
    [{ data: { path: 'test/white' } }, { id: 'Server', tcl: ['test/black', 'test/white'] }, { id: 'Server', tcl: ['test/black', 'test/white'] }],
    [{ data: { path: 'test/new' } }, { id: 'Server', tcl: ['test/black', 'test/white'] }, { id: 'Server', tcl: ['test/black', 'test/white', 'test/new'] }]
  ])('check if values were merged correctly', (res, startForm, finalForm) => {
    const wrapper = createWrapper(OpcuaServer, { global: { stubs } })
    wrapper.vm.formData = { opcua: [startForm] }
    wrapper.vm.mergeData(res)
    expect(wrapper.vm.formData).toEqual({ opcua: [finalForm] })
  })
})
