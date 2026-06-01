<template>
  <vuci-form-item-template
    v-if="showOption"
    class="min-w-0"
    v-bind="VuciFormItemTemplateProps"
    :inline-input="true"
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
    <tlt-dummy-value
      :value="displayText"
      :rawhtml="rawhtml"
    />
  </vuci-form-item-template>
</template>

<script>
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin.vue'

export default {
  name: 'VuciFormItemDummy',
  mixins: [VuciFormItemMixin],
  props: makeProps({
    noWrite: [Boolean, true],
    displayValue: [Function, v => v]
  }),
  computed: {
    displayText() {
      return this.displayValue(this.model, this)
    }
  },
  methods: {
    validate() {
      return Promise.resolve(true)
    }
  }
}
</script>
