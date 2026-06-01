<template>
  <tlt-form-item-template
    ref="template"
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
    <tlt-radio-group
      v-model="inputValue"
      :name="prop"
      :readonly="readOnly"
      :options="options"
      @update:model-value="onInput"
    >
      <template #after="slotProps">
        <slot
          name="after"
          v-bind="slotProps"
        />
      </template>
    </tlt-radio-group>
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
    options: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      inputValue: this.modelValue
    }
  }
}
</script>
