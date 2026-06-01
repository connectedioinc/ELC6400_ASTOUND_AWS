<template>
  <vuci-form
    v-slot="{ uciData }"
    config="smpp"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="smpp"
      :title="$t('SMPP server configuration')"
      :endpoints="[{ endpoint: 'smpp/config' }]"
      data-key="smpp"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="$t('Username')"
        :help="$t('Username for authentication on SMPP server. All characters are allowed except ` and space.')"
        rules="credentials_validate"
        maxlength="15"
        initial="admin"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password for authentication on SMPP server. All characters are allowed except ` and space.')"
        rules="credentials_validate"
        maxlength="8"
        password
        sensitive
        :required="s.enabled === '1'"
        :can-randomize="{ length: 8 }"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Server port')"
        :help="$t('A port that will be used for smpp server communications. Allowed all not used ports (0-65535).')"
        rules="port"
        :required="s.enabled === '1'"
        initial="2775"
      />
      <vuci-form-item-select
        :depend="modemList.length > 1"
        :uci-section="s"
        :label="$t('Modem')"
        name="modem"
        :options="modemList"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timeout"
        :label="$t('Timeout')"
        :help="$t('Connection timeout in seconds.')"
        placeholder="160"
        rules="irange(1, 500)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_tls_ssl"
        :label="$t('Use TLS/SSL')"
        :help="$t('Mark to use TLS/SSL for connection.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="device_files"
        :label="$t('Certificate files from device')"
        :depend="s.use_tls_ssl === '1' && certificatesStore.hasVuciAppCertificates"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <!-- Upload certificates to router -->
      <vuci-form-item-upload
        :uci-section="s"
        name="tls_ciphers"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :depend="s.use_tls_ssl === '1' && (s.device_files === '0' || !s.device_files)"
        max-size="16MB"
        :required="s.enabled === '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="tls_crt"
        :label="$t('Certificate file')"
        :help="$t('Upload certificate file.')"
        :depend="s.use_tls_ssl === '1' && (s.device_files === '0' || !s.device_files)"
        max-size="16MB"
        :required="s.enabled === '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="tls_key"
        :label="$t('Key file')"
        :help="$t('Upload key file.')"
        :depend="s.use_tls_ssl === '1' && (s.device_files === '0' || !s.device_files)"
        max-size="16MB"
        :required="s.enabled === '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <!-- Select Certificates from router -->
      <vuci-form-item-select
        :uci-section="s"
        name="tls_ciphers"
        :label="$t('CA file')"
        :help="$t('Select CA file.')"
        :options="caOptions"
        :depend="s.use_tls_ssl === '1' && s.device_files === '1'"
        :required="s.enabled === '1'"
        :warnings="getCertificateWarning"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="tls_crt"
        :label="$t('Certificate file')"
        :help="$t('Select certificate file.')"
        :options="certOptions"
        :depend="s.use_tls_ssl === '1' && s.device_files === '1'"
        :required="s.enabled === '1'"
        :warnings="getCertificateWarning"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="tls_key"
        :label="$t('Key file')"
        :help="$t('Select key file.')"
        :options="keyOptionsNonTpm2"
        :depend="s.use_tls_ssl === '1' && s.device_files === '1'"
        :required="s.enabled === '1'"
        :warnings="getCertificateWarning"
      />
      <!-- End of selects form router -->
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { normalizeFileName, getCertificateWarning, withCertificatesLoaded } from '@/plugins/certificates'
export default {
  setup() {
    const certificatesStore = useCertificatesStore()
    const { caOptions, certOptions, keyOptionsNonTpm2 } = useCertificateUtils()
    return { certificatesStore, caOptions, certOptions, keyOptionsNonTpm2 }
  },
  data() {
    return {
      modemList: [],
      formOptions: {
        certificates: []
      }
    }
  },
  methods: {
    loadData(form) {
      return withCertificatesLoaded(
        this.$axios
          .get('/api/modems/status/', { condition: 'mobifd.control' })
          .then(({ data }) => {
            this.modemList = this.$mobile.modemsOptions(data)
            return form
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to load modem options.'))
          })
      )
    },
    getCertificateWarning(certificatePath) {
      return getCertificateWarning(certificatePath, this.certificatesStore.generatedCertificates)
    },
    normalizeFileName(fileName) {
      return normalizeFileName(fileName)
    }
  }
}
</script>
