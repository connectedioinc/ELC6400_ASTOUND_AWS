<template>
  <vuci-form-item-template
    v-if="showOption"
    ref="form-model-item"
    v-bind="{ ...VuciFormItemTemplateProps, ...validationRules }"
    inline-input
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
    <template #label>
      <span class="break-normal">{{ label }}</span>
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
    <component
      :is="isComponent"
      v-model="inputValue"
      v-bind="VuciFormItemSwitchProps"
    />
  </vuci-form-item-template>
</template>

<script>
import { isEmpty } from '@ui-core/utils/inspect'
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'

export default {
  name: 'VuciFormItemSwitch',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  props: makeProps({
    initial: [[Boolean, String], '0'],
    trueValue: [[String, Boolean, Number], '1'],
    falseValue: [[String, Boolean, Number], '0'],
    rules: [[String, Function, Array], 'string'], // override 'uciname' to prevent errors
    forceWrite: [Boolean, false],
    checkbox: [Boolean, false],
    radio: [Boolean, false],
    showText: [Boolean, true]
  }),
  computed: {
    isComponent() {
      return this.radio || this.checkbox ? 'tlt-check-box' : 'tlt-switch'
    },
    isType() {
      return this.radio || this.checkbox ? (this.radio ? 'radio' : 'checkbox') : ''
    },
    VuciFormItemSwitchProps() {
      return {
        readonly: this.readOnly,
        type: this.isType,
        showText: this.showText,
        name: this.name
      }
    },
    inputValue: {
      set(value) {
        if (this.isType === 'radio') this.vuciSection.dataSource?.forEach(data => (data[this.name] = this.falseValue))
        this.model = value ? this.trueValue : this.falseValue
      },
      get() {
        return this.model === this.trueValue
      }
    },
    availableModel() {
      return this.model !== this.tempValue
    }
  },
  methods: {
    initializeItem() {
      if (!this.visible) return
      if (isEmpty(this.model)) this.model = this.initial
      this.registerInput()
      if (this.uciSection) this.uciSection[this.name] = this.model
    }
  }
}
</script>
