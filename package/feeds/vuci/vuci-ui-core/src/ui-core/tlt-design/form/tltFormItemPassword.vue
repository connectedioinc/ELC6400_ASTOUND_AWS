<template>
  <tlt-form-item-template
    ref="template"
    :class="className"
    :style="style"
    v-bind="{ ...$props, ...validationRules }"
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
    <tlt-input-password
      ref="inputPassword"
      v-model="inputValue"
      v-bind="attrs"
      :readonly="readOnly"
      :placeholder="placeholder"
      :can-randomize="canRandomize"
      @update:model-value="onInput"
    />
  </tlt-form-item-template>
</template>

<script>
import tltFormItemMixin from './tltFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'

export default {
  mixins: [tltFormItemMixin, tltValidationMixin],
  provide() {
    return {
      useAutocomplete: this.useAutocomplete
    }
  },
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: ''
    },
    modelValue: {
      type: String,
      default: ''
    },
    help: {
      type: String,
      default: ''
    },
    prop: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    useAutocomplete: {
      type: Boolean,
      default: false
    },
    canRandomize: {
      type: [Boolean, Object],
      default: false
    }
  },
  data() {
    const { style, class: className, ...rest } = this.$attrs
    return {
      style,
      inputValue: this.modelValue,
      className,
      attrs: rest
    }
  },
  methods: {
    resetType() {
      this.$refs.inputPassword.resetType()
    }
  }
}
</script>
