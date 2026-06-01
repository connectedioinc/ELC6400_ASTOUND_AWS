<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="modbus_client"
    :before-save="validate"
    bulk-request
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
          :value="displayUptime(serialStatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      type="rtu_device"
      :title="$t('Serial device configuration')"
      :help="$t('This section displays serial device instances.')"
      :columns="modbusSerialClientColumns"
      :edit-form="clientEditModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/client/serial/config' }]"
      :add-validate="onAdd"
      data-key="modbusSerialClient"
      :global-settings-form="modbusGlobal"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: serversExist(s.id) }, hints: deleteHints(s.id) }]"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
          :display-value="displayDevices"
        />
      </template>
      <template #device="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="device"
          :display-value="displayDevices"
        />
      </template>
      <template #enabled="{ s }">
        <tlt-hint :hints="getEnableHint(canSerialDeviceToggleEnable, s)">
          <serial-hint
            v-slot="{ disabled }"
            :serial-status="formOptions.status"
            :serial-devices="formOptions.serial"
            :device="s.device"
            :hidden="s.enabled === '1' || !canSerialDeviceToggleEnable(s)"
            service="Modbus Serial Client"
          >
            <vuci-form-item-switch
              :uci-section="s"
              name="enabled"
              :readonly="disabled || !canSerialDeviceToggleEnable(s)"
            />
          </serial-hint>
        </tlt-hint>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel['name']"
          :label="$t('New configuration name')"
          prop="name"
          maxlength="200"
          required
          :help="$t('Name of the new Modbus Serial Client configuration. Used for easier configurations management purpose only.')"
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
    <vuci-typed-section
      type="rtu_server"
      :title="$t('Modbus devices')"
      :help="$t('This section displays Modbus server device instances currently existing on the router.')"
      :edit-form="serialEditModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/client/serial/servers/config' }]"
      data-key="modbusSerialServer"
      :after-delete="removeChildren"
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
            :value="displayDevices(s.name)"
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
            <tlt-hint
              align-right
              :hints="getEnableHint(canModbusDeviceToggleEnable, s)"
            >
              <vuci-form-item-switch
                class="lg:min-w-max mb-0"
                :uci-section="s"
                name="enabled"
                :readonly="!canModbusDeviceToggleEnable(s)"
              />
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
          :help="$t('Name of the new server device configuration. Used for easier configurations management purpose only.')"
        />
        <tlt-form-item-select
          v-model="addModel['rtu_device']"
          :label="$t('Modbus serial client instance name')"
          prop="rtu_device"
          :options="clientSectionOptions"
          :help="$t('Serial Client Configuration is bound to created server.')"
        />
      </template>
      <template #action-design="{ actions }">
        <tlt-hint
          v-if="!clientSectionOptions?.length"
          :hints="[{ info: $t('Serial device instance is required when creating a new instance.') }]"
        >
          <tlt-button
            button-id="add"
            :readonly="!clientSectionOptions?.length"
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
import { mapState } from 'pinia'
import ClientEditForm from './ModbusClientEdit'
import SerialEditForm from './ModbusSerialEdit'
import SerialHint from '@/components/shared/SerialHint'
import modbusGlobal from '@/components/shared/ModbusGlobal'
import { useMainStore } from '@/stores/main'

export default {
  components: { SerialHint },
  provide() {
    return {
      formOptions: this.getFormOptions,
      form: () => this.globalEnabled
    }
  },
  data() {
    return {
      clientEditModal: markRaw(ClientEditForm),
      serialEditModal: markRaw(SerialEditForm),
      modbusGlobal: markRaw(modbusGlobal),
      modbusSerialClientColumns: [
        {
          name: 'name',
          label: this.$t('Name')
        },
        {
          name: 'device',
          label: this.$t('Device')
        },
        {
          name: 'enabled',
          label: this.$t('Enabled')
        }
      ],
      formOptions: {
        serial: [],
        status: [],
        device: [],
        io: [],
        certificates: [],
        /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
        deviceList: [],
        phoneGroups: [],
        emailUsers: [],
        mounts: [],
        /** @type {import('@/types/tagTypes').ModbusServerTagConfig]} */
        sourcedRegisters: [],
        tagStatus: {},
        dbSizesInPages: {}
      },
      formData: {},
      globalEnabled: { globalStatus: 'firstLoad' },
      stateChanged: false,
      infoMessage: this.$t('%s service is disabled, navigate to global settings configuration to enable it.').format('Modbus client'),
      serialStatusData: {}
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    clientSectionOptions() {
      return this.formData?.modbusSerialClient?.map(instance => [instance.id, instance.name ? instance.name : instance.id])
    },
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    isStatusGood() {
      return this.serialStatusData.uptime !== undefined
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
    deleteHints(id) {
      return this.serversExist(id) ? [{ info: this.$t("This instance can't be deleted because it has server configuration asigned to it") }] : []
    },
    serversExist(id) {
      return this.formData.modbusSerialServer.some(server => server.rtu_device === id)
    },
    getFormOptions() {
      return this.formOptions
    },
    displayDevices(value) {
      return this.$serial.deviceDisplayValue(value) || '-'
    },
    displaySerialDevice(id) {
      return this.formData.modbusSerialClient.find(element => element.id === id).name || '-'
    },
    deviceUnavailable() {
      return this.$t('Device is unavailable')
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
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    multiBulkGet(requests) {
      const promises = []
      for (let i = 0; i < requests.length; i += 100) {
        promises.push(this.$axios.bulkGet(requests.slice(i, i + 100)))
      }
      return Promise.all(promises).then(response => {
        return response.flat()
      })
    },
    updateStatus() {
      const dbStatusRequests = this.databaseLocations.map(dbPath => `/api/modbus/client/database/status?db_path=${dbPath}`)

      return this.$axios
        .bulkGet(['/api/modbus/client/serial/servers/status', ...dbStatusRequests])
        .then(([serviceStatus, ...dbStatuses]) => {
          if (serviceStatus.success) {
            this.serialStatusData = serviceStatus.data
            this.formData.modbusSerialServer.forEach(modbus => {
              modbus.content = serviceStatus.data.modbus_devices?.find(s => s.id === modbus.id)
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
      const overSchedulerLimit = form.modbusSerialServer.some(item => item.schedule && item.schedule.length > 255)
      if (overSchedulerLimit) this.$notification.info(this.$t('Schedule limit exceeded, all schedule configuration above 255 will be ignored'))
      const alarmRequests = form.modbusSerialServer.map(s => `/api/modbus/client/serial/servers/${s.id}/alarms/config`)
      const requestRequests = form.modbusSerialServer.map(s => `/api/modbus/client/serial/servers/${s.id}/requests/config`)
      const requests = [
        '/api/system/device/status',
        '/api/serial/status',
        { endpoint: '/api/io/status', condition: this.$store.board.hwinfo.ios },
        '/api/certificates/config',
        '/api/basic/network/devices/status',
        '/api/modbus/client/global',
        { endpoint: '/api/recipients/phone_groups/config', condition: this.$store.board.hwinfo.mobile },
        '/api/recipients/email_users/config',
        { endpoint: '/api/usb_tools/mount/options', condition: this.$store.board.hwinfo.usb },
        { endpoint: '/api/modbus/server/serial/registers/config', condition: this.$store.hasPackages('vuci-app-modbus-server-api.control') },
        '/api/universal_gateway/status?client_service=modbus_client',
        ...alarmRequests,
        ...requestRequests
      ]
      return this.multiBulkGet(requests)
        .then(([serial, status, io, cert, devices, global, phoneGroups, emailUsers, mounts, sourcedRegisters, tagStatus, ...rest]) => {
          if (global.success) {
            this.globalEnabled.globalStatus = global.data.enabled === '1'
          } else {
            this.$message.error(this.$t('Failed to load Modbus client global data'))
          }
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          this.formOptions.io = io.success && io.data ? io.data : []
          if (io.success && !io.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
          this.formOptions.serial = serial.success && serial.data.board.serial ? serial.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.status = status.success ? status.data : []
          this.formOptions.certificates = cert.success ? cert.data.generated : []
          this.formOptions.deviceList = devices.success ? devices.data : []
          this.formOptions.phoneGroups = phoneGroups.success ? phoneGroups.data : []
          this.formOptions.emailUsers = emailUsers.success ? emailUsers.data : []
          this.formOptions.mounts = mounts.success ? mounts.data : []
          this.formOptions.sourcedRegisters = sourcedRegisters.success ? sourcedRegisters.data : []
          this.formOptions.tagStatus = tagStatus.success ? tagStatus.data : {}
          if (!cert.success) this.$message.error(this.$t('Failed to load certificate data'))
          if (!serial.success) this.$message.error(this.$t('Failed to load serial data'))
          if (!status.success) this.$message.error(this.$t('Failed to load rs serial status'))
          if (!io.success) this.$message.error(this.$t('Failed to load io status'))
          if (!devices.success) this.$message.error(this.$t('Failed to load network device status'))
          if (!phoneGroups.success) this.$message.error(this.$t('Failed to load phone groups'))
          if (!emailUsers.success) this.$message.error(this.$t('Failed to load email users'))
          if (!mounts.success) this.$message.error(this.$t('Failed to load storage device data'))
          if (!sourcedRegisters.success) this.$message.error(this.$t('Failed to load Modbus serial server registers data'))
          if (!tagStatus.success) this.$message.error(this.$t('Failed to load universal gateway status'))
          const uciData = {}
          const half = Math.floor(rest.length / 2)
          const responsesAlarms = rest.slice(0, half)
          const responsesRequests = rest.slice(half)
          responsesAlarms.forEach((response, index) => {
            const sectionID = form.modbusSerialServer[index].id
            if (response.success) {
              uciData[`${sectionID}_alarm`] = response.data
            } else {
              this.$message.error(this.$t('Failed to load alarm data for %s server.').format(sectionID))
            }
          })
          responsesRequests.forEach((response, index) => {
            const sectionID = form.modbusSerialServer[index].id
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
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions.status, this.formData.modbusSerialClient, 'Modbus Serial Client')
    },
    onAdd(addForm, dataSource) {
      const nameIsUsed = dataSource.some(data => data.name === addForm.name)
      if (!nameIsUsed) return { valid: true }
      return { valid: false, message: this.$t('Configuration name is already in use') }
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
          { label: this.$t('Modbus serial device'), value: this.displaySerialDevice(item.rtu_device) }
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
    },
    canSerialDeviceToggleEnable(section) {
      return section.name && section.device && section.baudrate && section.databits && section.stopbits && section.parity && section.flowcontrol
    },
    canModbusDeviceToggleEnable(section) {
      return section.name && section.rtu_device && section.skip_on_many_tmos && section.frequency
    },
    getEnableHint(canToggleEnable, section) {
      return !canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
