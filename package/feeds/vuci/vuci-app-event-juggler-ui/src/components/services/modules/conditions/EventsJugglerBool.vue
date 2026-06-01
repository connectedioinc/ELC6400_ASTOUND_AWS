<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="bool_operation"
    :label="$t('Boolean operator')"
    :options="operationOptions"
    :depend="isTypeSelected"
    initial="and"
  >
    <template #help>
      <p>
        <span class="font-bold">{{ $t('And') }}</span> - {{ $t('all added conditions must evaluate to true.') }}
      </p>
      <p>
        <span class="font-bold">{{ $t('Or') }}</span> - {{ $t('at least one condition must evaluate to true.') }}
      </p>
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-switch
    :uci-section="s"
    name="bool_not"
    :label="$t('Invert results')"
    :help="$t('Invert the evaluation results of the boolean group.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="bool_conditions"
    :label="$t('List of conditions')"
    :help="$t('List of conditions that will be evaluated.')"
    :placeholder="$t('-- Please choose --')"
    multiple
    required
    :rules="validateConditionList"
    :options="conditionsOptions"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { useEventsJugglerData } from '../../useEventsJugglerData'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)
const { getConditionOptions } = useEventsJugglerData()

const $t = useTranslate()

const operationOptions = [
  { value: 'and', name: $t('And') },
  { value: 'or', name: $t('Or') }
]

const conditionsOptions = computed<string[][]>(() => {
  return getConditionOptions(props.parentSection!, props.uciData)?.filter((option: string[]) => option[0] !== props.s?.id) || []
})

function validateConditionList(value: string[]) {
  return { isValid: value.length > 1, message: $t('At least two or more conditions should be selected.') }
}
</script>
