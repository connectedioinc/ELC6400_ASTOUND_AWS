<template>
  <tlt-form-item-template
    ref="template"
    v-bind="{ ...$props, ...validationRules }"
    class="flex items-start"
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
    <tlt-zone-select
      :placeholder="placeholder"
      :multiple="multiple"
      :zones="zones"
      :options="options"
      :allow-create="allowCreate"
      :model-value="modelValue"
      @update:model-value="val => $emit('update:modelValue', val)"
    />
  </tlt-form-item-template>
</template>

<script>
import tltFormItemMixin from './tltFormItemMixin.vue'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin.vue'
/** @typedef {import('@/types/firewallTypes').Zone} Zone */
/** @typedef {import('@/types/tlt-design/form/core/TltZoneSelect.vue').ZoneOption} ZoneOption */

export default {
  mixins: [tltFormItemMixin, tltValidationMixin],
  props: {
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
    modelValue: {
      /** @type {import('vue').PropType<string | string[]>} */
      type: [String, Array],
      default: () => ''
    },
    options: {
      /** @type {import('vue').PropType<Array<[string, string] | string | ZoneOption>>} */
      type: Array,
      default: () => []
    },
    multiple: {
      type: Boolean,
      default: false
    },
    allowCreate: {
      type: Boolean,
      default: false
    },
    zones: {
      /** @type {import('vue').PropType<Zone[]>} */
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: undefined
    }
  },
  emits: ['update:modelValue']
}
</script>
