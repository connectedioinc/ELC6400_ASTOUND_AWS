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
    <tlt-multi-select
      v-if="multiple"
      ref="select"
      v-model="inputValue"
      class="x-input-wrapper"
      :allow-create="allowCreate ? convertedRules : false"
      :has-select-all="hasSelectAll"
      :data-source="convertedDataSource"
      :disabled-options="convertedDisabled"
      :readonly="readOnly"
      :placeholder="placeholder"
      @update:model-value="onInput"
      @open="$emit('open')"
      @close="$emit('close')"
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
      ref="select"
      v-model="inputValue"
      class="x-input-wrapper"
      :allow-create="allowCreate ? convertedRules : false"
      :data-source="convertedDataSource"
      :disabled-options="convertedDisabled"
      :width="width"
      :readonly="readOnly"
      :custom="custom"
      :placeholder="placeholder"
      @update:model-value="onInput"
      @open="$emit('open')"
      @close="$emit('close')"
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
  </tlt-form-item-template>
</template>

<script>
import tltFormItemMixin from './tltFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'

export default {
  mixins: [tltFormItemMixin, tltValidationMixin],
  props: {
    hasSelectAll: {
      type: Boolean,
      default: false
    },
    custom: {
      type: Boolean,
      default: false
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
    modelValue: {
      type: [String, Array],
      default: ''
    },
    options: {
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
    disabledOptions: {
      type: Array,
      default: () => []
    },
    rules: {
      type: [String, Function, Array],
      default: 'string'
    },
    placeholder: {
      type: String,
      default: ''
    }
  },
  emits: ['open', 'close'],
  data() {
    return {
      inputValue: this.modelValue
    }
  },
  computed: {
    convertedDataSource() {
      return this.convertToRequiredArr(this.options)
    },
    convertedDisabled() {
      return this.convertToRequiredArr(this.disabledOptions)
    }
  },
  methods: {
    convertToRequiredArr(arr) {
      const result = []
      arr.forEach(o => {
        if (typeof o === 'string') {
          result.push({
            key: o,
            value: o
          })
        } else if (Array.isArray(o)) {
          result.push({
            key: o[0],
            value: o[1],
            depend: o[2]
          })
        } else {
          result.push(o)
        }
      })
      return result
    }
  }
}
</script>
