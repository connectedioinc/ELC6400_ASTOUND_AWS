<template>
  <vuci-form
    v-model="formData"
    config="vuci;system;ntpclient"
    :after-load="loadData"
  >
    <template #default="{ uciData }">
      <admin-section
        :uci-data="uciData"
        :title="$t('WebUI settings')"
        :installed-languages="installedLanguages"
        :default-language="defaultLanguage"
        @packages-change="packages => (availablePackages = packages)"
        @languages-change="langs => (installedLanguages = langs)"
        @language-change="newLang => (defaultLanguage = newLang)"
      />
      <ntp-section
        :uci-data="uciData"
        :title="$t('General settings')"
      />
    </template>
    <template #form-buttons="{ save }">
      <setup-wizard-steps
        :save="save"
        :back="false"
      />
    </template>
  </vuci-form>
</template>

<script>
import AdminSection from '@/components/system/AdminSection.vue'
import NtpSection from '@/components/services/NtpSection.vue'
import SetupWizardSteps from '@/components/system/SetupWizardSteps.vue'

export default {
  components: { NtpSection, AdminSection, SetupWizardSteps },
  provide() {
    return {
      timeZones: () => this.timeZones,
      deprecatedTimezoneSelected: () => this.deprecatedTimezoneSelected
    }
  },
  data() {
    return {
      installedLanguages: [],
      defaultLanguage: '',
      timeZones: [],
      formData: {
        settings: []
      },
      deprecatedTimezoneSelected: ''
    }
  },
  methods: {
    loadData(form) {
      this.defaultLanguage = form.settings.find(s => s.id === 'general').lang_code
      return this.$axios
        .bulkGet(['/api/system/languages/options', '/api/date_time/ntp/client/timezones/options'])
        .then(([languagesData, zonesData]) => {
          if (languagesData.success) this.installedLanguages = languagesData.data
          else this.$message.error(this.$t('Failed to load installed languages'))
          if (zonesData.success) {
            this.timeZones = zonesData.data.timezones
            if (this.formData.ntpclient[0]?.zoneName && !this.timeZones.includes(this.formData.ntpclient[0].zoneName)) {
              this.timeZones.push(this.formData.ntpclient[0].zoneName)
              this.deprecatedTimezoneSelected = this.formData.ntpclient[0].zoneName
            }
          } else this.$message.error(this.$t('Failed to load timezone options'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
