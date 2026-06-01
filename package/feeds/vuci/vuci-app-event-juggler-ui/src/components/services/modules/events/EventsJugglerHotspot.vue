<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="hotspot_trigger"
    :label="$t('Hotspot trigger')"
    :help="$t('Hotspot event that will trigger the event.')"
    :options="triggerOptions"
    :depend="isTypeSelected"
    initial="connect"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const triggerOptions = [
  { value: 'connect', name: $t('Connect') },
  { value: 'disconnect', name: $t('Disconnect') }
]
</script>
