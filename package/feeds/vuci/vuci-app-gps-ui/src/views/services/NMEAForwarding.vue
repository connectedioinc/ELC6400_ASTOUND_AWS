<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    config="gps"
    :before-save="beforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/nmea/config' }]"
      data-key="nmeaGeneral"
      :error-handlers="{ edit: returnErrorMessage }"
      name="nmea_forwarding"
    >
      <tlt-card
        :title="$t('NMEA forwarding')"
        :help="$t('This section is used to configure NMEA forwarding settings.')"
      >
        <tlt-form-model-item
          element-id="status"
          :help="$t('Status of GPS service, whether it is currently running. If it is active, it will also show how long it has been running.')"
          :label="$t('Status')"
        >
          <tlt-dummy-value
            :value="isStatusGood ? $t('Up') : $t('Down')"
            :class="isStatusGood ? 'success' : 'error'"
          />
          <tlt-dummy-value
            v-if="isStatusGood"
            :value="displayUptime(nmeaStatusData?.uptime)"
          />
        </tlt-form-model-item>
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enabled')"
          :help="$t('Turns NMEA forwarding on or off.')"
          name="enabled"
        />
        <vuci-form-item-custom
          :uci-section="s"
          name="host_info"
          :label="$t('Host information')"
          inputs="input,input,select,select"
          :input-props="hostInputProps"
          :headers="[$t('Hostname'), $t('Port'), $t('Protocol')]"
          :layout="['lg', 'md', 'md', 'lg']"
          allow-create
          :write-parse="saveHosts"
          separator=";"
          :maxlines="16"
          :help="$t('Host information, multiple hosts are allowed.')"
        >
          <template #input-select="{ column, props, rowValues }">
            <div
              v-if="props.prop === 'interface' && rowValues[2] === 'udp' && isMulticastIp(rowValues[0])"
              class="truncate mb-1"
            >
              {{ $t('Interface') }}
            </div>
            <tlt-form-item-select
              v-if="!(props.prop === 'interface' && (rowValues[2] !== 'udp' || !isMulticastIp(rowValues[0])))"
              :key="column"
              v-bind="props"
              v-model="rowValues[column]"
              :options="props.prop === 'interface' ? interfaceOptions : props.options"
            />
            <Empty v-else />
          </template>
        </vuci-form-item-custom>
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Contain connection')"
          :help="$t('Contains active session with the remote server if turned on.')"
          name="con_contain"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Select prefix')"
          :help="$t('Prefix is added to the NMEA sentence before it is transmitted.%sExample:%s 0012345567_$GPRMC....').format('</br><b>', '</b>')"
          name="send_prefix"
          maxlength="64"
          allow-create
          :options="prefixOptions"
          rawhtml
        />
      </tlt-card>
      <tlt-table
        :title="$t('Hosts status')"
        :help="$t('This section displays hosts status information.')"
        class="[&>div.card-content]:pb-4"
        :columns="hostStatusColumns"
        :data-source="nmeaStatusData.hosts"
        :table-actions="['column-list', 'search']"
      >
        <template #connected="{ record }">
          <tlt-dummy-value
            :value="displayConnection(record.connected)"
            :class="getConnectionStyle(record.connected)"
          />
        </template>
      </tlt-table>
      <tlt-card
        :title="$t('NMEA forwarding cache')"
        :help="$t('This section is used to select how and where the NMEA forwarding cache data should be stored.')"
      >
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Save cache in')"
          :help="
            $t(
              'Selects which type of memory will be used for storing NMEA forwarding cache. RAM (Random access memory) has temporary storage which works only when the devices is powered on. Flash is primary long term storage.'
            )
          "
          name="type"
          :options="types"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Maximum sentences')"
          :help="$t('Maximum amount of NMEA sentences that will be saved in the cache before older entries are replaced by new ones.')"
          name="sentences_max"
          placeholder="5000"
          rules="uinteger"
          maxlength="16"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('File')"
          :help="$t('Location of the file where NMEA forwarding cache information will be stored.')"
          name="location"
          placeholder="/mnt/file"
          :depend="s.type === 'flash'"
          :rules="validateLocation"
          maxlength="null"
          required
        />
      </tlt-card>
      <tlt-card
        v-if="hasSerial"
        :title="$t('NMEA serial forwarding')"
        :help="$t('This section is used to configure NMEA serial forwarding settings.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enabled')"
          :help="$t('Turns NMEA serial forwarding on or off.')"
          name="serial_enabled"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Select prefix')"
          :help="$t('Prefix is added to the NMEA sentence before it is transmitted.%sExample:%s 0012345567_$GPRMC....').format('</br><b>', '</b>')"
          name="serial_send_prefix"
          maxlength="64"
          allow-create
          :options="prefixOptions"
          rawhtml
        />
      </tlt-card>
    </vuci-named-section>
    <vuci-typed-section
      v-if="hasSerial"
      type="serial_port"
      :uci-data="uciData"
      :endpoints="hasSerial ? [{ endpoint: 'gps/nmea/serial/config' }] : []"
      :title="$t('NMEA serial ports')"
      :help="$t('This section displays NMEA serial forwarding port instances currently existing on the router.')"
      data-key="nmeaSerialPorts"
      :edit-form="serialPortEditModal"
      :add-validate="addValidate"
      :error-handlers="{ edit: returnSerialDeviceErrorMessage }"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="portColumns(s)"
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
                service="NMEA Serial Port"
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
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import SerialPortEditForm from './NMEASerialPortEdit.vue'
import SerialHint from '@/components/shared/SerialHint'
import { parseIPv4, parseIPv6 } from '@/validation-rules'
import { getValidationErrorMessage, validatePosixPath } from '@/plugins/fileValidator'

export default {
  components: { SerialHint },
  provide() {
    return {
      formOptions: () => this.formOptions
    }
  },
  data() {
    return {
      serialPortEditModal: markRaw(SerialPortEditForm),
      formData: {},
      formOptions: {
        serial: [],
        status: [],
        device: [],
        interfaceStatus: []
      },
      types: [
        ['ram', this.$t('RAM memory')],
        ['flash', this.$t('Flash memory')]
      ],
      prefixOptions: ['none', 'serial', 'mac', 'imei'],
      hostInputProps: [
        {
          prop: 'hostname',
          rules: 'host',
          initial: '192.168.0.1',
          required: true
        },
        {
          prop: 'port',
          initial: '8500',
          rules: 'port',
          required: true
        },
        {
          prop: 'proto',
          initial: 'tcp',
          options: [
            ['tcp', 'TCP'],
            ['udp', 'UDP']
          ]
        },
        {
          prop: 'interface',
          initial: 'lan'
        }
      ],
      nmeaStatusData: {},
      hostStatusColumns: [
        { dataIndex: 'hostname', title: this.$t('Hostname') },
        { dataIndex: 'port', title: this.$t('Port') },
        { dataIndex: 'protocol', title: this.$t('Protocol'), displayFn: value => value.toUpperCase() },
        { dataIndex: 'interface', title: this.$t('Interface'), displayFn: v => (v ? this.$network.getName(v) : '-') },
        { dataIndex: 'connected', title: this.$t('Connection') },
        { dataIndex: 'forwarded_sentence_count', title: this.$t('Forwarded sentences'), displayFn: this.displayNumber }
      ]
    }
  },
  computed: {
    isStatusGood() {
      return this.nmeaStatusData?.uptime !== undefined
    },
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    hasSerial() {
      return this.$store.board.hwinfo.usb || this.$store.board.hwinfo.rs232 || this.$store.board.hwinfo.rs485
    },
    interfaceOptions() {
      return this.formOptions.interfaceStatus.map(iface => [iface.id, this.$network.getName(iface)])
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/system/device/status', '/api/interfaces/basic/status', { endpoint: '/api/serial/status', condition: this.hasSerial }])
        .then(([deviceStatus, ifacesStatus, status]) => {
          this.formOptions.serial = deviceStatus.success && deviceStatus.data.board.serial ? deviceStatus.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.interfaceStatus = ifacesStatus.success ? ifacesStatus.data : []
          this.formOptions.status = status.success ? status.data : []
          if (!deviceStatus.success) this.$message.error(this.$t('Failed to load serial data'))
          if (!ifacesStatus.success) this.$message.error(this.$t('Failed to load interfaces status data'))
          if (!status.success) this.$message.error(this.$t('Failed to load serial status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    returnErrorMessage(errors) {
      const errorCode = errors?.data?.errors?.[0]?.code
      if (errorCode === 3) return this.$t('Location must be prefixed with "/mnt/" to avoid wear out of device flash')
      else if (errorCode === 4) return this.$t('NMEA forwarding cache file cannot be the same as collecting file')
      else return getValidationErrorMessage(errorCode)
    },
    saveHosts(values) {
      if (values[0] === '') return ''
      return values[2] === 'udp' && this.isMulticastIp(values[0]) ? values.join(';') : values.slice(0, 3).join(';')
    },
    returnSerialDeviceErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validateLocation(v) {
      if (v === '/mnt/') {
        return { isValid: false, message: this.$t('Specify file name') }
      }
      const { location, collecting_location } = this.formData.nmeaGeneral[0]
      if (location === collecting_location) return { isValid: false, message: this.$t('Cache and collecting file locations must be different') }
      if (!v.startsWith('/mnt/'))
        return {
          isValid: false,
          message: this.$t('Location must be prefixed with "/mnt/" to avoid wear out of device flash')
        }

      const [isValid, errorCode] = validatePosixPath(v, 'file')
      if (!isValid) return { isValid: false, message: getValidationErrorMessage(errorCode) }

      return { isValid: true }
    },
    beforeSave() {
      return new Promise((resolve, reject) => {
        const isHostDuplicate = this.formData.nmeaGeneral[0].host_info.length !== new Set(this.formData.nmeaGeneral[0].host_info).size
        if (isHostDuplicate) reject(this.$t('Duplicate host information is not allowed'))
        if (this.hasSerial) {
          const serialResponse = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.nmeaSerialPorts, 'NMEA Serial Port', false)
          if (!serialResponse.isValid) reject(serialResponse.message)
        }
        resolve()
      })
    },
    updateStatus() {
      return this.$axios
        .get('/api/gps/nmea/status')
        .then(({ data }) => {
          this.nmeaStatusData = data
          this.formData.nmeaSerialPorts?.forEach(configPort => {
            configPort.content = data.serials?.find(statusPort => statusPort.section_id === configPort.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    portColumns(item) {
      const statusData = item.content || {}

      const columns = [
        [{ label: this.$t('Device'), value: this.displayDevices(item.device) }],
        [{ label: this.$t('Forwarded sentences'), value: this.displayNumber(statusData.forwarded_sentence_count) }]
      ]

      return { item, columns }
    },
    addValidate(_, instances) {
      if (instances.length < 8) return { valid: true }
      return {
        valid: false,
        message: this.$t('Maximum number of serial port instances has been reached')
      }
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayDevices(value) {
      const device = this.$serial.deviceDisplayValue(value)
      return device && device !== 'undefined' ? device : '-'
    },
    displayConnection(connection) {
      if (connection === undefined) return '-'
      return connection ? this.$t('Up') : this.$t('Down')
    },
    getConnectionStyle(connection) {
      if (connection === undefined) return
      return connection ? 'success' : 'error'
    },
    canToggleEnable(section) {
      return section.name && section.device
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    isMulticastIp(host) {
      const ipv4 = parseIPv4(host)
      if (ipv4) return 224 <= ipv4[0] && ipv4[0] <= 239
      const ipv6 = parseIPv6(host)
      if (ipv6) return ipv6[0] >= 0xff00
      return false
    }
  }
}
</script>
