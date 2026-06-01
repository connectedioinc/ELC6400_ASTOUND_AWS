<template>
  <vuci-typed-section
    :uci-data="uciData"
    :endpoints="[
      {
        endpoint: `event_juggler/events/${section.id}/conditions/config`,
        sectionFilter: (s: ConditionSection) => section?.available_conditions?.includes(s.id)
      }
    ]"
    :title="$t('Conditions')"
    :columns="conditionColumns"
    data-key="conditions"
    type="condition"
    :after-add="handleAfterAdd"
    :after-delete="handleAfterDelete"
    :add-validate="(_: unknown, sections: ConditionSection[]) => validateAdd('condition', sections)"
    :edit-form="{ onEdit: MainEdit, onAdd: MainEdit }"
    :edit-form-props="{ editType: 'conditions', parentSection: section }"
    :no-edit-after-create="isStepEditSection"
    :row-actions="rowActions"
  >
    <template #name="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="name"
        no-write
      />
    </template>
    <template #plugin="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="plugin"
        :display-value="getTranslatedModuleType"
        no-write
      />
    </template>
  </vuci-typed-section>
</template>
<script setup lang="ts">
import MainEdit from '../../../views/services/EventsJugglerMainEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerData } from '../useEventsJugglerData'
import type { FormData, EventSection, ConditionSection, ActionSection } from '@/types/eventsJugglerTypes'

interface ConditionEditSectionProps {
  section: EventSection
  uciData: FormData
  isStepEditSection?: boolean
}

const props = defineProps<ConditionEditSectionProps>()
const emit = defineEmits(['open-condition'])

const $t = useTranslate()

const { updateUciData, updateInitialForm, getTranslatedModuleType, validateAdd } = useEventsJugglerData()

const conditionColumns = [
  { name: 'name', label: $t('Name') },
  { name: 'plugin', label: $t('Plugin') }
]

function rowActions(section: ConditionSection) {
  if (!props.isStepEditSection) return
  return [
    {
      id: 'edit',
      callback: () => {
        return emit('open-condition', section, 'edit')
      }
    },
    'delete'
  ]
}

function handleAfterAdd(_: unknown, { uciData, newSection }: { uciData: FormData; newSection: ConditionSection }) {
  emit('open-condition', newSection, 'add')
  updateUciData(uciData, props.section.id, (eventSection, actionSections) => {
    // assign created condition to all related actions
    ;(eventSection.available_conditions ||= []).push(newSection.id)
    actionSections.forEach(actionSection => (actionSection.conditions ||= []).push(newSection.id))
  })
  updateInitialForm(uciData, props.isStepEditSection)
}

function handleAfterDelete(deletedSection: ConditionSection, uciData: FormData) {
  updateUciData(uciData, props.section.id, (eventSection: EventSection) => {
    eventSection.available_conditions = eventSection.available_conditions?.filter((id: string) => id !== deletedSection.id)

    uciData.actions = uciData.actions
      .filter((action: ActionSection) => eventSection.actions.includes(action.id))
      .map((action: ActionSection) => ({
        ...action,
        conditions: action.conditions?.filter((id: string) => id !== deletedSection.id)
      }))
  })
  updateInitialForm(uciData, props.isStepEditSection)
}
</script>
