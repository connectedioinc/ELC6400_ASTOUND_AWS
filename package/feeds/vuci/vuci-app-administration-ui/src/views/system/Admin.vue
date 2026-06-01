<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="vuci"
    :after-load="loadLanguages"
  >
    <admin-section
      v-if="hasPackageManager"
      :uci-data="uciData"
      :title="$t('General settings')"
      :installed-languages="installedLanguages"
      :default-language="defaultLanguage"
      @languages-change="langs => (installedLanguages = langs)"
      @language-change="newLang => (defaultLanguage = newLang)"
    />
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'system/config' }]"
      data-key="administration_system"
      :after-save="onAfterSave"
    >
      <tlt-card :title="$t('Device name and hostname')">
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Device name')"
          :help="$t('Specifies device name.')"
          name="devicename"
          rules="string"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Hostname')"
          :help="$t('Specifies how device will be seen by other devices.')"
          name="hostname"
          rules="system_host"
          required
        />
        <vuci-form-item-switch
          v-if="!hasPackageManager && $brand('sentryDSN')"
          :uci-section="s"
          name="data_analytics"
          :label="$t('Data analytics')"
          :help="
            $t(
              'Enables the collection of data, which is used to improve the quality and user experience of our products. \
        It includes sending information about the device and the usage of the Web interface. \
        The data is collected in compliance with the %sPrivacy policy%s.'
            ).format(`<a target='_blank' href='${$brand('privacyPolicyURL')}'>`, '</a>')
          "
          rawhtml
        />
      </tlt-card>
      <tlt-card :title="$t('Notification settings')">
        <vuci-form-item-switch
          :uci-section="s"
          name="notifications_enabled"
          :label="$t('Show notifications')"
          :help="$t('Notifications are brief, page specific messages or warnings that provide information about functionalities and statuses.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="alerts_enabled"
          :label="$t('Show alerts')"
          :help="
            $t(
              'Alerts are high-importance system or page messages that usually require immediate attention and action. \
              They may inform about updates, expiring functionalities, and similar events.'
            )
          "
        />
      </tlt-card>
    </vuci-named-section>
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'system/banner/config' }]"
      data-key="login_banner"
      :title="$t('Login banner message')"
      :after-save="updateSecurityBanner"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('This login banner message appears during the login process. It helps to ensure that all users are aware of the rules and guidelines they must follow before accessing the system.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="title"
        :label="$t('Message title')"
        maxlength="64"
        rules="string"
        :depend="s.enabled === '1'"
        :initial="$t('Unauthorized access prohibited')"
        required
      />
      <vuci-form-item-text-area
        :uci-section="s"
        name="message"
        :label="$t('Message text')"
        :depend="s.enabled === '1'"
        rows="6"
        :initial="defaultMessage"
        maxlength="512"
        required
      />
    </vuci-named-section>
    <vuci-named-section
      v-if="!$store.isSwitch && $store.hasPackages(['ledman-full.control', 'ledman.control', 'ledman-light.control'], false)"
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'system/led/config' }]"
      data-key="led"
      :title="$t('LED indication')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns on/off LEDs indication.')"
        name="enabled"
        :rmempty="false"
      />
    </vuci-named-section>
    <vuci-typed-section
      v-if="$store.isSwitch || $store.board.hwinfo.reset_button"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'system/buttons/config' }]"
      :form-methods="['edit', 'get']"
      data-key="buttons"
      :columns="btnColumns"
      type="button"
      :title="$t('Reset button configuration')"
      :table-actions="['search', 'column-list']"
    >
      <template #handler="{ s }">
        <vuci-form-item-dummy
          :display-value="parseActionLabels"
          :uci-section="s"
          name="handler"
          no-write
        />
      </template>
      <template #min="{ s }">
        <div>
          <vuci-form-item-input
            :uci-section="s"
            name="min"
            :rules="['irange(0, 60)', lowerThanMaxValidate, noOverlapValidate]"
            :required="s.enabled === '1'"
          />
        </div>
      </template>
      <template #max="{ s }">
        <div>
          <vuci-form-item-input
            :uci-section="s"
            name="max"
            :rules="['irange(0, 60)', higherThanMinValidate, noOverlapValidate]"
            :required="s.enabled === '1'"
          />
        </div>
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          initial="1"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import AdminSection from '@/components/system/AdminSection.vue'

export default {
  components: { AdminSection },
  data() {
    return {
      defaultMessage: '%s\n\n%s'.format(
        this.$t(
          'This system is for authorized use only. All activities on this system are logged and monitored. By using this system, you consent to such monitoring. Unauthorized access or misuse may result in disciplinary action, civil and criminal penalties, or both.'
        ),
        this.$t('If you are not authorized to use this system, disconnect immediately.')
      ),
      formData: {},
      installedLanguages: [],
      defaultLanguage: '',
      btnColumns: [
        { name: 'handler', label: this.$t('Action'), width: 'w-40' },
        { name: 'min', label: this.$t('Min time (sec)'), width: 'xs' },
        { name: 'max', label: this.$t('Max time (sec)'), width: 'xs' },
        { name: 'enabled', label: this.$t('Enabled'), width: 'w-20' }
      ],
      actionLabels: {
        reboot: this.$t('Reboot'),
        default: this.$t("User's defaults configuration"),
        firstboot: this.$t('Factory defaults configuration')
      }
    }
  },
  computed: {
    hasPackageManager() {
      return this.$store.hasPackages('package-manager-api')
    }
  },
  methods: {
    loadLanguages(form) {
      if (!this.hasPackageManager) return Promise.resolve({})
      this.defaultLanguage = form.settings.find(s => s.id === 'general').lang_code
      return this.$axios
        .get('/api/system/languages/options')
        .then(languagesData => {
          if (languagesData.success) this.installedLanguages = languagesData.data
          else this.$message.error(this.$t('Failed to load installed languages'))
        })
        .catch(() => {
          this.$message.error('An unexpected error occurred')
        })
    },
    parseActionLabels(actionName) {
      return this.actionLabels[actionName]
    },
    lowerThanMaxValidate(valueText, self) {
      const sectionValues = self.uciSection
      if (sectionValues.enabled === '0') return { isValid: true }
      const value = Number(valueText)
      const max = Number(sectionValues.max)
      if (!isNaN(max) && max <= value) {
        return {
          isValid: false,
          message: this.$t('Lower interval bound cannot be higher or equal to upper bound value')
        }
      }
      return { isValid: true }
    },
    higherThanMinValidate(valueText, self) {
      const sectionValues = self.uciSection
      if (sectionValues.enabled === '0') return { isValid: true }
      const value = Number(valueText)
      const min = Number(sectionValues.min)
      if (!isNaN(min) && min >= value) {
        return {
          isValid: false,
          message: this.$t('Upper interval bound cannot be lower or equal to lower bound value')
        }
      }
      return { isValid: true }
    },
    findOtherRows(currentRow, rows) {
      return rows.filter(e => e !== currentRow && e.enabled === '1')
    },
    noOverlapValidate(_, self) {
      const currentRow = self.uciSection
      const rows = self.vuciForm.uciData.buttons
      if (currentRow.enabled === '0') return { isValid: true }
      const validator = { isValid: true }
      const otherRows = this.findOtherRows(currentRow, rows)
      const validatorTexts = []
      otherRows.forEach(otherRow => {
        if (this.intervalsOverlap(currentRow, otherRow)) {
          validatorTexts.push(this.$t('Overlaps with interval [%s:%s]').format(otherRow.min, otherRow.max))
          validator.isValid = false
        }
      })
      validator.message = validatorTexts.join('\n')
      return validator
    },
    intervalsOverlap(currentIntervalText, otherIntervalText) {
      const currentInterval = {
        min: Number(currentIntervalText.min),
        max: Number(currentIntervalText.max)
      }
      const otherInterval = {
        min: Number(otherIntervalText.min),
        max: Number(otherIntervalText.max)
      }
      if (!currentIntervalText.min || !currentIntervalText.max || !otherIntervalText.min || !otherIntervalText.max) return false
      if (isNaN(currentInterval.min) || isNaN(currentInterval.max) || isNaN(otherInterval.min) || isNaN(otherInterval.max)) return false
      return !((currentInterval.min < otherInterval.min && currentInterval.max < otherInterval.min) || (currentInterval.min > otherInterval.max && currentInterval.max > otherInterval.max))
    },
    onAfterSave(_, res) {
      this.$store.setDeviceName(res.data.devicename)
      this.$store.deviceInfo.static.hostname = res.data.hostname
      this.$alert.enabled = res.data.alerts_enabled === '1'
      this.$notification.enabled = res.data.notifications_enabled === '1'

      if (this.hasPackageManager || !this.$brand('sentryDSN')) return
      if (res.data.data_analytics === '1') this.$analytics.enable()
      else this.$analytics.disable()
    },
    updateSecurityBanner(_, res) {
      if (res.data.title) {
        this.$store.securityBanner.title = res.data.title
        this.$store.securityBanner.message = res.data.message
      } else this.$store.securityBanner = {}
    }
  }
}
</script>
