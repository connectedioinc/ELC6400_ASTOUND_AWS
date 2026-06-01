<template>
  <vuci-form-item-select
    :uci-section="s"
    name="filter_name"
    :label="$t('Field name')"
    :help="$t('Name of the data field to be filtered.')"
    :options="filterOptions"
    :depend="isTypeSelected"
  />
  <component
    :is="filterValueProps?.is"
    v-bind="filterValueProps"
    :uci-section="s"
    name="filter_value"
    :label="$t('Value')"
    :help="$t('Value that should be compared against the data field.')"
    :placeholder="$t('value')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="filter_operator"
    :label="$t('Operator')"
    :help="$t('Operator to be used for filtering the data field.')"
    :options="operatorOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="filter_not"
    :label="$t('Invert filter')"
    :help="$t('Invert the filter result.')"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { useEventsJugglerData } from '../../useEventsJugglerData'
import { type Ref, computed, inject, onMounted } from 'vue'
import type { EventsJugglerOptions, Plugin } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const $t = useTranslate()

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const eventOptions: Plugin[] = eventsJugglerOptions?.value?.eventOptions || []

const { isTypeSelected } = useEventsJugglerModuleData(props)
const { getTranslatedFilterValues, getFilterOptions } = useEventsJugglerData()

onMounted(() => {
  if (filterOptions.value.length === 0) return emit('remove-module', 'filter')
})

const filterOptions = computed(() => {
  return getTranslatedFilterValues(getFilterOptions(props.parentSection!))
})
const emit = defineEmits(['remove-module'])

const operatorTranslates: Record<string, string> = {
  eq: $t('Equals'),
  ne: $t('Not equals'),
  in: $t('In (a set of values)'),
  gt: $t('Greater than'),
  ge: $t('Greater than or equal to'),
  lt: $t('Less than'),
  le: $t('Less than or equal to')
}

const operatorOptions = computed(() => {
  const optionsByDataType: Record<string, string[]> = {
    bool: ['eq', 'ne'],
    string: ['eq', 'ne', 'in'],
    default: ['eq', 'ne', 'gt', 'ge', 'lt', 'le']
  }
  const selectedOptions = optionsByDataType[valueDataType.value] || optionsByDataType.default
  return selectedOptions.map(option => [option, operatorTranslates[option]])
})

const valueDataType = computed(() => {
  const optionsWithParams = eventOptions.filter(option => 'params' in option)
  const nameParamPairs = optionsWithParams.map(option => [option.name, option.params])
  const optionObject = Object.fromEntries(nameParamPairs)
  return optionObject[props.parentSection?.plugin ?? '']?.[props.s?.filter_name]
})

const filterValueProps = computed(() => {
  const valueRules: Record<string, string> = {
    int: 'uinteger',
    double: 'ufloat',
    default: 'string'
  }
  return {
    is: valueDataType.value === 'bool' ? 'vuci-form-item-switch' : 'vuci-form-item-input',
    required: valueDataType.value !== 'bool',
    rules: valueRules[valueDataType.value] || valueRules.default
  }
})
</script>
