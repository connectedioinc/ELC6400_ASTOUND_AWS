<template>
  <tlt-form-item-template
    ref="template"
    :label="label"
    :rawhtml="rawhtml"
    :help="help"
    :prop="prop"
    :depend="depend"
    :required="required"
  >
    <template
      v-if="$slots.help"
      #help
    >
      <slot name="help" />
    </template>
    <template
      v-if="$slots.hintBox"
      #hintBox
    >
      <slot name="hintBox" />
    </template>
    <template #label>
      <span class="break-normal">{{ label }}</span>
    </template>
    <tlt-check-box
      v-if="checkbox"
      v-model="inputValue"
      type="checkbox"
      :readonly="readOnly"
      @update:model-value="onInput"
    />
    <tlt-switch
      v-else
      v-model="inputValue"
      :readonly="readOnly"
      :true-value="trueValue"
      :false-value="falseValue"
      :show-text="showText"
      @update:model-value="onInput"
    />
  </tlt-form-item-template>
</template>

<script>
import tltFormItemMixin from './tltFormItemMixin'

export default {
  mixins: [tltFormItemMixin],
  inject: {
    inlineForm: {
      default: false
    }
  },
  props: {
    label: {
      type: String,
      default: ''
    },
    modelValue: {
      type: [Boolean, Number, String],
      default: false
    },
    checkbox: {
      type: Boolean,
      default: false
    },
    help: {
      type: String,
      default: ''
    },
    rawhtml: {
      type: Boolean,
      default: false
    },
    trueValue: {
      type: [Number, String, Boolean],
      default: true
    },
    falseValue: {
      type: [Number, String, Boolean],
      default: false
    },
    showText: {
      type: Boolean,
      default: true
    }
  },
  emits: ['change'],
  data() {
    return {
      inputValue: this.modelValue
    }
  },
  methods: {
    _valueWatcher() {
      this.$nextTick(() =>
        this.$watch('modelValue', () => {
          this.inputValue = this.modelValue
          this.$emit('change', this.modelValue)
        })
      )
    }
  }
}
</script>
