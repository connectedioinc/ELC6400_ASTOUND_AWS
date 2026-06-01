<template>
  <NavigationTabs
    :tabs="tabs"
    @update:selected="tabChange"
  >
    <tlt-card :title="$t('Mobile usage')">
      <template #help>
        {{ $t('Displays mobile data usage values over different periods of time.') }}
        {{ $t('Configure system time and time zone') }}
        <router-link to="/system/admin/datetime/general"> {{ $t('here') }} </router-link>.
      </template>
      <template #title-content>
        <div class="flex flex-col ml-auto relative min-[540px]:w-2/3 items-end">
          <badge-select
            id="scale-badge"
            :options="intervals"
            :model-value="selected"
            @update:model-value="val => intervalChange(val)"
          />
          <div class="flex flex-row gap-2 w-full min-[540px]:absolute min-[540px]:mt-10 mt-2">
            <tlt-form-item-select
              v-model="units"
              class="ml-auto"
              prop="units"
              :options="unitOptions"
              :warnings="warningMsg"
            />
            <tlt-select-date
              v-if="selected === 'custom'"
              id="date"
              v-model="range"
              @update:model-value="getCustomData"
            />
          </div>
        </div>
      </template>
      <template v-if="timestamps.length !== 0">
        <bar-plot
          :options="plotOptions"
          :data="plotData"
          class="mt-8"
        />
        <div
          class="flex mt-8"
          test-id="data-usage"
        >
          <div
            v-for="item in flexItems"
            :key="item[0]"
            class="flex-1 mr-1 content-center"
            :test-id="item.name"
          >
            <tlt-hint :hints="[{ info: item.info }]">
              <label class="tlt-form-item-label hoverable">
                <template v-if="item.style">
                  <b :style="'border-bottom:2px solid ' + item.style">{{ item.title + ' *:' }}</b>
                </template>
                <template v-else>
                  <b>{{ item.title + ' *:' }}</b>
                </template>
              </label>
            </tlt-hint>
            {{ item.value }}
          </div>
          <tlt-button
            button-id="export"
            icon-left="upload-export"
            color="secondary"
            @click="exportUsage"
          >
            {{ $t('Export to CSV') }}
          </tlt-button>
        </div>
        <div class="mb-7">
          <em>{{ '* ' + $t("Your carrier's data usage accounting may differ. %s is not liable should any accounting discrepancies occur.").format($brand('company')) }}</em>
        </div>
        <tlt-table
          id="usage_info"
          :columns="columns"
          :data-source="statistics.content"
          :no-value-text="$t('There are no data')"
          :title="statistics.name"
          :help="$t('The provided statistical parameters are intended for informational purposes only and are based on historical data and estimations.')"
          :table-actions="['column-list']"
        >
          <template #growth="{ record }">
            <div class="flex items-center gap-1">
              <template v-if="!record.growth">
                {{ $t('Not enough data') }}
              </template>
              <template v-else>
                <tlt-icon
                  v-if="record.growth > 0"
                  icon="arrow-up"
                  class="size-5 text-theme-text-success"
                />
                <tlt-icon
                  v-else-if="record.growth < 0"
                  icon="arrow-down"
                  class="size-5 text-theme-text-danger"
                />
                <span v-else-if="record.growth === 0">=</span>
                {{ record.growth }} %
              </template>
            </div>
          </template>
          <template #after>
            <div class="mt-4 text-xs">
              {{ $t('Updated: %s').format(scanDate ? scanDate : '-') }}
            </div>
          </template>
        </tlt-table>
      </template>
      <template v-else>
        {{ $t('No mobile usage data collected') }}
      </template>
    </tlt-card>
  </NavigationTabs>
</template>

<script>
import BarPlot from '@/components/shared/Plots/BarPlot.vue'
import BadgeSelect from '@/components/shared/BadgeSelect.vue'
import { Measurement } from '@/components/shared/Plots/measurement'

export default {
  components: {
    BarPlot,
    BadgeSelect
  },
  layout: 'none',
  data() {
    return {
      sim: '',
      esim: '',
      modemId: '',
      timestamps: [],
      rx: [],
      tx: [],
      resizeHandler: null,
      tickCount: 0,
      text: {
        hint: (selected, type) => {
          if (selected === 'day') return this.$t('The amount of data that has been %s today.').format(type)
          if (selected === 'week') return this.$t('The amount of data that has been %s this week.').format(type)
          if (selected === 'month') return this.$t('The amount of data that has been %s this month.').format(type)
          if (selected === 'total') return this.$t('The amount of data that has been %s in total.').format(type)
          if (selected === 'custom') return this.$t('The amount of data that has been %s in selected interval.').format(type)
          return ''
        },
        title: selected => {
          if (selected === 'day') return this.$t("Today's usage")
          if (selected === 'week') return this.$t("Current week's usage")
          if (selected === 'month') return this.$t("Current month's usage")
          if (selected === 'total') return this.$t('Total usage')
          if (selected === 'custom') return this.$t('Total usage')
          return ''
        }
      },
      intervals: [
        ['day', this.$t('Day')],
        ['week', this.$t('Week')],
        ['month', this.$t('Month')],
        ['total', this.$t('Total')],
        ['custom', this.$t('Custom')]
      ],
      selected: localStorage.getItem('mobileUsage-interval') || 'day',
      modemList: [],
      simList: [],
      range: [],
      units: 'auto',
      unitOptions: [
        ['auto', this.$t('Auto')],
        ['mb', 'MB'],
        ['gb', 'GB'],
        ['tb', 'TB']
      ],
      unitsMap: {
        mb: { divisor: 1000000, unit: 'MB' },
        gb: { divisor: 1000000000, unit: 'GB' },
        tb: { divisor: 1000000000000, unit: 'TB' }
      },
      showUnitWarning: false,
      totalData: [],
      scanDate: null,
      dateFormat: {
        day: 'HH:mm',
        week: 'dddd',
        month: 'MM-DD',
        total: 'YYYY-MM-DD',
        custom: 'YYYY-MM-DD'
      }
    }
  },
  computed: {
    flexItems() {
      return [
        {
          info: this.text.hint(this.selected, this.$t('used')),
          value: this.formatValue(this.total, true),
          title: this.text.title(this.selected),
          style: '',
          name: 'used'
        },
        {
          info: this.text.hint(this.selected, this.$t('sent')),
          value: this.formatValue(this.txTotal, true),
          title: this.$t('Sent'),
          style: this.plotOptions.datasetOptions[0].color,
          name: 'sent'
        },
        {
          info: this.text.hint(this.selected, this.$t('received')),
          value: this.formatValue(this.rxTotal, true),
          title: this.$t('Received'),
          style: this.plotOptions.datasetOptions[1].color,
          name: 'received'
        }
      ]
    },
    columns() {
      const columns = [
        { dataIndex: 'metric', title: this.$t('Metric'), help: this.$t('Data usage metric.'), actions: { sort: true } },
        { dataIndex: 'total', title: this.$t('Total'), help: this.$t('Total data usage per metric.'), actions: { sort: true, filter: { type: 'range' } } },
        { dataIndex: 'average', title: this.$t('Average'), help: this.$t('Average data usage per metric.'), actions: { sort: true } },
        { dataIndex: 'peak', title: this.$t('Peak'), help: this.$t('Peak data usage per metric.'), actions: { sort: true } }
      ]
      if (this.selected !== 'total' && this.selected !== 'custom') {
        columns.push(
          { dataIndex: 'growth', title: this.$t('Growth'), help: this.$t('Data usage growth per metric compared to the previous period.'), actions: { sort: true } },
          { dataIndex: 'forecast', title: this.$t('Forecast'), help: this.$t('Data usage forecast for the remaining period.'), actions: { sort: true } },
          { dataIndex: 'pattern', title: this.$t('Pattern'), help: this.$t('Data usage pattern, highlighting period of peak usage.'), actions: { sort: true } }
        )
      }
      return columns
    },
    statistics() {
      let txGrowth, rxGrowth, totalGrowth, txForecast, rxForecast, totalForecast, rxForecast2, txForecast2, totalForecast2
      let rxPattern = this.$t('Not enough data')
      let txPattern = this.$t('Not enough data')
      let totalPattern = this.$t('Not enough data')
      let w1 = 1
      let w2 = 1
      let divisor = 1

      const total = this.rx.map((value, index) => value + this.tx[index])
      const currentDate = this.totalData[this.totalData.length - 1]?.[0]

      // Day
      if (this.selected === 'day') {
        const firstHour = Number(this.$localDate(this.timestamps[0], { format: 'HH' }))

        if (this.tx.length > 5) {
          txForecast = this.forecastData(this.tx, firstHour, 24)
          rxForecast = this.forecastData(this.rx, firstHour, 24)
          totalForecast = this.forecastData(total, firstHour, 24)
        }

        const normalizedCurrentDay = this.normalizeWeekDay(currentDate)
        let correctDay = 1
        if (normalizedCurrentDay === 0) correctDay = 4
        if (normalizedCurrentDay === 5) correctDay = 6
        let previousDay = this.totalData.find(item => item[0] === currentDate - correctDay * 86400)
        const previousDefault = this.totalData.find(item => item[0] === currentDate - 86400)
        w2 = previousDay ? 1 : 0.8
        previousDay = previousDay || previousDefault

        if (previousDay) {
          rxGrowth = this.calculateGrowth(this.rxTotal, previousDay[1])
          txGrowth = this.calculateGrowth(this.txTotal, previousDay[2])
          totalGrowth = this.calculateGrowth(this.total, previousDay[3])

          divisor = w1 + w2
          rxForecast2 = this.forecastData2(this.rx, previousDay[1], w1, w2, divisor, firstHour, 24)
          txForecast2 = this.forecastData2(this.tx, previousDay[2], w1, w2, divisor, firstHour, 24)
          totalForecast2 = this.forecastData2(total, previousDay[3], w1, w2, divisor, firstHour, 24)

          const weekDays = []
          const weekends = []
          this.totalData.slice(0, -1).forEach(item => {
            const date = this.$date.unix(item[0]).tz(this.$store.timeZone || 'UTC')
            if (date.isAfter(this.$date.unix(currentDate).subtract(6, 'months'))) {
              const day = this.normalizeWeekDay(item[0])
              if (day > 4) weekends.push(item)
              else weekDays.push(item)
            }
          })

          let dataList = []
          if (normalizedCurrentDay > 4 && weekends.length > 1) {
            dataList = weekends
          } else if (normalizedCurrentDay < 5 && weekDays.length > 1) {
            dataList = weekDays
          }

          if (dataList.length > 1) {
            w2 = 1
            divisor = w1 + w2

            const rxSum = dataList.reduce((sum, [, v1]) => sum + v1, 0)
            const txSum = dataList.reduce((sum, [, , v2]) => sum + v2, 0)
            const totalSum = dataList.reduce((sum, [, , , v3]) => sum + v3, 0)

            rxForecast2 = this.forecastData2(this.rx, rxSum, w1, w2, divisor, firstHour, 24)
            txForecast2 = this.forecastData2(this.tx, txSum, w1, w2, divisor, firstHour, 24)
            totalForecast2 = this.forecastData2(total, totalSum, w1, w2, divisor, firstHour, 24)
          }
        }

        const periods = [
          { label: this.$t('morning (3-9h)'), start: 3, end: 9 },
          { label: this.$t('midday (9-15h)'), start: 9, end: 15 },
          { label: this.$t('evening (15-21h)'), start: 15, end: 21 },
          { label: this.$t('night (21-3h)'), start: 21, end: 3 }
        ]
        txPattern = this.calculatePattern(this.tx, periods, true)
        rxPattern = this.calculatePattern(this.rx, periods, true)
        totalPattern = this.calculatePattern(total, periods, true)

        // Week
      } else if (this.selected === 'week') {
        const normalizedFirstDay = this.normalizeWeekDay(this.timestamps[0])

        if (this.tx.length > 2) {
          txForecast = this.forecastData(this.tx, normalizedFirstDay, 7)
          rxForecast = this.forecastData(this.rx, normalizedFirstDay, 7)
          totalForecast = this.forecastData(total, normalizedFirstDay, 7)
        }

        const weights = [1, 0.8, 0.5]
        const [totalSum, totalLength] = this.categorizeAndApplyWeights(this.totalData, currentDate, this.timestamps[0], weights)

        const previousWeekMonday = currentDate - (this.normalizeWeekDay(currentDate) * 86400 + 7 * 86400)
        let previousWeekDay
        for (let i = 0; i < 7; i++) {
          previousWeekDay = this.totalData.find(item => item[0] === previousWeekMonday + i * 86400)
          if (previousWeekDay) break
        }

        if (previousWeekDay) {
          const previousWeekDays = this.totalData.filter(s => s[0] >= previousWeekDay[0] && s[0] < previousWeekDay[0] + 6 * 86400)
          const previousWeekSum = this.calculateSum(previousWeekDays, true)

          rxGrowth = this.calculateGrowth(this.rxTotal, previousWeekSum[0])
          txGrowth = this.calculateGrowth(this.txTotal, previousWeekSum[1])
          totalGrowth = this.calculateGrowth(this.total, previousWeekSum[2])

          let previousData = previousWeekSum
          w2 = 1
          if (previousWeekDays.length < 3) w2 = 0.8
          else if (previousWeekDays.length < 5) w2 = 0.9
          divisor = w1 + w2
          if (totalLength > previousWeekDays.length) {
            w2 = 1
            divisor = w1 + weights.reduce((acc, current) => acc + current, 0)
            previousData = totalSum
          }

          rxForecast2 = this.forecastData2(this.rx, previousData[0], w1, w2, divisor, normalizedFirstDay, 7)
          txForecast2 = this.forecastData2(this.tx, previousData[1], w1, w2, divisor, normalizedFirstDay, 7)
          totalForecast2 = this.forecastData2(total, previousData[2], w1, w2, divisor, normalizedFirstDay, 7)
        }

        const periods = [
          { label: this.$t('workdays'), workday: true },
          { label: this.$t('weekends'), workday: false }
        ]
        txPattern = this.calculatePattern(this.tx, periods)
        rxPattern = this.calculatePattern(this.rx, periods)
        totalPattern = this.calculatePattern(total, periods)

        // Month
      } else if (this.selected === 'month') {
        const currentMonth = this.$date.unix(this.timestamps[0]).tz(this.$store.timeZone || 'UTC')
        const firstDay = Number(this.$localDate(this.timestamps[0], { format: 'D' }))
        const monthLastDay = currentMonth.endOf('month').get('date')

        if (this.tx.length > 7) {
          txForecast = this.forecastData(this.tx, firstDay, monthLastDay)
          rxForecast = this.forecastData(this.rx, firstDay, monthLastDay)
          totalForecast = this.forecastData(total, firstDay, monthLastDay)
        }

        const weights = [1, 0.8, 0.5]
        const [totalSum, totalLength] = this.categorizeAndApplyWeights(this.totalData, currentDate, this.timestamps[0], weights)

        const previousMonth = currentMonth.set('date', 1).set('month', currentMonth.get('month') - 1)
        const previousMonthLastDay = previousMonth.set('date', previousMonth.endOf('month').get('date'))
        const previousMonthDays = this.totalData.filter(item => item[0] >= previousMonth.valueOf() / 1000 && item[0] <= previousMonthLastDay.valueOf() / 1000)

        if (previousMonthDays.length > 0) {
          const previousMonthSum = this.calculateSum(previousMonthDays, true)

          rxGrowth = this.calculateGrowth(this.rxTotal, previousMonthSum[0])
          txGrowth = this.calculateGrowth(this.txTotal, previousMonthSum[1])
          totalGrowth = this.calculateGrowth(this.total, previousMonthSum[2])

          let previousData = previousMonthSum
          w2 = 1
          if (previousMonthDays.length < 8) w2 = 0.8
          else if (previousMonthDays.length < 16) w2 = 0.9
          divisor = w1 + w2

          if (totalLength > previousMonthDays.length) {
            w2 = 1
            divisor = w1 + weights.reduce((acc, current) => acc + current, 0)
            previousData = totalSum
          }

          rxForecast2 = this.forecastData2(this.rx, previousData[0], w1, w2, divisor, firstDay, monthLastDay)
          txForecast2 = this.forecastData2(this.tx, previousData[1], w1, w2, divisor, firstDay, monthLastDay)
          totalForecast2 = this.forecastData2(total, previousData[2], w1, w2, divisor, firstDay, monthLastDay)
        }

        const periods = [
          { label: this.$t('workdays'), workday: true },
          { label: this.$t('weekends'), workday: false }
        ]
        txPattern = this.calculatePattern(this.tx, periods)
        rxPattern = this.calculatePattern(this.rx, periods)
        totalPattern = this.calculatePattern(total, periods)
      }

      rxForecast = rxForecast2 && rxForecast2 > this.rxTotal ? rxForecast2 : rxForecast
      txForecast = txForecast2 && txForecast2 > this.txTotal ? txForecast2 : txForecast
      totalForecast = totalForecast2 && totalForecast2 > this.total ? rxForecast2 : totalForecast

      const parameters = [
        [this.$t('Sent'), this.txTotal, this.tx, txGrowth, txForecast, txPattern],
        [this.$t('Received'), this.rxTotal, this.rx, rxGrowth, rxForecast, rxPattern],
        [this.$t('Total'), this.total, total, totalGrowth, totalForecast, totalPattern]
      ]
      return {
        name: this.$t('Statistics'),
        content: parameters.map(element => {
          return {
            metric: element[0],
            total: this.formatValue(element[1], true),
            average: this.formatValue(element[1] / element[2].length, true),
            peak: this.findPeakAndFormat(element[2]),
            growth: this.formatGrowth(element[3]),
            forecast: element[4] ? this.formatValue(element[4], true) : this.$t('Not enough data'),
            pattern: element[5]
          }
        })
      }
    },
    rxTotal() {
      return this.rx.reduce((acc, current) => acc + current, 0)
    },
    txTotal() {
      return this.tx.reduce((acc, current) => acc + current, 0)
    },
    total() {
      return this.rxTotal + this.txTotal
    },
    tabs() {
      let tabs = []
      this.simList.forEach(sim => {
        const modem = this.modemList.find(m => m.id === sim.modem)
        if (modem) {
          const name = sim.esim_profile ? `${modem.id}_${sim.sim}_${sim.esim_profile}` : `${modem.id}_${sim.sim}`
          tabs.push({
            name,
            title: 'SIM%s'.format(this.$mobile.getSimModemLabel(modem, sim.sim, sim.esim_profile)),
            modem: modem.id,
            sim: sim.sim,
            esim: sim.esim_profile
          })
        }
      })
      if (tabs.length > 1) tabs.push({ name: 'all', title: this.$t('All'), modem: 'all', sim: 1 })
      return tabs
    },
    /**
     * @returns {import('@/components/shared/Plots/BarPlot.vue').Props['options']}
     */
    plotOptions() {
      return {
        height: 400,
        x: {
          tooltipFormat: this.dateFormat[this.selected],
          format: this.dateFormat[this.selected],
          tickCount: this.tickCount
        },
        y: {
          format: value => this.formatValue(value, true),
          suggestedMin: 0,
          suggestedMax: this.unitsMap[this.units]?.divisor
        },
        datasetOptions: [
          {
            key: 'tx',
            name: this.$t('Sent'),
            color: 'var(--color-lime-300)'
          },
          {
            key: 'rx',
            name: this.$t('Received'),
            color: 'var(--color-blue-700)'
          }
        ]
      }
    },
    plotData() {
      return this.timestamps.map((timeStamp, i) => new Measurement(timeStamp * 1000, timeStamp * 1000, { tx: this.tx[i], rx: this.rx[i] }))
    }
  },
  watch: {
    units(newVal) {
      if (newVal === 'auto') {
        this.showUnitWarning = false
      } else if (newVal in this.unitsMap) {
        const { divisor } = this.unitsMap[newVal]
        this.showUnitWarning = (this.txTotal / divisor).toFixed(2) < 0.001 || (this.rxTotal / divisor).toFixed(2) < 0.001
      }
    }
  },
  async created() {
    this.$spin()
    this.updateTicks()
    addEventListener('resize', this.updateTicks)
    await this.loadModems()
    this.getData()
    this.getTotalData()
  },

  unmounted() {
    removeEventListener('resize', this.resizeHandler)
  },

  methods: {
    loadModems() {
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/sim_cards/status'])
        .then(([modemList, simcards]) => {
          if (modemList.success && simcards.success) {
            this.modemList = this.$mobile.parseModems(modemList.data)
            this.sim = 1
            this.modemId = this.modemList[0].id
            this.simList = simcards.data.sort((a, b) => a.section_name > b.section_name)
          } else this.$message.error(this.$t('Failed to load modem data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    updateTicks() {
      this.tickCount = window.innerWidth / (this.selected === 'day' ? 150 : 60)
    },
    getLabels() {
      switch (this.selected) {
        case 'day':
          return this.timestamps.map(value => (value ? this.$localDate(value, { format: 'HH:mm' }) : '-'))
        case 'week':
          return this.timestamps.map(value => (value ? this.$capitalize(this.$localDate(value, { format: 'dddd' })) : '-'))
        case 'month':
        case 'total':
        case 'custom':
          return this.timestamps.map(value => (value ? this.$localDate(value, { format: 'MM-DD' }) : '-'))
        default:
          break
      }
    },
    fixData() {
      // add 0 entries if data is missing
      const timeGap = this.selected === 'day' ? 3600 : 86400
      for (let i = 0; i < this.timestamps.length - 1; i++) {
        if (this.timestamps[i] === this.timestamps[i + 1]) continue
        const diff = this.timestamps[i + 1] - this.timestamps[i]
        if (diff > timeGap && diff !== timeGap) {
          this.timestamps.splice(i + 1, 0, this.timestamps[i] + timeGap)
          this.rx.splice(i + 1, 0, 0)
          this.tx.splice(i + 1, 0, 0)
        }
      }
      const now = (new Date().getTime() / 1000) | 0
      const arrayLength = this.timestamps.length
      for (let i = arrayLength - 1; i < arrayLength; i++) {
        if (this.timestamps[i] === this.timestamps[i + 1]) continue
        if (this.timestamps[i] + timeGap < now) {
          this.timestamps.push(this.timestamps[i] + timeGap)
          this.rx.push(0)
          this.tx.push(0)
        }
      }
    },
    intervalChange(interval) {
      this.selected = interval
      localStorage.setItem('mobileUsage-interval', interval)
      if (interval !== 'custom') {
        this.$spin()
        this.range = []
        this.getData()
      }
    },
    getData(custom) {
      if (!this.sim) return
      let endpoint = `/api/data_usage/${this.selected}/modem/${this.modemId}/sim/${this.sim}/status`
      if (this.esim) {
        endpoint = `/api/data_usage/${this.selected}/modem/${this.modemId}/esim/${this.esim}/status`
      } else if (this.modemId === 'all') {
        endpoint = `/api/data_usage/${this.selected}/status`
      }
      if (custom) {
        if (this.range.length < 2) return this.$spin(false)
        endpoint = endpoint + `?from=${this.range[0]}&to=${this.range[1]}`
      }
      return this.$axios
        .get(endpoint)
        .then(mobileUsage => {
          if (!mobileUsage) return
          this.timestamps = []
          this.rx = []
          this.tx = []
          for (let i = 0; i < mobileUsage.data.length; i++) {
            this.timestamps.push(mobileUsage.data[i][0])
            this.rx.push(mobileUsage.data[i][1])
            this.tx.push(mobileUsage.data[i][2])
          }
          if (!['total', 'custom'].includes(this.selected)) {
            this.fixData()
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load mobile usage data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    getCustomData() {
      this.$spin()
      this.getData(true)
    },
    tabChange(tabName) {
      const tab = this.tabs.find(tab => tab.name === tabName)
      if (!tab) return
      this.modemId = tab.modem
      this.sim = tab.sim
      this.esim = tab.esim
      this.range = []
      this.$spin()
      this.getData()
      this.getTotalData()
    },
    formatValue(val, format) {
      if (this.units in this.unitsMap) {
        const { divisor, unit } = this.unitsMap[this.units]
        const updatedVal = val / divisor
        if (!format && updatedVal < 0.001) return 0
        return format ? this.$utils.removeOverPrecision(`${updatedVal.toFixed(2)} ${unit}`) : updatedVal
      }
      return format ? this.$utils.removeOverPrecision('%mB'.format(val)) : val
    },
    getUnitName(unit) {
      return this.unitOptions.find(s => s[0] === unit)[1]
    },
    warningMsg(value) {
      if (value !== 'auto' && this.showUnitWarning) return this.$t("Values are too small to be displayed in selected unit. Please select a smaller unit or 'Auto'.")
    },
    exportUsage() {
      const deviceName = this.$store.deviceInfo?.static?.device_name || ''
      const rows = this.timestamps.map((timestamp, index) => [timestamp ? this.$localDate(timestamp, { format: 'YYYY-MM-DD HH:mm' }) : '-', timestamp, this.tx[index], this.rx[index]])
      rows.unshift([this.$t('Date'), this.$t('Timestamp'), this.$t('Sent, B'), this.$t('Received, B')])
      const simText = this.modemId === 'all' ? 'all' : `sim${this.$mobile.adjustSimNumber(this.sim, this.modemId)}`
      const fileName = `mobileusage-${simText}-${this.selected}-period-data-${deviceName}`
      this.$utils.generateCsv(fileName, rows)
    },
    getTotalData() {
      if (!this.sim) return
      let endpoint = `/api/data_usage/total/modem/${this.modemId}/sim/${this.sim}/status`
      if (this.esim) {
        endpoint = `/api/data_usage/total/modem/${this.modemId}/esim/${this.esim}/status`
      } else if (this.modemId === 'all') {
        endpoint = `/api/data_usage/total/status`
      }
      return this.$axios
        .get(endpoint)
        .then(mobileUsage => {
          if (!mobileUsage) return
          this.totalData = mobileUsage.data.map(item => [item[0], item[1], item[2], item[1] + item[2]])
          this.scanDate = this.$localDate(new Date().getTime() / 1000)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load all mobile usage data'))
        })
    },
    normalizeWeekDay(date) {
      const firstDay = Number(this.$localDate(date, { format: 'd' }))
      return firstDay === 0 ? 6 : firstDay - 1
    },
    calculateUsage(data, timestamps, workdays) {
      const days = workdays ? 5 : 2
      const sum = data.reduce((acc, value, index) => {
        const day = Number(this.$localDate(timestamps[index], { format: 'd' }))
        if (workdays) {
          if (day >= 1 && day <= 5) return acc + value
        } else {
          if (day === 0 || day === 6) return acc + value
        }
        return acc
      }, 0)
      return sum / days
    },
    calculateDayUsage(data, timestamps, startHour, endHour) {
      return data.reduce((acc, value, index) => {
        const hour = this.$localDate(timestamps[index], { format: 'HH' })
        if (startHour < endHour) {
          if (hour >= startHour && hour < endHour) return acc + value
        } else {
          if (hour >= startHour || hour < endHour) return acc + value
        }
        return acc
      }, 0)
    },
    calculateGrowth(current, previous) {
      if (previous === 0) return 0
      return ((current - previous) / previous) * 100
    },
    formatGrowth(value) {
      return value !== undefined ? value.toFixed(0) : undefined
    },
    forecastData(array, firstVal = 0, lastVal = 28) {
      if (array.length === 0) return 0
      const sum = array.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
      const average = sum / array.length
      return (lastVal - array.length - firstVal) * average + sum
    },
    forecastData2(array, previous, w1, w2, divisor, firstVal, lastVal) {
      if (divisor === 0) return 0
      return (this.forecastData(array, firstVal, lastVal) * w1 + previous * w2) / divisor
    },
    calculatePattern(data, periods, isDay) {
      const usages = periods.map(period => {
        if (isDay) return this.calculateDayUsage(data, this.timestamps, period.start, period.end)
        return this.calculateUsage(data, this.timestamps, period.workday)
      })
      return this.determinePattern(usages, periods)
    },
    determinePattern(values, periods) {
      const maxIndex = values.indexOf(Math.max(...values))
      return this.$t('Most data used during %s').format(periods[maxIndex].label)
    },
    findPeakAndFormat(data) {
      if (!data.length) {
        return this.$t('Not enough data')
      }
      let maxVal = data[0]
      let maxIdx = 0
      data.forEach((val, idx) => {
        if (val > maxVal) {
          maxVal = val
          maxIdx = idx
        }
      })
      return `${this.formatValue(maxVal, true)} (${this.$localDate(this.timestamps[maxIdx], { format: this.dateFormat[this.selected] })})`
    },
    calculateSum(data, fromOne = false, weight = 1) {
      if (fromOne) {
        return data.reduce(
          (acc, s) => {
            acc[0] += s[1] * weight
            acc[1] += s[2] * weight
            acc[2] += s[3] * weight
            return acc
          },
          [0, 0, 0]
        )
      }
      return data.reduce(
        (acc, s) => {
          acc[0] += s[0] * weight
          acc[1] += s[1] * weight
          acc[2] += s[2] * weight
          return acc
        },
        [0, 0, 0]
      )
    },
    categorizeAndApplyWeights(totalData, currentDate, timestamp, weights) {
      const olderThan1Year = []
      const olderThan6Months = []
      const last6Months = []
      totalData
        .filter(item => item[0] < timestamp)
        .forEach(item => {
          const date = this.$date.unix(item[0]).tz(this.$store.timeZone || 'UTC')
          if (date.isBefore(this.$date.unix(currentDate).subtract(1, 'year'))) {
            olderThan1Year.push([item[1], item[2], item[3]])
          } else if (date.isBefore(this.$date.unix(currentDate).subtract(6, 'months'))) {
            olderThan6Months.push([item[1], item[2], item[3]])
          } else {
            last6Months.push([item[1], item[2], item[3]])
          }
        })

      const dataSets = [last6Months, olderThan6Months, olderThan1Year]
      const calculatedSums = dataSets.map((dataSet, idx) => this.calculateSum(dataSet, false, weights[idx]))
      const datasetSums = this.calculateSum(calculatedSums)
      const totalLength = dataSets.reduce((acc, dataSet) => acc + dataSet.length, 0)
      return [datasetSums, totalLength]
    }
  }
}
</script>
