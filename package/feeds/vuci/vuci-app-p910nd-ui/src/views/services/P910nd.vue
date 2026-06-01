<template>
  <vuci-form
    v-slot="{ uciData }"
    config="p910nd"
    :after-load="loadDevices"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('Printer server')"
      :help="$t('Here you can configure how the printer communicates to the router.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'usb_tools/p910nd/config' }]"
      name="general"
      data-key="p910nd"
    >
      <vuci-form-item-switch
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turn this service on or off.')"
        :uci-section="s"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Device')"
        :help="$t('Location of the device file to which the printer is connected to.')"
        name="device"
        :rules="validateLocation"
        :options="devicesOptions"
        allow-create
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Port')"
        :help="$t('TCP listener port.')"
        name="port"
        :options="portOptions"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Bidirectional mode')"
        :help="$t('Allows printer to send status back to the router.')"
        name="bidirectional"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      portOptions: ['9100', '9101', '9102', '9103', '9104', '9105', '9106', '9107', '9108', '9109'],
      devicesOptions: ['/dev/usb/lp0']
    }
  },
  methods: {
    validateLocation(v) {
      if (v === '/dev/usb/') {
        return { isValid: false, message: this.$t('Specify file name') }
      }
      if (!v.startsWith('/dev/usb/')) return { isValid: false, message: this.$t('Location must be prefixed with "/dev/usb/"') }
      if (v.includes('../')) {
        return { isValid: false, message: this.$t('File path traversal is forbidden') }
      }
      return { isValid: true }
    },
    loadDevices() {
      return this.$axios.get('/api/usb_tools/p910nd/options').then(res => {
        this.devicesOptions = [...new Set([...this.devicesOptions, ...res.data])]
      })
    }
  }
}
</script>
