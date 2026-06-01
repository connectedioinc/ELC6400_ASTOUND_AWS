<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="modbusgateway"
    :before-save="validate"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays MQTT Modbus Gateway general status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <div class="flex justify-center gap-1">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :card-props="statusData"
        >
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            class="lg:max-w-fit"
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
        </tlt-horizontal-card>
      </div>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      name="gateway"
      :title="$t('MQTT gateway')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/gateway/config' }]"
      data-key="gateway"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Modbus TCP.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Host')"
        :help="$t('MQTT broker hostname or IP.')"
        name="host"
        placeholder="127.0.0.1"
        initial="127.0.0.1"
        rules="host"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="$t('MQTT broker port number.')"
        name="port"
        placeholder="1883"
        initial="1883"
        rules="port"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Message type')"
        :help="$t('Format in which requests and responses will be sent to MQTT broker.')"
        name="message_type"
        :options="messageTypes"
        initial="ascii"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Request topic')"
        :help="topicHint"
        name="request"
        :placeholder="$t('request')"
        :initial="$t('request')"
        rules="string"
        maxlength="65535"
        required
        rawhtml
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Response topic')"
        :help="topicHint"
        name="response"
        :placeholder="$t('response')"
        :initial="$t('response')"
        rules="string"
        maxlength="65535"
        rawhtml
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="qos"
        :label="$t('QoS')"
        :help="$t('Quality of service.')"
        :options="qosOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Username')"
        :help="$t('MQTT client username (leave empty if anonymous).')"
        name="user"
        :placeholder="$t('Username')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        :help="$t('MQTT client password (leave empty if anonymous).')"
        name="pass"
        :placeholder="$t('Password')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        sensitive
        password
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Client ID')"
        :help="$t('Client ID for MQTT broker.')"
        rules="mqtt_client_id"
        name="client_id"
        maxlength="64"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Keepalive')"
        :help="$t('Keepalive message to MQTT broker (seconds).')"
        name="keepalive"
        rules="uinteger"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Use TLS/SSL')"
        :help="$t('Turns TLS support on or off.')"
        name="tls"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('TLS type')"
        :help="$t('Selects the type of TLS encryption.')"
        name="tls_type"
        :depend="s.tls === '1'"
        :options="tlsOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('PSK')"
        :help="$t('Sets PSK key.')"
        :depend="s.tls === '1' && s.tls_type === 'psk'"
        name="psk"
        password
        sensitive
        rules="credentials_validate"
        maxlength="512"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Identity')"
        :help="$t('Sets identity.')"
        :depend="s.tls === '1' && s.tls_type === 'psk'"
        name="identity"
        maxlength="255"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('TLS insecure')"
        :depend="s.tls === '1' && s.tls_type === 'cert'"
        :help="$t('Disables TLS security.')"
        name="tls_insecure"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="device_files"
        :label="$t('Certificate files from device')"
        :depend="s.tls_type === 'cert' && s.tls === '1'"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <!-- Upload certificates to router -->
      <vuci-form-item-upload
        :uci-section="s"
        name="cafile"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '0'"
        max-size="16MB"
        required
        force-write
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="certfile"
        :label="$t('Certificates file')"
        :help="$t('Upload certificates file.')"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '0'"
        max-size="16MB"
        force-write
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="keyfile"
        :label="$t('Key file')"
        :help="$t('Upload key file.')"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '0'"
        max-size="16MB"
        force-write
      />
      <!-- Select Certificates from router -->
      <vuci-form-item-select
        :uci-section="s"
        name="cafile"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :options="caOptions"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
        required
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="certfile"
        :label="$t('Certificates file')"
        :help="$t('Upload certificates file.')"
        :options="certOptions"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="keyfile"
        :label="$t('Key file')"
        :help="$t('Upload key file.')"
        :options="keyOptions"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
        force-write
      />
      <!-- End of selects form router -->
    </vuci-named-section>
    <vuci-typed-section
      :show="hasSerial"
      type="rtu_device"
      :title="$t('Serial gateway configuration')"
      :help="$t('This section displays Serial gateway instances currently existing on the router.')"
      :table-actions="['column-list', 'search']"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="hasSerial ? [{ endpoint: 'modbus/serial_gateway/config' }] : []"
      :error-handlers="{ edit: returnErrorMessage, create: deviceUnavailable }"
      data-key="rtu_device"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="serialOverviewColumns(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="s.id || '-'"
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
                service="MQTT Modbus Serial Gateway"
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
        <!-- TODO change this to name in the future -->
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Device ID')"
          rules="uciname"
          prop="id"
          required
          maxlength="200"
          :help="$t('ID of serial device.')"
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
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import ModbusDeviceEdit from './ModbusDeviceEdit.vue'
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
      topicHint: this.$t('Topic name. %sConstants:%s Serial number:%s Mac address:%s Device name:%s').format('</br><b>', '</b><br><b>', '</b> $$SERIAL</br><b>', '</b> $$MAC</br><b>', '</b> $$NAME'),
      tlsOptions: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      messageTypes: [
        ['ascii', this.$t('ASCII')],
        ['json', this.$t('JSON')]
      ],
      qosOptions: [
        ['0', this.$t('At most once (0)')],
        ['1', this.$t('At least once (1)')],
        ['2', this.$t('Exactly once (2)')]
      ],
      formOptions: {
        serial: [],
        device: [],
        status: []
      },
      formData: {},
      certificates: [],
      editModal: markRaw(ModbusDeviceEdit),
      hwinfo: {},
      gatewayStatusData: {}
    }
  },
  computed: {
    hasSerial() {
      return this.$store.board.hwinfo.usb || this.$store.board.hwinfo.rs232 || this.$store.board.hwinfo.rs485
    },
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    keyOptions() {
      const options = this.certificates.filter(cert => cert.type === 'key')
      return options.map(cert => ['/etc/certificates/' + cert.fullname, cert.fullname])
    },
    certOptions() {
      const options = this.certificates.filter(cert => cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    caOptions() {
      const options = this.certificates.filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || cert.cert_type === 'root_ca') && cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    statusData() {
      const statusData = this.gatewayStatusData || {}
      const isStatusGood = statusData?.uptime !== undefined

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          }
        ],
        [{ label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) }],
        [{ label: this.$t('TCP connections'), value: this.displayNumber(statusData?.tcp_connection_count) }],
        [{ label: this.$t('Successful requests'), value: this.displayNumber(statusData?.successful_request_count) }],
        [{ label: this.$t('Failed requests'), value: this.displayNumber(statusData?.failed_request_count) }]
      ]
      return { columns }
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
        .get('/api/modbus/gateway/status')
        .then(({ data }) => {
          this.gatewayStatusData = data
          this.formData.rtu_device.forEach(device => {
            device.content = data.serial_gateways?.find(s => s.id === device.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData() {
      return this.$axios
        .bulkGet(['/api/system/device/status', '/api/certificates/config'])
        .then(([serial, certificates]) => {
          this.formOptions.serial = serial.success && serial.data.board.serial ? serial.data.board.serial : []
          this.hwinfo = serial.success ? serial.data.board.hwinfo : { usb: false, rs232: false, rs485: false }
          this.certificates = certificates.success ? certificates.data.generated : []
          if (!serial.success) this.$message.error(this.$t('Failed to load device data'))
          if (!certificates.success) this.$message.error(this.$t('Failed to load certificate data'))
          this.formOptions.device = this.devices
          if (!this.hwinfo.usb && !this.hwinfo.rs232 && !this.hwinfo.rs485) return {}
          else return this.$axios.get('/api/serial/status')
        })
        .then(status => {
          this.formOptions.status = status.success ? status.data : []
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
        if (!this.hwinfo.usb && !this.hwinfo.rs232 && !this.hwinfo.rs485) resolve()
        if (!this.formData.rtu_device) resolve()
        const response = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.rtu_device, 'MQTT Modbus Serial Gateway', false)
        if (!response.isValid) reject(response.message)
        resolve()
      })
    },
    serialOverviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = statusData?.open

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          }
        ],
        [{ label: this.$t('Device'), value: this.displayDevices(item.device) }],
        [{ label: this.$t('Successful requests'), value: this.displayNumber(statusData?.successful_request_count) }],
        [{ label: this.$t('Failed requests'), value: this.displayNumber(statusData?.failed_request_count) }]
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
      return section.device && section.baudrate && section.databits && section.stopbits && section.parity && section.flowcontrol
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
