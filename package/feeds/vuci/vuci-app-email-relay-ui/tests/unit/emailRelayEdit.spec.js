import EmailRelayEdit from '../../src/views/services/EmailRelayEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('EmailRelayEdit.vue', () => {
  it('checks initial modeOptions data', () => {
    const wrapper = createWrapper(EmailRelayEdit, { global: { provide: { section: () => {}, validatePorts: () => {} } }, props: { section: {} } })
    expect(wrapper.vm.modeOptions).toEqual([
      ['server', 'Server'],
      ['proxy', 'Proxy'],
      ['cmdline', 'Command line']
    ])
  })
})
