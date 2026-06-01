<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="periodic_reboot"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :title="$t('Reboot scheduler')"
      :help="$t('Reboot Scheduler Instances.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'auto_reboot/scheduler/config' }]"
      data-key="periodic_reboot"
      type="reboot_instance"
      :add-validate="onAdd"
      :columns="periodicRebootColumns"
      :edit-form="periodicRebootEditModal"
      :table-actions="['column-list', 'search']"
    >
      <template #action="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayAction"
          name="action"
        />
      </template>
      <template #period="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayPeriod"
          name="period"
        />
      </template>
      <template #days="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayDays"
          name="days"
        />
      </template>
      <template #months="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayMonths"
          name="months"
        />
      </template>
      <template #time="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayTime"
          name="time"
        />
      </template>
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enable"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import periodicRebootEdit from './PeriodicRebootEdit'

export default {
  provide() {
    return {
      modemsList: () => this.modemList
    }
  },
  data() {
    return {
      formData: {},
      periodicRebootEditModal: markRaw(periodicRebootEdit),
      modemList: [],
      periodicRebootColumns: [
        { name: 'action', label: this.$t('Action'), help: this.$t('Action that will be executed at specified time.') },
        { name: 'period', label: this.$t('Interval type'), help: this.$t('Week days/Month days.') },
        { name: 'days', label: this.$t('Days'), help: this.$t('Days when action should be executed.') },
        { name: 'time', label: this.$t('Time'), help: this.$t('Day time when action should be executed.') },
        { name: 'months', label: this.$t('Months'), help: this.$t('Months when action should be executed.') },
        { name: 'enable', label: this.$t('Enabled') }
      ],
      dayTitles: {
        mon: this.$t('Mon'),
        tue: this.$t('Tue'),
        wed: this.$t('Wed'),
        thu: this.$t('Thu'),
        fri: this.$t('Fri'),
        sat: this.$t('Sat'),
        sun: this.$t('Sun')
      },
      monthTitles: [
        this.$t('Jan'),
        this.$t('Feb'),
        this.$t('Mar'),
        this.$t('Apr'),
        this.$t('May'),
        this.$t('Jun'),
        this.$t('Jul'),
        this.$t('Aug'),
        this.$t('Sep'),
        this.$t('Oct'),
        this.$t('Nov'),
        this.$t('Dec')
      ]
    }
  },
  methods: {
    afterLoad() {
      return this.$axios
        .get('/api/modems/status', { condition: 'mobifd.control' })
        .then(({ data }) => {
          this.modemList = this.$mobile.modemsOptions(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem options'))
        })
    },
    displayAction(action) {
      if (action === '1') return this.$t('Reboot')
      if (action === '2') return this.$t('Modem reboot')
      return '-'
    },
    displayDays(_, self) {
      const section = self.uciSection
      if (!section.period) return '-'
      if (section.period === 'week' && (!section.days || section.days.length === 0)) return '-'
      if (section.period === 'month' && (!section.month_day || section.month_day.length === 0)) return '-'
      return section.period === 'week' ? section.days.map(day => this.dayTitles[day]).join(', ') : section.month_day.map(day => day).join(', ')
    },
    displayTime(time) {
      if (!time || time.length === 0) return '-'
      return time.join(', ')
    },
    displayPeriod(period) {
      if (period === 'week') return this.$t('Week days')
      if (period === 'month') return this.$t('Month days')
      return '-'
    },
    displayMonths(months) {
      if (!months || months.length === 0) return '-'
      return months.map(month => this.monthTitles[month - 1]).join(', ')
    },
    onAdd(_, dataSource) {
      if (dataSource.length >= 30) {
        return { valid: false, message: this.$t("Can't create more instances. Only 30 instances are allowed") }
      }
      return { valid: true }
    },
    validateEnable(self) {
      const sectionValues = self.uciSection
      if (self.model === '0' || sectionValues.enable !== '1') return
      const requiredEnableOptions = []
      if (!sectionValues.action) {
        requiredEnableOptions.push(this.$t('Action'))
      }
      if (!sectionValues.period) {
        requiredEnableOptions.push(this.$t('Interval type'))
      }
      if (!sectionValues.time || sectionValues.time.every(x => x === '')) {
        requiredEnableOptions.push(this.$t('Day time'))
      }
      if (sectionValues.period === 'month') {
        if (!sectionValues.months || sectionValues.months.every(x => x === '')) {
          requiredEnableOptions.push(this.$t('Month'))
        }
        if (!sectionValues.month_day) {
          requiredEnableOptions.push(this.$t('Month day'))
        }
      }
      if (sectionValues.period === 'week') {
        if (!sectionValues.days || sectionValues.days.every(x => x === '')) {
          requiredEnableOptions.push(this.$t('Week days'))
        }
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    }
  }
}
</script>
