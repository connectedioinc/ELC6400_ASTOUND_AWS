<template>
  <vuci-form-item-select
    :uci-section="s"
    name="profile"
    :label="$t('Profile name')"
    :help="$t('Name of the profile to be applied.')"
    :options="profileOptions"
    :depend="isTypeSelected"
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
const profileOptions = eventsJugglerOptions?.value?.profileOptions

const $t = useTranslate()
</script>
