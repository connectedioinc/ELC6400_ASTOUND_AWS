<template>
  <vuci-form
    v-bind="formConfig"
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :extra-load="extraLoad"
    :after-load="afterLoad"
    async-load
  >
    <vuci-typed-section
      v-bind="sectionConfig"
      type="interface"
      data-key="interfaces"
      :uci-data="uciData"
      :edit-form="editModal"
      :no-value-text="$t('No interfaces available')"
      :add="beforeAdd"
      :add-validate="addValidate"
      :endpoints="[{ endpoint: 'interfaces/config', awaitNetwork }]"
      :exception-options="['metric']"
      :sortable="draggable"
      :edit-form-props="{ allInterfaces, validateDuplicateNames }"
      :after-delete="
        delIface => {
          allInterfaces = allInterfaces.filter(iface => iface.id !== delIface.id)
          sectionConfig.afterDelete?.(delIface)
        }
      "
      :after-save="afterSave"
      @edit-modal-closed="editModalClosed"
      @drag-end="reorderData"
    >
      <template
        v-if="draggable"
        #before
      >
        <drag-hint :element-name="$t('interfaces')" />
      </template>
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: status }"
          class="mb-4 last:mb-0"
          :test-id="`rowCard-${s.id}`"
          :card-props="findIfaceStatus(s)"
          :draggable="draggable"
          :is-first="index === 0"
          :is-last="index === uciData?.interfaces?.length - 1"
          @drag-start="actions.startDrag"
          @swap-next="actions.swapNext"
          @swap-prev="actions.swapPrev"
        >
          <name-cell
            :index="index + 1"
            :value="$network.getName(s)"
          >
            <template #status>
              <subnet-conflict
                :interface="s.id"
                class="ml-2"
                :statuses="formOptions.interfaceStatus"
                :configs="formData.interfaces"
              />
            </template>
          </name-cell>
          <card-cell>
            <cell-row
              :label="$t('Status')"
              :truncate="false"
            >
              <template #value>
                <interface-status
                  :status="status"
                  :data-limit="formOptions.dataLimit"
                  :modem-list="formOptions.modemList"
                  :wireless-networks="formOptions.wirelessNetworks"
                  :simcards="formOptions.simcards"
                  :device-status="formOptions.networkDevices"
                />
              </template>
            </cell-row>
            <cell-row
              :label="$t('Type')"
              :value="$network.parseNetworkType(status?.network_type)"
            />
            <cell-row
              v-if="!['wwan', 'connm'].includes(status?.proto)"
              :label="$t('Device')"
              :value="parseDevice(s, status)"
            />
          </card-cell>
          <card-cell>
            <cell-row
              label="IP"
              :truncate="false"
            >
              <template #value>
                <ip-details
                  :config="s"
                  :status="status ?? {}"
                />
              </template>
            </cell-row>
            <cell-row
              v-if="!['wwan', 'connm'].includes(s.proto)"
              :label="$t('Protocol')"
              :value="protocols.getOption(status?.proto)?.name ?? '-'"
            />
            <cell-row
              v-if="!['wwan', 'connm'].includes(s.proto)"
              label="MAC"
              :value="parseMacAddr(status)"
            />
            <slot
              name="mobile-rows"
              :status="status ?? {}"
              :config="s"
            />
          </card-cell>
          <card-cell>
            <cell-row
              :label="$t('Uptime')"
              :value="status?.is_up ? '%t'.format(status?.uptime) : '-'"
            />
            <cell-row
              label="TX"
              :value="'%mB'.format(status?.tx_bytes)"
            />
            <cell-row
              label="RX"
              :value="'%mB'.format(status?.rx_bytes)"
            />
          </card-cell>
          <action-cell>
            <slot
              :s="s"
              name="enable"
              :uci-data="uciData"
            />
          </action-cell>
          <action-cell>
            <cell-row
              only-mobile-label
              :label="$t('Actions')"
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="xl:min-w-max"
                  :actions="actions"
                >
                  <template
                    v-if="!!$slots.edit"
                    #edit="{ openEdit }"
                  >
                    <slot
                      :s="s"
                      :open-edit="openEdit"
                      name="edit"
                    />
                  </template>
                  <template #delete="{ delSection }">
                    <tlt-hint :hints="deleteHints(s)">
                      <tlt-button
                        button-id="delete"
                        type="text"
                        color="error"
                        :readonly="!!interfaceInUse(s) || !!hotspotInUse(s)"
                        @click="delSection(s.id)"
                        >{{ $t('Delete') }}</tlt-button
                      >
                    </tlt-hint>
                  </template>
                </vuci-form-edit-delete>
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
/** @typedef {import('@/types/networkTypes').Interface} Interface */
/** @typedef {import('@/types/networkTypes').InterfaceStatus} InterfaceStatus */
/** @typedef {import('@/types/wirelessTypes').WifiInterface} WifiInterface */
/** @typedef {import('@/types/firewallTypes').Zone} FwZone */
/** @typedef {import('@/types/vlanTypes').InterfaceQQVLAN} InterfaceQQVLAN */

import { computed, markRaw } from 'vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { copy } from '@ui-core/utils/vue-helpers'
import editModal from './interfaces/InterfaceEdit.vue'
import IpDetails from '@/components/shared/IpDetails.vue'
import DragHint from '@/components/shared/DragHint.vue'
import InterfaceStatus from '@/components/shared/InterfaceStatus'
import SubnetConflict from '@/components/shared/SubnetConflict.vue'
import { network } from '@/plugins/network'

export default {
  components: { IpDetails, DragHint, InterfaceStatus, SubnetConflict },
  provide() {
    return {
      formOptions: () => this.formOptions,
      updateOverviewData: (dataKey, newData) => this.$refs.vuciForm?.updateUciData?.(newData, dataKey),
      initialOverviewForm: () => this.$refs.vuciForm?.initialForm,
      refreshConfig: () => (this.needConfigRefresh = true),
      [network.statusContext.contextId]: computed(() => this.formOptions.interfaceStatus)
    }
  },
  props: {
    // Bind aditional props to interface section
    sectionConfig: {
      type: Object,
      required: true
    },
    // Bind aditional props to vuci-form
    formConfig: {
      type: Object,
      default: () => {}
    },
    // Add endpoints that should go to extraLoad bulk
    additionalExtraEndpoints: {
      type: Array,
      default: () => []
    },
    // Parse data that you get from extraLoad bulk
    // It only gives data from endpoints added with additionalExtraEndpoints
    additionalExtraLoad: {
      type: Function,
      default: () => Promise.resolve()
    },
    // Add endpoints that should go to afterLoad bulk
    additionalAfterEndpoints: {
      type: Array,
      default: () => []
    },
    // Parse data that you get from afterLoad bulk
    // It only gives data from endpoints added with additionalAfterEndpoints
    additionalAfterLoad: {
      type: Function,
      default: () => Promise.resolve()
    },
    // Add endpoints that should go to bulk on timer
    additionalUpdateEndpoints: {
      type: Array,
      default: () => []
    },
    // Parse data that you get from updating load
    // It only gives data from endpoints added with additionalUpdateEndpoints
    additionalUpdateLoad: {
      type: Function,
      default: () => Promise.resolve()
    },
    // Defines if it is lan or wan page
    pageType: {
      type: String,
      validator: (/** @type * */ value) => ['lan', 'wan'].includes(value),
      required: true
    }
  },
  data() {
    return {
      formData: {
        /** @type Interface[] */
        interfaces: [],
        dhcpv4: [],
        dhcpv6: []
      },
      formOptions: {
        /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
        networkDevices: [],
        systemFeatures: {},
        /** @type InterfaceStatus[] */
        interfaceStatus: [],
        modemList: [],
        dataLimit: [],
        ntpInfo: {},
        simcards: [],
        /** @type FwZone[] */
        fwZones: [],
        /** @type WifiInterface[] */
        wirelessNetworks: [],
        /** @type InterfaceQQVLAN[] */
        vlanInterfaceDevices: [],
        hotspotInstances: []
      },
      /** @type Interface[] */
      otherInterfaces: [],
      /** @type Interface[] */
      allInterfaces: [],
      wanIface: this.$store.board?.network?.wan?.device || '',
      lanIface: this.$store.board?.network?.lan?.device || '',
      editModal: markRaw(editModal),
      currentMsgs: {
        /** @type string | undefined */
        mtu1280: undefined,
        /** @type string | undefined */
        mtu576: undefined
      },
      needConfigRefresh: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    draggable() {
      return this.pageType === 'wan'
    },
    modemOptions() {
      return this.$mobile.modemsOptions(this.formOptions.modemList)
    },
    awaitNetwork() {
      const initialIfaces = this.$refs.vuciForm?.initialForm?.interfaces
      const currIfaces = this.formData.interfaces
      return currIfaces.some(currIface => {
        const initialIface = initialIfaces?.find(initialIface => initialIface.id === currIface.id)
        if (!initialIface) return false
        return currIface.enabled !== initialIface.enabled && currIface.method === 'passthrough'
      })
    },
    protocols() {
      return this.$network.getInterfaceProtocols()
    }
  },
  watch: {
    'formData.interfaces': {
      /**
       * @param {Interface[]} newVal
       */
      handler(newVal) {
        const message = this.$t('Interface(s): %s have mtu lower than %d it will make all interfaces on same physical interface no longer support %s')
        this.showSideMessage(newVal, 'mtu1280', (/** @type {Interface} */ iface) => parseInt(iface.mtu ?? '1500') < 1280 && iface.enabled === '1', message.format('%s', 1280, this.$t('IPv6')))
        this.showSideMessage(newVal, 'mtu576', (/** @type {Interface} */ iface) => parseInt(iface.mtu ?? '1500') < 576 && iface.enabled === '1', message.format('%s', 576, 'DHCP'))
      },
      deep: true
    }
  },
  methods: {
    /**
     * @param {Interface[]} newVal
     * @param {'mtu1280' | 'mtu576'} ruleName
     * @param {function(Interface): boolean} rule
     * @param {string} unformatedMessage
     */
    showSideMessage(newVal, ruleName, rule, unformatedMessage) {
      const failedRule = newVal.filter(rule)
      const names = failedRule.map(this.$network.getName).join(', ')
      const message = unformatedMessage.format(names)
      const shouldShowMessage = names.length > 0
      const currentMsg = this.currentMsgs[ruleName]
      if (shouldShowMessage) {
        if (message !== currentMsg) {
          this.$notification.info(message)
          if (currentMsg) this.$notification.remove(currentMsg)
        }
      } else {
        if (currentMsg) this.$notification.remove(currentMsg)
      }
      this.currentMsgs[ruleName] = shouldShowMessage ? message : undefined
    },
    /**
     * @param {Interface} config
     * @returns {InterfaceStatus}
     */
    findIfaceStatus(config) {
      return this.formOptions.interfaceStatus.find(ifaceStatus => ifaceStatus.id === config.id)
    },
    /**
     * @param {InterfaceStatus} content
     * @returns {string | undefined}
     */
    parseMacAddr(content) {
      if (content?.macaddr === '00:00:00:00:00:00' && (content?.network_type === 'mobile' || content?.proto === 'pppoe')) return ''
      return content?.macaddr
    },
    parseDevice(config, status) {
      if (status?.network_type === 'wireless') return status?.device || '-'
      const device = this.formOptions.networkDevices?.find(device => device.id && (device.type === 'VLAN' ? device.name : device.id) === config.device) ?? {}
      return device.description || device.name || '-'
    },
    /** @param {{interfaces: Interface[]}} form */
    extraLoad(form) {
      return this.$axios
        .bulkGet([
          {
            endpoint: '/api/wireless/interfaces/config',
            condition: !!this.board.hwinfo.wifi
          },
          {
            endpoint: '/api/hotspot/config',
            condition: 'coovachilli-api'
          },
          ...this.additionalExtraEndpoints
        ])
        .then(([wirelessNetworks, hotspot, ...extraData]) => {
          if (!wirelessNetworks.success) this.$message.error(this.$t('Failed to load wireless data'))
          else this.formOptions.wirelessNetworks = wirelessNetworks.data

          if (!hotspot.success) this.$message.error(this.$t('Failed to load Hotspot data'))
          else this.formOptions.hotspotInstances = hotspot.data

          this.otherInterfaces = form.interfaces.filter(iface => iface.area_type !== this.pageType)
          form.interfaces = form.interfaces.filter(iface => iface.area_type === this.pageType)
          this.allInterfaces = copy([...form.interfaces, ...this.otherInterfaces])
          return this.additionalExtraLoad(form, this.formOptions, extraData)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    /** @param {{interfaces: Interface[]}} form */
    afterLoad(form) {
      return this.$axios
        .bulkGet([
          '/api/interfaces/basic/status?include=vpn',
          '/api/basic/network/devices/status',
          '/api/firewall/zones/config',
          '/api/interface_based_vlan/config',
          '/api/interface_based_vlan/devices/status',
          '/api/dhcp/servers/ipv4/config',
          '/api/dhcp/servers/ipv6/config',
          ...this.additionalAfterEndpoints
        ])
        .then(([ifacesStatus, networkDevices, fwZonesRes, interfaceVlans, interfaceVlanDevices, dhcpv4, dhcpv6, ...extraData]) => {
          if (!ifacesStatus.success) this.$message.error(this.$t('Failed to load interfaces status data'))
          else this.formOptions.interfaceStatus = ifacesStatus.data

          if (!networkDevices.success) this.$message.error(this.$t('Failed to load network devices data'))
          else this.formOptions.networkDevices = networkDevices.data

          if (fwZonesRes.success) this.formOptions.fwZones = fwZonesRes.data
          else this.$message.error(this.$t('Failed to load firewall zones data'))

          if (interfaceVlans.success && interfaceVlanDevices.success) this.formOptions.vlanInterfaceDevices = [...interfaceVlans.data, ...interfaceVlanDevices.data]
          else this.$message.error(this.$t('Failed to load VLAN interface data'))

          if (dhcpv4.success) form.dhcpv4 = dhcpv4.data
          else this.$message.error(this.$t('Failed to load DHCP config'))

          if (dhcpv6.success) form.dhcpv6 = dhcpv6.data
          else this.$message.error(this.$t('Failed to load DHCPv6 config'))

          return this.additionalAfterLoad(form, this.formOptions, extraData)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start({ method: this.updateData, time: 3000, autostart: true, immediate: false })
        })
    },
    updateData() {
      return this.$axios
        .bulkGet(['/api/interfaces/basic/status?include=vpn', '/api/basic/network/devices/status', ...this.additionalUpdateEndpoints])
        .then(([ifacesStatus, devStatus, ...extraData]) => {
          if (ifacesStatus.success) this.formOptions.interfaceStatus = ifacesStatus.data
          else this.$message.error(this.$t('Failed to load interfaces status data'))
          if (devStatus.success) this.formOptions.networkDevices = devStatus.data
          else this.$message.error(this.$t('Failed to update network devices data'))

          return this.additionalUpdateLoad(this.formOptions, extraData)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    updateConfig() {
      this.$spin()
      return this.$axios
        .get('/api/interfaces/config')
        .then(({ data }) => {
          this.otherInterfaces = data.filter(e => e.area_type === 'wan')
        })
        .catch(() => this.$message.error(this.$t('Failed to load network data')))
        .finally(() => this.$spin(false))
    },
    async editModalClosed(data) {
      data.interfaces.sort((a, b) => a.metric - b.metric)
      if (this.needConfigRefresh) {
        await this.updateConfig()
        this.needConfigRefresh = false
      }
      this.allInterfaces = copy([...this.otherInterfaces, ...data.interfaces])
    },
    addValidate() {
      if (this.pageType !== 'wan' || this.formOptions.modemList.length === 0) return { valid: true }
      const multiApnSupported = this.formOptions.modemList.every(modem => modem.multi_apn)
      if (multiApnSupported) return { valid: true }

      function filterMobileIfaces(arr) {
        return arr.filter(iface => ['wwan', 'connm'].includes(iface.proto))
      }
      const initialIfaces = filterMobileIfaces(this.allInterfaces)
      const currIfaces = filterMobileIfaces(this.formData.interfaces)
      const noChanges = JSON.stringify(initialIfaces) === JSON.stringify(currIfaces)
      if (noChanges) return { valid: true }
      return { valid: false, message: this.$t('To create new instance, unsaved changes to mobile interfaces need to be saved or reverted') }
    },
    /** @param {Interface} iface */
    beforeAdd(iface) {
      iface.area_type = this.pageType
    },
    /** @param {Interface[]} dat */
    reorderData(dat) {
      this.formData.interfaces.splice(0, this.formData.interfaces.length)
      this.formData.interfaces.push(...dat)
      this.formData.interfaces.forEach((o, i) => {
        o.metric = (i + 1).toString()
      })
    },
    /** @param {Interface} s */
    interfaceInUse(s) {
      return this.formOptions.wirelessNetworks.find(wifi => wifi.network === this.$network.getName(s))
    },
    /** @param {Interface} s */
    hotspotInUse(s) {
      return this.formOptions.hotspotInstances.find(hotspot => hotspot.network === this.$network.getName(s) || (hotspot.moreif && hotspot.moreif.includes(s.id)))
    },
    /** @param {Interface} s */
    deleteHints(s) {
      const assocWirelessIface = this.interfaceInUse(s)
      const assocHotspot = this.hotspotInUse(s)
      const hints = []
      if (assocWirelessIface) {
        hints.push({
          info: this.$t('Interface "%s" is associated with the following WiFi network: %s. Please disassociate the WiFi network before removing this interface.').format(
            assocWirelessIface.network,
            assocWirelessIface.ssid || assocWirelessIface.mesh_id
          )
        })
      }
      if (assocHotspot) {
        hints.push({
          info: this.$t('Interface "%s" is associated with the Hotspot instance. Please delete hotspot instance before removing this interface.').format(this.$network.getName(s))
        })
      }
      return hints
    },
    /**
     * @param {string} value
     * @param {string | null} [id=null]
     */
    validateDuplicateNames(value, id = null) {
      if (this.allInterfaces.some(iface => iface.id !== id && this.$network.getName(iface) === value)) {
        return { isValid: false, message: this.$t('Duplicate names are not allowed.') }
      }
      return { isValid: true }
    },
    afterSave(_, res) {
      this.allInterfaces = copy([...res[0].data, ...this.otherInterfaces])
      this.sectionConfig?.afterSave?.()
    }
  }
}
</script>
