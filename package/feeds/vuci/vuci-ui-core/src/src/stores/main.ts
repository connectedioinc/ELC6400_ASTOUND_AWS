import { nextTick } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { fromStorage } from '@ui-core/plugins/helper'
import { axios } from '@ui-core/plugins/axios'
import { i18n } from '@ui-core/plugins/i18n'
import { session } from '@ui-core/plugins/session'
import { analytics } from '@/plugins/analytics'
import { useAlerts, useNotifications } from './messages'
import { isNull, isObject, isString } from '@ui-core/utils/inspect'
import type { ModemInfo } from '@/types/mobileTypes'
import type { PasswordPolicy } from '@/types/passwordPolicyTypes'
import type { MenuItem } from '@ui-core/types'

// TODO: This store should be split into more specific ones

type TODO = any

type SpinConfig = {
  /**
   * @description whether to show the cancel button at the bottom of the message or tip. On clicking the cancel button, all in progress requests with passed { cancelable: true } flag will be canceled via abort signal.
   * @default false
   */
  cancelButton: boolean
  /**
   * @description Spin message that will be shown right under the TIP message element
   */
  message?: string
  /**
   * @description Spin message that will be shown right under the spinning element
   * @default 'Loading...'
   */
  tip?: string
  /**
   * @description if set to true spinner will cover content with full opacity background color. (e.g. full white)
   */
  fullOpacity: boolean
  /**
   * @description the number of stacked spinners. When it's 0 - spinner is not shown.
   */
  spinning: number
  /**
   * @description Custom callback function to execute when the cancel button is clicked. This allows for additional actions beyond the default abort signal handling.
   */
  cancelAction: () => void
}

const initialSpinState = (): SpinConfig => ({
  spinning: 0,
  tip: undefined,
  message: undefined,
  cancelButton: false,
  fullOpacity: false,
  cancelAction: () => {}
})

export interface DeviceInfo {
  mnfinfo: TODO
  static: StaticDeviceInfo
  features: { ipv6: boolean }
  board: Board
  hwinfo: HwInfo
}

export interface SecurityBanner {
  title?: string
  message?: string
}

export interface StaticDeviceInfo {
  fw_version: string
  kernel: string
  system: string
  device_name: string
  hostname: string
  cpu_count: number
  release: {
    distribution: string
    revision: string
    version: string
    target: string
    description: string
  }
  fw_build_date: string
  model: string
  board_name: string
}

export interface Board {
  network: Network
  switch?: { switch0: Switch }
  hwinfo: HwInfo
  network_options?: NetworkOptions
  wlan?: {
    [key: `wlan${number}`]: { bssid_limit: number }
  }
  model: {
    id: string
    name: string
    platform: string
  }
  modems: ModemInfo[]
  serial: TODO
  usb_jack?: string
  port_security?: TODO
  poe?: Poe
  bridge?: {
    name: string
    macaddr: string
  }
  system: { label_macaddr: string }
  custom_proto?: string
  eol?: { date: string; replacement: string[] }
}

export interface Poe {
  budget: number
  bus: string
  chip_coint: string
  poe_chips: {
    address: string
    [key: `chain${number}`]: string
  }[]
  poe_ports: number
  ports: {
    budget: number
    class: string
    name: string
  }[]
}

export interface NetworkOptions {
  max_mtu: number
  readonly_vlans: number
  vlans: number
  vlan0?: boolean
}

export interface Network {
  lan?: {
    default_ip: string
    device?: string
    ports?: string[]
    proto: string
  }
  wan?: {
    device: string
    ports?: string[]
    proto: string
  }
  static?: {
    default_ip: string
    max_multicast_groups: string
    macaddr: string
    ports?: TswPort[]
    protocol: string
  }
}

export type TswPort = {
  block: string
  name: string
  num: string
  position: 'up' | 'down'
  type: 'eth' | 'sfp'
}

export interface Switch {
  enable: boolean
  ports: Array<SwitchDevice | SwitchPort>
  reset: boolean
  roles: SwitchRoles[]
}

export interface SwitchDevice {
  num: number
  device: string
  need_tag: boolean
  want_untag: boolean

  index: undefined
  role: undefined
}

export interface SwitchPort {
  num: number
  index: number
  role: 'lan' | 'wan'

  need_tag: undefined
  want_untag: undefined
  device: undefined
}

export interface SwitchRoles {
  device: string
  ports: string
  role: 'lan' | 'wan'
}

export interface HwInfo {
  esim: boolean
  modem_reset_quirk: boolean
  mt7981_wifi: boolean
  bacnet: boolean
  access_point: boolean
  boot_part: boolean
  sw_offload: boolean
  hi_storage: boolean
  sd_card: boolean
  downstream_kernel: boolean
  gigabit_port: boolean
  dot1x_client: boolean
  port_link: boolean
  ios: boolean
  baseband: boolean
  io: boolean
  ethernet: boolean
  hw_offload: boolean
  rs232: boolean
  power_control: boolean
  bluetooth: boolean
  '64mb_ram': boolean
  multi_device: boolean
  dsa: boolean
  mbus: boolean
  at_sim: boolean
  hnat: boolean
  usb: boolean
  micro_usb: boolean
  gateway: boolean
  poe: boolean
  sfp_port: boolean
  usb_port: boolean
  rs485: boolean
  wifi: boolean
  ntrip: boolean
  hw_nat: boolean
  modbus: boolean
  soft_port_mirror: boolean
  single_port: boolean
  dual_band_ssid: boolean
  '2_5_gigabit_port': boolean
  nat_offloading: boolean
  dual_modem: boolean
  console: boolean
  basic_router: boolean
  serial: boolean
  testing_kernel: boolean
  serial_reset_quirk: boolean
  guest_wifi: boolean
  tlt_failsafe_boot: boolean
  bt: boolean
  dual_sim: boolean
  gps: boolean
  bpoffload: boolean
  vendor_wifi: boolean
  qrtrpipes: boolean
  ncm: boolean
  smp: boolean
  rootfs_part: boolean
  verified_boot: boolean
  port_mirror: boolean
  mobile: boolean
  tpm: boolean
  pppmobile: boolean
  rndis: boolean
  high_watchdog_priority: boolean
  ledman_lite: boolean
  multi_tag: boolean
  switch?: boolean
  sfp_switch?: boolean
  industrial_access_point?: boolean
  'xfrm-offload'?: boolean
}

export const useMainStore = defineStore('main', {
  // null means - not loaded
  state: () => ({
    menus: [] as MenuItem[],
    subMenus: {} as Record<string, MenuItem[]>,
    packages: (fromStorage?.('packages') || []) as string[],
    lang: 'en',
    timeZone: null as string | null,
    firstLogin: null as boolean | null,
    passwordPolicy: {} as PasswordPolicy,
    eventSource: null as AbortController | null,
    spinner: initialSpinState(),
    device: '',
    securityBanner: {} as SecurityBanner,
    board: null as Board | null,
    deviceInfo: null as DeviceInfo | null,
    modalsOpen: 0,
    readOnlyPage: false,
    profile: null as TODO,
    routes: [] as TODO[],
    lanIP: null as TODO,
    collapsedMobileMenu: true,
    uploading: 0,
    formState: {
      loading: 0
    },
    overviewCards: [] as TODO[],
    fotaInfo: null as TODO,
    firmwareUpdateInfo: null as TODO,
    modemUpdateInfo: null as TODO,
    rerenderKey: 0,
    performanceTest: false,
    sessionTimeout: 1000 * 30,
    modemList: [] as ModemInfo[],
    showNewsletterNotification: useLocalStorage('showNewsletterNotification', true),
    username: null as string | null
  }),
  /**
   * Getters should be defined as arrow functions for better TypeScript type inference.
   * If getter needs access to other getters or state, it should be defined as a regular function.
   * Return type of non-arrow getter functions must be specified due to a TypeScript limitation.
   * More info: https://pinia.vuejs.org/core-concepts/getters.html
   */
  getters: {
    modalOpen: state => state.modalsOpen > 0,
    isSwitch: state => state.board?.hwinfo.switch || false,
    isAccessPoint: state => state.board?.hwinfo.access_point || false,
    isRouter(): boolean {
      return !(this.isSwitch || this.isAccessPoint)
    },
    formLoading: state => state.formState.loading > 0,
    loadPackages: state => state.packages.length === 0,
    anyPoe: state => !!state.board?.hwinfo.poe,
    anySfp: state => state.board?.network?.static?.ports?.some((port: TODO) => port.type === 'sfp') || false,
    firmwareUpdateAvailable: state => {
      if (!state.firmwareUpdateInfo || state.firmwareUpdateInfo === 'N/A') return false
      const version = state.fotaInfo?.latest === '0' ? state.firmwareUpdateInfo?.stable_version : state.firmwareUpdateInfo?.version
      return version && !['N/A', 'newest'].includes(version)
    },
    modemUpdateAvailable: state => Boolean(state.modemUpdateInfo && state.modemUpdateInfo !== 'N/A' && state.modemUpdateInfo?.some((modem: TODO) => modem.update_exists === '1')),
    wanPortDevices: (state): string[] => (state.board?.network.wan?.device ? [state.board?.network.wan?.device] : []),
    lanPortDevices: (state): string[] => (state.board?.network.lan?.device ? [state.board?.network.lan?.device] : (state.board?.network.lan?.ports ?? [])),
    /** Tsw ports */
    staticPorts: (state): string[] => state.board?.network.static?.ports?.map(port => port.name) ?? [],
    allPortDevices(): string[] {
      // all ports include tsw ports to be more universal so this function can be used on all devices
      return this.wanPortDevices.concat(this.lanPortDevices).concat(this.staticPorts)
    },
    renewPassword: state => state.passwordPolicy.current_days_left === '0' || state.firstLogin,
    hasSerial: state => {
      const hwinfo = state.board?.hwinfo
      return hwinfo?.usb || hwinfo?.rs232 || hwinfo?.rs485 || hwinfo?.console || false
    },
    hasWan: state => state.board?.network?.wan !== undefined
  },
  actions: {
    async loadMainData() {
      const notificationsStore = useNotifications()
      const alertsStore = useAlerts()

      const errors: string[] = []
      const error = (resource: string) => errors.push(i18n.t('Failed to load %s').format(resource))

      if (!Object.keys(this.passwordPolicy).length) {
        const passwordPolicyRes = await axios.get('/api/password_policy/config')
        if (!passwordPolicyRes.success) error(i18n.t('password policy data'))
        else if (passwordPolicyRes.data.length !== 0) this.passwordPolicy = { ...passwordPolicyRes.data[0] }
      }

      if (this.loadPackages) await axios.loadPackages()

      const access = !!(this.passwordPolicy.current_days_left !== '0' && this.firstLogin === false)
      const fotaCondition = !this.fotaInfo && session.hasAccess('system/flashops/general', 'read')

      const format = (endpoint: string, condition: boolean) => ({ endpoint, condition })
      const requests = [
        format('/api/system/config/general', isNull(this.firstLogin) || isNull(notificationsStore.enabled) || isNull(alertsStore.enabled)),
        format('/api/system/device/status', !this.board || !this.device),
        format('/api/date_time/ntp/client/config', !this.timeZone && access),
        format('/api/fota/config', fotaCondition && access),
        format('/api/dfota/config', fotaCondition && this.hasPackages('dfota.control') && access)
      ]

      if (!requests.some(r => r.condition)) return true

      if (!(await session.isAuthenticated())) {
        await session.logout()
        return false
      }

      const [adminRes, deviceRes, ntpRes, fotaRes, dfotaRes] = await axios.bulkGet(requests)

      if (!adminRes.success) error(i18n.t('device status'))
      else if (adminRes.data.length !== 0) {
        this.sessionTimeout = Number(adminRes.data.session_timeout) * 1000
        this.firstLogin = adminRes.data.firstlogin === '1'

        if (adminRes.data.data_analytics === '1') await analytics.enable()

        notificationsStore.enabled = adminRes.data.notifications_enabled === '1'
        alertsStore.enabled = adminRes.data.alerts_enabled === '1'
      }

      if (!deviceRes.success) error(i18n.t('system data'))
      else if (deviceRes.data.length !== 0) {
        this.setDeviceInfo(deviceRes.data)
        analytics.addData({ firmware: deviceRes.data.static.fw_version, device_name: this.device })
      }

      if (!ntpRes.success) error(i18n.t('device time zone'))
      else if (ntpRes.data.length !== 0) this.setTimeZone(ntpRes.data[0].zoneName)

      if (!fotaRes.success) error(i18n.t('device FOTA status'))
      else if (fotaRes.data.length !== 0) this.fotaInfo = fotaRes.data[0]

      if (!dfotaRes.success) error(i18n.t('device DFOTA status'))
      else if (dfotaRes.data.length !== 0) this.fotaInfo = { ...this.fotaInfo, notify_modem: dfotaRes.data[0].notify }

      return errors
    },
    /**
     * every flag by default is set to 'true',
     * meaning that every package is searchable[] must be in packages (&& operator),
     * otherwise it will look to match atleast one case (|| operator)
     */
    hasPackages(searchable: string | string[], every = true): boolean {
      if (Array.isArray(searchable)) {
        const method = every ? 'every' : 'some'
        return searchable[method](s => this.packages.some(pkg => pkg.includes(s)))
      }
      return this.packages.some(p => p.includes(searchable))
    },
    clearStore(spinnerReset: boolean = false) {
      this.eventSource?.abort()
      sessionStorage.removeItem('packages')
      const { lang, spinner, securityBanner } = this
      this.$reset()
      Object.assign(this, { lang, ...(!spinnerReset && { spinner }), securityBanner })
    },
    setPackages(packages: string[]) {
      this.packages = packages
      sessionStorage.setItem('packages', JSON.stringify(packages))
    },
    setDeviceInfo(info: TODO) {
      this.deviceInfo = info
      this.device = info.mnfinfo.name?.substring(0, 6)
      this.board = info.board
    },
    /**
     * @description if `config` is `false` - will reduce the ***`spinning`*** property by one
     *
     * if `config` is `string` - will increase ***`spinning`*** attribute and show the provided tip as string
     *
     * if `config` is `object` - will increase ***`spinning`*** attribute and configure spinner to show what's been configured to show.
     */
    spin(config?: Partial<Omit<SpinConfig, 'spinning'>> | false | string) {
      const delta = config === false ? -1 : 1
      const _spinning = this.spinner.spinning + delta
      this.spinner.spinning = _spinning < 0 ? 0 : _spinning
      if (this.spinner.spinning === 0) this.spinner = initialSpinState()
      else if (isString(config)) {
        this.spinner.tip = config
      } else if (isObject(config)) {
        this.spinner = {
          ...this.spinner,
          ...config
        }
      }
    },
    setDeviceName(name: string) {
      if (this.deviceInfo?.static) this.deviceInfo.static.device_name = name
    },
    openModal(modalState: boolean) {
      this.modalsOpen += modalState ? 1 : -1
      if (this.modalsOpen < 0) this.modalsOpen = 0
      if (this.modalsOpen > 0) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = ''
    },
    setFormLoading(loading: boolean) {
      if (loading) {
        this.formState.loading++
      } else {
        this.formState.loading > 0 ? this.formState.loading-- : (this.formState.loading = 0)
      }
    },
    setTimeZone(timeZone = 'UTC') {
      dayjs.tz.setDefault(timeZone)
      this.timeZone = timeZone
    },
    rerender() {
      this.spin()
      this.rerenderKey++
      nextTick(() => this.spin(false))
    },
    isPoe(portName: string) {
      return !!this.board?.poe?.ports?.some(port => port.name === (this.isSwitch ? `lan${portName?.match(/^port(\d+)$/)?.[1]}` : portName))
    },
    isSfp(portName: string) {
      return !!this.board?.network?.static?.ports?.some(port => port.name === portName && port.type === 'sfp')
    }
  }
})
