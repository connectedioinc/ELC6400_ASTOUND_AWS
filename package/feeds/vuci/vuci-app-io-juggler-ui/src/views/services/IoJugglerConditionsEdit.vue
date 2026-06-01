<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="iojuggler"
    editing
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="iojugglerConditions"
      :name="section.id"
      :title="$utils.getModalTitle($t('conditions'), section.ui_name)"
      :endpoints="[{ endpoint: 'io/juggler/conditions/config' }]"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="ui_name"
        :label="$t('Name')"
        rules="uciname"
        maxlength="16"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="type"
        :label="$t('Condition type')"
        :help="$t('Type of the condition.')"
        :options="typeOptions()"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="name"
        :label="$t('Input')"
        :help="$t('Specifies the analog input to which the condition is listening to.')"
        :options="analogList()"
        :depend="s.type === 'analog'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="not"
        :label="$t('Condition')"
        :help="$t('Whether to evaluate the condition as true inside or outside the specified range.')"
        :options="conditionOptions"
        :depend="s.type === 'analog'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="not"
        :label="$t('Inverted function')"
        :help="$t('Inverts the selected condition type. Makes the condition true if the time/date is outside the specified interval.')"
        :depend="['minute', 'hour', 'weekday', 'yearday'].includes(s.type)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="month_override"
        :label="$t('Month override')"
        :help="$t('If the option is selected the condition uses the last day of the month if the specified day is not in the month.')"
        :depend="s.type === 'monthday'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="operation"
        :label="$t('Boolean type')"
        :help="`${$t('This boolean group will be evaluated true, if:')} <br>
           <strong>AND</strong> - ${$t('All added conditions evaluate true')} <br>
           <strong>NAND</strong> - ${$t('At least one condition evaluates false')} <br>
           <strong>OR</strong> - ${$t('At least one condition evaluates true')} <br>
           <strong>NOR</strong> - ${$t('None of the conditions evaluate true')} <br>`"
        :options="boolList"
        :depend="s.type === 'bool'"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        name="conditions"
        :label="$t('Add conditions')"
        :help="$t('Specifies global conditions for this pin. Actions will trigger only if the conditions are met. Conditions are optional.')"
        :options="conditions"
        :placeholder="conditions.length > 0 ? $t('-- Please select --') : $t('No conditions available')"
        :depend="s.type === 'bool'"
        :rules="[() => validateConditionsLength(s.conditions)]"
        multiple
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ui_timetype"
        :label="$t('Interval')"
        :help="$t('Switch between a specific value and a time interval.')"
        :depend="['minute', 'hour', 'weekday', 'monthday', 'yearday'].includes(s.type)"
      />
      <component
        v-bind="valueOption"
        :is="componentType"
        :uci-section="s"
        name="value"
        :depend="['minute', 'hour', 'weekday', 'monthday', 'yearday'].includes(s.type) && s.ui_timetype === '0'"
        required
      />
      <component
        v-bind="intervalOption1"
        :is="componentType"
        :uci-section="s"
        name="interval1"
        :depend="['minute', 'hour', 'weekday', 'monthday', 'yearday'].includes(s.type) && s.ui_timetype === '1'"
        required
      />
      <component
        v-bind="intervalOption2"
        :is="componentType"
        :uci-section="s"
        name="interval2"
        :depend="['minute', 'hour', 'weekday', 'monthday', 'yearday'].includes(s.type) && s.ui_timetype === '1'"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="name"
        :label="$t('I/O')"
        :help="$t('Specifies the I/O to which the condition is listening to.')"
        :options="ioList()"
        :depend="s.type === 'io'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="state"
        :label="$t('State')"
        :help="$t('Specifies in what state the pin has to be.')"
        :options="stateOptions"
        :depend="s.type === 'io'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min"
        :label="$t('Min voltage')"
        :help="$t('Specifies minimum voltage of the range.')"
        placeholder="0.0"
        :depend="s.type === 'analog' && !s.acl"
        required
        :rules="['range(0, 24)', () => validateMinMax(s.min, s.max)]"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max"
        :label="$t('Max voltage')"
        :help="$t('Specifies maximum voltage of the range.')"
        placeholder="12.5"
        :depend="s.type === 'analog' && !s.acl"
        required
        :rules="['range(0, 24)', () => validateMinMax(s.min, s.max)]"
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="acl"
        :label="$t('ACL Property')"
        :help="$t('Select which property - ampere or percentage the condition listens to.')"
        :options="aclOptions"
        :depend="hasAcl() && s.type === 'analog' && aclList().includes(s.name)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min_perc"
        :label="$t('Min percent')"
        :help="$t('Specifies minimum percent of the range.')"
        placeholder="0"
        :rules="['range(0,100)', () => validateMinMax(s.min_perc, s.max_perc)]"
        :depend="hasAcl() && s.type === 'analog' && s.acl === 'percent' && aclList().includes(s.name)"
        required
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max_perc"
        :label="$t('Max percent')"
        :help="$t('Specifies maximum percent of the range.')"
        placeholder="100"
        :rules="['range(0,100)', () => validateMinMax(s.min_perc, s.max_perc)]"
        :depend="hasAcl() && s.type === 'analog' && s.acl === 'percent' && aclList().includes(s.name)"
        required
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min_curr"
        :label="$t('Min current')"
        :help="$t('Specifies minimum current of the range. Values between 4-20mA.')"
        placeholder="4.0"
        :rules="['range(4,20)', () => validateMinMax(s.min_curr, s.max_curr)]"
        :depend="hasAcl() && s.type === 'analog' && s.acl === 'current' && aclList().includes(s.name)"
        required
        maxlength="16"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max_curr"
        :label="$t('Max current')"
        :help="$t('Specifies maximum current of the range. Values between 4-20mA.')"
        placeholder="12.5"
        :rules="['range(4,20)', () => validateMinMax(s.min_curr, s.max_curr)]"
        :depend="hasAcl() && s.type === 'analog' && s.acl === 'current' && aclList().includes(s.name)"
        required
        maxlength="16"
        @change="updateValidations"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import IoJugglerMixin from './IoJugglerMixin.vue'
export default {
  mixins: [IoJugglerMixin],
  inject: ['typeOptions', 'hasAcl', 'aclList', 'analogList', 'ioList'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      dayList: [
        ['1', this.$t('Monday')],
        ['2', this.$t('Tuesday')],
        ['3', this.$t('Wednesday')],
        ['4', this.$t('Thursday')],
        ['5', this.$t('Friday')],
        ['6', this.$t('Saturday')],
        ['0', this.$t('Sunday')]
      ],
      boolList: [
        ['and', this.$t('AND')],
        ['nand', this.$t('NAND')],
        ['or', this.$t('OR')],
        ['nor', this.$t('NOR')]
      ],
      conditionOptions: [
        ['0', this.$t('Inside range')],
        ['1', this.$t('Outside range')]
      ],
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ]
    }
  },
  computed: {
    componentType() {
      if (!this.section.type) return
      return this.section.type !== 'weekday' ? 'vuci-form-item-input' : 'vuci-form-item-select'
    },
    conditions() {
      const conditions = this.formData.iojugglerConditions
      if (!conditions) return []
      const filteredConditions = conditions.filter(condition => condition.ui_name !== this.section.ui_name)
      return filteredConditions.map(condition => [condition.ui_name, condition.ui_name])
    },
    intervalOption1() {
      const intervalOption1 = {
        minute: {
          label: this.$t('Start minute'),
          help: this.$t('Start of the interval in minutes (0-59).'),
          placeholder: '12',
          rules: 'irange(0,59)'
        },
        hour: {
          label: this.$t('Start hour'),
          help: this.$t('Start of the interval in hours:minutes (00:00 - 23:59).'),
          placeholder: '12:20',
          rules: 'time'
        },
        weekday: {
          label: this.$t('Start weekday'),
          help: this.$t('Start of the interval in days of the week.'),
          options: this.dayList
        },
        monthday: {
          label: this.$t('Start day of the month'),
          help: this.$t('Start of the interval in days of the month (1-31).'),
          placeholder: '20',
          rules: 'irange(1,31)'
        },
        yearday: {
          label: this.$t('Start day of the year'),
          help: this.$t('Start of the interval in days of the year (1-366).'),
          placeholder: '200',
          rules: 'irange(1,366)'
        }
      }
      return intervalOption1[this.section.type]
    },
    intervalOption2() {
      const intervalOption2 = {
        minute: {
          label: this.$t('End minute'),
          help: this.$t('End of the interval in minutes (0-59).'),
          placeholder: '25',
          rules: 'irange(0,59)'
        },
        hour: {
          label: this.$t('End hour'),
          help: this.$t('End of the interval in hours:minutes (00:00 - 23:59).'),
          placeholder: '14:30',
          rules: 'time'
        },
        weekday: {
          label: this.$t('End weekday'),
          help: this.$t('End of the interval in days of the week.'),
          options: this.dayList
        },
        monthday: {
          label: this.$t('End day of the month'),
          help: this.$t('End of the interval in days of the month (1-31).'),
          placeholder: '30',
          rules: 'irange(1,31)'
        },
        yearday: {
          label: this.$t('End day of the year'),
          help: this.$t('End of the interval in days of the year (1-366).'),
          placeholder: '300',
          rules: 'irange(1,366)'
        }
      }
      return intervalOption2[this.section.type]
    },
    stateOptions() {
      const statesForRelay = [
        ['1', this.$t('Closed')],
        ['0', this.$t('Open')]
      ]
      const states = [
        ['1', this.$t('High')],
        ['0', this.$t('Low')]
      ]
      return this.section?.name?.startsWith('relay') ? statesForRelay : states
    },
    valueOption() {
      const valueOptions = {
        minute: {
          label: this.$t('Minute'),
          help: this.$t('Specific minute (0-59).'),
          placeholder: '10',
          rules: 'irange(0,59)'
        },
        hour: {
          label: this.$t('Hour'),
          help: this.$t('Specific hour (0-23).'),
          placeholder: '12',
          rules: 'irange(0,23)'
        },
        weekday: {
          label: this.$t('Weekday'),
          help: this.$t('Specific day of the week.'),
          options: this.dayList
        },
        monthday: {
          label: this.$t('Day of the month'),
          help: this.$t('Specific day of the month (1-31).'),
          placeholder: '20',
          rules: 'irange(1,31)'
        },
        yearday: {
          label: this.$t('Day of the year'),
          help: this.$t('Specific day of the year (1-366).'),
          placeholder: '200',
          rules: 'irange(1,366)'
        }
      }
      return valueOptions[this.section.type]
    }
  },
  methods: {
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
    validateConditionsLength(conditions) {
      if (conditions.length < 2) {
        return {
          isValid: false,
          message: this.$t('Required at least two conditions')
        }
      }
      return { isValid: true }
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        if (this.section.type === 'bool' && this.section.conditions.length > 1) {
          const messageFromConditionsValidation = this.validateConditions(this.formData.iojugglerConditions, this.section.conditions)
          if (messageFromConditionsValidation) {
            return reject(messageFromConditionsValidation)
          }
        }
        resolve(true)
      })
    }
  }
}
</script>
