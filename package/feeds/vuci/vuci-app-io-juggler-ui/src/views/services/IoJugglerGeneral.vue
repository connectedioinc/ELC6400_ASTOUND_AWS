<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="afterLoad"
    config="event_juggler"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="io_juggler"
      :title="$t('General')"
      :endpoints="[{ endpoint: 'io/juggler/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/Disable the I/O juggler.')"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      data-key="iojuggler_inputs"
      type="input"
      :title="$t('Input')"
      :help="$t('Here you can configure output changing for custom time intervals.')"
      :columns="inputColumns"
      :table-actions="['column-list', 'search']"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'io/juggler/inputs/config', sectionFilter: section => section }]"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
          :display-value="displayPin"
        />
      </template>
      <template #trigger="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="trigger"
          :display-value="displayTrigger"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.name"
          prop="name"
          :label="$t('Role')"
          :options="inputOptions"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './IoJugglerGeneralEdit'

export default {
  provide() {
    return {
      ioData: () => this.$io.getFilteredPinsInfo(this.ioData),
      actionsData: () => this.actions,
      conditionsData: () => this.conditions,
      validatePins: self => this.validatePins(self)
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      inputColumns: [{ name: 'name', label: this.$t('I/O') }, { name: 'trigger', label: this.$t('Pin Trigger') }, { name: 'enabled' }],
      ioData: [],
      conditions: [],
      actions: [],
      schedulerData: []
    }
  },
  computed: {
    inputOptions() {
      const ioInfoFiltered = this.$io.getFilteredPinsInfo(this.ioData)
      return ioInfoFiltered
        .filter(io => (io.type === 'gpio' && (io.direction !== 'out' || (io.direction === 'out' && io.bi_dir === '1'))) || io.type === 'dwi' || io.type === 'acl' || io.type === 'adc')
        .map(io => [io.id, io.name_with_pins])
    }
  },
  mounted() {
    this.$alert.warning({
      id: 'io_juggler_deprecation',
      title: this.$t('Feature deprecation notice'),
      text: this.$t("'I/O Juggler' page is deprecated and will be removed in future firmware updates. Please visit 'Event Juggler' page to configure it and explore additional options."),
      action: {
        text: this.$t('Go to Event Juggler'),
        to: '/services/event_juggler'
      }
    })
  },
  methods: {
    jugglerInfoMessage(ioData) {
      const ioInfoFiltered = this.$io.getFilteredPinsInfo(ioData)
      const biDir = ioInfoFiltered.some(io => io.bi_dir === '1')
      if (biDir) {
        this.$notification.info(this.$t('Configurable Input/Output rules will only work when pin is set to input mode'))
      }
    },
    afterLoad() {
      const requests = [
        '/api/io/status',
        '/api/io/juggler/conditions/config',
        '/api/io/juggler/operations/config',
        { endpoint: '/api/io/scheduler/config', condition: 'vuci-app-io-scheduler-api.control' }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([ioInfo, conditionsRes, actionsRes, scheduler]) => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          this.ioData = ioInfo.success && ioInfo.data ? ioInfo.data : []
          if (!ioInfo.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))

          this.conditions = conditionsRes.success ? conditionsRes.data : []
          this.actions = actionsRes.success ? actionsRes.data : []
          this.schedulerData = scheduler.success ? scheduler.data : []
          if (!ioInfo.success) this.$message.error(this.$t('Failed to load I/O data'))
          if (!conditionsRes.success) this.$message.error(this.$t('Failed to load I/O juggler conditions data'))
          if (!actionsRes.success) this.$message.error(this.$t('Failed to load I/O juggler actions data'))
          if (!scheduler.success) this.$message.error(this.$t('Failed to load I/O scheduler data'))
          if (ioInfo.success) this.jugglerInfoMessage(this.ioData)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    validatePins(self) {
      const data = self.uciSection
      if (self.model === '0' || data.enabled !== '1') return
      const actions = data.actions || []
      const usedActions = this.actions.filter(section => actions.includes(section.id))
      const usedActionsPins = usedActions.map(section => section.dest)
      const usedInScheduler = this.schedulerData.some(section => section.enabled === '1' && usedActionsPins.includes(section.pin))
      if (usedInScheduler) {
        this.$message.error(this.$t("Some input instance's selected action contains output pin that is used by the output scheduler"))
        self.model = '0'
      }
    },
    /**
     * @description Function validate if instance can be enabled.
     * @param self
     */
    validateEnable(self) {
      this.validatePins(self)
      const data = self.uciSection
      if (self.model === '0' || data.enabled !== '1') return
      const actions = data.actions || []
      const requiredEnableOptions = []
      if (actions.length === 0) {
        requiredEnableOptions.push(this.$t('Actions'))
      }
      if (data.name && data.name.match('acl')) {
        if (!data.acl) {
          requiredEnableOptions.push(this.$t('ACL Property'))
        }
        if (data.acl === 'current' && !data.min_curr) {
          requiredEnableOptions.push(this.$t('Min current'))
        }
        if (data.acl === 'current' && !data.max_curr) {
          requiredEnableOptions.push(this.$t('Max current'))
        }
        if (data.acl === 'percent' && !data.min_perc) {
          requiredEnableOptions.push(this.$t('Min percent'))
        }
        if (data.acl === 'percent' && !data.max_perc) {
          requiredEnableOptions.push(this.$t('Max percent'))
        }
      }
      if (data.name && (data.name.match('adc') || data.name.match('pwr'))) {
        if (!data.min) {
          requiredEnableOptions.push(this.$t('Min voltage'))
        }
        if (!data.max) {
          requiredEnableOptions.push(this.$t('Max voltage'))
        }
      }
      if (data.name && (data.name.match('din') || data.name.match('iio')) && !data.trigger) {
        requiredEnableOptions.push(this.$t('Trigger'))
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    },
    /**
     * @description - Function beautifies value from API to WebUI acceptable format.
     * @param {string} value - Pin value that comes from API
     * @return {string} - Function return formatted pin value
     */
    displayPin(value) {
      const ioInfo = this.$io.getFilteredPinsInfo(this.ioData)
      const pin = ioInfo.find(io => io.id === value)
      return pin ? pin.name_with_pins : this.$t('N/A')
    },
    /**
     * @description - Function beautifies value from API to WebUI acceptable format.
     * @param {string} value - Pin value that comes from API
     * @param self
     * @return {string} - Function return formatted trigger value
     */
    displayTrigger(_, self) {
      const { trigger, inside, acl, min_curr: minCurr, max_curr: maxCurr, min_perc: minPerc, max_perc: maxPerc, min, max } = self.uciSection
      if (trigger) return trigger.charAt(0).toUpperCase() + trigger.slice(1)
      const pinTriggerText = inside === '1' ? this.$t('Inside %s%s - %s%s range') : this.$t('Outside %s%s - %s%s range')
      if (acl) {
        const isCurrent = acl === 'current'
        const symbol = isCurrent ? 'mA' : '%'
        const minVal = isCurrent ? minCurr : minPerc
        const maxVal = isCurrent ? maxCurr : maxPerc
        return pinTriggerText.format(minVal, symbol, maxVal, symbol)
      }
      if (!min || !max) return '-'
      return pinTriggerText.format(min, 'V', max, 'V')
    }
  }
}
</script>
