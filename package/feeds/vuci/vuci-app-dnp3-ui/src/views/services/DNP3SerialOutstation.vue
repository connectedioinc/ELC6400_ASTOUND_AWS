<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    :before-save="validate"
    config="dnp3_outstation"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays DNP3 Outstation general status information.')"
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
          :value="displayUptime(outstationStatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      type="dnp3_serial_outstation"
      :title="$t('DNP3 Serial Outstation configuration')"
      :help="$t('This section displays DNP3 serial outstation instances currently existing on the router.')"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dnp3/serial_outstation/config' }]"
      data-key="outstation"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
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
                <div class="flex items-center gap-1">
                  <span :class="row.class">{{ row.value }}</span>
                  <tlt-hint
                    v-if="row.errorHint"
                    :hints="[{ info: row.errorHint }]"
                  >
                    <tlt-icon
                      icon="error"
                      class="text-theme-text-danger size-5"
                    />
                  </tlt-hint>
                </div>
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
                service="DNP3 Serial Outstation"
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
          v-model="addModel['name']"
          :label="$t('New configuration name')"
          prop="name"
          maxlength="200"
          :help="$t('Name of the new DNP3 serial outstation configuration. Used for easier configurations management purpose only.')"
        />
        <tlt-form-item-select
          v-model="addModel['device']"
          :label="$t('Device name')"
          prop="device"
          :options="devices"
          required
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
import DNP3SerialOutstationEdit from './DNP3SerialOutstationEdit.vue'
import SerialHint from '@/components/shared/SerialHint'

export default {
  components: { SerialHint },
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      formOptions: {
        serial: [],
        device: [],
        status: []
      },
      editModal: markRaw(DNP3SerialOutstationEdit),
      formData: {},
      outstationStatusData: {}
    }
  },
  computed: {
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    isStatusGood() {
      return this.outstationStatusData.uptime !== undefined
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    displayDevices(value) {
      return this.$serial.deviceDisplayValue(value) || '-'
    },
    deviceUnavailable() {
      return this.$t('Device is unavailable')
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    updateStatus() {
      return this.$axios
        .get('/api/dnp3/serial_outstation/status')
        .then(({ data }) => {
          this.outstationStatusData.uptime = data.uptime
          this.formData.outstation.forEach(outstation => {
            outstation.content = data.servers?.find(s => s.id === outstation.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData() {
      return this.$axios
        .bulkGet(['/api/system/device/status', '/api/serial/status'])
        .then(([serial, status]) => {
          this.formOptions.serial = serial.success && serial.data.board.serial ? serial.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.status = status.success ? status.data : []
          if (!serial.success) this.$message.error(this.$t('Failed to load serial data'))
          if (!status.success) this.$message.error(this.$t('Failed to load rs serial status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions.status, this.formData.outstation, 'DNP3 Serial Outstation')
    },
    getStatusError(errorCode) {
      const errorMessages = {
        0: this.$t('Failed to start server'),
        1: this.$t('The TCP port is already in use')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    overviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = statusData?.open
      const errorHint = this.getStatusError(statusData?.server?.open_error)

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: errorHint
          }
        ],
        [{ label: this.$t('Device'), value: this.displayDevices(item.device) }]
      ]

      return { item, columns }
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    canToggleEnable(section) {
      return section.device && section.baudrate && section.databits && section.stopbits && section.parity && section.flowcontrol
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
