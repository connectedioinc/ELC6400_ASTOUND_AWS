<template>
  <vuci-form
    v-slot="{ uciData }"
    config="iojuggler"
    :before-save="onBeforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="iojuggler_inputs"
      :name="section.id"
      :title="title"
      :endpoints="[{ endpoint: 'io/juggler/inputs/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Enable or disable I/O juggler for this pin.')"
        @change="self => validatePins(self)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="wait"
        :label="$t('Trigger interval')"
        :help="
          $t(
            'Specifies what is the shortest amount of seconds between triggers. Trigger interval and action\'s Execution delay values are summed up when calculating total interval between I/O triggers.'
          )
        "
        placeholder="0"
        rules="uinteger"
        maxlength="8"
        initial="1"
        :depend="input !== 'adc' && input !== 'acl' && input !== 'pwr'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="inside"
        :label="$t('Inside range')"
        :depend="input === 'adc' || input === 'acl' || input === 'pwr'"
        :help="$t('Specifies to react when voltage is within specified min max range, otherwise react when voltage is out of range.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="trigger"
        :label="$t('Trigger')"
        :help="$t('Specifies the reaction trigger.')"
        :options="triggerOptions"
        :depend="input !== 'adc' && input !== 'acl' && input !== 'pwr'"
        initial="rising"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min"
        :label="$t('Min voltage')"
        :help="$t('Specifies minimum voltage of the range.')"
        placeholder="0.0"
        :required="s.enabled === '1'"
        :rules="['range(0,24)', () => validateMinMax(s.min, s.max)]"
        :depend="input === 'adc' || input === 'pwr'"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max"
        :label="$t('Max voltage')"
        :help="$t('Specifies maximum voltage of the range.')"
        placeholder="12.5"
        :rules="['range(0,24)', () => validateMinMax(s.min, s.max)]"
        :required="s.enabled === '1'"
        :depend="input === 'adc' || input === 'pwr'"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="acl"
        :label="$t('ACL Property')"
        :help="$t('Select which property - ampere or percentage the condition listens to.')"
        :options="aclOptions"
        initial="current"
        :depend="input === 'acl'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min_curr"
        :label="$t('Min current')"
        :help="$t('Specifies minimum current of the range. Values between 4-20mA.')"
        placeholder="4.0"
        :depend="input === 'acl' && s.acl === 'current'"
        :required="s.enabled === '1'"
        :rules="['range(4,20)', () => validateMinMax(s.min_curr, s.max_curr)]"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max_curr"
        :label="$t('Max current')"
        :help="$t('Specifies maximum current of the range. Values between minimum-20mA.')"
        placeholder="12.5"
        :depend="input === 'acl' && s.acl === 'current'"
        :required="s.enabled === '1'"
        :rules="['range(4,20)', () => validateMinMax(s.min_curr, s.max_curr)]"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min_perc"
        :label="$t('Min percent')"
        :help="$t('Specifies minimum percent of the range.')"
        placeholder="0"
        :depend="input === 'acl' && s.acl === 'percent'"
        :required="s.enabled === '1'"
        :rules="['range(0,100)', () => validateMinMax(s.min_perc, s.max_perc)]"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max_perc"
        :label="$t('Max percent')"
        :help="$t('Specifies maximum percent of the range.')"
        placeholder="0"
        :rules="['range(0,100)', () => validateMinMax(s.min_perc, s.max_perc)]"
        :depend="input === 'acl' && s.acl === 'percent'"
        :required="s.enabled === '1'"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="actions"
        :label="$t('Add actions')"
        :help="$t('Specifies actions which will occur when the pin is triggered.')"
        :options="actionsOptions"
        :placeholder="actionsOptions.length > 0 ? $t('-- Please select --') : $t('No actions available')"
        multiple
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="conditions"
        :label="$t('Add conditions')"
        :help="$t('Specifies global conditions for this pin. Actions will trigger only if the conditions are met. Conditions are optional.')"
        :options="conditionsOptions"
        :placeholder="conditionsOptions.length > 0 ? $t('-- Please select --') : $t('No conditions available')"
        multiple
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import IoJugglerMixin from './IoJugglerMixin.vue'
export default {
  mixins: [IoJugglerMixin],
  inject: ['ioData', 'actionsData', 'conditionsData', 'validatePins'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      input: this.section.name?.substring(0, 3),
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ],
      triggerOptions: [
        ['rising', this.$t('Rising')],
        ['falling', this.$t('Falling')],
        ['both', this.$t('Both')]
      ]
    }
  },
  computed: {
    title() {
      const io = this.ioData().find(io => io.id === this.section.name)
      return io?.name_with_pins || this.$t('N/A')
    },
    actionsOptions() {
      return this.actionsData().map(action => [action.ui_name, action.ui_name])
    },
    conditionsOptions() {
      return this.conditionsData().map(condition => [condition.ui_name, condition.ui_name])
    }
  },
  methods: {
    /**
     * @description Function validates form
     * @param self
     */
    updateValidations(self) {
      self.vuciSection.validate()
    },
    /**
     * @description Function check if max current is bigger than min current
     * @return {{isValid: boolean, message: (*)}|{isValid: boolean}} Valid or not
     */
    validateMinMax(min, max) {
      if (parseFloat(min) >= parseFloat(max)) {
        return {
          isValid: false,
          message: this.$t('Max value should be higher than min value')
        }
      }
      return { isValid: true }
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        const isActionsValid = this.validateActions(this.actionsData(), this.section.actions)
        if (isActionsValid) {
          return reject(isActionsValid)
        }
        const isConditionsValid = this.validateConditions(this.conditionsData(), this.section.conditions)
        if (isConditionsValid) {
          return reject(isConditionsValid)
        }
        resolve(true)
      })
    }
  }
}
</script>
