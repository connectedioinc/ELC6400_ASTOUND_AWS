<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="bacnet"
    :after-load="loadInitial"
    :before-save="validate"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('MSTP configuration')"
      :name="section.id"
      :endpoints="[{ endpoint: 'bacnet/mstp/config' }]"
      data-key="mstp"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable service.')"
        :readonly="(!canSerialDeviceBeUsed && s.enabled !== '1') || (s.enabled === '1' && formData.general[0].enabled === '1' && enabledInterfaces < 3)"
      />
      <serial-inline-warning
        :serial-status="formOptions().status"
        :serial-devices="formOptions().serial"
        :initial-device="initialDevice"
        :device="s.device"
        service="BACnet"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="network"
        :label="$t('Network ID')"
        :help="$t('Unique identifier for the BACnet MSTP network.')"
        placeholder="1"
        :required="s.enabled === '1'"
        :rules="['irange(1,65534)', validateNetworkID]"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('MSTP MAC')"
        :help="$t('Router MSTP MAC address.')"
        name="mac"
        rules="irange(0,127)"
        initial="1"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('MSTP MAC max')"
        :help="$t('Maximum client address in the MSTP network.')"
        name="max_client"
        rules="irange(1,127)"
        initial="127"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Device')"
        :help="$t('Which serial port will be used for serial communication.')"
        name="device"
        :options="formOptions().device.filter(dev => dev && !['/dev/rs232', '/dev/mbus', '/dev/rsconsole'].includes(dev[0]))"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Baud rate')"
        name="baud"
        :help="$t('Select serial device baud rate.')"
        :options="serialOptions.baudRate"
        initial="38400"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Parity')"
        name="parity"
        :help="$t('Select serial device parity bit.')"
        :options="serialOptions.parity"
        initial="None"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Data bits')"
        name="databits"
        :help="$t('Select serial device data bit count.')"
        :options="serialOptions.dataBits"
        initial="8"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Stop bits')"
        name="stopbits"
        :help="$t('Serial device data stop bit count.')"
        :options="serialOptions.stopBits"
        initial="1"
      />
    </vuci-named-section>
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
    enabledInterfaces() {
      const bipEnabledCount = this.formData.bip.filter(s => s.enabled === '1').length
      const mstpEnabledCount = this.formData.mstp.filter(s => s.enabled === '1').length
      const bbmdEnabled = this.formData?.general?.[0].bbmd_enabled === '1' ? 1 : 0
      return bipEnabledCount + mstpEnabledCount + bbmdEnabled
    },
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        device: this.section.device,
        initialDevice: this.initialDevice,
        service: 'BACnet'
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
    validateNetworkID(val) {
      if (this.formData?.mstp?.some(mstp => mstp.network === val && mstp.id !== this.section.id))
        return { isValid: false, message: this.$t('Network ID is already used in another MSTP configuration.') }
      if (this.formData?.bip?.some(bip => bip.network === val)) return { isValid: false, message: this.$t('Network ID is already used in BIP configuration.') }
      return { isValid: true }
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.mstp, 'BACnet')
    }
  }
}
</script>
