<template>
  <tlt-table
    id="channel_occurences"
    :title="$t('Rating')"
    :columns="occurrenceCols"
    :data-source="channelOccurrences"
    pagination
    :table-actions="['rating-select', 'column-list', 'search']"
  >
    <template
      v-if="radioDevices.length > 1"
      #rating-select
    >
      <div class="flex gap-x-4 py-3">
        <tlt-check-box
          v-for="(data, idx) in selected"
          :key="idx"
          v-model="data.checked"
          class="flex items-center gap-1 m-0!"
          type="radio"
          :text="data.name"
          :custom-id="`radio-${data.name}`"
          :readonly="false"
          @update:model-value="updateRadio(data.name)"
        />
      </div>
    </template>
    <template #rating="{ record }">
      <div class="flex gap-x-1">
        <div>
          <div
            v-for="(val, idx) in getRating(record)"
            :key="idx"
            class="star"
            :class="{ filled: val === 1 }"
          />
        </div>
        <div>{{ `${record.rating}%` }}</div>
      </div>
    </template>
  </tlt-table>
</template>

<script>
export default {
  props: {
    radioDevices: {
      type: Array,
      default: () => []
    },
    scanned: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      maxAccessPoints: 0,
      selectedBand: '2.4GHz',
      selected: [
        {
          checked: true,
          name: '2.4GHz'
        },
        {
          checked: false,
          name: '5GHz'
        }
      ],
      occurrenceCols: [
        { dataIndex: 'channel', title: this.$t('Channel'), actions: { sort: true } },
        { dataIndex: 'occurrence', title: this.$t('Access points'), actions: { sort: true } },
        { dataIndex: 'rating', title: this.$t('Rating'), actions: { sort: true } }
      ],
      channelOccurrences: []
    }
  },
  watch: {
    scanned() {
      this.channelOccurrences = this.getChannelOccurrences()
    },
    selectedBand() {
      this.channelOccurrences = this.getChannelOccurrences()
    }
  },
  methods: {
    updateRadio(option) {
      this.selectedBand = option
      this.selected.forEach(data => (data.checked = data.name === option))
    },
    getChannelOccurrences() {
      this.maxAccessPoints = 0
      const devices = this.selectedBand === '5GHz' ? this.scanned.scannedDevices5GHz : this.scanned.scannedDevices24GHz
      const occurrences = devices.reduce((a, data) => {
        a[data.channel] = ++a[data.channel] || 1
        return a
      }, {})
      const data = Object.entries(occurrences).map(x => {
        this.maxAccessPoints = x[1] > this.maxAccessPoints ? x[1] : this.maxAccessPoints
        return { channel: parseInt(x[0]), occurrence: x[1] }
      })
      const [minChannel, maxChannel] = this.selectedBand === '5GHz' ? [35, 165] : [0, 14]
      const dataFill = Array.from({ length: maxChannel - minChannel }, (_, i) => minChannel + 1 + i)
        .map(x => ({ channel: x, occurrence: 0 }))
        .filter(x => (x.channel >= 30 ? x.channel % 4 === 0 : true))
      const channels = data.map(d => d.channel)
      return data.concat(dataFill.filter(d => !channels.includes(d.channel))).map(data => {
        const rating = 100 - Math.floor((data.occurrence / this.maxAccessPoints) * 100)
        data.rating = isNaN(rating) ? 100 : rating
        return data
      })
    },
    getRating(record) {
      const max = 5
      const rating = max - Math.floor((record.occurrence / this.maxAccessPoints) * max)
      const stars = isNaN(rating) ? max : rating
      const arr = Array(max).fill(0)
      for (let i = 0; i < stars; i++) {
        arr[i] = 1
      }
      return arr
    }
  }
}
</script>

<style scoped>
.star {
  background: var(--color-theme-bg-secondary-subtle);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  display: inline-block;
  height: 1.25rem;
  width: 1.25rem;
  &.filled {
    background: var(--color-theme-bg-primary-1);
  }
}
</style>
