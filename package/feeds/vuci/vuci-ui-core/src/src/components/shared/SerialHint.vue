<template>
  <tlt-hint
    rawhtml
    :hints="message && !hidden ? [{ info: message[0] }] : []"
  >
    <slot :disabled="!canSerialDeviceBeUsed && !hidden" />
  </tlt-hint>
</template>

<script>
export default {
  props: {
    serialStatus: {
      type: Array,
      required: true
    },
    initialDevice: {
      type: String,
      default: ''
    },
    device: {
      type: String,
      default: ''
    },
    service: {
      type: String,
      required: true
    },
    hidden: {
      type: Boolean,
      default: false
    },
    serialDevices: {
      type: Array,
      default: undefined
    },

    // 'ignoreMbusScanHint' is used so that, the 'Stop scan' button could still be used
    ignoreMbusScan: {
      type: Boolean,
      default: false
    },
    // 'mbusScanStatus' is used os that, button could be immidiately disabled after a scan starts.
    // So that it would not require a getting 'serialStatus' again.
    mbusScanStatus: {
      type: Object,
      default: undefined
    }
  },
  computed: {
    serialOptions() {
      return {
        serialDevices: this.serialDevices,
        serialStatus: this.serialStatus,
        initialDevice: this.initialDevice,
        service: this.service,
        device: this.device,
        ignoreMbusScan: this.ignoreMbusScan,
        mbusScanStatus: this.mbusScanStatus
      }
    },
    message() {
      return this.$serial.getDeviceMessage(this.serialOptions)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed(this.serialOptions)
    }
  }
}
</script>
