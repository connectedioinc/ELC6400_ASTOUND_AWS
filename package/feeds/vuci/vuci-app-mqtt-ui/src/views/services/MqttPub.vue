<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mqtt_pub"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="mqtt_pub"
      :title="$t('MQTT publisher')"
      :help="sectionHint"
      :uci-data="uciData"
      data-key="mqtt"
      :endpoints="[{ endpoint: 'mqtt/publisher/config' }]"
    >
      <vuci-form-item-switch
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Select to enable MQTT publisher.')"
        :uci-section="s"
      />
      <vuci-form-item-input
        name="remote_addr"
        :label="$t('Hostname')"
        :help="$t('Specify address of the broker.')"
        placeholder="www.example.com"
        rules="host"
        :required="s.enabled === '1'"
        :uci-section="s"
      />
      <vuci-form-item-input
        name="remote_port"
        :label="$t('Port')"
        :help="$t('Specify port of the broker.')"
        placeholder="1883"
        rules="port"
        initial="1883"
        :required="s.enabled === '1'"
        :uci-section="s"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="client_id"
        :label="$t('Client ID')"
        :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
        :placeholder="$t('Client ID')"
        rules="mqtt_client_id"
        maxlength="64"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="modem_id"
        :label="$t('Modem')"
        :help="$t('Select which modem to use when getting information.')"
        :options="modemOptions"
        :depend="modemOptions.length > 1"
      />
      <vuci-form-item-input
        name="username"
        :label="$t('Username')"
        :help="$t('Specify username of remote host.')"
        :uci-section="s"
        rules="credentials_validate"
        maxlength="512"
      />
      <vuci-form-item-input
        name="password"
        :label="$t('Password')"
        :help="$t('Specify password of remote host. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        :uci-section="s"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
      />
      <vuci-form-item-switch
        name="tls"
        :label="$t('TLS')"
        :uci-section="s"
        :help="$t('Select to enable TLS encryption.')"
      />
      <vuci-form-item-select
        name="tls_type"
        :label="$t('TLS Type')"
        :help="$t('Select the type of TLS encryption.')"
        :uci-section="s"
        :options="tlsTypes"
        :depend="s.tls === '1'"
      />
      <vuci-form-item-switch
        name="tls_insecure"
        :label="$t('Allow insecure connection')"
        :help="$t('Allow not verifying server authenticity.')"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1'"
      />
      <vuci-form-item-switch
        name="device_files"
        :label="$t('Certificate files from device')"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1' && certificatesStore.hasVuciAppCertificates"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-upload
        name="cafile"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
        :required="s.enabled === '1' && s.tls_type === 'cert' && s.tls === '1'"
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
        :depend="s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
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
        :depend="s.tls_type === 'cert' && s.tls === '1' && (s.device_files === '0' || !s.device_files)"
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
        :options="caOptions"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
        :required="s.enabled === '1' && s.tls_type === 'cert' && s.tls === '1'"
        :warnings="getCertificateWarning"
      />
      <vuci-form-item-select
        name="certfile"
        :label="$t('Certificate file')"
        :help="$t('Select Certificate file.')"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
        :options="certOptionsForNonRequired"
        :warnings="getCertificateWarning"
      />
      <vuci-form-item-select
        name="keyfile"
        :label="$t('Key file')"
        :help="$t('Select Key file.')"
        :options="keyOptionsNonTpm2ForNonRequired"
        :uci-section="s"
        :depend="s.tls_type === 'cert' && s.tls === '1' && s.device_files === '1'"
      />
      <vuci-form-item-input
        name="psk"
        :label="$t('Pre-Shared-Key')"
        :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
        :uci-section="s"
        maxlength="128"
        rules="hexstring"
        :depend="s.tls_type === 'psk' && s.tls === '1'"
        :required="s.enabled === '1'"
        sensitive
        password
      />
      <vuci-form-item-input
        name="identity"
        :label="$t('Identity')"
        :help="$t('Specify the Identity.')"
        placeholder="Identity"
        maxlength="128"
        rules="uciname"
        :uci-section="s"
        :depend="s.tls_type === 'psk' && s.tls === '1'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        name="pub_prefix"
        :label="$t('Publish topic prefix')"
        :help="$t('Prefix of the topic to be used during publish (%smore information%s).').format('<a target=\'_blank\' href=\'' + $brand('mqttWikiURL') + '\'>', '</a>')"
        :uci-section="s"
        :rules="validatePrefix"
        rawhtml
      />
      <vuci-form-item-input
        name="sub_prefix"
        :label="$t('Subscribe topic prefix')"
        :help="$t('Prefix of the topic to be used during subscription (%smore information%s).').format('<a target=\'_blank\' href=\'' + $brand('mqttWikiURL') + '\'>', '</a>')"
        :uci-section="s"
        rules="string"
        rawhtml
      />
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
    const { caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()
    return { certificatesStore, caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired }
  },
  data() {
    return {
      modems: [],
      formData: {},
      sectionHint: this.$t('An MQTT Publisher is a client that sends messages to the Broker, who then forwards these messages to the Subscriber.'),
      tlsTypes: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      deviceFilesHint: `${this.$t('Choose this option if you want to select certificate files from device.')}<br>
      ${this.$t('Certificate files can be generated')} <a class=link href="/system/admin/certificates">${this.$t('here')}</a>`,
      isPskSet: false,
      passSetPlaceholder: this.$t('Password is set'),
      pskSetPlaceholder: this.$t('Pre-Shared-Key is set')
    }
  },
  computed: {
    modemOptions() {
      return this.$mobile.modemsOptions(this.modems)
    }
  },
  methods: {
    afterLoad(form) {
      return withCertificatesLoaded(
        this.$axios
          .get('/api/modems/status/', { condition: 'mobifd.control' })
          .then(({ data }) => {
            this.modems = this.$mobile.parseModems(data)
            return form
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to load modem options.'))
          })
      )
    },
    validatePrefix(val) {
      if (val.match(/^[^#+]+$/)) return { isValid: true }
      return {
        isValid: false,
        message: this.$t('Values with "#" or "+" are not accepted.')
      }
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
