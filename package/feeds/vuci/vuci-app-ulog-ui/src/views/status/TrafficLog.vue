<template>
  <tlt-form
    sid="traffic_log"
    :title="$t('Traffic log')"
    :help="$t('The traffic log section contains information about the router\'s traffic.')"
  >
    <tlt-text-area
      class="h-120 5xl:h-224"
      :model-value="trafficLog"
      custom-id="traffic-log"
      readonly
      :rows="18"
      resize="vertical"
    />
  </tlt-form>
</template>

<script>
export default {
  data() {
    return {
      trafficLog: ''
    }
  },
  created() {
    this.loadLogData()
  },
  methods: {
    loadLogData() {
      return this.$axios
        .get('/api/ulog/status')
        .then(({ data }) => {
          this.trafficLog = data.traffic_log
          if (data.enabled === '0') {
            this.$notification.info(this.$t('Traffic logging is not %s enabled %s').format("<a class=link href='/services/logging'>", '</a>'), true)
          }
          if (data.ftp_enabled === '1') {
            this.$notification.info(this.$t('To save internal memory, logs will be removed once they are uploaded to the FTP server'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get traffic logging information'))
        })
    }
  }
}
</script>
