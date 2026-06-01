<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="rs_ntrip"
    :after-load="loadDevices"
    :before-save="validate"
  >
    <vuci-typed-section
      :uci-data="uciData"
      type="ntrip"
      data-key="ntrip"
      :title="$t('NTRIP configuration')"
      :endpoints="[{ endpoint: 'ntrip/config' }]"
      :edit-form="editModal"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
      :add-validate="onAdd"
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
            <serial-hint
              v-slot="{ disabled }"
              :serial-status="formOptions.status"
              :serial-devices="formOptions.serial"
              :device="s.device"
              :hidden="s.enabled === '1'"
              service="NTrip"
            >
              <vuci-form-item-switch
                class="lg:min-w-max mb-0"
                :uci-section="s"
                name="enabled"
                :readonly="disabled"
              />
            </serial-hint>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('New configuration name')"
          prop="name"
          maxlength="200"
          :help="$t('Name of the new RS NTRIP configuration. Used for easier configurations management purpose only.')"
        />
        <tlt-form-item-select
          v-model="addModel.device"
          :label="$t('Device name')"
          prop="device"
          :options="devices"
          :placeholder="$t('Serial device is unavailable')"
          :help="$t('Device that is bound to the created section. Routers serial ports or USB port with a serial adapter attached can be used.')"
          required
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
import EditForm from './NtripEdit'
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
      formData: {},
      editModal: markRaw(EditForm),
      formOptions: {
        serial: [],
        device: [],
        status: []
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
    updateStatus() {
      return this.$axios
        .get('/api/ntrip/status')
        .then(({ data }) => {
          this.formData.ntrip.forEach(n => {
            n.content = data.find(s => s.section === n.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadDevices() {
      const endpoints = ['/api/system/device/status', '/api/serial/status']
      return this.$axios
        .bulkGet(endpoints)
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
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    deviceUnavailable() {
      return this.$t('Device is unavailable')
    },
    onAdd(_, dataSource) {
      return {
        valid: dataSource.length < 20,
        message: this.$t('Cannot create more instances. Only 20 instances are allowed')
      }
    },
    isNmeaSourceValid(section) {
      if (section.nmea_source === '1') {
        return section.user_nmea
      } else if (section.nmea_source === '2') {
        return section.longitude && section.lattitude
      } else {
        return true
      }
    },
    isConfigurationComplete(section) {
      const isEnabled = section.enabled === '1'
      return !isEnabled || (this.isNmeaSourceValid(section) && section.ntrip_ip && section.ntrip_port && section.ntrip_mount_point)
    },
    validate() {
      return new Promise((resolve, reject) => {
        const response = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.ntrip, 'NTrip', false)
        if (!response.isValid) return reject(response.message)

        const allConfigurationsComplete = this.formData.ntrip.every(this.isConfigurationComplete)
        if (!allConfigurationsComplete)
          return reject(
            this.$t('The service cannot be enabled due to missing essential configuration options. Navigate to the edit modal to update your configuration before attempting to enable the service')
          )
        else resolve()
      })
    },
    displayStage(stage) {
      const stateMessages = {
        0: this.$t('Unknown'),
        1: this.$t('Disconnected'),
        2: this.$t('Connecting'),
        3: this.$t('Authenticating'),
        4: this.$t('Connected'),
        5: this.$t('Waiting for GPS'),
        6: this.$t('Waiting for serial')
      }
      return stateMessages[stage] || '-'
    },
    overviewColumns(item) {
      const statusData = item.content || {}
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
          { label: this.$t('Device'), value: this.$serial.deviceDisplayValue(item.device) || '-' },
          { label: this.$t('Stage'), value: this.displayStage(statusData?.stage) }
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
    }
  }
}
</script>
