<template>
  <div
    class="field field-input"
    :data-readonly="dataAttribute(props.readonly)"
    :data-disabled="dataAttribute(props.disabled)"
    :data-state="optionalAttribute(props.state)"
    @click.self="focusInput"
  >
    <slot name="leading" />
    <input
      :id="optionalAttribute(props.id)"
      ref="input"
      v-model="model"
      class="field-input__control"
      type="text"
      :placeholder="optionalAttribute(props.placeholder)"
      :readonly="optionalAttribute(props.readonly)"
      :disabled="optionalAttribute(props.disabled)"
      :name="optionalAttribute(props.name)"
      :aria-label="optionalAttribute(props.ariaLabel)"
      :aria-required="optionalAttribute(props.required)"
      :autocomplete="autocompleteAttribute"
    />
    <slot name="trailing" />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'
import { isBoolean } from '@ui-core/utils/inspect'

type State = 'error' | 'warning' | undefined

export type Props = {
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  state?: State
  name?: string | number
  id?: string
  placeholder?: string
  /**
   * @default false
   */
  autocomplete?: string | boolean
  ariaLabel?: string
}
const props = withDefaults(defineProps<Props>(), {
  autocomplete: undefined,
  state: undefined,
  name: undefined,
  id: undefined,
  placeholder: undefined,
  ariaLabel: undefined
})
const model = defineModel<string>({ default: '' })

const autocompleteAttribute = computed(() => {
  if (isBoolean(props.autocomplete)) return props.autocomplete ? 'on' : 'off'
  return props.autocomplete
})

const input = useTemplateRef('input')

function focusInput() {
  input.value?.focus()
}
</script>
