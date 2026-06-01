import Troubleshoot from '../../src/views/system/Troubleshoot.vue'
import LoggingSettings from '../../src/views/system/LoggingSettings.vue'
import NetworkDiagnostic from '../../src/views/system/NetworkDiagnostic.vue'
import createWrapper from '@tests/unit/mockFactory'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'

vi.mock('@ui-core/plugins/axios')

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => ({ hash: '' })
  }
})

describe('Troubleshoot.vue', () => {
  let wrapper
  let message
  beforeEach(() => {
    vi.restoreAllMocks()
    wrapper = createWrapper(Troubleshoot)
    message = useMessages()
  })
  afterEach(() => {
    vi.clearAllTimers()
  })
  it("doesn't show error when downloading troubleshoot file succeeds", async () => {
    utils.downloadFileApi = vi.fn().mockResolvedValueOnce({ data: { success: true } })
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.downloadTroubleshoot({ encrypt: '0', password: '' })
    expect(spy).not.toHaveBeenCalled()
  })
  it('sets up modal with system logs when type: "system"', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({ data: { response: 'system log content', success: true } })
    await wrapper.vm.showLog('system')
    expect(wrapper.vm.modal.info.title).toBe(wrapper.vm.logInfoTypes.system.title)
    expect(wrapper.vm.modal.info.help).toBe(wrapper.vm.logInfoTypes.system.help)
    expect(wrapper.vm.modal.info.logInfo).toBe('system log content')
    expect(wrapper.vm.modal.show).toBeTruthy()
  })
  it('sets up modal with kernel logs when type: "kernel"', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({ data: { response: 'kernel log content', success: true } })
    await wrapper.vm.showLog('kernel')
    expect(wrapper.vm.modal.info.title).toBe(wrapper.vm.logInfoTypes.kernel.title)
    expect(wrapper.vm.modal.info.help).toBe(wrapper.vm.logInfoTypes.kernel.help)
    expect(wrapper.vm.modal.info.logInfo).toBe('kernel log content')
    expect(wrapper.vm.modal.show).toBeTruthy()
  })
})

describe('LoggingSettings.vue', () => {
  let wrapper
  let message
  const logProtoOptions = [
    ['udp', 'UDP'],
    ['tcp', 'TCP']
  ]
  beforeEach(() => {
    wrapper = createWrapper(LoggingSettings, {
      data: () => ({ logProtoOptions })
    })
    message = useMessages()
  })
  it('check remoteLoggerInputProps computed', () => {
    const select = {
      prop: 'protocol',
      options: wrapper.vm.logProtoOptions
    }
    const input = {
      placeholder: 'host:port',
      rules: ['hostipport', wrapper.vm.validateDuplicate],
      prop: 'hostport'
    }
    expect(wrapper.vm.remoteLoggerInputProps).toEqual([input, select])
  })
  it.each`
    values                                              | val                   | result
    ${['192.168.1.1:8080,udp', '192.168.1.1:8080,udp']} | ${'192.168.1.1:8080'} | ${{ isValid: false, message: 'No duplicates are allowed' }}
    ${['192.168.1.1:8081,tcp']}                         | ${'192.168.1.1:8080'} | ${{ isValid: true }}
  `('validateDuplicate validates: $values', async ({ values, val, result }) => {
    wrapper.vm.formData = {
      logging_general: [
        {
          remote_logger: values
        }
      ]
    }
    const res = await wrapper.vm.validateDuplicate(val)
    expect(res).toEqual(result)
  })
  it.each`
    logStatus                                  | deleteInProgress | expectedResult
    ${{ exists: '0', logfile_not_empty: '0' }} | ${false}         | ${true}
    ${{ exists: '1', logfile_not_empty: '0' }} | ${false}         | ${true}
    ${{ exists: '0', logfile_not_empty: '1' }} | ${false}         | ${true}
    ${{ exists: '1', logfile_not_empty: '1' }} | ${false}         | ${false}
    ${{ exists: '1', logfile_not_empty: '1' }} | ${true}          | ${true}
  `('returns $expectedResult when logStatus: $logStatus and deleteInProgress: $deleteInProgress', ({ logStatus, deleteInProgress, expectedResult }) => {
    wrapper.vm.logFileStatus = logStatus
    wrapper.vm.isDeleteInProgress = deleteInProgress
    expect(wrapper.vm.isDeleteButtonDisabled).toEqual(expectedResult)
  })
  it.each`
    errorCode | error
    ${404}    | ${'Log file not found'}
    ${1000}   | ${'An unexpected error occurred'}
  `('returns "$error" when errorCode: $errorCode', ({ errorCode, error }) => {
    const result = wrapper.vm.getErrorMessage(errorCode, wrapper.vm.deleteLogErrors)
    expect(result).toBe(error)
  })
  it('shows error when delete log request fails', async () => {
    axios.post = vi.fn().mockRejectedValue({
      data: {
        errors: [{ code: 1000 }]
      }
    })
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.deleteLog()
    expect(spy).toHaveBeenCalled()
  })
  it('handles string log response (no instances)', async () => {
    const logString = 'Log line 1\nLog line 2\nLog line 3'
    axios.get = vi.fn().mockResolvedValue({
      data: {
        log: logString,
        service: 'session'
      }
    })
    wrapper.vm.currentLog = '1'
    await wrapper.vm.previewSetting()
    expect(wrapper.vm.serviceLogs.info.logInfo).toBe(logString)
    expect(wrapper.vm.serviceLogs.info.title).toBe('Session')
  })
  it('handles object log response (multiple instances)', async () => {
    const logData = {
      inst1: 'Instance 1 log',
      inst2: 'Instance 2 log'
    }
    axios.get = vi.fn().mockResolvedValue({
      data: {
        log: logData,
        service: 'test'
      }
    })
    wrapper.vm.currentLog = '1'
    await wrapper.vm.previewSetting()
    expect(wrapper.vm.serviceLogs.info.title).toBe('test')
  })
  it('opens modal and starts timer when showServiceLog is called', async () => {
    axios.get = vi.fn().mockResolvedValue({
      data: {
        log: 'test log',
        service: 'test'
      }
    })
    const timerStartSpy = vi.spyOn(wrapper.vm.serviceLogTimer, 'start')

    await wrapper.vm.showServiceLog({ id: '1' })
    expect(wrapper.vm.currentLog).toBe('1')
    expect(wrapper.vm.serviceLogsShow).toBe(true)
    expect(timerStartSpy).toHaveBeenCalled()
  })
  it('changes service when onServiceChange is called', async () => {
    axios.get = vi.fn().mockResolvedValue({
      data: {
        log: 'new service log',
        service: 'session'
      }
    })
    const timerStopSpy = vi.spyOn(wrapper.vm.serviceLogTimer, 'stop')
    await wrapper.vm.onServiceChange('2')
    expect(wrapper.vm.currentLog).toBe('2')
    expect(timerStopSpy).toHaveBeenCalled()
  })
  it('closes modal and stops timer when handleCloseServiceLogs is called', () => {
    wrapper.vm.serviceLogsShow = true
    wrapper.vm.selectedServiceId = '1'
    const timerStopSpy = vi.spyOn(wrapper.vm.serviceLogTimer, 'stop')

    wrapper.vm.handleCloseServiceLogs()
    expect(wrapper.vm.serviceLogsShow).toBe(false)
    expect(wrapper.vm.selectedServiceId).toBe('')
    expect(timerStopSpy).toHaveBeenCalled()
  })
  it('shows error message when previewSetting fails', async () => {
    axios.get = vi.fn().mockRejectedValue(new Error('Network error'))
    const spy = vi.spyOn(message, 'error')

    wrapper.vm.currentLog = '1'
    await wrapper.vm.previewSetting()
    expect(spy).toHaveBeenCalledWith('Failed to load service logs')
  })
})

describe('NetworkDiagnostic.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(NetworkDiagnostic, {
      data: () => ({
        mounts: [],
        at: { modem: '3-1', command: 'AT', response: [], parsedResponse: null },
        modemList: [],
        disableAT: false,
        systemTime: ''
      }),
      global: {
        mocks: {
          $mobile: {
            modemOffline: vi.fn(),
            parseModems: vi.fn().mockReturnValue([{ id: '3-1', name: 'Modem 1' }])
          },
          $store: {
            board: {
              hwinfo: {
                mobile: true
              }
            },
            deviceInfo: {
              static: {
                device_name: 'RUT'
              }
            }
          },
          $utils: {
            generateCsv: vi.fn()
          }
        }
      }
    })
  })
  it.each`
    modem                          | response
    ${{ id: '3-1', offline: '1' }} | ${'Sending AT commands is not possible due to the modem being blocked or disabled.'}
    ${{ id: '3-1', offline: '0' }} | ${'It can take up to 3 minutes for an AT command response to be received.'}
  `('returns "$response" when modem: $modem', ({ modem, response }) => {
    wrapper.vm.$mobile.modemOffline.mockReturnValue(modem.offline === '1')
    wrapper.vm.modemList = [modem]
    expect(wrapper.vm.responseHint).toEqual(response)
  })
  it('checks if clearModemDebug clears response values', () => {
    wrapper.vm.at = { modem: '3-1', command: 'AT', response: [['15:00', 'AT', 'OK']], parsedResponse: '15:00 ; AT ; OK' }
    wrapper.vm.clearModemDebug()
    expect(wrapper.vm.at).toEqual({ modem: '3-1', command: 'AT', response: [], parsedResponse: null })
  })
  it('checks if exportModemDebug calls generateCsv function with correct arguments', () => {
    const spy = vi.spyOn(utils, 'generateCsv')
    wrapper.vm.at.response = []
    wrapper.vm.exportModemDebug()
    expect(spy).toHaveBeenCalledWith('modemdebug-data-RUT', [['Time', 'Modem', 'AT command', 'Response']])
    spy.mockClear()
  })
})
