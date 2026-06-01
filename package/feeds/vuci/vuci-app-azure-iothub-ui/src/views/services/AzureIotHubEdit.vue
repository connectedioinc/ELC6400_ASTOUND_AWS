<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="vuciFormRef"
    v-model="formData"
    config="azure_iothub"
    :before-save="onBeforeSave"
    :success-save-message="successSaveMsg"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      ref="namedSection"
      :name="section.id"
      :title="$utils.getModalTitle($t('Azure IotHub instance'), section.name)"
      :uci-data="uciData"
      data-key="azure_iothub"
      :endpoints="[{ endpoint: 'azure/iot_hub/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Azure IoT service.')"
        name="enabled"
        @change="(self: { model: '0' | '1'; uciSection: AzureConfig }) => validateDisable(self, dsOutputs, dsCollections)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        name="name"
        maxlength="256"
        :rules="['uciname', validateDuplicateName]"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable Direct Methods')"
        :help="$t('Enable Direct Method feature set.')"
        name="direct_methods_enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Device Model ID')"
        :help="$t('Model ID of the Digital Twins Definition Language.')"
        name="model_id"
        :depend="s.direct_methods_enabled === '1'"
        :required="s.enabled === '1'"
        :initial="deviceModelPlaceholder"
        :placeholder="deviceModelPlaceholder"
        maxlength="256"
      />
      <vuci-form-item-select
        :uci-section="s"
        :help="$t('Connection type to an existing IoT Hub.')"
        :label="$t('Connection type')"
        name="connection_type"
        :options="connectionTypeOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Connection String')"
        :help="$t('Connection string based on primary key used in API calls which allows device to communicate with IoT Hub.')"
        maxlength="4096"
        name="connection_string"
        :depend="s.connection_type === 'iothub'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('ID Scope')"
        :help="$t('Unique identifier that is assigned to an Azure IoT Hub during its creation and is used to uniquely identify the specific provisioning service the device will register through.')"
        maxlength="100"
        name="id_scope"
        placeholder="0ne00000000"
        :depend="s.connection_type === 'provisioning'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Registration ID')"
        :help="$t('The registration ID is used to uniquely identify a device registration with the Device Provisioning Service.')"
        maxlength="128"
        name="registration_id"
        :depend="s.connection_type === 'provisioning'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Global Device Endpoint')"
        :help="$t('Destination for messages sent by IoT devices to the Azure IoT Hub.')"
        name="global_prov_uri"
        :depend="s.connection_type === 'provisioning'"
        :required="s.enabled === '1'"
        initial="global.azure-devices-provisioning.net"
        placeholder="global.azure-devices-provisioning.net"
      />
      <vuci-form-item-select
        :uci-section="s"
        :help="$t('Method used to confirm a device\'s identity in Device Provisioning Service.')"
        :label="$t('Attestation mechanism')"
        name="attestation_mechanism"
        :options="attestationType"
        :depend="s.connection_type === 'provisioning'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Symmetric Key')"
        :help="$t('The derived device key from the DPS Primary Key.')"
        maxlength="128"
        name="symmetric_key"
        :depend="s.connection_type === 'provisioning' && s.attestation_mechanism === 'symmetric_key'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-upload
        ref="x509certificateRef"
        :uci-section="s"
        name="x509certificate"
        :label="$t('X.509 Certificate')"
        :help="$t('Upload the &quot;leaf&quot; certificate file.')"
        :depend="s.connection_type === 'provisioning' && s.attestation_mechanism === 'x509_certificate'"
        max-size="16MB"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-upload
        ref="x509privatekeyRef"
        :uci-section="s"
        name="x509privatekey"
        :label="$t('X.509 Private Key')"
        :help="$t('Upload the &quot;leaf&quot; key file.')"
        :depend="s.connection_type === 'provisioning' && s.attestation_mechanism === 'x509_certificate'"
        max-size="16MB"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import { brand } from '@ui-core/plugins/brand'
import { $bus } from '@ui-core/plugins/event-bus'
import { useAzureConnectionUtils } from '@/composables/useAzureConnectionUtils'
import { useAzureUtils } from '../../components/services/useAzureUtils'
import { useAzureContext } from '../../components/services/useAzureContext'
import { ref, computed, useTemplateRef } from 'vue'
import type { AzureConfig, AzureFormData } from '@/types/azureTypes'

const $t = useTranslate()
const $message = useMessages()
const store = useMainStore()
const prompt = usePrompt()

const props = defineProps<{
  section: AzureConfig
}>()

const vuciFormRef = useTemplateRef('vuciFormRef')
const inputRefMap = {
  x509certificate: useTemplateRef('x509certificateRef'),
  x509privatekey: useTemplateRef('x509privatekeyRef')
}

const { connectionTypeOptions, validateDisable } = useAzureUtils()
const { validateConnection, generateErrorMessage } = useAzureConnectionUtils()
const { dsCollections, dsOutputs } = useAzureContext()

const formData = ref<AzureFormData>({ azure_iothub: [] })
const successSaveMsg = ref<string>('')
const attestationType = [
  ['x509_certificate', $t('X.509 certificates')],
  ['symmetric_key', $t('Symmetric Key')]
]
const ignoredKeys = ['enabled', 'name', 'id', '.type', 'old', 'x509certificate:file_size', 'x509privatekey:file_size']

const deviceModelPlaceholder = computed(() => `dtmi:${brand.text('companyShort')}:genericDevice;1`)
const promptContent = computed(() =>
  props.section.enabled !== '1'
    ? $t(
        "Identical 'Azure IoT Hub' instance configuration detected in the 'Data To Server' service. Merging will incorporate this instance into the 'Data to Server' collection and activate it for use. If you choose to cancel, a configuration update will be required. Do you wish to proceed with the merge?"
      )
    : $t(
        "Identical 'Azure IoT Hub' instance configuration detected in the 'Data To Server' service. Merging will incorporate this instance into the 'Data to Server' collection. If you choose to cancel, a configuration update will be required. Do you wish to proceed with the merge?"
      )
)

function validateDuplicateName(val: string) {
  const instances = formData.value.azure_iothub?.filter(s => props.section.id !== s.id && s.name === val) ?? []
  return {
    isValid: instances.length === 0,
    message: $t("Name '%s' already exists").format(val)
  }
}

function filterSectionData() {
  return Object.fromEntries(Object.entries(props.section).filter(([key, value]) => !ignoredKeys.includes(key) && Boolean(value)))
}

async function linkSection(obj: { fromDataSender: boolean }) {
  store.spin($t('Merging...'))
  if (obj.fromDataSender && props.section.x509certificate && props.section.x509privatekey) {
    const fileUpload = await vuciFormRef.value?.handleFileUpload()
    if (!fileUpload) {
      return $message.error($t('Failed to upload files'))
    }
  }
  let isSuccessful = true
  const linkData = filterSectionData()
  const formDataIndex = formData.value.azure_iothub?.findIndex(data => props.section.id === data.id)
  await axios
    .post(`/api/azure/iot_hub/actions/merge/${props.section.id}`, { data: linkData })
    .then(({ data }) => {
      Object.keys(props.section).forEach(key => {
        if (!data[key]) return
        if (Object.keys(inputRefMap).includes(key) && !props.section[key as keyof AzureConfig]) {
          inputRefMap[key as keyof typeof inputRefMap].value?.setInputValue(data[key])
        }
        if (formData.value.azure_iothub && formDataIndex !== undefined && formDataIndex >= 0) {
          ;(formData.value.azure_iothub[formDataIndex] as Record<string, unknown>)[key] = data[key]
        }
      })
      successSaveMsg.value = $t('Merged successfully')
    })
    .catch(() => {
      isSuccessful = false
    })
    .finally(() => {
      store.spin(false)
    })

  return isSuccessful
}

function onBeforeSave() {
  const azureSections = formData.value.azure_iothub?.filter(s => props.section.id !== s.id) ?? []
  const obj = validateConnection(props.section, azureSections, dsOutputs.value, dsCollections.value)
  return new Promise((resolve, reject) => {
    const errorMsg = generateErrorMessage(obj)
    if (!obj.fromDataSender && errorMsg) {
      return reject(errorMsg)
    }
    if (obj.fromDataSender) {
      return prompt.show({
        title: $t('Merge'),
        content: promptContent.value,
        okText: $t('Merge'),
        cancelText: $t('Cancel'),
        onOk: async () => {
          const isSuccessful = await linkSection(obj)
          if (isSuccessful) {
            $bus.emit('update-data-sender-data')
            return resolve(true)
          }
          return reject($t('Failed to merge'))
        }
      })
    }
    resolve(true)
  })
}
</script>
