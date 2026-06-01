<template>
  <vuci-form-item-switch
    :uci-section="section"
    :label="$t('Enable')"
    :help="$t('Check to enable this %s client configuration.').format(tcpClient ? $t('TCP') : $t('Serial'))"
    :readonly="!tcpClient && !canSerialDeviceBeUsed && section.enabled !== '1'"
    name="enabled"
  />
  <serial-inline-warning
    v-show="!tcpClient"
    :serial-status="status"
    :serial-devices="devices"
    :initial-device="initialDevice"
    :device="section?.device"
    service="DNP3 Serial Client"
  />
  <vuci-form-item-input
    :uci-section="section"
    :label="$t('Name')"
    :help="$t('Name of the %s client.').format(tcpClient ? $t('TCP') : $t('Serial'))"
    name="name"
    :placeholder="$t('Name')"
    maxlength="32"
    required
  />
  <slot />
  <vuci-form-item-input
    :uci-section="section"
    :label="$t('Local Address')"
    :help="$t('Client Link-Layer address.')"
    name="local_addr"
    placeholder="1"
    :rules="['irange(0,65519)', validateAddress]"
    required
  />
  <vuci-form-item-input
    :uci-section="section"
    :label="$t('Remote Address')"
    :help="$t('Outstation Link-Layer address.')"
    name="remote_addr"
    placeholder="10"
    rules="irange(0,65519)"
    required
  />
  <vuci-form-item-input
    :uci-section="section"
    :label="$t('Period')"
    :help="$t('Period for sending data requests.')"
    name="integrity_period"
    rules="irange(1,60)"
    placeholder="60"
    initial="60"
    required
  />
  <vuci-form-item-input
    :uci-section="section"
    :label="$t('Timeout')"
    :help="$t('Request timeout.')"
    name="timeout"
    placeholder="3"
    rules="irange(1,60)"
    required
  />
  <tlt-form-accordion name="advanced_settings">
    <vuci-form-item-switch
      :uci-section="section"
      :label="$t('Save to flash')"
      :help="$t('Check to enable saving to flash. Enabling this option might cause wear on the flash memory.')"
      name="save_to_flash"
      :rmempty="false"
    />
  </tlt-form-accordion>
</template>

<script>
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'

export default {
  components: { SerialInlineWarning },
  props: {
    section: {
      type: Object,
      required: true
    },
    tcpClient: {
      type: Boolean,
      default: false
    },
    initialDevice: {
      type: String,
      default: ''
    },
    formData: {
      type: Object,
      required: true
    },
    status: {
      type: Array,
      default: () => []
    },
    devices: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.devices,
        serialStatus: this.status,
        initialDevice: this.initialDevice,
        device: this.section?.device,
        service: 'DNP3 Serial Client'
      })
    }
  },
  methods: {
    validateAddress(value) {
      const usedInTCP =
        this.tcpClient &&
        this.formData.dnp3.some(
          otherSection => otherSection.ip === this.section.ip && otherSection.port === this.section.port && otherSection.local_addr === value && otherSection.id !== this.section.id
        )
      const usedInSerial =
        !this.tcpClient && this.formData.dnp3.some(otherSection => otherSection.device === this.section.device && otherSection.local_addr === value && otherSection.id !== this.section.id)
      if (usedInTCP || usedInSerial) return { isValid: false, message: this.$t('Current local address is already set in the same layer.') }
      return { isValid: true }
    }
  }
}
</script>
