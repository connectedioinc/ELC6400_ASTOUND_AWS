<template>
  <vuci-form-item-select
    :uci-section="s"
    name="boot_mode"
    :label="$t('Boot mode')"
    :help="$t('Select the boot mode that will trigger the event.')"
    :options="bootModeOptions"
    :depend="isTypeSelected"
  />
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)
const $t = useTranslate()

const { isTypeSelected } = useEventsJugglerModuleData(props)

const bootModeOptions = [
  ['reboot', $t('Reboot')],
  ['power_on', $t('Power on')]
]
</script>
