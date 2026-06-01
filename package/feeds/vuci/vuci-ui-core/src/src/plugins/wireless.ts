import { i18n } from '@ui-core/plugins/i18n'
import { utils } from './utils'
import { useMainStore } from '@/stores/main'
import type { WifiInterface, WifiInterfaceStatus } from '@/types/wirelessTypes'
import type { Interface } from '@/types/networkTypes'
import type { App } from 'vue'
import type { Props as HintHelperProps } from '@/components/shared/HintHelper.vue'

export interface SsidCountError {
  radioId: string
  band: string
  /** allowed number of ssid */
  limit: number
}

type ValidationReturn = { isValid: true; valid: true } | { valid: false; isValid: false; message: string }

export const wireless = {
  getGHz(hwmode: string): '2.4GHz' | '5GHz' | '' {
    if (hwmode === '11g') return '2.4GHz'
    else if (hwmode === '11a') return '5GHz'
    else return ''
  },
  /** Convert mode in human readable format */
  getMode(mode?: string): string {
    const modes: Record<string, string> = {
      ap: i18n.t('Access Point'),
      sta: i18n.t('Client'),
      adhoc: i18n.t('Ad-Hoc'),
      mesh: i18n.t('Mesh'),
      monitor: i18n.t('Monitor'),
      multi_ap: i18n.t('Multi AP')
    }
    if (mode) return modes[mode] ?? mode
    return '-'
  },
  getName(config: WifiInterface | Partial<WifiInterfaceStatus>): string {
    if (config?.mode === 'mesh') return config?.mesh_id || '-'
    return config?.mode === 'multi_ap' ? i18n.t('Multi AP') : config?.ssid || '-'
  },
  getRadioHelp(): HintHelperProps {
    return {
      mainHint: i18n.t('SSID will use these radios. Use one of them if you want seperate SSIDs for each radio or use all of them if you want combined SSID.'),
      hints: [
        {
          option: '2.4GHz',
          hint: i18n.t('Provides better coverage and works at a longer range, but has lower data transfer speeds when compared to 5 GHz.')
        },
        {
          option: '5GHz',
          hint: i18n.t('Provides higher data transfer speeds but has a smaller area coverage than 2.4 GHz.')
        }
      ]
    }
  },
  allRadios(): string[] {
    const store = useMainStore()
    return Object.keys(store.board!.wlan!).map(wlan => `radio${wlan.substring(4, 5)}`)
  },
  getAllRadioMaxSsid(): number[] {
    const store = useMainStore()
    return Object.values(store.board!.wlan!).map(radio => radio.bssid_limit)
  },
  deviceBands(): Record<string, string> {
    return {
      radio0: '2.4GHz',
      radio1: '5GHz'
    }
  },
  radioOptions(): [string, string][] {
    return this.allRadios().map(device => [device, this.deviceBands()[device]])
  },
  /**
   * @param section - current section if editing or undefined if creating new
   */
  validateRadios(wifiInterfaces: WifiInterface[], radios?: string[], section?: WifiInterface, failOnOne = false): ValidationReturn {
    radios = radios ?? this.allRadios()
    const message = i18n.t('A maximum number of %s interfaces on %s radio is allowed.')
    const errors = this.getSsidCountErrors(wifiInterfaces, radios, undefined, this.getAllRadioMaxSsid(), section?.id)
    if (failOnOne ? errors.length < 1 : radios.length > errors.length) return { isValid: true, valid: true }
    return { valid: false, isValid: false, message: errors.map(error => message.format(error.limit, error.band)).join(' ') }
  },
  /** Get error if there is two many ssids in radio */
  getSsidCountErrors(wifiInterfaces: WifiInterface[], testRadios: string[], modes?: string[], maxCount?: number | number[], id?: string): SsidCountError[] {
    return this.radioOptions()
      .map<SsidCountError | null>(([radioId, band], index) => {
        if (!testRadios.includes(radioId)) return null
        const current = wifiInterfaces.reduce((count, wifi) => {
          const isFilteredByMode = !modes || modes.includes(wifi.mode ?? 'ap')
          const isFilteredByRadio = !wifi.device || wifi.device.includes(radioId)
          return count + (wifi.id !== id && isFilteredByMode && isFilteredByRadio ? 1 : 0)
        }, 0)
        const limit = (Array.isArray(maxCount) ? maxCount[index] : maxCount) ?? 1
        return current >= limit ? { radioId, band, limit } : null
      })
      .filter(utils.notEmpty)
  },
  /**
   * @param section - current section if editing or undefined if creating new
   * @param skipNonClients - if false any mode will be validated if true only sta will not be skipped
   */
  validateClient(wifiInterfaces: WifiInterface[], radios?: string[], section?: WifiInterface, skipNonClients = true): ValidationReturn {
    radios = radios ?? this.allRadios()
    if (section !== undefined && section.mode !== 'sta' && skipNonClients) return { valid: true, isValid: true }
    const message = i18n.t('%s radio(s) already have one client or Multi AP. To specify few possible APs for client use single Multi AP.')
    const errors = this.getSsidCountErrors(wifiInterfaces, radios, ['sta', 'multi_ap'], 1, section?.id)
    if (errors.length < 1) return { valid: true, isValid: true }
    return { valid: false, isValid: false, message: message.format(errors.map(error => error.band).join(', ')) }
  },
  /**
   * @param current section if editing or undefined if creating new
   */
  validateMultiAP(wifiInterfaces: WifiInterface[], radios: string[], section: WifiInterface) {
    if (section !== undefined && section.mode !== 'multi_ap') return { valid: true, isValid: true }
    if (wifiInterfaces.every(wifi => wifi.mode !== 'multi_ap' || wifi.id === section?.id)) return this.validateClient(wifiInterfaces, radios, section, false)
    else return { valid: false, isValid: false, message: i18n.t('There is already one Multi AP created.') }
  },
  getParsedClients(iface: WifiInterfaceStatus) {
    if (iface.mode === 'mesh') {
      return Object.entries(iface.assoclist ?? {}).map(([macaddr, { tx_rate, rx_rate, signal, device }]) => {
        return utils.valueOrBlankObject({
          band: wireless.deviceBands()[device],
          ssid: iface.mesh_id,
          macaddr,
          signal: `${signal} dBm`,
          tx_rate: '%.0mbit/s'.format(tx_rate),
          rx_rate: '%.0mbit/s'.format(rx_rate),
          expires: undefined,
          hostname: undefined,
          ipaddr: undefined
        })
      })
    }
    return (
      iface.clients?.filter(utils.notEmpty).map(client =>
        utils.valueOrBlankObject({
          expires: undefined,
          ipaddr: undefined,
          ...client,
          hostname: client.hostname && client.username ? `${client.hostname} (${client.username})` : client.hostname || undefined,
          ssid: client.username ? `${iface.ssid} (${client.network})` : client.vid ? `${iface.ssid} (VLAN ID: ${client.vid})` : iface.ssid,
          tx_rate: '%.0mbit/s'.format(client.tx_rate),
          rx_rate: '%.0mbit/s'.format(client.rx_rate)
        })
      ) ?? []
    )
  },
  getAutoNetworkName(options: string[]): string {
    let index = 0
    let name = `wifi${index}`
    while (options.includes(name)) {
      index++
      name = `wifi${index}`
    }
    return name
  },
  getAvailableNetworks(ifaceConfigs: Interface[]): string[][] {
    const store = useMainStore()
    const bridgedIfaces = ifaceConfigs.filter(iface => iface.bridge === '1').map(iface => [iface.name, iface.name])
    if (store.board?.hwinfo.dsa) {
      const vlanIfaces = ifaceConfigs.filter(iface => iface.device && iface.device.match(/^[\w-]+\.\d+$/)).map(iface => [iface.name, `${iface.name} (VLAN ID: ${iface.device!.split('.')[1]})`])
      return [...bridgedIfaces, ...vlanIfaces]
    }
    return bridgedIfaces
  },
  getRadioUseOptions() {
    return [
      { value: 'any', name: i18n.t('Indoor') },
      { value: 'outdoor', name: i18n.t('Outdoor') }
    ]
  }
}

export default {
  install(app: App) {
    app.config.globalProperties.$wireless = wireless
  }
}
