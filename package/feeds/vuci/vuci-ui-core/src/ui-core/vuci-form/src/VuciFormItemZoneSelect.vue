<template>
  <vuci-form-item-template
    v-if="showOption"
    v-bind="VuciFormItemTemplateProps"
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
      v-model="model"
      :placeholder="placeholder"
      :multiple="multiple"
      :zones="zones"
      :options="options"
      :allow-create="allowCreate"
    />
  </vuci-form-item-template>
</template>
<script>
/** @typedef {import('@/types/firewallTypes').Zone} Zone */
/** @typedef {import('@ui-core/tlt-design/form/core/TltZoneSelect.vue').ZoneOption} ZoneOption */
import VuciFormItemMixin from './VuciFormItemMixin.vue'

export default {
  name: 'VuciFormItemZoneSelect',
  mixins: [VuciFormItemMixin],
  props: {
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
  }
}
</script>
<style scoped>
@reference '@/theme.css';

.wrap-zones :deep(.zone-list) {
  @apply flex-wrap;
}
</style>
