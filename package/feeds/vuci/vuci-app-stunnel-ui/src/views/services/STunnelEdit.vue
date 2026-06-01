<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    :after-load="afterLoad"
    config="stunnel"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('Stunnel'), section.id)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'stunnel/config' }]"
      :after-save="afterSave"
      data-key="stunnels"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Stunnel.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Operating mode')"
        :help="`${$t('Stunnel operation mode.')} <br> *
                ${$t('Server - Only listening on specified IP and Port.')} <br> *
                ${$t('Client - Both listening and connecting to specified IPs')}`"
        name="client"
        initial="0"
        :options="modeOptions"
        rawhtml
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Listen IP')"
        :help="$t('IP which server will be listening to.')"
        name="accept_host"
        placeholder="localhost"
        :rules="validateListenIP"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Listen port')"
        :help="$t('Port number which server will be listenting to (range 0:65535).')"
        name="accept_port"
        placeholder="80"
        rules="port"
        required
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Connect IP\'s')"
        :help="`${$t('Type in the server IP and Port (using \'host_ip:port\' convention (e.g., 127.0.0.1:6001 or [::0000:8a2e:0370]:7334).')} <br>
                ${$t('If no host IP is specified only port number, then localhost will be used as a host')}`"
        name="connect"
        placeholder="0.0.0.0:80"
        rules="hostport"
        rawhtml
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('TLS cipher')"
        :help="$t('Packet encryption algorithm (cipher).')"
        name="cipher_type"
        :options="tlsCipherOptions"
        force-write
        @change="s.ciphers = ''"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Allowed TLS ciphers')"
        :warnings="getCipherWarning"
        :depend="s.cipher_type === 'custom'"
        name="ciphers"
        rules="string"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Applicaton protocol')"
        :help="`${$t('This option enables initial, protocol-specific negotiation of the TLS encryption.')} <br>
                ${$t('The protocol option should not be used with TLS encryption on a separate port.')}`"
        name="protocol"
        :options="appProtocolOptions"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Protocol authentication')"
        :help="$t('Packet encryption algorithm (cipher).')"
        name="protocolAuthentication"
        :depend="s.protocol === 'connect'"
        :options="connectAuthOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Protocol authentication')"
        :help="$t('Packet encryption algorithm (cipher).')"
        name="protocolAuthentication"
        :depend="s.protocol === 'smtp'"
        :options="smtpAuthOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Protocol domain')"
        :help="$t('Domain for the protocol negotiations.')"
        name="protocolDomain"
        rules="string"
        :depend="s.protocol === 'connect' && s.client === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Protocol host')"
        :help="$t('Specifies the final TLS server to be connected to by the proxy, and not the proxy server directly connected by stunnel.')"
        name="protocolHost"
        rules="string"
        :depend="s.protocol === 'connect' && s.client === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Protocol username')"
        :help="$t('Username for the protocol negotiations.')"
        name="protocolUsername"
        rules="credentials_validate"
        maxlength="512"
        :depend="(s.protocol === 'connect' || s.protocol === 'smtp') && s.client === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Protocol password')"
        :help="$t('Password for the protocol negotiations.')"
        name="protocolPassword"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
        :depend="(s.protocol === 'connect' || s.protocol === 'smtp') && s.client === '1'"
      />
      <tlt-hint
        v-if="$store.board?.hwinfo?.tpm && s.client === '0'"
        expand-to="top-right"
        :hints="showTPM2Badge(s.key) ? [{ info: $t('The selected key file is already in TPM2 storage.') }] : []"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Store key in TPM')"
          name="use_tpm"
          initial="1"
          :help="$t('When enabled, key will be stored in TPM2 secure storage if space is available.')"
          :readonly="showTPM2Badge(s.key)"
          :depend="$store.board?.hwinfo?.tpm && s.client === '0'"
        />
      </tlt-hint>
      <vuci-form-item-upload
        :uci-section="s"
        name="cert"
        :label="$t('Certificate file')"
        :help="$t('Certificate file in pem format.')"
        rawhtml
        :warnings="getUploadWarning"
        :depend="s.client === '0'"
        max-size="16MB"
        required
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="key"
        :label="$t('Private key')"
        :help="$t('Key file in pem format.')"
        :depend="s.client === '0'"
        max-size="16MB"
        required
        @uploaded="uploadHandler"
      >
        <template
          v-if="showTPM2Badge(s.key)"
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
      <vuci-form-item-upload
        :uci-section="s"
        name="CAfile"
        :label="$t('Remote server certificate')"
        :help="$t('Certificate file of the remote peer (server) in pem format.')"
        :warnings="getUploadWarning"
        :depend="s.client === '1'"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { normalizeFileName, isTPM2, showTPM2Warning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'

export default {
  inject: ['warningMessages', 'setWarningMessages'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      modeOptions: [
        ['0', this.$t('Server')],
        ['1', this.$t('Client')]
      ],
      tlsCipherOptions: [
        ['none', this.$t('None')],
        ['dhe_rsa', this.$t('Secure')],
        ['custom', this.$t('Custom')]
      ],
      appProtocolOptions: [
        ['', this.$t('Not specified')],
        ['connect', this.$t('Connect')],
        ['smtp', this.$t('SMTP')]
      ],
      connectAuthOptions: [
        ['basic', this.$t('Basic')],
        ['ntlm', this.$t('NTLM')]
      ],
      smtpAuthOptions: [
        ['plain', this.$t('Plain')],
        ['login', this.$t('Login')]
      ],
      certificateWarnings: {
        1: this.$t("It's recommended to use a minimum RSA key length of 2048 bits for the certificate."),
        2: this.$t("It's recommended to use a minimum ECC key length of 256 bits for the certificate."),
        3: this.$t(`It's recommended to use a minimum key length of 2048 bits for the certificate.`)
      },
      tpmMessage: false
    }
  },
  computed: {
    currentSection() {
      return this.formData?.stunnels?.find(x => x.id === this.section.id)
    }
  },
  watch: {
    'currentSection.use_tpm': {
      handler: 'showTPM2Warning'
    }
  },
  methods: {
    async afterLoad() {
      if (!this.section?.key) return
      await useCertificatesStore().getCertificates(true)
    },
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    showTPM2Badge(record) {
      return isTPM2(record, useCertificatesStore().rawData?.generated)
    },
    getUploadWarning(val) {
      return this.$utils.certificateWarnings(val, this.warningMessages(), this.formData.stunnels, this.certificateWarnings)
    },
    getCipherWarning(value) {
      if (typeof value !== 'string') return
      const cipher = value.toLowerCase().substring(0, 3)
      if (['des'].includes(cipher)) return this.$t('This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.')
    },
    validateListenIP(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.ipaddr()
      if (val === 'localhost' || res.isValid) return { isValid: true }
      return {
        isValid: false,
        message: this.$t('One of the following: IPv4 and IPv6 addresses are accepted (e.g., 192.168.1.1. Following words are accepted: localhost).')
      }
    },
    showTPM2Warning() {
      showTPM2Warning(this.currentSection?.use_tpm)
    },
    uploadHandler(res) {
      if (!res.messages) return
      if (res.messages.some(i => i.code === 5)) {
        this.tpmMessage = true
      }
    },
    afterSave(_, response) {
      const updatedMessages = this.warningMessages().filter(message => !message.source.startsWith(response.data.id))
      this.setWarningMessages(updatedMessages.concat(response?.messages || []))
      if (this.tpmMessage) return this.$message.info(this.$t('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.'))
    }
  }
}
</script>
