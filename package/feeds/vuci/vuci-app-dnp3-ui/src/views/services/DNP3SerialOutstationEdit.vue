<template>
  <vuci-form
    v-model="formData"
    editing
    config="dnp3_outstation"
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="outstation"
        :endpoints="[{ endpoint: 'dnp3/serial_outstation/config' }]"
        :title="$utils.getModalTitle($t('device DNP3 outstation'), section.name)"
        :help="$t('Settings for DNP3 outstation configuration.')"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          :help="$t('Enable service.')"
          :readonly="!canSerialDeviceBeUsed && s.enabled !== '1'"
        />
        <serial-inline-warning
          :serial-status="formOptions().status"
          :serial-devices="formOptions().serial"
          :initial-device="initialDevice"
          :device="s.device"
          service="DNP3 Serial Outstation"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          :help="$t('Name of DNP3 outstation configuration.')"
          maxlength="200"
          name="name"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Device')"
          :help="$t('Which serial port will be used for serial communication.')"
          name="device"
          :options="formOptions().device"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Baud rate')"
          :help="$t('Select supported baud rate.')"
          name="baudrate"
          :options="serialOptions.baudRate"
          initial="9600"
        />
        <vuci-form-item-select
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
          :uci-section="s"
          :label="$t('Flow control')"
          :help="$t('Select what kind of characters to use for flow control.')"
          name="flowcontrol"
          initial="none"
          :options="serialOptions.flowControl"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Local Address')"
          :help="$t('Outstation Link-Layer Address.')"
          name="local_addr"
          :rules="['irange(0,65519)', validateAddress]"
          initial="1"
          placeholder="1"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Remote Address')"
          :help="$t('Client Link-Layer address.')"
          name="remote_addr"
          rules="irange(0,65519)"
          initial="2"
          placeholder="2"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Unsolicited enabled')"
          :help="$t('Enable the transmission of unsolicited messages.')"
          name="unsolicited_enabled"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Full Duplex')"
          :help="$t('Check to enable rs485 Full-Duplex.')"
          name="full_duplex_enabled"
          :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
        />
      </vuci-named-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!anyDeviceExists"
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
    device() {
      return this.$serial.deviceDisplayValue(this.section.device)
    },
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        initialDevice: this.initialDevice,
        device: this.section.device,
        service: 'DNP3 Serial Outstation'
      })
    },
    anyDeviceExists() {
      return !!this.formOptions().device.length
    }
  },
  methods: {
    loadInitial() {
      this.initialDevice = this.section.device
    },
    validateAddress(value) {
      const addressIsUsed = this.formData.outstation.some(otherSection => otherSection.device === this.section.device && otherSection.local_addr === value && otherSection.id !== this.section.id)
      if (!addressIsUsed) return { isValid: true }
      return { isValid: false, message: this.$t('Current local address is already set in the same layer.') }
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.outstation, 'DNP3 Serial Outstation')
    }
  }
}
</script>
