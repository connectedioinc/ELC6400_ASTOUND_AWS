<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="io_scheduler"
    :before-save="validateInterval"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="scheduler"
      :name="section.id"
      :title="$utils.getModalTitle($t('output scheduler instance'))"
      :help="$t('Here you can configure output scheduler instance of specific interval.')"
      :endpoints="[{ endpoint: 'io/scheduler/config' }]"
      :error-handlers="{ edit: returnErrorMessage }"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable selected output scheduler instance.')"
        @change="self => validateAllInputs(self)"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="pin"
        :label="$t('Pin')"
        :help="$t('Pin whose output will be enabled for the selected interval.')"
        :options="pins()"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="period"
        :label="$t('Interval type')"
        :help="$t('Allows selecting between week and month days for instance intervals.')"
        :options="periodOptions"
        @change="self => validateAllInputs(self)"
      />
      <vuci-form-item-select
        ref="start_day"
        :uci-section="s"
        name="start_day"
        :label="$t('Start day')"
        :help="$t('Day of output enable interval start.')"
        :options="days"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="start_time"
        :label="$t('Start time')"
        :help="$t('Time of output enable interval start (hh:mm).')"
        placeholder="12:00"
        rules="time"
        initial="12:00"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="end_day"
        :label="$t('End day')"
        :help="$t('Day of output enable interval end.')"
        :options="days"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="end_time"
        :label="$t('End time')"
        :help="$t('Time of output enable interval start (hh:mm).')"
        placeholder="12:00"
        rules="time"
        initial="12:00"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="force_last"
        :label="$t('Force last day')"
        :help="$t('Forces intervals to accept last day of month as valid option if selected day doesn\'t exist in ongoing month.')"
        :depend="s.period === 'month'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['pins', 'validateAllInputs', 'errors'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      periodOptions: [
        ['week', this.$t('Weekdays')],
        ['month', this.$t('Month Days')]
      ],
      weekdays: [
        ['1', this.$t('Monday')],
        ['2', this.$t('Tuesday')],
        ['3', this.$t('Wednesday')],
        ['4', this.$t('Thursday')],
        ['5', this.$t('Friday')],
        ['6', this.$t('Saturday')],
        ['0', this.$t('Sunday')]
      ]
    }
  },
  computed: {
    days() {
      return this.section.period === 'week' ? this.weekdays : this.$scheduler.generateMonthDays()
    }
  },
  methods: {
    validateInterval() {
      return new Promise((resolve, reject) => {
        if (this.section.enabled !== '1') resolve()
        const name = this.section.id
        const pin = this.section.pin
        const schedulerSections = this.formData.scheduler.filter(section => section.enabled === '1' && section.pin === pin && section.id !== name)
        const intervalResponse = this.$scheduler.validateInterval(this.section, schedulerSections)
        if (intervalResponse.invalid) {
          if (intervalResponse.error === 'overlap') return reject(this.$t('Scheduler interval overlaps with already enabled interval of same output pin'))
          if (intervalResponse.error === 'startsameasend') return reject(this.$t('Scheduler interval starting time is the same as the ending time'))
        }
        resolve()
      })
    },
    returnErrorMessage(errors) {
      const errorCode = errors.data.errors[0].code
      return this.errors()[errorCode] || this.$t('An unexpected error occurred')
    }
  }
}
</script>
