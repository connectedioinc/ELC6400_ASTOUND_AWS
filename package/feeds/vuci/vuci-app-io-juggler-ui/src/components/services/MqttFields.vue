<template>
  <vuci-form-item-input
    name="remote_addr"
    :label="$t('Hostname')"
    :help="$t('Specify address of the broker.')"
    placeholder="www.example.com"
    rules="host"
    required
    :uci-section="s"
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-input
    name="remote_port"
    :label="$t('Port')"
    :help="$t('Specify port of the broker.')"
    placeholder="1883"
    rules="port"
    initial="1883"
    required
    :uci-section="s"
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="keepalive"
    :label="$t('Keepalive')"
    :help="$t('The number of seconds after which the broker should send a PING message to the client if no other messages have been exchanged in that time.')"
    placeholder="60"
    rules="uinteger"
    required
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="qos"
    :label="$t('QoS')"
    :help="$t('Quality of Service to be used for the message.')"
    :options="qosOptions"
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-input
    name="username"
    :label="$t('Username')"
    :help="$t('Specify username of remote host.')"
    :placeholder="$t('Username')"
    :uci-section="s"
    rules="credentials_validate"
    maxlength="512"
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-input
    name="password"
    :label="$t('Password')"
    :help="$t('Specify password of remote host. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
    :placeholder="$t('Password')"
    :uci-section="s"
    rules="credentials_validate"
    maxlength="512"
    password
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-switch
    name="tls"
    :label="$t('TLS')"
    :uci-section="s"
    :help="$t('Select to enable TLS encryption.')"
    :depend="s.type === 'mqtt'"
  />
  <vuci-form-item-select
    name="tls_type"
    :label="$t('TLS Type')"
    :help="$t('Select the type of TLS encryption.')"
    :uci-section="s"
    :options="tlsTypes"
    :depend="s.type === 'mqtt' && s.tls === '1'"
  />
  <vuci-form-item-switch
    name="tls_insecure"
    :label="$t('Allow insecure connection')"
    :help="$t('Allow not verifying server authenticity.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1'"
  />
  <vuci-form-item-switch
    name="device_files"
    :label="$t('Certificate files from device')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && certificatesStore.hasVuciAppCertificates"
  >
    <template #help>
      {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated.') }}
      <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
      >.
    </template>
  </vuci-form-item-switch>
  <vuci-form-item-upload
    name="cafile"
    :label="$t('CA file')"
    :help="$t('Upload CA file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
    :required="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1'"
    max-size="16MB"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    name="certfile"
    :label="$t('Certificate file')"
    :help="$t('Upload Certificate file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
    max-size="16MB"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-upload
    name="keyfile"
    :label="$t('Key file')"
    :help="$t('Upload Key file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
    max-size="16MB"
  >
    <template #fileName="{ fileName }">
      {{ normalizeFileName(fileName) }}
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-select
    name="cafile"
    :label="$t('CA file')"
    :help="$t('Select CA file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
    :required="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1'"
    :options="caOptions"
    :warnings="getCertificateWarning"
  />
  <vuci-form-item-select
    name="certfile"
    :label="$t('Certificate file')"
    :help="$t('Select Certificate file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
    :options="certOptionsForNonRequired"
    :warnings="getCertificateWarning"
  />
  <vuci-form-item-select
    name="keyfile"
    :label="$t('Key file')"
    :help="$t('Select Key file.')"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
    :options="keyOptionsNonTpm2ForNonRequired"
    :warnings="getCertificateWarning"
  />
  <vuci-form-item-input
    name="psk"
    :label="$t('Pre-Shared-Key')"
    :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
    placeholder="Key"
    :uci-section="s"
    maxlength="128"
    rules="hexstring"
    :depend="s.type === 'mqtt' && s.tls_type === 'psk' && s.tls === '1'"
    required
  />
  <vuci-form-item-input
    name="identity"
    :label="$t('Identity')"
    :help="$t('Specify the Identity.')"
    placeholder="Identity"
    maxlength="128"
    rules="uciname"
    :uci-section="s"
    :depend="s.type === 'mqtt' && s.tls_type === 'psk' && s.tls === '1'"
    required
  />
</template>
<script>
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
export default {
  props: {
    s: {
      type: Object,
      required: true
    },
    formOptions: {
      type: Object,
      required: true
    }
  },
  setup() {
    const certificatesStore = useCertificatesStore()
    const { caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()
    return { certificatesStore, caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired }
  },
  data() {
    return {
      tlsTypes: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      qosOptions: [
        ['0', this.$t('At most once (0)')],
        ['1', this.$t('At least once (1)')],
        ['2', this.$t('Exactly once (2)')]
      ]
    }
  },
  methods: {
    getCertificateWarning(certificatePath) {
      return getCertificateWarning(certificatePath, this.certificatesStore.generatedCertificates)
    },
    normalizeFileName(fileName) {
      return normalizeFileName(fileName)
    }
  }
}
</script>
