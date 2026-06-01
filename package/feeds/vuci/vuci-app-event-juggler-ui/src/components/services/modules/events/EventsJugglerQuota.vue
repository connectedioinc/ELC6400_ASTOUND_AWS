<template>
  <vuci-form-item-select
    :uci-section="s"
    name="quota_interface"
    :label="$t('Interface name')"
    :help="$t('Network interface that will trigger the event.')"
    :options="quotaLimitOptions"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions, BaseOption } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const quotaLimitOptions: BaseOption[] = eventsJugglerOptions?.value?.quotaLimitOptions || []
</script>
