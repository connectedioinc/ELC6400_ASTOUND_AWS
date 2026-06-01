<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="event_juggler"
    :extra-load="handleExtraLoad"
    :after-load="handleDataLoad"
  >
    <vuci-typed-section
      ref="typeSectionRef"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'event_juggler/events/config' }]"
      :title="$t('Event juggler')"
      data-key="events"
      type="event"
      :edit-form="{ onEdit: editComponent, onAdd: addComponent }"
      :edit-form-props="{
        editType
      }"
      :add-title="$t('Add new event instance')"
      :after-save="handleAfterSave"
      :after-add="handleAfterAdd"
      :after-delete="handleAfterDelete"
      :add-validate="(_: unknown, sections: EventSection[]) => validateAdd('event', sections, eventsJugglerOptions?.limitData?.event || 10)"
      searchable
      @search="(v: string) => (searchValue = v)"
    >
      <template #custom-design="{ s, actions, index }">
        <events-juggler-card
          v-if="filteredEventIds.includes(s.id)"
          :key="index"
          :uci-data="uciData"
          :section="s"
          class="mb-4"
          :card-states="cardStates"
          @update-card-ids="handleCardIdUpdate"
        >
          <template #enable>
            <vuci-form-item-switch
              :uci-section="s"
              name="enabled"
            />
          </template>
          <template #conditions>
            <vuci-form-item-button
              :uci-section="s"
              name="addAction"
              :text="$t('Conditions')"
              icon-left="settings"
              type="text"
              size="sm"
              no-write
              @click="openConditionEdit(s)"
            />
          </template>
          <template #actions>
            <vuci-form-edit-delete
              :id="s.id"
              :actions="actions"
            />
          </template>
          <template #dropdown>
            <button
              :test-id="`button-toggle-section-event-juggler-${s.id}`"
              type="button"
              @click="() => toggleDropdown(s.id)"
            >
              <tlt-icon
                icon="dropdown-arrow"
                :class="{ 'rotate-180': cardStates[s.id] }"
              />
            </button>
          </template>
        </events-juggler-card>
        <div v-if="!filteredEventIds.length && index === 0">
          {{ $t('No events found') }}
        </div>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script setup lang="ts">
import EditForm from './EventsJugglerMainEdit.vue'
import EditConditionForm from './EventsJugglerConditionEdit.vue'
import AddForm from './EventsJugglerStepEdit.vue'
import EventsJugglerCard from '../../components/services/EventsJugglerCard.vue'
import VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { useEventsJugglerData } from '../../components/services/useEventsJugglerData'
import { mobile } from '@/plugins/mobile'
import { io } from '@/plugins/io'
import { network } from '@/plugins/network'
import { $bus } from '@ui-core/plugins/event-bus'
import getModuleData from '../../components/services/modules/EventsJugglerModuleLoader'
import { type Ref, type ComponentPublicInstance, ref, onMounted, onUnmounted, provide, computed, markRaw, watch } from 'vue'
import type { EventsJugglerOptions, BaseOption, FormData, EventSection, ActionSection, ConditionSection, ModuleOptions, MappedModules } from '@/types/eventsJugglerTypes'
import { withCertificatesLoaded } from '@/plugins/certificates'
import { useRoute } from 'vue-router'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const route = useRoute()
const { getTranslatedModuleType, validateAdd } = useEventsJugglerData()

const typeSectionRef: Ref<ComponentPublicInstance<typeof VuciTypedSection> | null> = ref(null)

const filteredModules: Ref<MappedModules> = ref({
  events: [],
  actions: [],
  conditions: []
})
const eventOptions: Ref<ModuleOptions['events']> = ref({ plugins: [], log_events: {}, params: {} })
const formData: Ref<FormData> = ref({ events: [], actions: [], conditions: [] })
const eventsJugglerOptions: Ref<EventsJugglerOptions> = ref({
  ioData: [],
  profileOptions: [],
  certificateData: [],
  phoneGroupOptions: [],
  emailGroupOptions: [],
  eventsReportingOptions: {
    params: [],
    events: {}
  },
  quotaLimitOptions: [],
  interfaceOptions: [],
  eventOptions: [],
  modules: {
    events: [],
    actions: [],
    conditions: []
  },
  modemData: [],
  modemOptions: [],
  simCount: 0,
  limitData: { event: 10, action: 10, condition: 10 },
  isPhoneSettingsEnabled: false
})

provide('eventsJugglerOptions', eventsJugglerOptions)

const editType = ref<keyof typeof components>(route.hash?.match(/^#[a-zA-Z]+=.+?(?:\/([^/]+))?$/)?.[1] === 'conditions' ? 'conditions' : 'events')

const addComponent = markRaw(AddForm)

const components = {
  events: markRaw(EditForm),
  conditions: markRaw(EditConditionForm)
} as const
const searchValue = ref('')

const editComponent = computed(() => components[editType.value])

const filteredEventIds = computed(() => {
  if (!searchValue.value) {
    return formData.value.events.map(event => event.id)
  }
  return formData.value.events.filter(event => matchesEventOrAction(event, formData.value.actions, searchValue.value)).map(event => event.id)
})

const cardStates = ref<Record<string, boolean>>({})

onMounted(() => {
  $bus.on('event-juggler-reset-edit', resetEditType)
  return getModuleData().then(({ filteredModuleComponents, availableOptions }: { filteredModuleComponents: MappedModules; availableOptions: ModuleOptions }) => {
    filteredModules.value = filteredModuleComponents
    eventOptions.value = availableOptions.events
  })
})

onUnmounted(() => {
  $bus.off('event-juggler-reset-edit', resetEditType)
})

function handleDataLoad(form: FormData) {
  const requests = ['/api/event_juggler/operations/config', '/api/event_juggler/conditions/config']
  return axios
    .bulkGet(requests)
    .then(([actions, conditions]) => {
      if (!actions.success) message.error($t('Failed to load action data'))
      if (!conditions.success) message.error($t('Failed to load condition data'))
      handleCardStateUpdate(form?.events?.map(event => event.id))
      return { ...form, actions: actions.success ? actions.data : [], conditions: conditions.success ? conditions.data : [] }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function handleExtraLoad() {
  const requests = [
    { endpoint: '/api/io/status', condition: store?.board?.hwinfo?.ios },
    '/api/profiles/config',
    { endpoint: '/api/recipients/phone_groups/config', condition: store?.board?.hwinfo?.mobile },
    '/api/recipients/email_users/config',
    { endpoint: '/api/data_limit/status', condition: ['quota_limit', 'mobifd'] },
    '/api/interfaces/config',
    '/api/event_juggler/options',
    { endpoint: '/api/modems/status', condition: 'mobifd.control' },
    { endpoint: '/api/phone_settings/config/general', condition: 'vuci-app-phone-settings-api.control' }
  ]
  return withCertificatesLoaded(
    axios
      .bulkGet(requests)
      .then(([ios, profiles, phoneGroups, emailGroups, quotaLimit, interfaces, eventJugglerLimit, modemsResponse, phoneSettings]) => {
        if (!ios.success) message.error($t('Failed to load I/O data'))
        if (!profiles.success) message.error($t('Failed to load profile data'))
        if (!phoneGroups.success) message.error($t('Failed to load phone group data'))
        if (!emailGroups.success) message.error($t('Failed to load email group data'))
        if (!quotaLimit.success) message.error($t('Failed to load quota limit data'))
        if (!interfaces.success) message.error($t('Failed to load interfaces data'))
        if (!eventJugglerLimit.success) message.error($t('Failed to load event juggler limit data'))
        if (!modemsResponse.success) message.error($t('Failed to load modem data'))
        if (!phoneSettings.success) message.error($t('Failed to load phone settings data'))
        const modemData = modemsResponse.success ? mobile.parseModems(modemsResponse.data) : []
        eventsJugglerOptions.value = {
          ioData: ios.success ? io.getFilteredPinsInfo(ios.data || []) : [],
          profileOptions: profiles.success ? profiles.data.map((profile: BaseOption) => [profile.id, profile.id]) : [],
          phoneGroupOptions: phoneGroups.success ? phoneGroups.data.map((group: BaseOption) => group.name) : [],
          emailGroupOptions: emailGroups.success ? emailGroups.data.map((group: BaseOption) => group.name) : [],
          eventsReportingOptions: { events: eventOptions.value.log_events, params: eventOptions.value.params },
          quotaLimitOptions: quotaLimit.success ? quotaLimit.data.map((iface: BaseOption) => [iface.id, iface.id]) : [],
          interfaceOptions: interfaces.success ? interfaces.data.map(network.getName) : [],
          eventOptions: eventOptions.value.plugins,
          modemData,
          modemOptions: mobile.modemsOptions(modemData),
          simCount: store?.board?.modems?.[0]?.simcount ?? 0,
          modules: filteredModules.value,
          limitData: eventJugglerLimit.success ? eventJugglerLimit.data : {},
          isPhoneSettingsEnabled: phoneSettings.success ? phoneSettings.data.enabled === '1' : false
        }
      })
      .catch(() => {
        message.error($t('An unexpected error occurred'))
      })
  )
}

function handleActionLoad(parentSection: EventSection): Promise<ActionSection> {
  store.spin($t('Loading action data'))
  return axios
    .get(`/api/event_juggler/events/${parentSection.id}/operations/config/${parentSection.actions[0]}`)
    .then(({ data }) => data)
    .catch(() => {
      message.error($t('Failed to load action data'))
    })
    .finally(() => {
      store.spin(false)
    })
}

async function handleAfterAdd(_: unknown, { uciData, newSection }: { uciData: FormData; newSection: EventSection }) {
  const newActionSection = await handleActionLoad(newSection)
  uciData.actions.push(newActionSection)
}

function handleAfterDelete(eventSection: EventSection) {
  const { available_conditions = [], actions = [] } = eventSection
  removeChildSections('actions', actions)
  removeChildSections('conditions', available_conditions)
}

watch(searchValue, newValue => {
  if (newValue || newValue === '') {
    handleCardStateUpdate()
  }
})

function handleAfterSave() {
  handleCardStateUpdate()
}

function removeChildSections(childKey: 'actions' | 'conditions', removeIds: string[]) {
  formData.value[childKey] = formData.value[childKey].filter((section: ActionSection | ConditionSection) => !removeIds.includes(section.id))
}

function openConditionEdit(section: EventSection) {
  editType.value = 'conditions'
  return typeSectionRef.value?._openEdit(section.id, null, 'edit', 'conditions')
}

function handleCardStateUpdate(cardIds: string[] = filteredEventIds.value, resetStates: boolean = true) {
  cardStates.value = Object.fromEntries(cardIds.map((id, index) => [id, resetStates ? index === 0 : index === 0 || cardStates.value[id]]))
}

function toggleDropdown(id: string) {
  cardStates.value[id] = !cardStates.value[id]
}

function resetEditType() {
  editType.value = 'events'
}

const searchKeyMap: Record<string, Function | null> = {
  name: null,
  plugin: getTranslatedModuleType
}

function matchesSearchedData(data: EventSection | ActionSection, lowerCaseSearch: string) {
  return Object.entries(searchKeyMap).some(([searchKey, getPrettyValue]) => {
    const searchKeyValue = getPrettyValue?.(data[searchKey]) || data[searchKey]
    if (!searchKeyValue) return
    return String(searchKeyValue)?.toLowerCase()?.includes(lowerCaseSearch)
  })
}

function matchesEventOrAction(event: EventSection, actions: ActionSection[], search: string) {
  const lowerCaseSearchTerm = search.toLowerCase()

  if (matchesSearchedData(event, lowerCaseSearchTerm)) return true
  if (actions.find(action => event.actions.includes(action.id) && matchesSearchedData(action, lowerCaseSearchTerm))) return true
  return false
}

function handleCardIdUpdate() {
  const filteredIds = filteredEventIds.value
  const cardStateIds = Object.keys(cardStates.value)
  if (filteredIds.length !== cardStateIds.length) {
    handleCardStateUpdate(filteredIds, false)
  }
}
</script>
