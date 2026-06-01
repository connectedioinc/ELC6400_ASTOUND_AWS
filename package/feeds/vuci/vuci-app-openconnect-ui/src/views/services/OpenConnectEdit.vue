<template>
  <vuci-form
    ref="form"
    v-slot="{ uciData }"
    :after-load="afterLoad"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle('OpenConnect client', section.id)"
      :uci-data="uciData"
      data-key="openconnect"
      :endpoints="[{ endpoint: 'openconnect/client/config' }]"
      :name="section.id"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Turns the OpenConnect Tunnel instance on or off.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="vpn_protocol"
        :label="$t('VPN protocol')"
        :help="$t('VPN protocol to be used for the connection.')"
        :options="vpnProtocols"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="server"
        :label="$t('Server')"
        :help="$t('Server address.')"
        placeholder="0.0.0.0"
        rules="host"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Port')"
        :help="$t('Server port.')"
        placeholder="443"
        rules="port"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="$t('Username')"
        :help="$t('Username used for VPN connection.')"
        rules="credentials_validate"
        maxlength="512"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        password
        :label="$t('Password')"
        :help="$t('Password used for VPN connection.')"
        rules="credentials_validate"
        maxlength="512"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Certificate files from device')"
        name="device_files"
        :initial="filesFromDevice ? '1' : '0'"
        no-write
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from the device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here.') }}</router-link>
        </template>
      </vuci-form-item-switch>
      <tlt-hint
        v-if="$store.board?.hwinfo?.tpm"
        expand-to="top-right"
        :hints="isTPM2(s.user_key, certificates) ? [{ info: $t('The selected key file is already in TPM2 storage.') }] : []"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Store key in TPM')"
          name="use_tpm"
          initial="1"
          :help="$t('When enabled, key will be stored in TPM2 secure storage if space is available.')"
          :depend="$store.board?.hwinfo?.tpm"
          :readonly="isTPM2(s.user_key, certificates)"
        />
      </tlt-hint>

      <vuci-form-item-upload
        ref="user_cert"
        :uci-section="s"
        name="user_cert"
        :label="$t('User certificate')"
        :help="$t('User certificate used to authenticate to the server.')"
        :depend="isDeviceFilesDisabled"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        ref="ca_cert"
        :uci-section="s"
        name="ca_cert"
        :label="$t('CA certificate')"
        :help="$t('CA certificate used to verify the server certificate.')"
        :depend="isDeviceFilesDisabled"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        ref="user_key"
        :uci-section="s"
        name="user_key"
        :label="$t('User private key')"
        :help="$t('User private key used to authenticate to the server.')"
        :depend="isDeviceFilesDisabled"
        max-size="16MB"
        @uploaded="uploadHandler"
      >
        <template
          v-if="isTPM2(s.user_key, certificates)"
          #before
        >
          <tlt-badge
            type="success"
            class="shrink-0"
          >
            TPM2
          </tlt-badge>
        </template>
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-select
        :uci-section="s"
        name="user_cert"
        :label="$t('User certificate')"
        :help="$t('User certificate used to authenticate to the server.')"
        :warnings="getWarning"
        :options="certOptions"
        :depend="!isDeviceFilesDisabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ca_cert"
        :label="$t('CA certificate')"
        :help="$t('CA certificate used to verify the server certificate.')"
        :warnings="getWarning"
        :options="caCertOptions"
        :depend="!isDeviceFilesDisabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="user_key"
        :label="$t('User private key')"
        :help="$t('User private key used to authenticate to the server.')"
        :options="keyOptions"
        :depend="!isDeviceFilesDisabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="serverhash"
        :label="$t('Server fingerprint')"
        :help="$t('Server fingerprint to trust.')"
        :rules="validateHashString"
        maxlength="255"
      />
      <tlt-form-model-item no-label>
        <tlt-button
          type="text"
          :loading="loadingFingerprint"
          no-write
          :disabled="loadingFingerprint"
          @click="generateServerFingerprint(s)"
        >
          {{ loadingFingerprint ? $t('Retrieving server fingerprint') : $t('Get server fingerprint') }}
        </tlt-button>
      </tlt-form-model-item>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { normalizeFileName, isTPM2, getCertificateWarning, showTPM2Warning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'

const $t = useTranslate()
const message = useMessages()
const props = defineProps({
  section: {
    type: Object,
    required: true
  }
})

const form = ref(null)
const loadingFingerprint = ref(false)
const certificates = inject('certificates', ref([]))
const tpmMessage = ref(false)

const vpnProtocols = computed(() => [
  ['anyconnect', $t('Any Connect')],
  ['nc', $t('Network Connect')],
  ['gp', $t('Global Protect')],
  ['pulse', $t('Pulse Secure')],
  ['fortinet', $t('SSL VPN')]
])

const errors = computed(() => ({
  122: $t('Failed to check fingerprint'),
  default: $t('An unexpected error occured')
}))

const isDeviceFilesDisabled = computed(() => props.section.device_files !== '1')

const certOptions = computed(() => {
  const validTypes = ['client', 'server', 'import']
  return mapCertificateFiles(
    certificates.value.filter(
      cert =>
        cert.type !== 'key' &&
        cert.cert_type !== 'ca' &&
        cert.cert_type !== 'root_ca' &&
        (cert.type === 'cert' || validTypes.includes(cert.cert_type) || (cert.cert_type === 'scep' && !cert.fullname.startsWith('ca')))
    )
  )
})

const caCertOptions = computed(() => {
  const filteredCerts = certificates.value.filter(
    cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && cert.fullname.startsWith('ca'))) && cert.type === 'cert'
  )
  return mapCertificateFiles(filteredCerts)
})

const keyOptions = computed(() => {
  const filteredCerts = certificates.value.filter(cert => cert.cert_type !== 'ca' && cert.cert_type !== 'root_ca' && cert.type === 'key')
  return mapCertificateFiles(filteredCerts)
})

const filesFromDevice = computed(() => {
  const certFields = [props.section.user_cert, props.section.ca_cert, props.section.user_key]
  const firstValidCert = certFields.find(cert => cert && cert !== '')
  if (!firstValidCert) {
    return false
  }
  return firstValidCert.startsWith('/etc/certificates') || firstValidCert.startsWith('/etc/uhttpd')
})

const mapCertificateFiles = files => {
  return files.map(cert => [cert.path, normalizeFileName(cert.fullname)])
}

const afterLoad = async () => {
  if (!props.section?.user_key) return
  await useCertificatesStore().getCertificates(true)
}

const generateServerFingerprint = record => {
  if (!props.section.port) return message.error($t('Port is required to check fingerprint'))
  if (!props.section.server) return message.error($t('Server is required to check fingerprint'))
  return form.value?.validate().then(res => {
    if (!res) return message.error($t('Some fields are invalid'))
    loadingFingerprint.value = true
    const data = { server: props.section.server, port: props.section.port }
    return axios
      .post('/api/openconnect/client/actions/check_fingerprint', { data })
      .then(res => {
        message.success($t('Successfully retrieved server fingerprint'))
        record.serverhash = res.data.fingerprint
      })
      .catch(e => {
        const code = e?.response?.data?.errors[0].code
        message.error(errors.value[code] || errors.value.default)
      })
      .finally(() => {
        loadingFingerprint.value = false
      })
  })
}

const validateHashString = input => {
  const hashValidators = {
    'sha1:': {
      pattern: /^sha1:[a-fA-F0-9]+$/,
      errorMessage: $t('Invalid SHA-1 hash. Must contain only hexadecimal characters after sha1:')
    },
    'sha256:': {
      pattern: /^sha256:[a-fA-F0-9]+$/,
      errorMessage: $t('Invalid SHA-256 hash. Must contain only hexadecimal characters after sha256:')
    },
    'pin-sha256:': {
      pattern: /^pin-sha256:[A-Za-z0-9+/]+=+$/,
      errorMessage: $t('Invalid PIN-SHA-256 hash. Must contain only base64 characters after pin-sha256: and end with =')
    }
  }
  const prefix = Object.keys(hashValidators).find(p => input.startsWith(p))
  if (!prefix) {
    return {
      isValid: false,
      message: $t('Accepted formats are sha1:, sha256:, or pin-sha256:')
    }
  }
  const { pattern, errorMessage } = hashValidators[prefix]
  return pattern.test(input) ? { isValid: true } : { isValid: false, message: errorMessage }
}

const afterSave = (_, response) => {
  if (!tpmMessage.value) return
  if (response.success) return message.info($t('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.'))
}

const uploadHandler = res => {
  if (!res.messages) return
  if (res.messages.some(i => i.code === 5)) {
    tpmMessage.value = true
    return
  }
}

const getWarning = val => {
  return getCertificateWarning(val, certificates.value)
}

watch(
  () => props.section?.use_tpm,
  newVal => {
    showTPM2Warning(newVal)
  },
  { immediate: true }
)
</script>
