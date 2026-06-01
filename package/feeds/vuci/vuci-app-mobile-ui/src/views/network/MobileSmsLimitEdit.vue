<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('SMS limit'), `SIM${title}`)"
      :help="$t('Section for setting up a maximum sent SMS message cap for your SIM card.')"
      :uci-data="uciData"
      :name="section.id"
      :endpoints="[{ endpoint: 'sim_cards/config' }]"
      data-key="simcards"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_sms_limit"
        :label="$t('Enable SMS limit')"
        :help="$t('Disables SMS sending when the limit for the current period is reached.')"
        @change="onLimitChange"
      />
      <tlt-inline-message
        v-if="limitEnabled && s.enable_sms_limit === '1'"
        id="limited-enabled"
        type="info"
      >
        {{ $t('Current SMS limit clear due may be formatted using previous time zone.') }}
        {{ $t('Configure system time and time zone') }}
        <router-link to="/system/admin/datetime/general"> {{ $t('here') }} </router-link>.
      </tlt-inline-message>
      <vuci-form-item-input
        :uci-section="s"
        name="sms_limit_num"
        :label="$t('SMS limit count')"
        :help="$t('Disable SMS sending after the limit value is reached.')"
        rules="irange(1, 2147483647)"
        placeholder="10"
        :required="s.enable_sms_limit === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="sms_limit"
        :label="$t('Reset period')"
        :help="$t('Interval for resetting SMS limit.')"
        :options="resetPeriodOptions"
        initial="day"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="period"
        :label="s.sms_limit === 'day' ? $t('Reset time') : $t('Reset day')"
        :help="periodHint(s)"
        :options="periodOptions(s)"
      />
      <tlt-form-model-item
        element-id="clear-due"
        :label="$t('Next clear due')"
      >
        <template #help>
          {{ $t('Displays next clear due date according to period and start hour/day.') }}
          {{ $t('Configure system time and time zone') }}
          <router-link to="/system/admin/datetime/general"> {{ $t('here') }} </router-link>.
        </template>
        <tlt-dummy-value :value="nextClearDue(s.sms_limit, s.period, formOptions().ntpInfo?.current_system_time)" />
      </tlt-form-model-item>
      <tlt-form-model-item>
        <tlt-button
          button-id="clear"
          @click="clearSmsLimit(s)"
        >
          {{ $t('Clear SMS limit') }}
        </tlt-button>
      </tlt-form-model-item>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { useMobileLimitsUtils } from '@/composables/useMobileLimitsUtils'

export default {
  name: 'SmsLimitEdit',
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  setup() {
    const { resetPeriodOptions, dayOptions, numberOptions, nextClearDue, checkSimSwitchSmsRule } = useMobileLimitsUtils()
    return { resetPeriodOptions, dayOptions, numberOptions, nextClearDue, checkSimSwitchSmsRule }
  },
  data() {
    return {
      formData: {},
      limitEnabled: this.section.enable_sms_limit === '1'
    }
  },
  computed: {
    title() {
      const modem = this.formOptions().modemList.find(m => m.id === this.section.modem) || this.formOptions().modemList[0]
      return this.$mobile.getSimModemLabel(modem, this.section.position, this.section.esim_profile)
    }
  },
  methods: {
    clearSmsLimit(section) {
      return this.$prompt.show({
        title: this.$t('Clear SMS limit counter?'),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Clear'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          return this.$axios
            .post(`/api/sim_cards/${section.id}/actions/clear_sms_limit`)
            .then(() => {
              this.$message.success(this.$t('SMS limit cleared successfully'))
            })
            .catch(() => {
              this.$message.error(this.$t('SMS limit clear error!'))
            })
        }
      })
    },
    periodHint(s) {
      if (s.sms_limit === 'week') return this.$t('Specify the day of the week when the SMS limit reset occurs.')
      else if (s.sms_limit === 'month') return this.$t('Specify the day of the month when the SMS limit reset occurs.')
      return this.$t('Specify the hour (in 24-hour format) when the SMS limit reset occurs.')
    },
    periodOptions(s) {
      if (s.sms_limit === 'week') return this.dayOptions
      else if (s.sms_limit === 'month') return this.numberOptions(1, 31, false)
      return this.numberOptions(0, 23, true)
    },
    onLimitChange(self) {
      if (self.model === '1') return
      const validation = this.checkSimSwitchSmsRule(this.section, this.formOptions().simSwitch)
      if (!validation.isValid) {
        this.$message.error(validation.message)
        self.model = '1'
      }
    }
  }
}
</script>
