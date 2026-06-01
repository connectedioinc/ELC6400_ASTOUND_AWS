<template>
  <vuci-form-item-select
    :uci-section="s"
    name="sim_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem to be used for SIM switch.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="sim_flip"
    :label="$t('Flip SIM')"
    :help="$t('Switch to a different inserted SIM card.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="sim_number"
    :label="$t('SIM Card')"
    :help="$t('Select the SIM card to switch to.')"
    :options="mobile.getModemSimCardOptions(modemData, s?.sim_modem_id)"
    :depend="isTypeSelected && simCount > 0 && s?.sim_flip === '0'"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="sim_write"
    :label="$t('Set as default SIM')"
    :help="$t('Set the SIM as default after switching.')"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import { mobile } from '@/plugins/mobile'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [], simCount = 0, modemData = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()
</script>
