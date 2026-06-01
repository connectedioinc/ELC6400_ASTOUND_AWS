<template>
  <tlt-card
    :title="$t('Mobile signal strength')"
    :help="$t('This section displays mobile signal strength values changes over a period of 3 minutes.')"
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
      v-if="options"
      :data="chartData"
      :options="options"
    />
  </tlt-card>
  <tlt-table
    v-for="table in tableData"
    :id="table.id"
    :ref="table.id"
    :key="table.id"
    :columns="table.columns"
    :data-source="table.data"
    :data-key="table.id"
    :per-page-text="$t('Bands per page')"
    :no-value-text="$t('There are no connected bands')"
    :title="selected === 'live' ? '%s, %s'.format(table.name, table.conntype || '-') : table.name"
    :help="$t('%s connected bands.').format(table.name)"
    :table-actions="tableActions(table)"
    @filter-applied="selected === 'live' ? updateData(true) : updateHistoryData(true)"
  >
    <template
      v-for="column in table.columns.filter(col => col.scopeName)"
      :key="column.dataIndex"
      #[column.dataIndex]="{ record }"
    >
      <div
        class="flex justify-start items-center gap-x-1 cursor-pointer"
        :class="{ 'line-through': record[column.dataIndex].hidden }"
        @click="cellClick(table.id, record.frequency, column.dataIndex, record)"
      >
        <template v-if="record[column.dataIndex] !== '-'">
          <span
            class="shrink-0 h-2 w-2 rounded-full"
            :style="{ background: 'hsl(' + cardColors[`${column.dataIndex}_${table.id}_${record?.frequency}`] + ')' }"
          />
          <template v-if="record[column.dataIndex].curr">
            <span class="font-semibold">
              {{ record[column.dataIndex].curr }}
            </span>
            /
          </template>
          {{ record[column.dataIndex].avg }} / {{ record[column.dataIndex].peak }}
        </template>
        <template v-else>-</template>
      </div>
    </template>
  </tlt-table>
</template>

<script>
import LinePlot from '@/components/shared/Plots/LinePlot.vue'
import BadgeSelect from '@/components/shared/BadgeSelect.vue'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import { useTimeChartScale } from '@/components/shared/Plots/useTimeChartScale'
import { convertSimpleMeasurement } from '@/components/shared/Plots/measurement'

export default {
  components: {
    LinePlot,
    BadgeSelect
  },
  data() {
    return {
      options: null,
      signalVal: {},
      signalValCard: {},
      cardColors: {},
      modems: [],
      defaultColors: [
        '262, 83%, 58%',
        '43, 96%, 56%',
        '210, 99%, 45%',
        '23, 83%, 31%',
        '145, 36%, 45%',
        '142, 71%, 45%',
        '7, 63%, 37%',
        '29, 77%, 55%',
        '271, 91%, 65%',
        '48, 97%, 77%',
        '209, 100%, 80%',
        '26, 90%, 37%',
        '145, 52%, 69%',
        '142, 77%, 73%',
        '7, 71%, 55%',
        '32, 95%, 44%',
        '7, 83%, 69%'
      ],
      tableData: [],
      hiddenCells: {},
      currentAvgPeak: this.$t('Current/Average/Peak'),
      avgPeak: this.$t('Average/Peak'),
      graphs: [],
      rawData: [],
      chartData: [],
      intervals: [
        ['live', this.$t('Live')],
        ['hour', this.$t('Hour')]
      ],
      selected: 'live',
      historyData: [],
      availableType: []
    }
  },
  watch: {
    modems() {
      if (this.selected === 'live') this.updateData()
    }
  },
  created() {
    this.$spin()
    this.$store.readOnlyPage = false
    return this.getData()
      .then(() => {
        this.$timer.start({ method: this.getData, time: 3000, autostart: true, immediate: false })
      })
      .finally(() => {
        this.$spin(false)
      })
  },
  methods: {
    /**
     * @param recalculateOnly - workaround to recalculate what needs to be hidden but do not add new value to rawData
     */
    updateData(recalculateOnly = false) {
      this.graphs = []
      const currentData = {}
      this.modems.forEach(modem => {
        let name = modem.name
        const data = []
        const signalValues = ['rssi', 'rsrp', 'rsrq', 'sinr', 'rscp', 'ecio']
        if (!modem.band || modem.band === 'N/A') {
          name = this.$mobile.modemOffline(modem) ? this.$t('%s (unreachable)').format(modem.name) : modem.name
        } else if (Array.isArray(modem.ca_signal) && modem.ca_signal.length) {
          modem.ca_signal.forEach((band, index) => {
            const cellInfo = modem.cell_info.find(element => element.arfcn === band.frequency || element['nr-arfcn'] === band.frequency) ?? {}
            band = {
              ...band,
              ...cellInfo
            }
            if (band?.frequency !== 'N/A') {
              const name = `${modem.id}_${band?.frequency}`
              if (index === 1) signalValues.shift()
              signalValues.forEach(value => {
                const val = `${value}_${name}`
                this.createArray(val)
                const signalVal = this.updateSignal(value === 'rssi' ? modem[value] : band[value])
                this.signalVal[val].push(signalVal)
                this.signalValCard[val] = this.calculateSignal(this.signalVal[val])
                currentData[val] = signalVal
              })
              this.fillData(modem, band, index === 0)
              data.push(this.updateCards(modem, band, index === 0))
            }
          })
        } else {
          const cellInfo = modem.cell_info?.[0]
          const { arfcn, uarfcn, earfcn, 'nr-arfcn': nrarfcn } = cellInfo || {}
          modem.frequency = [arfcn, uarfcn, earfcn, nrarfcn].find(data => !isNaN(data))
          if (modem.frequency !== undefined) {
            const name = `${modem.id}_${modem?.frequency}`
            signalValues.forEach(value => {
              const val = `${value}_${name}`
              this.createArray(val)
              const signalVal = this.updateSignal(modem[value])
              this.signalVal[val].push(signalVal)
              this.signalValCard[val] = this.calculateSignal(this.signalVal[val])
              currentData[val] = signalVal
            })
            this.fillData(modem, modem, true)
            data.push(this.updateCards(modem, modem, true))
          }
        }
        const index = this.tableData.findIndex(data => data.id === modem.id)
        if (index !== -1) this.tableData[index] = { ...this.tableData[index], name, conntype: this.$mobile.getConntype(modem.conntype), columns: this.columnsModem(modem), data }
        else this.tableData.push({ id: modem.id, name, conntype: this.$mobile.getConntype(modem.conntype), columns: this.columnsModem(modem), data, hidden: false })
      })
      this.tableData = this.tableData.filter(table => {
        return this.modems.find(modem => modem.id === table.id) !== undefined
      })
      const scaleProps = useTimeChartScale('live', 0)
      if (!recalculateOnly) {
        const time = Date.now()
        this.rawData.push({ time, value: currentData })

        // Removes old data that is out of bounds
        if (this.rawData.length > 1 && time - this.rawData[0].time > scaleProps.options.fullSpanOptions.live * 20) {
          this.rawData.shift()
        }
      }
      this.chartData = convertSimpleMeasurement(this.rawData)
      this.updateOptions()
    },
    formatValue(v, key, data) {
      if (!key) return `${v} dBm`
      const [type, modem, frequency] = key.split('_')
      const unit = ['ecio', 'rsrq', 'sinr'].includes(type) ? 'dB' : 'dBm'

      const sinr = data.mesurement.value[`sinr_${modem}_${frequency}`]
      const networkType = data.mesurement.value[`type_${modem}_${frequency}`]
      const lte = this.selected === 'live' ? sinr !== undefined : this.checkIf4g5g(networkType)

      const valueMap = {
        rssi: this.$mobile.rssiValue(v, lte).value,
        ecio: this.$mobile.ecioValue(v).value,
        rscp: this.$mobile.rscpValue(v).value,
        rsrp: this.$mobile.rsrpValue(v).value,
        rsrq: this.$mobile.rsrqValue(v).value,
        sinr: this.$mobile.sinrValue(v).value
      }
      if (this.selected === 'live') return `${v} ${unit} (${valueMap[type]})`

      const f = data.mesurement.value[`frequency_${modem}_${frequency}`]
      const band = this.$mobile.getBandName({ band: data.mesurement.value[`band_${modem}_${frequency}`] || '' }, { ntype: this.$mobile.getNetworkType(networkType) })
      return `${v} ${unit} (${valueMap[type]}) | ${this.$mobile.getNetworkType(networkType)} - ${band} (${typeof f === 'number' ? f : '-'})`
    },
    checkIf4g5g(value) {
      return (value >= 20 && value <= 29) || (value >= 32 && value <= 39)
    },
    calculateSignal(signalArr) {
      signalArr = signalArr.filter(n => n != null)
      if (signalArr.length === 0) {
        return { curr: '-', peak: '-', avg: '-' }
      }
      return {
        curr: signalArr[signalArr.length - 1],
        peak: Math.max(...signalArr),
        avg: signalArr.reduce((acc, current) => acc + current, 0) / signalArr.reduce((acc, current) => (current !== null ? acc + 1 : acc), 0)
      }
    },
    columnsModem(modem, history, available3g, available4g) {
      const name = history ? this.avgPeak : this.currentAvgPeak
      const columns = [
        {
          dataIndex: 'rssi',
          title: 'RSSI (%s)'.format(name),
          help: this.$t('Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.'),
          scopeName: 'signal_strength'
        }
      ]
      if (!history) {
        columns.unshift({
          dataIndex: 'band',
          title: this.$t('Band (%s)').format(this.$mobile.getFrequencyName(modem)),
          help: this.$t('Currently used mobile band and frequency channel number.'),
          actions: { sort: true, filter: { type: 'uniqueValues' } }
        })
      }
      const check3g = history ? available3g : this.$mobile.connectedTo3g(modem)
      const check4g = history ? available4g : this.$mobile.connectedTo4g5g(modem)
      if (check3g) {
        columns.push(
          {
            dataIndex: 'rscp',
            title: 'RSCP (%s)'.format(name),
            help: this.$t(
              'Received Signal Code Power (RSCP) denotes the power measured by a receiver on a particular physical communication channel, measured in dBm. Values range from -124 to 0 (closer to 0 indicates better signal strength).'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'ecio',
            title: 'EC/IO (%s)'.format(name),
            help: this.$t(
              'The EC/IO is a measure of the quality/cleanliness of the signal from the tower to the modem and indicates the signal-to noise ratio, measured in dB. Values range from -20 to 0 (closer to 0 indicates better signal quality/cleanliness).'
            ),
            scopeName: 'signal_strength'
          }
        )
      }
      if (check4g) {
        columns.push(
          {
            dataIndex: 'rsrp',
            title: 'RSRP (%s)'.format(name),
            help: this.$t(
              'Reference Signal Received Power (RSRP) is an RSSI type of measurement, measured in dBm. It is the power of the LTE Reference Signals spread over the full bandwidth and narrowband. Values closer to 0 indicate better signal strength.'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'rsrq',
            title: 'RSRQ (%s)'.format(name),
            help: this.$t(
              'Reference Signal Received Quality (RSRQ) is a C/I type of measurement and it indicates the quality of the received reference signal, measured in dB. Values closer to 0 indicate a better rate of information transfer.'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'sinr',
            title: 'SINR (%s)'.format(name),
            help: this.$t(
              'Signal-to-Interference-plus-Noise Ratio (SINR) is a quantity used to give theoretical upper bounds on channel capacity (or the rate of information transfer) in wireless communication systems, measured in dB. Higher values indicate a better rate of information transfer.'
            ),
            scopeName: 'signal_strength'
          }
        )
      }
      return columns
    },
    fillData(modem, band, first) {
      const bandName = '%s (%s)'.format(this.$mobile.getBandName(band, modem), band?.frequency)
      let hidden = this.tableData.find(data => data.id === modem.id)?.hidden || false
      const appliedFilters = this.$refs[modem.id]?.[0]?.filters.band.applied
      if (appliedFilters?.length > 0) {
        if (!appliedFilters.some(band => band === bandName)) {
          hidden = true
        }
      }
      const name = `${modem.id}_${band?.frequency}`
      const modemText = '%s - %s (%s)'.format(this.modemText(modem), this.$mobile.getBandName(band, modem), band?.frequency)

      this.graphs = [...this.graphs, ...this.graphColumns(this.$mobile.connectedTo3g(modem), this.$mobile.connectedTo4g5g(modem), modemText, name, hidden, first)]
    },
    graphColumns(available3g, available4g, modemText, name, hidden = false, first = true) {
      const graphs = []
      graphs.push({
        key: `rssi_${name}`,
        color: `hsl(${this.cardColors[`rssi_${name}`]})`,
        name: 'RSSI%s'.format(modemText),
        show: !(!first || hidden || this.hiddenCells[`rssi_${name}`])
      })
      if (available3g) {
        graphs.push(
          {
            key: `rscp_${name}`,
            color: `hsl(${this.cardColors[`rscp_${name}`]})`,
            name: 'RSCP%s'.format(modemText),
            show: !(hidden || this.hiddenCells[`rscp_${name}`])
          },
          {
            key: `ecio_${name}`,
            color: `hsl(${this.cardColors[`ecio_${name}`]})`,
            name: 'EC/IO%s'.format(modemText),
            show: !(hidden || this.hiddenCells[`ecio_${name}`])
          }
        )
      }
      if (available4g) {
        graphs.push(
          {
            key: `rsrp_${name}`,
            color: `hsl(${this.cardColors[`rsrp_${name}`]})`,
            name: 'RSRP%s'.format(modemText),
            show: !(hidden || this.hiddenCells[`rsrp_${name}`])
          },
          {
            key: `rsrq_${name}`,
            color: `hsl(${this.cardColors[`rsrq_${name}`]})`,
            name: 'RSRQ%s'.format(modemText),
            show: !(hidden || this.hiddenCells[`rsrq_${name}`])
          },
          {
            key: `sinr_${name}`,
            color: `hsl(${this.cardColors[`sinr_${name}`]})`,
            name: 'SINR%s'.format(modemText),
            show: !(hidden || this.hiddenCells[`sinr_${name}`])
          }
        )
      }
      return graphs
    },
    updateCards(modem, band, first) {
      const cards = {}
      cards.modem = modem.id
      cards.band = '%s (%s)'.format(this.$mobile.getBandName(band, modem), band?.frequency)
      cards.frequency = band?.frequency
      const name = `${modem.id}_${band?.frequency}`
      const rssi = this.signalValCard[`rssi_${name}`] || '-'
      cards.rssi = this.signalStrength(rssi, first, false, this.hiddenCells[`rssi_${name}`])
      let supports = this.$mobile.connectedTo4g5g(modem)
      if (supports) {
        const rsrp = this.signalValCard[`rsrp_${name}`]
        cards.rsrp = this.signalStrength(rsrp, supports, false, this.hiddenCells[`rsrp_${name}`])
        const rsrq = this.signalValCard[`rsrq_${name}`]
        cards.rsrq = this.signalStrength(rsrq, supports, true, this.hiddenCells[`rsrq_${name}`])
        const sinr = this.signalValCard[`sinr_${name}`]
        cards.sinr = this.signalStrength(sinr, supports, true, this.hiddenCells[`sinr_${name}`])
      }
      supports = this.$mobile.connectedTo3g(modem)
      if (supports) {
        const rscp = this.signalValCard[`rscp_${name}`]
        cards.rscp = this.signalStrength(rscp, supports, false, this.hiddenCells[`rscp_${name}`])
        const ecio = this.signalValCard[`ecio_${name}`]
        cards.ecio = this.signalStrength(ecio, supports, true, this.hiddenCells[`ecio_${name}`])
      }
      return cards
    },
    modemText(modem) {
      return this.$mobile.shouldShowModemName(modem) ? ' (%s)'.format(modem.name) : ''
    },
    signalStrength(val, supports, ratio, hidden) {
      const unit = ratio ? 'dB' : 'dBm'
      if (supports)
        return {
          curr: '%s %s'.format(typeof val?.curr === 'number' ? val?.curr : '-', unit),
          avg: '%s %s'.format(typeof val?.avg === 'number' ? Math.round(val?.avg * 100) / 100 : '-', unit),
          peak: '%s %s'.format(typeof val?.peak === 'number' ? val?.peak : '-', unit),
          hidden
        }
      return '-'
    },
    getData() {
      return this.$axios
        .get('/api/modems/status')
        .then(({ data }) => {
          this.modems = this.$mobile.parseModems(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
    },
    updateSignal(signal) {
      const val = Number(signal)
      if (!isNaN(val)) return val
      return undefined
    },
    generateHsl() {
      if (this.defaultColors.length) return this.defaultColors.shift()
      return `${Math.floor(Math.random() * 360)}, ${Math.floor(Math.random() * 50) + 50}%, 50%`
    },
    createArray(obj) {
      if (!this.signalVal[obj]) {
        this.signalVal[obj] = []
        this.cardColors[obj] = this.generateHsl()
      }
    },
    cellClick(modemId, frequency, column, record) {
      if (record[column] !== '-') {
        const cellRef = `${column}_${modemId}_${frequency}`
        if (!record[column].hidden) this.hiddenCells[cellRef] = true
        else this.hiddenCells[cellRef] = false

        if (this.selected === 'live') this.updateData(true)
        else this.updateHistoryData(true)

        return (record[column].hidden = !record[column].hidden)
      }
    },
    getHistoryData() {
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/modems/signal/status'])
        .then(([modemList, signalStatus]) => {
          if (modemList.success && signalStatus.success) {
            this.modems = this.$mobile.parseModems(modemList.data)
            this.historyData = signalStatus.data
            this.updateHistoryData()
          } else {
            this.$message.error(this.$t('Failed to load modem data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    combineTimestamps(data) {
      const timestampSet = new Set()
      data.forEach(modem => {
        this.availableType.push({ modem: modem.modem, threeG: false, fourG: false })
        modem.signal?.forEach(signal => {
          timestampSet.add(signal.timestamp)
        })
      })
      return Array.from(timestampSet).sort((a, b) => a - b)
    },
    updateHistoryData(recalculateOnly = false) {
      let graphs = []

      if (!recalculateOnly) {
        const allTimestamps = this.combineTimestamps(this.historyData)
        allTimestamps.forEach(ts => {
          const value = {}
          this.historyData.forEach((modem, idx) => {
            const signal = modem.signal.find(s => s.timestamp === ts)
            if (!signal) return

            value[`rssi_${modem.modem}_0`] = signal.rssi
            value[`rsrp_${modem.modem}_0`] = signal.rsrp
            value[`rsrq_${modem.modem}_0`] = signal.rsrq
            value[`sinr_${modem.modem}_0`] = signal.sinr
            value[`rscp_${modem.modem}_0`] = signal.rscp
            value[`ecio_${modem.modem}_0`] = signal.ecio
            value[`frequency_${modem.modem}_0`] = signal.channel_number
            value[`type_${modem.modem}_0`] = signal.network_type
            value[`band_${modem.modem}_0`] = signal.band

            this.availableType[idx].threeG = !this.availableType[idx].threeG ? signal.rscp !== undefined : this.availableType[idx].threeG
            this.availableType[idx].fourG = !this.availableType[idx].fourG ? signal.rsrp !== undefined : this.availableType[idx].fourG
            const signalValues = ['rssi']
            if (this.availableType[idx].fourG) signalValues.push('rsrp', 'rsrq', 'sinr')
            if (this.availableType[idx].threeG) signalValues.push('rscp', 'ecio')
            signalValues.forEach(val => {
              const name = `${val}_${modem.modem}_0`
              this.createArray(name)
              if (signal[val] === undefined) return
              this.signalVal[name].push(this.updateSignal(signal[val]))
            })
          })
          this.rawData.push({
            time: ts * 1000,
            value
          })
        })
      }

      this.historyData.forEach((modem, idx) => {
        const currentModem = this.modems.find(m => m.id === modem.modem)
        if (!recalculateOnly) {
          let calculatedVal
          if (modem.signal?.length > 0) {
            calculatedVal = {}
            const signalValues = ['rssi']
            if (this.availableType[idx].fourG) signalValues.push('rsrp', 'rsrq', 'sinr')
            if (this.availableType[idx].threeG) signalValues.push('rscp', 'ecio')
            signalValues.forEach(value => {
              const { peak, avg } = this.calculateSignal(this.signalVal[`${value}_${modem.modem}_0`] || [])
              const unit = ['rsrq', 'sinr', 'ecio'].includes(value) ? 'dB' : 'dBm'
              calculatedVal[value] = {
                avg: '%s %s'.format(typeof avg === 'number' ? Math.round(avg * 100) / 100 : '-', unit),
                peak: '%s %s'.format(typeof peak === 'number' ? peak : '-', unit),
                frequency: 0
              }
            })
            calculatedVal['frequency'] = 0
          }

          this.tableData.push({
            id: modem.modem,
            name: currentModem?.name || this.$t('Unknown modem'),
            columns: this.columnsModem({ id: idx }, true, this.availableType[idx].threeG, this.availableType[idx].fourG),
            data: calculatedVal ? [calculatedVal] : []
          })
        }
        const hidden = this.tableData.find(data => data.id === modem.modem)?.hidden || false
        const modemText = this.modemText(currentModem)
        const name = `${modem.modem}_0`
        graphs = [...graphs, ...this.graphColumns(this.availableType[idx].threeG, this.availableType[idx].fourG, modemText, name, hidden)]
      })
      this.graphs = graphs
      this.chartData = convertSimpleMeasurement(this.rawData)
      this.updateOptions()
    },
    updateOptions() {
      let additionalOptions = {
        y: {
          suggestedMin: -120,
          suggestedMax: 20
        },
        gradiant: 'peak'
      }
      this.options = useChartOptions({
        chartData: { value: this.chartData },
        scaleProps: useTimeChartScale(this.selected, 0),
        formatValue: (s, _, key, popoverData) => this.formatValue(s, key, popoverData),
        graphs: { value: this.graphs },
        additionalOptions
      })
    },
    intervalChange(interval) {
      this.selected = interval
      this.$spin()
      this.resetData()
      if (interval !== 'live') {
        this.$timer.stop(this.getData)
        return this.getHistoryData().finally(() => {
          this.$spin(false)
        })
      }
      return this.getData()
        .then(() => {
          this.$timer.start(this.getData)
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    resetData() {
      this.modems = []
      this.rawData = []
      this.chartData = []
      this.tableData = []
      this.availableType = []
      this.defaultColors = [
        '262, 83%, 58%',
        '43, 96%, 56%',
        '210, 99%, 45%',
        '23, 83%, 31%',
        '145, 36%, 45%',
        '142, 71%, 45%',
        '7, 63%, 37%',
        '29, 77%, 55%',
        '271, 91%, 65%',
        '48, 97%, 77%',
        '209, 100%, 80%',
        '26, 90%, 37%',
        '145, 52%, 69%',
        '142, 77%, 73%',
        '7, 71%, 55%',
        '32, 95%, 44%',
        '7, 83%, 69%'
      ]
      this.hiddenCells = {}
      this.signalVal = {}
      this.signalValCard = {}
      this.cardColors = {}
      this.historyData = []
    },
    tableActions(table) {
      const noData = table.data.length === 0
      const actions = [
        {
          id: 'hide-bands',
          iconLeft: 'password',
          label: table.hidden ? this.$t('Show') : this.$t('Hide'),
          disabled: noData,
          callback: () => {
            table.hidden = !table.hidden
            this.selected === 'live' ? this.updateData(true) : this.updateHistoryData(true)
          },
          hints: { info: noData ? this.$t('Disabled because there are no connected bands') : this.$t('Show/hide modem bands on the graph') }
        }
      ]
      if (this.selected === 'hour') {
        actions.push({
          id: 'export',
          iconLeft: 'upload-export',
          label: this.$t('Export'),
          disabled: noData,
          callback: () => this.exportData(table.id),
          hints: { info: noData ? this.$t('Disabled because there are no connected bands') : this.$t('Export data to CSV') }
        })
      }
      return [...actions, 'column-list', 'search']
    },
    exportData(id) {
      const deviceName = this.$store.deviceInfo?.static?.device_name || ''
      const modemName = this.modems.find(m => m.id === id)?.name || this.$t('Unknown modem')
      const fileName = `mobilesignal-${modemName.toLowerCase().replaceAll(' ', '-')}-data-${deviceName}`

      const data = this.historyData.find(modem => modem.modem === id)?.signal || []
      const rows = data.map(signal => [
        Number(signal.timestamp) ? this.$localDate(signal.timestamp, { format: 'YYYY-MM-DD HH:mm:ss' }) : '-',
        Number(signal.timestamp) ? signal.timestamp : '-',
        this.$mobile.getNetworkType(signal.network_type),
        `${this.$mobile.getBandName({ band: signal.band }, { ntype: this.$mobile.getNetworkType(signal.network_type) })} (${signal.channel_number ?? 0})`,
        signal.rssi ?? '-',
        signal.rscp ?? '-',
        signal.ecio ?? '-',
        signal.rsrp ?? '-',
        signal.rsrq ?? '-',
        signal.sinr ?? '-'
      ])
      rows.unshift([this.$t('Date'), this.$t('Timestamp'), this.$t('Network type'), this.$t('Band (channel number)'), 'RSSI, dBm', 'RSCP, dBm', 'EC/IO, dB', 'RSRP, dBm', 'RSRQ, dB', 'SINR, dB'])
      this.$utils.generateCsv(fileName, rows)
    }
  }
}
</script>
