<template>
  <div class="flex flex-col items-center">
    <tlt-form-item-input
      :ref="`formula-input-${prop}`"
      v-model="modelValue"
      class="mb-1!"
      width="100px"
      required
      :prop="prop"
      :placeholder="placeholder"
      :rules="prop === 'custom_mul' || prop === 'custom_div' ? ['float_scientific', validateMD] : ['float_scientific']"
    />
    <div class="text-sm text-theme-text-subtle">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'

interface IoStatusFormulaInputProps {
  prop: string
  placeholder: string
  label: string
}

const modelValue = defineModel<string>({ required: true })
defineProps<IoStatusFormulaInputProps>()

const $t = useTranslate()

function validateMD(value: string) {
  return { isValid: value !== '0', message: $t('Value cannot be 0.') }
}
</script>
