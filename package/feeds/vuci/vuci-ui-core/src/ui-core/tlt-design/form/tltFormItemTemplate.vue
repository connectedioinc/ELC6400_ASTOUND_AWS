<template>
  <tlt-form-model-item
    v-if="visible"
    v-show="depend"
    ref="formItem"
    :label="label"
    :help="help"
    :rules="rules"
    :maxlength="maxlength"
    :minlength="minlength"
    :input-value="modelValue"
    :label-width="labelWidth"
    :width="width"
    :prop="prop"
    :rawhtml="rawhtml"
    :required="required"
    :validator-hint="validatorHint"
    tlt-input
    :element-id="prop"
  >
    <template
      v-if="$slots.help"
      #help
    >
      <slot name="help"></slot>
    </template>
    <template
      v-if="$slots.hintBox"
      #controlHintBox
    >
      <slot name="hintBox" />
    </template>
    <template #label="slotProps">
      <slot
        name="label"
        v-bind="slotProps"
      />
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
  </tlt-form-model-item>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: true
    },
    help: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ' '
    },
    prop: {
      type: String,
      default: ''
    },
    rules: {
      type: [Object, Array],
      default: () => {}
    },
    modelValue: {
      type: [String, Array],
      default: ''
    },
    labelWidth: {
      type: String,
      default: ''
    },
    width: {
      type: String,
      default: ''
    },
    rawhtml: {
      type: Boolean,
      default: false
    },
    validatorHint: {
      type: String,
      default: ''
    },
    maxlength: {
      type: String,
      default: null
    },
    minlength: {
      type: String,
      default: null
    },
    datatype: {
      type: [String, Function, Array],
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    depend: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    validate() {
      return this.$refs.formItem.validate()
    }
  }
}
</script>
