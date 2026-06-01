<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="modbus_server"
    :before-save="validate"
  >
    <vuci-typed-section
      type="rtu_device"
      :title="$t('Modbus serial server configuration')"
      :help="$t('This section displays Modbus Serial Server instances currently existing on the router.')"
      :edit-form="serverEditModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/server/serial/config' }]"
      data-key="modbusSerialServer"
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
                  <tlt-hint
                    v-if="row.crb_error"
                    :hints="[{ info: row.crb_error }]"
                  >
                    <tlt-icon
                      icon="warning"
                      class="text-theme-text-warning size-5"
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
                :hidden="s.enabled === '1' || !!getEnableMessage(s)"
                service="Modbus Serial Server"
              >
                <vuci-form-item-switch
                  class="lg:min-w-max mb-0"
                  :uci-section="s"
                  name="enabled"
                  :readonly="disabled || !!getEnableMessage(s)"
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
          required
          :help="$t('Name of the new Modbus Serial Server configuration. Used for easier configurations management purpose only.')"
        />
        <tlt-form-item-select
          v-model="addModel['device']"
          :label="$t('Device name')"
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
import ServerEditForm from './ModbusSerialServerEdit'
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
      serverEditModal: markRaw(ServerEditForm),
      formOptions: {
        serial: [],
        status: [],
        tcp: [],
        device: []
      },
      formData: {},
      enableMessages: {
        missingRequires: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values'),
        repeatingRegfiles: this.$t('Cannot enable multiple instances with the same register file path')
      }
    }
  },
  computed: {
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
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
        .get('/api/modbus/server/serial/status')
        .then(({ data }) => {
          this.formData.modbusSerialServer.forEach(modbus => {
            modbus.content = data.find(s => s.section === modbus.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData() {
      const requests = ['/api/system/device/status', '/api/serial/status', '/api/modbus/server/tcp/config']
      return this.$axios
        .bulkGet(requests)
        .then(([serial, status, tcp]) => {
          this.formOptions.serial = serial.success && serial.data.board.serial ? serial.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.status = status.success ? status.data : []
          this.formOptions.tcp = tcp.success ? tcp.data : []
          if (!tcp.success) this.$message.error(this.$t('Failed to load tcp server data'))
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
      return this.$serial.validateBeforeSave(this.formOptions.status, this.formData.modbusSerialServer, 'Modbus Serial Server')
    },
    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start server'),
        2: this.$t('The TCP port is already in use'),
        3: this.$t('The TCP address is not available'),
        4: this.$t('Could not open serial port')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    overviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = statusData?.uptime !== undefined
      const error = this.getStatusError(statusData?.error_code)

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: error,
            crb_error: statusData?.crb_error ? this.$t('Failed to create custom register block: permission denied') : ''
          },
          { label: this.$t('Device'), value: this.displayDevices(item.device) }
        ],
        [
          { label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) },
          { label: this.$t('Time since last request'), value: this.displayTime(statusData?.time_since_last_request) }
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
    displayTime(time) {
      return time || time === 0 ? '%t'.format(time) : '-'
    },
    getEnableMessage(section) {
      if (!(section.name && section.device && section.md_data_type && section.baudrate && section.databits && section.stopbits && section.parity && section.flowcontrol)) {
        return this.enableMessages.missingRequires
      }
      if (section.clientregs === '1' && section.regfile) {
        const regfile = section.regfile.replace('/var', '/tmp')
        if (this.formData.modbusSerialServer.some(s => s.id !== section.id && s.enabled === '1' && s.clientregs === '1' && s.regfile.replace('/var', '/tmp') === regfile)) {
          return this.enableMessages.repeatingRegfiles
        }
      }
    },
    getEnableHint(section) {
      const message = this.getEnableMessage(section)
      return message ? [{ info: message }] : []
    }
  }
}
</script>
