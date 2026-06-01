<template>
  <div
    ref="side-widget-wrapper"
    class="side-widget-wrapper text-xs w-full"
  >
    <tlt-icon
      v-if="loading"
      icon="spinner"
      class="text-theme-text-primary spinner w-20 h-20 absolute inset-x-1/2 inset-y-1/3"
      animate
    />
    <div
      v-else
      class="side-widget-card-wrapper"
    >
      <div class="flex items-center border-b border-b-light pt-3 w-full sticky top-0 bg-white z-50">
        <template v-for="button in sideButtons">
          <div
            v-if="button.exist"
            :id="button.id"
            :key="button.id"
            class="mr-2 mb-1"
          >
            <tlt-button
              type="icon"
              :color="button.active ? 'primary' : 'secondary'"
              :disabled="button.disabled"
              class="cursor-pointer"
              @click.capture="handleClick(button.id)"
            >
              <tlt-icon :icon="button.icon" />
            </tlt-button>
            <p class="text-center text-caption-sm text-gray-tlt-200 mt-0.5">
              {{ button.name }}
            </p>
          </div>
        </template>
      </div>
      <tlt-card-new
        class="border-b border-b-light-tlt-4 w-full"
        :item="systemCardData"
        borderless
      >
        <template #header="{ item }">
          <div class="w-full">
            <div class="mb-6">
              <img
                :src="imageContainer[deviceSection?.device_type?.substring(0, 3).toLowerCase()] || imageContainer[deviceSection?.devicename?.substring(0, 3).toLowerCase()] || imageContainer['tap']"
                class="max-h-32 w-auto block"
              />
            </div>
            <tlt-overflow-hint custom-style="text-turtle">
              {{ item.title }}
            </tlt-overflow-hint>
          </div>
        </template>
      </tlt-card-new>
      <div
        v-if="deviceSection?.device_type?.includes('TSW') || deviceSection?.device_type?.includes('SWM')"
        class="border-b border-b-light-tlt-4"
      >
        <div class="font-semibold text-gray-tlt-1 flex justify-between mt-4 text-base">
          {{ $t('Port status') }}
        </div>
        <div class="mx-auto smaller-ports flex justify-center w-[200px] -mt-2">
          <div class="flex-row flex justify-center items-center flex-wrap">
            <ports
              :custom-ports="displayPorts"
              :get-port-data="getPortData"
              :display-number="false"
              default-cursor
              widget
            />
          </div>
        </div>
      </div>
      <span
        v-if="logsCardData.length"
        class="font-semibold text-gray-tlt-1 flex justify-between mb-2 mt-2 text-base"
      >
        {{ $t('Logs') }}
        <div class="flex row justify-end">
          <tlt-button
            button-id="clear"
            size="lg"
            color="error"
            type="text"
            class="cursor-pointer"
            @click="clearLogs"
            >{{ $t('Clear') }}</tlt-button
          >
        </div>
      </span>
      <table class="table">
        <tbody class="relative">
          <tr
            v-for="(row, id) in logsCardData[currentPage]"
            :key="id"
            class="text-gray-tlt-200 flex flex-col"
          >
            <td>
              <div class="flex justify-between text-gray-tlt-75 lg:text-inherit flex-row flex-wrap">
                <span class="flex leading-7 word-break lg:w-full">{{ row.date }}</span>
              </div>
            </td>
            <td>
              <div class="flex justify-between text-gray-tlt-75 lg:text-inherit flex-row">
                <span class="leading-7 word-break">{{ row.message }}</span>
                <tlt-button
                  v-if="row.details"
                  type="text"
                  size="sm"
                  class="ml-2 shrink-0 cursor-pointer"
                  @click="toggleDetails(row.uniqueKey)"
                >
                  {{ row.showDetails ? $t('Hide') : $t('Details') }}
                </tlt-button>
              </div>
              <div
                v-if="row.showDetails && row.details"
                class="mt-1 p-2 bg-gray-100 rounded"
              >
                <div
                  v-for="(detail, i) in row.details.split(';')"
                  :key="i"
                  class="text-xs text-gray-600 break-all"
                >
                  - {{ detail.trim() }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <nav
        v-if="logsCardData.length && logsCardData.length > 1"
        class="w-full grid grid-cols-2 border-b border-b-light-tlt-4 mt-1 mb-2"
      >
        <div class="flex justify-start">
          <tlt-button
            button-id="previous-page"
            type="text"
            size="md"
            class="max-md:hidden cursor-pointer"
            :disabled="currentPage == 0"
            @click="currentPage--"
          >
            <tlt-icon
              icon="chevron"
              class="rotate-180 -mr-1 w-4 h-4"
            />
            {{ $t('Previous') }}
          </tlt-button>
        </div>
        <div class="flex justify-end">
          <tlt-button
            button-id="next-page"
            type="text"
            size="md"
            class="mr-2 max-md:hidden cursor-pointer"
            :disabled="currentPage == logsCardData.length - 1"
            @click="currentPage++"
          >
            {{ $t('Next') }}
            <tlt-icon
              class="-ml-1 w-4 h-4"
              icon="chevron"
            />
          </tlt-button>
        </div>
      </nav>
      <tlt-card-new
        class="border-b border-b-light-tlt-4"
        :item="lanCardData"
        borderless
      />
      <div
        v-if="wirelessCardData.length"
        class="w-[400px]"
        :class="{ 'single-item-carousel': wirelessCardData.length === 1 }"
      >
        <div>
          <div class="py-5">
            <tlt-carousel :source="wirelessCardData">
              <template #header>
                <span class="font-semibold text-gray-tlt-1 flex justify-between mb-6 text-base">
                  {{ $t('Wireless') }}
                  <span class="text-gray-tlt-3 ml-1">{{ wirelessCardData.length }}</span>
                </span>
              </template>
              <template #default="{ item }">
                <tlt-card-new
                  :item="item"
                  class="border w-[345px] rounded-md px-6"
                  borderless
                >
                </tlt-card-new>
              </template>
            </tlt-carousel>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { findKey } from '@ui-core/plugins/helper'
import { useDevmanCommonFunction } from './SitemanCommon'
import IconSwmImg from './IconSwm.webp'
import IconTswImg from './IconTsw.webp'
import IconTapImg from './IconTap.png'

export default {
  props: {
    deviceSection: {
      type: Object,
      default: null
    },
    opened: {
      type: Boolean,
      default: false
    },
    firmwareStatus: {
      type: Object,
      default: null
    },
    devices: {
      type: Array,
      default: function () {
        return []
      }
    }
  },
  emits: ['edit', 'reboot', 'upgrade', 'close'],
  setup() {
    return { ...useDevmanCommonFunction() }
  },
  data() {
    return {
      fullStatusData: {},
      formatedSystemData: {
        upTime: '-',
        localTime: '-'
      },
      currentPage: 0,
      time: {
        upTime: 0,
        localTime: 0
      },
      logColumns: [
        { dataIndex: 'date', scopedSlots: { customHeader: 'deleted' } },
        { dataIndex: 'message', scopedSlots: { customHeader: 'deleted' } }
      ],
      firstStatus: true,
      loading: true,
      fwStatusTranslate: {
        0: this.$t('Up to date'),
        1: this.$t('Upgrade'),
        2: this.$t('No internet connection'),
        3: this.$t('Updating...'),
        4: this.$t('Unknown error')
      },
      imageContainer: {
        tap: IconTapImg,
        tsw: IconTswImg,
        swm: IconSwmImg
      },
      ports: [],
      topology: [],
      expandedLogs: []
    }
  },
  computed: {
    sideButtons() {
      return {
        buttonEdit: {
          id: 'edit',
          icon: 'edit',
          name: this.$t('Edit'),
          exist: true,
          active: false,
          disabled: false
        },
        rebootEdit: {
          id: 'reboot',
          icon: 'refresh',
          name: this.$t('Reboot'),
          exist: true,
          active: false,
          disabled: false
        },
        upgradeEdit: {
          id: 'upgrade',
          icon: 'upgrade-firmware',
          name: this.$t('Upgrade'),
          exist: true,
          active: false,
          disabled: this.firmwareStatus.firmware_status !== 1
        }
      }
    },
    displayPorts() {
      const ports = this.fullStatusData?.port_status || []
      return ports.map((port, idx) => {
        const isSfp = port.id.toLowerCase().startsWith('sfp')
        return {
          ...port,
          name: port.id,
          type: isSfp ? 'sfp' : 'eth',
          num: port.id.replace(/[^\d]/g, ''),
          position: isSfp ? (idx % 2 === 0 ? 'down' : 'up') : idx % 2 === 0 ? 'up' : 'down',
          block: isSfp ? '1' : '0'
        }
      })
    },
    portList() {
      return this.ports.map(port => ({
        ...port, // Spread operator to copy properties of the original port object
        icon: this.getPortData(port.name) // Add the `icon` property
      }))
    },
    systemCardData() {
      return this.getCard(this.fullStatusData?.custom_name || this.fullStatusData?.device_type || '-', this.getSystemColumns(this.fullStatusData))
    },
    groupCardData() {
      return this.getCard(this.$t('Group'), this.getGroupColumns(this.fullStatusData), '/site_manager/groups')
    },
    logsCardData() {
      const formatedErrors = this.fullStatusData?.errors?.map((error, index) => {
        const uniqueKey = error.timestamp + '_' + index
        return {
          uniqueKey,
          date: this.$localDate(error.timestamp),
          message: this.logErrorTranslates[error.name] || this.logErrorTranslates.default,
          details: error.err_msg,
          showDetails: this.expandedLogs.includes(uniqueKey)
        }
      })
      if (!formatedErrors) return []
      const splitErrors = formatedErrors.reduce((results, item, index) => {
        const chunkIndex = Math.floor(index / 3)
        if (!results[chunkIndex]) {
          results[chunkIndex] = []
        }
        results[chunkIndex].push(item)
        return results
      }, [])
      return splitErrors
    },
    lanCardData() {
      const extractLanData = interfaces => {
        const getInterface = name => interfaces.find(iface => iface.id === name) || null
        const lanIface = getInterface('lan')
        const isSwitch = !lanIface
        if (isSwitch) {
          const collectIps = (ifaces, ipKey) => ifaces.flatMap(iface => iface[ipKey] || []).filter(Boolean)
          const getProtocolIps = proto => {
            const ifaces = interfaces.filter(iface => iface.proto === proto && iface.enabled !== false)
            return { ipv4: collectIps(ifaces, 'ipaddrs'), ipv6: collectIps(ifaces, 'ip6addrs') }
          }
          return {
            macaddr: findKey(interfaces, 'macaddr'),
            isSwitch: true,
            staticIps: getProtocolIps('static'),
            dhcpIps: getProtocolIps('dhcp'),
            dhcp6Ips: getProtocolIps('dhcpv6')
          }
        }
        const dhcpIface = getInterface('dhcp')
        const isLanStatic = lanIface?.proto === 'static'
        const isLanDhcp = lanIface?.proto === 'dhcp' && lanIface.enabled !== false
        return {
          macaddr: findKey(interfaces, 'macaddr'),
          isSwitch: false,
          lanIp: isLanStatic ? lanIface.ipaddrs?.[0] : null,
          lan6Ip: isLanStatic ? lanIface.ip6addrs?.[0] : null,
          dhcpIp: (isLanDhcp ? lanIface.ipaddrs?.[0] : dhcpIface?.ipaddrs?.[0]) || null,
          dhcp6Ip: dhcpIface?.ip6addrs?.[0]
        }
      }
      const lanData = extractLanData(this.fullStatusData?.interfaces_status || [])
      return this.getCard('LAN', this.getLanColumns(lanData))
    },
    wirelessCardData() {
      return this.fullStatusData?.wireless_interfaces_status?.map(wireless => this.getCard(`${wireless.ssid} (${wireless.band})`, this.getWirelessColumns(wireless), '', 'wifi', wireless.up)) || []
    },
    portBlocks() {
      // Port amount in a single chunk (12 will be the static amount in switches with many ports)
      const chunk = 12
      // Breaks ports into separate blocks based on chunk size
      if (this.ports.length > chunk) {
        let i = -1
        this.ports.forEach((port, index) => {
          if (index % chunk === 0) i++
          port.block = i
        })
      }
      const blocks = [...new Set(this.ports.map(port => port.block))]
      return blocks.map(block => {
        const blockPorts = this.ports.filter(port => port.block === block)
        const upPorts = blockPorts.filter(port => (port.type === 'sfp' ? port.position === 'down' : port.position === 'up'))
        const downPorts = blockPorts.filter(port => (port.type === 'sfp' ? port.position === 'up' : port.position === 'down'))
        return { block, ports: [upPorts, downPorts] }
      })
    }
  },
  watch: {
    opened: function () {
      if (this.opened) {
        this.$timer.start({
          method: this.getStatusData,
          autostart: true,
          immediate: true,
          time: 5000
        })
        return
      }
      this.loading = true
      this.firstStatus = true
      this.$axios.cancelRequests('navigation')
      this.fullStatusData = {}
      this.time = {
        upTime: 0,
        localTime: 0
      }
      this.$timer.stop(this.getStatusData)
    }
  },
  methods: {
    toggleDetails(key) {
      if (this.expandedLogs.includes(key)) {
        this.expandedLogs = this.expandedLogs.filter(k => k !== key)
      } else {
        this.expandedLogs.push(key)
      }
    },
    getPortData(port) {
      const status = this.ports.find(status => status.id === port)
      const topology = this.topology.ports.find(topo => topo.name.toLowerCase() === port)
      let macs = []
      if (topology?.topology?.length) {
        macs = topology.topology.map(topo => topo.mac.trim().toLowerCase())
      }
      // Find if any MAC matches a device
      const deviceMac = macs.find(mac => this.devices.some(device => device.mac.trim().toLowerCase() === mac))
      let deviceData = null
      if (deviceMac) {
        deviceData = this.devices.find(device => device.mac.trim().toLowerCase() === deviceMac)
      }
      let formattedHint
      if (deviceData) {
        formattedHint = [
          {
            info: `<b>${this.$t('Name')}: </b>${deviceData.custom_name || deviceData.devicename.slice(0, 6)}`
          },
          { info: `<b>${this.$t('Model')}: </b>${deviceData.devicename.slice(0, 6)}` },
          { info: `<b>MAC: </b>${deviceMac}` }
        ]
      } else if (macs.length) {
        formattedHint = macs.map(mac => ({ info: `<b>MAC: </b>${mac}` }))
      } else {
        formattedHint = []
      }
      return {
        hint: status?.speed && status.speed !== '0' ? formattedHint : [],
        type: status?.speed && status.speed !== '0' ? 'up' : 'down'
      }
    },
    handleClick(id) {
      if (id === 'edit') this.$emit('edit', this.deviceSection.id)
      if (id === 'reboot') {
        this.$emit('reboot', [this.deviceSection])
      }
      if (id === 'upgrade') {
        this.$prompt({
          title: this.$t('Upgrade devices firmware?'),
          content: this.$t('Are you sure that you want to upgrade devices firmware?'),
          okText: this.$t('Proceed'),
          cancelText: this.$t('Cancel'),
          onOk: () => this.upgradeDevice()
        })
      }
    },
    upgradeDevice() {
      this.$emit('upgrade', this.deviceSection)
      this.$emit('close')
    },
    getStatusData() {
      return this.$axios
        .get(
          `/api/site_manager/devices/status_full/${this.deviceSection.mac}/?data=${
            this.deviceSection.device_type.includes('TSW') || this.deviceSection.device_type.includes('SWM')
              ? 'device_status,interfaces_status,port_status,topology'
              : 'device_status,interfaces_status,wireless_interfaces_status'
          }`
        )
        .then(deviceStatus => {
          this.fullStatusData = deviceStatus?.data || {}
          this.time.upTime = deviceStatus?.data?.device_status?.uptime_seconds || '-'
          this.time.localTime = deviceStatus?.data?.device_status?.localtime || '-'
          this.ports = deviceStatus?.data?.port_status || []
          this.topology = deviceStatus?.data?.topology || []
          this.loading = false
          if (this.firstStatus) {
            this.$timer.start({
              method: this.updateSystemTime,
              time: 1000,
              immediate: true,
              autostart: true
            })
          }
          this.firstStatus = false
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load device status data'))
        })
    },
    updateSystemTime() {
      if (this.time.upTime !== '-' && this.time.upTime !== '-') {
        this.time.upTime += 1
        this.time.localTime += 1
      }
      this.formatedSystemData.upTime = '%t'.format(this.time.upTime)
      this.formatedSystemData.localTime = this.$localDate(this.time.localTime)
    },
    getCard(title, columns, config, icon, isUp) {
      return {
        title,
        config,
        columns,
        icon,
        status: isUp ? 'primary' : 'disabled'
      }
    },
    getSystemColumns(data) {
      return [
        { label: this.$t('Uptime:'), value: this.formatedSystemData.upTime },
        {
          label: this.$t('Local device time:'),
          value: this.formatedSystemData.localTime
        },
        { label: this.$t('Firmware version:'), value: data?.firmware_version || '-' }
      ]
    },
    getGroupColumns(data) {
      return [{ label: this.$t('Name:'), value: data?.group_name || '-' }]
    },
    getLanColumns(data) {
      const toArray = val => (Array.isArray(val) ? val : val ? [val] : [])
      const createIpChildren = ips => [
        { label: 'IPv4', value: toArray(ips.ipv4).join(', ') || '-' },
        { label: 'IPv6', value: toArray(ips.ipv6).join(', ') || '-' }
      ]
      const addProtocolColumn = (label, ips) => {
        const hasIps = ips.ipv4?.length || ips.ipv6?.length
        if (!hasIps) return
        const totalCount = (ips.ipv4?.length || 0) + (ips.ipv6?.length || 0)
        const primaryIp = ips.ipv4?.[0] || ips.ipv6?.[0]
        columns.push({
          label,
          value: totalCount > 1 ? `${primaryIp} (+${totalCount - 1})` : primaryIp,
          children: createIpChildren(ips)
        })
      }
      const columns = [{ label: this.$t('MAC address:'), value: data.macaddr }]
      if (data.isSwitch) {
        addProtocolColumn(this.$t('Static:'), data.staticIps || {})
        addProtocolColumn('DHCP:', data.dhcpIps || {})
        addProtocolColumn('DHCPv6:', data.dhcp6Ips || {})
      } else {
        const hasStatic = Boolean(data.lanIp)
        const hasDhcp = Boolean(data.dhcpIp || data.dhcp6Ip)
        columns.push({
          label: this.$t('Mode:'),
          value: [hasStatic && this.$t('Static'), hasDhcp && 'DHCP'].filter(Boolean).join(' + ')
        })
        if (hasStatic) {
          columns.push({
            label: this.$t('Static IP address:'),
            value: data.lanIp,
            children: createIpChildren({ ipv4: data.lanIp, ipv6: data.lan6Ip })
          })
        }
        if (hasDhcp) {
          columns.push({
            label: this.$t('DHCP IP address:'),
            value: data.dhcpIp || '-',
            children: createIpChildren({ ipv4: data.dhcpIp, ipv6: data.dhcp6Ip })
          })
        }
      }
      return columns
    },
    getWirelessColumns(data) {
      const statusBadge = ({ up }) => ({
        size: 'sm',
        type: up ? 'success' : 'disabled',
        text: up ? this.$t('ON') : this.$t('OFF')
      })
      return [
        { label: this.$t('Status:'), badge: { ...statusBadge(data) } },
        { label: 'SSID:', value: data?.ssid || '-' },
        {
          label: this.$t('Mode:'),
          value: data?.mode ? this.$wireless.getMode(data.mode) : '-'
        },
        { label: this.$t('Channel:'), value: data.channel },
        { label: this.$t('Clients:'), value: data?.clients?.length || 0 }
      ]
    },
    handleUpgrade() {
      this.$spin()
      return this.$axios
        .post('/api/site_manager/devices/actions/upgrade_fota', {
          data: {
            mac: [this.fullStatusData.mac]
          }
        })
        .then(() => {
          this.$message.success(this.$t('Device firmware update started successfully'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to start device firmware update'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    clearLogs() {
      this.loading = true
      return this.$axios
        .post('/api/site_manager/devices/actions/clear_errors', {
          data: {
            mac: [this.deviceSection.mac]
          }
        })
        .then(() => {
          this.fullStatusData.errors = []
          this.$message.success(this.$t('Device logs cleared successfully'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to clear device logs'))
        })
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style scoped>
.side-widget-wrapper {
  height: 100%;
  width: 100%;
  flex: 1 1 auto;
  align-self: stretch;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-gutter: stable both-edges;
}

.side-widget-card-wrapper {
  padding: 0.6rem 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.side-widget-wrapper .spinner {
  position: absolute;
  top: 45%;
  left: 41%;
}
.table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
}
tr:not(:last-child) {
  border-bottom-width: 1px;
  border-bottom-color: #b3d8f7;
}
.smaller-ports {
  transform: scale(0.6);
}
.toggle-btn {
  background-repeat: no-repeat;
  background-position: center center;
  position: relative;
  width: 2.25rem;
  height: 2.25rem;
  margin-bottom: 0.6rem;
  border-radius: 5px;
  cursor: pointer;
  background-color: #e3e3e3;
}
.toggle-btn.active {
  background-color: #1976d2;
}
.toggle-btn + .toggle-btn {
  margin-left: 0.6rem;
}
.toggle-btn.disabled {
  cursor: auto;
}
.single-item-carousel :deep(button) {
  display: none !important;
}
</style>
