<template>
  <vuci-named-section
    v-slot="{ s }"
    ref="section"
    :uci-data="uciData"
    :name="section.id"
    :title="$utils.getModalTitle($t('collection'), section.name)"
    :endpoints="[{ endpoint: 'data_to_server/collections/config' }]"
    data-key="collection"
  >
    <vuci-form-item-switch
      :uci-section="s"
      name="enabled"
      :label="$t('Enable')"
      :help="$t('Enables data to server collection instance.')"
      @change="validateCollection(s)"
    />
    <vuci-form-item-input
      v-show="!isAddSection"
      :uci-section="s"
      name="name"
      :label="$t('Name')"
      maxlength="64"
      :rules="v => [v.uciname, collectionNameExists]"
      :help="$t('Name of the data collection. Used for easier data collection management purposes only.')"
      required
    />
    <vuci-form-item-select
      :uci-section="s"
      name="timer"
      :label="$t('Timer')"
      :help="$t('Strategy for collecting/sending data to destination.')"
      :options="timerOptions"
      initial="none"
    />
    <vuci-form-item-input
      ref="period"
      :uci-section="s"
      name="period"
      :label="$t('Period')"
      :help="$t('Interval in seconds for collecting/sending data to destination.')"
      :initial="isAddSection ? '60' : undefined"
      placeholder="60"
      rules="irange(1,86400)"
      :depend="s.timer === 'period'"
      :required="s.enabled === '1'"
      :warnings="getPeriodFtpWarning"
      @change="onPeriodChange"
    />
    <vuci-form-item-list
      :uci-section="s"
      :label="$t('Day time')"
      :help="$t('Day time when action should be executed. Use \'*\' to indicate every hour or minute, (e.g., 12:15, 12:15,16, *:15, *:15,16, 12:* or *:*).')"
      :depend="s.timer === 'scheduler'"
      name="time"
      :rules="timeValidation"
      placeholder="12:15, 12:15,16, *:15, 12:* or *:*"
      :maxlines="10"
      :required="s.enabled === '1'"
      allow-duplicates
      @change="updateTimeData"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Interval type')"
      :help="$t('Allows selecting between week and month days for instance intervals.')"
      :options="dayModeOptions"
      :depend="s.timer === 'scheduler'"
      name="day_mode"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Weekdays')"
      :help="$t('Weekdays, when data should be sent/collected. If nothing is selected, every day of the week will be included.')"
      :placeholder="$t('Every day is selected')"
      :options="dayOptions"
      :depend="s.timer === 'scheduler' && s.day_mode === 'week'"
      name="week_days"
      multiple
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Month day')"
      :help="$t('Month days, when data should be sent/collected. If nothing is selected, every day of the month will be included.')"
      :placeholder="$t('Every day is selected')"
      :options="monthOptions"
      :depend="s.timer === 'scheduler' && s.day_mode === 'month'"
      name="month_days"
      rules="uinteger"
      multiple
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="last_day"
      :label="$t('Force last day')"
      :help="$t('Forces intervals to accept last day of month as valid option if selected day doesn\'t exist in ongoing month.')"
      :depend="s.timer === 'scheduler' && s.day_mode === 'month'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="retry"
      :label="$t('Retry')"
      :help="$t('In case of a failed attempt, retry to send the same data to destination later.')"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="retry_count"
      :label="$t('Retry count')"
      :help="$t('Retry to send the same data N times.')"
      :initial="isAddSection ? '10' : undefined"
      placeholder="10"
      rules="irange(1,10)"
      :depend="s.retry === '1'"
      :required="s.enabled === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="retry_timeout"
      :label="$t('Timeout')"
      :help="$t('Timeout in second between retry attempts.')"
      :initial="isAddSection ? '1' : undefined"
      placeholder="1"
      rules="irange(1,10)"
      :depend="s.retry === '1'"
      :required="s.enabled === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="format"
      :label="$t('Format type')"
      :help="$t('Data collection objects formatting.')"
      :options="formatTypeOptions"
      initial="json"
    />
    <tlt-inline-message
      v-show="s.format === 'json' && binaryPluginUsed"
      type="warning"
      :message="$t('Some inputs may be using binary data. JSON format type does not support binary data.')"
    />
    <vuci-form-item-text-area
      ref="format_str"
      :uci-section="s"
      name="format_str"
      :label="$t('Format string')"
      :help="$t('Specifies custom format string.')"
      :placeholder="formatPlaceholder"
      maxlength="4096"
      :depend="s.format === 'custom'"
      :required="s.enabled === '1'"
    />
    <template v-if="s.format === 'custom'">
      <tlt-form-accordion
        name="string-list"
        :title="$t('string list')"
      >
        <tlt-form-model-item>
          <t-parameters class="w-full">
            <strong>{{ $t('String list') }}:</strong>
            <t-parameters-list>
              <t-parameters-list-item
                v-for="param in formattedParameters"
                :key="param.parameter"
                v-bind="param"
              />
            </t-parameters-list>
          </t-parameters>
        </tlt-form-model-item>
      </tlt-form-accordion>
    </template>
    <vuci-form-item-input
      :uci-section="s"
      name="na_str"
      :label="$t('Empty value')"
      :help="$t('A string which will be placed if any value cannot be received.')"
      maxlength="64"
      :initial="isAddSection ? 'N/A' : undefined"
      placeholder="N/A"
      :depend="s.format === 'custom'"
      :required="s.enabled === '1'"
    />
    <vuci-form-item-button
      :uci-section="s"
      name="downloadExampleFormatLua"
      :label="$t('Lua format example script')"
      :text="$t('Download')"
      :depend="s.format === 'lua'"
      no-write
      @click="downloadExampleLua('/format/actions/download_example_format_lua', $t('example format lua'))"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="format_script"
      :label="$t('Lua format script')"
      :depend="s.format === 'lua'"
      :required="s.enabled === '1'"
      :readonly="$session.group !== 'root'"
    >
      <template
        v-if="$session.group !== 'root'"
        #after-content="{ controlRef }"
      >
        <tlt-tooltip
          :target="() => controlRef"
          placement="bottom-start"
          fallback-placements="top-start"
          :content="$t('Current user is unauthorized to edit scripts.')"
        />
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-select
      :uci-section="s"
      name="encoder"
      :label="$t('Encoder')"
      :help="$t('Encoder used for all sent data.')"
      :options="encoderTypeOptions"
      :depend="encoderOptions().length > 0"
    />
  </vuci-named-section>
</template>

<script>
import { formBus } from '@ui-core/vuci-form/src/form-bus'
export default {
  inject: ['formatOptions', 'industrialPlugins', 'downloadExampleLua', 'encoderOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    uciData: {
      type: Object,
      required: true
    },
    isAddSection: {
      type: Boolean,
      required: false
    }
  },
  data() {
    return {
      dayModeOptions: [
        ['week', this.$t('Weekdays')],
        ['month', this.$t('Month days')]
      ],
      dayOptions: [
        ['mon', this.$t('Monday')],
        ['tue', this.$t('Tuesday')],
        ['wed', this.$t('Wednesday')],
        ['thu', this.$t('Thursday')],
        ['fri', this.$t('Friday')],
        ['sat', this.$t('Saturday')],
        ['sun', this.$t('Sunday')]
      ],
      timerOptions: [
        ['period', this.$t('Period')],
        ['scheduler', this.$t('Scheduler')],
        ['none', this.$t('None')]
      ],
      timeData: {}
    }
  },
  computed: {
    monthOptions() {
      return Array.from({ length: 31 }, (_, i) => `${i + 1}`)
    },
    binaryPluginUsed() {
      return !!this.filterInputs.find(s => this.industrialPlugins().includes(s.plugin))
    },
    filterInputs() {
      return this.uciData?.inputs?.filter(input => this.section?.input?.includes(input.id) && input.name) || []
    },
    formattedParameters() {
      return this.filterInputs.map(input => ({ description: input.name, parameter: `%${input.name}%` }))
    },
    formatPlaceholder() {
      if (this.filterInputs.length < 1) return ''
      return `{ ${this.filterInputs.map(input => `"${input.name}": "%${input.name}%"`).join(', ')} }`
    },
    formatTypeOptions() {
      return this.formatOptions().map(option => [option, this.$dataSenderParameters.formatTranslate()[option]])
    },
    encoderTypeOptions() {
      return ['', ...this.encoderOptions()].map(option => [option, this.$dataSenderParameters.encoderTranslate()[option]])
    }
  },
  mounted() {
    formBus.on('output-ftp-interval-change', this.periodCheckWarnings)
  },
  unmounted() {
    formBus.off('output-ftp-interval-change', this.periodCheckWarnings)
  },
  methods: {
    updateInputValues() {
      if (this.$refs.format_str) {
        this.$refs.format_str.setInitialValue(this.formatPlaceholder)
      }
    },
    collectionNameExists(val) {
      if (this.uciData.collection.filter(o => o.name === val).length > 1) {
        return { isValid: false, message: this.$t("Instance '%s' already exists.").format(val) }
      }
      return { isValid: true }
    },
    validateCollection(s) {
      const inputs = this.uciData.inputs.filter(section => s.input?.includes(section.id))
      if (s.enabled !== '1') return
      if (inputs.some(input => !('name' in input))) {
        s.enabled = '0'
        return this.$message.error(this.$t('To enable collection, it is required that all data inputs assigned to this collection are configured'))
      }
      if (!inputs || inputs.length === 0) {
        s.enabled = '0'
        return this.$message.error(this.$t('To enable collection, it is required to have created at least one data input'))
      }
    },
    timeValidation(value) {
      // Explanation of the regex:
      // ^ - Start of the string
      // (\*|[0-1][0-9]|2[0-3]) - Matches the hour part:
      //    \* - Matches a literal asterisk (*)
      //    [0-1][0-9] - Matches hours from 00 to 19
      //    2[0-3] - Matches hours from 20 to 23
      // : - Matches a literal colon (:)
      // (\*|[0-5][0-9]) - Matches the minute part:
      //    \* - Matches a literal asterisk (*)
      //    [0-5][0-9] - Matches minutes from 00 to 59
      // $ - End of the string
      const regex = /^(\*|[0-1][0-9]|2[0-3]):(\*|[0-5][0-9])(,(\*|[0-5][0-9]))*$/
      if (!regex.test(value))
        return {
          isValid: false,
          message: this.$t('Time of format hh:mm, hh:mm,mm, *:mm, *:mm,mm , hh:*, or *:* is accepted.')
        }
      const data = value.split(':')
      const hour = data[0]
      const minutes = data[1].split(',')
      for (const minute of minutes) {
        if (minute === '*' && minutes.length > 1) {
          return {
            isValid: false,
            message: this.$t("It's not possible to use multiple minute values when '*' (every minute wildcard) is selected.")
          }
        } else if (this.timeData[hour] && this.timeData[hour][minute]) {
          return {
            isValid: false,
            message: this.$t("'%s' minute value for hour '%s' is already used.").format(minute, hour)
          }
        }
      }
      return { isValid: true }
    },
    updateTimeData(_, options) {
      this.timeData = {}
      for (const timeOption of options) {
        const [hour, minutes = ''] = timeOption.split(':')
        for (const minute of minutes.split(',')) {
          this.timeData[hour] = this.timeData[hour] ? this.timeData[hour] : {}
          this.timeData[hour][minute] = this.timeData[hour][minute] !== undefined
        }
      }
    },
    getPeriodFtpWarning(value) {
      const output = this.uciData.outputs?.find(o => o.id === this.section.output)
      return output.plugin === 'ftp' && parseInt(output.ftp_interval) < parseInt(value) && this.$t('If the period exceeds the interval, it may cause errors during data collecting.')
    },
    periodCheckWarnings() {
      this.$refs.period?.checkWarnings()
    },
    onPeriodChange() {
      formBus.emit('collection-period-change')
    }
  }
}
</script>
