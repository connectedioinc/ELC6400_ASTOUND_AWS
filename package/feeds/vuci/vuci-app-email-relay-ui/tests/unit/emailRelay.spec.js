import EmailRelay from '../../src/views/services/EmailRelay.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EmailRelay.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(EmailRelay)
  })
  it('Checks initial emailColumns & modeOptions data', () => {
    expect(wrapper.vm.emailColumns).toEqual([
      { name: 'name', label: 'Instance name', help: 'Name of the instace.' },
      { name: 'mode', label: 'Mode', help: 'Instance mode.' },
      { name: 'enabled', label: 'Enabled' }
    ])
    expect(wrapper.vm.modeOptions).toEqual([
      ['server', 'Server'],
      ['proxy', 'Proxy'],
      ['cmdline', 'Command line']
    ])
  })
  it.each([
    ['server', 'Server'],
    ['proxy', 'Proxy'],
    ['cmdline', 'Command line']
  ])('returns mode name when %s', (mode, response) => {
    expect(wrapper.vm.displayMode(mode)).toEqual(response)
  })
  it.each([
    ['1', { id: 'test1', smtp_port: '1' }, [{ id: 'test', smtp_port: '1' }], { isValid: false, message: 'Port is used in another instance' }],
    ['1', { id: 'test1', pop_port: '1' }, [{ id: 'test', pop_port: '1' }], { isValid: false, message: 'Port is used in another instance' }],
    ['1', { id: 'test1', pop_port: '1' }, [{ id: 'test1', pop_port: '1' }], { isValid: true }],
    ['1', { id: 'test1', pop_port: '1', smtp_port: '1' }, [{ id: 'test1', pop_port: '1' }], { isValid: false, message: 'Port is used in another field' }]
  ])('validates ports and returns isValid', (val, section, data, response) => {
    wrapper.vm.formData.emailrelay = data
    expect(wrapper.vm.validatePorts(val, { uciSection: section })).toEqual(response)
  })
  it('returns error message when mode is server and ports are empty', async () => {
    const data = {
      uciSection: { mode: 'server' }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith('Instance cannot be enabled without SMTP and POP ports')
  })
  it("doesn't return error message when mode is cmdline", async () => {
    const data = {
      uciSection: { mode: 'cmdline' }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.validateEnable(data)
    expect(spy).not.toHaveBeenCalledWith('Instance cannot be enabled without SMTP and POP ports')
  })
})
