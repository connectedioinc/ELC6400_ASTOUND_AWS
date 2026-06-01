<template>
  <module-section
    :uci-data="uciData"
    :section="section"
    :warnings="getFilterPluginWarnings"
    module-type="events"
    @module-before-save="setModuleBeforeSave"
  >
    <template #enable>
      <vuci-form-item-switch
        :uci-section="section"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable Event Juggler configuration.')"
      />
    </template>
    <template #mainOptions>
      <vuci-form-item-input
        :uci-section="section"
        name="wait"
        :label="$t('Trigger interval')"
        :help="
          $t(
            'Specifies the shortest amount of seconds between triggers. The trigger interval and the action\'s execution delay values are summed up when calculating the total interval between triggers.'
          )
        "
        rules="irange(0,4294967295)"
        placeholder="1"
      />
    </template>
  </module-section>
</template>
<script setup lang="ts">
import ModuleSection from './EventsJugglerModuleSection.vue'
import { type Ref, ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerData } from '../useEventsJugglerData'
import type { FormData, EventSection, ConditionSection, ModuleComponentRef } from '@/types/eventsJugglerTypes'

interface EditSectionProps {
  uciData: FormData
  section: EventSection
  multiSection: boolean
}

const props = defineProps<EditSectionProps>()

const $t = useTranslate()

const { getTranslatedFilterValues, getFilterOptions } = useEventsJugglerData()

const moduleComponentData = ref<ModuleComponentRef>({})

const filterOptions = computed(() => {
  const filterOptions = getFilterOptions(props.section)
  return getTranslatedFilterValues(filterOptions)
})

const overridenEventType: Record<string, string> = {
  event: 'log'
}

const incorrectOptionExists = computed(() => {
  const conditionIds: string[] = props.section?.available_conditions || []
  if (!conditionIds.length) return false
  const filteredConditions: ConditionSection[] = props.uciData.conditions?.filter((condition: ConditionSection) => condition.plugin === 'filter' && conditionIds.includes(condition.id)) || []
  return filteredConditions.some((condition: ConditionSection) => isEventTypeChanged(condition) && !filterOptions.value.find(arr => arr[1] === condition.filter_name))
})

function isEventTypeChanged(condition: ConditionSection) {
  const eventType = condition.filter_name.split('.')[0]
  return props.section.plugin !== (overridenEventType[eventType] || eventType)
}

function getFilterPluginWarnings() {
  if (!incorrectOptionExists.value) return
  if (filterOptions.value.length === 0) {
    return $t('This event type cannot have filter conditions. Please remove the current filter conditions to enable changing the event type.')
  }
  return $t('This event type can only have the following filter condition field name %s: %s. Please remove the current filter conditions to enable changing the event type.').format(
    filterOptions.value.length > 1 ? $t('parameters') : $t('parameter'),
    filterOptions.value.map(arr => arr[1]).join(', ')
  )
}

function setModuleBeforeSave(componentRefs: Ref<ModuleComponentRef>) {
  moduleComponentData.value = componentRefs.value
}

function handleBeforeSave() {
  if (!props.section?.plugin) return Promise.resolve(true)

  if (incorrectOptionExists.value) {
    return Promise.reject($t('Please remove the current filter conditions to enable changing the event type.'))
  }

  const { moduleBeforeSave } = moduleComponentData.value?.[props.section.plugin] || {}
  if (moduleBeforeSave) {
    return moduleBeforeSave()
  }

  return Promise.resolve(true)
}

defineExpose({
  handleBeforeSave
})
</script>
