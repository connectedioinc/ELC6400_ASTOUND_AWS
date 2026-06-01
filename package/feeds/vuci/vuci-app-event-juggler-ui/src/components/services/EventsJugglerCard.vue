<template>
  <div>
    <tlt-horizontal-card
      :test-id="`rowCard-${section.id}`"
      :class="{ 'rounded-b-none!': cardStates?.[section.id] }"
    >
      <card-cell>
        <cell-row :label="$t('Event name')">
          <template #value>
            <div class="text-theme-text-primary font-semibold">
              <tlt-dummy-value :value="section.name" />
            </div>
          </template>
        </cell-row>
      </card-cell>
      <card-cell>
        <cell-row
          :label="$t('Event type')"
          :value="getTranslatedModuleType(section.plugin || '')"
        />
      </card-cell>
      <card-cell>
        <cell-row :label="$t('Enabled')">
          <template #value>
            <slot name="enable" />
          </template>
        </cell-row>
      </card-cell>
      <card-cell>
        <cell-row :label="$t('Conditions')">
          <template #value>
            <slot name="conditions" />
          </template>
        </cell-row>
      </card-cell>
      <action-cell>
        <cell-row :label="$t('Event actions')">
          <template #value>
            <div class="lg:min-w-max">
              <slot name="actions" />
            </div>
          </template>
        </cell-row>
      </action-cell>
      <action-cell>
        <slot name="dropdown" />
      </action-cell>
    </tlt-horizontal-card>
    <tlt-collapse-transition>
      <div
        v-show="cardStates?.[section.id]"
        :key="section.id"
        class="border-t-0 border overflow-clip"
        :class="section && 'rounded-bl-md rounded-br-md'"
      >
        <vuci-typed-section
          :uci-data="uciData"
          :endpoints="[
            {
              endpoint: `event_juggler/events/${section.id}/operations/config`,
              sectionFilter: s => section?.actions?.includes(s.id)
            }
          ]"
          data-key="actions"
          type="action"
          :after-add="handleAfterAdd"
          :after-delete="handleAfterDelete"
          :add-validate="(_: unknown, sections: ActionSection[]) => validateAdd('action', sections)"
          :form-methods="['edit', 'get']"
          :edit-form="EditForm"
          :edit-form-props="{ editType: 'actions', parentSection: section }"
        >
          <template #default="{ dataSource, actions }">
            <tlt-table
              :id="`event-juggler-table-${section.id}`"
              class="event-juggler-table border-t -m-px"
              :columns="tableColumns"
              :data-source="dataSource"
            >
              <template #name="{ record }">
                <div class="flex items-center gap-2">
                  <span>{{ record.name }}</span>
                  <tlt-hint
                    v-if="eventsJugglerOptions?.isPhoneSettingsEnabled && record.plugin === 'call' && section.enabled === '1'"
                    :hints="$t('&quot;Make a call&quot; actions are disabled because Phone settings are enabled.')"
                  >
                    <tlt-icon
                      icon="warning"
                      class="text-theme-text-warning size-5"
                    />
                  </tlt-hint>
                </div>
              </template>
              <template #actions="{ record }">
                <vuci-form-edit-delete
                  :id="record?.id"
                  :actions="actions"
                >
                  <template #delete="{ delSection }">
                    <tlt-popover
                      v-if="section?.actions?.length === 1"
                      :target="() => $refs[`delete_${record?.id}`]"
                      placement="bottom-end"
                      :content="$t('At least one action is required for configuration to be valid')"
                    />
                    <div :ref="`delete_${record?.id}`">
                      <tlt-button
                        button-id="delete"
                        type="text"
                        color="error"
                        size="md"
                        :readonly="section?.actions?.length === 1"
                        @click="delSection(record?.id)"
                      >
                        {{ $t('Delete') }}
                      </tlt-button>
                    </div>
                  </template>
                </vuci-form-edit-delete>
              </template>
              <template #add_action>
                <tlt-button
                  button-id="add"
                  type="text"
                  @click="actions.create"
                >
                  <tlt-icon
                    icon="add-circle"
                    class="size-5"
                    :solid="false"
                  />
                  {{ $t('Add new') }}
                </tlt-button>
              </template>
            </tlt-table>
          </template>
        </vuci-typed-section>
      </div>
    </tlt-collapse-transition>
  </div>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerData } from './useEventsJugglerData'
import EditForm from '../../views/services/EventsJugglerMainEdit.vue'
import type { TableColumn } from '@ui-core/components/table/types'
import type { FormData, EventSection, ActionSection } from '@/types/eventsJugglerTypes'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

interface JugglerCardProps {
  section: EventSection
  uciData: FormData
  cardStates: Record<string, boolean>
}

const props = defineProps<JugglerCardProps>()
const emit = defineEmits<{
  (e: 'update-card-ids'): void
}>()

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const $t = useTranslate()
const { getTranslatedModuleType, validateAdd } = useEventsJugglerData()

const tableColumns = [
  {
    dataIndex: 'name',
    title: $t('Action name'),
    actions: { sort: true }
  },
  {
    dataIndex: 'plugin',
    title: $t('Action type'),
    displayFn: (_: unknown, record: ActionSection) => getTranslatedModuleType(record.plugin || ''),
    actions: { filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'actions',
    title: $t('Manage actions')
  },
  {
    dataIndex: 'add',
    scopedSlots: { customHeader: 'add_action' },
    displayInMobileHeader: true
  }
] as TableColumn[]

function getParentIndex(uciData: FormData) {
  return uciData.events.findIndex((section: EventSection) => section.id === props.section.id)
}

function handleAfterAdd(_: unknown, { newSection, uciData }: { newSection: ActionSection; uciData: FormData }) {
  uciData.events[getParentIndex(uciData)].actions.push(newSection.id)
}

function handleAfterDelete(deletedSection: ActionSection, uciData: FormData) {
  const parentIndex = getParentIndex(uciData)
  uciData.events[parentIndex].actions = uciData.events[parentIndex].actions.filter((actionId: string) => actionId !== deletedSection.id)
  emit('update-card-ids')
}
</script>
<style scoped>
:deep(.event-juggler-table) {
  --bg-color: var(--color-theme-bg-secondary-subtle, #f8f8f8);
}
:deep(.event-juggler-table table th),
:deep(.event-juggler-table table td) {
  background-color: var(--bg-color);
}
:deep([id^='add-event-juggler-table-']) {
  margin-left: auto;
}
</style>
