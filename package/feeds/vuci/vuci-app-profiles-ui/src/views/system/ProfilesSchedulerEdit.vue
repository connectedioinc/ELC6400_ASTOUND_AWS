<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="profiles"
    :before-save="onBeforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'profiles/scheduler/config' }]"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('profile scheduler'))"
      data-key="scheduler"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable selected profile change instance.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Profile')"
        :help="$t('Change to selected profile.')"
        name="profile_id"
        :options="profileOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Interval type')"
        :help="$t('Allows selecting between week and month days for instance intervals.')"
        name="period"
        :options="typeOpts"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Start day')"
        :help="$t('Day of profile change interval start.')"
        name="start_day"
        :options="dayOpts"
        rules="uinteger"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Start time')"
        :help="$t('Time of profile change interval start (hh:mm).')"
        name="start_time"
        rules="time"
        placeholder="12:00"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('End day')"
        :help="$t('Day of profile change interval end.')"
        name="end_day"
        :options="dayOpts"
        rules="uinteger"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('End time')"
        :help="$t('Time of profile change interval end (hh:mm).')"
        name="end_time"
        rules="time"
        placeholder="12:00"
        required
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
import profilesScheduler from './profilesScheduler'
export default {
  inject: ['profileNamesWithIds'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      typeOpts: [
        ['week', this.$t('Weekdays')],
        ['month', this.$t('Month days')]
      ],
      validateErrors: {
        1: this.$t('Only intervals of the same period type can be active at one time'),
        2: this.$t('Start/End time values required'),
        3: this.$t('Scheduler interval overlaps with already enabled interval of same type')
      }
    }
  },
  computed: {
    profileOptions() {
      return this.profileNamesWithIds()
    },
    dayOpts() {
      if (this.section.period === 'week') {
        return [
          ['1', this.$t('Monday')],
          ['2', this.$t('Tuesday')],
          ['3', this.$t('Wednesday')],
          ['4', this.$t('Thursday')],
          ['5', this.$t('Friday')],
          ['6', this.$t('Saturday')],
          ['0', this.$t('Sunday')]
        ]
      } else {
        const options = []
        for (let i = 1; i <= 31; i++) {
          options.push([`${i}`, `${i}`])
        }
        return options
      }
    }
  },
  methods: {
    onBeforeSave() {
      const section = this.section
      return new Promise((resolve, reject) => {
        if (section.enabled === '1' && profilesScheduler.validateOverlap(section, this.formData.scheduler)) {
          reject(this.$t('Scheduler interval overlaps with already enabled interval of same time'))
        }
        if (section.enabled === '1' && this.formData.scheduler.some(schedule => schedule.enabled === '1' && schedule.period !== section.period)) {
          reject(this.$t('Only intervals of the same period type can be active at one time'))
        }
        resolve(true)
      })
    }
  }
}
</script>
