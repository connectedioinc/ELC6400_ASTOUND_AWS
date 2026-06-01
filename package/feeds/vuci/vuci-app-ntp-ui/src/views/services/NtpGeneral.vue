<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ntpclient"
    :after-load="afterLoad"
  >
    <ntp-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Time synchronization')"
      :help="$t('This section is used to configure the device\'s time settings.')"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        ref="gps_sync"
        :uci-section="s"
        name="gps_sync"
        :label="$t('GPS synchronization')"
        :help="$t('Enables periodic time synchronization for the system using the GPS module (does not require an Internet connection).')"
        :depend="gps"
        :warnings="getGNSSWarning"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="gps_interval"
        :label="$t('GPS time update interval')"
        :help="$t('How often the device will update the time using the GPS module.')"
        :options="interval"
        rules="integer"
        initial="86400"
        :depend="gps && s.gps_sync === '1'"
      />
    </ntp-section>
  </vuci-form>
</template>
<script>
import NtpSection from '@/components/services/NtpSection.vue'
export default {
  components: { NtpSection },
  provide() {
    return {
      timeZones: () => this.timeZones,
      deprecatedTimezoneSelected: () => this.deprecatedTimezoneSelected
    }
  },
  data() {
    return {
      gpsEnabled: false,
      wwanGnssConflict: false,
      gps: !!this.$store.board?.hwinfo?.gps,
      interval: [
        ['300', this.$t('Every 5 minutes')],
        ['1800', this.$t('Every 30 minutes')],
        ['3600', this.$t('Every hour')],
        ['21600', this.$t('Every 6 hours')],
        ['43200', this.$t('Every 12 hours')],
        ['86400', this.$t('Every 24 hours')],
        ['604800', this.$t('Every week')],
        ['2592000', this.$t('Every month')]
      ],
      timeZones: [],
      formData: {},
      deprecatedTimezoneSelected: ''
    }
  },
  methods: {
    afterLoad() {
      const modems = this.$store.board.modems || []
      this.wwanGnssConflict = modems.some(modem => modem.wwan_gnss_conflict)

      const requests = ['/api/date_time/ntp/client/timezones/options', { endpoint: '/api/gps/global', condition: this.gps && this.wwanGnssConflict }]

      return this.$axios
        .bulkGet(requests)
        .then(([{ data }, { data: gpsData }]) => {
          this.timeZones = data.timezones
          if (this.formData.ntpclient[0]?.zoneName && !this.timeZones.includes(this.formData.ntpclient[0].zoneName)) {
            this.timeZones.push(this.formData.ntpclient[0].zoneName)
            this.deprecatedTimezoneSelected = this.formData.ntpclient[0].zoneName
          }

          this.gpsEnabled = gpsData?.enabled === '1'
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load timezone options'))
        })
    },
    afterSave(_, res) {
      const messages = res?.messages || []
      const gnssConflict = messages.some(message => message.code === 3)
      if (gnssConflict) {
        this.$message.info(this.$t('GPS service has been enabled. Device may lose WWAN connection due to GNSS.'))
        this.gpsEnabled = true
        this.$refs.gps_sync?.checkWarnings() // this is needed to remove warning after saving
        return
      }
      const gpsEnabled = messages.some(message => message.code === 2)
      if (gpsEnabled) {
        this.$message.info(this.$t('GPS service has been enabled'))
      }
    },
    getGNSSWarning(val) {
      if (val === '1' && this.wwanGnssConflict && !this.gpsEnabled) {
        return this.$t('GPS will be enabled. Device may lose WWAN connection due to GNSS')
      }
    }
  }
}
</script>
