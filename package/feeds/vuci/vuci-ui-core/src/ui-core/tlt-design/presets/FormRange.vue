<template>
  <form-filter-preset
    :resettable="!!selected.from || !!selected.to"
    @submit="onSubmit"
    @reset="onReset"
  >
    <template #header>
      <slot name="header">
        {{ customName || $t('Custom range') }}
      </slot>
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
    <tlt-form-item-input
      :model-value="selected.from ? String(selected.from) : ''"
      placeholder="0"
      prop="range-from"
      :label="$t('From')"
      rules="integer"
      :readonly="false"
      @update:model-value="(value: string) => updateValue('from', value)"
    />
    <tlt-form-item-input
      :model-value="selected.to ? String(selected.to) : ''"
      placeholder="100"
      prop="range-to"
      :label="$t('To')"
      rules="integer"
      :readonly="false"
      @update:model-value="(value: string) => updateValue('to', value)"
    />
  </form-filter-preset>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import type { FilterRange } from '@ui-core/components/table/types'
import FormFilterPreset from './FormFilterPreset.vue'

export interface Props {
  customName?: string
}

const $t = useTranslate()

defineProps<Props>()

const emit = defineEmits<{
  close: []
  apply: [FilterRange]
  reset: []
}>()

const selected = defineModel<FilterRange>('selected', {
  default: () => ({ from: null, to: null })
})

function updateValue(field: 'from' | 'to', value: string) {
  if (!selected.value || !value) return (selected.value[field] = null)
  const val = parseFloat(value)
  if (isNaN(val)) return
  selected.value[field] = val
}

function onSubmit() {
  if (!selected.value) return
  emit('close')
  const { from, to } = selected.value
  emit('apply', { from, to })
}

function onReset() {
  selected.value = { from: null, to: null }
  emit('reset')
}

defineExpose({ onSubmit, onReset })
</script>
