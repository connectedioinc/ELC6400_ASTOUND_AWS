<template>
  <vuci-form-item-template
    v-show="showOption"
    v-bind="{ ...VuciFormItemTemplateProps, ...validationRules }"
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
    <template
      v-if="$slots['after-content']"
      #after-content="props"
    >
      <slot
        name="after-content"
        v-bind="props"
      />
    </template>
    <tlt-radio-group
      v-model="model"
      :name="name"
      :options="options"
    >
      <template #after="slotProps">
        <slot
          name="after"
          v-bind="slotProps"
        />
      </template>
    </tlt-radio-group>
  </vuci-form-item-template>
</template>

<script>
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin.vue'
import TltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin.vue'

export default {
  mixins: [VuciFormItemMixin, TltValidationMixin],
  props: makeProps({
    options: [[Array, Function], () => []]
  })
}
</script>
