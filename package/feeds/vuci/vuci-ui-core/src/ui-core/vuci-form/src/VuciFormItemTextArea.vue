<template>
  <vuci-form-item-template
    v-if="showOption"
    ref="form-model-item"
    v-bind="{ ...VuciFormItemTemplateProps, ...validationRules }"
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
    <template
      v-if="$slots['after-content']"
      #after-content="props"
    >
      <slot
        name="after-content"
        v-bind="props"
      />
    </template>
    <tlt-text-area
      v-model="model"
      :class="{ fullwidth: fullWidth }"
      :rows="rows"
      :readonly="readonly"
      :placeholder="placeholder"
      :parameters="parameters"
      :maxlength="maxlength"
      :style="{ width: fullWidth ? '100%' : '' }"
    />
    <div
      v-if="parameters?.length > 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-y-0.5 gap-x-4 mt-2"
    >
      <strong
        v-for="(line, i) in parameters"
        :key="i"
      >
        {{ line }}
      </strong>
    </div>
  </vuci-form-item-template>
</template>
<script>
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'
export default {
  name: 'VuciFormItemTextArea',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  props: makeProps({
    rows: [String, '6'],
    parameters: [Array, () => []],
    readonly: [Boolean, false],
    placeholder: [String, ''],
    resize: [Boolean, true],
    rules: [[String, Function, Array], 'string'],
    maxlength: [String, null],
    fullWidth: [Boolean, false]
  })
}
</script>

<style scoped>
@reference '@/theme.css';

:deep(.fullwidth) {
  @apply !w-full;
}
:deep(.form-item-label) {
  margin-top: 0.375rem;
}
</style>
