import { i18n } from '@ui-core/plugins/i18n'
import { brand } from '@ui-core/plugins/brand'
class Rms {
  errorCodes = {
    4: () => i18n.t('The company which the device is registered to does not have an active email'),
    6: () => i18n.t('Device was deleted from RMS'),
    7: () => i18n.t('Device serial number duplicate! Contact manufacturer'),
    8: () =>
      i18n.t('Device is not registered in RMS. Please login to %s and add this device to your account device list'.format('<a href="https://%s" target="_blank">%s</a>'.format(brand.text('rmsURL')))),
    13: () => i18n.t('Device belongs to a company, but the company does not have an active email'),
    14: () => i18n.t('Device monitoring is turned off'),
    15: () => i18n.t('Expired license'),
    16: () => i18n.t("Router's date does not fall into SSL certificate validity date range. Is the router's date and time set correctly?"),
    17: () => i18n.t('Server refused connection. The device may be blocked or unidentified'),
    30: () => i18n.t('Other error'),
    31: () => i18n.t('Network is unreachable'),
    32: () => i18n.t('RMS connection refused'),
    33: () => i18n.t('SSL failure'),
    34: () => i18n.t('Failed to resolve hostname'),
    35: () => i18n.t('Cannot connect to server')
  }

  successCodes = ['10', '12']

  parseStatus(rmsData) {
    const rmsStatuses = {
      0: i18n.t('Disabled'),
      1: i18n.t('Enabled'),
      2: i18n.t('Standby'),
      default: '-'
    }
    return rmsStatuses[rmsData.status] || rmsStatuses.default
  }

  parseConnectionState(rmsData) {
    const rmsConnectionStates = {
      0: {
        text: i18n.t('Connected'),
        color: 'success'
      },
      1: {
        text: i18n.t('Down'),
        color: 'error'
      },
      2: {
        text: i18n.t('Connecting'),
        color: 'text-theme-text-success-subtle'
      },
      3: {
        text: i18n.t('Disconnecting'),
        color: 'text-theme-text-danger-subtle'
      },
      disabled: {
        text: i18n.t('Disabled'),
        color: 'text-theme-text-subtle'
      },
      default: {
        text: '-',
        color: ''
      }
    }

    if (rmsData.status === '0') return rmsConnectionStates.disabled
    if (this.successCodes.includes(rmsData.error_code)) return rmsConnectionStates[2]
    return rmsConnectionStates[rmsData.connection_state] || rmsConnectionStates.default
  }

  parseError(rmsData) {
    if (rmsData.error_code === '-1') return '-'
    return this.errorCodes[rmsData.error_code]?.() || i18n.t('Unexpected error')
  }

  getFullError(rmsData) {
    if (rmsData.connection_state === '1' && rmsData.error === '1') {
      return '\u00A0(%s)'.format(this.parseError(rmsData))
    }
    return null
  }
}
export const rms = new Rms()
