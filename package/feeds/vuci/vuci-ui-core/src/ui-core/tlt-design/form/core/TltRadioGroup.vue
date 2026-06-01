<template>
  <div
    :test-id="`radio-${customId || elementId}`"
    class="flex flex-wrap gap-4 flex-col md:flex-row md:gap-y-2"
  >
    <div
      v-for="option in options"
      :key="option.value"
      class="flex items-center flex-wrap"
    >
      <tlt-check-box
        v-model="modelValue"
        class="mr-0!"
        :name="name"
        :disabled="disabled || option.disabled"
        :readonly="readonly"
        :text="option.name"
        :box-value="option.value"
        :custom-id="`option-${option.value}`"
        type="radio"
      />
      <slot
        name="after"
        :option="option"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'

export interface Option<T> {
  value: T
  name: string
  disabled?: boolean
}

export interface Props<T> {
  options: Option<T>[]
  disabled?: boolean
  readonly?: boolean | null
  customId?: string
  name: string
}

const props = withDefaults(defineProps<Props<T>>(), {
  customId: '',
  readonly: null
})

const modelValue = defineModel<T>({ required: true })

const { elementId } = useInputInjects()
if (!elementId && !props.customId) {
  console.error('customId not provided')
}
</script>
