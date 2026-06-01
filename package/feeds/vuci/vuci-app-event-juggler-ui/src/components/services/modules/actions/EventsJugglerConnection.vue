<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="conn_state"
    :label="$t('Connection state')"
    :help="$t('Enable or disable the connection. Disabling will stop the network interface or modem connection.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="conn_persist"
    :label="$t('Persist connection state')"
    :help="$t('If enabled, the connection state will be maintained even after a system restart or power cycle.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="conn_type"
    :label="$t('Connection type')"
    :help="$t('Select the type of connection this configuration applies to.')"
    :options="connTypeOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="conn_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem to be used for this connection.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1 && s?.conn_type === 'modem'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="conn_sim"
    :label="$t('SIM Card')"
    :help="$t('Select the SIM card to be used for this connection.')"
    :options="mobile.getModemSimCardOptions(modemData, s?.conn_modem_id)"
    :depend="isTypeSelected && simCount > 1 && s?.conn_type === 'modem'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="conn_interface"
    :label="$t('Interface name')"
    :help="$t('Select the name for the network interface.')"
    required
    :options="interfaceOptions"
    :depend="isTypeSelected && s?.conn_type === 'interface'"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { mobile } from '@/plugins/mobile'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [], simCount = 0, modemData = [], interfaceOptions = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()

const connTypeOptions = [
  ['modem', $t('Modem'), modemOptions.length > 0],
  ['interface', $t('Interface')]
]
</script>
