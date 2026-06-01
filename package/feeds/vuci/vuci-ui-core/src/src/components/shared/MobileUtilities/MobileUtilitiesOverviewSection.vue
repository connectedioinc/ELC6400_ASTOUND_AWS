<template>
  <vuci-typed-section
    ref="typedSectionRef"
    :title="title"
    :help="help"
    type="rule"
    :columns="mobileUtilitiesColumns"
    :edit-form="editForm"
    :uci-data="uciData"
    :endpoints="[{ endpoint }]"
    :data-key="dataKey"
    :add-title="$t('Add rule')"
    :bulk-actions="[
      {
        id: 'enable',
        label: $t('Enable/Disable'),
        buttonProps: { iconLeft: 'toggle' },
        callback: toggleRulesSwitch
      },
      {
        id: 'set_authorization',
        label: $t('Set authorization'),
        buttonProps: { iconLeft: 'authorized' },
        callback: openAuthorizationModal
      }
    ]"
    :table-actions="['column-list', 'search']"
    search
    pagination
  >
    <template #action="{ s }">
      <slot
        name="action"
        :s="s"
      />
    </template>
    <template #smstext="{ s }">
      <slot
        name="smstext"
        :s="s"
      />
    </template>
    <template #enabled="{ s }">
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        @change="validateEnable"
      />
    </template>
    <template #addForm="{ addModel }">
      <slot
        name="add"
        :add-model="addModel"
      />
      <tlt-form-item-select
        v-model="addModel.action"
        :label="$t('Action')"
        :help="$t('The action to be executed when a rule is triggered.')"
        prop="action"
        :options="getTranslatedActions(mobileUtilitiesOptions.actions)"
      />
    </template>
  </vuci-typed-section>
  <AuthorizationEdit
    :open="authorizationModalData.isAuthorizationModalOpen"
    :endpoint="endpoint"
    :selected-ids="authorizationModalData.selectedIds"
    @close="closeAuthorizationModal"
  />
</template>
<script setup lang="ts">
import AuthorizationEdit from './MobileUtilitiesAuthorizationEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import { type Ref, type Component, type ComponentPublicInstance, computed, inject, provide, ref } from 'vue'
import type { SmsUtilitiesSection, CallUtilitiesSection, MobileUtilitiesOptions, UciDataMap } from '@/types/mobileUtilitiesTypes'
import type { UCISection } from '@ui-core/types'

interface MobileUtilitiesOverviewSectionProps {
  isSmsView?: boolean
  uciData: UciDataMap
  editForm: Component
  endpoint: string
  title: string
  help: string
  dataKey: 'sms_utilities' | 'call_utilities'
  columns?: Record<string, string | Object>[]
  exceptionOptions?: string[]
}

const props = defineProps<MobileUtilitiesOverviewSectionProps>()

const emit = defineEmits(['update-initial-data'])

const $t = useTranslate()
const message = useMessages()

provide('isSmsView', props.isSmsView)
const mobileUtilitiesOptions = inject<Ref<MobileUtilitiesOptions>>('mobileUtilitiesOptions') || ref({ actions: [] })

const { getTranslatedAction, getTranslatedActions, validateEnableIO } = useMobileUtilitiesUtils(props.isSmsView)

const typedSectionRef: Ref<ComponentPublicInstance<typeof VuciTypedSection> | null> = ref(null)

const defaultColumns = [
  {
    name: 'action',
    label: $t('Action name'),
    help: $t('The name of the action that will be executed when a rule is satisfied.'),
    displayFn: getTranslatedAction,
    actions: { filter: { type: 'uniqueValues' } }
  },
  { name: 'enabled', label: $t('Enabled') }
]

const mobileUtilitiesColumns = computed(() => {
  return [...defaultColumns, ...(props.columns || [])]
})

// Enable validation
function validateEnable(self: { uciSection: UCISection; model: string }) {
  const { model, uciSection: section } = self
  const { enabled } = section

  if (model === '0' || enabled !== '1') return

  const requiredEnableOptions: string[] = []
  validateAllowedPhone(section, requiredEnableOptions)

  if (props.isSmsView) {
    validateSMSAction(section, requiredEnableOptions)
    if (!isPasswordSet(section)) requiredEnableOptions.push($t('Password'))
  } else {
    validateCallAction(section, requiredEnableOptions)
  }

  const errorMessage = generateErrorMessage(requiredEnableOptions)
  if (errorMessage) {
    message.error(errorMessage)
    self.model = '0'
  }
  validateEnableIO(self)
}

function validateAllowedPhone(section: UCISection, requiredEnableOptions: string[]) {
  if (section.allowed_phone === 'single' && !section.tel) {
    requiredEnableOptions.push($t('Phone number'))
    return
  }
  if (section.allowed_phone === 'group' && !section.group) {
    requiredEnableOptions.push($t('Phone group'))
    return
  }
}

function isPhoneNumberSet(section: UCISection) {
  return !(section.to_other_phone === '1' && (!section.to_number || section.to_number.every((number: string) => number === '')))
}

function isPasswordSet(section: UCISection) {
  return section.authorization !== 'local' || section['password:set'] === '1' || section.password
}

const validateSMSAction = (section: UCISection, requiredEnableOptions: string[]) => {
  if (!section.smstext) requiredEnableOptions.push($t('SMS text'))
  switch (section.action) {
    case 'vpnstatus':
    case 'list_of_profile':
    case 'monitoring_status':
    case 'uci':
    case 'rms_status':
    case 'gps_coordinates':
      if (!isPhoneNumberSet(section)) requiredEnableOptions.push($t('Phone number(s)'))
      break
    case 'send_status':
      if (!isPhoneNumberSet(section)) requiredEnableOptions.push($t('Phone number(s)'))
      if (!section.message) requiredEnableOptions.push($t('Message text'))
      break
    case 'wol':
      if (!section.mac) requiredEnableOptions.push($t('MAC address'))
      break
    case 'exec':
      if (!isPhoneNumberSet(section)) requiredEnableOptions.push($t('Phone number(s)'))
      if (!section.script) requiredEnableOptions.push($t('Custom script'))
      break
    case 'io_set':
      if (!section.io) requiredEnableOptions.push($t('I/O'))
      if (!section.value) requiredEnableOptions.push($t('State'))
      if (section.timeout === '1' && !section.seconds) requiredEnableOptions.push($t('Seconds'))
      break
    case 'reboot':
      if (section.status_sms === '1' && !isPhoneNumberSet(section)) requiredEnableOptions.push($t('Phone number(s)'))
      if (section.status_sms === '1' && !section.message) requiredEnableOptions.push($t('Message text'))
      break
    case 'mobile':
    case 'wifi':
    case 'vpn':
    case 'gps':
    case 'rms_action':
      if (!section.value) requiredEnableOptions.push($t('State'))
      break
  }
}

const validateCallAction = (section: UCISection, requiredEnableOptions: string[]) => {
  switch (section.action) {
    case 'wifi':
    case 'mobile':
      if (!section.value) requiredEnableOptions.push($t('State'))
      break
    case 'send_status':
      if (!section.message) requiredEnableOptions.push($t('Message text'))
      break
    case 'reboot':
      if (section.status_sms === '1' && !section.message) requiredEnableOptions.push($t('Message text'))
      break
    case 'dout':
    case 'relay':
      if (!section.value) requiredEnableOptions.push($t('State'))
      if (section.timeout === '1' && !section.seconds) requiredEnableOptions.push($t('Seconds'))
      if (!section.pin) requiredEnableOptions.push($t('Output'))
      break
  }
}

function generateErrorMessage(requiredEnableOptions: string[]) {
  if (requiredEnableOptions.length === 1) return $t('Missing required option: %s').format(requiredEnableOptions)
  if (requiredEnableOptions.length > 1) return $t('Missing required options: %s').format(requiredEnableOptions.join(', '))
}
// Enable validation

function toggleRulesSwitch(selectedIds: string[]) {
  const selectedRules = props.uciData[props.dataKey]?.filter((rule: SmsUtilitiesSection | CallUtilitiesSection) => selectedIds.includes(rule.id)) || []
  const everySelectedRuleEnabled = selectedRules.every((rule: SmsUtilitiesSection | CallUtilitiesSection) => rule.enabled === '1')
  selectedRules?.forEach((rule: SmsUtilitiesSection | CallUtilitiesSection) => (rule.enabled = everySelectedRuleEnabled ? '0' : '1'))
}

const authorizationModalData = ref<{ isAuthorizationModalOpen: boolean; selectedIds: string[] }>({ isAuthorizationModalOpen: false, selectedIds: [] })

function openAuthorizationModal(selectedIds: string[]) {
  authorizationModalData.value = { isAuthorizationModalOpen: true, selectedIds }
}
function closeAuthorizationModal(onSave: boolean) {
  authorizationModalData.value = { isAuthorizationModalOpen: false, selectedIds: [] }
  if (!onSave) return
  return typedSectionRef.value?.reloadData().then(() => emit('update-initial-data'))
}
</script>
