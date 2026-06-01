<template>
  <vuci-form
    v-slot="{ uciData }"
    config="easycwmp"
    :after-load="withCertificatesLoaded"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="general"
      :title="$t('TR-069 client configuration')"
      data-key="acs"
      :endpoints="[{ endpoint: 'tr069/config' }]"
      :error-handlers="{ edit: handleEditErrors }"
    >
      <vuci-form-item-switch
        name="enabled"
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enables TR-069 client.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Periodic enable')"
        :help="$t('Enables TR-069 client periodic data transmission to TR-069 server.')"
        name="periodic_enable"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Accept server request')"
        name="allow_ra"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Sending interval')"
        :help="$t('Periodic data transmission interval.')"
        name="periodic_interval"
        initial="3600"
        placeholder="100"
        rules="irange(60,9999999)"
        :required="s.enabled === '1' && s.periodic_enable === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Username')"
        :help="$t('User name for authentication on TR-069 server. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        name="username"
        maxlength="64"
        rules="fieldvalidation('^[a-zA-Z0-9!@#$%&*+/=?^_`{|}~. -]+$',0)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        :help="$t('Password for authentication on TR-069 server.')"
        name="password"
        rules="credentials_validate"
        maxlength="64"
        password
        sensitive
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('URL')"
        :help="$t('TR-069 server\'s URL to send data to.')"
        name="url"
        initial="http://192.168.1.110:8080/openacs/acs"
        maxlength="128"
        rules="protourl"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ssl_verify"
        :label="$t('Use secure connection')"
        :help="$t('Enable TLS for a secure connection. Requires certificate files.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="device_files"
        :label="$t('Use certificate files from device')"
        :depend="s.ssl_verify === '1' && certificatesStore.hasVuciAppCertificates"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-upload
        :uci-section="s"
        name="ssl_cacert"
        :label="$t('Certificate authority file')"
        :help="$t('Upload the Certificate Authority (CA) file. Required for verifying the server\'s certificate.')"
        max-size="16MB"
        required
        :depend="s.ssl_verify === '1' && s.device_files !== '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="ssl_cert"
        :label="$t('Client certificate')"
        :help="$t('Upload the client certificate file. This is used for client authentication by the server.')"
        max-size="16MB"
        :depend="s.ssl_verify === '1' && s.device_files !== '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="ssl_key"
        :label="$t('Client private keyfile')"
        :help="$t('Upload the client private key file. This is used along with the client certificate for authentication.')"
        max-size="16MB"
        :depend="s.ssl_verify === '1' && s.device_files !== '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-select
        :uci-section="s"
        name="ssl_cacert"
        :label="$t('Certificate authority file')"
        :help="$t('Select the Certificate Authority (CA) file from the device. Required for server certificate verification.')"
        :options="caOptionsExtended"
        :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
        required
        :depend="s.ssl_verify === '1' && s.device_files === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ssl_cert"
        :label="$t('Client certificate')"
        :help="$t('Select the client certificate from the device. Used for client authentication by the server.')"
        :options="clientCertOptionsForNonRequired"
        :warnings="(val: string) => getCertificateWarning(val, certificatesStore.generatedCertificates)"
        :depend="s.ssl_verify === '1' && s.device_files === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ssl_key"
        :label="$t('Client private keyfile')"
        :help="$t('Select the client private key from the device. Used with the client certificate for authentication.')"
        :options="clientKeyOptionsNonTpm2ForNonRequired"
        :depend="s.ssl_verify === '1' && s.device_files === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import { withCertificatesLoaded, normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { ApiResponse } from '@ui-core/plugins/axios'

const $t = useTranslate()
const certificatesStore = useCertificatesStore()
const { clientCertOptionsForNonRequired, clientKeyOptionsNonTpm2ForNonRequired, caOptionsExtended } = useCertificateUtils()

function handleEditErrors(res: ApiResponse<any>) {
  const errorMessages = {
    152: $t('Uploaded certificate is not valid'),
    default: $t('Failed to edit configuration')
  }
  const errorCode = res.data.errors[0].code
  return errorMessages[errorCode as keyof typeof errorMessages] || errorMessages.default
}
</script>
