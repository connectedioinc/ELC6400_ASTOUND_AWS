<template>
  <events-juggler-retry-options
    :uci-section="s"
    :is-type-selected="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="http_post"
    :label="$t('Request method')"
    :help="$t('HTTP method to use for the request.')"
    :options="methodOptions"
    :depend="isTypeSelected"
    initial="0"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="http_url"
    :label="$t('Request URL')"
    :help="$t('Destination host URL where data will be sent.')"
    placeholder="example.com/example"
    rules="url"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="http_verify"
    :label="$t('Verify')"
    :help="$t('Verify the validity of certificates. Only works with HTTPS.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="http_ui_params"
    :label="$t('Send parameters as')"
    :help="$t('Choose how to send parameters with the request.')"
    :options="parameterOptions"
    :depend="isTypeSelected"
    initial="0"
  />
  <vuci-form-item-text-area
    :uci-section="s"
    name="http_text"
    :label="$t('Text parameters')"
    :help="$t('Parameters to be sent with the request as text.')"
    initial="Router name - %rn; Time stamp - %ts"
    placeholder="Router name - %rn; Time stamp - %ts"
    maxlength="4096"
    required
    :depend="isTypeSelected && s?.http_ui_params === '0'"
  />
  <EventsJugglerParamList
    v-if="isTypeSelected && s?.http_ui_params === '0'"
    :title="$t('text message parameter list')"
    :list-parameters="getListParameters()"
  />
  <vuci-form-item-custom
    :uci-section="s"
    name="http_params"
    :label="$t('Key-value parameters')"
    :help="$t('Parameters to be sent with the request as key-value pairs.')"
    :input-props="getParameterProps({ placeholder: 'value' })"
    allow-create
    :write-parse="getSaveParameters"
    inputs="input,select"
    separator="="
    maxlines="32"
    :depend="isTypeSelected && s?.http_ui_params === '1'"
    required
  />
  <vuci-form-item-input
    :uci-section="s"
    name="http_timeout"
    :label="$t('Timeout')"
    :help="$t('Timeout for the request in seconds.')"
    :placeholder="'60'"
    rules="irange(0, 3600)"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-list
    :uci-section="s"
    name="http_header"
    :label="$t('Custom HTTP headers')"
    :help="$t('Custom headers for the HTTP requests.')"
    placeholder="Content-Type: application/json"
    maxlength="128"
    maxlines="10"
    rules="string"
    :depend="isTypeSelected"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="http_info_modem_id"
    :label="$t('Modem')"
    :help="$t('Modem ID for information gathering.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="http_tls"
    :label="$t('Use secure connection')"
    :help="$t('Enable TLS for a secure connection. Requires certificate files.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="http_device_files"
    :label="$t('Use certificate files from device')"
    :depend="isTypeSelected && certificatesStore.hasVuciAppCertificates && s?.http_tls === '1'"
  >
    <template #help>
      {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
      <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
      >.
    </template>
  </vuci-form-item-switch>
  <vuci-form-item-upload
    :uci-section="s"
    name="http_cafile"
    :label="$t('Certificate authority file')"
    :help="$t('Upload the Certificate Authority (CA) file. Required for verifying the server\'s certificate.')"
    max-size="16MB"
    required
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    :uci-section="s"
    name="http_certfile"
    :label="$t('Client certificate')"
    :help="$t('Upload the client certificate file. This is used for client authentication by the server.')"
    max-size="16MB"
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    :uci-section="s"
    name="http_keyfile"
    :label="$t('Client private keyfile')"
    :help="$t('Upload the client private key file. This is used along with the client certificate for authentication.')"
    max-size="16MB"
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-select
    :uci-section="s"
    name="http_cafile"
    :label="$t('Certificate authority file')"
    :help="$t('Select the Certificate Authority (CA) file from the device. Required for server certificate verification.')"
    :options="caOptions"
    :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
    required
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="http_certfile"
    :label="$t('Client certificate')"
    :help="$t('Select the client certificate from the device. Used for client authentication by the server.')"
    :options="getCertOptionsForNonRequired"
    :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="http_keyfile"
    :label="$t('Client private keyfile')"
    :help="$t('Select the client private key from the device. Used with the client certificate for authentication.')"
    :options="keyOptionsNonTpm2ForNonRequired"
    :depend="isTypeSelected && s?.http_tls === '1' && s?.http_device_files === '1'"
  />
</template>
<script setup lang="ts">
import EventsJugglerParamList from '../../EventsJugglerParamList.vue'
import EventsJugglerRetryOptions from '../../EventsJugglerRetryOptions.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'

const props = defineProps(moduleProps)

const { isTypeSelected, getCertOptionsForNonRequired, getSaveParameters, getParameterProps, getListParameters } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()

const certificatesStore = useCertificatesStore()
const { caOptions, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()

const methodOptions = [
  { value: '0', name: 'GET' },
  { value: '1', name: 'POST' }
]
const parameterOptions = [
  { value: '0', name: $t('Text parameters') },
  { value: '1', name: $t('Key-value parameters') }
]
</script>
