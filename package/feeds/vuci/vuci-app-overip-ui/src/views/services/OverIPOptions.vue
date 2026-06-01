<template>
  <vuci-named-section
    v-slot="{ s }"
    :uci-data="uciData"
    :name="section.id"
    data-key="overip"
    :endpoints="[{ endpoint: 'overip/config' }]"
    :title="$utils.getModalTitle($t('device'), section.name)"
    :help="$t('Settings for selected device.')"
    :error-handlers="{ edit: returnErrorMessage }"
    :after-save="(_, res) => $emit('afterSave', res)"
  >
    <tlt-tabs :tabs="fakeTabs">
      <template #main>
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          rawhtml
          :help="$t('Enable service.')"
          :readonly="!canSerialDeviceBeUsed && s.enabled !== '1'"
        />
        <serial-inline-warning
          :serial-status="serialStatus"
          :serial-devices="serialDevices"
          :initial-device="s.initialDevice"
          :device="s.device"
          service="OverIP"
        />
        <vuci-form-item-input
          v-if="!hideName"
          :uci-section="s"
          :label="$t('Name')"
          :help="$t('Name of configuration.')"
          name="name"
        />
        <vuci-form-item-select
          v-if="!hideDevice"
          :uci-section="s"
          :label="$t('Device')"
          :help="$t('Which serial port will be used for serial communication.')"
          name="device"
          :options="$serial.listDeviceNameTuples(serialDevices)"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Baud rate')"
          :help="$t('Select serial device baud rate.')"
          name="baudrate"
          :options="serialOptions.baudRate"
          initial="9600"
        />
        <vuci-form-item-select
          v-if="!hideDatabits"
          :uci-section="s"
          :label="$t('Data bits')"
          :help="$t('Select how many bits will be used for character.')"
          name="databits"
          :options="serialOptions.dataBits"
          initial="8"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Stop bits')"
          :help="$t('Select how many stop bits will be used to detect the end of character.')"
          name="stopbits"
          :options="serialOptions.stopBits"
          initial="1"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Parity')"
          :help="$t('Select what kind of parity bit to use for error detection.')"
          name="parity"
          initial="none"
          :options="serialOptions.parity"
        />
        <vuci-form-item-select
          v-if="!hideFlowControl"
          :uci-section="s"
          :label="$t('Flow control')"
          :help="$t('Select flow control mode.')"
          name="flowcontrol"
          initial="none"
          :options="serialOptions.flowControl"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Full Duplex')"
          :help="$t(`Check to enable %s Full-Duplex`).format(device)"
          name="full_duplex_enabled"
          :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Echo')"
          :help="$t('Enable serial device echo.')"
          name="echo_enabled"
          :depend="s.device === '/dev/rs232' || (s.device === '/dev/rs485' && s.full_duplex_enabled === '1')"
        />
      </template>
    </tlt-tabs>
    <tlt-card :title="$t('Configuration settings')">
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Mode')"
            name="mode"
            :options="mode"
            @change="clearAddress(s)"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Specifies configuration mode.')"
                :choice-hint="$t('Possible modes')"
                :hints="[
                  {
                    option: $t('Server'),
                    hint: $t('launches service in server mode and listens on the selected port.')
                  },
                  {
                    option: $t('Client'),
                    hint: $t('launches service in client mode, which connects to one or several servers with the selected addresses and ports.')
                  },
                  {
                    option: $t('Client + server'),
                    hint: $t('launches service in server and client(s) mode simultaneously.')
                  },
                  {
                    option: $t('Bidirect(legacy)'),
                    hint: $t(
                      'launches service in bidirect mode, which means that the service keeps changing between server and client modes. If server mode fails it switches to client mode and vice versa.'
                    )
                  }
                ]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Protocol')"
            :help="$t('Select which protocol to use for data transmission.')"
            name="protocol"
            :options="protocol"
          />
          <vuci-form-item-custom
            ref="custom"
            :uci-section="s"
            name="address_connect"
            :label="$t('Destination address')"
            inputs="input,input"
            :input-props="getAddressOptionsInputProps(true)"
            :headers="[$t('Address'), $t('Port')]"
            :load-parse="s.mode === 'bidirect' || s.connect_on_data === '1' ? loadBidirectAddress : loadAddresses"
            :write-parse="s.mode === 'bidirect' ? saveBidirectAddress : saveAddresses"
            :allow-create="s.mode !== 'bidirect' && s.connect_on_data !== '1'"
            :maxlines="16"
            :depend="s.mode !== 'server'"
            :help="$t('Specify server address and port for client to connect to (e.g., first field for address second for port. 16 destination addresses are allowed).')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Listening port')"
            :help="$t('Specify port number for server to listen.')"
            name="port_listen"
            :depend="s.mode !== 'client'"
            rules="port"
            required
          />
          <vuci-form-item-custom
            :uci-section="s"
            name="predefined_address"
            :label="$t('Predefined addresses')"
            :options="[]"
            placeholder="150.10.10.10:8080"
            inputs="input,input"
            :input-props="getAddressOptionsInputProps(false)"
            :load-parse="loadAddresses"
            :write-parse="saveAddresses"
            allow-create
            :headers="[$t('Address'), $t('Port')]"
            :maxlines="16"
            :depend="s.mode === 'server' && s.protocol === '1'"
            :help="$t('Set predefined IP and port for UDP connection (e.g., first field for address second for port).')"
          />
        </template>
        <template #security>
          <vuci-form-item-switch
            :uci-section="s"
            name="use_tls"
            :label="$t('Use TLS/SSL')"
            :help="$t('Mark to use TLS/SSL for connection.')"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="tls_version"
            :label="$t('TLS version')"
            :help="$t('Minimum TLS version allowed to be used.')"
            :options="tlsVersionOpts"
            initial="all"
            :depend="s.use_tls === '1'"
            :warnings="
              value =>
                value === 'tlsv1.0' || value === 'tlsv1.1' || value === 'dtlsv1.0' ? $t('TLS 1.0 and TLS 1.1 are deprecated and considered insecure. Please upgrade to a newer TLS version.') : ''
            "
          />
          <vuci-form-item-select
            :uci-section="s"
            name="tls_type"
            :label="$t('TLS type')"
            :help="$t('Select the type of TLS encryption.')"
            :options="tlsTypeOpts"
            :depend="s.use_tls === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="require_certificate"
            :label="$t('Require certificate')"
            :help="$t('Demand certificate and key from peer and verify them against certificate authority.')"
            initial="1"
            :depend="isTLSCertShown(s) && !isUDPServer(s)"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="verify_host"
            :label="$t('Verify host')"
            :help="$t('Check if the server certificates Common Name (CN) matches hostname to which client is connecting.')"
            :depend="isTLSCertShown(s) && isClient(s)"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="device_sec_files"
            :label="$t('Certificate files from device')"
            :depend="isTLSCertShown(s)"
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
            name="cert_file"
            :label="$t('Certificate file')"
            :help="$t('Upload certificate file.')"
            :depend="isTLSCertShown(s) && !isCertsFromRouterSelected(s)"
            :required="isServer(s)"
            max-size="16MB"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="key_file"
            :label="$t('Key file')"
            :help="$t('Upload key file.')"
            :depend="isTLSCertShown(s) && !isCertsFromRouterSelected(s)"
            :required="isServer(s)"
            max-size="16MB"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="ca_file"
            :label="$t('CA file')"
            :help="$t('Upload CA file.')"
            :depend="isTLSCertShown(s) && !isCertsFromRouterSelected(s) && s.require_certificate === '1' && !isUDPServer(s)"
            required
            max-size="16MB"
          />
          <!-- Select Certificates from router -->
          <vuci-form-item-select
            :uci-section="s"
            name="cert_file"
            :label="$t('Certificate file')"
            :help="$t('Select certificate file.')"
            :options="certOptions"
            :depend="isTLSCertShown(s) && isCertsFromRouterSelected(s)"
            :required="isServer(s)"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="key_file"
            :label="$t('Key file')"
            :help="$t('Select key file.')"
            :options="keyOptions"
            :depend="isTLSCertShown(s) && isCertsFromRouterSelected(s)"
            :required="isServer(s)"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ca_file"
            :label="$t('CA file')"
            :help="$t('Select CA file.')"
            :options="caOptions"
            :depend="isTLSCertShown(s) && isCertsFromRouterSelected(s) && s.require_certificate === '1' && !isUDPServer(s)"
            required
          />
          <!-- End of selects form router -->
          <vuci-form-item-input
            :uci-section="s"
            name="psk"
            :label="$t('Pre-Shared-Key')"
            :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
            :rules="['no_prefix(\'0x\')', 'hexstring']"
            maxlength="128"
            password
            sensitive
            :depend="isTLSPskShown(s)"
            :no-write="s.psk === ''"
            :placeholder-prefix="false"
            :placeholder="s.isPskSet ? $t('Pre-Shared-Key is set') : ''"
            :required="!s.isPskSet"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="identity"
            :label="$t('Identity')"
            :help="$t('Specify the identity.')"
            rules="uciname"
            :depend="isTLSPskShown(s)"
            required
          />
        </template>
        <template #advancedTab>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Raw mode')"
            :help="$t('Enable to transmit all data transparently.')"
            initial="1"
            name="raw"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Remove all zeros')"
            :help="$t('Remove all zero bytes from received data.')"
            name="remove_all_zeros"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Reconnect interval')"
            :help="$t('Specifies the delay in seconds between client reconnect attempts.')"
            name="recon_interval"
            initial="5"
            :depend="s.mode !== 'server' && s.protocol !== '1'"
            rules="irange(0, 36000)"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Inactivity timeout')"
            :help="
              s.mode === 'client'
                ? $t('Specifies period of time in seconds the client connection is inactive before disconnecting from server. To disable timeout input 0.')
                : $t('Specifies period of time in seconds, where server connection must be inactive, to disconnect client. To disable timeout input 0.')
            "
            name="timeout"
            :depend="s.protocol === '0'"
            rules="irange(0, 36000)"
            initial="300"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Serial timeout')"
            :help="$t('Specifies the maximum milliseconds to wait for serial data.')"
            name="read_duration"
            rules="irange(0,1000)"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Max clients')"
            :help="
              s.protocol === '0'
                ? $t('Specify (1-32) how many clients are allowed to connect simultaneously')
                : $t(
                    'Select how many UDP clients will be supported simultaneously \
            (Predefined clients does not count towards this limit)'
                  )
            "
            name="max_clients"
            :depend="s.mode !== 'client'"
            initial="4"
            :options="clientOptions"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('TCP echo')"
            :help="$t('Software TCP echo.')"
            name="tcp_echo_enabled"
            :depend="s.protocol === '0'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Close connections')"
            :help="$t('Close TCP connections everytime data is sent or received (might result in serial data loss).')"
            name="close_connections"
            :depend="s.protocol === '0' && s.mode !== 'bidirect' && s.connect_on_data !== '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Connect on data')"
            :help="$t('Only attempt to connect to server when data is received from serial device.')"
            name="connect_on_data"
            :depend="s.protocol === '0' && ['client', 'client_server'].includes(s.mode) && s.close_connections !== '1'"
            @change="updateAddress"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Connection retry count')"
            :help="$t('Connection retry count before dropping serial data.')"
            name="max_connection_attempts"
            initial="3"
            rules="irange(1,24)"
            :depend="s.protocol === '0' && ['client', 'client_server'].includes(s.mode) && s.connect_on_data === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('CD enable')"
            :help="$t('Enable connection indication on CD pin.')"
            name="cd_enable"
            :depend="isTRB142 && s.device === '/dev/rs232' && (s.mode === 'server' || s.mode === 'client') && s.protocol === '0'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('DSR enable')"
            :help="$t('Enable connection indication on DSR pin.')"
            name="dsr_enable"
            :depend="isTRB142 && s.device === '/dev/rs232' && (s.mode === 'server' || s.mode === 'client') && s.protocol === '0'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('CD invert')"
            :help="$t('Invert default CD pin level for indication.')"
            name="cd_invert"
            :depend="isTRB142 && s.device === '/dev/rs232' && (s.mode === 'server' || s.mode === 'client') && s.protocol === '0' && s.cd_enable === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('DSR invert')"
            :help="$t('Invert default DSR pin level for indication.')"
            name="dsr_invert"
            :depend="isTRB142 && s.device === '/dev/rs232' && (s.mode === 'server' || s.mode === 'client') && s.protocol === '0' && s.dsr_enable === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Keep alive')"
            :help="$t('Enable keep alive.')"
            name="keepalive_enabled"
            :depend="s.protocol === '0'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Keep alive time')"
            :help="$t('Duration until the first probe will be sent.')"
            name="keepalive_time"
            rules="irange(1,32000)"
            initial="30"
            required
            :depend="s.protocol === '0' && s.keepalive_enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Keep alive interval')"
            :help="$t('The interval between subsequent keepalive probes.')"
            name="keepalive_interval"
            rules="irange(1,32000)"
            initial="15"
            required
            :depend="s.protocol === '0' && s.keepalive_enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Keep alive probes')"
            :help="$t('The number of unacknowledged probes needed to consider the connection lost.')"
            name="keepalive_probes"
            rules="irange(1,32000)"
            initial="3"
            required
            :depend="s.protocol === '0' && s.keepalive_enabled === '1'"
          />
        </template>
      </tlt-tabs>
    </tlt-card>
  </vuci-named-section>
  <vuci-typed-section
    :show="currentSection?.mode !== 'client'"
    :title="$t('IP filter')"
    :table-actions="['column-list', 'search']"
    type="rule"
    :uci-data="uciData"
    :columns="ipFilterCollumns"
    :data-key="section.id"
    :endpoints="[{ endpoint: `overip/${section.id}/filters/config` }]"
  >
    <template #interface="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="src"
      />
    </template>
    <template #allow_ip="{ s }">
      <vuci-form-item-list
        :uci-section="s"
        name="src_ip"
        rules="ipmask"
      />
    </template>
    <template #addForm="{ addModel }">
      <tlt-form-item-select
        v-model="addModel.src"
        :label="$t('Interface')"
        prop="src"
        :options="firewallZones"
      />
    </template>
  </vuci-typed-section>
</template>

<script>
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'
import HintHelper from '@/components/shared/HintHelper.vue'

export default {
  components: { SerialInlineWarning, HintHelper },
  props: {
    uciData: {
      type: Object,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    section: {
      type: Object,
      required: true
    },
    serialDevices: {
      type: Array,
      required: true
    },
    serialStatus: {
      type: Array,
      required: true
    },
    firewallZones: {
      type: Array,
      required: true
    },
    certificates: {
      type: Array,
      required: true
    },

    inEditModal: {
      type: Boolean,
      default: true
    },
    hideName: {
      type: Boolean,
      default: false
    },
    hideDatabits: {
      type: Boolean,
      default: false
    },
    hideFlowControl: {
      type: Boolean,
      default: false
    },
    hideDevice: {
      type: Boolean,
      default: false
    }
  },
  emits: ['afterSave'],
  data() {
    return {
      fakeTabs: [{ name: 'main' }],
      tabs: [
        { name: 'general', title: this.$t('General') },
        { name: 'security', title: this.$t('Security') },
        { name: 'advancedTab', title: this.$t('Advanced') }
      ],
      tlsTypeOpts: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      mode: [
        ['server', this.$t('Server')],
        ['client', this.$t('Client')],
        ['client_server', this.$t('Client + server')],
        ['bidirect', this.$t('Bidirect (legacy mode, not recommended)')]
      ],
      tlsTCPVersionOpts: [
        ['tlsv1.0', 'tlsv1.0'],
        ['tlsv1.1', 'tlsv1.1'],
        ['tlsv1.2', 'tlsv1.2'],
        ['tlsv1.3', 'tlsv1.3'],
        ['all', this.$t('Support all')]
      ],
      tlsUDPVersionOpts: [
        ['dtlsv1.0', 'dtlsv1.0'],
        ['dtlsv1.2', 'dtlsv1.2'],
        ['all', this.$t('Support all')]
      ],
      ipFilterCollumns: [
        { name: 'interface', label: this.$t('Interface') },
        {
          name: 'allow_ip',
          label: this.$t('Allow IP'),
          help: this.$t('Allow ip connecting to server, 0.0.0.0/0 for allowing all.')
        }
      ],
      isTRB142: !!this.$store.board.hwinfo.rs232_control
    }
  },
  computed: {
    currentSection() {
      return this.formData?.overip?.find(x => x.id === this.section.id)
    },
    clientOptions() {
      const arr = Array.from({ length: 33 }, (v, i) => i.toString())
      return arr.filter(item => item !== '0')
    },
    protocol() {
      const options = [['0', this.$t('TCP')]]
      if (this.currentSection?.mode !== 'bidirect') options.push(['1', this.$t('UDP')])
      return options
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialStatus: this.serialStatus,
        serialDevices: this.serialDevices,
        initialdevice: this.section.initialDevice,
        device: this.section.device,
        service: 'OverIP'
      })
    },
    device() {
      return this.$serial.deviceDisplayValue(this.section.device)
    },
    serialOptions() {
      return this.$serial.filterOptions(this.serialDevices, this.section.device, this.section)
    },
    keyOptions() {
      const certificates = this.certificates
      const options = certificates.filter(cert => cert.type === 'key')
      return options.map(cert => ['/etc/certificates/' + cert.fullname, cert.fullname])
    },
    certOptions() {
      const certificates = this.certificates
      const options = certificates.filter(cert => cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    caOptions() {
      const certificates = this.certificates
      const options = certificates.filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || cert.cert_type === 'root_ca') && cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    tlsVersionOpts() {
      if (this.section.protocol === '1') {
        return this.tlsUDPVersionOpts
      } else {
        return this.tlsTCPVersionOpts
      }
    }
  },
  methods: {
    getAddressOptionsInputProps(required) {
      const inputProps = {
        prop: 'ip_connect',
        placeholder: '192.168.1.1',
        rules: 'host',
        required
      }
      const inputProps2 = {
        prop: 'port_connect',
        placeholder: '8080',
        rules: 'port',
        required
      }
      return [inputProps, inputProps2]
    },
    formatAddress(item) {
      const lastIndex = item.lastIndexOf(':')
      const port = item.substr(lastIndex + 1)
      const addr = item.slice(0, lastIndex)
      return `${addr},${port}`
    },
    loadAddresses(address) {
      const parsedAddress = address.map(item => {
        return this.formatAddress(item)
      })
      return parsedAddress
    },
    saveAddresses(values) {
      return values[0] !== '' ? values.join(':') : ''
    },
    loadBidirectAddress(address) {
      return this.formatAddress(address[0])
    },
    saveBidirectAddress(values) {
      return [this.saveAddresses(values)]
    },
    updateAddress() {
      const { custom } = this.$refs
      custom.modelValues = [custom.modelValues[0]]
      custom.rowIds = [custom.nextId()]
    },
    clearAddress() {
      if (this.section.mode === 'bidirect') {
        const { custom } = this.$refs
        custom.modelValues = [this.$refs.custom.modelValues[0]]
        custom.rowIds = [custom.nextId()]
      }
    },
    setReadDurationValue(self) {
      const timeoutValue = {
        300: '80',
        600: '60',
        1200: '40',
        1800: '30',
        2400: '20',
        4800: '10'
      }
      if (!timeoutValue[this.section.baudrate] && Number(this.section.baudrate > 5000)) self.uciSection.read_duration = '5'
      else self.uciSection.read_duration = timeoutValue[this.section.baudrate]
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    isTLSCertShown(section) {
      return section.tls_type === 'cert' && section.use_tls === '1'
    },
    isTLSPskShown(section) {
      return section.tls_type === 'psk' && section.use_tls === '1'
    },
    isCertsFromRouterSelected(section) {
      return section.device_sec_files === '1'
    },
    isServer(section) {
      const mode = section.mode
      return mode === 'bidirect' || mode === 'server' || mode === 'client_server'
    },
    isClient(section) {
      const mode = section.mode
      return mode === 'bidirect' || mode === 'client' || mode === 'client_server'
    },
    isUDPServer(section) {
      return section.protocol === '1' && this.isServer(section)
    }
  }
}
</script>
