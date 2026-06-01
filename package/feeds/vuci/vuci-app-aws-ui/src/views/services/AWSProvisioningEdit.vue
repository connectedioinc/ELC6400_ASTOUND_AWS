<template>
  <vuci-form
    v-slot="{ uciData }"
    config="aws_jobs"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      data-key="aws_provisioning"
      :endpoints="[{ endpoint: 'aws/provisioning/config' }]"
      :title="$utils.getModalTitle($t('AWS provisioning'), section.template)"
    >
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Template')"
        :help="$t('Name of Fleet provisioning template in AWS service.')"
        name="template"
        :rules="['fieldvalidation(\'^[A-Za-z0-9_-]+$\')', alphanumStartEndValidation]"
        maxlength="36"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="type"
        :label="$t('Fleet provisioning type')"
        :options="[
          ['1', $t('Provisioning by claim')],
          ['2', $t('Provisioning by trusted user')]
        ]"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="creation_type"
        :label="$t('Creation type')"
        :help="$t('Specifies the AWS API to be used for certificate creation.')"
        :options="[
          ['1', 'CreateKeysAndCertificate'],
          ['2', 'CreateCertificateFromCsr']
        ]"
      />
      <vuci-form-item-upload
        name="certfile"
        :label="$t('Provisioning claim certificate')"
        :uci-section="s"
        max-size="16MB"
        :depend="s.type === '1'"
        required
      />
      <vuci-form-item-upload
        name="keyfile"
        :label="$t('Provisioning claim private key')"
        :uci-section="s"
        max-size="16MB"
        :depend="s.type === '1'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Access key')"
        :help="$t('Trusted user\'s access key.')"
        name="access_key"
        :rules="['fieldvalidation(\'^[A-Z0-9]+$\')', (v: string) => rules.exact_length(v, [20])]"
        :depend="s.type === '2'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Secret key')"
        :help="$t('Trusted user\'s secret key.')"
        name="secret_key"
        :rules="['defaulttype', (v: string) => rules.exact_length(v, [40])]"
        :depend="s.type === '2'"
        required
      />
      <tlt-form-accordion name="aws_provisioning_advanced_settings">
        <vuci-form-item-custom
          ref="paramRef"
          :uci-section="s"
          name="param"
          :label="$t('Parameters')"
          :help="$t('Parameters which will be sent along with the certificate creation request. They will be formatted as JSON values (%s).').format('&quot;Key&quot;: &quot;Value&quot;')"
          :headers="[$t('Key'), $t('Value')]"
          inputs="input,input"
          :input-props="paramInputProps"
          separator=":"
          allow-create
          :write-parse="saveParameters"
        />
        <tlt-form-accordion
          name="text-parameters"
          :title="$t('device parameter list')"
        >
          <tlt-form-model-item>
            <t-parameters class="w-full">
              <strong>{{ $t('Device parameter list') }}:</strong>
              <t-parameters-list>
                <t-parameters-list-item
                  v-for="param in formatParameterNames"
                  :key="param.parameter"
                  v-bind="param"
                />
              </t-parameters-list>
            </t-parameters>
          </tlt-form-model-item>
        </tlt-form-accordion>
      </tlt-form-accordion>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { rules } from '@/validation-rules'
import { computed, useTemplateRef, type ComputedRef } from 'vue'
import type { AwsProvisioningConfig } from '@/types/awsTypes'

defineProps<{
  section: AwsProvisioningConfig
}>()

const $t = useTranslate()

const paramRef = useTemplateRef('paramRef')

const formatParameterNamesSet = {
  '%device%': $t('Device name'),
  '%mac%': $t('MAC address'),
  '%maceth%': $t('WAN MAC address'),
  '%batch%': $t('Batch'),
  '%hwver%': $t('Hardware version'),
  '%serial%': $t('Serial number'),
  '%time%': $t('Time now'),
  '%thing%': $t('AWS Thing name')
}

const isParamInputRequired: ComputedRef<boolean> = computed(() => paramRef.value?.modelValues?.some((v: string[]) => (v[0] === '' && v[1] !== '') || (v[0] !== '' && v[1] === '')) || false)
const formatParameterNames = computed(() => Object.entries(formatParameterNamesSet).map(([parameter, description]) => ({ parameter, description })))

const paramInputProps = computed(() => [
  {
    prop: 'KeyInput',
    rules: ["fieldvalidation('^[a-zA-Z0-9:%%_-]+$')", validateParam],
    required: isParamInputRequired.value
  },
  {
    prop: 'ValueInput',
    rules: ["fieldvalidation('^[a-zA-Z0-9:%%_-]+$')", validateParam],
    required: isParamInputRequired.value
  }
])

function alphanumStartEndValidation(value: string) {
  return {
    isValid: !(!/^[A-Za-z0-9]/.test(value) || !/[A-Za-z0-9]$/.test(value)),
    message: $t('Value must start and end with an alphanumeric character')
  }
}

function saveParameters(params: string[]) {
  return params ? params.join(':') : ''
}

function validateParam(vv: string) {
  const count = vv.split('%').length - 1
  if (count % 2 !== 0) {
    return {
      isValid: false,
      message: $t('Invalid value (missing % variable)')
    }
  }

  for (const variable_name of vv.matchAll(/%([^%]*)%/g)) {
    if (!formatParameterNamesSet[`%${variable_name[1]}%` as keyof typeof formatParameterNamesSet]) {
      return {
        isValid: false,
        message: $t('Parameter %s is invalid, see available parameters below.').format(`%${variable_name[1]}%`)
      }
    }
  }
  return { isValid: true }
}
</script>
