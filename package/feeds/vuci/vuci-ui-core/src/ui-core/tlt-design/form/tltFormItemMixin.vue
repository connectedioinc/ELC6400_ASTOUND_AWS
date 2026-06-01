<script>
import { KEY_ITEM_ID } from '@ui-core/tlt-design/form/core/_shared/constants'
import { noop } from '@ui-core/utils/props'

export default {
  inject: {
    bindComponent: {
      default: () => noop
    },
    unbindComponent: {
      default: () => noop
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
      [KEY_ITEM_ID]: this.prop
    }
  },
  props: {
    depend: {
      type: Boolean,
      default: true
    },
    prop: {
      type: String,
      required: true
    },
    width: {
      type: String,
      default: ''
    },
    labelWidth: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: null
    },
    maxlength: {
      type: String,
      default: null
    },
    rawhtml: {
      type: Boolean,
      default: false
    },
    required: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'change'],
  computed: {
    readOnly() {
      return this.readonly ?? this.$store.readOnlyPage
    },
    valid() {
      const component = this.$refs.template ?? this.$refs['form-model-item']
      const component2 = component?.$refs.formItem ?? component?.$refs['tlt-form-model-item']
      return !!component2?.valid
    }
  },
  mounted() {
    this.bindComponent(this)
    this.onInput()
    this._valueWatcher()
  },
  beforeUnmount() {
    this.unbindComponent(this)
  },
  methods: {
    template() {
      return this.$refs.template
    },
    validate() {
      return this.template().validate()
    },
    async submit() {
      const valid = await this.validate()

      this.onFormSubmit(this.name, valid)

      return valid
    },
    onInput() {
      this.$emit('update:modelValue', this.inputValue)
    },
    _valueWatcher() {
      this.$watch('modelValue', () => {
        this.inputValue = this.modelValue
        this.$emit('change', this.modelValue)
        this.onChange(this, this.modelValue)
      })
    }
  },
  render() {
    return ''
  }
}
</script>
