<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    config="aws_jobs"
  >
    <vuci-typed-section
      type="aws_jobs"
      :title="$t('AWS jobs')"
      :columns="columns"
      :add-validate="validateInstanceCount"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'aws/jobs/config' }]"
      :error-handlers="{ edit: handleEditErrors }"
      data-key="aws_jobs"
      pagination
      @refresh="loadStatuses"
    >
      <template #thing_name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="thing_name"
        />
      </template>

      <template #status="{ s }">
        <tlt-badge :type="getJobStatusColor(s)">
          {{ getJobStatusString(s) }}
        </tlt-badge>
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import EditForm from './AWSJobsEdit'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import { useMessages } from '@/stores/messages'
import { useAwsUtils } from '../../components/services/useAwsUtils'
import { provideAwsJobsContext } from '../../components/services/useAwsJobsContext'
import { ref, markRaw } from 'vue'
import type { AwsJobConfig, AwsJobStatus, AwsProvisioningConfig } from '@/types/awsTypes'

const $t = useTranslate()
const $message = useMessages()

useTimer({ method: loadStatuses, time: 5000, group: ['edit', 'spinner'] })

const { validateProvisioning, validateInstanceCount } = useAwsUtils()

const formData = ref({})
const editModal = markRaw(EditForm)
const jobStatusData = ref<AwsJobStatus[]>([])
const provisioningData = ref<AwsProvisioningConfig[]>([])

provideAwsJobsContext({
  provisioningData
})

const columns = [
  { name: 'thing_name', label: $t("Thing's name"), help: $t("Thing's name on AWS IoT Core platform.") },
  { name: 'status', label: $t('Status'), actions: { filter: { type: 'uniqueValues' } } },
  { name: 'enabled', label: $t('Enabled') }
]

const errorMessages = {
  1: $t('Selected provisioning is missing required options. Please configure it fully.'),
  defaultError: $t('Failed to edit configuration')
}

function loadStatuses() {
  return axios
    .get('/api/aws/jobs/status')
    .then(({ data }) => {
      jobStatusData.value = data
    })
    .catch(() => {
      $message.error($t('Failed to load AWS jobs status'))
    })
}

function validateEnable(self: { uciSection: AwsJobConfig; model: string }) {
  const s = self.uciSection
  if (self.model === '0' || s.enabled !== '1') return
  const requiredEnableOptions: string[] = []
  if (!s.endpoint) requiredEnableOptions.push($t('Endpoint'))
  if (!s.thing_name) requiredEnableOptions.push($t("Thing's name"))
  if (!s.cafile) requiredEnableOptions.push($t('CA file'))
  if (s.aws_provisioning_id === '0' && !s.certfile) requiredEnableOptions.push($t("Thing's certificate"))
  if (s.aws_provisioning_id === '0' && !s.keyfile) requiredEnableOptions.push($t("Thing's private key"))

  if (requiredEnableOptions.length === 1) {
    $message.error($t('Missing required option: %s').format(requiredEnableOptions[0]))
    self.model = '0'
  }
  if (requiredEnableOptions.length > 1) {
    $message.error($t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
    self.model = '0'
  }

  const validationResult = validateProvisioning(
    s.aws_provisioning_id,
    provisioningData.value,
    s,
    $t('The job has a selected provisioning configuration that is missing required options. Please configure it fully')
  )
  if (!validationResult.isValid) {
    $message.error(validationResult.message)
    self.model = '0'
  }
}

function handleEditErrors({ data }: { data: { errors: [{ code: number }] } }) {
  const errorCode = data.errors[0].code
  return errorMessages[errorCode as keyof typeof errorMessages] || errorMessages.defaultError
}

function afterLoad() {
  return axios
    .bulkGet(['/api/aws/provisioning/config', '/api/aws/jobs/status'])
    .then(([provisionRespone, jobStatusResponse]) => {
      if (!provisionRespone.success) $message.error($t('Failed to load AWS provisioning configurations'))
      if (!jobStatusResponse.success) $message.error($t('Failed to load AWS jobs status'))

      provisioningData.value = provisionRespone.success ? provisionRespone.data : []
      jobStatusData.value = jobStatusResponse.success ? jobStatusResponse.data : []
    })
    .catch(() => {
      $message.error($t('An unexpected error occurred'))
    })
}

function getJobStatus(s: AwsJobConfig) {
  return jobStatusData.value.find((status: AwsJobStatus) => status.id === s.id)
}

function getJobStatusColor(s: AwsJobConfig) {
  const status = getJobStatus(s)
  return status ? ['error', 'warning', 'success'][status.state_id] : 'disabled'
}

function getJobStatusString(s: AwsJobConfig) {
  const status = getJobStatus(s)
  s.status = status ? [$t('Not connected'), $t('Connecting'), $t('Connected')][status.state_id] : $t('Disabled')
  return s.status
}
</script>
