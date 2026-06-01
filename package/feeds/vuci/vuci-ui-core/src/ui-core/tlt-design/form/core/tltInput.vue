<template>
  <div
    class="tlt-input-wrapper"
    :aria-disabled="disabled"
    :class="{
      'unset-max-width': width?.length > 0
    }"
    :style="{ width }"
  >
    <div
      v-if="icon || $slots.before"
      class="tlt-input-before"
    >
      <slot name="before">
        <tlt-icon
          v-if="icon"
          :icon="icon"
          class="size-5"
        />
      </slot>
    </div>
    <input
      :id="itemId"
      :test-id="`input-${elementId || $attrs.id}`"
      :type="type"
      class="tlt-input-field"
      :placeholder="placeholderText"
      :name="name"
      :value="modelValue"
      :disabled="disabled"
      :readonly="readOnly"
      :data-state="inputState"
      @input="e => emit('update:modelValue', (e.target as HTMLInputElement).value as TValue)"
      @blur="e => emit('blur', e)"
    />
    <!-- eslint-enable -->
    <div
      v-if="iconRight || $slots.after"
      class="tlt-input-after"
    >
      <slot name="after">
        <tlt-icon
          v-if="iconRight"
          :icon="iconRight"
          class="size-5"
        />
      </slot>
    </div>
  </div>
</template>
<script setup lang="ts" generic="TValue extends string | number">
import { computed } from 'vue'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'
import type { BaseProps } from './_shared/input-props'

export interface Props<T> extends BaseProps<T> {
  width?: string
  type?: 'password' | 'text'
}
const props = withDefaults(defineProps<Props<TValue>>(), { width: '', type: 'text', placeholderPrefix: true })
const emit = defineEmits<{
  (e: 'update:modelValue', value: TValue): void
  (e: 'blur', ev: FocusEvent): void
}>()

const store = useMainStore()

const { inputState, itemId, elementId } = useInputInjects()
const $t = useTranslate()

const readOnly = computed(() => props.readonly ?? store.readOnlyPage)

const placeholderText = computed(() => {
  if (props.placeholderPrefix && props.placeholder) {
    return $t('e.g., %s').format(props.placeholder)
  }
  return props.placeholder
})
</script>

<style scoped>
.unset-max-width {
  max-width: unset;
}
</style>
