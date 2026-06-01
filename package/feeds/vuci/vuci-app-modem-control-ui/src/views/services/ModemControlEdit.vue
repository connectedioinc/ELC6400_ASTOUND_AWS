<template>
  <vuci-form
    v-model="formData"
    config="rs_modem"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="modem"
        :endpoints="[{ endpoint: 'modem_control/config' }]"
        :title="$utils.getModalTitle($t('device'), device)"
        :help="$t('Settings for selected device.')"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <tlt-tabs :tabs="tabs">
          <template #general>
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
              service="RS Modem"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Name')"
              :help="$t('Name of serial device.')"
              name="name"
              maxlength="200"
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
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Modem')"
              :help="$t('Modem, which will be used for modem control.')"
              name="modem"
              :depend="formOptions().mobile.length > 1"
              :options="formOptions().mobile"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Mode')"
              :help="$t('Select modem control mode.')"
              name="ctl_mode"
              :options="modeOptions"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Full Duplex')"
              :help="$t('Check to enable rs485 Full-Duplex.')"
              name="full_duplex_enabled"
              :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
            />
          </template>
          <template #advancedTab>
            <vuci-form-item-list
              :uci-section="s"
              name="start_up_msg"
              :label="$t('Start up message')"
              :help="$t('Prints message to serial device when modem control is ready.')"
              :maxlines="8"
              maxlength="500"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="data_mode"
              :label="$t('Data mode')"
              :help="$t('Enable this option to allow data mode. Data mode will not operate without it.')"
              :depend="!!$store.board.hwinfo.urc_control && s.canonical_mode !== '1'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="canonical_mode"
              :label="$t('Canonical mode')"
              :help="$t('Forwards data to modem only when new line symbol (\'\\n\') is detected.')"
              :depend="s.data_mode !== '1'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="csd_enabled"
              :label="$t('Enable CSD')"
              :help="$t('Enable CSD service.')"
              :depend="isCsdSupported && s.ctl_mode === 'full'"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Network mode')"
              :help="$t('Network mode for CSD service. Auto - switching between 2G/3G and LTE.')"
              name="csd_scan_mode"
              :options="networkModes"
              :depend="s.csd_enabled === '1' && isCsdSupported"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Role')"
              :help="$t('Role for CSD service.')"
              name="csd_role"
              :options="roles"
              :depend="s.csd_enabled === '1' && isCsdSupported"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Allow all numbers')"
              :help="$t('Accepts calls from every number.')"
              name="csd_allow_all_numbers"
              initial="1"
              :depend="s.csd_enabled === '1' && isCsdSupported && s.csd_role === '1'"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="csd_allowed_number"
              :label="$t('Allowed phone numbers')"
              :help="$t('Only accept calls from these specific numbers.')"
              :maxlines="16"
              :depend="s.csd_enabled === '1' && isCsdSupported && s.csd_role === '1' && s.csd_allow_all_numbers === '0'"
              rules="phonedigit"
            />
          </template>
        </tlt-tabs>
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
      networkModes: [
        ['0', this.$t('Auto')],
        ['1', this.$t('2G only')]
      ],
      tabs: [
        { name: 'general', title: this.$t('General') },
        { name: 'advancedTab', title: this.$t('Advanced') }
      ],
      roles: [
        ['0', this.$t('Caller')],
        ['1', this.$t('Responder')]
      ],
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
    modemInfo() {
      const modems = this.formOptions().modem
      return this.section.modem ? modems.find(modem => modem.id === this.section.modem) : modems[0]
    },
    isCsdSupported() {
      return !!this.modemInfo?.csd
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        initialDevice: this.initialDevice,
        device: this.section.device,
        service: 'RS Modem'
      })
    },
    modeOptions() {
      const options = [['full', this.$t('Full control')]]
      if (!this.modemInfo?.red_cap) options.unshift(['partial', this.$t('Partial control')])
      return options
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
      return new Promise((resolve, reject) => {
        const enabled = this.formData.modem.filter(instance => instance.enabled === '1')
        const response = this.$serial.validateBeforeSave(this.formOptions().status, this.formData.modem, 'RS Modem', false)
        const fullControl = enabled.some(instance => instance.ctl_mode === 'full')
        if (fullControl && enabled.length > 1) reject(this.$t('Only one instance can be enabled when modem is fully controlled'))
        if (!response.isValid) reject(response.message)
        else resolve()
      })
    }
  }
}
</script>
