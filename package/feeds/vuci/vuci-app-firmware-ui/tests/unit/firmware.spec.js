import createWrapper from '@tests/unit/mockFactory'
import Firmware from '../../src/views/system/Firmware.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages, usePrompt } from '@/stores/messages'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { flushPromises } from '@vue/test-utils'
import FirmwareUpdate from '../../src/views/system/FirmwareUpdate.vue'

vi.mock('@ui-core/plugins/axios', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    axios: {
      get: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      bulkGet: vi.fn().mockResolvedValue({ data: {} })
    }
  }
})

describe('Firmware tests', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createTestingPinia())

    wrapper = createWrapper(Firmware)
  })
  it.each([
    [
      'success is true',
      [
        { success: true, data: { test: 'test' } },
        { success: true, data: { modems: [{ test2: 'test2', type: 'primary' }] } },
        { success: true, data: [] },
        { success: true, data: { memory: { ram_free: 50 } } }
      ],
      { test: 'test' },
      [{ test2: 'test2', type: 'primary' }]
    ],
    [
      'success is false',
      [
        { success: false, data: { test: 'test' } },
        { success: false, data: { modems: [{ test2: 'test2' }] } },
        { success: false, data: [] },
        { success: false, data: {} }
      ],
      {},
      []
    ]
  ])('loads data when request %s', async (test, data, fw, modem) => {
    axios.bulkGet = vi.fn().mockResolvedValue(data)
    const wrapper = createWrapper(Firmware)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.fwInfo).toEqual(fw)
    expect(wrapper.vm.modemInfo).toEqual(modem)
  })
  it('invokes message when promise is rejected', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    ['checking for updates', {}, true, 'Checking...'],
    ['no update available', 'N/A', true, 'No updates available'],
    ['newest version (Fw_newest)', { version: 'Fw_newest' }, true, 'Newest version installed on the device'],
    ['newest version (newest)', { version: 'newest' }, true, 'Newest version installed on the device'],
    ['specific version', { version: '1.2.3' }, true, '1.2.3'],
    ['FOTA service disabled', { version: '1.2.3' }, false, 'FOTA service is disabled']
  ])('returns correct message when %s', (type, updateInfo, fotaEnabled, expected) => {
    wrapper.vm.updateInfo = updateInfo
    wrapper.vm.fotaEnabled = fotaEnabled
    wrapper.vm.store.firmwareUpdateInfo = updateInfo === 'N/A' ? null : updateInfo
    const result = wrapper.vm.fwVersion
    expect(result).toBe(expected)
  })
  it.each([
    ['device', { fwType: 'device', online: false, valid: '1' }],
    ['modem', { fwType: 'modem', online: false, valid: '1' }]
  ])('opens verify window with %s firmware information', (fwType, expected) => {
    const res = { data: { valid: '1' } }
    wrapper.vm.onUploadFirmware(fwType)({ res })
    expect(wrapper.vm.verification).toEqual(expected)
    expect(wrapper.vm.verifyStep).toBe(true)
  })
  it('starts download when upgrade from server is selected', async () => {
    axios.post = vi.fn().mockResolvedValue({ data: {} })

    wrapper.vm.fotaEnabled = true
    wrapper.vm.updateInfo = { version: '1.2.3', stable_version: '1.2.0' }
    wrapper.vm.deviceSelectedVersion = 'stable'
    wrapper.vm.store.firmwareUpdateInfo = { version: '1.2.3', stable_version: '1.2.0' }

    const timerSpy = vi.spyOn(wrapper.vm.timer, 'start')
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')

    wrapper.vm.downloadDeviceFw()
    await flushPromises()

    expect(spinSpy).toHaveBeenCalledWith('Downloading...')
    expect(timerSpy).toHaveBeenCalled()
  })
  it('shows message on download cancel success', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockResolvedValue({ success: true })
    const spy = vi.spyOn(message, 'success')
    wrapper.vm.isCancellingDownload = false
    await wrapper.vm.cancelFwDownload()
    expect(spy).toHaveBeenCalled()
  })
  it('shows message on download cancel fail', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')

    wrapper.vm.isCancellingDownload = false
    await wrapper.vm.cancelFwDownload()
    expect(spy).toHaveBeenCalled()
  })
  it('invokes error message when modem firmware download fails to start', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValue()
    wrapper.vm.modemInfo = [{ id: '3-1', type: 'Primary modem' }]
    wrapper.vm.modemUpdateInformation = [{ id: '3-1', update_exists: '1' }]
    wrapper.vm.selectedModem = '3-1'

    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.performModemDownload()
    expect(spy).toHaveBeenCalled()
  })
  it('shows info message if there is no updates for device from server', async () => {
    const message = useMessages()
    wrapper.vm.fotaEnabled = true
    wrapper.vm.updateInfo = { version: 'newest', stable_version: 'newest' }
    wrapper.vm.store.firmwareUpdateInfo = { version: 'newest', stable_version: 'newest' }

    const spy = vi.spyOn(message, 'info')
    await wrapper.vm.downloadDeviceFw()
    expect(spy).toHaveBeenCalled()
  })
  it('shows error message if there is no modem updates available', async () => {
    const message = useMessages()
    wrapper.vm.modemUpdateInformation = []
    wrapper.vm.fotaEnabled = true

    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.downloadModemFw()
    expect(spy).toHaveBeenCalled()
  })
  it('invokes prompt when starting modem upgrade', async () => {
    const prompt = usePrompt()
    wrapper.vm.modemInfo = [{ id: '3-1', type: 'Primary modem' }]
    wrapper.vm.modemUpdateInformation = [{ id: '3-1', update_exists: '1' }]
    wrapper.vm.selectedModem = '3-1'

    const spy = vi.spyOn(prompt, 'show')
    await wrapper.vm.downloadModemFw()
    expect(spy).toHaveBeenCalled()
  })
  it('invokes success message when modem upgrade starts', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockResolvedValueOnce()
    wrapper.vm.modemInfo = [{ id: '3-1', type: 'Primary modem' }]
    wrapper.vm.modemUpdateInformation = [{ id: '3-1', update_exists: '1' }]
    wrapper.vm.selectedModem = '3-1'

    const spy = vi.spyOn(message, 'success')
    await wrapper.vm.performModemDownload()
    expect(spy).toHaveBeenCalledWith('Primary modem firmware update started')
  })
  it.each([
    ['download didnt start', { data: { process: 'startedooo' } }, 'Downloading...0%', 0, false],
    ['download is ongoing', { data: { process: 'started', percents: '17' } }, 'Downloading...17%', 0, true],
    ['download finished', { data: { process: 'succeeded', percents: '100' } }, 'Download complete. Verifying...', 0, true],
    ['download failed', { data: { process: 'failed', percents: '0' } }, 'Downloading...', 1, true]
  ])('shows download info when %s', async (type, data, response, promptCalls, started) => {
    const prompt = usePrompt()
    wrapper.vm.loadingInfo = 'Downloading...'
    wrapper.vm.startedDownload = started
    wrapper.vm.downloadFailedGuard = true

    const promptSpy = vi.spyOn(prompt, 'show')
    axios.post = vi.fn().mockResolvedValue({ data: { valid: '1' } })
    axios.get = vi.fn().mockResolvedValueOnce(data)

    await wrapper.vm.getDownloadProgress()
    await flushPromises()
    expect(wrapper.vm.loadingInfo).toContain(response)
    expect(promptSpy).toHaveBeenCalledTimes(promptCalls)
  })
  it('invokes error message when download progress request is rejected', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')

    await wrapper.vm.getDownloadProgress()

    expect(spy).toHaveBeenCalledWith('Failed to load download progress')
  })
  it('verifies fw when fw is invalid and shows prompt', async () => {
    const prompt = usePrompt()
    const promptSpy = vi.spyOn(prompt, 'show')
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')
    axios.post = vi.fn().mockResolvedValueOnce({ data: { valid: '0', message_code: '1' } })

    await wrapper.vm.verifyDownloadFw()
    expect(wrapper.vm.verifyStep).toBe(false)
    expect(promptSpy).toHaveBeenCalled()
    expect(spinSpy).toHaveBeenCalledWith(false)
  })
  it('verifies fw when fw is valid', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({ data: { valid: '1' } })
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')

    await wrapper.vm.verifyDownloadFw()
    expect(wrapper.vm.verifyStep).toEqual(true)
    expect(spinSpy).toHaveBeenCalledWith(false)
  })
  it('invokes error message when verifying fails', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    const spinSpy = vi.spyOn(wrapper.vm.store, 'spin')

    await wrapper.vm.verifyDownloadFw()
    expect(wrapper.vm.verifyStep).toEqual(false)
    expect(spy).toHaveBeenCalledWith('Failed to verify downloaded firmware')
    expect(spinSpy).toHaveBeenCalledWith(false)
  })
  it.each([
    [
      'loads firmware data when data is loaded without config version',
      [{ type: 'primary', version: 'version' }],
      { version: 'test', build_date: 'test', kernel_version: 'test' },
      [
        { title: 'Firmware version', value: 'test' },
        { title: 'Firmware build date', value: 'test' },
        { title: 'Kernel version', value: 'test' }
      ]
    ],
    [
      'loads firmware data when data is not loaded',
      [],
      {},
      [
        { title: 'Firmware version', value: undefined },
        { title: 'Firmware build date', value: undefined },
        { title: 'Kernel version', value: undefined }
      ]
    ]
  ])('%s', (type, modem, data, response) => {
    wrapper.vm.fwInfo = data
    wrapper.vm.modemInfo = modem

    const val = wrapper.vm.currentFirmwareData
    expect(val).toEqual(response)
  })
  it.each([1, 9, 14, 16, 5, 18, 28])('returns error group code for code %s', code => {
    expect(wrapper.vm.getUploadError(code)).toHaveProperty('title')
  })
  it('should return number for reboot error', () => {
    expect(wrapper.vm.getUploadErrorIndex(15)).toEqual(3)
  })
  it('should return correct index for battery error', () => {
    expect(wrapper.vm.getUploadErrorIndex(18)).toEqual(5)
  })
  it.each([
    {
      name: 'there are 2 modems with updates',
      modemInfo: [
        { id: '1', type: 'Primary modem' },
        { id: '2', type: 'Secondary modem' }
      ],
      updateInfo: [
        { id: '1', update_exists: '1' },
        { id: '2', update_exists: '1' }
      ],
      fotaEnabled: true,
      expected: [
        { name: 'All', value: 'all' },
        { name: 'Primary modem', value: '1' },
        { name: 'Secondary modem', value: '2' }
      ]
    },
    {
      name: 'there are 2 modems, one with newest version',
      modemInfo: [
        { id: '1', type: 'Primary modem' },
        { id: '2', type: 'Secondary modem' }
      ],
      updateInfo: [
        { id: '1', update_exists: '1' },
        { id: '2', update_exists: '0' }
      ],
      fotaEnabled: true,
      expected: [{ name: 'Primary modem', value: '1' }]
    },
    {
      name: 'single modem with update',
      modemInfo: [{ id: '3-1', type: 'Internal modem' }],
      updateInfo: [{ id: '3-1', update_exists: '1' }],
      fotaEnabled: true,
      expected: [{ name: 'Internal modem', value: '3-1' }]
    },
    {
      name: 'no modems with updates',
      modemInfo: [{ id: '1', type: 'Primary modem' }],
      updateInfo: [{ id: '1', update_exists: '0' }],
      fotaEnabled: true,
      expected: []
    }
  ])('loads modem options when $name', ({ modemInfo, updateInfo, fotaEnabled, expected }) => {
    wrapper.vm.modemInfo = modemInfo
    wrapper.vm.modemUpdateInformation = updateInfo
    wrapper.vm.fotaEnabled = fotaEnabled

    const result = wrapper.vm.modemOptions
    expect(result).toEqual(expected)
  })
  it.each([
    {
      name: 'returns "FOTA service disabled" when FOTA is not enabled',
      modemId: '3-1',
      fotaEnabled: false,
      updateInfo: { version: '1.0' },
      modemUpdateInformation: [],
      expectedResult: 'FOTA service is disabled'
    },
    {
      name: 'returns "Checking..." when updateInfo version is undefined',
      modemId: '3-2',
      fotaEnabled: true,
      updateInfo: { version: undefined },
      modemUpdateInformation: [],
      expectedResult: 'Checking...'
    },
    {
      name: 'returns "No updates available" when updateInfo is N/A',
      modemId: '3-1',
      fotaEnabled: true,
      updateInfo: 'N/A',
      modemUpdateInformation: [],
      expectedResult: 'No updates available'
    },
    {
      name: 'returns "Checking..." when modem is not found in modemUpdateInformation',
      modemId: '3-2',
      fotaEnabled: true,
      updateInfo: { version: '1.0' },
      modemUpdateInformation: [{ id: '3-1', update_exists: '0' }],
      expectedResult: 'Checking...'
    },
    {
      name: 'returns "Newest version installed on the modem" when update_exists is 0',
      modemId: '3-2',
      fotaEnabled: true,
      updateInfo: { version: '1.0' },
      modemUpdateInformation: [{ id: '3-2', update_exists: '0' }],
      expectedResult: 'Newest version installed on the modem'
    },
    {
      name: 'returns "Update available" when update_exists is 1',
      modemId: '4-1',
      fotaEnabled: true,
      updateInfo: { version: '1.0' },
      modemUpdateInformation: [{ id: '4-1', update_exists: '1' }],
      expectedResult: 'Update available'
    }
  ])('getModemStatus: $name', ({ modemId, fotaEnabled, updateInfo, modemUpdateInformation, expectedResult }) => {
    wrapper.vm.fotaEnabled = fotaEnabled
    wrapper.vm.updateInfo = updateInfo
    wrapper.vm.store.firmwareUpdateInfo = updateInfo === 'N/A' ? null : updateInfo
    wrapper.vm.modemUpdateInformation = modemUpdateInformation

    expect(wrapper.vm.getModemStatus(modemId)).toBe(expectedResult)
  })
  it('should show prompt on reboot', async () => {
    const prompt = usePrompt()
    const spy = vi.spyOn(prompt, 'show')

    await wrapper.vm.onReboot()
    expect(spy).toHaveBeenCalled()
  })
  it('should call axios on reboot', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({ success: true })

    await wrapper.vm.reboot()
    expect(axios.post).toHaveBeenCalledWith('/api/system/actions/reboot')
  })
  it.each`
    updateInfo                                         | result
    ${{ version: 'newest', stable_version: 'newest' }} | ${undefined}
    ${'N/A'}                                           | ${undefined}
    ${{ stable_version: 'OTD500_R_00.07.12' }}         | ${'https://firmware.teltonika-networks.com/7.12/OTD500/OTD500_R_00.07.12_WEBUI.bin'}
    ${{ stable_version: 'RUT30X_R_00.07.12' }}         | ${'https://firmware.teltonika-networks.com/7.12/RUT30X/RUT30X_R_00.07.12_WEBUI.bin'}
    ${{ stable_version: 'RUT36X_R_00.07.12' }}         | ${'https://firmware.teltonika-networks.com/7.12/RUT36X/RUT36X_R_00.07.12_WEBUI.bin'}
    ${{ stable_version: 'RUTX_R_00.07.06.10' }}        | ${'https://firmware.teltonika-networks.com/7.6.10/RUTX/RUTX_R_00.07.06.10_WEBUI.bin'}
  `('parsedStableFwDownloadUrl returns $result', ({ updateInfo, result }) => {
    wrapper.vm.updateInfo = updateInfo
    expect(wrapper.vm.parsedStableFwDownloadUrl).toEqual(result)
  })
  it.each`
    updateInfo                                         | result
    ${{ version: 'newest', stable_version: 'newest' }} | ${undefined}
    ${'N/A'}                                           | ${undefined}
    ${{ version: 'OTD500_R_00.07.12' }}                | ${'https://firmware.teltonika-networks.com/7.12/OTD500/OTD500_R_00.07.12_WEBUI.bin'}
    ${{ version: 'RUT30X_R_00.07.12' }}                | ${'https://firmware.teltonika-networks.com/7.12/RUT30X/RUT30X_R_00.07.12_WEBUI.bin'}
    ${{ version: 'RUTX_R_00.07.06.10' }}               | ${'https://firmware.teltonika-networks.com/7.6.10/RUTX/RUTX_R_00.07.06.10_WEBUI.bin'}
  `('parsedLatestFwDownloadUrl returns $result', ({ updateInfo, result }) => {
    wrapper.vm.updateInfo = updateInfo
    expect(wrapper.vm.parsedLatestFwDownloadUrl).toEqual(result)
  })
  it('updates fotaEnabled when fotaInfo changes', async () => {
    wrapper.vm.fotaEnabled = false
    wrapper.vm.store.fotaInfo = { enabled: '1' }

    await wrapper.vm.$nextTick()
    const newWrapper = createWrapper(Firmware)
    newWrapper.vm.store.fotaInfo = { enabled: '1' }
    await newWrapper.vm.$nextTick()
    expect(newWrapper.vm.fotaEnabled).toBe(true)
  })
  it('updates modemUpdateInformation and updateInfo when firmwareUpdateInfo changes', async () => {
    const mockUpdateInfo = { version: '1.2.3', stable_version: '1.2.0' }
    const mockModemInfo = [{ id: '3-1', update_exists: '1' }]

    wrapper.vm.store.firmwareUpdateInfo = mockUpdateInfo
    wrapper.vm.store.modemUpdateInfo = mockModemInfo

    await wrapper.vm.$nextTick()
    expect(wrapper.vm.updateInfo).toEqual(mockUpdateInfo)
    expect(wrapper.vm.modemUpdateInformation).toEqual(mockModemInfo)
    expect(wrapper.vm.infoLoaded).toBe(true)
  })
  it.each([
    {
      name: 'returns table with two modems with updates',
      modemInfo: [
        { id: '1', type: 'Primary modem' },
        { id: '2', type: 'Secondary modem' }
      ],
      modemUpdateInformation: [
        { id: '1', update_exists: '1' },
        { id: '2', update_exists: '1' }
      ],
      fotaEnabled: true,
      expected: [
        { title: 'Primary modem', value: 'Update available', slotName: 'modem' },
        { title: 'Secondary modem', value: 'Update available', slotName: 'modem' }
      ]
    },
    {
      name: 'returns table with one modem with update and one with newest version',
      modemInfo: [
        { id: '1', type: 'Primary modem' },
        { id: '2', type: 'Secondary modem' }
      ],
      modemUpdateInformation: [
        { id: '1', update_exists: '1' },
        { id: '2', update_exists: '0' }
      ],
      fotaEnabled: true,
      expected: [
        { title: 'Primary modem', value: 'Update available', slotName: 'modem' },
        { title: 'Secondary modem', value: 'Newest version installed on the modem', slotName: undefined }
      ]
    },
    {
      name: 'returns table with FOTA disabled',
      modemInfo: [{ id: '3-1', type: 'Internal modem' }],
      modemUpdateInformation: [{ id: '3-1', update_exists: '1' }],
      fotaEnabled: false,
      expected: [{ title: 'Internal modem', value: 'FOTA service is disabled', slotName: undefined }]
    }
  ])('buildModemTableData: $name', ({ modemInfo, modemUpdateInformation, fotaEnabled, expected }) => {
    wrapper.vm.modemInfo = modemInfo
    wrapper.vm.modemUpdateInformation = modemUpdateInformation
    wrapper.vm.fotaEnabled = fotaEnabled
    wrapper.vm.updateInfo = { version: '1.0' }
    wrapper.vm.store.firmwareUpdateInfo = { version: '1.0' }

    const result = wrapper.vm.buildModemTableData()
    expect(result).toEqual(expected)
  })
})

describe('FirmwareUpdate.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(FirmwareUpdate, {
      props: {
        type: 'device',
        selectedFrom: 'server',
        selectedVersion: 'stable',
        keepSettings: true,
        readOnlyPage: false,
        infoLoaded: true,
        currentData: [],
        serverData: []
      }
    })
  })
  it.each([
    ['device', 'Update device firmware'],
    ['modem', 'Update modem firmware']
  ])('renders %s firmware title when type is %s', async (type, expectedTitle) => {
    await wrapper.setProps({ type })
    expect(wrapper.vm.title).toContain(expectedTitle)
  })
  it('emits update:selectedFrom when radio changes', async () => {
    await wrapper.vm.$emit('update:selectedFrom', 'file')
    expect(wrapper.emitted('update:selectedFrom')).toBeTruthy()
    expect(wrapper.emitted('update:selectedFrom')[0]).toEqual(['file'])
  })
  it('emits download event when update button clicked', async () => {
    await wrapper.vm.$emit('download', [])
    expect(wrapper.emitted('download')).toBeTruthy()
  })
})
