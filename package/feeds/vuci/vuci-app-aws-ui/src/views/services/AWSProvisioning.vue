<template>
  <vuci-form
    v-slot="{ uciData }"
    config="aws_jobs"
  >
    <vuci-typed-section
      type="aws_provisioning"
      :title="$t('AWS provisioning')"
      :columns="columns"
      :add-validate="validateInstanceCount"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'aws/provisioning/config' }]"
      data-key="aws_provisioning"
      :table-actions="['column-list', 'search']"
      :form-methods="['get', 'delete', 'create']"
      :error-handlers="{ delete: handleDeleteErrorMessage }"
      pagination
    >
      <template #template="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="template"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import EditForm from './AWSProvisioningEdit'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useAwsUtils } from '../../components/services/useAwsUtils'
import { markRaw } from 'vue'

const $t = useTranslate()

const { validateInstanceCount } = useAwsUtils()

const editModal = markRaw(EditForm)

const columns = [{ name: 'template', label: $t('Template'), help: $t('Name of Fleet provisioning template in AWS service.') }]

const errorMessages = {
  1: $t('Cannot delete this provisioning configuration because it is used by a job %s'),
  defaultError: $t('Failed to edit configuration')
}

function handleDeleteErrorMessage({ data }: { data: { errors: [{ code: number; value: { job_thing_name?: string } }] } }) {
  const { code, value } = data.errors[0]
  const thingName = value?.job_thing_name
  return errorMessages[code as keyof typeof errorMessages]?.format(thingName ? `(${thingName})` : '') || errorMessages.defaultError
}
</script>
