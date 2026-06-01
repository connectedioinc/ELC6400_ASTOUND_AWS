<template>
  <vuci-form-item-select
    :uci-section="s"
    name="log_event"
    :label="$t('Events log type')"
    :help="$t('Type of event that will trigger the action.')"
    :options="typeOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="log_event_mark"
    :label="$t('Events log subtype')"
    :help="$t('More specific subtype of the event that will trigger the action.')"
    :options="subTypeOptions[s?.log_event]"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { events } from '@/plugins/events-options'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, computed, inject } from 'vue'
import type { EventsJugglerOptions, EventsReportingOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { events: eventOptions }: EventsReportingOptions = eventsJugglerOptions?.value?.eventsReportingOptions || { events: {}, params: {} }

const typeOptions = computed(() => events.getTranslatedTypes(eventOptions))
const subTypeOptions = computed(() => events.getTranslatedSubtypes(eventOptions))
</script>
