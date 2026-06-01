<template>
  <vuci-form-item-template
    v-show="showOption"
    ref="form-model-item"
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
    <tlt-button
      :id="`${configName}.${uciSection['.type']}.${sectionTarget}.${prop}`"
      v-bind="$props"
      @click="_buttonClick"
    >
      <slot>{{ text }}</slot>
    </tlt-button>
  </vuci-form-item-template>
</template>

<script>
import VuciFormItemMixin from './VuciFormItemMixin'
import VuciFormItemTemplate from './VuciFormItemTemplate.vue'
import { makeProps } from '@ui-core/utils/props'

export default {
  name: 'VuciFormItemButton',
  components: { VuciFormItemTemplate },
  mixins: [VuciFormItemMixin],
  props: makeProps({
    loading: [Boolean, false],
    iconLeft: [String],
    iconRight: [String],
    disabled: [Boolean],
    size: [String, 'md', ['sm', 'md', 'lg']],
    color: [String, 'primary', ['primary', 'secondary', 'tertiary', 'error']],
    type: [String, 'text', ['button', 'text', 'icon']],
    buttonType: [String, 'button'],
    readonly: [Boolean],
    text: [String, '']
  }),
  emits: ['click'],
  methods: {
    _save() {},
    _buttonClick() {
      this.$emit('click', this)
    }
  }
}
</script>
