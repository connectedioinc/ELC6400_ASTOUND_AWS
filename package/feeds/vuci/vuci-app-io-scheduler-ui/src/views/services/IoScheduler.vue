<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    config="io_scheduler"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="scheduler_general"
      :title="$t('General configuration')"
      :endpoints="[{ endpoint: 'io/scheduler/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable Scheduler')"
        :help="$t('Turns the Scheduler on or off.')"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      data-key="scheduler"
      type="scheduler"
      :title="$t('Output scheduler instances')"
      :help="$t('Here you can configure output changing for custom time intervals.')"
      :columns="schedulerColumns"
      :table-actions="['column-list', 'search']"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'io/scheduler/config' }]"
      :error-handlers="{ edit: returnErrorMessage }"
    >
      <template #pin="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="pin"
          :display-value="displayPin"
        />
      </template>
      <template #period="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="period"
          :display-value="displayPeriod"
        />
      </template>
      <template #_from="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="_from"
          :display-value="displayRange"
        />
      </template>
      <template #_to="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="_to"
          :display-value="displayRange"
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
import EditForm from './IoSchedulerEdit'

export default {
  provide() {
    return {
      pins: () => this.filteredIoData.filter(io => (io.type === 'gpio' && (io.direction === 'out' || io.bi_dir === '1')) || io.type === 'relay').map(io => [io.id, io.name_with_pins]),
      validateAllInputs: self => this.validateAllInputs(self),
      errors: () => this.errorMessages
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      schedulerColumns: [
        { name: 'pin', label: this.$t('Pin') },
        { name: 'period', label: this.$t('Interval type') },
        { name: '_from', label: this.$t('From') },
        { name: '_to', label: this.$t('To') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formData: {},
      periodOptions: {
        week: this.$t('Weekdays'),
        month: this.$t('Month days')
      },
      ioData: [],
      ioJugglerActions: [],
      ioJugglerInputs: [],
      smsSections: [],
      callSections: [],
      errorMessages: {
        11: this.$t('Selected pin is set as "input" pin. You can change it to "output" in "Status" page'),
        12: this.$t('Only same interval type configurations can be enabled at once'),
        13: this.$t('Selected pin is used in SMS Utilities rules. You need to disable the rules in order to use the output scheduler'),
        14: this.$t('Selected pin is used in Call Utilities rules. You need to disable the rules in order to use the output scheduler'),
        15: this.$t('Selected pin is used in I/O Juggler actions. You need to disable the input which uses the action in order to use the output scheduler'),
        16: this.$t('Scheduler interval overlaps with already enabled interval of same output pin'),
        17: this.$t('Scheduler interval starting time is the same as the ending time')
      }
    }
  },
  computed: {
    filteredIoData() {
      return this.$io.getFilteredPinsInfo(this.ioData)
    }
  },
  methods: {
    /**
     * @description Function additionally load io data to uciData
     */
    afterLoad() {
      const requests = [
        '/api/io/status',
        {
          endpoint: '/api/io/juggler/operations/config',
          condition: 'vuci-app-io-juggler-api.control'
        },
        {
          endpoint: '/api/io/juggler/inputs/config',
          condition: 'vuci-app-io-juggler-api.control'
        },
        {
          endpoint: '/api/sms_utilities/rules/config',
          condition: 'vuci-app-mobile-utilities-ui.control'
        },
        {
          endpoint: '/api/call_utilities/rules/config',
          condition: this.$store.hasPackages('vuci-app-call-utilities-ui.control') && !this.$store.board.modems.some(modem => modem.modem_func_id === 1 || modem.modem_func_id === 3)
        }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([ioResponse, actionsResponse, inputResponse, smsResponse, callResponse]) => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          this.ioData = ioResponse.success && ioResponse.data ? ioResponse.data : []
          if (!ioResponse.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))

          this.ioJugglerActions = actionsResponse.success ? actionsResponse.data : []
          this.ioJugglerInputs = inputResponse.success ? inputResponse.data : []
          this.smsSections = smsResponse.success ? smsResponse.data : []
          this.callSections = callResponse.success ? callResponse.data : []
          if (!ioResponse.success) this.$message.error(this.$t('Failed to load I/O data'))
          if (!actionsResponse.success) this.$message.error(this.$t('Failed to load I/O juggler actions data'))
          if (!inputResponse.success) this.$message.error(this.$t('Failed to load I/O juggler inputs data'))
          if (!smsResponse.success) this.$message.error(this.$t('Failed to load sms utilities data'))
          if (!callResponse.success) this.$message.error(this.$t('Failed to load call utilities data'))
          this.schedulerInfoMessage()
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    /**
     * @description - Function beautifies value from API to WebUI acceptable format.
     * @param {string} value - Period value that comes from API
     * @return {string} - Function return formatted period value
     */
    displayPeriod(value) {
      return this.periodOptions[value] || this.$t('N/A')
    },
    /**
     * @description - Function beautifies value from API to WebUI acceptable format.
     * @param {string} value - Pin value that comes from API
     * @return {string} - Function return formatted pin value
     */
    displayPin(value) {
      const ioInfo = this.filteredIoData
      const pin = ioInfo.find(io => io.id === value)
      return pin ? pin.name_with_pins : this.$t('N/A')
    },
    /**
     * @description - Function beautifies value from API to WebUI acceptable format by calling parsing function depending on period type.
     * @param value - Period end value that comes from API
     * @return {string} - Function return calculated value from corresponding function
     */
    displayRange(value, self) {
      const returnDay = self.name === '_from' ? self.uciSection.start_day : self.uciSection.end_day
      const returnTime = self.name === '_from' ? self.uciSection.start_time : self.uciSection.end_time
      const period = self.uciSection.period
      if (period === 'week') {
        return this.$scheduler.convertWeekdayPeriodToText(returnDay, returnTime)
      } else {
        return this.$scheduler.convertMonthDaysPeriodToText(returnDay, returnTime, self.uciSection.force_last)
      }
    },
    /**
     * @description Function checks if selected instance pin is set to output
     * @param {object} section - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validatePinState(section) {
      const pin = section.pin
      const pinInfo = this.filteredIoData.find(io => io.id === pin)
      return pinInfo?.direction === 'in'
    },
    /**
     * @description Function checks if selected instance is set to same interval type as others.
     * @param {object} section - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validatePeriodType(section) {
      const period = section.period
      const enabledSchedulerSections = this.formData.scheduler.filter(section => section.enabled === '1')
      return !enabledSchedulerSections.every(section => section.period === period)
    },
    /**
     * @description Function checks if selected instance pin is not used in io juggler actions.
     * @param {object} section - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validateInputs(section) {
      const pin = section.pin
      const enabledInputData = this.ioJugglerInputs.filter(section => section.enabled === '1')
      const actionsData = this.ioJugglerActions
      return enabledInputData.some(input => {
        return actionsData.some(action => input.actions?.includes(action.ui_name) && action.dest === pin)
      })
    },
    /**
     * @description Function checks if selected instance interval doesn't overlap with another instance.
     * @param {object} main - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validateInterval(main) {
      const name = main.id
      const pin = main.pin
      const schedulerSections = this.formData.scheduler.filter(section => section.enabled === '1' && section.pin === pin && section.id !== name)
      return this.$scheduler.validateInterval(main, schedulerSections)
    },
    /**
     * @description Function checks if selected instance pin is not used sms utilities.
     * @param {object} section - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validateSmsRules({ pin }) {
      return this.smsSections.some(s => s.action === 'io_set' && s.enabled === '1' && s.io === pin)
    },
    /**
     * @description Function checks if selected instance pin is not used call utilities.
     * @param {object} section - Scheduler instance
     * @returns {boolean} - is rule invalid.
     */
    validateCallRules({ pin }) {
      return this.callSections.some(s => s.enabled === '1' && s.pin === pin)
    },
    returnErrorMessage(err) {
      const errorCode = err.payload[0].errors[0].code
      return this.errorMessages[errorCode] || this.$t('An unexpected error occurred')
    },
    /**
     * @description Function validate if instance can be enabled.
     * @param self
     */
    validateAllInputs(self) {
      const section = self.uciSection
      if (section.enabled === '0') return
      if (this.validatePinState(section)) {
        this.$message.error(this.errorMessages[11])
        section.enabled = '0'
        return
      }
      if (this.validatePeriodType(section)) {
        this.$message.error(this.errorMessages[12])
        section.enabled = '0'
        return
      }
      if (this.validateInputs(section)) {
        this.$message.error(this.errorMessages[15])
        section.enabled = '0'
        return
      }
      const intervalResponse = this.validateInterval(section)
      if (intervalResponse.invalid) {
        if (intervalResponse.error === 'overlap') this.$message.error(this.errorMessages[16])
        if (intervalResponse.error === 'startsameasend') this.$message.error(this.errorMessages[17])
        section.enabled = '0'
        return
      }
      if (this.validateSmsRules(section)) {
        this.$message.error(this.errorMessages[13])
        section.enabled = '0'
        return
      }
      if (this.validateCallRules(section)) {
        this.$message.error(this.errorMessages[14])
        section.enabled = '0'
      }
    },
    validateEnable(self) {
      const section = self.uciSection
      if (section.enabled !== '1') return
      const requiredEnableOptions = []
      if (!section.pin) {
        requiredEnableOptions.push(this.$t('Pin'))
      }
      if (!section.period) {
        requiredEnableOptions.push(this.$t('Interval type'))
      }
      if (!section.start_day) {
        requiredEnableOptions.push(this.$t('Start day'))
      }
      if (!section.start_time) {
        requiredEnableOptions.push(this.$t('Start time'))
      }
      if (!section.end_day) {
        requiredEnableOptions.push(this.$t('End day'))
      }
      if (!section.end_time) {
        requiredEnableOptions.push(this.$t('End time'))
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        section.enabled = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        section.enabled = '0'
      }
      this.validateAllInputs(self)
    },
    /**
     * @description Function prints scheduler information in webui side message.
     */
    schedulerInfoMessage() {
      this.$notification.info(this.$t('Scheduler instances will be active only when scheduler is enabled'))
    }
  }
}
</script>
