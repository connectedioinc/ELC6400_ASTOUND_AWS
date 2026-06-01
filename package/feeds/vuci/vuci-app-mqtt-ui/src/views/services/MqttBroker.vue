<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mosquitto"
    :after-load="loadData"
    :before-save="checkFiles"
  >
    <!-- MQTT Section -->
    <vuci-named-section
      v-slot="{ s }"
      name="mqtt"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'mqtt/broker/config' }]"
      data-key="brokerData"
    >
      <tlt-card
        :title="$t('MQTT')"
        :help="$t('The broker will “listen” for connections on the specified Local port.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('MQTT broker')"
          :help="$t('Select to enable MQTT.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="custom_enabled"
          :label="$t('Custom configuration')"
          :help="$t('Enables reading of custom configuration.')"
        />
        <vuci-form-item-upload
          :uci-section="s"
          name="custom_section_id"
          :label="$t('Custom Configuration file')"
          :help="$t('Upload configuration file.')"
          :depend="s.custom_enabled === '1'"
          :required="s.enabled === '1' && s.custom_enabled === '1'"
          max-size="16MB"
        />
        <vuci-form-item-list
          :uci-section="s"
          name="local_port"
          :label="$t('Local port')"
          :help="$t('Specify the local port on which the MQTT broker will listen for incoming connections.')"
          placeholder="1883"
          :initial="['1883']"
          rules="port"
          :depend="s.custom_enabled === '0'"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="allow_ra"
          :label="$t('Enable remote access')"
          :help="$t('Create a firewall rule that allows access to MQTT broker for remote hosts.')"
          :depend="s.custom_enabled === '0'"
        />
      </tlt-card>
      <tlt-card
        v-show="customConfiguration"
        :title="$t('Broker settings')"
      >
        <tlt-tabs :tabs="brokerTabs">
          <template #security>
            <vuci-form-item-switch
              :uci-section="s"
              name="use_tls_ssl"
              :label="$t('Use TLS/SSL')"
              :help="$t('Mark to use TLS/SSL for connection.')"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="tls_type"
              :label="$t('TLS type')"
              :help="$t('Select the type of TLS encryption.')"
              :options="tlsTypeOpts"
              :depend="s.use_tls_ssl === '1' && s.custom_enabled === '0'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="require_certificate"
              :label="$t('Require certificate')"
              :help="$t('Demand client certificate and key from the client.')"
              initial="1"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="device_sec_files"
              :label="$t('Certificate files from device')"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0' && certificatesStore.hasVuciAppCertificates"
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
              name="ca_file"
              :label="$t('CA file')"
              :help="$t('Upload CA file.')"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && (s.device_sec_files === '0' || !s.device_sec_files) && s.custom_enabled === '0'"
              max-size="16MB"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
            >
              <template #fileName="{ fileName }">
                {{ normalizeFileName(fileName) }}
              </template>
            </vuci-form-item-upload>
            <vuci-form-item-upload
              :uci-section="s"
              name="cert_file"
              :label="$t('Certificate file')"
              :help="$t('Upload certificate file.')"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && (s.device_sec_files === '0' || !s.device_sec_files) && s.custom_enabled === '0'"
              max-size="16MB"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
            >
              <template #fileName="{ fileName }">
                {{ normalizeFileName(fileName) }}
              </template>
            </vuci-form-item-upload>
            <vuci-form-item-upload
              :uci-section="s"
              name="key_file"
              :label="$t('Key file')"
              :help="$t('Upload key file.')"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && (s.device_sec_files === '0' || !s.device_sec_files) && s.custom_enabled === '0'"
              max-size="16MB"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
            >
              <template #fileName="{ fileName }">
                {{ normalizeFileName(fileName) }}
              </template>
            </vuci-form-item-upload>
            <!-- Select Certificates from router -->
            <vuci-form-item-select
              :uci-section="s"
              name="ca_file"
              :label="$t('CA file')"
              :help="$t('Select CA file.')"
              :options="caOptions"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.device_sec_files === '1' && s.custom_enabled === '0'"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
              :warnings="getCertificateWarning"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="cert_file"
              :label="$t('Certificate file')"
              :help="$t('Select certificate file.')"
              :options="certOptions"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.device_sec_files === '1' && s.custom_enabled === '0'"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
              :warnings="getCertificateWarning"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="key_file"
              :label="$t('Key file')"
              :help="$t('Select key file.')"
              :options="keyOptionsNonTpm2"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.device_sec_files === '1' && s.custom_enabled === '0'"
              :required="s.enabled === '1' && s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
            />
            <!-- End of selects form router -->
            <vuci-form-item-select
              :uci-section="s"
              name="tls_version"
              :label="$t('TLS version')"
              :help="$t('Minimum supported TLS version.')"
              :options="tlsVersionOpts"
              initial="all"
              :depend="s.tls_type === 'cert' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
              :warnings="
                value =>
                  value === 'tlsv1.1'
                    ? $t('TLS 1.1 is deprecated and considered insecure. Please upgrade to a newer TLS version.')
                    : value === 'all'
                      ? $t('TLS 1.1 will not be enabled because it is deprecated and considered insecure. If you need TLS 1.1, please select it explicitly.')
                      : ''
              "
            />
            <vuci-form-item-input
              :uci-section="s"
              name="psk"
              :label="$t('Pre-Shared-Key')"
              :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
              rules="hexstring"
              maxlength="128"
              :depend="s.tls_type === 'psk' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
              :placeholder-prefix="false"
              required
              password
              sensitive
            />
            <vuci-form-item-input
              :uci-section="s"
              name="identity"
              :label="$t('Identity')"
              :help="$t('Specify the identity.')"
              rules="uciname"
              :depend="s.tls_type === 'psk' && s.use_tls_ssl === '1' && s.custom_enabled === '0'"
              required
            />
          </template>
          <template #misc>
            <vuci-form-item-upload
              :uci-section="s"
              name="acl_file_path"
              :label="$t('ACL file')"
              :help="$t('Upload an access control list file. If defined, the contents of the file are used to control client access to topics on the broker.')"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-upload
              :uci-section="s"
              name="password_file"
              :label="$t('Password file')"
              :help="$t('Upload a password file. If defined, the contents of the file are used to control client access to the broker.')"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="persistence"
              :label="$t('Persistence')"
              :help="$t('If true, connection, subscription and message data will be written to the disk.')"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="anonymous_access"
              :label="$t('Allow anonymous')"
              initial="0"
              :help="$t('Allows anonymous access. If option is set to off, either ACL file or password file must be added.')"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="max_queued_messages"
              :label="$t('Max queued messages')"
              :help="$t('The maximum number of QoS 1 and 2 messages to hold in a queue per client above those that are currently in-flight. Set to 0 for no maximum (not recommended).')"
              rules="irange(0,65535)"
              placeholder="1000"
              initial="1000"
              :depend="s.custom_enabled === '0'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="max_packet_size"
              :label="$t('Maximum packet size')"
              :help="$t('Maximum size of packet before it will be dropped.')"
              placeholder="1048576"
              rules="irange(1, 268435456)"
              initial="1048576"
              :depend="s.custom_enabled === '0'"
            />
          </template>
        </tlt-tabs>
      </tlt-card>
    </vuci-named-section>
    <vuci-typed-section
      :show="customConfiguration"
      type="bridge"
      :title="$t('Bridges')"
      data-key="bridgeData"
      :columns="bridgeColumns"
      :edit-form="editModal"
      :endpoints="customConfiguration ? [{ endpoint: 'mqtt/bridge/config' }] : []"
      :table-actions="['column-list', 'search']"
      :uci-data="uciData"
      :after-delete="afterDelete"
    >
      <template #connection_name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="connection_name"
        />
      </template>
      <template #client_enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="client_enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './MqttBridgeEdit'
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
      formData: {},
      editModal: markRaw(EditForm),
      brokerTabs: [
        { name: 'security', title: this.$t('Security') },
        { name: 'misc', title: this.$t('Miscellaneous') }
      ],
      tlsTypeOpts: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      tlsVersionOpts: [
        ['tlsv1.1', 'TLS 1.1'],
        ['tlsv1.2', 'TLS 1.2'],
        ['tlsv1.3', 'TLS 1.3'],
        ['all', this.$t('Support all')]
      ],
      bridgeColumns: [
        {
          name: 'connection_name',
          label: this.$t('Bridge connection name')
        },
        {
          name: 'client_enabled',
          label: this.$t('Enable client')
        }
      ]
    }
  },
  computed: {
    customConfiguration() {
      return this.formData?.brokerData?.[0]?.custom_enabled !== '1'
    }
  },
  methods: {
    addValidate(addForm) {
      const BridgeExists = this.formData.bridgeData.some(bridge => bridge.connection_name === addForm.connection_name)
      if (!BridgeExists) return { valid: true }
      return {
        message: this.$t('Bridge with connection name %s already exists').format(addForm.connection_name),
        valid: false
      }
    },
    loadData(form) {
      const uciData = {}
      const endpoints = form.bridgeData.map(bridge => `/api/mqtt/bridge/${bridge.id}/topics/config`)
      return withCertificatesLoaded(
        this.$axios
          .bulkGet(endpoints)
          .then(response => {
            response.forEach((response, index) => {
              const sectionName = form.bridgeData[index].id
              if (response.success) {
                uciData[sectionName] = response.data
              } else {
                this.$message.error(this.$t('Failed to load topic data.'))
              }
            })
            return uciData
          })
          .catch(() => {
            this.$message.error(this.$t('An unexpected error occurred'))
          })
      )
    },
    validateTopics(bridgeData, topicData) {
      return bridgeData.some(data => {
        return ((topicData[data.id] && topicData[data.id].length === 0) || !topicData[data.id]) && data.client_enabled === '1'
      })
    },
    validateEnable(self) {
      if (self.model === '0' || !self.uciSection.client_enabled || self.uciSection.client_enabled === '0') return
      const { bridgeData, ...topicData } = this.formData
      const { remote_addr: remoteAddr, remote_port: remotePort, use_bridge_login: useBridgeLogin, remote_clientid: remoteClientID } = self.uciSection
      const isTopicEmpty = this.validateTopics(bridgeData, topicData)
      const requiredEnableOptions = []
      if (isTopicEmpty) {
        this.$message.error(this.$t('At least one topic is required to enable MQTT bridge'))
        self.model = '0'
      }
      if (!remoteAddr) requiredEnableOptions.push(this.$t('Remote address'))
      if (!remotePort) requiredEnableOptions.push(this.$t('Remote port'))
      if (useBridgeLogin === '1' && !remoteClientID) requiredEnableOptions.push(this.$t('Remote ID'))
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    },
    afterDelete(section, uciData) {
      delete uciData[section.id]
    },
    checkFiles() {
      return new Promise((resolve, reject) => {
        const brokerData = this.formData?.brokerData?.[0]
        if (brokerData?.enabled === '0') {
          return resolve()
        }
        if (brokerData?.anonymous_access === '0' && !brokerData.password_file && !brokerData.acl_file_path) {
          return reject(this.$t('If allow anonymous is off, password file or ACL file must be uploaded.'))
        }
        resolve()
      })
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
