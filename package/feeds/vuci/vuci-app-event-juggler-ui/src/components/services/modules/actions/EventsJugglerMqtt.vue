<template>
  <vuci-form-item-text-area
    :uci-section="s"
    name="mqtt_text"
    :label="$t('Text message')"
    :help="$t('Text parameters to be sent with the message.')"
    initial="Router name - %rn; Time stamp - %ts"
    placeholder="Router name - %rn; Time stamp - %ts"
    maxlength="4096"
    required
    :depend="isTypeSelected"
  />
  <EventsJugglerParamList
    v-if="isTypeSelected"
    :title="$t('text message parameter list')"
    :list-parameters="getListParameters()"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_topic"
    :label="$t('Topic')"
    :help="$t('MQTT topic used for publishing the data.')"
    :placeholder="$t('Topic')"
    maxlength="65535"
    rules="mqtt_client_id"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_remote_addr"
    :label="$t('Server address')"
    :help="$t('Address of the MQTT broker.')"
    placeholder="www.example.com"
    rules="host"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_port"
    :label="$t('Port')"
    :help="$t('Port number of the MQTT broker.')"
    initial="1883"
    placeholder="1883"
    rules="port"
    required
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_keepalive"
    :label="$t('Keepalive')"
    :help="$t('The number of seconds after which the broker should send a PING message to the client if no other messages have been exchanged in that time.')"
    initial="60"
    placeholder="60"
    rules="irange(0,2147483647)"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_client_id"
    :label="$t('Client ID')"
    :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
    :placeholder="$t('Client ID')"
    rules="mqtt_client_id"
    maxlength="64"
    :depend="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="mqtt_qos"
    label="QoS"
    initial="0"
    :options="qosOptions"
    :depend="isTypeSelected"
  >
    <template #help>
      <p>{{ $t('%s quality of service. Allowed values:').format('MQTT') }}</p>
      <p>
        <span class="font-bold">{{ 0 }}</span> - {{ $t('the message may not arrive at all rather than arriving multiple times.') }}
      </p>
      <p>
        <span class="font-bold">{{ 1 }}</span> - {{ $t('the message should arrive at least once, but it may arrive multiple times.') }}
      </p>
      <p>
        <span class="font-bold">{{ 2 }}</span> - {{ $t('the message should arrive exactly once.') }}
      </p>
      <p>
        {{ $t('A higher %s value means a slower transfer.').format('QoS') }}
      </p>
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-switch
    :uci-section="s"
    name="mqtt_use_credentials"
    :label="$t('Use credentials')"
    :help="$t('Use a username and password for MQTT authentication.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_username"
    :label="$t('Username')"
    :help="$t('Username for MQTT authentication.')"
    rules="credentials_validate"
    maxlength="512"
    :depend="isTypeSelected && s?.mqtt_use_credentials === '1'"
    required
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_password"
    :label="$t('Password')"
    :help="$t('Password for MQTT authentication.')"
    rules="credentials_validate"
    maxlength="512"
    :depend="isTypeSelected && s?.mqtt_use_credentials === '1'"
    sensitive
    password
    required
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="mqtt_tls"
    :label="$t('Use secure connection')"
    :help="$t('Enable TLS for a secure connection. Requires certificate files.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="mqtt_tls_type"
    :label="$t('TLS Encryption Type')"
    :help="$t('Type of TLS encryption.')"
    :options="tlsTypeOptions"
    :depend="isTypeSelected && s?.mqtt_tls === '1'"
    initial="cert"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="mqtt_tls_insecure"
    :label="$t('Allow insecure connection')"
    :help="$t('Allow connections without verifying server authentication.')"
    :depend="s?.plugin === 'mqtt' && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert'"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="mqtt_device_files"
    :label="$t('Use certificate files from device')"
    :depend="isTypeSelected && certificatesStore.hasVuciAppCertificates && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert'"
  >
    <template #help>
      {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
      <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
      >.
    </template>
  </vuci-form-item-switch>
  <vuci-form-item-upload
    :uci-section="s"
    name="mqtt_cafile"
    :label="$t('Certificate authority file')"
    :help="$t('Upload the Certificate Authority (CA) file. Required for verifying the server\'s certificate.')"
    max-size="16MB"
    required
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    :uci-section="s"
    name="mqtt_certfile"
    :label="$t('Client certificate')"
    :help="$t('Upload the client certificate file. This is used for client authentication by the server.')"
    max-size="16MB"
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    :uci-section="s"
    name="mqtt_keyfile"
    :label="$t('Client private keyfile')"
    :help="$t('Upload the client private key file. This is used along with the client certificate for authentication.')"
    max-size="16MB"
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files !== '1'"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-select
    :uci-section="s"
    name="mqtt_cafile"
    :label="$t('Certificate authority file')"
    :help="$t('Select the Certificate Authority (CA) file from the device. Required for server certificate verification.')"
    :options="caOptions"
    required
    :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="mqtt_certfile"
    :label="$t('Client certificate')"
    :help="$t('Select the client certificate from the device. Used for client authentication by the server.')"
    :options="getCertOptionsForNonRequired"
    :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="mqtt_keyfile"
    :label="$t('Client private keyfile')"
    :help="$t('Select the client private key from the device. Used with the client certificate for authentication.')"
    :options="keyOptionsNonTpm2ForNonRequired"
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'cert' && s?.mqtt_device_files === '1'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_psk"
    :label="$t('Pre-Shared Key')"
    :help="$t('The pre-shared key in hex format.')"
    maxlength="128"
    rules="hexstring"
    sensitive
    password
    required
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'psk'"
    :no-write="!isTypeSelected || (s?.mqtt_tls_type === 'psk' && s?.mqtt_psk === '')"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="mqtt_identity"
    :label="$t('Client identity')"
    :help="$t('The identity of this client.')"
    maxlength="128"
    rules="uciname"
    required
    :depend="isTypeSelected && s?.mqtt_tls === '1' && s?.mqtt_tls_type === 'psk'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="mqtt_info_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem used to gather information.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
</template>
<script setup lang="ts">
import EventsJugglerParamList from '../../EventsJugglerParamList.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'

const props = defineProps(moduleProps)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [] } = eventsJugglerOptions?.value || {}

const { isTypeSelected, getCertOptionsForNonRequired, getListParameters } = useEventsJugglerModuleData(props)

const $t = useTranslate()

const { caOptions, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()
const certificatesStore = useCertificatesStore()

const qosOptions = [
  { value: '0', name: $t('At most once (0)') },
  { value: '1', name: $t('At least once (1)') },
  { value: '2', name: $t('Exactly once (2)') }
]
const tlsTypeOptions = [
  { value: 'cert', name: $t('Certificate based') },
  { value: 'psk', name: $t('Pre-Shared Key based') }
]
</script>
