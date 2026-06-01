<template>
  <tlt-form-item-template
    ref="template"
    v-bind="{ ...$props, ...validationRules }"
    class="flex items-start!"
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
    <tlt-text-area
      v-model="inputValue"
      :rows="rows"
      :resize="resize"
      :readonly="readOnly"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :no-counter="noCounter"
      :copy-button="copyButton"
      @update:model-value="onInput"
    />
  </tlt-form-item-template>
</template>

<script>
import tltFormItemMixin from './tltFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'
export default {
  mixins: [tltFormItemMixin, tltValidationMixin],
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      default: ''
    },
    rows: {
      type: [String, Number],
      default: '6'
    },
    help: {
      type: String,
      default: ''
    },
    resize: {
      type: Boolean,
      default: true
    },
    copyButton: {
      type: Boolean,
      default: false
    },
    noCounter: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    rules: {
      type: [String, Function, Array],
      default: 'string'
    }
  },
  data() {
    return {
      inputValue: this.modelValue
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

:deep(.tlt-input-wrapper) {
  @apply w-max;
}
:deep(.tlt-input-field) {
  @apply min-w-full! lg:min-w-80! w-80;
}
:deep(.form-item-label) {
  margin-top: 0.375rem;
}
</style>
