<template>
  <tlt-form-model-item-api
    v-if="!noWrapper"
    ref="tlt-form-model-item"
    v-bind="$props"
  >
    <template
      v-if="$slots.help"
      #help
    >
      <slot name="help" />
    </template>
    <template
      v-if="$slots.hintBox"
      #controlHintBox
    >
      <slot name="hintBox" />
    </template>
    <template #label>
      <slot name="label">{{ label }}</slot>
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
    <slot />
  </tlt-form-model-item-api>
  <div v-else>
    <slot />
  </div>
</template>

<script>
import { makeProps } from '@ui-core/utils/props'
export default {
  name: 'VuciFormItemTemplate',
  props: makeProps({
    required: [Boolean, false],
    inlineInput: [Boolean, false],
    hasLabel: [Boolean, true],
    label: [String, ''],
    prop: [String, ''],
    help: [String, ''],
    rules: [[Array, Object], () => ({})],
    noWrapper: [Boolean, false],
    rawhtml: [Boolean, false],
    validationMessages: [Array, () => []],
    warningMessages: [Array, () => []],
    valid: [Boolean, true],
    warning: [Boolean, false],
    custom: [Boolean, false],
    headers: [Boolean, false]
  })
}
</script>
