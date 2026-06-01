<template>
  <vuci-form-item-select
    :uci-section="s"
    name="modem_action"
    :label="$t('Modem action')"
    :help="$t('Select action to be performed on the modem.')"
    :options="actionOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem ID for executing the action.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const modemOptions: string[][] = eventsJugglerOptions?.value?.modemOptions || []

const $t = useTranslate()

const actionOptions = [
  ['reload', $t('Reload')],
  ['restart', $t('Restart')],
  ['hard_restart', $t('Hard restart')]
]
</script>
