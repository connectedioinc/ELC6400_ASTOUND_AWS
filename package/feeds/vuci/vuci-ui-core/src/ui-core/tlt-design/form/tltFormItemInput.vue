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
    <component
      :is="is"
      v-model="inputValue"
      v-bind="attrs"
      :name="name"
      :placeholder="placeholder"
      :readonly="readOnly"
      :width="width"
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
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    rawhtml: {
      type: Boolean,
      default: false
    },
    help: {
      type: String,
      default: ''
    },
    useAutocomplete: {
      type: Boolean,
      default: false
    },
    password: {
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
  computed: {
    is() {
      if (this.password) return 'tlt-input-password'
      return 'tlt-input'
    }
  }
}
</script>
