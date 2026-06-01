<template>
  <vuci-form-item-select
    :uci-section="s"
    name="gsm_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem to use for the GSM event.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="gsm_event"
    :label="$t('GSM event trigger')"
    :help="$t('GSM event type that will trigger the action.')"
    :options="eventOptions"
    :depend="isTypeSelected"
    initial="rssi_value"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="gsm_signal_trigger"
    :label="$t('Signal strength trigger')"
    :help="$t('Signal strength condition that will trigger the event.')"
    :options="signalTriggerOptions"
    :depend="isTypeSelected && s?.gsm_event === 'rssi_value'"
    initial="lt"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gsm_signal"
    :label="$t('Signal strength (dBm)')"
    :help="$t('Signal strength in dBm.')"
    placeholder="-70"
    rules="irange(-130, 0)"
    required
    :depend="isTypeSelected && s?.gsm_event === 'rssi_value' && s?.gsm_signal_trigger !== 'range'"
  />
  <vuci-form-item-custom
    :uci-section="s"
    name="gsm_signal_range"
    :label="$t('Signal strength (dBm)')"
    :help="$t('Signal strength in dBm.')"
    inputs="input,input"
    :input-props="signalRangeParameterProps"
    allow-create
    required
    :separator="signalRangeSeparator"
    :write-parse="(params: Array<string>) => getSaveParameters(params, signalRangeSeparator)"
    :depend="isTypeSelected && s?.gsm_event === 'rssi_value' && s?.gsm_signal_trigger === 'range'"
  >
    <template #input-input="{ keyValue, rowValues, rowId }">
      <tlt-form-item-input
        :ref="el => updateCustomInputs(el, `${props.prop}-${rowId}`)"
        :key="keyValue"
        v-model="rowValues[keyValue]"
        :prop="`${props.prop}-${rowId}`"
        :placeholder="props.placeholder"
        :rules="['irange(-130, 0)', () => validateSignalRange(rowValues)]"
        required
        @change="updateCustomInputValidity"
      />
    </template>
  </vuci-form-item-custom>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected, getSaveParameters } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const modemOptions: string[][] = eventsJugglerOptions?.value?.modemOptions ?? []

const signalRangeSeparator = ','
const signalRangeParameterProps = [
  { prop: 'ParamInput1', placeholder: '-130' },
  { prop: 'ParamInput2', placeholder: '0' }
]
const eventOptions = [
  { value: 'rssi_value', name: $t('RSSI value') },
  { value: 'service_mode', name: $t('Service mode') }
]
const signalTriggerOptions = [
  { value: 'lt', name: $t('Less than') },
  { value: 'gt', name: $t('Greater than') },
  { value: 'range', name: $t('Range') }
]
const customInputs = ref<{ [key: string]: { validate: () => Promise<boolean> } }>({})

function updateCustomInputs(el: any, key: string) {
  customInputs.value[key] = el
}
function updateCustomInputValidity() {
  Object.values(customInputs.value).forEach((inputRef: any) => inputRef.validate())
}
function validateSignalRange(rangeValues: Array<string>) {
  const [min, max] = rangeValues.map(Number)
  return { isValid: min < max, message: $t('The first value should be smaller than the second value.') }
}
async function handleBeforeSave() {
  if (props.s?.gsm_signal_trigger !== 'range') return Promise.resolve(true)
  const validations = Object.values(customInputs.value)
    .filter(e => e)
    .map(input => input.validate())
  const resolvedValidations = await Promise.all(validations)
  if (!resolvedValidations.every(validation => validation)) return Promise.reject($t('Some fields are invalid'))
  return Promise.resolve(true)
}

defineExpose({
  moduleBeforeSave: handleBeforeSave
})
</script>
