<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('data limit'), $network.getName(interfaceSection))"
      :name="interfaceSection.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'data_limit/config' }]"
      data-key="dataLimit"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable data connection limit')"
        :help="$t('Disables mobile data when the limit for the current period is reached.')"
        @change="onLimitChange"
      />
      <tlt-inline-message
        v-if="initialEnabled && s.enabled === '1'"
        id="limited-enabled"
        type="info"
      >
        {{ $t('Current data limit clear due may be formatted using previous time zone.') }}
        {{ $t('Configure system time and time zone') }}
        <router-link to="/system/admin/datetime/general"> {{ $t('here') }} </router-link>.
      </tlt-inline-message>
      <vuci-form-item-input
        :uci-section="s"
        name="data_limit"
        :label="$t('Data limit (MB)')"
        :help="$t('Disable mobile data after the limit value in MB is reached.')"
        placeholder="1000"
        rules="irange(1, 8796093020000)"
        :required="s.enabled === '1'"
        @change="
          self => {
            ;(validateDataLimit(self.sid), calculateWarningLimit(s))
          }
        "
      />
      <vuci-form-item-select
        :uci-section="s"
        name="period"
        :label="$t('Reset period')"
        :help="$t('Interval for resetting mobile data usage limit.')"
        :options="resetPeriodOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="reset_day"
        :label="$t('Reset day')"
        :help="$t('Specify the day of the month when the mobile data limit reset occurs.')"
        :options="numberOptions(1, 31, false)"
        :depend="s.period === 'month'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="reset_hour"
        :label="$t('Reset time')"
        :help="$t('Specify the hour (in 24-hour format) when the mobile data limit reset occurs.')"
        :options="numberOptions(0, 23, true)"
        :depend="s.period === 'day'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="reset_weekday"
        :label="$t('Reset day')"
        :help="$t('Specify the day of the week when the mobile data limit reset occurs.')"
        :options="dayOptions"
        :depend="s.period === 'week'"
      />

      <vuci-form-item-switch
        :uci-section="s"
        name="enable_warning"
        :label="$t('Enable SMS warning')"
        :help="$t('Enables sending of warning SMS message when mobile data limit is reached.')"
      />
      <tlt-form-item-inline
        v-show="s.enable_warning === '1'"
        :label="$t('Warning threshold')"
        :help="
          $t(
            'Send warning SMS message after threshold in MB is reached. \
        Warning threshold cannot be higher than data limit!'
          )
        "
        has-headers
        :required="s.enabled === '1'"
      >
        <div>
          <span class="truncate">MB</span>
          <vuci-form-item-input
            :uci-section="s"
            name="warning_limit"
            placeholder="800"
            :rules="[validateWarningLimit, 'min(1)', 'uinteger']"
            :depend="s.enable_warning === '1'"
            :required="s.enabled === '1'"
            @input="calculateWarningLimit(s, true)"
          />
        </div>
        <div>
          <span class="truncate">%</span>
          <vuci-form-item-input
            :uci-section="s"
            name="warning_percentage"
            placeholder="80"
            rules="irange(0,100)"
            no-write
            @input="calculateWarningLimit(s)"
          />
        </div>
      </tlt-form-item-inline>
      <vuci-form-item-input
        :uci-section="s"
        name="warning_num"
        :label="$t('Phone number')"
        :help="$t('A phone number to send warning SMS message to.')"
        :depend="s.enable_warning === '1'"
        placeholder="+37000000000"
        rules="phonedigit"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_rate_limit"
        :label="$t('Enable rate limit')"
        :help="$t('Enables the bandwidth limitation rules when the indicated data limit is reached.')"
        :depend="!$store.device.startsWith('TRB5')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="rate_limit_rx"
        :label="$t('Download limit')"
        :help="$t('Download bandwidth limitation in Kbps.')"
        rules="irange(1,34359738)"
        :depend="!$store.device.startsWith('TRB5') && s.enable_rate_limit === '1'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="rate_limit_tx"
        :label="$t('Upload limit')"
        :help="$t('Upload bandwidth limitation in Kbps.')"
        rules="irange(1,34359738)"
        :depend="!$store.device.startsWith('TRB5') && s.enable_rate_limit === '1'"
        required
      />
      <vuci-form-item-dummy
        :uci-section="s"
        name="due_reset_time"
        :label="$t('Next clear due')"
        :display-value="() => nextClearDue(s.period, s.period === 'month' ? s.reset_day : s.period === 'day' ? s.reset_hour : s.reset_weekday, formOptions().ntpInfo?.current_system_time)"
        no-write
      >
        <template #help>
          {{ $t('The data limit will be automatically cleared on this date.') }}
          {{ $t('Configure system time and time zone') }}
          <router-link to="/system/admin/datetime/general"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-dummy>
      <tlt-form-model-item>
        <tlt-hint
          :hints="[{ info: $t('The data collected for this interface will be cleared, but only if the interface is active.') }]"
          show-icon="mobile"
        >
          <tlt-button
            button-id="clearCollectedData"
            @click="clearDataPrompt"
          >
            {{ $t('Clear collected data') }}
          </tlt-button>
        </tlt-hint>
      </tlt-form-model-item>
    </vuci-named-section>
  </vuci-form>
</template>
<script>
import { ValidationBus } from '@ui-core/tlt-design/form/core/validation-bus'
import { useMobileLimitsUtils } from '@/composables/useMobileLimitsUtils'

export default {
  name: 'MobileDataLimit',
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    interfaces: {
      type: Array,
      required: true
    }
  },
  setup() {
    const { resetPeriodOptions, dayOptions, numberOptions, nextClearDue, checkSimSwitchDataRule } = useMobileLimitsUtils()
    return { resetPeriodOptions, dayOptions, numberOptions, nextClearDue, checkSimSwitchDataRule }
  },
  data() {
    return {
      initialEnabled: this.section.enabled === '1'
    }
  },
  computed: {
    interfaceSection() {
      return this.interfaces.find(i => i.id === this.section.id) || {}
    }
  },
  methods: {
    clearDataPrompt() {
      this.$prompt.show({
        title: this.$t('Clear data limit counter?'),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Clear'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.clearData()
        }
      })
    },
    clearData() {
      return this.$axios
        .post(`/api/data_limit/actions/clear`, {
          data: { interface: this.interfaceSection.id }
        })
        .then(() => {
          this.$message.success(this.$t('Mobile data limit cleared successfully'))
        })
        .catch(() => {
          this.$message.error(this.$t('Interface is currently inactive, only available if interface is active'))
        })
    },
    validateWarningLimit(val) {
      val = Number(val)
      return {
        isValid: !(isNaN(val) || val < 0 || val > this.section.data_limit),
        message: this.$t('Only positive integers are accepted. Value can not be higher than mobile data limit value.')
      }
    },
    validateDataLimit(sid) {
      ValidationBus.emit(`validate-${sid}_warning_limit`)
    },
    calculateWarningLimit(s, calcPercent) {
      const warning = parseInt(s.warning_limit)
      const limit = parseInt(s.data_limit)
      const percentage = parseInt(s.warning_percentage)
      if (calcPercent && limit >= warning) s.warning_percentage = Math.round((warning * 100) / limit).toString()
      else if (!calcPercent && limit > 0 && percentage > 0 && percentage <= 100) s.warning_limit = Math.round((percentage * limit) / 100).toString()
    },
    onLimitChange(self) {
      if (self.model === '1') return
      const validation = this.checkSimSwitchDataRule(this.interfaceSection, this.formOptions().simSwitch)
      if (!validation.isValid) {
        this.$message.error(validation.message)
        self.model = '1'
      }
    }
  }
}
</script>
