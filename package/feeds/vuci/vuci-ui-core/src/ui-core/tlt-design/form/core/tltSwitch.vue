<template>
  <div
    class="inline-flex flex-wrap gap-2 group/switch items-center shrink-0 aria-disabled:cursor-not-allowed font-normal"
    :aria-disabled="disabled || readOnly"
    :test-id="`switch-${elementId}`"
    :aria-checked="`${isChecked}`"
    @click.capture="e => (disabled ? e.stopImmediatePropagation() : null)"
  >
    <input
      ref="switch"
      type="checkbox"
      class="invisible absolute"
      role="switch"
      :value="modelValue"
      :checked="isChecked"
      :disabled="disabled || readOnly"
      @click="_onInput"
    />
    <div
      :id="inputId"
      tabindex="0"
      :class="isChecked ? 'bg-theme-bg-primary-1 group-aria-disabled/switch:bg-theme-bg-primary-1/20' : 'bg-theme-border-base group-aria-disabled/switch:bg-theme-border-base/20'"
      class="w-10 inline-block h-5 cursor-pointer rounded-full relative transition-colors outline-offset-2 focus-visible:outline-1 focus-visible:outline-theme-border-primary group-aria-disabled/switch:cursor-not-allowed"
      @keydown.space="toggleSwitch"
      @click="toggleSwitch"
    >
      <div
        class="rounded-full absolute inset-y-0.5 bg-theme-bg-surface w-4 transition-transform text-theme-text-base shadow-md"
        :class="isChecked ? 'translate-x-5.5' : 'translate-x-0.5'"
      />
    </div>
    <div
      v-if="showText"
      aria-hidden="true"
      class="group-aria-disabled/switch:text-theme-text-secondary-subtle select-none"
    >
      {{ isChecked ? 'on' : 'off' }}
    </div>
  </div>
</template>

<script>
import { makeProps } from '@ui-core/utils/props'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'

export default {
  props: makeProps({
    modelValue: [[Boolean, Number, String], false],
    disabled: [Boolean, false],
    readonly: [Boolean],
    customId: [String, ''],
    showText: [Boolean, true],
    trueValue: [[Boolean, Number, String], true],
    falseValue: [[Boolean, Number, String], false]
  }),
  emits: ['update:modelValue'],
  setup() {
    return useInputInjects()
  },
  computed: {
    isChecked() {
      return this.modelValue === this.trueValue
    },
    inputId() {
      return this.itemId?.length > 0 ? this.itemId : this.customId
    },
    readOnly() {
      return this.readonly ?? this.$store.readOnlyPage
    }
  },
  created() {
    this.$emit('update:modelValue', this.modelValue === this.trueValue ? this.trueValue : this.falseValue)
    if (!this.itemId && !this.customId) {
      console.error('customId not provided')
    }
  },
  methods: {
    toggleSwitch() {
      !(this.disabled || this.readOnly) && this.$refs.switch.click()
    },
    _onInput() {
      this.$emit('update:modelValue', this.modelValue !== this.trueValue ? this.trueValue : this.falseValue)
    }
  }
}
</script>
