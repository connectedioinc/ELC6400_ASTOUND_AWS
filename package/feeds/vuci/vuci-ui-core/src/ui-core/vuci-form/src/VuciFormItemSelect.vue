<template>
  <vuci-form-item-template
    v-if="showOption"
    ref="form-model-item"
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
    <tlt-multi-select
      v-if="multiple"
      v-model="model"
      class="x-input-wrapper"
      :allow-create="allowCreate ? convertedRules : false"
      :data-source="convertedDataSource"
      :disabled-options="convertedDisabled"
      :readonly="readOnly"
      :placeholder="placeholder"
      :max-selectable="maxSelectable"
      :has-select-all="hasSelectAll"
      :disable-teleport="disableTeleport"
      @open="preventMessages = true"
      @close="preventMessages = false"
    >
      <template #tag="{ tag }">
        <slot
          name="tag"
          :tag="tag"
        />
      </template>
      <template #option="{ option }">
        <slot
          name="option"
          :option="option"
        />
      </template>
    </tlt-multi-select>
    <tlt-select
      v-else
      v-model="model"
      class="x-input-wrapper"
      :allow-create="allowCreate ? convertedRules : false"
      :data-source="convertedDataSource"
      :disabled-options="convertedDisabled"
      :readonly="readOnly"
      :placeholder="placeholder"
      :width="width"
      :disable-teleport="disableTeleport"
      @open="preventMessages = true"
      @close="preventMessages = false"
    >
      <template #selectedOption="{ selected }">
        <slot
          name="selectedOption"
          :selected="selected"
        />
      </template>
      <template #option="{ option }">
        <slot
          name="option"
          :option="option"
        />
      </template>
    </tlt-select>
    <slot name="hint" />
  </vuci-form-item-template>
</template>

<script>
import { copy } from '@ui-core/utils/vue-helpers'
import { isEmpty, isArray } from '@ui-core/utils/inspect'
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin.vue'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'

export default {
  name: 'VuciFormItemSelect',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  props: makeProps({
    disableTeleport: [Boolean, false],
    hasSelectAll: [Boolean, false],
    options: [[Array, Function], () => []],
    multiple: [Boolean, false],
    allowCreate: [Boolean, false],
    disabledOptions: [Array, () => []],
    placeholder: [String, ''],
    rules: [[String, Function, Array], 'string'], // override 'uciname' to prevent errors
    width: [String, ''],
    initial: [[Number, String, Array], ''],
    // maxSelectable prop defines maximum elements that can be selected using multiselect component
    maxSelectable: [Number, null]
  }),
  computed: {
    convertedDataSource() {
      const options = []
      let propOptions = this.options
      if (typeof this.options === 'function') {
        propOptions = this.options(this.uciSection)
      }
      if (propOptions) {
        propOptions.forEach(o => {
          if (typeof o === 'string') {
            options.push({
              key: o,
              value: o
            })
          } else if (Array.isArray(o)) {
            options.push({
              key: o[0],
              value: o[1],
              depend: o[2]
            })
          } else {
            options.push(o)
          }
        })
      }
      return options
    },
    convertedDisabled() {
      const disabledOptions = []
      this.disabledOptions.forEach(o => {
        if (typeof o === 'string') {
          disabledOptions.push({
            key: o,
            value: o
          })
        } else if (Array.isArray(o)) {
          disabledOptions.push({
            key: o[0],
            value: o[1]
          })
        } else {
          disabledOptions.push(o)
        }
      })
      return disabledOptions
    },
    availableModel() {
      return this.model !== this.tempValue
    }
  },
  mounted() {
    this.$nextTick(() => (this.valid = true))
  },
  methods: {
    setInitialValue(value) {
      if (this.multiple && !isArray(value)) value = [value].filter(Boolean)
      else if (!this.multiple && isArray(value)) value = value[0] || ''
      const hasValue = v => this.convertedDataSource.find(o => o.key === v)
      const validValue = this.allowCreate ? value : this.multiple ? value.filter(hasValue) : hasValue(value)?.key || ''
      this.tempValue = this.isEmpty(validValue) ? this.convertUciValue(this.multiple ? this.initial : this.initial || this.convertedDataSource[0]?.key) : copy(validValue)
      if (this.visible) this.model = copy(this.tempValue)
      this.initialValue = copy(this.tempValue)
    },
    extraValidation() {
      const { multiple, maxSelectable, model } = this
      if (!multiple || !maxSelectable) return { valid: true }
      return { valid: maxSelectable >= model.length, message: this.$t('Maximum amount of allowed options is %s.').format(maxSelectable) }
    },
    initializeItem() {
      if (!this.visible) return
      if (isEmpty(this.model)) {
        this.model = this.multiple ? this.initial : this.initial || this.convertedDataSource[0]?.key
      }
      this.registerInput()
    },
    convertUciValue(value) {
      if (this.multiple) {
        if (!Array.isArray(value) && value !== undefined && value.length > 0) {
          return value.split(/(\s+)/).filter(e => e.trim().length > 0)
        }
        return value || []
      }
      return value
    }
  }
}
</script>
