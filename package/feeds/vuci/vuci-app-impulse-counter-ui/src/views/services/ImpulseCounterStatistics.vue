<template>
  <tlt-card
    ref="template"
    :title="$t('Impulse counter statistics')"
    :help="$t('Section display PIN statistics in routers local time.')"
  >
    <template #title-content>
      <div class="flex ml-auto max-w-full">
        <badge-select
          id="scale-badge"
          :options="intervals"
          :model-value="selected"
          @update:model-value="val => intervalChange(val)"
        />
      </div>
    </template>
    <line-plot
      :options="options"
      :data="parsedData"
    />
    <tlt-system-card :cards="cards" />
  </tlt-card>
</template>

<script>
import BadgeSelect from '@/components/shared/BadgeSelect.vue'
import { tz as dayjs } from 'dayjs'
import LinePlot from '@/components/shared/Plots/LinePlot.vue'
import { Measurement } from '@/components/shared/Plots/measurement'
import { generateCard } from '@/components/shared/Plots/useChartCards'

export default {
  components: {
    BadgeSelect,
    LinePlot
  },
  data() {
    return {
      timeFormats: {
        day: 'H[h]',
        week: 'MMM D, YYYY',
        month: 'MMM D, YYYY'
      },
      pinNamedValues: [],
      colors: ['var(--color-blue-700)', 'var(--color-lime-300)', 'var(--color-yellow-300)', 'var(--color-purple-300)'],
      resizeHandler: null,
      intervals: [
        ['day', this.$t('Day')],
        ['week', this.$t('Week')],
        ['month', this.$t('Month')]
      ],
      selected: 'day',
      ioList: [],
      data: [],
      timeNow: 0,
      // This must be reactvie value because it is beeing changed by cards to hide chart
      datasetOptions: []
    }
  },
  computed: {
    /** @returns {import('@/components/shared/Plots/LinePlot.vue').LinePlotOptions<{}>} */
    options() {
      return {
        height: 400,
        x: {
          type: 'time',
          tooltipFormat: this.format
        },
        y: {
          suggestedMin: 0,
          suggestedMax: 10
        },
        datasetOptions: this.datasetOptions
      }
    },
    parsedData() {
      return this.data.map(point => {
        const timeStamp = Object.values(point)[0]?.x
        if (!timeStamp) return
        return new Measurement(timeStamp, timeStamp, Object.fromEntries(Object.entries(point).map(([key, value]) => [key, value.y])))
      })
    },
    cards() {
      const entries = this.datasetOptions.map(value => [value.key, [generateCard(value, this.getCardContent(value.key), true)]]).filter(e => e[1][0].show !== false)
      return Object.fromEntries(entries)
    },
    format() {
      return this.timeFormats[this.selected]
    }
  },
  watch: {
    ioList(value) {
      this.datasetOptions = value.map((ioItem, index) => ({
        key: ioItem.id,
        name: ioItem.name_with_pins,
        color: this.colors[index] || this.colors[0]
      }))
    }
  },
  async created() {
    this.$spin()
    await this.loadIO()
    this.getCounterData()
  },
  methods: {
    /**
     * Returns an array of objects representing the card content for the given pin name.
     * Each object in the array contains a title and info property.
     * The title represents the card title, and the info represents the corresponding information.
     *
     * @param {string} pinName - The name of the pin.
     * @returns {Array} - An array of objects representing the card content.
     */
    getCardContent(pinName) {
      return [
        {
          title: this.$t('Total count'),
          info: this.getTotalCount(pinName)
        },
        {
          title: this.$t('Average %s count'.format(this.selected === 'day' ? this.$t('hourly') : this.$t('daily'))),
          info: this.getAverageCount(pinName)
        }
      ]
    },
    /**
     * Calculates the total count for a given pin name.
     *
     * @param {string} pinName - The name of the pin.
     * @returns {number} - The total count for the given pin name.
     */
    getTotalCount(pinName) {
      return this.pinNamedValues.reduce((acc, item) => {
        if (item.pin_name === pinName) {
          return acc + (item.count || 0)
        }
        return acc
      }, 0)
    },
    /**
     * Calculates the average count for a given pin name.
     *
     * @param {string} pinName - The name of the pin.
     * @returns {number} - The average count.
     */
    getAverageCount(pinName) {
      const total = this.getTotalCount(pinName)
      const count = this.data.length
      const average = count > 0 && total !== 0 ? total / count : 0
      return Math.round(average)
    },
    /**
     * Loads the I/O data from the server.
     *
     * @returns {Promise} A promise that resolves with the I/O data.
     * @throws {Error} If the request to load the I/O data fails.
     */
    loadIO() {
      return this.$axios
        .get('/api/io/status')
        .then(({ data }) => {
          this.ioList = this.$io.getFilteredPinsInfo(data || []).filter(input => input.type === 'gpio' && (input.direction === 'in' || !input.direction) && input.counter_support !== '0')
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load I/O data'))
        })
    },
    /**
     * Fixes the data by aggregating and filling missing data points based on the selected time period.
     * The function calculates the start time based on the selected time period and generates expected timestamps.
     * It then aggregates the data based on the calculated timestamps and fills any missing data points with initialized counts.
     * Finally, it sorts the data based on the x-axis value.
     */
    fixData() {
      const now = dayjs(this.timeNow)
      let start = dayjs(this.timeNow)
      switch (this.selected) {
        case 'day':
          start = now.startOf('hour').subtract(23, 'hour')
          break
        case 'week':
          start = now.startOf('day').subtract(6, 'day')
          break
        case 'month':
          start = now.startOf('day').subtract(29, 'day')
          break
      }
      start = start.unix()
      let expectedTimestamps = []
      let increment = this.selected === 'day' ? 3600 : 86400
      for (let ts = start; ts < now.unix(); ts += increment) {
        expectedTimestamps.push(ts)
      }
      let aggregatedData = {}
      this.data.forEach(item => {
        const date = dayjs(item.timestamp * 1000)
        let periodKey = this.selected === 'day' ? date.startOf('hour').unix() : date.startOf('day').unix()
        if (!aggregatedData[periodKey]) {
          aggregatedData[periodKey] = { ...this.initializeCounts(periodKey) }
        }
        aggregatedData[periodKey][item.pin_name].y += item.count
      })

      let filledData = expectedTimestamps.map(ts => {
        const expectedDate = dayjs(ts * 1000)
        const dayKey = this.selected === 'day' ? expectedDate.startOf('hour').unix() : expectedDate.startOf('day').unix()
        return aggregatedData[dayKey] || { ...this.initializeCounts(ts) }
      })

      this.data = filledData.sort((a, b) => a.x - b.x)
    },
    /**
     * Initializes the counts for each pin with the given timestamp.
     *
     * @param {number} timestamp - The timestamp to initialize the counts with.
     * @returns {Object} - An object containing the counts for each pin.
     */
    initializeCounts(timestamp) {
      const allPins = this.ioList.map(ioItem => ioItem.id)

      const counts = {}
      allPins.forEach(pin => {
        counts[pin] = { x: timestamp * 1000, y: 0 }
      })
      return counts
    },
    /**
     * Handles the change of the interval for the impulse counter statistics.
     * @param {string} interval - The new interval value.
     * @returns {void}
     */
    intervalChange(interval) {
      this.$spin()
      this.selected = interval
      this.getCounterData()
    },
    /**
     * Retrieves counter data from the server.
     *
     * @returns {Promise} A promise that resolves with the counter data.
     */
    getCounterData() {
      const methods = [`/api/impulse_counter/historic/status?filter=${this.selected}`, '/api/system/device/usage/status?exclude=loadavg']
      return this.$axios
        .bulkGet(methods)
        .then(([database, time]) => {
          if (time.success) {
            this.timeNow = time.data.localtime * 1000
          } else {
            this.$message.error(this.$t('Failed to load time data'))
          }
          if (database.success) {
            this.pinNamedValues = database.data
            this.data = database.data
            this.fixData()
          } else {
            this.$message.error(this.$t('Failed to load status data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
        })
    }
  }
}
</script>
