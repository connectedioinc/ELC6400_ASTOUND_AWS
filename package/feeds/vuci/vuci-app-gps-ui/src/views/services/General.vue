<template>
  <vuci-form
    v-slot="{ uciData }"
    config="gps"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/global' }]"
      data-key="general"
      :after-save="afterSave"
    >
      <tlt-card
        :title="$t('GPS configuration')"
        :help="$t('GPS service needs to be enabled to use GPS related functionality. You can micromanage this service using configuration options inside the sections to the left.')"
      >
        <tlt-form-model-item
          element-id="status"
          :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
          :label="$t('Status')"
        >
          <tlt-dummy-value
            :value="isStatusGood ? $t('Up') : $t('Down')"
            :class="isStatusGood ? 'success' : 'error'"
          />
          <tlt-dummy-value
            v-if="isStatusGood"
            :value="displayUptime(gpsStatusData?.uptime)"
          />
        </tlt-form-model-item>
        <tlt-inline-message
          v-show="showIntervalWarning(s)"
          type="warning"
          :message="$t('WWAN operation may be unstable when interval is under 300 seconds')"
        />
        <tlt-inline-message
          v-show="showTimeoutWarning(s)"
          type="warning"
          :message="$t('GNSS may not get a fix if timeout is under 100 seconds')"
        />
        <vuci-form-item-switch
          ref="gps_enabled"
          :uci-section="s"
          :label="$t('Enabled')"
          :help="$t('Turns the GPS service on or off. This field has to be enabled in order to use any GPS related functions.')"
          name="enabled"
          :warnings="v => getGNSSWarnings(v, s)"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Mode')"
          :help="$t('WWAN and GNSS coexistance mode.')"
          name="mode"
          initial="0"
          :depend="wwanGnssConflict"
          :options="modeOptions"
          @change="onModeChange"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Interval')"
          :help="$t('How frequently should GNSS be activated (seconds).')"
          name="interval"
          :depend="wwanGnssConflict && s.mode === MODE_WWAN_WITH_GNSS"
          rules="irange(60,86400)"
          initial="300"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Timeout')"
          :help="$t('Maximum GNSS position fix waiting time (seconds).')"
          name="timeout"
          :depend="wwanGnssConflict && s.mode === MODE_WWAN_WITH_GNSS"
          rules="irange(30,999)"
          initial="100"
          required
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('DPO enabled')"
          :help="$t('Enable dynamic power optimization (requires modem reboot).')"
          name="dpo_enabled"
          :depend="dpoExists"
        />
      </tlt-card>
      <tlt-card
        v-show="!slm770"
        :title="$t('Satellite configuration')"
        :help="$t('This section is used turn support of certain satellite types on or off. Changing these options requires modem reboot.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Galileo NMEA support')"
          :help="$t('Turns support for Galileo satellites on or off.')"
          name="galileo_sup"
          :depend="!slm770"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Glonass NMEA support')"
          :help="$t('Turns support for Glonass satellites on or off.')"
          name="glonass_sup"
          :depend="!slm770"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('BeiDou NMEA support')"
          :help="$t('Turns support for BeiDou satellites on or off.')"
          name="beidou_sup"
          :depend="!slm770"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    const MODE_GNSS_ONLY = '0'
    const MODE_WWAN_WITH_GNSS = '1'

    return {
      MODE_GNSS_ONLY,
      MODE_WWAN_WITH_GNSS,
      slm770: false,
      dpoExists: false,
      wwanGnssConflict: false,
      modeOptions: [
        [MODE_GNSS_ONLY, 'GNSS Only'],
        [MODE_WWAN_WITH_GNSS, 'WWAN + GNSS']
      ],
      modeWarnings: [this.$t('Device WWAN connection will be lost due to GNSS'), this.$t('Device may lose WWAN connection due to GNSS')],
      gpsStatusData: {}
    }
  },
  computed: {
    isStatusGood() {
      return this.gpsStatusData?.uptime !== undefined
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    updateStatus() {
      return this.$axios
        .get('/api/gps/status')
        .then(({ data }) => {
          this.gpsStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData() {
      const modems = this.$store.board.modems || []
      this.slm770 = modems.some(modem => modem.revision?.startsWith('SLM770') || modem.revision?.startsWith('BG95'))
      this.wwanGnssConflict = modems.some(modem => modem.wwan_gnss_conflict)

      return this.$axios
        .get('/api/gps/status')
        .then(status => {
          this.dpoExists = status.data.dpo_support === '1'
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load GPS feature status'))
        })
    },
    afterSave(_, res) {
      const messages = res?.messages || []
      const arrayOffset = 1
      const messageTexts = [this.$t('NTP client GPS synchronization has been disabled'), ...this.modeWarnings]
      messages.forEach(m => {
        const message = messageTexts[m.code - arrayOffset]
        if (message) this.$message.info(message)
      })
    },
    getGNSSWarnings(value, section) {
      if (value === '1' && this.wwanGnssConflict) {
        return this.modeWarnings[section.mode]
      }
    },
    onModeChange() {
      this.$refs.gps_enabled.checkWarnings()
    },
    showIntervalWarning(section) {
      if (!this.wwanGnssConflict) return false
      if (section.mode !== this.MODE_WWAN_WITH_GNSS) return false

      const interval = Number(section.interval)
      return interval < 300
    },
    showTimeoutWarning(section) {
      if (!this.wwanGnssConflict) return false
      if (section.mode !== this.MODE_WWAN_WITH_GNSS) return false

      const timeout = Number(section.timeout)
      return timeout < 100
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    }
  }
}
</script>
