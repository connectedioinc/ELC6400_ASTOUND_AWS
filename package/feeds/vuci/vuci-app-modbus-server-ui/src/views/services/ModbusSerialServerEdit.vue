<template>
  <vuci-form
    v-model="formData"
    config="modbus_server"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="modbusSerialServer"
        :endpoints="[{ endpoint: 'modbus/server/serial/config' }]"
        :title="$utils.getModalTitle($t('device modbus server'), section.name)"
        :help="$t('Settings for Modbus serial server configuration.')"
        :error-handlers="{ edit: handleErrors }"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          rawhtml
          :help="$t('Enable service.')"
          :readonly="!canSerialDeviceBeUsed && s.enabled !== '1'"
          @change="showOverlapWarning(s)"
        />
        <serial-inline-warning
          :serial-devices="formOptions().serial"
          :serial-status="formOptions().status"
          :initial-device="initialDevice"
          :device="s.device"
          service="Modbus Serial Server"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          :help="$t('Name of serial device.')"
          maxlength="200"
          name="name"
          required
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Device')"
          :help="$t('Which serial port will be used for serial communication.')"
          name="device"
          :options="formOptions().device"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Device ID')"
          :help="$t('Modbus server ID that this device will respond to (0-255).')"
          name="device_id"
          placeholder="1"
          initial="1"
          rules="irange(0,255)"
          required
        />
        <vuci-form-item-select
          v-if="!$store.isSwitch"
          :uci-section="s"
          :label="$t('Mobile data type')"
          :help="$t('Selects mobile data unit representation type.')"
          name="md_data_type"
          :options="dataTypeOptions"
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
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable broadcasts')"
          :help="$t('Process incoming Modbus broadcast messages.')"
          name="broadcasts"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable custom register block')"
          :help="$t('Allow custom register block.')"
          name="clientregs"
          @change="showOverlapWarning(s)"
        />
        <vuci-form-item-custom
          :uci-section="s"
          name="regfile"
          inputs="select,input"
          :label="$t('Register file path')"
          :input-props="[prefixProps, getPathProps(s, uciData)]"
          :help="
            $t(`Path to file in which the custom register block will be stored. Files inside /tmp or /var are stored in RAM.
          They vanish after reboot, but do not degrade flash memory. Files elsewhere are stored in flash memory.
          They remain after reboot, but degrade flash memory (severely, if operations are frequent).`)
          "
          :write-parse="writeParseRegFile"
          :load-parse="loadParseRegFile"
          :depend="s.clientregs === '1'"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('First register number')"
          :help="$t('First register in custom register block (%s-65536).'.format(getRegFileFirstRegister(s)))"
          name="regfilestart"
          :placeholder="getRegFileFirstRegister(s)"
          :initial="getRegFileFirstRegister(s)"
          :rules="validateRegFileFirstRegister"
          :depend="s.clientregs === '1'"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Register count')"
          :help="$t('Register count in custom register block (1-64512).')"
          name="regfilesize"
          placeholder="128"
          initial="128"
          rules="irange(1,64512)"
          :depend="s.clientregs === '1'"
          required
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
import commonFunctions from './ModbusCommonFunctionMixin.vue'

export default {
  components: { SerialInlineWarning },
  mixins: [commonFunctions],
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
      initialData: '',
      dataTypeOptions: [
        ['0', this.$t('Bytes')],
        ['1', this.$t('Kilobytes')],
        ['2', this.$t('Megabytes')]
      ],
      prefixProps: {
        prop: 'prefix',
        options: ['/mnt/', '/tmp/', '/var/', '/usr/share/modbus/']
      },
      overlapWarning: this.$t('Enabled custom register block may cause register overlapping in data sources.')
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
        service: 'Modbus Serial Server'
      })
    },
    anyDeviceExists() {
      return !!this.formOptions().device.length
    }
  },
  methods: {
    loadInitial() {
      this.initialDevice = this.section.device
      this.showOverlapWarning(this.section)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.modbusSerialServer, 'Modbus Serial Server')
    },
    showOverlapWarning(s) {
      if (this.$store.isSwitch) return
      if (s.clientregs === '1' && s.enabled === '1') this.$notification.warning(this.overlapWarning)
      else this.$notification.remove(this.overlapWarning)
    },
    getPathProps(section, uciData) {
      return {
        prop: 'path',
        placeholder: 'regfile',
        required: true,
        maxlength: null,
        rules: v => this.regFileValidate(v, section, uciData.modbusSerialServer, this.formOptions().tcp)
      }
    }
  }
}
</script>
