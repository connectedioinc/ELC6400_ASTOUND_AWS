import { i18n } from '@ui-core/plugins/i18n'
import { reconnect } from '@ui-core/plugins/helper'
import { usePrompt } from '@/stores/messages'

/**
 * @typedef {Object} NetworkConfig
 * @property {string} [ipaddr] - ipv4 ip address
 * @property {string} [ip6addr] - ipv6 ip address
 */
export const reconnectHelper = {
  /**
   * depending on initial and current config opens disconnect or reconnect prompt
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {Promise}
   */
  async openPrompt(initialConfig, currentConfig) {
    await reconnectHelper._openDisconnectPrompt(initialConfig, currentConfig)
    return reconnectHelper._openReconnectPrompt(initialConfig, currentConfig)
  },

  /**
   * depending on initial and current config handles reconnect
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {Promise}
   */
  handleReconnect(initialConfig, currentConfig) {
    if (!reconnectHelper._shouldReconnect(initialConfig, currentConfig)) return
    const connectedField = reconnectHelper._getConnectedIpType(initialConfig)
    const hostName = reconnectHelper._getHostName(currentConfig[connectedField], connectedField)
    const port = window.location.port
    reconnect(i18n.t('Reconnecting...'), { address: hostName, port, params: { ipChanged: 1 }, logout: false })
  },

  /**
   * parses ip address to hostname as ipv6 address has differances
   * @param {string} ip ipv4 or ipv6 address
   * @param {('ipaddr'|'ip6addr')} fieldType 'ipaddr' or 'ip6addr'
   * @returns {string}
   */
  _getHostName(ip, fieldType) {
    if (fieldType !== 'ip6addr') return ip // no changes needed for ipv4
    const ipv6NoMask = ip.split('/')[0] // for ip6addr field we use ipmask6 validation but hostname needs pure address
    return `[${ipv6NoMask}]` // ipv6 address needs to be surouded by branckets to be valid hostname
  },

  /**
   * finds if ipv4 or ipv6 or neither ip is currently used ip for WebUi
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @returns {('ipaddr'|'ip6addr')}
   */
  _getConnectedIpType(initialConfig) {
    const webUiHostname = document.location.hostname
    return ['ipaddr', 'ip6addr'].find(fieldName => initialConfig[fieldName] && reconnectHelper._getHostName(initialConfig[fieldName], fieldName) === webUiHostname)
  },

  /**
   * returns found warnings that can couse WebUi disconnect
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {[string]}
   */
  _getDisconnectWarnings(initialConfig, currentConfig) {
    const warnings = []
    const connectedField = reconnectHelper._getConnectedIpType(initialConfig)
    if (connectedField && !currentConfig[connectedField]) warnings.push(i18n.t('IP used for connecting to this device was removed'))
    return warnings
  },

  /**
   * opens disconnect prompt if disconnect may occur
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {Promise}
   */
  _openDisconnectPrompt(initialConfig, currentConfig) {
    const prompt = usePrompt()
    if (reconnectHelper._getDisconnectWarnings(initialConfig, currentConfig).length === 0) return Promise.resolve()
    return new Promise((resolve, reject) => {
      prompt.show({
        title: i18n.t('Are you sure?'),
        content: i18n.t('You might be disconnected from the device after confirming because%s%s.').format('<br>', reconnectHelper._getDisconnectWarnings(initialConfig, currentConfig).join('<br>')),
        cancelText: i18n.t('Cancel'),
        okText: i18n.t('Continue'),
        onOk: resolve,
        onCancel: reject,
        rawhtml: true
      })
    })
  },

  /**
   * checks if reconnect is needed
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {Boolean}
   */
  _shouldReconnect(initialConfig, currentConfig) {
    const connectedField = reconnectHelper._getConnectedIpType(initialConfig)
    const warnings = reconnectHelper._getDisconnectWarnings(initialConfig, currentConfig)
    return warnings.length === 0 && currentConfig[connectedField] && currentConfig[connectedField] !== initialConfig[connectedField]
  },

  /**
   * opens reconnect prompt if reconnect is needed
   * @param {NetworkConfig} initialConfig initial network config before changes
   * @param {NetworkConfig} currentConfig current network config after changes
   * @returns {Promise}
   */
  _openReconnectPrompt(initialConfig, currentConfig) {
    const prompt = usePrompt()
    if (!reconnectHelper._shouldReconnect(initialConfig, currentConfig)) return Promise.resolve()
    return new Promise((resolve, reject) => {
      prompt.show({
        title: i18n.t('Are you sure?'),
        content: i18n.t('You will be reconnected to new IP address after confirming.'),
        cancelText: i18n.t('Cancel'),
        okText: i18n.t('Continue'),
        onOk: resolve,
        onCancel: reject
      })
    })
  }
}
