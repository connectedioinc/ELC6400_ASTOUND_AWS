<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dnp3_client"
    :after-load="loadData"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays DNP3 Client general status information.')"
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
          :value="displayUptime(dnp3StatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      type="serial_client"
      :title="$t('Serial clients')"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'dnp3/serial/config' }]"
      :uci-data="uciData"
      data-key="dnp3"
      :error-handlers="{ edit: returnErrorMessage }"
      :global-settings-form="dnp3Global"
      :after-delete="clearRequests"
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
            :value="s.name || '-'"
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
                <span :class="row.class">{{ row.value }}</span>
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
              <serial-hint
                v-slot="{ disabled }"
                :serial-status="formOptions.status"
                :serial-devices="formOptions.serial"
                :device="s.device"
                :hidden="s.enabled === '1' || !canToggleEnable(s)"
                service="DNP3 Serial Client"
              >
                <vuci-form-item-switch
                  class="lg:min-w-max mb-0"
                  :uci-section="s"
                  name="enabled"
                  :readonly="disabled || !canToggleEnable(s)"
                />
              </serial-hint>
            </tlt-hint>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('New configuration name')"
          prop="name"
          maxlength="32"
          :help="$t('Name of the DNP3 serial client configuration.')"
        />
        <tlt-form-item-select
          v-model="addModel.device"
          :label="$t('Serial port')"
          prop="device"
          :options="devices"
          :placeholder="$t('Serial device is unavailable')"
          :help="$t('Device that is bound to the created section. Routers serial ports or USB port with a serial adapter attached can be used.')"
        />
      </template>
      <template #action-design="{ actions }">
        <tlt-hint
          v-if="!devices.length"
          :hints="[{ info: $t('Serial device must be available when creating a new instance.') }]"
        >
          <tlt-button
            button-id="add"
            :readonly="!devices.length"
            @click="actions.create"
          >
            {{ $t('Add') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { useMainStore } from '@/stores/main'
import { mapState } from 'pinia'
import EditForm from './DNP3SerialClientEdit.vue'
import commonFunctions from './Dnp3CommonFunctionsMixin.vue'
import SerialHint from '@/components/shared/SerialHint'
import dnp3Global from './DNP3Global.vue'

export default {
  components: { SerialHint },
  mixins: [commonFunctions],
  provide() {
    return {
      formOptions: this.getFormOptions,
      form: () => this.globalEnabled
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      dnp3Global: markRaw(dnp3Global),
      formOptions: {
        serial: [],
        status: [],
        devices: []
      },
      formData: {},
      dnp3StatusData: {}
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    isStatusGood() {
      return this.dnp3StatusData.uptime !== undefined
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    updateStatus() {
      return this.$axios
        .get('/api/dnp3/serial/status')
        .then(({ data }) => {
          this.dnp3StatusData.uptime = data.uptime
          this.formData.dnp3.forEach(dnp => {
            dnp.content = data.clients?.find(s => s.id === dnp.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData(uciData) {
      return this.$axios
        .bulkGet(['/api/serial/status', '/api/system/device/status'])
        .then(([status, serial]) => {
          this.formOptions.status = status.success ? status.data : []
          this.formOptions.serial = serial.success && serial.data.board.serial ? serial.data.board.serial : []
          this.formOptions.devices = this.devices
          if (!serial.success) this.$message.error(this.$t('Failed to load serial data'))
          if (!status.success) this.$message.error(this.$t('Failed to load serial status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .then(() => this.afterLoad(uciData, 'serial'))
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },

    canToggleEnable(section) {
      return section.time_duration && section.local_addr && section.remote_addr && section.integrity_period && section.timeout
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    overviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = statusData?.connected

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          },
          { label: this.$t('Device'), value: this.displayInfo(this.$serial.deviceDisplayValue(item.device)) }
        ],
        [
          { label: this.$t('Local Address'), value: this.displayInfo(item.local_addr) },
          { label: this.$t('Remote Address'), value: this.displayInfo(item.remote_addr) }
        ],
        [
          { label: this.$t('Successful requests'), value: this.displayNumber(statusData?.successful_request_count) },
          { label: this.$t('Failed requests'), value: this.displayNumber(statusData?.failed_request_count) }
        ]
      ]

      return { item, columns }
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    displayInfo(value) {
      return value || '-'
    }
  }
}
</script>
