<template>
  <vuci-form-item-select
    :uci-section="s"
    name="time_cond_day_type"
    :label="$t('Interval type')"
    :help="$t('Select between week, month, and year days for instance intervals.')"
    :options="timeOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_cond_wday"
    :label="$t('Weekday')"
    :placeholder="$t('Every day is selected')"
    :help="$t('Weekdays when the action should be triggered. If nothing is selected, every day of the week will be included.')"
    has-select-all
    multiple
    :options="dayOptions"
    :depend="isTypeSelected && s?.time_cond_day_type === 'weekday'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_cond_day"
    :label="$t('Month day')"
    :placeholder="$t('Every day is selected')"
    :help="$t('Month days when the action should be triggered. If nothing is selected, every day of the month will be included.')"
    has-select-all
    multiple
    :options="getMonthOptions"
    :depend="isTypeSelected && s?.time_cond_day_type === 'monthday'"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="time_cond_month_override"
    :label="$t('Force last day')"
    :help="$t('Force intervals to accept the last day of the month as a valid option if the selected day does not exist in the ongoing month.')"
    :depend="isTypeSelected && s?.time_cond_day_type === 'monthday'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="time_cond_start_yday"
    :label="$t('Start year day')"
    :help="$t('Start day number of the year for the interval when the action should be triggered.')"
    placeholder="145"
    required
    rules="irange(1,366)"
    :depend="isTypeSelected && s?.time_cond_day_type === 'yearday'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="time_cond_end_yday"
    :label="$t('End year day')"
    :help="$t('End day number of the year for the interval when the action should be triggered.')"
    placeholder="300"
    required
    :rules="['irange(1,366)', (value: string) => endYearValidation(value)]"
    :depend="isTypeSelected && s?.time_cond_day_type === 'yearday'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="time_cond_start_time"
    :label="$t('Start hour and minute')"
    :help="$t('Start time in the format hh:mm for the interval when the action should be triggered. Use a 24-hour format (00:00 - 23:59).')"
    placeholder="9:25"
    required
    :rules="startHourTimeValidation"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="time_cond_end_time"
    :label="$t('End hour and minute')"
    :help="$t('End time in the format hh:mm for the interval when the action should be triggered. Use a 24-hour format (00:00 - 23:59).')"
    placeholder="17:25"
    required
    :rules="endHourTimeValidation"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="time_cond_not"
    :label="$t('Invert value')"
    :help="$t('Invert the condition value.')"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const timeOptions = [
  ['weekday', $t('Weekday')],
  ['monthday', $t('Month day')],
  ['yearday', $t('Year day')]
]

const dayOptions = [
  ['mon', $t('Monday')],
  ['tue', $t('Tuesday')],
  ['wed', $t('Wednesday')],
  ['thu', $t('Thursday')],
  ['fri', $t('Friday')],
  ['sat', $t('Saturday')],
  ['sun', $t('Sunday')]
]

function getMonthOptions() {
  return Array.from({ length: 31 }, (_, i) => `${i + 1}`)
}

function endYearValidation(value: string) {
  return { isValid: props.s?.time_cond_start_yday < value, message: $t('End year day must be greater than the start year day.') }
}

const wildcardRegex = /^(\*):([0-5][0-9])$/
const timeRegex = /^([0-9]|[0-1][0-9]|2[0-3]):([0-5][0-9])$/

function startHourTimeValidation(value: string) {
  const isValid = wildcardRegex.test(value) || timeRegex.test(value)
  return { isValid, message: $t('Accepted formats are hh:mm or *:mm, where * is a wildcard for any hour.') }
}

function endHourTimeValidation(value: string) {
  const isWildCardUsed = props.s?.time_cond_start_time.includes('*')
  const isValid = isWildCardUsed ? wildcardRegex.test(value) : timeRegex.test(value)
  const message = isWildCardUsed ? $t('Accepted format mismatch. Please use the *:mm format for wildcard hours.') : $t('Accepted format mismatch. Please use the hh:mm format.')
  return { isValid, message }
}
</script>
