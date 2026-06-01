<template>
  <tlt-form
    ref="tltFormRef"
    :model="modelValue"
    sid="custom-io-formula"
  >
    <div class="flex flex-col md:flex-row items-center justify-center m-6">
      <div class="flex flex-col items-center">
        <span class="text-2xl font-semibold mb-1">DV</span>
        <span class="text-sm text-theme-text-subtle">{{ $t('Displayed value') }}</span>
      </div>
      <div class="flex flex-col items-center w-4 mx-2">
        <span class="text-2xl font-semibold">=</span>
      </div>
      <io-status-formula-input
        v-model="modelValue.custom_mul"
        prop="custom_mul"
        :label="$t('Sensor slope')"
        placeholder="1.0"
      />
      <div class="flex flex-col items-center w-4 mx-2">
        <span class="text-2xl font-semibold">×</span>
      </div>
      <div class="flex">
        <div class="flex items-center mr-2">
          <span class="text-5xl scale-y-[1.7] -translate-y-3">(</span>
        </div>
        <div class="flex flex-col">
          <div class="flex items-center mb-2">
            <div class="flex flex-col items-center min-w-[100px]">
              <span class="text-2xl text-theme-text-primary mb-1">A</span>
              <span class="text-sm text-theme-text-subtle">{{ $t('Analog value') }}</span>
            </div>
            <div class="flex flex-col items-center w-4 mx-2">
              <span class="text-2xl font-semibold">±</span>
            </div>
            <io-status-formula-input
              v-model="modelValue.custom_add"
              prop="custom_add"
              :label="$t('Voltage offset')"
              placeholder="0"
            />
          </div>
          <div class="border-t-2 border-black"></div>
          <div class="mt-2">
            <io-status-formula-input
              v-model="modelValue.custom_div"
              prop="custom_div"
              :label="$t('Resistor value')"
              placeholder="1.0"
            />
          </div>
        </div>
        <div class="flex items-center ml-2">
          <span class="text-5xl scale-y-[1.7] -translate-y-3">)</span>
        </div>
      </div>
      <div class="flex flex-col items-center w-4 mx-2">
        <span class="text-2xl font-semibold">±</span>
      </div>
      <io-status-formula-input
        v-model="modelValue.custom_off"
        prop="custom_off"
        :label="$t('Sensor offset')"
        placeholder="0"
      />
    </div>
  </tlt-form>
</template>

<script setup lang="ts">
import IoStatusFormulaInput from './IoStatusFormulaInput.vue'
import { useTemplateRef } from 'vue'
import type { FormulaModel } from '@/types/ioTypes'

const modelValue = defineModel<FormulaModel>({ required: true })

const tltFormRef = useTemplateRef('tltFormRef')

defineExpose({
  validate: () => tltFormRef.value?.validate(),
  getData: () => tltFormRef.value?.getData()
})
</script>
