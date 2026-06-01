<template>
  <vuci-named-section
    ref="moduleSectionRef"
    v-slot="{ s }"
    :title="hideTitle ? '' : $utils.getModalTitle($t('%s data').format(moduleComponentData?.title || ''), section?.name)"
    :uci-data="uciData"
    :endpoints="[{ endpoint: moduleComponentData?.endpoint }]"
    :name="section.id"
    :data-key="moduleComponentData?.name"
  >
    <slot name="enable" />
    <vuci-form-item-input
      :uci-section="s"
      name="name"
      :label="nameLabel"
      :rules="() => $utils.validateNoDuplicates(uciData[moduleType], 'name', s.name, nameLabel.toLowerCase())"
      required
    />
    <slot name="mainOptions" />
    <vuci-form-item-select
      v-bind="typeBindOptions"
      :uci-section="s"
      name="plugin"
      :warnings="warnings"
      required
    />
    <component
      :is="component"
      v-for="([moduleName, component], index) in Object.entries(componentModules)"
      :ref="el => setModuleBeforeSave(el, moduleName)"
      :key="index"
      :uci-data="uciData"
      :s="s"
      :module-name="moduleName"
      :parent-section="parentSection"
      @remove-module="onModuleRemove"
    />
    <slot name="additionalOptions" />
  </vuci-named-section>
</template>
<script setup lang="ts">
import VuciNamedSection from '@ui-core/vuci-form/src/VuciNamedSection.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { formBus } from '@ui-core/vuci-form'
import { useEventsJugglerData } from '../useEventsJugglerData'
import { type Ref, type Component, type ComponentPublicInstance, computed, onMounted, ref, inject } from 'vue'
import type { FormData, EventSection, ActionSection, ConditionSection, SectionName, EventsJugglerOptions, MappedModules, ModuleComponentRef } from '@/types/eventsJugglerTypes'

interface ModuleSectionProps {
  uciData: FormData
  section: EventSection | ActionSection | ConditionSection
  warnings?: (value: string) => void
  hideTitle?: boolean
  moduleType: SectionName
}

interface ModuleComponentData {
  endpoint: string
  name: SectionName
  title: string
}

const props = defineProps<ModuleSectionProps>()
const emit = defineEmits(['module-before-save'])

const $t = useTranslate()

const parentSection = inject<EventSection>('parentSection')
const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const injectedModules: MappedModules = eventsJugglerOptions?.value?.modules || { events: {}, actions: {}, conditions: {} }

const { getTranslatedModuleType } = useEventsJugglerData()

const componentRefs: Ref<ModuleComponentRef> = ref({})
const moduleSectionRef = inject<ComponentPublicInstance<typeof VuciNamedSection>>('moduleSectionRef')

const filterModules: Ref<string[]> = ref([])

const components: Record<string, ModuleComponentData> = {
  events: {
    endpoint: 'event_juggler/events/config',
    name: 'events',
    title: $t('event')
  },
  actions: {
    endpoint: `event_juggler/operations/config`,
    name: 'actions',
    title: $t('action')
  },
  conditions: {
    endpoint: `event_juggler/conditions/config`,
    name: 'conditions',
    title: $t('condition')
  }
}
const moduleComponentData = computed(() => components[props.moduleType])

const namelabels: Record<string, string> = {
  events: $t('Event name'),
  actions: $t('Action name'),
  conditions: $t('Condition name')
}
const nameLabel = computed(() => namelabels[props.moduleType])

const typeLabels: Record<string, string> = {
  events: $t('Event type'),
  actions: $t('Action type'),
  conditions: $t('Condition type')
}
const typeBindOptions = computed(() => {
  return {
    label: typeLabels[props.moduleType],
    options: getTranslatedModuleOptions(componentModules.value)
  }
})

const componentModules = computed(() => {
  const sectionModules: Record<string, Component> = injectedModules?.[props.moduleType] || {}
  if (filterModules.value.length === 0) return sectionModules
  return Object.fromEntries(Object.entries(sectionModules).filter(([key]) => !filterModules.value.includes(key)))
})

onMounted(() => {
  formBus.emit('uciData-loaded')
})

function getTranslatedModuleOptions(modules: Record<string, Component>) {
  const options = Object.keys(modules).map((type: string) => [type, getTranslatedModuleType(type)])
  options.unshift(['', $t('Not selected')])
  return options
}

function setModuleBeforeSave(el: { moduleBeforeSave: () => Promise<boolean> }, moduleName: string) {
  componentRefs.value[moduleName] = el
  emit('module-before-save', componentRefs.value)
}

function onModuleRemove(moduleName: string) {
  filterModules.value.push(moduleName)
}
</script>
