<template>
  <label
    :id="inputId"
    :test-id="`${type}-${inputElementId}`"
    class="flex items-center gap-2 cursor-pointer mr-auto"
    :class="{
      'cursor-not-allowed! opacity-40': readOnly || disabled
    }"
  >
    <div
      class="relative border-theme-border-strong border bg-theme-bg-surface shrink-0"
      :class="{
        checked: isChecked && type === 'checkbox',
        'border-theme-border-primary! selected': isChecked && type === 'radio',
        'border-2!': isChecked && type === 'radio' && size === 'md',
        'border-1!': isChecked && type === 'radio' && size === 'sm',
        'rounded-xs': type === 'checkbox',
        'rounded-full': type === 'radio',
        'size-3': size === 'sm',
        'size-4': size === 'md',
        indeterminate
      }"
    >
      <input
        :id="`${inputId}-inputElement`"
        ref="input"
        v-model="modelValue"
        :value="boxValue"
        class="appearance-none size-full cursor-[inherit] rounded-[inherit] block outline-offset-4"
        :type="type"
        :name="name"
        :checked="!!isChecked"
        :disabled="disabled || readOnly"
        :tabindex="tabindex"
        @update:model-value="!(readOnly || disabled) && selectValue"
        @change="onChange"
      />
    </div>
    <slot>
      {{ text }}
    </slot>
  </label>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, watchEffect } from 'vue'
import { isArray } from '@ui-core/utils/inspect'
import { useMainStore } from '@/stores/main'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'

export interface Props {
  disabled?: boolean
  name?: string
  type?: 'checkbox' | 'radio'
  customId?: string
  readonly?: boolean | null
  text?: string
  boxValue?: any
  indeterminate?: boolean
  tabindex?: number
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  type: 'checkbox',
  customId: '',
  readonly: null,
  text: '',
  boxValue: true,
  tabindex: 0,
  size: 'md'
})

const { elementId, itemId } = useInputInjects()

const modelValue = defineModel<T | T[]>({ required: true })

const store = useMainStore()

const input = ref<HTMLInputElement | null>(null)

if (!elementId && !props.customId) {
  console.error('customId not provided')
}

const isChecked = computed(() => {
  switch (typeof modelValue.value) {
    case 'object':
      if (isArray(modelValue.value)) return modelValue.value.includes(props.boxValue)
      return JSON.stringify(modelValue.value) === JSON.stringify(props.boxValue)
    default:
      return modelValue.value === props.boxValue
  }
})

const readOnly = computed(() => props.readonly ?? store.readOnlyPage)
const inputId = computed(() => [itemId, props.customId].filter(Boolean).join('-'))
const inputElementId = computed(() => [elementId, props.customId].filter(Boolean).join('-'))

function selectValue() {
  if (props.disabled) return
  const checkedValue = props.boxValue
  if (isArray(modelValue.value)) {
    // if it filters out the checked value, newCheckedValues will be shorter than original values, meaning something was removed.
    const newCheckedValues = modelValue.value.filter(val => JSON.stringify(val) !== JSON.stringify(checkedValue))
    const removed = newCheckedValues.length < modelValue.value.length
    // if value were removed, we will just emit new shorter array
    if (removed) return (modelValue.value = newCheckedValues)
    // otherwise just push new value to the end of the array and emit an update
    newCheckedValues.push(checkedValue)
    return (modelValue.value = newCheckedValues)
  }
  // TODO improve logic
  const falseValue = typeof modelValue.value === 'boolean' ? false : null
  const newValue = modelValue.value === checkedValue ? falseValue : checkedValue
  modelValue.value = newValue
}

watchEffect(() => {
  if (!input.value) return
  input.value.indeterminate = isChecked.value && props.indeterminate
})

function onChange() {
  if (!input.value) return
  input.value.checked = isChecked.value
  input.value.indeterminate = isChecked.value && props.indeterminate
}

function toggle() {
  if (!input.value) return
  input.value.click()
}

defineExpose({ toggle })
</script>

<style scoped>
.checked::after {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  border-radius: 2px;
  background-image: url('/icons/checkbox_tick_white.svg');
  background-color: var(--color-theme-bg-primary-1);
  background-position: center;
  background-repeat: no-repeat;
  background-size: 50%;
}

.indeterminate::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  border-radius: 2px;
  background-color: var(--color-theme-bg-primary-1);
}
.indeterminate::after {
  content: '';
  position: absolute;
  width: 0.5rem;
  height: 0.125rem;
  background-color: var(--color-theme-bg-surface);
  border-radius: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.selected::after {
  background-color: var(--color-theme-bg-primary-1);
  border-radius: 50%;
  width: 0.5rem;
  height: 0.5rem;
  content: '';
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  position: absolute;
}
</style>
