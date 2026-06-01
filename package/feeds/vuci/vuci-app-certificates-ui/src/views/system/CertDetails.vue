<template>
  <tlt-card :title="$t('Certificate details')">
    <template
      v-for="(field, index) in certificateDetailsFields"
      :key="index"
    >
      <tlt-form-model-item
        v-if="isValidValue(props.certificate[field.key])"
        :element-id="field.key"
        :label="$t(field.label)"
      >
        <tlt-dummy-value :value="formatValue(field.key, props.certificate[field.key])" />
      </tlt-form-model-item>
    </template>
  </tlt-card>
  <tlt-card
    v-if="hasValidFieldsInSection(subjectInformationFields)"
    :title="$t('Subject information')"
  >
    <template
      v-for="(field, index) in subjectInformationFields"
      :key="index"
    >
      <tlt-form-model-item
        v-if="isValidValue(props.certificate[field.key])"
        :element-id="field.key"
        :label="$t(field.label)"
      >
        <tlt-dummy-value :value="formatValue(field.key, props.certificate[field.key])" />
      </tlt-form-model-item>
    </template>
  </tlt-card>
  <tlt-card :title="$t('Certificate properties')">
    <template
      v-for="(field, index) in certificatePropertiesFields"
      :key="index"
    >
      <tlt-form-model-item
        v-if="isValidValue(props.certificate[field.key])"
        :element-id="field.key"
        :label="$t(field.label)"
      >
        <tlt-dummy-value :value="formatValue(field.key, props.certificate[field.key])" />
      </tlt-form-model-item>
    </template>
  </tlt-card>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { localDate } from '@ui-core/plugins/date'
import type { GeneratedCert } from '@/types/certTypes'

const $t = useTranslate()

interface Certificate extends GeneratedCert {
  valid_from?: string
  date?: string
  common_name?: string
  organization?: string
  country?: string
  state?: string
  locality?: string
  email?: string
  key_usage?: string
  subject_key_identifier?: string
  authority_key_identifier?: string
  auto_renew?: boolean
  signed_by?: string
}

type Props = {
  certificate: Certificate
}

type FieldDefinition = {
  key: keyof Certificate
  label: string
}

const props = defineProps<Props>()

const isValidValue = (value: any): boolean => value !== undefined && value !== null && value !== '-'

const certificateDetailsFields: FieldDefinition[] = [
  { key: 'valid_from', label: $t('Issued') },
  { key: 'date', label: $t('Expires') },
  { key: 'encryption', label: $t('Encryption') },
  { key: 'key_size', label: $t('Key size') },
  { key: 'common_name', label: $t('Common name') }
]

const subjectInformationFields: FieldDefinition[] = [
  { key: 'organization', label: $t('Organization') },
  { key: 'country', label: $t('Country') },
  { key: 'state', label: $t('State') },
  { key: 'locality', label: $t('Locality') },
  { key: 'email', label: $t('Email') }
]

const certificatePropertiesFields: FieldDefinition[] = [
  { key: 'type', label: $t('Type') },
  { key: 'cert_type', label: $t('Certificate type') },
  { key: 'name', label: $t('Name') },
  { key: 'fullname', label: $t('Full name') },
  { key: 'key_usage', label: $t('Key usage') },
  { key: 'pass_required', label: $t('Password required') },
  { key: 'subject_key_identifier', label: $t('Subject key identifier') },
  { key: 'authority_key_identifier', label: $t('Authority key identifier') },
  { key: 'auto_renew', label: $t('Automaticaly renewable') },
  { key: 'signed_by', label: $t('Signed by') }
]

const formatValue = (key: string, value: any): string => {
  if (key === 'valid_from' && value) {
    return localDate(new Date(value).getTime() / 1000, { format: 'YYYY-MM-DD' })
  } else if (key === 'encryption' && value) {
    return value.toUpperCase()
  } else if (key === 'pass_required') {
    return value === false ? $t('No') : $t('Yes')
  } else if (key === 'auto_renew') {
    return value ? $t('Yes') : $t('No')
  } else if (key === 'cert_type' && value) {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  if (value === null || value === undefined) {
    return ''
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const hasValidFieldsInSection = (fields: FieldDefinition[]): boolean => {
  return fields.some(field => isValidValue(props.certificate[field.key]))
}
</script>
