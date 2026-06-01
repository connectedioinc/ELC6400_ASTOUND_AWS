<template>
  <tlt-card :title="$t('Topology')">
    <div class="flex justify-center w-full border md:h-full">
      <zoomist-container
        ref="zoomist-container"
        :init-scale="zoomInitScale"
        :max-scale="zoomMaxScale"
        :min-scale="zoomMinScale"
        :zoom-ratio="zoomRatio"
        :wheelable="false"
      >
        <div class="h-full md:h-[60dvh] flex justify-center items-center">
          <div
            ref="topology-view"
            class="py-8 px-1 sm:px-2 xl:px-12 w-full max-w-[1200px] flex flex-col xl:flex-row"
          >
            <div class="relative h-full xl:w-[170px] 2xl:w-[200px] xl:py-8 self-center">
              <div class="w-full flex h-full items-center flex-col xl:flex-row">
                <div class="flex flex-col gap-1 justify-center items-center relative">
                  <span class="p-2 bg-theme-bg-primary-3/[0.07] rounded-full flex items-center justify-center">
                    <tlt-icon
                      icon="mobile"
                      class="size-8 p-1 text-theme-text-primary"
                    />
                  </span>
                  <span class="xl:absolute bottom-0 xl:translate-y-full xl:pt-1 font-semibold">{{ name }}</span>
                </div>
                <div class="grow h-4 xl:h-0.5 bg-theme-border-base w-0.5 xl:w-auto" />
                <tlt-button
                  :readonly="scanningWanOrLan || wanInterfaces.length === 0"
                  button-id="scan-all"
                  size="sm"
                  @click="startScanInterfaces()"
                >
                  {{ $t('Scan all') }}
                </tlt-button>
                <div class="grow h-4 xl:h-0.5 bg-theme-border-base w-0.5 xl:w-auto" />
              </div>
            </div>
            <div class="flex xl:flex-col grow">
              <div class="flex flex-col xl:grid xl:grid-cols-[2fr_3fr] w-1/2 xl:w-auto">
                <div class="flex flex-col xl:flex-row items-center justify-center">
                  <div class="h-0.5 xl:h-1/2 bg-theme-border-base w-1/2 xl:w-0.5 self-end" />
                  <div class="w-0.5 xl:w-16 2xl:w-24 h-8 xl:h-0.5 bg-theme-border-base shrink-0" />
                  <div class="flex flex-col gap-1 justify-center items-center relative">
                    <span class="p-2 bg-theme-bg-primary-3/[0.07] rounded-full flex items-center justify-center">
                      <tlt-icon
                        icon="network"
                        class="size-8 p-1 text-theme-text-primary"
                      />
                    </span>
                    <span class="xl:absolute bottom-0 xl:translate-y-full xl:pt-1 font-semibold">{{ $t('WAN') }}</span>
                  </div>
                  <div class="grow w-0.5 h-4 xl:h-0.5 bg-theme-border-base" />
                  <div class="relative flex flex-col justify-center items-center">
                    <tlt-button
                      size="sm"
                      button-id="scan-wan"
                      :readonly="scanningWanOrLan || wanInterfaces.length === 0"
                      @click="startScanInterfaces('wan')"
                    >
                      {{ $t('Scan WAN') }}
                    </tlt-button>
                    <div class="block xl:hidden grow w-0.5 h-4 bg-theme-border-base" />
                    <span class="xl:hidden pb-2 font-semibold">{{ `${wanInterfaces.length} ${wanInterfaces.length === 1 ? $t('interface') : $t('interfaces')}` }}</span>
                    <div
                      v-show="scanningWan"
                      class="xl:absolute xl:-translate-y-full xl:-translate-x-1/2 xl:left-1/2 bottom-4 w-max flex items-center gap-1"
                    >
                      <tlt-icon
                        icon="spinner"
                        class="text-theme-text-primary size-6"
                        animate
                      /><span class="text-theme-text-secondary-subtle">{{ $t('Scanning WAN') }}</span>
                    </div>
                    <p
                      v-show="!scanningWan && parsedWanDevices.length === 0"
                      class="xl:absolute xl:-translate-y-7 text-theme-text-secondary-subtle"
                    >
                      {{ $t('No devices') }}
                    </p>
                  </div>
                  <div class="grow h-0.5 bg-theme-border-base" />
                </div>
                <div
                  v-if="wanInterfaces.length !== 0"
                  class="hidden xl:flex flex-col w-full py-8 full-height-border"
                >
                  <div
                    v-for="x in wanInterfaces"
                    :key="x.ip"
                    :class="`flex items-center ${wanInterfaces.length !== 1 && `half-height-border`}`"
                  >
                    <div class="w-16 2xl:w-24 h-0.5 bg-theme-border-base shrink-0" />
                    <div class="flex flex-col py-3">
                      <div class="flex items-center gap-3">
                        <span class="p-2 bg-theme-bg-primary-3/[0.07] rounded-full flex items-center justify-center">
                          <tlt-icon
                            :icon="`${x.type === 'wan' && x.proto === 'wwan' ? 'mobile' : x.type === 'wan' ? 'wired' : x.type === 'wifi' ? 'wifi' : 'interface'}`"
                            class="size-8 p-1 text-theme-text-primary"
                          />
                        </span>
                        <div class="flex flex-col xl:py-3 items-center xl:items-start gap-1 xl:gap-0">
                          <p class="font-semibold text-sm">
                            {{ $network.getName(x) }}
                          </p>
                          <span class="text-sm whitespace-nowrap">IPv4: {{ x.ip || '-' }}</span>
                          <span class="text-sm whitespace-nowrap">IPv6: {{ x.ipv6 || '-' }}</span>
                          <span
                            :class="{ 'cursor-pointer bg-theme-bg-success': activeDevicesWan(x) }"
                            class="font-semibold px-4 py-0.5 rounded-full flex bg-theme-bg-secondary-1 text-theme-text-on-secondary text-[10px] w-fit mt-1 text-xs"
                            @click="activeDevicesWan(x) ? setInterfaceFilter(x.name) : () => {}"
                            >{{ $t('%s devices').format(activeDevicesWan(x)) }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="hidden xl:flex flex-col py-8"
                >
                  <div class="flex items-center gap-3 h-[58px] my-3">
                    <div class="w-16 2xl:w-24 h-0.5 bg-theme-border-base shrink-0" />
                    <tlt-icon
                      icon="empty"
                      class="size-8 p-1 text-theme-text-primary"
                    />
                    <p class="text-theme-text-secondary-subtle">
                      {{ $t('No active interfaces') }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex flex-col xl:inline-grid xl:grid-cols-[2fr_3fr] w-1/2 xl:w-auto">
                <div class="flex flex-col xl:flex-row items-center justify-center">
                  <div class="h-0.5 xl:h-1/2 bg-theme-border-base w-1/2 xl:w-0.5 self-start" />
                  <div class="w-0.5 xl:w-16 2xl:w-24 h-8 xl:h-0.5 bg-theme-border-base shrink-0" />
                  <div class="flex flex-col gap-1 justify-center items-center relative">
                    <span class="p-2 bg-theme-bg-primary-3/[0.07] rounded-full flex items-center justify-center">
                      <tlt-icon
                        icon="lan"
                        class="size-8 p-1 text-theme-text-primary"
                      />
                    </span>
                    <span class="xl:absolute bottom-0 xl:translate-y-full xl:pt-1 font-semibold">{{ $t('LAN') }}</span>
                  </div>
                  <div class="grow w-0.5 h-4 xl:h-0.5 bg-theme-border-base" />
                  <div class="relative flex flex-col justify-center items-center">
                    <tlt-button
                      size="sm"
                      button-id="scan-lan"
                      :readonly="scanningWanOrLan || (lanInterfaces.length === 0 && wanInterfaces.length === 0)"
                      @click="startScanInterfaces('lan')"
                    >
                      {{ $t('Scan LAN') }}
                    </tlt-button>
                    <div class="block xl:hidden grow w-0.5 h-4 bg-theme-border-base" />
                    <span class="xl:hidden pb-2 font-semibold">{{ `${lanInterfaces.length} ${lanInterfaces.length === 1 ? $t('interface') : $t('interfaces')}` }}</span>
                    <div
                      v-show="scanningLan"
                      class="xl:absolute xl:-translate-y-full xl:-translate-x-1/2 xl:left-1/2 bottom-4 w-max flex items-center gap-1"
                    >
                      <tlt-icon
                        icon="spinner"
                        class="text-theme-text-primary size-6"
                        animate
                      /><span class="text-theme-text-secondary-subtle">{{ $t('Scanning LAN') }}</span>
                    </div>
                    <p
                      v-show="!scanningLan && parsedLanDevices.length === 0"
                      class="xl:absolute xl:-translate-y-7 text-theme-text-secondary-subtle"
                    >
                      {{ $t('No devices') }}
                    </p>
                  </div>
                  <div class="grow h-0.5 bg-theme-border-base" />
                </div>
                <div
                  v-if="lanInterfaces.length !== 0"
                  class="hidden xl:flex flex-col w-full py-8 full-height-border"
                >
                  <div
                    v-for="x in lanInterfaces"
                    :key="x.ip"
                    :class="`flex items-center ${lanInterfaces.length !== 1 && `half-height-border`}`"
                  >
                    <div class="w-16 2xl:w-24 h-0.5 bg-theme-border-base shrink-0" />
                    <div class="flex flex-col py-3">
                      <div class="flex items-center gap-3">
                        <span class="p-2 bg-theme-bg-primary-3/[0.07] rounded-full flex items-center justify-center">
                          <tlt-icon
                            :icon="`${x.type === 'lan' ? 'wired' : x.type === 'wifi' ? 'wifi' : 'interface'}`"
                            class="size-8 p-1 text-theme-text-primary"
                          />
                        </span>
                        <div class="flex flex-col xl:py-3 items-center xl:items-start gap-1 xl:gap-0">
                          <p class="font-semibold text-sm">
                            {{ $network.getName(x) }}
                          </p>
                          <span class="text-sm whitespace-nowrap">IPv4: {{ x.ip || '-' }}</span>
                          <span class="text-sm whitespace-nowrap">IPv6: {{ x.ipv6 || '-' }}</span>
                          <span
                            :class="{ 'cursor-pointer bg-theme-bg-success': activeDevicesLan(x) }"
                            class="font-semibold px-4 py-0.5 rounded-full flex bg-theme-bg-secondary-1 text-theme-text-on-secondary text-[10px] w-fit mt-1 text-xs"
                            @click="activeDevicesLan(x) ? setInterfaceFilter(x.name) : () => {}"
                            >{{ $t('%s devices').format(activeDevicesLan(x)) }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="hidden xl:flex flex-col py-8"
                >
                  <div class="flex items-center gap-3 h-[58px] my-3">
                    <div class="w-16 2xl:w-24 h-0.5 bg-theme-border-base shrink-0" />
                    <tlt-icon
                      icon="empty"
                      class="size-8 p-1 text-theme-text-primary"
                    />
                    <p class="text-theme-text-secondary-subtle">
                      {{ $t('No active interfaces') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </zoomist-container>
    </div>
  </tlt-card>
  <tlt-table
    id="scan-results"
    ref="scan-results-table"
    :columns="scanResultsColumns"
    :data-source="parsedScanResults"
    :title="$t('Topology scan results')"
    :no-value-text="$t('There are no devices')"
    :per-page-text="$t('Devices per page')"
    pagination
    search
    :initial-per-page="50"
    :table-actions="['column-list', 'search']"
  >
    <template #active="{ record }">
      <tlt-hint class="ml-2">
        <div
          class="inline-block align-text-bottom m-2 rounded-full size-1.5"
          :class="{ 'bg-theme-bg-warning': record.active === undefined, 'bg-theme-bg-danger': record.active === '0', 'bg-theme-bg-success': record.active === '1' }"
        />
        <template #hintBox>
          <ul>
            <li>{{ $t('Status: %s').format(parseStatus(record.active)) }}</li>
            <li class="break-all">{{ $t('Hostname: %s').format(record.hostname || '-') }}</li>
          </ul>
        </template>
      </tlt-hint>
    </template>
    <!-- slots for tx_bytes and rx_bytes used because of sorting not working correctly with displayFn on columns -->
    <template #tx_bytes="{ record }">
      <span>{{ '%MB%s'.format(record.tx_bytes, '/s') }}</span>
    </template>
    <template #rx_bytes="{ record }">
      <span>{{ '%MB%s'.format(record.rx_bytes, '/s') }}</span>
    </template>
    <template #ip="{ record }">
      <div class="flex gap-1">
        <a
          :href="`http://${parseIp(record.ip)}`"
          target="_blank"
        >
          <tlt-button
            type="text"
            icon="external-link"
            size="md"
            class="inline"
          />
        </a>
        <tlt-dummy-value
          :value="record.ip"
          class="min-w-0"
        />
      </div>
    </template>
  </tlt-table>
</template>

<script>
import ZoomistContainer from '@/components/zoomist/ZoomistContainer.vue'

export default {
  components: { ZoomistContainer },
  data() {
    return {
      zoomMaxScale: 2.5,
      zoomMinScale: 0.25,
      zoomInitScale: 1,
      zoomRatio: 0.25,
      connections: [],
      connectionsHistory: {
        previous: [],
        last: []
      },
      totalUsage: [],
      name: this.$store.deviceInfo.static.hostname,
      scanningWan: false,
      scanningLan: false,
      isWanScanned: true,
      isLanScanned: true,
      interfaces: [],
      devices: [],
      firstLoad: true,
      deviceStatuses: {
        undefined: { hover: this.$t('device was not found in latest scan'), filter: this.$t('Not found') },
        0: { hover: this.$t('this device is Down'), filter: this.$t('Down') },
        1: { hover: this.$t('this device is Up'), filter: this.$t('Up') }
      },
      scanResultsColumnsDefault: [
        { dataIndex: 'active', title: this.$t('Status'), actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: this.parseStatusFilter, width: 'w-16' },
        { dataIndex: 'ip', title: this.$t('IP address'), actions: { sort: true }, width: 'sm' },
        { dataIndex: 'mac', title: this.$t('MAC address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'name', title: this.$t('Interface'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'port', title: this.$t('Port'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'xs', displayFn: v => v || '-' },
        { dataIndex: 'type', title: this.$t('Type'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'xs', displayFn: v => (v === 'wifi' ? this.$t('wireless') : v) }
      ]
    }
  },
  timers: {
    getScanResults: { time: 2000, autostart: false, immediate: false },
    getConnectionsAndUsage: { time: 10000, autostart: false, repeat: true, immediate: true }
  },
  computed: {
    scanResultsColumns() {
      return !this.nlbwmonExists
        ? this.scanResultsColumnsDefault
        : this.scanResultsColumnsDefault.concat([
            { dataIndex: 'rx_bytes', title: this.$t('Download'), actions: { sort: true }, width: 'xs' },
            { dataIndex: 'tx_bytes', title: this.$t('Upload'), actions: { sort: true }, width: 'xs' }
          ])
    },
    nlbwmonExists() {
      return this.$store.hasPackages('nlbwmon.control')
    },
    lanInterfaces() {
      return this.interfaces.filter(x => x.type === 'lan' && x.status)
    },
    wanInterfaces() {
      const ifaces = this.interfaces.filter(x => x.type === 'wan' && x.status)
      return this.mergeInterfaces(ifaces)
    },
    wifiInterfaces() {
      return this.interfaces.filter(x => x.type === 'wifi')
    },
    uniqueWanInterfaces() {
      return [...new Set(this.wanInterfaces.map(this.$network.getName))]
    },
    uniqueLanAndWifiInterfaces() {
      return [...new Set(this.lanInterfaces.map(this.$network.getName)), ...this.wifiInterfaces.map(this.$network.getName)]
    },
    uniqueIpDevices() {
      return this.mapDevices(this.devices)
    },
    parsedWanDevices() {
      return this.uniqueIpDevices.filter(x => this.uniqueWanInterfaces.includes(this.$network.getName(x)))
    },
    parsedLanDevices() {
      return this.uniqueIpDevices.filter(x => this.uniqueLanAndWifiInterfaces.includes(this.$network.getName(x)))
    },
    parsedDevices() {
      return [...this.parsedLanDevices, ...this.parsedWanDevices]
    },
    wanInterfacesDeviceIpPairs() {
      return this.wanInterfaces.reduce((result, item) => {
        if (item.ip) result.push(`${item.device}:${item.ip}`)
        if (item.ipv6) result.push(`${item.device}:${item.ipv6}`)
        return result
      }, [])
    },
    lanInterfacesDeviceIpPairs() {
      return this.lanInterfaces.reduce((result, item) => {
        if (item.ip) result.push(`${item.device}:${item.ip}`)
        if (item.ipv6) result.push(`${item.device}:${item.ipv6}`)
        return result
      }, [])
    },
    scanningWanOrLan() {
      return this.scanningLan || this.scanningWan
    },
    parsedScanResults() {
      if (!this.connectionsHistory.previous.length || !this.connectionsHistory.last.length) return this.parsedDevices
      return this.parsedDevices.map(device => {
        const connectionsPrevious = this.connectionsHistory.previous.filter(con => con.src_ip === device.ip && con.src_mac === device.mac)
        const connectionsLast = this.connectionsHistory.last.filter(con => con.src_ip === device.ip && con.src_mac === device.mac)
        if (this.nlbwmonExists) {
          const keysToSubstract = ['rx_bytes', 'tx_bytes']
          connectionsLast.forEach(con => keysToSubstract.forEach(key => (!(key in device) ? (device[key] = con[key]) : (device[key] += con[key]))))
          connectionsPrevious.forEach(con => keysToSubstract.forEach(key => (device[key] -= con[key])))
          keysToSubstract.forEach(key => (device[key] = Math.max(0, device[key] / 10))) // substract by getConnectionsAndUsage, show 0 instead of negative number if reset happens in back-end
        }
        return device
      })
    }
  },
  created() {
    this.initialize()
  },
  methods: {
    // merges interfaces with same 'interface' property
    mergeInterfaces(interfaces) {
      return Object.values(
        interfaces.reduce((res, obj) => {
          if (!res[obj.interface]) res[obj.interface] = { ...obj }
          else Object.assign(res[obj.interface], obj)
          return res
        }, {})
      )
    },
    parseIp(ip) {
      this.$VuciValidator.value = ip
      return this.$VuciValidator.ip4addr().isValid ? ip : `[${ip}]`
    },
    parseStatus(active) {
      return this.deviceStatuses[active].hover
    },
    parseStatusFilter(value) {
      return this.deviceStatuses[value].filter
    },
    activeDevicesLan(val) {
      const lanDevices = this.parsedLanDevices.filter(x => x.name === val.name)
      const relatedWifiInterfaces = this.wifiInterfaces.filter(x => x.network === val.interface && x.network !== x.interface).map(n => n.interface)
      const relatedLanDevicesToWifi = this.parsedLanDevices.map(x => x.interface).filter(x => undefined !== relatedWifiInterfaces.find(n => n === x))
      return lanDevices.length + relatedLanDevicesToWifi.length
    },
    activeDevicesWan(val) {
      return this.parsedWanDevices.filter(x => x.name === val.name).length
    },
    mapDevices(devices) {
      return devices.filter((obj, index) => devices.findIndex(item => item.ip === obj.ip) === index)
    },
    getConnectionsAndUsage() {
      return this.$axios
        .get('/api/network_usage/transfers/day/status')
        .then(res => {
          if (this.scanningLan || this.scanningWan || !Object.keys(res.data).length) return
          if (!res.success) this.$message.error(this.$t('Failed to load connections data'))
          else {
            this.connections = res.data
            const lastKey = Object.keys(this.connections)[Object.keys(this.connections).length - 1]
            if (this.firstLoad) this.connectionsHistory.last = this.connections[lastKey]
            else {
              this.connectionsHistory.previous = this.connectionsHistory.last
              this.connectionsHistory.last = this.connections[lastKey]
            }
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.firstLoad = false
        })
    },
    onScanStartSuccess(type) {
      this.$timer.start('getScanResults')
      if (type) {
        this[`is${this.$capitalize(type)}Scanned`] = false
        this[`scanning${this.$capitalize(type)}`] = true
      } else {
        this.scanningLan = true
        this.scanningWan = true
      }
    },
    onScanStartError(type, error) {
      this[`scanning${this.$capitalize(type)}`] = false
      if (error.message === 'start_later') return this.$message.error(this.$t('Scanning failed to start due to unknown reason. Please try again later.'))
      this.$message.error(this.$t('Failed to scan WAN and LAN active devices'))
    },
    getScanResults() {
      return this.$axios
        .get('/api/topology/scan/status')
        .then(({ data }) => {
          if (data[0].stop !== 0) {
            this.$timer.stop('getScanResults')
            this.$message.success(this.$t('Scanning has ended'))
            this.scanningWan = false
            this.scanningLan = false
            this.updateTopologyView()
          }
          this.devices = data[0].results
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get scan results.'))
        })
    },
    startScanInterfaces(type) {
      if (type) this[`scanning${this.$capitalize(type)}`] = true
      else {
        this.scanningLan = true
        this.scanningWan = true
      }
      const data = type ? this[`${type}InterfacesDeviceIpPairs`] : [...this.wanInterfacesDeviceIpPairs, ...this.lanInterfacesDeviceIpPairs]
      return this.$axios
        .post('/api/topology/actions/start_scan', { data: { device: data } })
        .then(({ data }) => {
          if (!data.started) throw new Error('start_later')
          this.$refs['scan-results-table'].clearAllFilters()
          this.devices = []
          this.onScanStartSuccess(type)
        })
        .catch(error => {
          this.onScanStartError(type ? this.$capitalize(type) : null, error)
        })
    },
    setInterfaceFilter(iface) {
      this.$refs['scan-results-table'].$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      this.$refs['scan-results-table'].setFilters('name', [iface])
    },
    async updateTopologyView() {
      this.zoomInitScale = this.zoomMinScale
      await this.$nextTick()
      this.$refs['zoomist-container'].zoomInstance?.reset()
      const { height: zoomContainerHeight, width: zoomContainerWidth } = this.$refs['zoomist-container'].zoomInstance.getContainerData()
      const { offsetHeight: topologyViewHeight, offsetWidth: topologyViewWidth } = this.$refs['topology-view']
      const heightRatio = zoomContainerHeight / topologyViewHeight
      const widthRatio = zoomContainerWidth / topologyViewWidth
      this.zoomInitScale = Math.min(heightRatio, widthRatio, 1)
      await this.$nextTick()
      this.$refs['zoomist-container'].resetZoomAndScale()
    },
    async initialize() {
      this.$spin()
      await this.$axios
        .bulkGet(['/api/topology/status', '/api/topology/scan/status'])
        .then(([topologyStatusData, scanHistoryData]) => {
          if (topologyStatusData.success) {
            this.interfaces = topologyStatusData.data.interfaces
            this.devices = scanHistoryData.data?.[0]?.results ?? []
          } else this.$message.error(this.$t('Failed to load LAN and WAN interfaces'))
          if (scanHistoryData.success) {
            if (scanHistoryData.data?.[0]?.stop === 0) {
              this.scanningLan = true
              this.scanningWan = true
              this.$timer.start('getScanResults')
            }
            this.scanHistory = scanHistoryData.data
          } else this.$message.error(this.$t('Failed to load scan history data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.updateTopologyView()
          if (this.nlbwmonExists) this.$timer.start('getConnectionsAndUsage')
          this.$spin(false)
        })
    }
  }
}
</script>
<style scoped>
.half-height-border:last-child::before,
.half-height-border:first-child::before {
  content: '';
  width: 1px;
  height: 50%;
  background-color: var(--color-theme-bg-secondary-subtle);
}
.half-height-border:first-child::before {
  align-self: end;
}
.half-height-border:last-child::before {
  align-self: start;
}
.full-height-border > *:not(:last-child):not(:first-child)::before {
  content: '';
  width: 1px;
  height: 100%;
  background-color: var(--color-theme-bg-secondary-subtle);
}
</style>
