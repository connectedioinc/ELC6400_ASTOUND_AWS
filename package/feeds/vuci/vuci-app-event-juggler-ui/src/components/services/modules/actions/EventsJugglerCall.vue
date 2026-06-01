<template>
  <events-juggler-retry-options
    :uci-section="s"
    :is-type-selected="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="call_phone"
    :label="$t('Phone number')"
    :help="$t('Enter the phone number to which the call will be made.')"
    placeholder="+37000000000"
    rules="phonedigit"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="call_timeout"
    :label="$t('Call timeout')"
    :help="$t('Specify the timeout for the call in seconds. After this time, the call will be automatically ended (the receiver will be hung up).')"
    placeholder="15"
    initial="15"
    rules="irange(5, 180)"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="call_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem used for making the call.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
</template>
<script setup lang="ts">
import EventsJugglerRetryOptions from '../../EventsJugglerRetryOptions.vue'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [] } = eventsJugglerOptions?.value || {}
</script>
