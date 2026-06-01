<template>
  <vuci-form
    v-model="formData"
    config="dlms_client"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="connection"
        :endpoints="[{ endpoint: 'dlms/connections/config' }]"
        :after-save="onAfterSave"
        :title="$utils.getModalTitle($t('DLMS connection'), section.name)"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          :help="$t('Connection state.')"
          :readonly="s.connection_type === '1' && !canSerialDeviceBeUsed && s.enabled !== '1'"
        />
        <serial-inline-warning
          v-show="s.connection_type === '1'"
          :serial-status="formOptions().status"
          :serial-devices="formOptions().serial"
          :initial-device="initialDevice"
          :device="s.device"
          service="DLMS"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          maxlength="200"
          required
          :help="$t('Name of DLMS connection configuration.')"
          name="name"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Connection type')"
          :help="$t('DLMS connection type.')"
          name="connection_type"
          :options="formOptions().connectionOptions"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Serial device')"
          :help="$t('DLMS serial device.')"
          name="device"
          :depend="s.connection_type === '1'"
          :options="formOptions().device"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('IP address')"
          :help="$t('DLMS device IP address for TCP connection.')"
          name="address"
          required
          :rules="['ipaddr', validateGroup]"
          :depend="s.connection_type === '0'"
          @change="updateValidations"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Port')"
          :help="$t('DLMS device IP port for TCP connection.')"
          name="port"
          required
          :rules="['port', validateGroup]"
          :depend="s.connection_type === '0'"
          @change="updateValidations"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Persistent')"
          :help="$t('Open TCP connection once and reuse it between requests.')"
          name="persistent"
          :depend="s.connection_type === '0'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Timeout')"
          :help="$t('Maximum amount of time to wait when receiving a response from the device (milliseconds).')"
          name="timeout"
          placeholder="1500"
          initial="1500"
          rules="irange(0, 4294967295)"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Baud rate')"
          :help="$t('Select supported baud rate.')"
          name="baudrate"
          :options="serialOptions.baudRate"
          initial="9600"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Data bits')"
          :help="$t('Select how many bits will be used for character.')"
          name="databits"
          :options="serialOptions.dataBits"
          initial="8"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Stop bits')"
          :help="$t('Select how many stop bits will be used to detect the end of character.')"
          name="stopbits"
          :options="serialOptions.stopBits"
          initial="1"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Parity')"
          :help="$t('Select what kind of parity bit to use for error detection.')"
          name="parity"
          initial="none"
          :options="serialOptions.parity"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Flow control')"
          :help="$t('Select what kind of characters to use for flow control.')"
          name="flowcontrol"
          initial="none"
          :options="serialOptions.flowControl"
          :depend="s.connection_type === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Full Duplex')"
          :help="$t(`Check to enable %s Full-Duplex`).format(s.bus)"
          name="full_duplex_enabled"
          :depend="s.connection_type === '1' && serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
        />
      </vuci-named-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="section.connection_type === '1' && !anyDeviceExists"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'

export default {
  components: { SerialInlineWarning },
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      initialDevice: ''
    }
  },
  computed: {
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        device: this.section.device,
        initialDevice: this.initialDevice,
        service: 'DLMS'
      })
    },
    anyDeviceExists() {
      return !!this.formOptions().device.length
    }
  },
  beforeUnmount() {
    this.$bus.emit('close-modal')
    this.$bus.emit('clear-values')
  },
  methods: {
    loadInitial(uciData) {
      this.initialDevice = this.section.device

      const connection = uciData.connection.find(c => c.id === this.section.id)
      const isGroupValid = this.validateGroup().isValid
      const needSerialDevice = connection?.connection_type === '1' && connection?.device
      if (isGroupValid && needSerialDevice && this.canSerialDeviceBeUsed) {
        connection.enabled = '1'
      }

      return uciData
    },
    onAfterSave(_, res) {
      this.$bus.emit('redirect-to-device', res)
    },
    validateGroup() {
      const invalid = this.formData.connection.some(con => con.id !== this.section.id && con.port === this.section.port && con.address === this.section.address)
      if (invalid)
        return {
          isValid: false,
          message: this.$t('Address and port combination is already in use in another connection')
        }
      return { isValid: true }
    },
    updateValidations(self) {
      self.vuciSection.validate()
    },
    validate() {
      if (this.section.connection_type === '0') return Promise.resolve()
      const statusData = this.formOptions().status
      return this.$serial.validateBeforeSave(statusData, this.formData.connection, 'DLMS')
    }
  }
}
</script>
