<template>
  <vuci-form
    v-model="formData"
    config="modbusgateway"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="rtu_device"
        :endpoints="[{ endpoint: 'modbus/serial_gateway/config' }]"
        :title="$utils.getModalTitle($t('serial gateway'), section.id)"
        :help="$t('Settings for Serial gateway configuration.')"
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
          service="MQTT Modbus Serial Gateway"
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
        service: 'MQTT Modbus Serial Gateway'
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
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.rtu_device, 'MQTT Modbus Serial Gateway')
    }
  }
}
</script>
