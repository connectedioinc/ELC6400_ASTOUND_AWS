<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="rms_on"
    :label="$t('RMS state')"
    :help="$t('Turn the RMS state on or off.')"
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
