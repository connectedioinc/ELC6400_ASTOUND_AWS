<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="periodic_reboot"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$t('Reboot scheduler')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'auto_reboot/scheduler/config' }]"
      data-key="periodic_reboot"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable reboot instance.')"
        name="enable"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action')"
        :help="$t('Action that will be executed at specified time.')"
        name="action"
        :options="actions"
        :depend="actions.length > 1"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modem')"
        :options="modemsList()"
        :depend="s.action == '2' && modemsList().length > 1"
        name="modem"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Interval type')"
        :help="$t('Allows selecting between week and month days for instance intervals.')"
        :options="period"
        name="period"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Week days')"
        :help="$t('Week days, when the reboot should happen. At least one selected day is mandatory.')"
        :placeholder="$t('-- Please choose --')"
        :options="days"
        :depend="s.period === 'week'"
        name="days"
        multiple
        :required="s.enable === '1'"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Day time')"
        :help="$t('Day time when action should be executed.')"
        :initial="['12:00']"
        :required="s.enable === '1'"
        name="time"
        rules="time"
        placeholder="12:00"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Month day')"
        :help="$t('Day of a month when reboot will happen.')"
        :placeholder="$t('-- Please choose --')"
        :options="monthOpts"
        :depend="s.period === 'month'"
        name="month_day"
        rules="uinteger"
        multiple
        :required="s.enable === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Month')"
        :help="$t('Months when reboot will happen.')"
        :placeholder="$t('-- Please choose --')"
        :options="months"
        :depend="s.period === 'month'"
        name="months"
        multiple
        :required="s.enable === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Force last day')"
        :help="$t('Forces intervals to accept last day of month as valid option if selected day doesn\'t exist in ongoing month.')"
        name="force_last"
        :depend="s.period === 'month'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['modemsList'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      days: [
        ['mon', this.$t('Monday')],
        ['tue', this.$t('Tuesday')],
        ['wed', this.$t('Wednesday')],
        ['thu', this.$t('Thursday')],
        ['fri', this.$t('Friday')],
        ['sat', this.$t('Saturday')],
        ['sun', this.$t('Sunday')]
      ],
      months: [
        ['1', this.$t('January')],
        ['2', this.$t('February')],
        ['3', this.$t('March')],
        ['4', this.$t('April')],
        ['5', this.$t('May')],
        ['6', this.$t('June')],
        ['7', this.$t('July')],
        ['8', this.$t('August')],
        ['9', this.$t('September')],
        ['10', this.$t('October')],
        ['11', this.$t('November')],
        ['12', this.$t('December')]
      ],
      period: [
        ['week', this.$t('Week days')],
        ['month', this.$t('Month days')]
      ],
      formData: {}
    }
  },
  computed: {
    monthOpts() {
      const options = []
      for (let i = 1; i <= 31; i++) {
        options.push([`${i}`, `${i}`])
      }
      return options
    },
    actions() {
      const actions = [['1', this.$t('Device reboot')]]
      if (this.modemsList().length > 0) actions.push(['2', this.$t('Modem reboot')])
      return actions
    }
  }
}
</script>
