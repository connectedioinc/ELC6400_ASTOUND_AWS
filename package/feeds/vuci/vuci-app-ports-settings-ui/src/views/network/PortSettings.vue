<template>
  <tlt-card :title="$t('All ports')">
    <ports
      ref="ports"
      v-model="selectedPorts"
      :get-port-data="getPortData"
      :custom-ports="$ports.getRutosBoardPorts()"
      selectable
      multiple
    />
    <div class="flex justify-end">
      <tlt-button
        button-id="edit"
        :disabled="selectedPorts.length === 0"
        @click="$refs.modal.showModal = true"
      >
        {{ $store.readOnlyPage ? $t('View %d ports').format(selectedPorts.length) : $t('Edit %d ports').format(selectedPorts.length) }}
      </tlt-button>
    </div>
    <port-settings-edit
      ref="modal"
      v-model="portConfig"
      :selected-ports="selectedPorts"
      :board-ports="$ports.getRutosBoardPorts()"
      :port-status="portStatus"
    />
  </tlt-card>
  <tlt-table
    id="portStatus"
    ref="table"
    v-model:selected="selectedPorts"
    :columns="portsCols"
    :data-source="tableData"
    :title="$t('Port status')"
    @refresh="getData"
  >
    <template #budget="{ record }">
      {{ getPortPoePower(record.id) }}
    </template>
  </tlt-table>
</template>

<script>
import { markRaw } from 'vue'
import PortSettingsEdit from './PortSettingsEdit.vue'

export default {
  components: {
    PortSettingsEdit
  },
  data() {
    return {
      PortSettingsEdit: markRaw(PortSettingsEdit),
      selectedPorts: [],
      portConfig: [],
      portStatus: [],
      portsCols: [
        { dataIndex: 'name', title: this.$t('Port'), help: this.$t('Port ID.') },
        { dataIndex: 'link', title: this.$t('Status'), help: this.$t('Whether the current port is connected or not.') },
        { dataIndex: 'speed', title: this.$t('Speed'), help: this.$t('Port link speed. GbE - 1000 Mbps. FE - 100 Mbps. E - 10 Mbps.') },
        {
          dataIndex: 'duplex',
          title: this.$t('Duplex'),
          help: this.$t(
            'Bidirectional communication system that allows both end nodes to send and receive communication data or signals. Full - sends and receives simultaneously. Half - sends or receives one path at a time.'
          )
        },
        {
          dataIndex: 'budget',
          title: this.$t('PoE (W)'),
          help: this.$t('PoE port power usage in watts.'),
          show: this.$store.anyPoe
        }
      ]
    }
  },
  computed: {
    tableData() {
      if (this.portStatus.length === 0 || this.portConfig.length === 0) return []
      return this.portConfig
        .map(config => {
          const status = this.portStatus.find(status => status.id === config.id) ?? this.portStatus[0] ?? {}
          const duplex = status.state === 'up' ? (status.duplex === 'true' ? this.$t('Full-Duplex') : this.$t('Half-Duplex')) : '-'
          const link = status.enabled === '1' ? (status.state === 'up' ? this.$t('Connected') : this.$t('Disconnected')) : this.$t('Disabled')
          return {
            id: config.id,
            name: this.$ports.getPrettyPortId(config.id, false),
            speed: this.$ports.getPortSpeed(status),
            duplex,
            link
          }
        })
        .sort((a, b) => (a.name > b.name ? 1 : -1))
    }
  },
  created() {
    this.$timer.start({ method: this.getStatusData, time: 5000, autostart: true, immediate: false, group: 'edit' })
    this.getData()
  },
  methods: {
    async getData() {
      this.$spin()
      // timer stop is needed if this is data refresh
      this.$timer.stop(this.getStatusData)
      return this.$axios
        .bulkGet(['/api/ports_settings/config', '/api/ports_settings/status'])
        .then(([configResonse, statusResponse]) => {
          if (!configResonse.success) this.$message.error(this.$t('Failed to load ports config'))
          else this.portConfig = configResonse.data
          if (!statusResponse.success) this.$message.error(this.$t('Failed to load ports status'))
          else this.portStatus = statusResponse.data
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
          this.$timer.start(this.getStatusData)
        })
    },
    async getStatusData() {
      return this.$axios
        .get('/api/ports_settings/status')
        .then(({ data }) => {
          this.portStatus = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load ports status'))
        })
    },
    getPortPoePower(id) {
      const budget = this.portStatus.find(status => status.id === id)?.budget
      if (parseFloat(budget) > 0) return '%mW'.format(budget / 1000)
      return this.$store.isPoe(id) ? '-' : ''
    },
    getPortData(portName) {
      const status = this.portStatus.find(status => status.id === portName)
      return {
        hint: this.$ports.getRutPortHint(status),
        type: status?.enabled === '1' ? (status?.state === 'down' ? 'down' : 'up') : 'disabled',
        speed: this.$ports.getPortSpeedIcon(status),
        poe: this.$ports.getPoeState(status),
        error: status?.dot1x === 'UNAUTHORIZED' ? this.$t('Port is unauthorized.') : null
      }
    }
  }
}
</script>
