<template>
  <vuci-form
    ref="azureVuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="azure_iothub"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('Azure IoT Hub')"
      :columns="columns"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'azure/iot_hub/config' }]"
      data-key="azure_iothub"
      :edit-form="editForm"
      type="azure_iothub"
      :restricted-values="['name']"
      :after-delete="loadData"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #status="{ s }">
        <tlt-hint
          :hints="getStatusHint(s)"
          expand-to="right"
        >
          <template #title>
            {{ $t('Status') }}
          </template>
          <template #default>
            <tlt-badge
              :test-id="s.id"
              :type="getBadgeColor(s)"
              class="inline"
            >
              {{ getBadgeStatus(s) }}
            </tlt-badge>
          </template>
        </tlt-hint>
      </template>
      <template #connection_type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="connection_type"
          :display-value="getConnectionType"
        />
      </template>
      <template #direct_methods="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="direct_methods_enabled"
          :display-value="getDirectMethods"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnableDisable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script setup lang="ts">
import AzureEditForm from './AzureIotHubEdit'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, useNotifications } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useTimer } from '@ui-core/composables/useTimer'
import { useAzureUtils } from '../../components/services/useAzureUtils'
import { provideAzureContext } from '../../components/services/useAzureContext'
import { $bus } from '@ui-core/plugins/event-bus'
import { ref, markRaw, onUnmounted } from 'vue'
import type { AzureConfig, AzureStatus } from '@/types/azureTypes'
import type { DataSenderCollection, DataSenderOutput } from '@/types/dataSenderTypes'

const $t = useTranslate()
const $message = useMessages()
const notification = useNotifications()

const { connectionTypeOptions, validateDisable } = useAzureUtils()

useTimer({ method: loadStatuses, time: 2000, group: ['edit', 'spinner'] })
notification.info({
  id: 'azure-iothub-info',
  title: $t("Updated 'Azure Iot Hub' configuration"),
  text: $t("Configure data transmission to 'Azure IoT Hub' using the 'Data to Server' service, where active 'Azure IoT Hub' instances can also be utilized."),
  action: {
    text: $t('Go to Data to Server'),
    to: '/services/data_sender'
  }
})

$bus.on('update-data-sender-data', loadData)

onUnmounted(() => {
  $bus.off('update-data-sender-data', loadData)
})

const editForm = markRaw(AzureEditForm)
const formData = ref<{ azure_iothub: AzureConfig[] }>({ azure_iothub: [] })
const azureStatuses = ref<AzureStatus[]>([])
const dsCollections = ref<DataSenderCollection[]>([])
const dsOutputs = ref<DataSenderOutput[]>([])

const columns = [
  { name: 'name', label: $t('Name') },
  { name: 'status', label: $t('Status') },
  { name: 'connection_type', label: $t('Connection type') },
  { name: 'direct_methods', label: $t('Direct Methods') },
  { name: 'enabled', label: $t('Enabled') }
]

const connectionStatus = {
  ok: $t('Connected successfully'),
  'expired sas token': $t('Expired SAS token'),
  'device disabled': $t('Device disabled'),
  'bad credentials': $t('Bad credentials'),
  'retry expired': $t('Retry expired'),
  'no network': $t('No network'),
  'communication error': $t('Communication error'),
  'no ping response': $t('No ping response'),
  'quota exceeded': $t('Quota exceeded')
}

const statusDirectMethods = {
  0: $t('Disabled'),
  1: $t('Enabled')
}

const azureBadgeStatuses = {
  authenticated: $t('Authenticated'),
  unauthenticated: $t('Unauthenticated'),
  default: $t('Disabled')
}

const azureBadgeColors = {
  authenticated: 'success',
  unauthenticated: 'error',
  default: 'disabled'
}

const requireOptionsTranslations = {
  id_scope: $t('ID Scope'),
  registration_id: $t('Registration ID'),
  connection_type: $t('Connection type'),
  connection_string: $t('Connection String'),
  model_id: $t('Device Model ID'),
  global_prov_uri: $t('Global Device Endpoint'),
  x509certificate: $t('X.509 Certificate'),
  x509privatekey: $t('X.509 Private Key'),
  attestation_mechanism: $t('Attestation mechanism'),
  symmetric_key: $t('Symmetric Key')
}

const requireOptions = {
  iotHubType: ['connection_string'],
  plugAndPlay: ['model_id'],
  certs: ['x509certificate', 'x509privatekey'],
  provX509Type: ['id_scope', 'registration_id', 'global_prov_uri'],
  provSymmetricType: ['id_scope', 'registration_id', 'symmetric_key', 'global_prov_uri']
}

provideAzureContext({
  dsCollections,
  dsOutputs
})

function loadStatuses() {
  return axios
    .get('/api/azure/iot_hub/status')
    .then(({ data }) => {
      azureStatuses.value = data
    })
    .catch(() => {
      $message.error($t('Failed to load Azure IoT Hub status'))
    })
}

function loadData() {
  const requests = ['/api/data_to_server/collections/config', '/api/data_to_server/servers/config']
  return axios
    .bulkGet(requests)
    .then(([dsCollectionsRes, dsOutputsRes]) => {
      if (!dsCollectionsRes.success) $message.error($t('Failed to load Data to Server collections'))
      if (!dsOutputsRes.success) $message.error($t('Failed to load Data to Server servers'))
      dsCollections.value = dsCollectionsRes.success ? dsCollectionsRes.data : []
      dsOutputs.value = dsOutputsRes.success ? dsOutputsRes.data : []
    })
    .catch(() => {
      $message.error($t('An unexpected error occurred'))
    })
}

function findMissingOptions(section: AzureConfig, translations: Record<string, string>, options: string[], missingOptions: string[]) {
  const missing = options
    .filter(option => !section[option as keyof AzureConfig] || section[option as keyof AzureConfig] === '')
    .map(option => translations[option])
    .filter(Boolean)
  missingOptions.push(...missing)
}

const optionsMap = {
  iothub: requireOptions.iotHubType,
  provisioning: {
    x509_certificate: requireOptions.provX509Type,
    symmetric_key: requireOptions.provSymmetricType
  }
}
function validateSection(section: AzureConfig) {
  const missingOptions: string[] = []
  let options: string[] | undefined
  if (section.connection_type === 'provisioning') {
    const provOptions = optionsMap[section.connection_type]
    options = provOptions && provOptions[section.attestation_mechanism]
  } else {
    options = optionsMap[section.connection_type as keyof typeof optionsMap] as string[] | undefined
  }

  if (!options) {
    missingOptions.push(requireOptionsTranslations.connection_type)
  } else {
    findMissingOptions(section, requireOptionsTranslations, options, missingOptions)
  }

  if (section.direct_methods_enabled === '1') {
    findMissingOptions(section, requireOptionsTranslations, requireOptions.plugAndPlay, missingOptions)
  }

  return missingOptions
}

function validateCertificate(section: AzureConfig) {
  const missingOptions: string[] = []
  if (section.connection_type === 'provisioning' && section.attestation_mechanism === 'x509_certificate') {
    findMissingOptions(section, requireOptionsTranslations, requireOptions.certs, missingOptions)
  }
  return missingOptions
}

function validateEnableDisable(self: { model: '0' | '1'; uciSection: AzureConfig }) {
  const section = self.uciSection
  return section.enabled === '1' ? validateEnable(self) : validateDisable(self, dsOutputs.value, dsCollections.value)
}

function validateEnable(self: { uciSection: AzureConfig; model?: '0' | '1' }) {
  const missingOptions = validateSection(self.uciSection)
  if (missingOptions && missingOptions.length > 0) {
    self.model = '0'
    return $message.error(generateErrorMessage(missingOptions))
  }
  const missingCerts = validateCertificate(self.uciSection)
  if (missingCerts && missingCerts.length > 0) {
    self.model = '0'
    return $message.error(generateErrorMessage(missingCerts, true))
  }
}

function generateErrorMessage(missingOptions: string[], isFile = false) {
  const itemType = isFile ? (missingOptions.length > 1 ? 'files' : 'file') : missingOptions.length > 1 ? 'options' : 'option'
  return $t('Missing required %s: %s').format(itemType, missingOptions.join(', '))
}

function getDirectMethods(value: number) {
  return statusDirectMethods[value as keyof typeof statusDirectMethods] || statusDirectMethods[0]
}

function getConnectionType(type: string) {
  return connectionTypeOptions.find(([key]) => key === type)?.[1] ?? '-'
}

function getAzureStatus(id: string) {
  return azureStatuses.value.find(section => section.id === id)
}

function getBadgeStatus(section: AzureConfig) {
  const status = getAzureStatus(section.id)?.connection_status
  return azureBadgeStatuses[status as keyof typeof azureBadgeStatuses] || azureBadgeStatuses.default
}

function getBadgeColor(section: AzureConfig) {
  const status = getAzureStatus(section.id)?.connection_status
  return azureBadgeColors[status as keyof typeof azureBadgeColors] || azureBadgeColors.default
}

function getStatusHint(section: AzureConfig) {
  const status = getAzureStatus(section.id)?.connection_status_reason
  return connectionStatus[status as keyof typeof connectionStatus]
}
</script>
