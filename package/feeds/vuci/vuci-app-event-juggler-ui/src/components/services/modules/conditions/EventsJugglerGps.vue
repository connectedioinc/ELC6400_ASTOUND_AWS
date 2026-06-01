<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="gps_cond_event"
    :label="$t('Event type')"
    :options="eventOptions"
    :depend="isTypeSelected"
    initial="in"
  >
    <template #help>
      <p>{{ $t('Event type for the GPS condition:') }}</p>
      <p>
        <span class="font-bold">{{ $t('In') }}</span> {{ $t('for entering the area;') }}
      </p>
      <p>
        <span class="font-bold">{{ $t('Out') }}</span> {{ $t('for leaving the area.') }}
      </p>
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-input
    :uci-section="s"
    name="gps_cond_longitude"
    :label="$t('Longitude')"
    :help="$t('Longitude for the GPS condition.')"
    rules="precision_range(-180.000000,180.000000)"
    placeholder="90.000000"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_cond_latitude"
    :label="$t('Latitude')"
    :help="$t('Latitude for the GPS condition.')"
    rules="precision_range(-90.000000,90.000000)"
    placeholder="45.000000"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="gps_cond_radius"
    :label="$t('Radius')"
    :help="$t('Radius for the GPS condition in meters.')"
    placeholder="1000"
    rules="irange(1,999999)"
    required
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventOptions = [
  { value: 'in', name: $t('In') },
  { value: 'out', name: $t('Out') }
]
</script>
