<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="modbus_client"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays Modbus Client general status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <tlt-form-model-item
        :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isStatusGood ? $t('Up') : $t('Down')"
          :class="isStatusGood ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isStatusGood"
          :value="displayUptime(tcpStatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      type="tcp_server"
      :edit-form="editModal"
      :title="$t('Modbus TCP devices')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/client/tcp/config' }]"
      data-key="modbusTcpClient"
      :after-delete="removeChildren"
      :global-settings-form="modbusGlobal"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="overviewColumns(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="$utils.valueOrBlank(s.name)"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
              :label="row.label"
            >
              <template #value>
                <tlt-hint :hints="row.hints">
                  <span :class="row.class">{{ row.value }}</span>
                </tlt-hint>
              </template>
            </cell-row>
          </card-cell>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="xl:min-w-max"
                  :actions="actions"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <tlt-hint :hints="getEnableHint(s)">
              <vuci-form-item-switch
                class="lg:min-w-max mb-0"
                :uci-section="s"
                name="enabled"
                :readonly="!canToggleEnable(s)"
              />
            </tlt-hint>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'pinia'
import EditForm from './ModbusEdit'
import modbusGlobal from '@/components/shared//ModbusGlobal'
import { useMainStore } from '@/stores/main'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions,
      form: () => this.globalEnabled
    }
  },
  data() {
    return {
      formData: {},
      editModal: markRaw(EditForm),
      modbusGlobal: markRaw(modbusGlobal),
      formOptions: {
        io: [],
        certificates: [],
        /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
        deviceList: [],
        phoneGroups: [],
        emailUsers: [],
        mounts: [],
        /** @type {import('@/types/tagTypes').ModbusServerTagConfig[]} */
        sourcedRegisters: [],
        tagStatus: {},
        dbSizesInPages: {}
      },
      globalEnabled: { globalStatus: 'firstLoad' },
      stateChanged: false,
      infoMessage: this.$t('%s service is disabled, navigate to global settings configuration to enable it.').format('Modbus client'),
      tcpStatusData: {}
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    isStatusGood() {
      return this.tcpStatusData.uptime !== undefined
    },
    databaseLocations() {
      const options = this.formOptions.mounts.map(device => `${device.mountpoint}/modbus_db`)
      return ['/tmp/modbus_db', ...options]
    }
  },
  watch: {
    'globalEnabled.globalStatus': function (value, oldValue) {
      if (oldValue === 'firstLoad') {
        if (!value) {
          this.$notification.info(this.infoMessage)
        }
      } else {
        this.stateChanged = true
      }
    },
    // Note: second state is watched because notification should only be created when modal is fully closed
    modalOpen(value) {
      if (!value && this.stateChanged) {
        this.stateChanged = false
        if (!this.globalEnabled.globalStatus) this.$notification.info(this.infoMessage)
        else this.$notification.remove(this.infoMessage)
      }
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    filterSchedules(val) {
      if (val.length > 50) return `${val.slice(0, 50).join(', ')}, ...`
      return val.join(', ')
    },
    getFormOptions() {
      return this.formOptions
    },
    displayFrequency(section) {
      if (section.period && section.frequency === 'period') {
        return section.period
      }
      if (section.schedule && section.frequency === 'schedule') {
        let shown = section.schedule.slice(0, 2).join(', ')
        if (section.schedule.length > 2) shown = `${shown}, ...`
        return shown
      }
      return '-'
    },
    updateStatus() {
      const dbStatusRequests = this.databaseLocations.map(dbPath => `/api/modbus/client/database/status?db_path=${dbPath}`)

      return this.$axios
        .bulkGet(['/api/modbus/client/tcp/status', ...dbStatusRequests])
        .then(([serviceStatus, ...dbStatuses]) => {
          if (serviceStatus.success) {
            this.tcpStatusData.uptime = serviceStatus.data.uptime
            this.formData.modbusTcpClient.forEach(client => {
              client.content = serviceStatus.data.tcp_servers?.find(s => s.id === client.id)
            })
          } else {
            this.$message.error(this.$t('Failed to load service status'))
          }

          const dbSizesInPages = {}
          this.formOptions.dbSizesInPages = dbSizesInPages
          for (const i in dbStatuses) {
            const dbPath = this.databaseLocations[i]
            const dbStatus = dbStatuses[i]

            if (dbStatus.success) {
              dbSizesInPages[dbPath] = dbStatus.data.size_in_pages
            }
          }

          if (dbStatuses.some(status => !status.success)) {
            this.$message.error(this.$t('Failed to load database status'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    loadData(form) {
      const overSchedulerLimit = form.modbusTcpClient.some(item => item.schedule && item.schedule.length > 255)
      if (overSchedulerLimit) this.$notification.info(this.$t('Schedule limit exceeded, all schedule configuration above 255 will be ignored'))
      const alarmRequests = form.modbusTcpClient.map(s => `/api/modbus/client/tcp/${s.id}/alarms/config`)
      const requestRequests = form.modbusTcpClient.map(s => `/api/modbus/client/tcp/${s.id}/requests/config`)
      const requests = [
        { endpoint: '/api/io/status', condition: this.$store.board.hwinfo.ios },
        '/api/certificates/config',
        '/api/basic/network/devices/status',
        '/api/modbus/client/global',
        { endpoint: '/api/recipients/phone_groups/config', condition: this.$store.board.hwinfo.mobile },
        '/api/recipients/email_users/config',
        { endpoint: '/api/usb_tools/mount/options', condition: this.$store.board.hwinfo.usb },
        { endpoint: '/api/modbus/server/tcp/registers/config', condition: this.$store.hasPackages('vuci-app-modbus-server-api.control') },
        '/api/universal_gateway/status?client_service=modbus_client',
        ...alarmRequests,
        ...requestRequests
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([io, cert, devices, global, phoneGroups, emailUsers, mounts, sourcedRegisters, tagStatus, ...rest]) => {
          if (global.success) {
            this.globalEnabled.globalStatus = global.data.enabled === '1'
          } else {
            this.$message.error(this.$t('Failed to load Modbus client global data'))
          }
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          this.formOptions.io = io.success && io.data ? io.data : []
          if (io.success && !io.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
          this.formOptions.certificates = cert.success ? cert.data.generated : []
          this.formOptions.deviceList = devices.success ? devices.data : []
          this.formOptions.phoneGroups = phoneGroups.success ? phoneGroups.data : []
          this.formOptions.emailUsers = emailUsers.success ? emailUsers.data : []
          this.formOptions.mounts = mounts.success ? mounts.data : []
          this.formOptions.sourcedRegisters = sourcedRegisters.success ? sourcedRegisters.data : []
          this.formOptions.tagStatus = tagStatus.success ? tagStatus.data : []
          if (!cert.success) this.$message.error(this.$t('Failed to load certificate data'))
          if (!io.success) this.$message.error(this.$t('Failed to load io status'))
          if (!devices.success) this.$message.error(this.$t('Failed to load network device status'))
          if (!phoneGroups.success) this.$message.error(this.$t('Failed to load phone groups'))
          if (!emailUsers.success) this.$message.error(this.$t('Failed to load email users'))
          if (!mounts.success) this.$message.error(this.$t('Failed to load storage device data'))
          if (!sourcedRegisters.success) this.$message.error(this.$t('Failed to load Modbus TCP server registers data'))
          if (!tagStatus.success) this.$message.error(this.$t('Failed to load universal gateway status'))
          const uciData = {}
          const half = Math.floor(rest.length / 2)
          const responsesAlarms = rest.splice(0, half)
          const responsesRequests = rest
          responsesAlarms.forEach((response, index) => {
            const sectionID = form.modbusTcpClient[index].id
            if (response.success) {
              uciData[`${sectionID}_alarm`] = response.data
            } else {
              this.$message.error(this.$t('Failed to load alarm data for %s server.').format(sectionID))
            }
          })
          responsesRequests.forEach((response, index) => {
            const sectionID = form.modbusTcpClient[index].id
            if (response.success) {
              uciData[`${sectionID}_request`] = response.data
            } else {
              this.$message.error(this.$t('Failed to load request data for %s server.').format(sectionID))
            }
          })
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },
    removeChildren(self) {
      this.formData[`${self.id}_request`] = []
      this.formData[`${self.id}_alarm`] = []
    },
    canToggleEnable(section) {
      return !(!section.dev_ipaddr || (section.frequency === 'period' && !section.period) || (section.frequency === 'schedule' && !section.schedule))
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    aggregateStats(arr) {
      return arr
        ? arr.reduce(
            (acc, curr) => {
              acc.failed += curr.failed_count ?? 0
              acc.successful += curr.successful_count
              return acc
            },
            { failed: 0, successful: 0 }
          )
        : {}
    },
    overviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = !!Object.keys(statusData).length

      const aggregatedStats = {
        requests: this.aggregateStats(statusData.requests),
        alarms: this.aggregateStats(statusData.alarms)
      }

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          },
          { label: this.$t('ID'), value: this.$utils.valueOrBlank(item.server_id) },
          { label: this.$t('IP address'), value: this.$utils.valueOrBlank(item.dev_ipaddr) }
        ],
        [
          {
            label: this.$t('Frequency'),
            value: this.displayFrequency(item),
            hints: item.frequency === 'schedule' && item.schedule && item.schedule.length > 2 ? [{ info: this.filterSchedules(item.schedule) }] : []
          },
          { label: this.$t('Timeout'), value: this.$utils.valueOrBlank(item.timeout) }
        ],
        [
          { label: this.$t('Successful requests'), value: this.displayNumber(aggregatedStats.requests.successful) },
          { label: this.$t('Failed requests'), value: this.displayNumber(aggregatedStats.requests.failed) },
          { label: this.$t('Triggered alarms'), value: this.displayNumber(aggregatedStats.alarms.successful) }
        ]
      ]

      return { item, columns }
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    }
  }
}
</script>
