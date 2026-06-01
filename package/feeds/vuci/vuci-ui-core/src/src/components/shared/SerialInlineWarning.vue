<template>
  <tlt-inline-message
    v-if="message"
    id="device-service-enabled"
    :type="message[1] || 'warning'"
  >
    <!-- eslint-disable -->
    <div v-html="$xss(message[0])" />
    <!-- eslint-enable -->
  </tlt-inline-message>
</template>

<script>
export default {
  props: {
    serialStatus: {
      type: Array,
      required: true
    },
    service: {
      type: String,
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
    serialDevices: {
      type: Array,
      default: undefined
    },

    // 'ignoreMbusScanHint' is used os that, the 'Stop scan' button could still be used
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
    message() {
      return this.$serial.getDeviceMessage({
        serialDevices: this.serialDevices,
        serialStatus: this.serialStatus,
        service: this.service,
        initialDevice: this.initialDevice,
        device: this.device,
        ignoreMbusScan: this.ignoreMbusScan,
        mbusScanStatus: this.mbusScanStatus
      })
    }
  }
}
</script>
