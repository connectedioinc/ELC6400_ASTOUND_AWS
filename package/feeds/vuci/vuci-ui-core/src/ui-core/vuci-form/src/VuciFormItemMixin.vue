<script>
import { makeProps, noop } from '@ui-core/utils/props'
import { isArray, isBoolean, isEmpty, isFunction, isObject } from '@ui-core/utils/inspect'
import VuciFormItemTemplate from './VuciFormItemTemplate.vue'
import tltDependMixin from '@ui-core/tlt-design/form/core/tltDependMixin.vue'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'
import { copy } from '@ui-core/utils/vue-helpers'
import { KEY_ITEM_ID, KEY_ELEMENT_ID } from '@ui-core/tlt-design/form/core/_shared/constants'

const encoder = new TextEncoder()
export default {
  components: {
    VuciFormItemTemplate
  },
  mixins: [tltDependMixin, tltValidationMixin],
  inject: {
    vuciSection: {},
    vuciForm: {},
    configName: {},
    noValidate: {
      default: () => () => false
    },
    onChange: {
      default: () => noop
    },
    onFormSubmit: {
      default: () => noop
    },
    tab: {
      default: () => ({})
    }
  },
  provide() {
    return {
      [KEY_ITEM_ID]: `${this.configName}.${this.uciSection['.type']}.${this.sectionTarget}.${this.prop}`,
      [KEY_ELEMENT_ID]: this.name,
      sid: this.sectionTarget,
      uciSection: this.uciSection
    }
  },
  props: makeProps({
    warnings: [[Array, Function], null],
    uciSection: [Object, null, true],
    name: [String, null, true],
    hasLabel: [Boolean, true],
    label: [String, ''],
    required: [Boolean, false],
    /* If load from uci fails, the value of the property is used as the form value. */
    initial: [[String, Number, Array], ''],
    /*
     ** If a function provided, the form loads the value by the function instead of from uci.
     ** Parameters: sid, self
     ** Return:  Promise object or value
     **
     ** If other type provided, the form loads the value from the prop's value.
     */
    load: [[String, Boolean, Number, Array, Function], null],
    /*
     ** If this function is provided, it will be called when vuci saves the uci configuration.
     ** Parameters: self
     ** Return:  Promise object or undefined
     */
    save: [[Function, String], null],
    /*
     ** If this function is provided, it will be called when vuci applies the uci configuration.
     ** Parameters: self
     ** Return:  Promise object or undefined
     */
    apply: [Function, () => {}],
    help: [String, ''],
    forceWrite: [Boolean, false],
    rawhtml: [Boolean, false],
    readonly: [Boolean, false],
    noWrite: [Boolean, false],
    rmempty: [Boolean, true],
    /**
     * Shows hints for the form item control element.
     * Can be used to inform user about disabled state or other useful information.
     */
    hints: [[String, Object, Array], null]
  }),
  emits: ['change'],
  data() {
    return {
      initialValue: this.initial,
      valid: true,
      warningMessages: [],
      validationMessages: [],
      tempValue: '',
      changed: false,
      preventMessages: false
    }
  },
  computed: {
    sectionTarget() {
      return this.uciSection[this.vuciSection.sectionId]
    },
    isEdit() {
      return this.vuciForm.editing
    },
    VuciFormItemTemplateProps() {
      return {
        label: this.label,
        prop: this.prop,
        help: this.help,
        rawhtml: this.rawhtml,
        validationMessages: this.preventMessages ? [] : this.validationMessages,
        warningMessages: this.preventMessages ? [] : this.warningMessages,
        valid: this.valid,
        warning: this.warningMessages.length > 0,
        hasLabel: this.hasLabel,
        hints: this.hints
      }
    },
    readOnly() {
      return this.$store.readOnlyPage || this.readonly
    },
    prop() {
      return `${this.isEdit ? 'edit.' : ''}${this.sectionTarget}_${this.name}`
    },
    model: {
      set(value) {
        this.uciSection[this.name] = value
      },
      get() {
        return this.convertUciValue(this.uciSection?.[this.name] || '')
      }
    },
    showOption() {
      return this.visible
    },
    availableModel() {
      return !this.model
    },
    lengthMessages() {
      return Array.isArray(this.model)
        ? {
            max: this.$t('Maximum length of single value is %s.'),
            min: this.$t('Minimum length of single value is %s.'),
            eq: this.$t('Length of single value entry must be %s.')
          }
        : {
            max: this.$t('Maximum length of value is %s.'),
            min: this.$t('Minimum length of value is %s.'),
            eq: this.$t('Length of the value must be %s.')
          }
    }
  },
  watch: {
    rules() {
      this.changed && this.validate()
    },
    showOption(value) {
      if (!value) {
        this.tempValue = this.isEmpty(this.model) ? this.convertUciValue(this.initialValue) : this.model
        if (this.rmempty) this.model = ''
      } else {
        this.$nextTick(() => {
          if (this.availableModel) {
            this.model = this.isEmpty(this.tempValue) ? this.convertUciValue(this.initialValue) : this.tempValue
          }
          this.registerInput()
        })
      }
    }
  },
  created() {
    // initializing item default sequence in a method to enable overriding
    this.initializeItem()
    this.setInitialValue(this.model)
    this.$watch(
      () => this.model,
      (newVal, oldVal) => {
        this.checkWarnings()
        this.modelWatcher(newVal, oldVal)
      },
      {
        deep: isObject(this.model)
      }
    )
    this.checkWarnings()
  },
  unmounted() {
    this.unregisterInput()
  },
  methods: {
    setInitialValue(value) {
      this.tempValue = this.isEmpty(value) ? this.convertUciValue(this.initial) : copy(value)
      if (this.visible) this.model = copy(this.tempValue)
      this.initialValue = copy(value)
    },
    checkWarnings() {
      if (!this.warnings) return
      if (isArray(this.warnings)) {
        this.warningMessages = this.warnings.map(warnCb => warnCb(this.model, this)).filter(Boolean)
      } else {
        const warns = this.warnings(this.model, this)
        this.warningMessages = (isArray(warns) ? warns : [warns]).filter(Boolean)
      }
    },
    modelWatcher(newVal, oldVal) {
      // serialized data has to be checked because two same arrays/objects won't always be equal,
      // because their address might differ in memory.
      this.changed = this.changed || (isObject(newVal) ? JSON.stringify(this.model) !== JSON.stringify(this.initialValue) : this.initialValue !== this.model)
      this.emitChange(newVal, oldVal)
    },
    emitChange(newVal, oldVal) {
      this.$nextTick(() => {
        if (this.changed) {
          this.$emit('change', this, newVal, oldVal)
          // Prevent onChange trigger after showing the input via depend
          if (this.showOption && this.tempValue !== this.model) this.onChange(this.name)
        }
        if (this.noValidate()) return
        this.validate()
      })
    },
    initializeItem() {
      if (!this.visible) return
      if (isEmpty(this.model)) {
        this.model = this.initial
      }
      this.registerInput()
    },
    registerInput() {
      this.vuciSection.registerInput(this.sectionTarget, this)
    },
    unregisterInput() {
      this.vuciSection.unregisterInput(this.sectionTarget, this)
    },
    convertUciValue(value) {
      return value
    },
    reset() {
      this.model = this.initialValue
    },
    _save(data) {
      // using uciSection[this.name] instead of this.model to get the value
      // in cases where item get's destroyed and his computed getter/setter just caches the value (even if it was changed)
      const modelValue = this.$.isUnmounted ? this.convertUciValue(this.uciSection?.[this.name] || '') : this.model
      let savedValue = modelValue
      if (typeof this.save === 'function') {
        savedValue = this.save(this, data)
      } else if (this.save) {
        savedValue = this.save
      }
      this.setInitialValue(modelValue)
      return savedValue
    },
    _validateLength(input) {
      const format = (valid, message) => ({ valid, ...(message ? { messages: [message] } : {}) })
      let {
        maxlength,
        minlength,
        lengthMessages: { eq, max, min }
      } = this
      const inputLength = encoder.encode(input).length
      maxlength = parseInt(maxlength)
      minlength = parseInt(minlength) ?? -1
      if (isNaN(maxlength)) return format(true)
      if (maxlength === minlength && inputLength !== maxlength) {
        return format(false, eq.format(maxlength))
      } else if (maxlength && maxlength < inputLength) {
        return format(false, max.format(maxlength))
      } else if (minlength && minlength > inputLength) {
        return format(false, min.format(minlength))
      }
      return format(true)
    },
    // to be overriden in components that uses this mixin.
    extraValidation() {
      return { valid: true }
    },
    async validate(value = this.model) {
      const assignToState = (valid, messages = []) => {
        this.valid = valid
        this.validationMessages = messages
        return valid
      }
      if (!this.visible || (this.uciSection[`${this.name}:set`] === '1' && !this.changed)) return assignToState(true)
      const isEmptyValue = isEmpty(value)
      let messages = []
      if (this.required && isEmptyValue) return assignToState(false, [this.$t('A non-empty value is required.')])
      if (isEmptyValue) return assignToState(true)
      if (value.length > 0) {
        const values = isArray(value) ? value : [value]
        values.find(v => {
          const result = this._validateLength(v)
          if (!result.valid) messages.push(result.messages[0])
          return !result.valid
        })
      }
      if (this.rules && (!isEmptyValue || isBoolean(value))) {
        const [rulesArray, validationRules] = [this.convertedRules.flat(), []]
        while (rulesArray.length > 0) {
          const validator = rulesArray.pop()
          if (isFunction(validator)) validationRules.push(validator(value))
        }
        const invalidRules = validationRules.filter(r => !r.isValid).map(r => r.message)
        if (invalidRules.length > 0) {
          messages = messages.concat(this.validatorHint ? [this.validatorHint] : invalidRules)
        }
      }
      const { valid, message = null } = this.extraValidation()
      if (!valid) messages = messages.concat(isArray(message) ? message : [message])
      return assignToState(messages.length === 0, messages)
    },
    async submit() {
      const valid = await this.validate()

      this.onFormSubmit(this.name, valid)

      return valid
    },
    isEmpty(value) {
      return isEmpty(value) || (isArray(value) && value.every(isEmpty))
    }
  }
}
</script>
