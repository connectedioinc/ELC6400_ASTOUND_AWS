import createWrapper from '@tests/unit/mockFactory'
import WirelessStatus from '@/components/shared/WirelessStatus.vue'

import { axios } from '@ui-core/plugins/axios'

vi.mock('@ui-core/plugins/messages')
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    path: ''
  })
}))

describe('WirelessStatus.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        status: {},
        config: {}
      }
    }
    wrapper = createWrapper(WirelessStatus, wrapperOptions)
  })
  it.each`
    code  | expectedResult
    ${1}  | ${{ code: 1, title: 'Authentication failed', type: 'Status code', name: 'UNSPECIFIED_FAILURE', explanation: expect.any(String), prettyName: 'Auth failed', isLocal: false }}
    ${13} | ${{ code: 13, title: 'Authentication failed', type: 'Status code', name: 'NOT_SUPPORTED_AUTH_ALG', explanation: undefined, prettyName: 'Auth failed', isLocal: false }}
    ${15} | ${{ code: 15, title: 'Authentication failed', type: 'Status code', name: 'CHALLENGE_FAIL', explanation: expect.any(String), prettyName: 'Bad password', isLocal: false }}
  `('parses auth error #%#', ({ code, expectedResult }) => {
    expect(wrapper.vm.parseAuthError(code)).toEqual(expectedResult)
  })
  it.each`
    code  | expectedResult
    ${1}  | ${{ code: 1, title: 'Last disconnection reason', type: 'Reason code', name: 'UNSPECIFIED', explanation: undefined, isLocal: false }}
    ${-4} | ${{ code: 4, title: 'Last disconnection reason', type: 'Reason code', name: 'DISASSOC_DUE_TO_INACTIVITY', explanation: expect.any(String), isLocal: true }}
    ${15} | ${{ code: 15, title: 'Authentication failed', type: 'Reason code', name: '4WAY_HANDSHAKE_TIMEOUT', explanation: expect.any(String), prettyName: 'Bad password', isLocal: false }}
  `('parses deauth reason #%#', ({ code, expectedResult }) => {
    expect(wrapper.vm.parseDeauthReason(code)).toEqual(expectedResult)
  })
  it.each`
    status                                                                                                                | config                     | expectedResult
    ${undefined}                                                                                                          | ${{}}                      | ${{ status: '-' }}
    ${{}}                                                                                                                 | ${{}}                      | ${{ status: '-' }}
    ${{ mode: 'ap', devices: [{ up: false }] }}                                                                           | ${{}}                      | ${{ status: 'Radio disabled' }}
    ${{ mode: 'ap', up: true }}                                                                                           | ${{}}                      | ${{ status: 'Running', type: 'success' }}
    ${{ mode: 'ap', up: true, devices: [{ up: true, name: 'radio1', dfs: { cac_active: true, cac_seconds_left: 30 } }] }} | ${{}}                      | ${{ status: 'DFS CAC (30s left)', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
    ${{ mode: 'ap', up: true, devices: [{ up: true, name: 'radio1', dfs: { cac_active: true, cac_seconds_left: 0 } }] }}  | ${{}}                      | ${{ status: 'DFS CAC (0s left)', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
    ${{ mode: 'ap', up: true, devices: [{ up: true, name: 'radio1', dfs: { cac_active: true } }] }}                       | ${{}}                      | ${{ status: 'DFS CAC', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
    ${{ mode: 'ap', up: false, status: '0' }}                                                                             | ${{}}                      | ${{ status: 'Disabled' }}
    ${{ mode: 'ap', up: false, status: '1' }}                                                                             | ${{}}                      | ${{ status: 'Starting', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
    ${{ mode: 'sta', up: false, status: '0' }}                                                                            | ${{}}                      | ${{ status: 'Disabled' }}
    ${{ mode: 'sta', up: true, wpa_state: 'COMPLETED' }}                                                                  | ${{}}                      | ${{ status: 'Connected', type: 'success' }}
    ${{ mode: 'sta', up: true, wpa_state: 'DISCONNECTED' }}                                                               | ${{}}                      | ${{ status: 'Idle', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
    ${{ mode: 'sta', up: true, wpa_state: 'DISCONNECTED', disconnect_reason: 10 }}                                        | ${{}}                      | ${{ status: 'Idle', help: expect.any(String), helpTitle: expect.any(String), error: expect.any(Object), type: 'warning' }}
    ${{ mode: 'sta', up: true, wpa_state: 'DISCONNECTED', disconnect_reason: 10 }}                                        | ${{ auto_reconnect: '0' }} | ${{ status: 'Reconnect required', help: expect.any(String), helpTitle: expect.any(String), type: 'warning', error: expect.any(Object), button: { text: 'Reconnect', condition: expect.any(Boolean), action: expect.any(Function), disabled: expect.any(Boolean) } }}
    ${{ mode: 'sta', up: true, wpa_state: 'SCANNING', disconnect_reason: 10 }}                                            | ${{}}                      | ${{ status: 'Scanning', help: expect.any(String), helpTitle: expect.any(String), error: expect.any(Object), type: 'warning' }}
    ${{ mode: 'sta', up: true, wpa_state: '4WAY_HANDSHAKE', disconnect_reason: 10 }}                                      | ${{}}                      | ${{ status: 'Connecting', help: expect.any(String), helpTitle: expect.any(String), type: 'warning' }}
  `('parses status #%#', async ({ status, config, expectedResult }) => {
    await wrapper.setProps({ status, config })
    expect(wrapper.vm.parsedStatus).toEqual(expectedResult)
  })

  it('method staReconnect(). Successfully reconnects to the access point', async () => {
    vi.spyOn(axios, 'post').mockResolvedValueOnce({ success: true })
    const spy = vi.spyOn(wrapper.vm.message, 'success')
    await wrapper.vm.staReconnect()
    expect(spy).toHaveBeenCalledWith('Reconnecting to the access point')
  })

  it('method staReconnect(). Fails to reconnect to the access point', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.staReconnect()
    expect(spy).toHaveBeenCalledWith('Failed to reconnect to the access point')
  })
})
