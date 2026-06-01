<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="profiles"
    :after-load="loadProfileNames"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('General configuration')"
      name="general"
      :endpoints="[{ endpoint: 'profiles/scheduler/global' }]"
      data-key="general"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable scheduler')"
        name="enabled"
      />
    </vuci-named-section>
    <vuci-typed-section
      :title="$t('Profile scheduler instances')"
      :help="$t('Here you can configure profile changing for custom time intervals.')"
      type="scheduler"
      :columns="schedulerCols"
      :edit-form="editForm"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'profiles/scheduler/config' }]"
      :table-actions="['search', 'column-list']"
      data-key="scheduler"
      :error-handlers="errorHandler"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="profile_id"
          :display-value="loadName"
        />
      </template>
      <template #period="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="period"
          :display-value="loadPeriod"
        />
      </template>
      <template #_from="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="start_day"
          :display-value="loadInterval"
          no-write
        />
      </template>
      <template #_to="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="end_day"
          :display-value="loadInterval"
          no-write
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import profilesSchedulerEdit from './ProfilesSchedulerEdit'
import profilesScheduler from './profilesScheduler'

export default {
  provide() {
    return {
      profileNamesWithIds: () => this.profiles
    }
  },
  data() {
    return {
      editForm: markRaw(profilesSchedulerEdit),
      formData: {},
      schedulerCols: [
        { name: 'name', label: this.$t('Profile') },
        { name: 'period', label: this.$t('Type') },
        { name: '_from', label: this.$t('From') },
        { name: '_to', label: this.$t('To') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      weekDays: [this.$t('Sunday'), this.$t('Monday'), this.$t('Tuesday'), this.$t('Wednesday'), this.$t('Thursday'), this.$t('Friday'), this.$t('Saturday'), this.$t('Sunday')],
      errorHandler: {
        create: () => (this.customProfile ? this.$t('Scheduler instances can be created only if atleast one custom profile is available') : this.$t('Failed to create configuration'))
      },
      profiles: []
    }
  },
  computed: {
    customProfile() {
      return !this.profiles.some(section => section[0] !== '0')
    }
  },
  methods: {
    loadProfileNames() {
      return this.$axios
        .get('/api/profiles/config')
        .then(res => {
          this.profiles = res.data.map(section => [section.profile_id, section.id])
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load profile names'))
        })
    },
    loadName(self) {
      return this.profiles.find(data => data[0] === self)[1]
    },
    loadPeriod(period) {
      const periods = {
        week: this.$t('Weekdays'),
        month: this.$t('Month days')
      }
      return periods[period] || '-'
    },
    loadInterval(data, self) {
      const bound = self.name.split('_')[0]
      const dayNumber = self.uciSection[`${bound}_day`]
      const dayTime = self.uciSection[`${bound}_time`]
      if (self.uciSection.period === 'week') {
        return this.parseWeekday(dayNumber, dayTime)
      } else if (self.uciSection.period === 'month') {
        return this.parseMonthDay(dayNumber, dayTime, self.uciSection.force_last)
      } else {
        return '-'
      }
    },
    parseWeekday(dayNumber, dayTime) {
      return `${this.$t('Every')} ${this.weekDays[dayNumber]}, ${dayTime}`
    },
    parseMonthDay(monthDay, time, forceLast) {
      if (forceLast === '1' && monthDay > 28) {
        return `${this.$t('Every last day of month')}, ${time}`
      }
      let daySuffix = 'th'
      if (monthDay < 10 || monthDay > 20) {
        const lastDigit = monthDay % 10
        switch (lastDigit) {
          case 1: {
            daySuffix = 'st'
            break
          }
          case 2: {
            daySuffix = 'nd'
            break
          }
          case 3: {
            daySuffix = 'rd'
            break
          }
        }
      }
      return `${this.$t('Every')} ${monthDay}${daySuffix} ${this.$t('day of month')}, ${time}`
    },
    validateEnable(self) {
      if (self.model === '0') return
      const section = self.uciSection
      if (profilesScheduler.validateOverlap(section, this.formData.scheduler)) {
        this.$message.error(this.$t('Scheduler interval overlaps with already enabled interval of same time'))
        self.model = '0'
      }
      if (this.formData.scheduler.some(schedule => schedule.enabled === '1' && schedule.period !== section.period)) {
        this.$message.error(this.$t('Only intervals of the same period type can be active at one time'))
        self.model = '0'
      }
    }
  }
}
</script>
