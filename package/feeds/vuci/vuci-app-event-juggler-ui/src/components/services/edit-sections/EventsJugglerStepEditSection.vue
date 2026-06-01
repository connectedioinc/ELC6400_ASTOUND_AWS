<template>
  <vuci-typed-section
    ref="typeSectionRef"
    :uci-data="uciData"
    :endpoints="[
      {
        endpoint: `event_juggler/events/${props.section.id}/operations/config`,
        sectionFilter: s => section.actions.includes(s.id)
      }
    ]"
    data-key="actions"
    type="action"
    :form-methods="['get']"
    :after-add="handleAfterAdd"
    :after-delete="handleAfterDelete"
    :add-validate="(_: unknown, sections: ActionSection[]) => validateAdd('action', sections)"
    no-edit-after-create
  >
    <template #default="{ dataSource, actions }">
      <tlt-card
        v-for="s in dataSource"
        :key="s.id"
        :ref="el => setCardRefData(el, s.id)"
        :title="$utils.getModalTitle($t('action data'), s?.name)"
        title-space-between
      >
        <template #title-content>
          <vuci-form-edit-delete
            :id="s.id"
            class="lg:min-w-max"
            :delete-btn="section?.actions?.length > 1"
            :edit="false"
            :actions="actions"
          >
            <template #delete="{ delSection }">
              <div :ref="`delete_${s.id}`">
                <tlt-button
                  button-id="delete"
                  type="text"
                  color="error"
                  size="md"
                  icon-left="delete"
                  @click="delSection(s.id)"
                >
                  {{ $t('Remove action') }}
                </tlt-button>
              </div>
            </template>
          </vuci-form-edit-delete>
        </template>
        <main-edit-section
          :uci-data="uciData"
          :section="s"
          edit-type="actions"
          hide-title
        >
          <template v-if="isLastSection(s.id, section.actions)">
            <vuci-form-item-button
              :uci-section="s"
              button-id="add"
              color="primary"
              type="text"
              name="actionAdd"
              label=" "
              @click="handleActionAdd"
            >
              + {{ $t('Add new action') }}
            </vuci-form-item-button>
          </template>
        </main-edit-section>
      </tlt-card>
    </template>
  </vuci-typed-section>
</template>
<script setup lang="ts">
import MainEditSection from './EventsJugglerMainEditSection.vue'
import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import TltCard from '@ui-core/tlt-design/layout/TltCard.vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerData } from '../useEventsJugglerData'
import { type Ref, type ComponentPublicInstance, ref, watch, nextTick } from 'vue'
import type { FormData, EventSection, ActionSection } from '@/types/eventsJugglerTypes'

interface StepEditSectionProps {
  section: EventSection
  uciData: FormData
  formRef: ComponentPublicInstance<typeof VuciForm>
}

const props = defineProps<StepEditSectionProps>()
const $t = useTranslate()
const message = useMessages()

const { updateUciData, updateInitialForm, validateAdd } = useEventsJugglerData()

const tltCardRefs: Ref<{ [key: string]: ComponentPublicInstance<typeof TltCard> | null }> = ref({})
const typeSectionRef: Ref<ComponentPublicInstance<typeof VuciTypedSection> | null> = ref(null)

function setCardRefData(el: ComponentPublicInstance<typeof TltCard>, parentId: string) {
  if (el) {
    tltCardRefs.value[parentId] = el
    return
  }
  delete tltCardRefs.value[parentId]
}

function setCardShrinkedState(currentId: string, sectionIds: string[]) {
  if (!tltCardRefs.value?.[currentId]) return
  tltCardRefs.value[currentId]!.expanded = isLastSection(currentId, sectionIds)
}

function isLastSection(currentId: string, sectionIds: string[]) {
  const numberIds = sectionIds?.map((id: string) => parseInt(id)) || []
  return Math.max(...numberIds) === parseInt(currentId)
}

watch(tltCardRefs.value, value => {
  nextTick(() => {
    Object.keys(value).forEach((id: string) => setCardShrinkedState(id, props.section.actions))
  })
})

function handleActionAdd() {
  return props.formRef.validate().then((res: boolean) => {
    if (res) return typeSectionRef.value?._addSection()
    message.error($t('Some fields are invalid'))
  })
}

function handleAfterAdd(_: unknown, { uciData, newSection }: { uciData: FormData; newSection: ActionSection }) {
  updateUciData(uciData, props.section.id, (eventSection: EventSection) => {
    eventSection.actions.push(newSection.id)
  })
  updateInitialForm(uciData, true)
}

function handleAfterDelete(deletedSection: ActionSection, uciData: FormData) {
  updateUciData(uciData, props.section.id, (eventSection: EventSection) => {
    eventSection.actions = eventSection.actions.filter((actionId: string) => actionId !== deletedSection.id)
  })
  updateInitialForm(uciData, true)
}
</script>
