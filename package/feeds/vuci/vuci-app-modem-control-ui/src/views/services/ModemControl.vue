<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="rs_modem"
    :before-save="validate"
  >
    <vuci-typed-section
      type="modem"
      :title="$t('Modem configuration')"
      :help="$t('This section displays Modem instances currently existing on the router.')"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modem_control/config' }]"
      data-key="modem"
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
                service="RS Modem"
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
          :help="$t('Name of the new Modem configuration. Used for easier configurations management purpose only.')"
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
import ModemEdit from './ModemControlEdit.vue'
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
        mobile: []
      },
      editModal: markRaw(ModemEdit),
      formData: {},
      statusMap: {}
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
        .get('/api/modem_control/status')
        .then(({ data }) => {
          this.formData.modem.forEach(m => {
            m.content = data.find(s => s.section === m.id)
            this.statusMap[m.id] = m.content
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData() {
      return this.$axios
        .bulkGet(['/api/system/device/status', '/api/serial/status', '/api/modems/status'])
        .then(([deviceStatus, status, modem]) => {
          this.formOptions.serial = deviceStatus.success && deviceStatus.data.board.serial ? deviceStatus.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.status = status.success ? status.data : []
          this.formOptions.mobile = modem.success ? this.$mobile.modemsOptions(modem.data) : []
          this.formOptions.modem = deviceStatus.success && deviceStatus.data.board.modems ? deviceStatus.data.board.modems : []
          if (!deviceStatus.success) this.$message.error(this.$t('Failed to load device data'))
          if (!modem.success) this.$message.error(this.$t('Failed to load mobile data'))
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
      return new Promise((resolve, reject) => {
        const fullyControlled = this.formData.modem.some(instance => instance.ctl_mode === 'full' && instance.enabled === '1')
        const enabledDevices = this.formData.modem.filter(instance => instance.enabled === '1')
        const response = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.modem, 'RS Modem', false)
        if (fullyControlled && enabledDevices.length > 1) reject(this.$t('Can not enable additional instance when device is fully controlled'))
        if (!response.isValid) reject(response.message)
        else resolve()
      })
    },
    overviewColumns(item) {
      const statusData = this.statusMap[item.id] || {}
      const isStatusGood = statusData?.uptime !== undefined

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          },
          { label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) }
        ],
        [
          { label: this.$t('Device'), value: this.displayDevices(item.device) },
          {
            label: this.$t('Last time data sent'),
            value: statusData?.last_time_data_sent !== '-1' ? this.displayTime(statusData?.last_time_data_sent) : '-'
          }
        ],
        [
          { label: this.$t('RX'), value: '%MB'.format(statusData?.rx) },
          { label: this.$t('TX'), value: '%MB'.format(statusData?.tx) }
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
    canToggleEnable(section) {
      return section.baudrate && section.databits && section.stopbits && section.parity && section.flowcontrol && section.device && section.ctl_mode
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
