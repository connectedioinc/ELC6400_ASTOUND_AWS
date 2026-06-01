import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { reconnectHelper } from '@/utils/reconnectHelper'
import '@ui-core/utils/string-format'
import { reconnect } from '@ui-core/plugins/helper'
import { usePrompt } from '@/stores/messages'
import i18n from '@ui-core/plugins/i18n'

vi.mock('@ui-core/plugins/messages')
vi.mock('@ui-core/plugins/helper')

vi.mock('@ui-core/plugins/messages')
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    path: ''
  })
}))

describe('reconnectHelper.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })
  it('calls disconnect and reconnect', async () => {
    const initialConfig = { ipaddr: '192.168.1.1', ip6addr: 'ffff::ffff' }
    const currentConfig = { ipaddr: '192.168.1.2', ip6addr: 'ffff::fff8' }
    const spyDisconnect = vi.spyOn(reconnectHelper, '_openDisconnectPrompt')
    const spyReconnect = vi.spyOn(reconnectHelper, '_openReconnectPrompt')
    await reconnectHelper.openPrompt(initialConfig, currentConfig)
    expect(spyDisconnect).toBeCalled()
    expect(spyReconnect).toBeCalled()
  })
  it.each`
    ip                | fieldType    | expectedResult
    ${'192.168.1.10'} | ${'ipaddr'}  | ${'192.168.1.10'}
    ${'ffff:ffff'}    | ${'ip6addr'} | ${'[ffff:ffff]'}
  `('converts ip to hostname #%#', ({ ip, fieldType, expectedResult }) => {
    expect(reconnectHelper._getHostName(ip, fieldType)).toEqual(expectedResult)
  })
  it.each`
    webUrl            | expectedResult
    ${'192.168.1.1'}  | ${'ipaddr'}
    ${'[ffff::ffff]'} | ${'ip6addr'}
    ${'192.168.1.10'} | ${undefined}
  `('converts ip to hostname #%#', ({ webUrl, expectedResult }) => {
    const initialConfig = { ipaddr: '192.168.1.1', ip6addr: 'ffff::ffff' }
    global.document = { location: { hostname: webUrl } }
    expect(reconnectHelper._getConnectedIpType(initialConfig)).toEqual(expectedResult)
  })
  it('returns no errors', () => {
    const initialConfig = {}
    const currentConfig = { ipvaddr: '192.168.1.1' }
    vi.spyOn(reconnectHelper, '_getConnectedIpType').mockReturnValue('ipvaddr')
    expect(reconnectHelper._getDisconnectWarnings(initialConfig, currentConfig)).toEqual([])
  })
  it('returns errors', () => {
    const initialConfig = {}
    const currentConfig = { ipvaddr: undefined }
    vi.spyOn(reconnectHelper, '_getConnectedIpType').mockReturnValue('ipvaddr')
    expect(reconnectHelper._getDisconnectWarnings(initialConfig, currentConfig)).toEqual(['IP used for connecting to this device was removed'])
  })
  it.each`
    initialConfig               | currentConfig               | disconnectWarnings | connectedIpType | expectedResult
    ${{ ipaddr: '1.1.1.1' }}    | ${{ ipaddr: '1.1.1.2' }}    | ${[]}              | ${'ipaddr'}     | ${true}
    ${{ ip6addr: 'ffff:fff1' }} | ${{ ip6addr: 'ffff:ffff' }} | ${[]}              | ${'ip6addr'}    | ${true}
    ${{ ipaddr: '1.1.1.1' }}    | ${{ ipaddr: '1.1.1.1' }}    | ${[]}              | ${'ipaddr'}     | ${false}
    ${{}}                       | ${{ ipaddr: '1.1.1.2' }}    | ${[]}              | ${undefined}    | ${false}
    ${{ ipaddr: '1.1.1.1' }}    | ${{ ipaddr: '1.1.1.2' }}    | ${[]}              | ${'ip6addr'}    | ${false}
  `('returns boolean if reconnect is needed', ({ initialConfig, currentConfig, disconnectWarnings, connectedIpType, expectedResult }) => {
    vi.spyOn(reconnectHelper, '_getConnectedIpType').mockReturnValue(connectedIpType)
    vi.spyOn(reconnectHelper, '_getDisconnectWarnings').mockReturnValue(disconnectWarnings)
    expect(!!reconnectHelper._shouldReconnect(initialConfig, currentConfig)).toEqual(expectedResult)
  })

  it('disconnect opened and accepted', async () => {
    const prompt = usePrompt()
    prompt.show.mockImplementation(({ onOk }) => onOk())
    vi.spyOn(reconnectHelper, '_getDisconnectWarnings').mockReturnValue(['this is warning'])
    await expect(reconnectHelper._openDisconnectPrompt()).resolves.toBeUndefined()
  })

  it('disconnect opened and declined', async () => {
    const prompt = usePrompt()
    prompt.show.mockImplementation(({ onCancel }) => onCancel())
    vi.spyOn(reconnectHelper, '_getDisconnectWarnings').mockReturnValue(['this is warning'])
    await expect(reconnectHelper._openDisconnectPrompt()).rejects.toBeUndefined()
  })

  it('disconnect not opened', async () => {
    vi.spyOn(reconnectHelper, '_getDisconnectWarnings').mockReturnValue([])
    await expect(reconnectHelper._openDisconnectPrompt()).resolves.toBeUndefined()
  })

  it('reconnect opened and accepted', async () => {
    const prompt = usePrompt()
    const initialConfig = { ipaddr: '1.1.1.1' }
    const currentConfig = { ipaddr: '1.1.1.2' }
    const host = '[ffff:ffff]'
    prompt.show.mockImplementation(({ onOk }) => onOk())

    vi.spyOn(reconnectHelper, '_shouldReconnect').mockReturnValue(true)
    vi.spyOn(reconnectHelper, '_getConnectedIpType').mockReturnValue('')
    vi.spyOn(reconnectHelper, '_getHostName').mockReturnValue(host)
    await expect(reconnectHelper._openReconnectPrompt(initialConfig, currentConfig)).resolves.toBeUndefined()
  })

  it('reconnect opened and declined', async () => {
    const prompt = usePrompt()
    prompt.show.mockImplementation(({ onCancel }) => onCancel())
    vi.spyOn(reconnectHelper, '_shouldReconnect').mockReturnValue(true)
    await expect(reconnectHelper._openReconnectPrompt()).rejects.toBeUndefined()
  })

  it('recconect not opened', async () => {
    vi.spyOn(reconnectHelper, '_shouldReconnect').mockReturnValue(false)
    await expect(reconnectHelper._openReconnectPrompt()).resolves.toBeUndefined()
  })

  it('reconnects when config changed', async () => {
    const initialConfig = { ipaddr: '1.1.1.1' }
    global.document = { location: { hostname: initialConfig.ipaddr } }
    const currentConfig = { ipaddr: '1.1.1.2' }
    const host = '1.1.1.2'
    const port = window.location.port
    reconnectHelper.handleReconnect(initialConfig, currentConfig)
    expect(reconnect).toBeCalledWith(expect.any(String), { port, address: host, params: { ipChanged: 1 }, logout: false })
  })

  it('does not recconect when config is same', async () => {
    const initialConfig = { ipaddr: '1.1.1.1' }
    reconnectHelper.handleReconnect(initialConfig, initialConfig)
    expect(reconnect).not.toBeCalled()
  })
})
