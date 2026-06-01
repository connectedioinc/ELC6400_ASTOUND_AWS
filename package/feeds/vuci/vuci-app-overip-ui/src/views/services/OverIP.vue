<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="rs_overip"
    :before-save="validate"
  >
    <vuci-typed-section
      type="overip"
      :title="$t('Over IP configuration')"
      :help="$t('This section displays Over IP instances currently existing on the router.')"
      :edit-form="editModal"
      :edit-form-props="{ certificates, firewallZones, serialStatus, serialDevices }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'overip/config' }]"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
      data-key="overip"
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
            :value="$utils.valueOrBlank(s.name)"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            :class="column.width"
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
                :serial-status="serialStatus"
                :serial-devices="serialDevices"
                :device="s.device"
                :hidden="s.enabled === '1' || !canToggleEnable(s)"
                service="OverIP"
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
          :help="$t('Name of the new Over IP configuration. Used for easier configurations management purpose only.')"
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
import editOverIP from './OverIPEdit'
import SerialHint from '@/components/shared/SerialHint'
import useOveripUtils from './useOveripUtils.js'

export default {
  components: { SerialHint },
  data() {
    const { loadDataForEdit } = useOveripUtils()

    return {
      loadDataForEdit,
      statusMap: {},

      certificates: [],
      firewallZones: [],
      serialStatus: [],
      serialDevices: [],

      editModal: markRaw(editOverIP),
      formData: {}
    }
  },
  computed: {
    devices() {
      return this.$serial.listDeviceNameTuples(this.serialDevices)
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start service'),
        2: this.$t('The port is already in use')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    overviewColumns(item) {
      const statusData = this.statusMap[item.id] !== undefined ? this.statusMap[item.id] : item.content
      const isStatusGood = statusData?.uptime !== undefined
      const error = this.getStatusError(statusData?.error_code || item.content?.error_code)

      let lastTimeDataSent = '-'
      if (isStatusGood && statusData?.last_time_data_sent !== '-1') {
        lastTimeDataSent = '%t'.format(statusData?.last_time_data_sent)
      }

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: error
          },
          { label: this.$t('Device'), value: this.$serial.deviceDisplayValue(item.device) || '-' },
          { label: this.$t('Mode'), value: this.displayMode(item.mode) || '-' }
        ],
        this.returnMiddleColumns(item, statusData, isStatusGood),
        [
          {
            label: this.$t('Uptime'),
            value: isStatusGood ? '%t'.format(statusData?.uptime) : '-'
          },
          { label: this.$t('Last time data sent'), value: lastTimeDataSent },
          { label: 'RX', value: '%MB'.format(statusData?.rx) },
          { label: 'TX', value: '%MB'.format(statusData?.tx) }
        ]
      ]

      return { item, columns }
    },
    returnMiddleColumns(item, status, isStatusGood) {
      const mode = item.mode
      const isServer = mode === 'server' || mode === 'bidirect' || mode === 'client_server'
      const isClient = mode === 'client' || mode === 'bidirect' || mode === 'client_server'
      const isTCP = item.protocol !== '1'

      const rows = [{ label: this.$t('Protocol'), value: this.displayProtocol(item) }]

      if (isClient) {
        rows.push(this.returnAddressRow(item.address_connect))
      }
      if (isServer) {
        rows.push({ label: this.$t('Port'), value: item.port_listen })
      }

      if (isTCP) {
        if (isServer) {
          const maxClients = item.max_clients || 0
          const connectedClients = isStatusGood ? `${status.connected_clients || 0}/${maxClients}` + '' : '-'
          rows.push({ label: this.$t('Connected clients'), value: connectedClients })
        }
        if (isClient) {
          const maxServers = item.address_connect?.length || 0
          const connectedServers = isStatusGood ? `${status.connected_servers || 0}/${maxServers}` + '' : '-'
          rows.push({ label: this.$t('Connected servers'), value: connectedServers })
        }
      }
      return rows
    },
    returnAddressRow(val) {
      if (!Array.isArray(val)) return { label: this.$t('Server address'), value: val }
      if (!val) return { label: this.$t('Server address'), value: '-' }
      const value = val.length === 1 ? val[0] : this.$t('%s addresses').format(val.length)
      const hint = val.length === 1 ? [] : { hint: val.map(v => ({ info: v })) }
      const label = val.length === 1 ? this.$t('Server address') : this.$t('Server addresses')
      return { label, value, hint }
    },
    displayProtocol(section) {
      if (section.use_tls === '1') {
        if (section.protocol === '0') {
          return this.$t('TCP with TLS')
        } else if (section.protocol === '1') {
          return this.$t('UDP with TLS')
        }
      } else {
        if (section.protocol === '0') {
          return 'TCP'
        } else if (section.protocol === '1') {
          return 'UDP'
        }
      }
      return '-'
    },
    displayMode(val) {
      const translations = {
        server: this.$t('Server'),
        client: this.$t('Client'),
        client_server: this.$t('Client + server'),
        bidirect: this.$t('Bidirect')
      }
      if (translations[val]) return translations[val]
      return '-'
    },
    deviceUnavailable() {
      return this.$t('Device is unavailable')
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    updateStatus() {
      return this.$axios
        .get('/api/overip/status')
        .then(({ data }) => {
          this.formData.overip.forEach(c => {
            c.content = data.find(s => s.section === c.id)
            this.statusMap[c.id] = c.content
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    async loadData(form) {
      const sectionIds = form.overip.map(section => section.id)
      try {
        const { certificates, firewallZones, serialStatus, serialDevices, uciData } = await this.loadDataForEdit(this.$axios, sectionIds)
        this.certificates = certificates
        this.firewallZones = firewallZones
        this.serialStatus = serialStatus
        this.serialDevices = serialDevices

        return uciData
      } catch (e) {
        this.$message.error(this.$t('An unexpected error occurred'))
      }
    },
    removeIpFilters(self) {
      this.formData[self.id] = []
    },
    validate() {
      return new Promise((resolve, reject) => {
        const response = this.$serial.validateBeforeSave(this.serialDevices, this.formData.overip, 'OverIP', false)
        if (!response.isValid) reject(response.message)
        resolve()
      })
    },
    canToggleEnable(section) {
      return section.mode === 'client' || section.port_listen
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Port value is required. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
