<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="event_juggler"
    :before-save="beforeSaveValidation"
    editing
  >
    <main-edit-section
      :uci-data="uciData"
      v-bind="props"
      @before-save="setBeforeSave"
    />
  </vuci-form>
</template>
<script setup lang="ts">
import MainEditSection from '../../components/services/edit-sections/EventsJugglerMainEditSection.vue'
import { ref, provide, type Ref, onMounted, onUnmounted } from 'vue'
import { $bus } from '@ui-core/plugins/event-bus'
import type { EventSection, ActionSection, ConditionSection, SectionName, FormData } from '@/types/eventsJugglerTypes'
import { useEventsJugglerData } from '../../components/services/useEventsJugglerData'

interface EditFromProps {
  section: EventSection | ActionSection | ConditionSection
  editType: SectionName
  parentSection?: EventSection
}
const props = defineProps<EditFromProps>()
const formData: Ref<FormData> = ref({ events: [], actions: [], conditions: [] })
const { updateValue } = useEventsJugglerData()

provide('parentSection', props.parentSection)

onMounted(() => {
  $bus.on('event-juggler-update-value', payload => updateValue(formData.value, props.editType, payload))
})

onUnmounted(() => {
  $bus.off('event-juggler-update-value', payload => updateValue(formData.value, props.editType, payload))
})

const beforeSaveValidation = ref(() => Promise.resolve(true))

function setBeforeSave(beforeSave: () => Promise<boolean>) {
  beforeSaveValidation.value = beforeSave
}
</script>
