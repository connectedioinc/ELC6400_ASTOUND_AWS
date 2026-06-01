<script>
export default {
  props: {
    rules: {
      type: [String, Function, Array],
      default: 'defaulttype'
    },
    required: {
      type: Boolean,
      default: false
    },
    maxlength: {
      type: String,
      default: '4096'
    },
    minlength: {
      type: String,
      default: null
    },
    validatorHint: {
      type: String,
      default: ''
    }
  },
  computed: {
    convertedRules() {
      let rules = this.rules
      let convRules = []
      if (typeof rules === 'function' && rules.name.includes('rules') && rules.length === 1) {
        this.setValidatorValue('model' in this ? this.model : this.modelValue)
        rules = rules(this.$VuciValidator)
        if (Array.isArray(rules)) {
          convRules = rules.map(rule => this.getRule(rule, true))
        } else {
          convRules.push(this.getRule(rules, true))
        }
        return convRules
      }
      if (!Array.isArray(rules)) {
        rules = [rules]
      }
      for (const r of rules) {
        convRules.push(this.getRule(r))
      }
      return convRules.filter(Boolean)
    },
    validationRules() {
      return {
        rules: this.convertedRules,
        maxlength: this.maxlength,
        minlength: this.minlength,
        required: this.required
      }
    }
  },
  methods: {
    setValid(valid) {
      const component = this.$refs.template ?? this.$refs['form-model-item']
      const component2 = component?.$refs.formItem ?? component?.$refs['tlt-form-model-item']
      if (component2) component2.valid = valid ?? true
    },

    setValidatorValue(value) {
      this.$VuciValidator.value = value
    },

    getRule(rule, multiple) {
      if (typeof rule === 'string') {
        return this.$VuciValidator.compile(rule)
      } else if (typeof rule === 'function') {
        return value => {
          if (value == null || value === '') return false
          if (!multiple) return rule(value, this)
          this.setValidatorValue(value)
          if (rule.name.startsWith('bound ')) {
            return rule(value, this)
          }
          return rule.apply(this.$VuciValidator)
        }
      } else {
        return () => ({
          isValid: true
        })
      }
    }
  }
}
</script>
