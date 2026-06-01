import { useTranslate } from '@ui-core/composables/useI18n'
import { type Ref, inject } from 'vue'
import type { UCISection } from '@ui-core/types'
import type { EventsJugglerOptions, EventSection, ConditionSection, FormData, Plugin, LimitData, ActionSection } from '@/types/eventsJugglerTypes'
type InitialActionSection = Pick<ActionSection, 'id' | '.type' | 'name' | 'plugin'>

export const useEventsJugglerData = () => {
  const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
  const modalData = inject('modalData')

  const eventOptions: Plugin[] = eventsJugglerOptions?.value?.eventOptions || []
  const limitData: LimitData = eventsJugglerOptions?.value?.limitData || { event: 10, action: 10, condition: 10 }

  const $t = useTranslate()

  const translatedModuleTypes: Record<string, string> = {
    // ACTION TYPES
    connection: $t('Connection'),
    exec: $t('Script'),
    http: $t('HTTP'),
    modem: $t('Modem'),
    mqtt: $t('MQTT'),
    wifi: $t('WiFi'),
    profile: $t('Profile change'),
    reboot: $t('Reboot'),
    rms: $t('RMS'),
    shutdown: $t('Shutdown'),
    sim_switch: $t('SIM switch'),
    sms: $t('Send SMS'),
    call: $t('Make a call'),
    smtp: $t('Send email'),
    data_sender: $t('Data to server'),
    led: $t('LED switch'),
    // CONDITION TYPES
    bool: $t('Boolean group'),
    filter: $t('Filter'),
    out: $t('Output'),
    lua: $t('Lua'),
    // EVENT TYPES
    astro_time: $t('Astronomical time'),
    gsm: $t('GSM'),
    hotspot: $t('Hotspot'),
    log: $t('Log'),
    quota: $t('Mobile data limit'),
    boot: $t('Boot'),
    // SHARED TYPES
    gps: $t('GPS'),
    io: $t('I/O'),
    time: $t('Time')
  }

  const translatedFilterValues: Record<string, string> = {
    'io.name': $t('Input name'),
    'io.value': $t('Input value'),
    'io.fvalue': $t('ADC/ACL input value'),
    'io.type': $t('Input type'),
    'io.state': $t('Input state'),
    'event.text': $t('Event text'),
    'event.type': $t('Event type'),
    'quota.interface': $t('Interface name')
  }

  function getTranslatedModuleType(module: string) {
    return translatedModuleTypes[module] || module || $t('Not selected')
  }

  function getTranslatedFilterValues(values: string[]) {
    return values.map((value: string) => [value, translatedFilterValues[value] || value])
  }

  function getConditionOptions(parentSection: EventSection, formData: FormData) {
    const conditionSection = (id: string) => formData?.conditions?.find((conditionSection: ConditionSection) => conditionSection.id === id)
    return parentSection?.available_conditions?.map((id: string) => [id, conditionSection(id)?.name || id]) || []
  }

  function getFilterOptions(parentSection: EventSection) {
    const eventOption = eventOptions.find((option: Plugin) => option.name === parentSection?.plugin)
    let params = Object.keys(eventOption?.params || {})
    if (parentSection?.plugin === 'io' && !parentSection?.io_name?.match(/(acl|adc|pwr)/)) {
      params = params.filter(p => p !== 'io.fvalue')
    }
    return params
  }

  function updateUciData(uciData: FormData, parentSectionId: string, updateFn: (eventSection: EventSection, actionSections: ActionSection[]) => void) {
    const parentSectionIndex = uciData.events.findIndex(section => section.id === parentSectionId)
    const eventSection = uciData.events[parentSectionIndex]
    const actionSections = uciData.actions.filter(section => eventSection.actions?.includes(section.id))
    updateFn(eventSection, actionSections)
  }

  function updateInitialForm(formData: FormData, isStepEdit: boolean) {
    if (isStepEdit) {
      const actions: InitialActionSection[] = formData.actions.map(({ id, name }: ActionSection) => ({ id, '.type': 'action', name, plugin: undefined }))
      formData = { ...formData, actions }
    }
    modalData().vuciForm.initialForm = formData
  }

  const addSectionNameTranlsate = {
    event: $t('Event Juggler'),
    action: $t('Action'),
    condition: $t('Condition')
  }

  function validateAdd(sectionName: 'event' | 'action' | 'condition', sections: UCISection[], customLimit = 0) {
    return {
      valid: (customLimit || limitData[sectionName]) > sections.length,
      message: $t('Maximum number of %s instances has been reached').format(addSectionNameTranlsate[sectionName])
    }
  }

  function updateValue(formData: FormData, editType: 'events' | 'actions' | 'conditions', payload: { option: string; value: string; id: string }) {
    if (!payload.id) return
    const section = formData[editType].find(s => s.id === payload.id)
    if (section) {
      section[payload.option] = payload.value
    }
  }

  return {
    getTranslatedModuleType,
    getTranslatedFilterValues,
    getConditionOptions,
    getFilterOptions,
    updateUciData,
    updateInitialForm,
    validateAdd,
    updateValue
  }
}
