<template>
  <module-section
    :uci-data="uciData"
    :section="section"
    module-type="conditions"
  />
</template>
<script setup lang="ts">
import ModuleSection from './EventsJugglerModuleSection.vue'
import type { FormData, ConditionSection } from '@/types/eventsJugglerTypes'

interface EditSectionProps {
  uciData: FormData
  section: ConditionSection
}

defineProps<EditSectionProps>()
</script>
