<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ntpd"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('NTPD')"
      type="timeserver"
      name="ntp"
      :endpoints="[
        {
          endpoint: 'date_time/ntpd/config'
        }
      ]"
      data-key="ntpd"
      :error-handlers="{ edit: handleEditErrors }"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable NTPD.')"
        initial="0"
        :readonly="ntpServerEnabled"
        :rmempty="false"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="file_flag"
        :label="$t('Enable NTP config from file')"
        :help="$t('Run NTPD with uploaded configuration file.')"
        initial="0"
        :rmempty="false"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="config_file"
        :label="$t('NTP configuration file')"
        :help="$t('Warning! This will overwrite your current configuration.')"
        :depend="s.file_flag === '1'"
        :required="s.enabled === '1' && s.file_flag === '1'"
        max-size="16MB"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="server"
        :label="$t('Server')"
        :help="$t('Enter NTP server hostname for time synchronization.')"
        placeholder="myhost.example.com"
        rules="host"
        :depend="s.file_flag === '0'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_server"
        :label="$t('Enable server')"
        :help="$t('This is used to make the router act as an NTP server so that it can provide time synchronization services for other network devices.')"
        initial="0"
        :depend="s.file_flag === '0'"
        :rmempty="false"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      ntpServerEnabled: false,
      formData: {},
      editErrors: {
        103: this.$t('NTP configuration file is required'),
        default: this.$t('Failed to edit configuration')
      }
    }
  },
  methods: {
    afterLoad() {
      return this.$axios
        .get('/api/date_time/ntp/server/config/general')
        .then(({ data }) => {
          this.ntpServerEnabled = data.enabled === '1'
          if (this.ntpServerEnabled) {
            this.$notification.info(this.$t("Can't enable NTPD and NTP server both at the same time"))
          }
        })
        .catch(() => {
          this.$message.error('Failed to get NTP server status')
        })
    },
    handleEditErrors(res) {
      const errorCode = res.data.errors[0].code
      return this.editErrors[errorCode] || this.editErrors.default
    }
  }
}
</script>
