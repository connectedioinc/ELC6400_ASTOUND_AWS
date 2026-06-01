<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="tinc"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'tinc/config' }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('Tinc interface'), section.id)"
      :uci-data="uciData"
      :error-handlers="{ edit: handleEditErrors }"
      data-key="tinc"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable')"
            :help="$t('Turn this tinc interface on/off.')"
            name="enabled"
            initial="0"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="local_ip"
            :label="$t('Local tunnel endpoint IP')"
            rules="ipmask4"
            :help="$t('IP address of virtual local network interface.')"
            :depend="s.mode === 'router'"
            placeholder="0.0.0.0/0"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="local_ipv6"
            :label="$t('Local tunnel endpoint IPv6')"
            rules="ipmask6"
            :help="$t('IPv6 address of virtual local network interface.')"
            :depend="s.mode === 'router'"
            placeholder="0:0:0:0:0:0:0:0/0"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="subnet"
            :label="$t('Subnet')"
            :help="$t('Subnets that peers are allowed to access. You can add multiple subnet entries for each daemon.')"
            :rules="validateSubnet"
            placeholder="0.0.0.0/0"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="privatekeyfile"
            :label="$t('Private Key')"
            :help="$t('Generated RSA private key.')"
            max-size="16MB"
            :required="s.enabled === '1'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-upload
            :uci-section="s"
            name="publickeyfile"
            :label="$t('Public Key')"
            :help="$t('Generated RSA public key.')"
            max-size="16MB"
            :required="s.enabled === '1'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="connectto"
            :label="$t('Host to Connect to')"
            :help="$t('Specifies which other tinc daemon to connect to on startup. Multiple variables may be specified, in which case outgoing connections to each specified tinc daemon are made.')"
            :options="hostOptions"
            multiple
          />
        </template>
        <template #advanced>
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            :help="$t('Configure the port on which this tinc daemon will listen for incoming connections.')"
            name="port"
            :rules="['port', validateDuplicatePort]"
            placeholder="655"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Address Family')"
            :help="$t('This option affects the address family of listening and outgoing sockets.')"
            :options="familyOptions"
            name="addressfamily"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="bindtoaddress"
            :label="$t('Bind To Address')"
            :help="$t('Addresses for Tinc VPN to use for listening sockets.')"
            rules="ipaddr"
            placeholder="0.0.0.0"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="bindtointerface"
            :label="$t('Bind To Interface')"
            :options="tunnelOptions"
            :help="$t('Interface to listen for incoming connections.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="keyexpire"
            :label="$t('Key Expire')"
            rules="irange(1, 90000000)"
            :help="$t('This option controls the time the encryption keys used to encrypt the data are Valid.')"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Mode')"
            :help="$t('This option selects the way packets are routed to other daemons.')"
            :options="modeOptions"
            name="mode"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="pinginterval"
            :label="$t('Ping Interval')"
            rules="irange(1, 86400)"
            :help="$t('The number of seconds of inactivity that tinc will wait before sending a probe to the other end.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="pingtimeout"
            :label="$t('Ping Timeout')"
            rules="irange(1, 86400)"
            :help="
              $t(
                'The number of seconds to wait for a response to pings or to allow meta connections to block. If the other end doesn\'t respond within this time, the connection is terminated, and the others will be notified of this.'
              )
            "
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      :type="'tinc-host_' + section.id"
      :endpoints="[{ endpoint: `tinc/${section.id}/hosts/config` }]"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('hosts'))"
      :help="$t('Here you can add your VPN hosts.')"
      :columns="hostColumns"
      :edit-form="editModal"
      :after-delete="deleteHosts"
      :add-validate="onAdd"
      :table-actions="['column-list', 'search']"
      data-key="tinc_hosts"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #description="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="description"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Add new instance')"
          prop="id"
          required
          :rules="['uciname', validateHostName]"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './TincHostEdit'
import { normalizeFileName } from '@/plugins/certificates'

export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      tabs: [
        { name: 'general', title: this.$t('General Setup') },
        { name: 'advanced', title: this.$t('Advanced Settings') }
      ],
      hostColumns: [
        { name: 'id', label: this.$t('Host name') },
        { name: 'description', label: this.$t('Description') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formData: {},
      familyOptions: [
        ['any', 'Any'],
        ['ipv4', 'IPv4'],
        ['ipv6', 'IPv6']
      ],
      modeOptions: [
        ['router', 'Router'],
        ['switch', 'Switch'],
        ['hub', 'Hub']
      ]
    }
  },
  computed: {
    interfaceData() {
      return this.formOptions().interfaceData
    },
    hostOptions() {
      return this.formData.tinc_hosts?.filter(i => i.net === this.section.id).map(i => [i.id, i.id]) || []
    },
    tunnelOptions() {
      return [['', this.$t('Any')], ...this.$network.createTunnelOptions(this.interfaceData, { includeAll: true })]
    },
    editErrors() {
      return {
        152: this.$t('Uploaded certificate is not valid'),
        default: this.$t('Failed to edit configuration')
      }
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    validateHostName(val) {
      let result = { isValid: true }
      const duplicateName = this.formData.tinc_hosts.some(host => host.id === val)
      if (duplicateName) {
        result = { isValid: false, message: this.$t('Tinc host with same name already exists.') }
      }
      return result
    },
    validateSubnet(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.ipmask()
      const res2 = this.$VuciValidator.macaddr()
      if (res.isValid || res2.isValid) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('One of the following: IPv4, IPv6 or MAC addresses are accepted (e.g., 192.168.1.0/24, 00:1a:2b:3c:4b:5c).')
      }
    },
    validateDuplicatePort(val) {
      const instances = this.formData?.tinc?.filter(tinc => tinc.port === val)
      return { isValid: instances.length < 2, message: this.$t('Port number must be unique') }
    },
    onAdd(_, dataSource) {
      if (dataSource.length >= 20) {
        return {
          valid: false,
          message: this.$t('Cannot create more instances. Only 20 instances are allowed.')
        }
      }
      return { valid: true }
    },
    validateEnable(self) {
      const section = self.uciSection
      const requiredEnableOptions = []
      if (!section.publickeyfile && section.enabled === '1') {
        requiredEnableOptions.push(this.$t('Public key'))
      }
      if (requiredEnableOptions.length) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
    },
    deleteHosts(deletedSection, uciData) {
      uciData.tinc[0].connectto = uciData.tinc[0].connectto.filter(i => {
        return i !== deletedSection.id
      })
    },
    handleEditErrors(res) {
      const errorCode = res.data.errors[0].code
      return this.editErrors[errorCode] || this.editErrors.default
    }
  }
}
</script>
