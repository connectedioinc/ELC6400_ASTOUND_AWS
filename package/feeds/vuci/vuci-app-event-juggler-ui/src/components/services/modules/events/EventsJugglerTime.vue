<template>
  <vuci-form-item-select
    :uci-section="s"
    name="time_hour"
    :label="$t('Hours')"
    :help="$t('Hours when the event should be triggered. If nothing is selected, every hour will be included.')"
    :placeholder="$t('Every hour is selected')"
    has-select-all
    multiple
    :options="getHourOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_minute"
    :label="$t('Minutes')"
    :help="$t('Minutes when the event should be triggered. If nothing is selected, every minute will be included.')"
    :placeholder="$t('Every minute is selected')"
    has-select-all
    multiple
    :options="getMinuteOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_month"
    :label="$t('Months')"
    :help="$t('Months when the event should be triggered. If nothing is selected, every month will be included.')"
    :placeholder="$t('Every month is selected')"
    has-select-all
    multiple
    :options="monthOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="time_day_type"
    :label="$t('Interval type')"
    :help="$t('Select between week and month days for instance intervals.')"
    :options="timeOptions"
    :depend="isTypeSelected"
    initial="weekdays"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_weekday"
    :label="$t('Weekday')"
    :help="$t('Weekdays when the action should be triggered. If nothing is selected, every day of the week will be included.')"
    :placeholder="$t('Every day is selected')"
    has-select-all
    multiple
    :options="dayOptions"
    :depend="isTypeSelected && s?.time_day_type === 'weekdays'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="time_day"
    :label="$t('Day of the month')"
    :help="$t('Month days when the action should be triggered. If nothing is selected, every day of the month will be included.')"
    :placeholder="$t('Every day is selected')"
    has-select-all
    multiple
    :options="getMonthDayOptions"
    :depend="isTypeSelected && s?.time_day_type === 'days'"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="time_month_override"
    :label="$t('Force last day')"
    :help="$t('Force intervals to accept the last day of the month as a valid option if the selected day does not exist in the ongoing month.')"
    :depend="isTypeSelected && s?.time_day_type === 'days'"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const timeOptions = [
  { value: 'weekdays', name: $t('Weekday') },
  { value: 'days', name: $t('Month day') }
]

const monthOptions = [
  ['jan', $t('January')],
  ['feb', $t('February')],
  ['mar', $t('March')],
  ['apr', $t('April')],
  ['may', $t('May')],
  ['jun', $t('June')],
  ['jul', $t('July')],
  ['aug', $t('August')],
  ['sep', $t('September')],
  ['oct', $t('October')],
  ['nov', $t('November')],
  ['dec', $t('December')]
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

function getMonthDayOptions() {
  return Array.from({ length: 31 }, (_, i) => `${i + 1}`)
}
function getHourOptions() {
  return Array.from({ length: 24 }, (_, i) => `${i}`)
}
function getMinuteOptions() {
  return Array.from({ length: 60 }, (_, i) => `${i}`)
}
</script>
