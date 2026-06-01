<template>
  <tlt-card :title="$t('Network usage')">
    <template #title-content>
      <tlt-button
        button-id="global-settings"
        color="tertiary"
        icon-left="settings"
        class="ml-auto px-3! max-lg:hidden"
        @click="globalSettingsModal = true"
      >
        <span>{{ $t('Global settings') }}</span>
      </tlt-button>
    </template>
    <tlt-modal
      :open="globalSettingsModal"
      @close="closeGlobalSettingsModal"
    >
      <tlt-form
        :model="globalSettingsForm"
        sid="global_sesttings"
        :title="$t('Global settings')"
      >
        <tlt-form-item-switch
          v-model="globalSettingsForm.enabled"
          :label="$t('Network usage tracking')"
          true-value="1"
          false-value="0"
          prop="enabled"
        />
        <tlt-form-item-switch
          v-model="globalSettingsForm.save_history"
          :label="$t('Save history')"
          true-value="1"
          false-value="0"
          prop="save_history"
          :help="$t('Network traffic data is being recorded every last 12 hours.')"
        />
        <template #applyButton>
          <div class="flex justify-end">
            <tlt-button
              button-id="saveandapply"
              @click="saveGlobalSettings"
            >
              {{ $t('Save & Apply') }}
            </tlt-button>
          </div>
        </template>
      </tlt-form>
    </tlt-modal>
    <tlt-popover
      :target="`#tab-${tabs[0].name}`"
      :content="$t('Connections over the past 12 hours.')"
      triggers="hover"
    />
    <tlt-tabs :tabs="tabs">
      <template #usage>
        <tlt-table
          id="usage"
          :columns="totalUsageColumns"
          :data-source="parsedTotalUsage"
          :title="$t('Total usage')"
          :no-value-text="$t('There are no connections')"
          :per-page-text="$t('Connections per page')"
          pagination
          search
          :table-actions="['delete-data', 'column-list', 'search', 'total-usage-badge']"
        >
          <template #total-usage-badge>
            <div class="flex gap-2 flex-wrap w-full justify-end mt-2.5">
              <template v-if="totalUsageIntervalDisabled">
                <tlt-popover
                  v-for="badge in totalUsageIntervalsDisabled"
                  :key="badge[0]"
                  :target="`#button-badge-${badge[0]}`"
                  triggers="hover"
                  placement="bottom-end"
                >
                  {{ $t('Enable “Save History” in') }}
                  <router-link to="/status/network/network_usage#global_settings">
                    {{ $t('Global settings') }}
                  </router-link>
                  {{ badge[1] }}
                </tlt-popover>
              </template>
              <badge-select
                id="usage-intervals-badge"
                :options="totalUsageIntervals"
                :model-value="totalUsageInterval"
                :disabled-options="totalUsageIntervalDisabled ? ['week', 'month', 'total'] : []"
                @update:model-value="val => intervalChange(val)"
              />
            </div>
          </template>
          <template #delete-data>
            <table-action
              id="delete-data"
              icon-left="delete"
              @click="showDeleteDataPrompt('delete-data-total-usage', 'metrics')"
            >
              <span>{{ $t('Delete data') }}</span>
            </table-action>
          </template>
          <template #active="{ record }">
            <tlt-hint>
              <template #hintBox>
                <ul>
                  <li>
                    {{ $t('Status: %s').format(parseStatus(record.active)) }}
                    <template v-if="record.active === '2'">
                      {{ $t('Navigate to') }}
                      <router-link to="/status/network/topology">
                        {{ $t('Topology') }}
                      </router-link>
                      {{ $t('map to scan devices.') }}
                    </template>
                  </li>
                  <li class="break-all">
                    {{ $t('Hostname: %s').format(record.hostname || '-') }}
                  </li>
                </ul>
              </template>
              <div
                class="mx-2 rounded-full size-1.5 inline-block align-middle"
                :class="{
                  'bg-theme-bg-warning': record.active === undefined,
                  'bg-theme-bg-danger': record.active === '0',
                  'bg-theme-bg-success': record.active === '1',
                  'bg-theme-bg-secondary-1': record.active === '2'
                }"
              />
            </tlt-hint>
          </template>
          <template #src_ip="{ record }">
            <div class="flex items-center">
              <a
                :href="`http://${parseIp(record.src_ip)}`"
                target="_blank"
                class="mb-auto mr-1"
              >
                <tlt-button
                  type="text"
                  icon="external-link"
                  size="md"
                  button-id="external-link"
                />
              </a>
              <tlt-overflow-hint :hints="[{ info: record.src_ip }]">
                {{ record.src_ip }}
              </tlt-overflow-hint>
            </div>
          </template>
          <!-- slots for tx_bytes and rx_bytes used because of sorting not working correctly with displayFn on columns -->
          <template #tx_bytes="{ record }">
            <span>{{ '%MB'.format(record.tx_bytes) }}</span>
          </template>
          <template #rx_bytes="{ record }">
            <span>{{ '%MB'.format(record.rx_bytes) }}</span>
          </template>
        </tlt-table>
      </template>
      <template #connections>
        <tlt-table
          id="connections"
          :columns="connectionsColumns"
          :data-source="parsedConnections"
          :title="$t('Connections')"
          :help="$t('Connections over the past 12 hours.')"
          :no-value-text="$t('There are no connections')"
          :per-page-text="$t('Connections per page')"
          pagination
          search
          :table-actions="['delete-data', 'column-list', 'search']"
        >
          <template #delete-data>
            <table-action
              id="delete-data"
              icon-left="delete"
              @click="showDeleteDataPrompt('delete-data-connections', 'transfers')"
            >
              <span>{{ $t('Delete data') }}</span>
            </table-action>
          </template>
          <template #active="{ record }">
            <tlt-hint>
              <div
                class="m-2 rounded-full size-1.5"
                :class="{
                  'bg-theme-bg-warning': record.active === undefined,
                  'bg-theme-bg-danger': record.active === '0',
                  'bg-theme-bg-success': record.active === '1',
                  'bg-theme-bg-secondary-1': record.active === '2'
                }"
              />
              <template #hintBox>
                <ul>
                  <li>{{ $t('Status: %s').format(parseStatus(record.active)) }}</li>
                  <li class="break-all">{{ $t('Hostname: %s').format(record.hostname || '-') }}</li>
                </ul>
              </template>
            </tlt-hint>
          </template>
          <template #src_ip="{ record }">
            <div class="flex items-center">
              <a
                :href="`http://${parseIp(record.src_ip)}`"
                target="_blank"
                class="mb-auto mr-1"
              >
                <tlt-button
                  type="text"
                  icon="external-link"
                  size="md"
                  button-id="external-link"
                />
              </a>
              <tlt-overflow-hint :hints="[{ info: record.src_ip }]">
                {{ record.src_ip }}
              </tlt-overflow-hint>
            </div>
          </template>
          <!-- slots for tx_bytes and rx_bytes used because of sorting not working correctly with displayFn on columns -->
          <template #tx_bytes="{ record }">
            <span>{{ '%MB'.format(record.tx_bytes) }}</span>
          </template>
          <template #rx_bytes="{ record }">
            <span>{{ '%MB'.format(record.rx_bytes) }}</span>
          </template>
        </tlt-table>
      </template>
    </tlt-tabs>
    <tlt-modal
      :open="!!deleteDataModal"
      @close="deleteDataModal = false"
    >
      <tlt-card :title="$t('Delete all &quot;%s&quot; data').format(deleteDataText[deleteDataModal])">
        <span>{{ $t('This process cannot be undone.') }}</span>
      </tlt-card>
    </tlt-modal>
  </tlt-card>
</template>

<script>
import { copy } from '@ui-core/utils/vue-helpers'
import BadgeSelect from '@/components/shared/BadgeSelect.vue'

export default {
  components: {
    BadgeSelect
  },
  data() {
    return {
      globalSettingsModal: false,
      globalSettingsForm: {},
      deleteDataModal: false,
      deleteDataText: {
        'delete-data-total-usage': this.$t('Total usage'),
        'delete-data-connections': this.$t('Connections')
      },
      topologyScanned: false,
      connections: [],
      connectionsHistory: {
        previous: [],
        last: []
      },
      totalUsage: [],
      name: this.$store.device,
      interfaces: [],
      devices: [],
      firstLoad: true,
      totalUsageIntervals: [
        ['day', this.$t('Day')],
        ['week', this.$t('Week')],
        ['month', this.$t('Month')],
        ['total', this.$t('Total')]
      ],
      totalUsageIntervalsDisabled: [
        ['week', this.$t('to view the total usage for the entire week.')],
        ['month', this.$t('to view the total usage for the entire month.')],
        ['total', this.$t('to view the total usage.')]
      ],
      totalUsageInterval: 'day',
      totalUsageIntervalDisabled: false,
      deviceStatuses: {
        undefined: { hover: this.$t('device was not found in latest scan'), filter: this.$t('Not found') },
        0: { hover: this.$t('this device is Down'), filter: this.$t('Down') },
        1: { hover: this.$t('this device is Up'), filter: this.$t('Up') },
        2: { hover: this.$t('unknown.'), filter: this.$t('Unknown') }
      },
      tabs: [
        { name: 'usage', title: this.$t('Total usage') },
        { name: 'connections', title: this.$t('Connections') }
      ],
      connectionsColumns: [
        { dataIndex: 'active', title: this.$t('Status'), actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: this.parseStatusFilter, width: 'w-18' },
        { dataIndex: 'src_ip', title: this.$t('Source IP address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'src_mac', title: this.$t('Source MAC address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'dst_ip', title: this.$t('Destination IP address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'layer7', title: this.$t('Protocol'), actions: { filter: { type: 'uniqueValues' } }, displayFn: v => this.$capitalize(v) || '', width: 'xs' },
        { dataIndex: 'conns', title: this.$t('Connections'), actions: { sort: true }, width: 'xs' },
        { dataIndex: 'rx_bytes', title: this.$t('Download'), actions: { sort: true }, width: 'xs' },
        { dataIndex: 'tx_bytes', title: this.$t('Upload'), actions: { sort: true }, width: 'xs' }
      ],
      totalUsageColumns: [
        { dataIndex: 'active', title: this.$t('Status'), actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: this.parseStatusFilter, width: 'w-18' },
        { dataIndex: 'src_ip', title: this.$t('Source  IP address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'src_mac', title: this.$t('Source MAC address'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'sm' },
        { dataIndex: 'conns', title: this.$t('Connections'), actions: { sort: true }, width: 'xs' },
        { dataIndex: 'rx_bytes', title: this.$t('Download'), actions: { sort: true }, width: 'xs' },
        { dataIndex: 'tx_bytes', title: this.$t('Upload'), actions: { sort: true }, width: 'xs' }
      ]
    }
  },
  timers: {
    getConnectionsAndUsage: { time: 10000, autostart: false, repeat: true, immediate: true }
  },
  computed: {
    activeInterfaces() {
      return [...new Set(this.interfaces.filter(x => x.status))]
    },
    interfacesIp() {
      return this.activeInterfaces.reduce((result, item) => {
        if (item.ip) result.push(item.ip.split('/')[0])
        if (item.ipv6) result.push(item.ipv6.split('/')[0])
        return result
      }, [])
    },
    parsedConnections() {
      const combinedData = copy(Object.values(this.connections)).flat()
      return this.formatData(combinedData, ['src_ip', 'src_mac', 'layer7'], ['rx_bytes', 'tx_bytes', 'conns'])
    },
    parsedTotalUsage() {
      const combinedData = copy(Object.values(this.totalUsage)).flat()
      return this.formatData(combinedData, ['src_ip', 'src_mac'], ['rx_bytes', 'tx_bytes', 'conns'])
    },
    currentTotalUsageInterval() {
      return this.totalUsageIntervals.find(x => x[0] === this.totalUsageInterval)[0]
    }
  },
  watch: {
    '$route.hash': {
      handler(newVal) {
        if (newVal === '#global_settings') this.globalSettingsModal = true
      }
    },
    globalSettingsModal(newVal) {
      if (newVal) this.$router.push({ hash: '#global_settings' })
    }
  },
  created() {
    this.initLoad()
  },
  methods: {
    parseIp(ip) {
      this.$VuciValidator.value = ip
      return this.$VuciValidator.ip4addr().isValid ? ip : `[${ip}]`
    },
    mapDevices(devices) {
      return devices.filter((obj, index) => devices.findIndex(item => item.ip === obj.ip) === index)
    },
    parseStatus(active) {
      return this.deviceStatuses[active]?.hover
    },
    parseStatusFilter(value) {
      return this.deviceStatuses[value]?.filter
    },
    intervalChange(interval) {
      this.totalUsageInterval = interval
      this.$timer.restart('getConnectionsAndUsage')
    },
    closeGlobalSettingsModal() {
      this.globalSettingsModal = false
      this.$router.push({ hash: '' })
    },
    formatData(data, commonFields, fieldsToSum) {
      const newArr = []
      data.forEach(instance => {
        const itemIndex = newArr.findIndex(item => commonFields.every(field => item[field] === instance[field]))
        if (itemIndex === -1) newArr.push(instance)
        else fieldsToSum.forEach(field => (newArr[itemIndex][field] += instance[field]))
        const device = this.devices.find(device => device.ip === instance.src_ip && device.mac === instance.src_mac)
        if (device?.hostname) instance.hostname = device.hostname
        if (this.interfacesIp.includes(instance.src_ip)) return (instance.active = '1')
        if (!this.topologyScanned) return (instance.active = '2')
        if ('active' in instance) return
        if (device?.active) instance.active = device.active
      })
      return newArr.sort((a, b) => a.conns - b.conns)
    },
    initLoad() {
      this.$spin()
      return this.$axios
        .bulkGet(['/api/network_usage/global', '/topology/scan/status?limit=1', '/api/topology/status'])
        .then(([globalSettingsData, scanHistoryData, topologyStatusData]) => {
          if (topologyStatusData.success) this.interfaces = topologyStatusData.data.interfaces
          else this.$message.error(this.$t('Failed to load topology status data'))
          if (globalSettingsData.success) {
            this.totalUsageIntervalDisabled = globalSettingsData.data.save_history === '0'
            this.globalSettingsForm = globalSettingsData.data
          } else this.$message.error(this.$t('Failed to load global settings data'))
          if (scanHistoryData.success) {
            this.topologyScanned = scanHistoryData.data.length > 0
            this.devices = scanHistoryData.data[0]?.results ?? []
          } else this.$message.error(this.$t('Failed to load topology scan data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start('getConnectionsAndUsage')
          this.$spin(false)
        })
    },
    getConnectionsAndUsage() {
      if (this.firstLoad) this.$spin()
      return this.$axios
        .bulkGet(['/api/network_usage/transfers/day/status', `/api/network_usage/metrics/${this.currentTotalUsageInterval}/status`])
        .then(([connectionsData, usageData]) => {
          if (!connectionsData.success) this.$message.error(this.$t('Failed to load connections data'))
          else {
            this.connections = connectionsData.data
            const lastKey = Object.keys(this.connections)[Object.keys(this.connections).length - 1]
            if (this.firstLoad) this.connectionsHistory.last = this.connections[lastKey]
            else {
              this.connectionsHistory.previous = this.connectionsHistory.last
              this.connectionsHistory.last = this.connections[lastKey]
            }
          }
          if (!usageData.success) this.$message.error(this.$t('Failed to load data usage data'))
          else this.totalUsage = usageData.data
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          if (this.firstLoad) this.$spin(false)
          this.firstLoad = false
        })
    },
    saveGlobalSettings() {
      this.$spin()
      return this.$axios
        .put('/api/network_usage/global', { data: this.globalSettingsForm })
        .then(({ data }) => {
          this.globalSettingsForm = data
          if (data.save_history === '0') {
            this.totalUsageIntervalDisabled = true
            this.intervalChange('day')
          } else this.totalUsageIntervalDisabled = false
          this.$message.success(this.$t('Configuration has been applied'))
        })
        .catch(() => this.$message.error(this.$t('Failed to edit configuration')))
        .finally(() => {
          this.closeGlobalSettingsModal()
          this.$spin(false)
        })
    },
    showDeleteDataPrompt(deleteType, type) {
      return this.$prompt.show({
        title: this.$t('Delete all "%s" data').format(this.deleteDataText[deleteType]),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.deleteData(type)
      })
    },
    deleteData(type) {
      this.$spin(this.$t('Deleting data'))
      return this.$axios
        .post('/api/network_usage/actions/delete_data', { data: { type } })
        .then(() => {
          this.$message.success(this.$t('Data deleted succesfully'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to delete data'))
        })
        .finally(() => {
          this.$spin(false)
          this.$timer.restart('getConnectionsAndUsage')
        })
    }
  }
}
</script>
