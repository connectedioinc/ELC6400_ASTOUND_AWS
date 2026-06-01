<template>
  <li
    :id="`${itemId}-select-${option.key}`"
    role="option"
    class="tlt-select-option group/option"
    :test-id="`selectoption-${option.key}`"
    :aria-selected="isSelected"
    :aria-disabled="isDisabled"
    :class="{ 'active-option': isActive }"
    @click="onOptionClick"
  >
    <!-- "clicking" on checkbox when its in multiselect due to it's inside logic to emit correct new value array -->
    <tlt-check-box
      v-if="isMultiSelectOption"
      ref="checkbox"
      :model-value="isSelected"
      :disabled="isDisabled"
      class="-m-2 p-2"
      :custom-id="`${itemId}-select-${option.key}-checkbox`"
      :tabindex="-1"
      @update:model-value="onCheckboxUpdate"
    >
      <slot :option="option">
        {{ option.value }}
      </slot>
    </tlt-check-box>
    <slot v-else>{{ option.value }}</slot>
  </li>
</template>

<script>
import { isArray } from '@ui-core/utils/inspect'

/**
 * @typedef {import('./TltSelect.vue').SelectOption} SelectOption
 */
export default {
  inject: {
    itemId: {
      default: ''
    }
  },
  props: {
    isDisabled: {
      type: Boolean,
      default: false
    },
    /**
     * @description indicates that the option is visually active
     */
    isActive: {
      type: Boolean,
      default: false
    },
    /**
     * @description indicates what option is selected (in select component) by user
     * @type {import('vue').PropType<SelectOption|SelectOption[]>}
     */
    modelValue: {
      type: [Object, Array],
      default: () => []
    },
    /** @type {import('vue').PropType<SelectOption>} */
    option: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue'],
  computed: {
    isMultiSelectOption() {
      // multi-select value will always be an array, so if value is array - it's multi-select option.
      return isArray(this.modelValue)
    },
    isSelected() {
      const { option } = this
      return isArray(this.modelValue) ? this.modelValue.some(selected => selected.key === option.key) : this.modelValue.key === option.key
    }
  },
  methods: {
    /**
     * multi-select has a different method to select option, because onOptionSelect gets invoked twice on every click
     */
    onCheckboxUpdate(checked) {
      if (this.disabled) return
      const nextValue = checked ? this.modelValue.concat(this.option) : this.modelValue.filter(i => i.key !== this.option.key)
      this.$emit('update:modelValue', nextValue)
    },

    onOptionClick() {
      if (this.disabled) return
      return this.isMultiSelectOption ? null : this.$emit('update:modelValue', this.option)
    }
  }
}
</script>
<style scoped>
@reference '@/theme.css';

.tlt-select-option {
  @apply p-2 mx-2 rounded-lg;
}
.tlt-select-option[aria-selected='true'] {
  @apply text-theme-text-primary;
}
.tlt-select-option[aria-disabled='true'] {
  @apply bg-theme-bg-floating text-theme-text-subtle;
}
.tlt-select-option:not([aria-disabled='true']) {
  @apply cursor-pointer;
}
.active-option {
  @apply bg-theme-bg-active;
}
</style>
