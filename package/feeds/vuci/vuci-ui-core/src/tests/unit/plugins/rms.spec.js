import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { rms } from '@/utils/rms'
import i18n from '@ui-core/plugins/i18n'
import '@ui-core/utils/string-format'

describe('rms.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it.each`
    errorCode | errorStatus
    ${'35'}   | ${'Cannot connect to server'}
    ${'-1'}   | ${'-'}
    ${'10'}   | ${'Unexpected error'}
  `('returns errorStatus: "$errorStatus" when error code: $errorCode', async ({ errorCode, errorStatus }) => {
    const rmsData = {
      error_code: errorCode
    }
    const result = rms.parseError(rmsData)
    expect(result).toBe(errorStatus)
  })
  it.each`
    rmsStatus | statusName
    ${'0'}    | ${'Disabled'}
    ${'1'}    | ${'Enabled'}
  `('returns "$statusName" when RMS status is $rmsStatus', async ({ rmsStatus, statusName }) => {
    const rmsData = {
      status: rmsStatus
    }
    const result = rms.parseStatus(rmsData)
    expect(result).toBe(statusName)
  })
  it.each`
    connectionState | error  | errorState                  | errorStatus
    ${'1'}          | ${'1'} | ${'RMS connection refused'} | ${'\u00A0(RMS connection refused)'}
    ${'1'}          | ${'1'} | ${'Network is unreachable'} | ${'\u00A0(Network is unreachable)'}
    ${'0'}          | ${'1'} | ${'RMS connection refused'} | ${null}
    ${'1'}          | ${'0'} | ${'Network is unreachable'} | ${null}
  `('returns error status "$errorStatus" when RMS status: $errorState', async ({ connectionState, error, errorState, errorStatus }) => {
    const rmsData = {
      connection_state: connectionState,
      error
    }
    vi.spyOn(rms, 'parseError').mockReturnValue(errorState)
    const result = rms.getFullError(rmsData)
    expect(result).toBe(errorStatus)
  })
  it.each`
    rmsStatus | connectionState | rmsStatusText
    ${'1'}    | ${'0'}          | ${'Connected'}
    ${'1'}    | ${'1'}          | ${'Down'}
    ${'1'}    | ${'2'}          | ${'Connecting'}
  `('returns object with status text "$rmsStatusText" when RMS status: $rmsStatus and connection state: $connectionState', async ({ rmsStatus, connectionState, rmsStatusText }) => {
    const rmsData = {
      status: rmsStatus,
      connection_state: connectionState
    }
    const result = rms.parseConnectionState(rmsData)
    expect(result.text).toBe(rmsStatusText)
  })
  it.each`
    rmsStatus | connectionState | colorCode
    ${'0'}    | ${'0'}          | ${'text-theme-text-subtle'}
    ${'1'}    | ${'0'}          | ${'success'}
    ${'1'}    | ${'1'}          | ${'error'}
    ${'1'}    | ${'2'}          | ${'text-theme-text-success-subtle'}
  `('returns object with color code "$colorCode" when RMS status: $rmsStatus and connection state: $connectionState', async ({ rmsStatus, connectionState, colorCode }) => {
    const rmsData = {
      status: rmsStatus,
      connection_state: connectionState
    }
    const result = rms.parseConnectionState(rmsData)
    expect(result.color).toBe(colorCode)
  })
  it.each`
    rmsStatus | status
    ${'1'}    | ${'Enabled'}
    ${'0'}    | ${'Disabled'}
    ${'2'}    | ${'Standby'}
  `('returns status "$status" when RMS status: $rmsStatus', async ({ rmsStatus, status }) => {
    const rmsData = {
      status: rmsStatus
    }
    const result = rms.parseStatus(rmsData)
    expect(result).toBe(status)
  })
})
