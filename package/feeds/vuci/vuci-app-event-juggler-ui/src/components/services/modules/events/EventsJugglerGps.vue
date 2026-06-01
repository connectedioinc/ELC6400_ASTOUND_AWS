<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="gps_trigger"
    :label="$t('GPS event trigger')"
    :help="$t('GPS event that will trigger the action.')"
    :options="triggerOptions"
    :depend="isTypeSelected"
    initial="radius"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_altitude"
    :label="$t('Altitude')"
    :help="$t('Altitude for the GPS event.')"
    rules="precision_range(0.000000,4000.000000)"
    placeholder="2000.000000"
    required
    :depend="isTypeSelected && s?.gps_trigger === 'altitude'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_longitude"
    :label="$t('Longitude')"
    :help="$t('Longitude for the GPS event.')"
    rules="precision_range(-180.000000,180.000000)"
    placeholder="90.000000"
    required
    :depend="isTypeSelected && s?.gps_trigger === 'radius'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_latitude"
    :label="$t('Latitude')"
    :help="$t('Latitude for the GPS event.')"
    placeholder="45.000000"
    rules="precision_range(-90.000000,90.000000)"
    required
    :depend="isTypeSelected && s?.gps_trigger === 'radius'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_radius"
    :label="$t('Radius')"
    :help="$t('Radius for the GPS event in meters.')"
    placeholder="1000"
    rules="irange(1,999999)"
    required
    :depend="isTypeSelected && s?.gps_trigger === 'radius'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_speed"
    :label="$t('Speed')"
    :help="$t('Speed for the GPS event in km/h.')"
    placeholder="100"
    rules="irange(0,482)"
    required
    :depend="isTypeSelected && s?.gps_trigger === 'speed'"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="gps_operator"
    :label="$t('Operator')"
    :help="$t('Operator for the GPS event.')"
    :options="operatorOptions"
    :depend="isTypeSelected"
    initial="gt"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { computed, watch } from 'vue'
import { $bus } from '@ui-core/plugins/event-bus'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

watch(
  () => props.s?.gps_trigger,
  newTrigger => {
    if (newTrigger !== 'radius' && props.s?.gps_operator === 'le/gt') {
      $bus.emit('event-juggler-update-value', { option: 'gps_operator', value: 'gt', id: props.s?.id })
    }
  }
)

const triggerOptions = [
  { value: 'radius', name: $t('Geofencing') },
  { value: 'altitude', name: $t('Altitude') },
  { value: 'speed', name: $t('Speed') }
]

const operatorOptions = computed(() => {
  const baseOptions = [
    { value: 'gt', name: $t('Exit') },
    { value: 'lt', name: $t('Enter') }
  ]
  if (props.s?.gps_trigger === 'radius') {
    return [...baseOptions, { value: 'le/gt', name: $t('Enter/Exit') }]
  }
  return baseOptions
})
</script>
