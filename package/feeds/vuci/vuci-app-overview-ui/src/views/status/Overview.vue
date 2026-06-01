<template>
  <tlt-dnd
    v-slot="{ items, startDrag }"
    :items="sortedArray.filter(c => c.enabled === '1')"
    direction="both"
    class="grid grid-cols-fit-64 md:grid-cols-fit-96 gap-4 lg:gap-6"
    drag-class="border-theme-border-primary! shadow-lg"
    :disabled="disabled"
    placeholder-class="opacity-50"
    @drag-end="handleUpdateCards"
  >
    <tlt-overview-card-type
      v-for="(item, index) in items"
      :key="`${item.id}-${index}`"
      :widget="item.content"
      :item="item"
      :disabled="disabled"
      draggable
      @start-drag="startDrag($event, index)"
      @show-modal="simCardUnblock"
    />
  </tlt-dnd>
  <sim-card-unblock
    :id="modalId"
    :open="showModal"
    :type="modalType"
    @close="showModal = false"
  />
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { formBus } from '@ui-core/vuci-form'
import { rms } from '@/utils/rms'
import { loadComponent } from '@/components/package_components/conditional.js'
import { parse as parsePorts } from './portDeviceParser'
import { isArray } from '@ui-core/utils/inspect.ts'
import { mwan } from '@/plugins/mwan'

export default {
  components: {
    SimCardUnblock: loadComponent('vuci-app-mobile-ui', 'SimCardUnblock')
  },
  layout: 'none',
  data() {
    return {
      widgets: {
        widgets_system: {},
        widgets_modems: {},
        widgets_wireless: {},
        widgets_hotspot: {},
        widgets_interfaces: {},
        widgets_data_limit: {},
        widgets_sms_limit: {},
        widgets_vrrp: {},
        widgets_openvpn: {},
        widgets_rms: {},
        widgets_system_events: {},
        widgets_network_events: {},
        widgets_access_control: {},
        widgets_failover: {},
        widgets_internet: {}
      },
      overview: [],
      cards: [],
      modems: [],
      statusStarted: false,
      wirelessStarted: false,
      wirelessStatus: [],
      interfaceStatus: [],
      offlineModems: [],
      showModal: false,
      modalId: '',
      modalType: 1,
      updatedCards: [],
      lockedDataBase: false,
      firstLoad: true,
      sideMessageTxt: this.$t('Events Log could not be accessed because the database is being optimized. This process can take up to five minutes.')
    }
  },
  timers: {
    getStatusData: { time: 5000, autostart: false, immediate: true, repeat: true },
    getWirelessStatus: { time: 5000, autostart: false, immediate: true, repeat: true },
    updateOverview: { time: 1000, repeat: false }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    disabled() {
      return !this.$session.hasAccess('status/overview', 'write')
    },
    enabledCardMWan() {
      return this.$store.hasPackages('/mwan3.control') && this.cards.some(c => c.id === 'failover_priority' && c.enabled === '1')
    },
    enabledCardDataLimit() {
      return this.$store.hasPackages(['quota_limit.control', 'mobifd.control']) && (this.cards.some(c => c.id === 'mobile_data_limit' && c.enabled === '1') || this.enabledCardModems)
    },
    enabledCardInternet() {
      return this.$store.hasPackages('connchecker.control') && this.cards.some(c => c.id === 'connchecker' && c.enabled === '1')
    },
    enabledCardAccessControl() {
      return this.cards.some(c => c.id === 'access_control' && c.enabled === '1')
    },
    enabledCardRMS() {
      return this.$store.hasPackages('rms_mqtt.control') && this.cards.some(c => c.id === 'monitoring' && c.enabled === '1' && !!this.$menu.findMenuItem('/services/cloud_solutions/rms'))
    },
    enabledCardHotspot() {
      return this.$store.hasPackages('coova-chilli.control') && this.cards.some(c => c.id === 'hotspot' && c.enabled === '1')
    },
    enabledCardVrrp() {
      return this.$store.hasPackages('vrrpd.control') && this.cards.some(c => c.id === 'vrrp' && c.enabled === '1')
    },
    enabledCardOpenVPN() {
      return this.$store.hasPackages('vuci-app-openvpn-api.control') && this.cards.some(c => c.id === 'open_vpn' && c.enabled === '1')
    },
    enabledCardSystem() {
      return this.cards.some(c => c.id === 'system' && c.enabled === '1')
    },
    enabledCardModems() {
      return this.$store.hasPackages('mobifd.control') && this.cards.some(c => c.id === 'mobile' && c.enabled === '1')
    },
    enabledCardWireless() {
      return this.$store.board.hwinfo.wifi && (this.cards.some(c => c.id === 'wireless' && c.enabled === '1') || this.enabledCardInterfaces)
    },
    enabledCardInterfaces() {
      return this.cards.some(c => c.id === 'interface' && c.enabled === '1')
    },
    enabledCardFailover() {
      return this.cards.some(c => c.id === 'failover_priority' && c.enabled === '1')
    },
    enabledCardSystemLog() {
      return this.cards.some(c => c.id === 'system_events' && c.enabled === '1')
    },
    enabledCardNetworkLog() {
      return this.cards.some(c => c.id === 'network_events' && c.enabled === '1')
    },
    sortedArray() {
      return this.cards.slice(0).sort((a, b) => a.position - b.position)
    }
  },
  watch: {
    sortedArray(value) {
      this.$store.overviewCards = value
    }
  },
  async mounted() {
    if (this.$store.renewPassword) return
    formBus.on('update-overview', this.handleUpdateCards)
    this.$spin()
    const res = await Promise.race([this.initOverview(), this.timeout(15000, false)])
    if (!res) this.$message.info(this.$t('Loading overview data is taking longer than expected'))
    this.$spin(false)
  },
  unmounted() {
    formBus.off('update-overview', this.handleUpdateCards)
  },
  methods: {
    /**
     * @template T
     * @param {number} ms - number of miliseconds to sleep before resolving
     * @param {T} [returnable] - what should timeout return after provided time has passed.
     * @returns {T|null} returns what was passed as returnable or null if not provided
     */
    timeout(ms, returnable) {
      return new Promise(resolve => setTimeout(() => resolve(returnable ?? null), ms))
    },
    async initOverview() {
      try {
        await this.$axios.get('/api/modems/status', { condition: 'mobifd.control' }).then(({ data }) => {
          this.modems = data
        })
        return await this.$axios.get('/api/overview/config').then(({ data }) => {
          const sections = data
          sections.forEach(section => this.overview.push(section))
          this.createEmptyCards(sections)
          this.overview.forEach(overview => {
            for (const key in this.widgets) {
              this.widgets[key].length &&
                this.widgets[key].forEach(widget => {
                  if ((overview.section_name && overview.card_id === widget.id && overview.section_name === widget.sectionName) || overview.card_id === widget.sectionName) {
                    this.cards.push({
                      id: overview.card_id,
                      sectionName: widget.sectionName,
                      position: overview.position,
                      enabled: overview.enabled,
                      content: widget
                    })
                  }
                })
            }
          })
          this.widgets.widgets_modems = this.parseModemsData(this.modems)
          this.updateCards()
          this.$timer.start('getStatusData')
          this.$timer.start('getWirelessStatus')
          return true
        })
      } catch (e) {
        await this.timeout(3000)
        return this.$route.fullPath.includes('/status/overview') ? this.initOverview() : false
      }
    },
    async getStatusData() {
      if (this.statusStarted) return
      const board = this.$store.board || {}
      this.statusStarted = true
      // request offset to not request right after it's finished
      if (!this.firstLoad) await this.timeout(3000)
      const endpoints = [
        {
          endpoint: `${this.firstLoad ? '/api/system/device/usage/status?exclude=loadavg' : '/api/system/device/usage/status'}`,
          condition: this.enabledCardSystem
        },
        {
          endpoint: '/api/modems/status',
          condition: this.enabledCardModems
        },
        {
          endpoint: '/api/sim_cards/status',
          condition: this.enabledCardModems
        },
        {
          endpoint: '/api/modems/apns/status',
          condition: this.$store.hasPackages('mobifd.control') && this.enabledCardInterfaces
        },
        {
          endpoint: '/api/interfaces/basic/status?include=vpn',
          condition: this.enabledCardInterfaces || this.enabledCardModems || this.enabledCardMWan
        },
        {
          endpoint: '/api/interfaces/config',
          condition: this.enabledCardInterfaces || this.enabledCardDataLimit
        },
        {
          endpoint: '/api/basic/network/devices/bridge/status',
          condition: this.enabledCardInterfaces
        },
        {
          endpoint: '/api/internet_connection/status',
          condition: this.enabledCardInternet
        },
        {
          endpoint: '/api/data_limit/status',
          condition: this.enabledCardDataLimit
        },
        {
          endpoint: '/api/failover/interfaces/config',
          condition: this.enabledCardMWan
        },
        {
          endpoint: '/api/failover/policies/config',
          condition: this.enabledCardMWan
        },
        {
          endpoint: '/api/failover/mode/config/globals',
          condition: this.enabledCardMWan
        },
        {
          endpoint: '/api/failover/members/config',
          condition: this.enabledCardMWan
        },
        {
          endpoint: '/api/failover/basic/status',
          condition: this.enabledCardMWan
        },
        {
          endpoint: '/api/port_based_vlan/config',
          condition: this.enabledCardInterfaces && (!!board?.switch || !!board?.hwinfo?.dsa) && board.model.platform !== 'X86_64'
        },
        {
          endpoint: '/api/interface_based_vlan/config',
          condition: this.enabledCardInterfaces
        },
        {
          endpoint: '/api/interface_based_vlan/devices/status',
          condition: this.enabledCardInterfaces
        },
        {
          endpoint: '/api/rms/status',
          condition: this.enabledCardRMS
        },
        {
          endpoint: '/api/access_control/webui/status',
          condition: this.enabledCardAccessControl
        },
        {
          endpoint: '/api/hotspot/status',
          condition: this.enabledCardHotspot
        },
        {
          endpoint: '/api/vrrp/status',
          condition: this.enabledCardVrrp
        },
        {
          endpoint: '/api/vrrp/config',
          condition: this.enabledCardVrrp
        },
        {
          endpoint: '/api/openvpn/status',
          condition: this.enabledCardOpenVPN
        },
        {
          endpoint: '/api/events_log/config/system?limit=5',
          condition: this.enabledCardSystemLog
        },
        {
          endpoint: '/api/events_log/config/network?limit=5',
          condition: this.enabledCardNetworkLog
        }
      ]
      return this.$axios
        .bulkGet(endpoints)
        .then(
          ([
            deviceStatus,
            mobileStatus,
            simcardsStatus,
            apnsStatus,
            interfacesStatus,
            interfacesConfig,
            bridgeStatus,
            internetStatus,
            dataLimitStatus,
            mwan3config,
            mwan3policies,
            mwan3mode,
            mwan3members,
            mwan3status,
            portBasedConfig,
            ifaceBasedConfig,
            ifaceBasedDevices,
            rmsStatus,
            accessStatus,
            hotspotStatus,
            vrrpStatus,
            vrrpConfig,
            openvpnStatus,
            logSystem,
            logNetwork
          ]) => {
            if (logNetwork.errors?.some(i => i.code === 1)) {
              this.lockedDataBase = true
              this.widgets.widgets_system_events = []
              this.$notification.error(this.sideMessageTxt)
            }
            if (logSystem.success) {
              this.widgets.widgets_system_events = this.parseSystemEventData(logSystem.data)
              this.lockedDataBase = false
              this.$notification.remove(this.sideMessageTxt)
            } else if (!logSystem.errors.some(error => error.code !== 1)) {
              if (!this.lockedDataBase) this.$message.error(this.$t('Failed to load system events'))
              this.widgets.widgets_system_events = []
            }
            if (logNetwork.success) {
              this.lockedDataBase = false
              this.$notification.remove(this.sideMessageTxt)
              this.widgets.widgets_network_events = this.parseNetworkEventData(logNetwork.data)
            } else if (!logNetwork.errors.some(error => error.code !== 1)) {
              if (!this.lockedDataBase) this.$message.error(this.$t('Failed to load network events'))
              this.widgets.widgets_network_events = []
            }
            if (deviceStatus.success && this.$store.deviceInfo) {
              deviceStatus.data.fw_version = this.$store.deviceInfo.static.fw_version
              this.widgets.widgets_system = this.parseSystemData(deviceStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load system data'))
              this.widgets.widgets_system = []
            }
            if (mobileStatus.success && simcardsStatus.success && dataLimitStatus.success) {
              mobileStatus.data.forEach(mobile => {
                const index = simcardsStatus.data.findIndex(status => mobile.id === status.modem && mobile.active_sim === Number(status.sim) && status.primary === '1')
                if (index > -1) {
                  mobile.simsection = simcardsStatus.data[index].section_name
                  mobile.deny_roaming = simcardsStatus.data[index].deny_roaming
                }
                if (
                  dataLimitStatus.data?.some(
                    limit =>
                      /** @type {import('@/types/networkTypes').InterfaceStatus[]} */ (interfacesStatus.data)?.some(iface => mobile.id === iface.modem_id && iface.id === limit.id && iface.up) &&
                      limit.data_used >= limit.data_limit
                  )
                ) {
                  mobile.datalimit = true
                }
              })
              this.widgets.widgets_modems = this.parseModemsData(mobileStatus.data)
              this.widgets.widgets_sms_limit = this.parseSmsLimitData(simcardsStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load mobile data'))
              this.widgets.widgets_modems = []
              this.widgets.widgets_sms_limit = []
            }
            if (
              interfacesStatus.success &&
              interfacesConfig.success &&
              portBasedConfig.success &&
              ifaceBasedConfig.success &&
              ifaceBasedDevices.success &&
              apnsStatus.success &&
              bridgeStatus.success
            ) {
              this.widgets.widgets_interfaces = this.parseInterfacesData(
                interfacesStatus.data,
                interfacesConfig.data,
                portBasedConfig.data,
                ifaceBasedConfig.data,
                ifaceBasedDevices.data,
                apnsStatus.data,
                bridgeStatus.data
              )
              this.interfaceStatus = interfacesStatus.data
            } else {
              this.$message.error(this.$t('Failed to load interfaces status'))
              this.widgets.widgets_interfaces = []
            }
            if (mwan3status.success && mwan3mode.success && mwan3config.success && mwan3members.success && interfacesStatus.success) {
              this.widgets.widgets_failover = this.parseFailover(mwan3config.data, mwan3policies.data, mwan3mode.data, mwan3members.data, mwan3status.data, interfacesStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load failover status'))
              this.widgets.widgets_failover = []
            }
            if (internetStatus.success) {
              this.widgets.widgets_internet = this.parseInternet(internetStatus.data)
            } else {
              this.widgets.widgets_internet = []
            }
            if (interfacesConfig.success && dataLimitStatus.success) {
              this.widgets.widgets_data_limit = this.parseDataLimitData(interfacesConfig.data, dataLimitStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load data limit status'))
              this.widgets.widgets_data_limit = []
            }
            if (rmsStatus.success) {
              this.widgets.widgets_rms = this.parseRmsData(rmsStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load RMS data'))
              this.widgets.widgets_rms = []
            }
            const data = {
              lan: [],
              wan: []
            }
            if (accessStatus.success) {
              data.lan = Object.keys(accessStatus.data).filter(key => accessStatus.data[key]?.lan === true)
              data.wan = Object.keys(accessStatus.data).filter(key => accessStatus.data[key]?.wan === true)
            }
            data.fullData = accessStatus.data
            this.widgets.widgets_access_control = this.parseAccessControlData(data)
            if (hotspotStatus.success) {
              this.widgets.widgets_hotspot = this.parseHotspotData(hotspotStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load Hotspot status'))
              this.widgets.widgets_hotspot = []
            }
            if (vrrpStatus.success && vrrpConfig.success) {
              this.widgets.widgets_vrrp = this.parseVrrpData(vrrpStatus.data, vrrpConfig.data)
            } else {
              this.$message.error(this.$t('Failed to load VRRP status'))
              this.widgets.widgets_vrrp = []
            }
            if (openvpnStatus.success) {
              this.widgets.widgets_openvpn = this.parseOpenvpnData(openvpnStatus.data)
            } else {
              this.$message.error(this.$t('Failed to load OpenVPN status'))
              this.widgets.widgets_openvpn = []
            }
          }
        )
        .catch(err => {
          // Do not show errors when failed because of bulk too many requests
          if (err?.response?.data?.errors[0].code === 122) return
          this.$message.error(this.$t('An unexpected error occurred'))
          this.widgets.widgets_rms = []
          this.widgets.widgets_modems = []
        })
        .finally(() => {
          this.firstLoad = false
          this.statusStarted = false
          this.updateCards()
        })
    },
    /**
     * iwinfo hangs when there is a lot of wireless clients, so wireless status is requested separately
     */
    getWirelessStatus() {
      if (this.wirelessStarted || !this.enabledCardWireless) return
      this.wirelessStarted = true
      return this.$axios
        .bulkGet([
          { endpoint: '/api/wireless/interfaces/basic/status', condition: this.enabledCardWireless },
          { endpoint: '/api/wireless/interfaces/config', condition: this.enabledCardWireless }
        ])
        .then(([wifiStatus, wifiConfig]) => {
          this.widgets.widgets_wireless = this.parseWirelessData(wifiStatus.data, wifiConfig.data)
          this.wirelessStatus = wifiStatus.data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get wireless status'))
        })
        .finally(() => {
          this.wirelessStarted = false
          this.updateCards()
        })
    },
    handleUpdateCards(cards) {
      cards.forEach((card, index) => (card.position = String(index)))
      this.updatedCards = cards
      this.$timer.restart('updateOverview')
    },
    updateOverview() {
      const cardsArray = this.updatedCards || this.sortedArray
      return this.$axios.get('/api/overview/config').then(({ data }) => {
        const sendData = data.flatMap(section => {
          const found = cardsArray.find(sorted => section.card_id === sorted.id && (section.card_id === sorted.sectionName || sorted.sectionName === section.section_name))
          if (found) return { id: section.id, position: found.position, enabled: found.enabled }
          return []
        })
        if (sendData.length) {
          return this.$axios.put('/api/overview/config', { data: sendData }).catch(() => {
            this.$message.error(this.$t('Failed to update Overview cards'))
          })
        }
      })
    },
    updateCards() {
      let index = 0
      this.overview.forEach(overview => {
        for (const key in this.widgets) {
          this.widgets[key].length &&
            this.widgets[key].forEach(widget => {
              if (overview.section_name && overview.card_id === widget.id && overview.section_name === widget.sectionName) {
                const filtered = element => element.sectionName === widget.sectionName && element.id === widget.id
                index = this.cards.findIndex(filtered)
                if (index >= 0) {
                  this.cards[index].content = widget
                }
              }
              if (overview.card_id === widget.sectionName) {
                const filtered = element => element.sectionName === widget.sectionName
                index = this.cards.findIndex(filtered)
                if (index >= 0) {
                  this.cards[index].content = widget
                }
              }
            })
        }
      })
    },
    createFakeData(overview, value, key) {
      const data = []
      let filtered = overview.filter(widget => widget.card_id === key)
      if (key === 'interface') {
        for (let e = 0; e < value; e++) {
          data.push({
            sectionName: filtered[e].section_name
          })
        }
      } else if (key === 'sms_limit_sim1') {
        filtered = overview.filter(widget => widget.card_id.includes('sms_limit_sim'))
        for (let t = 0; t < value; t++) {
          data.push({
            sectionName: filtered[t].section_name,
            id: filtered[t].card_id
          })
        }
      } else if (key === 'wireless') {
        for (let q = 0; q < value; q++) {
          data.push({
            sectionName: filtered[q].section_name
          })
        }
      } else if (key === 'mobile') {
        for (let q = 0; q < value; q++) {
          data.push({
            id: filtered[q].section_name,
            name: 'Unknown modem',
            builtin: true
          })
        }
      } else {
        for (let i = 0; i < value; i++) {
          data.push({ sectionName: filtered[i].section_name })
        }
      }
      return data
    },
    createEmptyCards(overview) {
      const overviewTypes = []
      overview.forEach(overview => {
        overviewTypes.push(overview.card_id)
      })
      const overviewCards = new Map([...new Set(overviewTypes)].map(x => [x, overviewTypes.filter(y => y === x).length]))
      overviewCards.forEach((value, key) => {
        if (key !== 'sms_limit_sim1' && key.includes('sms_limit_sim')) {
          overviewCards.set('sms_limit_sim1', overviewCards.get('sms_limit_sim1') + value)
          overviewCards.delete(key)
        }
      })
      overviewCards.forEach((value, key) => {
        let data = []
        data = this.createFakeData(overview, value, key)
        switch (key) {
          case 'system':
            this.widgets.widgets_system = this.parseSystemData(data)
            break
          case 'mobile':
            this.widgets.widgets_modems = this.parseModemsData(data)
            break
          case 'wireless':
            this.widgets.widgets_wireless = this.parseWirelessData(data)
            break
          case 'hotspot':
            this.widgets.widgets_hotspot = this.parseHotspotData(data)
            break
          case 'interface':
            this.widgets.widgets_interfaces = this.parseInterfacesData(data, [], [], [], [], [], [])
            break
          case 'mobile_data_limit':
            if (this.$store.hasPackages('mdcollectd.control')) this.widgets.widgets_data_limit = this.parseDataLimitData(data)
            break
          case 'sms_limit_sim1':
            this.widgets.widgets_sms_limit = this.parseSmsLimitData(data)
            break
          case 'vrrp':
            this.widgets.widgets_vrrp = this.parseVrrpData(data, [])
            break
          case 'open_vpn':
            this.widgets.widgets_openvpn = this.parseOpenvpnData(data)
            break
          case 'monitoring':
            this.widgets.widgets_rms = this.parseRmsData(data)
            break
          case 'system_events':
            this.widgets.widgets_system_events = this.parseSystemEventData(data)
            break
          case 'network_events':
            this.widgets.widgets_network_events = this.parseNetworkEventData(data)
            break
          case 'access_control':
            this.widgets.widgets_access_control = this.parseAccessControlData(data)
            break
          case 'failover_priority':
            this.widgets.widgets_failover = this.parseFailover([], [], {}, [], {})
            break
          case 'connchecker':
            this.widgets.widgets_internet = this.parseInternet(data)
            break
        }
      })
    },
    parseSystemData(data) {
      const parsedContent = []
      const parsedData = []
      parsedData.push({
        title: this.$t('Device uptime'),
        info: data.uptime || '-',
        name: 'device-uptime'
      })
      parsedData.push({
        title: this.$t('Local device time'),
        info: data.localtime ? this.$localDate(data.localtime) : '-',
        name: 'local-device-time'
      })
      const usageData = []
      usageData.push({
        name: this.$t('RAM'),
        percents: parseFloat(data.memory?.ram_percentage) || 0,
        title: 'ram'
      })
      usageData.push({
        name: this.$t('FLASH'),
        percents: parseFloat(data.memory?.flash_percentage) || 0,
        title: 'flash'
      })
      parsedData.push({
        title: this.$t('Memory usage'),
        info: usageData,
        name: 'memory-usage'
      })
      parsedData.push({
        title: this.$t('Firmware version'),
        info: data.fw_version || '-',
        name: 'firmware-version'
      })
      const headerItem = []
      headerItem.push({
        title: this.$t('CPU load'),
        info: parseFloat(parseFloat(data.loadavg) * 100) || (this.firstLoad ? 40 : 0)
      })
      const hints = []
      hints.push({
        used: parseFloat(data.memory?.ram_used) || 0,
        total: parseFloat(data.memory?.ram_total) || 0,
        free: parseFloat(data.memory?.ram_free || 0)
      })
      hints.push({
        used: parseFloat(data.memory?.flash_used) || 0,
        total: parseFloat(data.memory?.flash_total) || 0,
        free: parseFloat(data.memory?.flash_free || 0)
      })
      parsedContent.push({
        title: this.$t('System'),
        statusPath: { to: '/status/system', readonly: !this.$session.hasAccess('status/system', 'read') },
        content: parsedData,
        hints,
        headerItem,
        type: 'system',
        sectionName: 'system',
        id: 'system'
      })
      return parsedContent
    },
    parseModemsData(data) {
      this.offlineModems = []
      const parsedContent = []
      const translatedData = this.$mobile.parseModems(data)
      translatedData.forEach(info => {
        const parsedData = []
        parsedData.push({
          title: this.$t('Data connection'),
          info: this.$mobile.getDataConnState(info.data_conn_state),
          name: 'data-connection'
        })
        parsedData.push({
          title: this.$t('State'),
          info: info.operator_state ? `${this.$mobile.getOperatorState(info.operator_state)}; ${info.operator}; ${this.$mobile.getConntype(info.conntype)}` : '-',
          name: 'state'
        })
        if (['Inserted', 'Not inserted', 'SIM not inserted'].some(e => info.pinstate?.includes(e))) {
          this.$alert.remove({ id: 'simcard_%s'.format(info.id) })
          this.$notification.remove({ id: 'simcard_%s'.format(info.id) })
        }
        const unblock = this.$mobile.shouldAllowSimUnblock(info)
        const unlock = this.$mobile.shouldAllowSimUnlock(info)

        const simSwitch =
          info.active_sim && info.sim_switch_enabled
            ? { hint: this.$t('The default SIM and active SIM can be different because SIM switch is enabled.'), path: `/network/mobile/sim_switch/${info.id}` }
            : false

        info.active_sim = this.$mobile.getSimLabel(info.active_sim, info.esim_profile, info.id, true)
        parsedData.push({
          title: this.$t('SIM card info'),
          info: info.pinstate ? 'SIM%s - %s'.format(info.active_sim, this.$mobile.getSimstate(info, true)) : '-',
          name: 'sim-card-info',
          unblock,
          unlock,
          simSwitch
        })
        if (this.$store.hasPackages('mdcollectd.control')) {
          parsedData.push({
            title: this.$t('Data received / sent'),
            info:
              this.convert(info.rxbytes || 0, 1000)
                .concat(' / ')
                .concat(this.convert(info.txbytes || 0, 1000)) || '-',
            name: 'data-received-sent'
          })
        }
        let editable = true
        const state = this.$mobile.getBlockedText(info)
        if (this.$mobile.modemOffline(info)) {
          this.offlineModems.push(info.id)
          info.rssi = '-'
          editable = false
        }
        if (!editable && info.disabled !== '1') this.$notification.error({ id: 'modem_%s'.format(info.id), text: this.$t('%s is %s').format(info.name, state) })
        else this.$notification.remove({ id: 'modem_%s'.format(info.id) })

        const hints = []
        if (info.data_off) hints.push({ info: this.$t('Mobile data is turned off by an external application') })
        if (info.deny_roaming === '1' && info.operator_state.toLowerCase() === 'roaming')
          hints.push({ info: this.$t('Mobile data is not allowed when roaming. To allow data, go to'), to: `/network/mobile/general/${info.id}`, toText: this.$t('Mobile -> General') })
        if (info.datalimit) hints.push({ info: this.$t('Mobile data limit reached. To change or reset limit, go to'), to: '/network/mobile/limits/data', toText: this.$t('Mobile -> Limits') })
        if (this.$mobile.getGnssState(info)) hints.push({ info: this.$t('Mobile data is not working because the GPS is on') })
        if (info.mobile_stage === 23) {
          hints.push({
            info: this.$t('Mobile data is turned off because flight mode is on. To turn off flight mode, go to'),
            to: `/network/mobile/utilities?tab=${info.id}`,
            toText: this.$t('Mobile -> Utilities')
          })
        }

        let title = info.name || '-'
        title = info.name && !editable ? '%s (%s)'.format(info.name, this.$mobile.getBlockedText(info, true)) : title
        const simTab = info.simsection ? `?simTab=${info.simsection}` : ''
        parsedContent.push({
          title,
          statusPath: {
            to: '/status/network/mobile?tab=' + (info.id || ''),
            readonly: !editable || !this.$session.hasAccess('status/network/mobile', 'read'),
            hint: !editable ? this.$t("This page can't be viewed because modem is %s").format(state) : undefined
          },
          servicesPath: {
            to: '/network/mobile/general/' + (info.id || '') + simTab,
            readonly: !editable || !this.$session.hasAccess('network/mobile/general', 'read'),
            hint: !editable ? this.$t("This page can't be viewed because modem is %s").format(state) : undefined
          },
          content: parsedData,
          signal: info.rssi || '-',
          modemId: info.id,
          simSection: info.simsection,
          hints,
          type: 'modem',
          sectionName: info.id || info.sectionName || '-',
          id: 'mobile'
        })
      })
      return parsedContent
    },
    parseWirelessData(status, configs) {
      const parsedContent = []
      status.forEach(element => {
        const currentConfig = configs?.find(config => config.id === element.id) ?? {}
        const parsedData = []
        if (['sta', 'multi_ap'].includes(element.mode)) {
          parsedData.push({
            title: this.$t('Status'),
            status: element,
            config: currentConfig,
            networkStatus: this.interfaceStatus.find(e => e.name === currentConfig.network)
          })
        }
        parsedData.push({
          title: element.mode === 'mesh' ? this.$t('Mesh ID') : this.$t('SSID'),
          info: element.ssid || element.mesh_id || '-',
          config: currentConfig,
          locked: element.encryption ? (element.encryption === 'None' ? false : true) : null,
          name: 'ssid'
        })
        const mode = this.$wireless.getMode(element.mode)
        parsedData.push({
          title: this.$t('Mode'),
          info: mode,
          name: 'mode'
        })
        parsedData.push({
          title: this.$t('Channel'),
          info:
            element.devices
              ?.map(dev => dev.channel)
              .filter(ch => ch)
              .join(', ') || '-',
          name: 'channel'
        })
        if (!['sta', 'multi_ap'].includes(element.mode)) {
          parsedData.push({
            title: this.$t('Clients'),
            info: element.num_assoc || '0',
            name: 'clients'
          })
        }
        const wifiName = this.$wireless.getName(currentConfig)
        element.band = element.devices?.map(dev => dev.band).filter(band => band) || []
        parsedContent.push({
          title: element.band.length > 0 ? `${wifiName} (${element.band.join(', ')})` : this.$t('Wireless'),
          servicesPath: {
            to: '/network/wireless/ssids?edit=' + (element.id || ''),
            readonly: !this.$session.hasAccess('network/wireless/ssids', 'read')
          },
          statusPath: {
            to: '/status/wireless/interfaces',
            readonly: !this.$session.hasAccess('status/wireless/interfaces', 'read')
          },
          content: parsedData,
          up: element.up || false,
          type: 'wifi',
          sectionName: element.id || element.sectionName,
          id: 'wireless'
        })
      })
      return parsedContent
    },
    parseHotspotData(data) {
      const parsedContent = []
      const parsedData = []
      parsedData.push({
        title: this.$t('Status'),
        info: data.enabled === '1' ? this.$t('Enabled') : this.$t('Disabled'),
        name: 'status'
      })
      if (this.$store.hasPackages('mdcollectd.control')) {
        parsedData.push({
          title: this.$t('Bytes received / sent'),
          info: 'rx_bytes' in data && 'tx_bytes' in data ? this.convert(data.rx_bytes, 1024).concat(' / '.concat(this.convert(data.tx_bytes, 1024))) : '0 / 0',
          name: 'bytes-received-sent'
        })
      }
      parsedContent.push({
        title: this.$t('Hotspot'),
        servicesPath: {
          to: '/services/hotspot/general',
          readonly: !this.$session.hasAccess('services/hotspot/general', 'read')
        },
        statusPath: { to: '/system/maintenance/hotspot/', readonly: !this.$session.hasAccess('system/maintenance/hotspot', 'read') },
        content: parsedData,
        type: 'basic',
        sectionName: 'hotspot',
        id: 'hotspot'
      })
      return parsedContent
    },
    /**
     * @param {Array<import('@/types/networkTypes').InterfaceStatus & {sectionName: string}>} data
     * @param {import('@/types/networkTypes').Interface[]} configs
     * @param {*} portBased
     * @param {*} ifaceBasedConfig
     * @param {*} ifaceBasedDevices
     * @param {*} apnsStatus
     * @param {import('@/types/networkDeviceTypes').DeviceStatus[]} bridgeStatus
     */
    parseInterfacesData(data, configs, portBased, ifaceBasedConfig, ifaceBasedDevices, apnsStatus, bridgeStatus) {
      const parsedContent = []
      const methods = {
        nat: this.$t('NAT'),
        bridge: this.$t('Bridge'),
        passthrough: this.$t('Passthrough'),
        default: '-'
      }
      data.forEach(info => {
        if (this.$store.hasPackages('mdcollectd.control') && info.sectionName === 'eth0') return
        const parsedData = []

        /** @type {Partial<import('@/types/networkTypes').Interface>} */
        const config = configs.find(element => element.id === info.id) || {}

        const parsedNetworkType = this.$network.parseNetworkType(info.network_type)
        const parsedMethod = methods[config.method] || methods.default

        let isModemOffline = false
        let type
        let apn
        if (info.network_type === 'mobile') {
          if (info.modem_id) {
            isModemOffline = this.offlineModems.includes(info.modem_id)
          }
          type = config.method === 'nat' || !config.method ? parsedNetworkType : this.$t('Mobile (%s mode)').format(parsedMethod)
          apn = config.apn ?? '-'
          if (config.auto_apn === '1') {
            apn = config.apn ? '%s (%s)'.format(this.$t('Auto'), config.apn) : this.$t('Auto')
          } else if (config.force_apn && config.force_apn !== '-1' && apnsStatus) {
            const list = apnsStatus.find(apns => apns.modem === info.modem_id)?.apns || []
            apn = list.find(s => s.id === parseInt(config.force_apn))?.apn || config.apn || '-'
          }
          if (isModemOffline) apn = '-'
        } else {
          const device = info.network_type === 'wireless' ? info.name : info.device
          type = device ? `${parsedNetworkType} (${device})` : parsedNetworkType
        }
        parsedData.push({
          title: this.$t('Type'),
          info: type || '-',
          name: 'type'
        })
        parsedData.push({
          title: this.$t('IP address'),
          name: 'ip-address'
        })
        if (apn) {
          parsedData.push({
            title: 'APN',
            info: apn || '-',
            name: 'apn'
          })
        }
        if (config.area_type === 'wan' && info.network_type !== 'mobile') {
          const dnsServers = info['dns-server'] && info['dns-server'].length > 0 ? info['dns-server'].join(', ') : '-'
          parsedData.push(
            {
              title: this.$t('Gateway IP'),
              info: info.gwaddr || '-',
              name: 'gateway-ip'
            },
            {
              title: this.$t('DNS servers'),
              info: dnsServers,
              name: 'dns-servers'
            }
          )
        }
        if (config.area_type === 'lan') {
          const ports = parsePorts(info.device, ifaceBasedConfig, ifaceBasedDevices, portBased, bridgeStatus, this.wirelessStatus)
          parsedData.push({
            title: this.$t('Ports'),
            info: ports || '-',
            name: 'ports'
          })
        }
        const servicesPath = this.getIfaceRoute(info.id, config.area_type)
        const noEditHint = isModemOffline ? this.$t("This instance can't be edited because modem is blocked or disabled") : undefined
        parsedContent.push({
          config,
          status: info,
          title: `${this.$network.getName(info) || info.interface || info.id || info.sectionName || ''}${info.main === '1' ? ` (${this.$t('Main')})` : ''}`,
          servicesPath: servicesPath
            ? {
                to: servicesPath.to,
                readonly: !!noEditHint || servicesPath.readonly,
                hint: noEditHint
              }
            : '',
          statusPath: this.getIfaceStatusRoute(info.id, info.sectionName),
          apnRow: info.network_type === 'mobile',
          content: parsedData,
          type: 'interface',
          sectionName: info.id || info.sectionName,
          id: 'interface'
        })
      })
      return parsedContent
    },
    getIfaceStatusRoute(id, name) {
      if ((id || name) !== 'lan') return ''
      return {
        to: '/status/network/lan',
        readonly: !this.$session.hasAccess('status/network/lan', 'read')
      }
    },
    getIfaceRoute(id, areaType) {
      if (!areaType || !id) {
        return {
          to: '',
          readonly: true
        }
      }
      return {
        to: `/network/${areaType}?edit=${id || ''}`,
        readonly: !this.$session.hasAccess(`network/${areaType}`, 'read')
      }
    },
    parseInternet(internetStatus) {
      return [
        {
          title: this.$t('Internet status'),
          servicesPath: { to: '/network/internet_status', readonly: !this.$session.hasAccess('network/internet_status', 'read') },
          content: this.$network.parseInternetStatus(internetStatus),
          type: 'basic',
          sectionName: 'connchecker',
          id: 'connchecker'
        }
      ]
    },
    /**
     * @param {*[]} configs
     * @param {*[]} members
     * @param {Record<string, import('@/types/mwanTypes').MwanStatus>} statuses
     */
    parseFailover(configs, policies, mode, members, statuses, ifaceStatus) {
      const policy = policies.find(p => [mode.mode, `${mode.mode}_default`].includes(p.id))
      const filteredMembers = members.filter(member => member.interface && policy?.use_member?.includes(member.id))
      const sortedPairs = Object.keys(statuses)
        .map(iface => {
          const config = configs.find(config => config.id === iface)
          const member = filteredMembers.find(member => member.interface === this.$network.getName(config))
          return {
            name: this.$network.getInterfaceAndVpnName(ifaceStatus, member?.interface, 'name'),
            metric: member?.metric || '1',
            ...statuses[iface]
          }
        })
        .sort(mwan.statusComparator)
      const parsedData = sortedPairs.map((pair, index) => ({
        title: this.$network.getName(pair),
        name: `${index + 1}-${this.$network.getName(pair)}`,
        ...mwan.parseStatus(pair.status)
      }))
      if (mode.mode) {
        parsedData.unshift({
          title: this.$t('Mode'),
          info: mwan.getPrettyMode(mode.mode),
          name: 'multiwan-mode'
        })
      }
      return [
        {
          title: this.$t('Multiwan'),
          servicesPath: { to: '/network/failover/mwan', readonly: !this.$session.hasAccess('network/failover/mwan', 'read') },
          content: parsedData,
          type: 'basic',
          sectionName: 'failover_priority',
          id: 'failover_priority'
        }
      ]
    },
    parseDataLimitData(data, dataLimitStatus) {
      const parsedContent = []
      data.forEach(info => {
        const parsedData = []
        const statusNetworkTypeMobile = dataLimitStatus?.find(n => n.id === info.id)
        let dataUsed
        let dataUsedHint = []
        if (statusNetworkTypeMobile) {
          if (statusNetworkTypeMobile.data_used === 'N/A') {
            dataUsed = '%s / %MB'.format(statusNetworkTypeMobile.data_used, statusNetworkTypeMobile.data_limit)
            dataUsedHint = [{ info: this.$t('Data used not available when interface is down') }]
          } else dataUsed = '%MB / %MB'.format(statusNetworkTypeMobile.data_used, statusNetworkTypeMobile.data_limit)
        }
        parsedData.push({
          title: this.$t('Data used / limit'),
          info: dataUsed || '-',
          titleHint: dataUsedHint,
          name: 'data-used-data-limit'
        })
        parsedData.push({
          title: this.$t('Data limit clear due'),
          info: this.$localDate(statusNetworkTypeMobile?.due_reset_time) || '-',
          name: 'data-limit-clear-due'
        })
        parsedData.push({
          title: this.$t('SMS warning'),
          info: statusNetworkTypeMobile ? (statusNetworkTypeMobile.data_warning_enabled === '1' ? this.$t('Enabled') : this.$t('Disabled')) : '-',
          name: 'sms-warning'
        })
        parsedData.push({
          title: 'SIM',
          info: this.$mobile.getSimLabel(info.sim, info.esim_profile, info.modem) || '-',
          name: 'sim'
        })
        let editable = false
        if (info.modem && (info.proto === 'wwan' || info.proto === 'connm')) {
          editable = this.offlineModems.includes(info.modem)
        }
        parsedContent.push({
          title: this.$t('%s Data limit').format(this.$network.getName(info) || info.sectionName),
          servicesPath: {
            to: '/network/mobile/limits/data?edit=' + (info.id ? info.id : info.sectionName || ''),
            readonly: editable || !this.$session.hasAccess('network/mobile/limits/data', 'read'),
            hint: editable ? this.$t("This instance can't be edited because modem is blocked or disabled") : undefined
          },
          content: parsedData,
          type: 'basic',
          sectionName: info.id || info.sectionName,
          id: 'mobile_data_limit'
        })
      })
      return parsedContent
    },
    parseSmsLimitData(dataSms) {
      const parsedContent = []
      dataSms.forEach(info => {
        const parsedData = []
        parsedData.push({
          title: this.$t('Status'),
          info: info.sms_limit_enabled === '1' ? this.$t('Enabled') : this.$t('Disabled'),
          name: 'status'
        })
        parsedData.push({
          title: this.$t('Period'),
          info: info.sms_limit_period ? this.$capitalize(info.sms_limit_period) : '-',
          name: 'period'
        })
        parsedData.push({
          title: this.$t('SMS sent / limit'),
          info: (info.sms_sent || '0') + ' / ' + (info.sms_limit || '0'),
          overLimit: Number(info.sms_limit) < Number(info.sms_sent),
          servicesPath: '/network/mobile/limits/sms?edit=' + (info.section_name || ''),
          name: 'sms-sent-sms-limit'
        })
        parsedData.push({
          title: this.$t('SMS limit clear due'),
          info: info.sms_due_reset_time ? this.$localDate(info.sms_due_reset_time) : '-',
          name: 'sms-limit-clear-due'
        })
        const modem = this.modems.find(e => e.id === info.modem) || {}
        const limitTitle = this.$mobile.getSimModemLabel(modem, info.id ? info.id.match(/\d+/)[0] : info.sim, info.esim_profile)
        const limitId = info.id ? info.id : 'sms_limit_sim' + info.sim
        parsedContent.push({
          title: this.$t('SIM%s SMS limit').format(limitTitle),
          servicesPath: {
            to: '/network/mobile/limits/sms?edit=' + (info.section_name || info.sectionName),
            readonly: !this.$session.hasAccess('network/mobile/limits/sms', 'read')
          },
          content: parsedData,
          type: 'sms_limit',
          sectionName: info.section_name || info.sectionName,
          id: limitId
        })
      })
      return parsedContent
    },
    parseVrrpData(data, vrrpConfig) {
      const parsedContent = []
      for (const key in data) {
        const config = vrrpConfig.find(instance => instance.id === data[key].name)
        const parsedData = []
        parsedData.push({
          title: this.$t('Status'),
          info: config?.enabled === '1' ? this.$t('Enabled') : this.$t('Disabled'),
          name: 'status'
        })
        parsedData.push({
          title: this.$t('State'),
          info: data[key].state && data[key].main_ip !== 'N/A' ? data[key].state : '-',
          name: 'state'
        })
        parsedData.push({
          title: this.$t('Main IP'),
          info: data[key].main_ip && data[key].main_ip !== 'N/A' ? data[key].main_ip : '-',
          name: 'main-ip'
        })
        if (config?.virtual_ip) {
          for (let i = 0; i < config.virtual_ip.length; i++) {
            parsedData.push({
              title: this.$t('Virtual IP'),
              info: config.virtual_ip[i],
              name: 'virtual-ip'
            })
          }
        }
        parsedContent.push({
          title: data[key].sectionName ? data[key].sectionName.concat(' ').concat(this.$t('VRRP')) : data[key].name?.concat(' ').concat(this.$t('VRRP')),
          servicesPath: { to: '/network/failover/vrrp', readonly: !this.$session.hasAccess('network/failover/vrrp', 'read') },
          content: parsedData,
          type: 'basic',
          sectionName: data[key].sectionName || data[key].name,
          id: 'vrrp'
        })
      }
      return parsedContent
    },
    parseOpenvpnData(data) {
      const parsedContent = []
      for (const key in data) {
        const parsedData = []
        let status
        switch (data[key].status) {
          case '0':
            status = this.$t('Disconnected')
            break
          case '1':
            status = this.$t('Connected')
            break
          case '2':
            status = this.$t('Active')
            break
          case '3':
            status = this.$t('Inactive')
            break
          case '4':
            status = this.$t('Disabled')
            break
          default:
            status = '-'
        }
        parsedData.push({
          title: this.$t('Status'),
          info: status,
          name: 'status'
        })

        parsedData.push({
          title: this.$t('Type'),
          info: data[key].type === '1' ? this.$t('Server') : data[key].type === '0' ? this.$t('Client') : '-',
          name: 'type'
        })
        parsedData.push({
          title: this.$t('IP address'),
          info: data[key].ipaddress || '-',
          name: 'ip-address'
        })
        parsedData.push({
          title: this.$t('Time'),
          info: data[key].uptime || '-',
          name: 'time'
        })
        parsedContent.push({
          title: data[key].name ? data[key].name.concat(' ').concat('VPN') : key.concat(' ').concat('VPN'),
          servicesPath: {
            to: `/services/vpn/openvpn?edit=${key}`,
            readonly: !this.$session.hasAccess('services/vpn/openvpn', 'read')
          },
          content: parsedData,
          type: 'basic',
          sectionName: data[key].sectionName || key,
          id: 'open_vpn'
        })
      }
      return parsedContent
    },
    parseRmsData(data) {
      const parsedContent = []
      const parsedData = []
      parsedData.push({
        title: this.$t('Management Status'),
        status: rms.parseStatus(data),
        name: 'management-status'
      })
      const connectionState = rms.parseConnectionState(data)
      parsedData.push({
        title: this.$t('Connection state'),
        connectionStateText: connectionState.text,
        connectionStateColor: connectionState.color,
        error: rms.getFullError(data),
        show: data.status !== '0',
        name: 'connection-state'
      })
      parsedContent.push({
        title: this.$t('Remote Management System'),
        servicesPath: {
          to: '/services/cloud_solutions/rms',
          readonly: !this.$session.hasAccess('services/cloud_solutions/rms', 'read')
        },
        content: parsedData,
        type: 'rms',
        sectionName: 'monitoring',
        id: 'monitoring'
      })
      return parsedContent
    },
    parseSystemEventData(data) {
      const parsedContent = []
      const parsedData = []
      data.slice(0, 4).forEach(info => {
        parsedData.push({
          title: info.date || '-',
          info: info.event || '-',
          name: 'recent-system-events'
        })
      })
      parsedContent.push({
        title: this.$t('Recent system events'),
        statusPath: {
          to: '/system/maintenance/eventlog',
          readonly: !this.$session.hasAccess('system/maintenance/eventlog/all', 'read')
        },
        content: parsedData,
        type: 'basic',
        sectionName: 'system_events',
        id: 'system_events'
      })
      return parsedContent
    },
    parseNetworkEventData(data) {
      const parsedContent = []
      const parsedData = []
      data.slice(0, 4).forEach(info => {
        parsedData.push({
          title: info.date || '-',
          info: info.event || '-',
          name: 'recent-network-events'
        })
      })
      parsedContent.push({
        title: this.$t('Recent network events'),
        statusPath: {
          to: '/system/maintenance/eventlog',
          readonly: !this.$session.hasAccess('system/maintenance/eventlog/all', 'read')
        },
        content: parsedData,
        type: 'basic',
        sectionName: 'network_events',
        id: 'network_events'
      })
      return parsedContent
    },
    parseAccessControlData(data) {
      const parsedContent = []
      const parsedData = []
      const formatServiceWithPorts = (service, serviceData, isWan = false) => {
        let portDisplay
        const ports = isWan ? serviceData.wan_port : serviceData.port
        if (isArray(ports)) {
          if (ports.length === 1) {
            portDisplay = ports[0]
          } else if (ports.length > 3) {
            portDisplay = `${ports.slice(0, 3).join(', ')}...`
          } else if (ports.length > 0) {
            portDisplay = ports.join(', ')
          }
        } else {
          portDisplay = ports
        }
        return `${service} (${portDisplay})`
      }
      const formattedLanServices = data.lan?.map(service => {
        const serviceData = data.fullData[service]
        return formatServiceWithPorts(service, serviceData, false)
      })
      parsedData.push({
        title: this.$t('LAN'),
        info: formattedLanServices?.length ? formattedLanServices.join(', ') : '-',
        name: 'lan'
      })
      if (!this.$store.device.startsWith('TSW')) {
        const formattedWanServices = data.wan?.map(service => {
          const serviceData = data.fullData[service]
          return formatServiceWithPorts(service, serviceData, true)
        })
        parsedData.push({
          title: this.$t('WAN'),
          info: formattedWanServices?.length ? formattedWanServices.join(', ') : '-',
          name: 'wan'
        })
      }
      parsedContent.push({
        title: this.$t('Access Control'),
        servicesPath: {
          to: '/system/admin/access_control/general',
          readonly: !this.$session.hasAccess('system/admin/access_control/general', 'read')
        },
        content: parsedData,
        type: 'basic',
        sectionName: 'access_control',
        id: 'access_control'
      })
      return parsedContent
    },
    convert(bytes, constant) {
      let recvdata = bytes
      if (!isNaN(recvdata)) {
        if (recvdata > constant) {
          recvdata = recvdata / constant
          if (recvdata > constant) {
            recvdata = recvdata / constant
            if (recvdata > constant) {
              recvdata = recvdata / constant
              recvdata = recvdata.toFixed(1) + ' GB'
            } else {
              recvdata = recvdata.toFixed(1) + ' MB'
            }
          } else {
            recvdata = recvdata.toFixed(1) + ' KB'
          }
        } else {
          recvdata = recvdata + ' B'
        }
      }
      return recvdata
    },
    simCardUnblock(data) {
      this.modalId = data.id
      this.modalType = data.type
      this.showModal = true
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

@media (hover: hover) {
  :deep(.overview__card:has(.card-title:hover)) {
    border-color: var(--color-theme-border-primary);
  }
}
</style>
