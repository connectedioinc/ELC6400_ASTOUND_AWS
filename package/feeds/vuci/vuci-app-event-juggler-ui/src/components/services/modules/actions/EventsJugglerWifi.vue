<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="wifi_on"
    :label="$t('WiFi state')"
    :help="$t('Set the WiFi state to active.')"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const $t = useTranslate()
</script>
