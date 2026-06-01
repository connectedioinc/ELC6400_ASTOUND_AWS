<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="rs_modbus"
    :before-save="validate"
  >
    <vuci-typed-section
      type="modbus"
      :title="$t('Modbus TCP over serial configuration')"
      :help="$t('This section displays Modbus TCP over serial instances currently existing on the router.')"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'modbus/tcp_over_serial/config' }]"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
      data-key="overSerial"
      :after-delete="removeIpFilters"
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
                service="Modbus TCP over Serial Gateway"
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
          :help="$t('Name of the new modbus TCP over serial configuration. Used for easier configurations management purpose only.')"
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
          :hints="[{ info: $t('Serial device must be available when creating a new configuration.') }]"
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
import ModbusTCPOverSerialEdit from './ModbusTCPOverSerialEdit.vue'
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
        status: [],
        zones: []
      },
      formData: {},
      editModal: markRaw(ModbusTCPOverSerialEdit)
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
    deviceUnavailable() {
      return this.$t('Device is unavailable')
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    getFormOptions() {
      return this.formOptions
    },
    displayDevices(value) {
      return this.$serial.deviceDisplayValue(value) || '-'
    },
    updateStatus() {
      return this.$axios
        .get('/api/modbus/tcp_over_serial/status')
        .then(({ data }) => {
          this.formData.overSerial.forEach(device => {
            device.content = data.find(s => s.section === device.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData(form) {
      const filterRequests = form.overSerial.map(data => `/api/modbus/tcp_over_serial/${data.id}/filters/config`)
      const requests = ['/api/system/device/status', '/api/serial/status', '/api/firewall/zones/config', ...filterRequests]
      return this.$axios
        .bulkGet(requests)
        .then(response => {
          const serial = response.shift()
          const status = response.shift()
          const zone = response.shift()
          const uciData = {}
          if (serial.success && serial.data.board.serial) {
            this.formOptions.serial = serial.data.board.serial
          } else if (!serial.success) {
            this.$message.error(this.$t('Failed to load serial data'))
          }
          if (status.success) {
            this.formOptions.status = status.data
          } else {
            this.$message.error(this.$t('Failed to load serial status'))
          }
          if (zone.success) {
            this.formOptions.zones = zone.data.map(element => [element.name, element.name.toUpperCase()])
          } else {
            this.$message.error(this.$t('Failed to load firewall zones'))
          }
          this.formOptions.device = this.devices
          response.forEach((response, index) => {
            const sectionName = form.overSerial[index].id
            if (response.success) {
              uciData[sectionName] = response.data
            } else {
              this.$message.error(this.$t('Failed to load Modbus TPC over serial filters for %s instance.').format(sectionName))
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
    removeIpFilters(self) {
      this.formData[self.id] = []
    },
    validate() {
      return new Promise((resolve, reject) => {
        const response = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.overSerial, 'Modbus TCP over Serial Gateway', false)
        if (!response.isValid) reject(response.message)
        resolve()
      })
    },

    canToggleEnable(section) {
      return section.modbus_ip && section.modbus_port
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },

    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start gateway'),
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
            errorHint: error
          }
        ],
        [
          { label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) },
          { label: this.$t('Device'), value: this.displayDevices(item.device) }
        ],
        [
          { label: this.$t('TCP to serial messages'), value: this.displayNumber(statusData?.tcp_to_serial_count) },
          { label: this.$t('Serial to TCP messages'), value: this.displayNumber(statusData?.serial_to_tcp_count) }
        ]
      ]

      return { item, columns }
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayTime(time) {
      return time || time === 0 ? '%t'.format(time) : '-'
    }
  }
}
</script>
