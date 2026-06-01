<script>
export default {
  created() {
    if (this.$store.board.hwinfo.rs232 || this.$store.board.hwinfo.rs485 || this.$store.board.hwinfo.usb) this.getModemControlMode()
  },
  methods: {
    getModemControlMode() {
      return this.$axios
        .get('/api/modem_control/config', { condition: 'vuci-app-modem-control-api.control' })
        .then(({ data }) => {
          if (data.some(modem => modem.ctl_mode === 'full' && modem.enabled === '1')) {
            this.$notification.info(
              this.$t('This service will not work when then modem is under full control. Please disable %s Modem Control %s to use this feature.').format(
                "<a class=link href='/services/serial_utilities/modem_control'>",
                '</a>'
              ),
              true
            )
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
    }
  },
  render() {
    return null
  }
}
</script>
