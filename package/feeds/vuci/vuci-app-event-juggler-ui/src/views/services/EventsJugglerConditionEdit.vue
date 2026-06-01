<template>
  <vuci-form
    v-slot="{ uciData }"
    config="event_juggler"
    editing
  >
    <condition-edit-section
      :uci-data="uciData"
      :section="section"
    />
  </vuci-form>
</template>
<script setup lang="ts">
import ConditionEditSection from '../../components/services/edit-sections/EventsJugglerConditionEditSection.vue'
import { onUnmounted } from 'vue'
import { $bus } from '@ui-core/plugins/event-bus'
import type { EventSection } from '@/types/eventsJugglerTypes'

interface CondtionEditProps {
  section: EventSection
}

defineProps<CondtionEditProps>()

onUnmounted(() => {
  $bus.emit('event-juggler-reset-edit')
})
</script>
