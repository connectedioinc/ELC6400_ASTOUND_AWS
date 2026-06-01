<template>
  <component
    :is="sectionComponent"
    v-if="isComponentVisible"
    ref="sectionRef"
    v-bind="props"
  >
    <slot />
  </component>
</template>
<script setup lang="ts">
import EventComponent from '../../../components/services/base-sections/EventsJugglerEventSection.vue'
import ActionComponent from '../../../components/services/base-sections/EventsJugglerActionSection.vue'
import ConditionComponent from '../../../components/services/base-sections/EventsJugglerConditionSection.vue'
import VuciNamedSection from '@ui-core/vuci-form/src/VuciNamedSection.vue'
import { type Ref, type Component, type ComponentPublicInstance, computed, ref, onMounted, provide, nextTick, watch } from 'vue'
import type { FormData, EventSection, ActionSection, ConditionSection, SectionName } from '@/types/eventsJugglerTypes'

interface EditSectionProps {
  uciData: FormData
  section: EventSection | ActionSection | ConditionSection
  editType: SectionName
  shouldUpdate?: boolean
}
const props = defineProps<EditSectionProps>()
const emit = defineEmits(['module-section-ref', 'before-save'])

const moduleSectionRef: Ref<ComponentPublicInstance<typeof VuciNamedSection> | null> = ref(null)
const sectionRef: Ref<ComponentPublicInstance<typeof EventComponent> | null> = ref(null)

const isComponentVisible = ref(!props.shouldUpdate)

provide('moduleSectionRef', moduleSectionRef)

onMounted(() => {
  // If section is used for second level editing the component should be visible only after the first render as uciSection data in core are not updated yet.
  // This is needed to prevent upload component from caching the file name from the previous uciSection.
  if (!isComponentVisible.value) nextTick(() => (isComponentVisible.value = true))
  emit('before-save', sectionRef.value?.handleBeforeSave)
})

watch(
  () => moduleSectionRef.value,
  () => emit('module-section-ref', moduleSectionRef.value)
)

const components: Record<SectionName, Component> = {
  events: EventComponent,
  actions: ActionComponent,
  conditions: ConditionComponent
}
const sectionComponent = computed(() => {
  return components[props.editType]
})
</script>
