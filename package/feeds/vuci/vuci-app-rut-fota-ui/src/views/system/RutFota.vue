<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="rut_fota"
  >
    <tlt-card
      :title="$t('FOTA settings')"
      :help="$t('Configuration for FOTA and firmware notifications.')"
    >
      <vuci-named-section
        v-slot="{ s }"
        test-id="device-settings-section"
        name="general"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'fota/config' }]"
        data-key="rutFota"
        :after-save="afterSave"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the FOTA service on or off.')"
          name="enabled"
          :rmempty="false"
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          :label="$t('Firmware update preference')"
          :options="defaultFirmware"
          :help="updatePreferenceHint"
          name="latest"
          initial="0"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Device firmware update notifications')"
          :help="$t('Enables notifications across WebUI when new device firmware version is available on the server.')"
          name="notify"
          :depend="s.enabled === '1'"
          initial="1"
        />
      </vuci-named-section>
      <vuci-named-section
        v-if="$store.hasPackages('mobifd.control') && $store.hasPackages('dfota.control')"
        v-slot="{ s }"
        test-id="modem-settings-section"
        name="dfota"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'dfota/config' }]"
        data-key="dfota"
        class="mt-6!"
        :after-save="afterSaveDfota"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Modem firmware update notifications')"
          :help="$t('Enables notifications across WebUI when new modem firmware version is available on the server.')"
          name="notify"
          :depend="formData.rutFota[0].enabled === '1'"
          initial="1"
        />
      </vuci-named-section>
    </tlt-card>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      defaultFirmware: [
        {
          name: this.$t('Stable firmware'),
          value: '0'
        },
        {
          name: this.$t('Latest firmware'),
          value: '1'
        }
      ]
    }
  },
  computed: {
    updatePreferenceHint() {
      const hasMobile = this.$store.board.hwinfo.mobile
      const baseHint = this.$t('Select firmware type to get notifications across WebUI when new device firmware version is available on the server.')
      const smsUtilitiesHint = this.$t('SMS Utilities use this setting to determine which firmware version to install on the device.')
      return hasMobile ? `${baseHint} ${smsUtilitiesHint}` : baseHint
    }
  },
  methods: {
    afterSave(_, { success, data }) {
      if (!success) return
      this.$store.fotaInfo.enabled = data.enabled
      this.$store.fotaInfo.notify = data.notify
      this.$store.fotaInfo.latest = data.latest
    },
    afterSaveDfota(_, { success, data }) {
      if (!success) return
      this.$store.fotaInfo.notify_modem = this.formData.rutFota[0].enabled === '1' ? data.notify : '0'
    }
  }
}
</script>
