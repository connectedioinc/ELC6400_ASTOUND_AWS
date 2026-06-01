<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mosquitto"
    editing
    :after-load="afterLoad"
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'mqtt/bridge/config' }]"
      data-key="bridgeData"
      :title="$utils.getModalTitle($t('bridge'), section.connection_name)"
      :after-save="onAfterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="client_enabled"
        :label="$t('Enable')"
        :help="$t('Enable connection to remote bridge.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="connection_name"
        :label="$t('Connection name')"
        rules="nospace"
        maxlength="64"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="bridge_protocol_version"
        :label="$t('Protocol version')"
        :help="$t('Version of the MQTT protocol.')"
        :options="bridgeProtocolOpts"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_addr"
        :label="$t('Remote address')"
        :help="$t('Select remote bridge address.')"
        rules="host"
        placeholder="0.0.0.0"
        :required="s.client_enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_port"
        :label="$t('Remote port')"
        :help="$t('Select remote port.')"
        rules="port"
        placeholder="1883"
        :required="s.client_enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_remote_tls"
        :label="$t('Use remote TLS/SSL')"
        :help="$t('Select to use TLS/SSL for remote connection.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="device_brg_files"
        :label="$t('Certificate files from device')"
        :depend="s.use_remote_tls === '1' && certificatesStore.hasVuciAppCertificates"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <!-- Upload Bridge certificates -->
      <vuci-form-item-upload
        :uci-section="s"
        name="bridge_cafile"
        :label="$t('Bridge CA file')"
        :help="$t('Upload bridge CA file.')"
        :depend="s.use_remote_tls === '1' && s.device_brg_files === '0'"
        :required="s.use_remote_tls === '1' && s.device_brg_files !== '1' && s.client_enabled === '1'"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="bridge_certfile"
        :label="$t('Bridge certificate file')"
        :help="$t('Upload bridge certificate file.')"
        :depend="s.use_remote_tls === '1' && s.device_brg_files !== '1'"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-upload
        :uci-section="s"
        name="bridge_keyfile"
        :label="$t('Bridge key file')"
        :help="$t('Upload bridge key file.')"
        :depend="s.use_remote_tls === '1' && s.device_brg_files !== '1'"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <!-- Select bridge certificates from device -->
      <vuci-form-item-select
        :uci-section="s"
        name="bridge_cafile"
        :label="$t('Bridge CA file')"
        :help="$t('Select bridge CA certificate from device.')"
        :options="caOptions"
        :required="s.use_remote_tls === '1' && s.device_brg_files === '1' && s.client_enabled === '1'"
        :depend="s.use_remote_tls === '1' && s.device_brg_files === '1'"
        :warnings="getCertificateWarning"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="bridge_certfile"
        :label="$t('Bridge certificate file')"
        :help="$t('Select bridge certificate file from device.')"
        :options="certOptionsForNonRequired"
        :depend="s.use_remote_tls === '1' && s.device_brg_files === '1'"
        :warnings="getCertificateWarning"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="bridge_keyfile"
        :label="$t('Bridge key file')"
        :help="$t('Select bridge key certificate from device.')"
        :options="keyOptionsNonTpm2ForNonRequired"
        :depend="s.use_remote_tls === '1' && s.device_brg_files === '1'"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="bridge_tls_version"
        :label="$t('Bridge TLS version')"
        :help="$t('Used bridge TLS version.')"
        :options="tlsVersionOpts"
        :warnings="value => (value === 'tlsv1' || value === 'tlsv1.1' ? $t('TLS 1.0 and TLS 1.1 are deprecated and considered insecure. Please upgrade to a newer TLS version.') : '')"
        initial="tlsv1.2"
        :depend="s.use_remote_tls === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="bridge_alpn"
        :label="$t('Bridge ALPN')"
        :help="
          $t(
            'Configure the application layer protocol negotiation\
          option for the TLS session. Useful for brokers that support\
          both websockets and MQTT on the same port.'
          )
        "
        :depend="s.use_remote_tls === '1'"
        rules="string"
        maxlength="254"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="bridge_insecure"
        :label="$t('Disable hostname verification')"
        :help="
          $t(
            'By default, the bridge attempts to verify the hostname provided in the remote certificate.\
            This can cause problems in testing scenarios, so this option may be\
            enabled to disable the hostname verification. Enabling this option means that a malicious third party could\
            potentially impersonate your server, so it should always be disabled in production environments.'
          )
        "
        :depend="s.use_remote_tls === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_bridge_login"
        :label="$t('Use remote bridge login')"
        :help="$t('Select to use login for bridge.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_clientid"
        :label="$t('Remote ID')"
        :help="$t('Choose remote client ID.')"
        placeholder="1"
        rules="credentials_validate"
        maxlength="256"
        :depend="s.use_bridge_login === '1'"
        :required="s.client_enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_username"
        :label="$t('Remote username')"
        :help="$t('Choose remote user name.')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        :depend="s.use_bridge_login === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_password"
        :label="$t('Remote password')"
        :help="$t('Choose remote password.')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        :depend="s.use_bridge_login === '1'"
        password
        sensitive
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="try_private"
        :label="$t('Try private')"
        :help="$t('Check if remote broker is another instance of a daemon.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="cleansession"
        :label="$t('Clean session')"
        :help="$t('Discard session state when connecting or disconnecting.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="notifications"
        :label="$t('Enable notifications')"
        :help="$t('Publish notification messages to the local and remote brokers giving information about the state of the bridge connection.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="notifications_local"
        :label="$t('Enable local notifications')"
        :help="$t('Only publish notification messages to the local broker giving information about the state of the bridge connection.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="keepalive_interval"
        :label="$t('Keepalive interval')"
        :help="$t('Set the keepalive interval for this bridge connection, in seconds.')"
        rules="irange(5,65535)"
        placeholder="60"
      />
    </vuci-named-section>
    <vuci-typed-section
      type="topic"
      :title="$utils.getModalTitle($t('topics'))"
      :columns="topicColumns"
      :edit-form="editModal"
      :endpoints="[{ endpoint: `mqtt/bridge/${section.id}/topics/config` }]"
      :data-key="section.id"
      :uci-data="uciData"
      :edit-form-props="{
        father: section.id
      }"
      :add-validate="addValidate"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: checkReadonly() }, hints: deleteHints() }]"
    >
      <template #topic="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="topic"
        />
      </template>
      <template #direction="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="direction"
          :display-value="displayDirection"
        />
      </template>
      <template #qos="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="qos"
          :display-value="displayQoS"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './MqttTopicEdit'
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
export default {
  props: {
    section: {
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
      editModal: markRaw(EditForm),
      formData: {},
      tlsVersionOpts: [
        ['tlsv1', 'TLS 1.0'],
        ['tlsv1.1', 'TLS 1.1'],
        ['tlsv1.2', 'TLS 1.2'],
        ['tlsv1.3', 'TLS 1.3']
      ],
      bridgeProtocolOpts: [
        ['mqttv31', '3.1'],
        ['mqttv311', '3.1.1'],
        ['mqttv50', '5.0']
      ],
      certificates: [],
      topicColumns: [
        {
          name: 'topic',
          label: this.$t('Topic name')
        },
        {
          name: 'direction',
          label: this.$t('Direction'),
          help: this.$t('The direction that the messages will be shared in.')
        },
        {
          name: 'qos',
          label: this.$t('Qos level'),
          help: this.$t('The publish/subscribe QoS level used for this topic.')
        }
      ],
      directionOpts: [
        ['out', this.$t('OUT')],
        ['in', this.$t('IN')],
        ['both', this.$t('BOTH')]
      ],
      qosOpts: [
        ['0', this.$t('At most once (0)')],
        ['1', this.$t('At least once (1)')],
        ['2', this.$t('Exactly once (2)')]
      ],
      errors: {
        1: this.$t('At least one topic is required to enable MQTT bridge')
      },
      passSetPlaceholder: this.$t('Password is set')
    }
  },
  methods: {
    deleteHints() {
      return this.checkReadonly() ? [{ info: this.$t('At least one topic is required when MQTT bridge is enabled') }] : []
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        const isInvalid = this.formData.bridgeData.some(bridge => bridge.connection_name === this.section.connection_name && this.section.id !== bridge.id)
        const isTopicEmpty = this.validateTopics()
        if (isInvalid) return reject(this.$t('Configuration with connection name %s already exists').format(this.section.connection_name))
        if (isTopicEmpty) return reject(this.$t('At least one topic is required to enable MQTT bridge'))
        resolve()
      })
    },
    validateTopics() {
      const section = this.section
      const sectionTopic = this.formData[section.id]
      return ((sectionTopic && sectionTopic.length === 0) || !sectionTopic) && section.client_enabled === '1'
    },
    addValidate(addForm) {
      const topicExists = this.formData[this.section.id].some(topic => topic.topic === addForm.topic)
      if (!topicExists) return { valid: true }
      return {
        message: this.$t('Topic with name %s already exists').format(addForm.topic),
        valid: false
      }
    },
    displayDirection(self) {
      return this.directionOpts.find(option => option[0] === self)[1]
    },
    displayQoS(self) {
      return this.qosOpts.find(option => option[0] === self)[1]
    },
    checkReadonly() {
      if (this.section.client_enabled === '0') return false
      const sectionTopic = this.formData[this.section.id]
      return sectionTopic && sectionTopic.length <= 1
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
