<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="astro_trigger"
    :label="$t('Trigger')"
    :help="$t('Astronomical event that will trigger the action.')"
    :options="triggerOptions"
    :depend="isTypeSelected"
    initial="sunrise"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="astro_offset"
    :label="$t('Trigger offset')"
    :help="$t('Trigger offset in minutes.')"
    placeholder="60"
    rules="irange(0,1440)"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="astro_longitude"
    :label="$t('Longitude')"
    :help="$t('Longitude for the Astro Time event.')"
    placeholder="90.000000"
    rules="precision_range(-180.000000,180.000000)"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-input
    :uci-section="s"
    name="astro_latitude"
    :label="$t('Latitude')"
    :help="$t('Latitude for the Astro Time event.')"
    placeholder="45.000000"
    rules="precision_range(-90.000000,90.000000)"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="astro_type"
    :label="$t('Astronomical event type')"
    :options="typeOptions"
    :depend="isTypeSelected"
    initial="official"
  >
    <template #help>
      <p>{{ $t('Select the type of astronomical event calculation to use:') }}</p>
      <p
        v-for="(event, index) in eventTypes"
        :key="index"
      >
        <span class="font-bold">{{ event.name }}</span> - {{ event.description }}.
      </p>
    </template>
  </vuci-form-item-radio-group>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventTypes = [
  { name: $t('Official'), description: $t('standard time used by most people;') },
  { name: $t('Civil'), description: $t('used for general purposes;') },
  { name: $t('Nautical'), description: $t('used by sailors;') },
  { name: $t('Astronomical'), description: $t('used by astronomers;') }
]
const triggerOptions = [
  { value: 'sunrise', name: $t('Sunrise') },
  { value: 'sunset', name: $t('Sunset') }
]
const typeOptions = [
  { value: 'official', name: $t('Official') },
  { value: 'civil', name: $t('Civil') },
  { value: 'nautical', name: $t('Nautical') },
  { value: 'astronomical', name: $t('Astronomical') }
]
</script>
