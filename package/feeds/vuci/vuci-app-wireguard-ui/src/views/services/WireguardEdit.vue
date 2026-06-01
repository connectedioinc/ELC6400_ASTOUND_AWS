<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'wireguard/config' }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('interface'), section.id)"
      :uci-data="uciData"
      data-key="wireguard"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable')"
            :help="$t('Turn this wireguard interface on/off.')"
            name="enabled"
            initial="0"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Private key')"
            :help="$t('Required. Base64-encoded private key for this interface.')"
            name="private_key"
            rules="base64"
            minlength="44"
            maxlength="44"
            required
            password
            sensitive
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Public key')"
            :help="$t('A key peers need connecting to this interface.')"
            name="public_key"
            minlength="44"
            maxlength="44"
          />
          <vuci-form-item-button
            :uci-section="s"
            name="generateKeys"
            :has-label="false"
            :text="$t('Generate key pair')"
            @click="generateKeys"
            >{{ $t('Generate key pair') }}
          </vuci-form-item-button>
          <vuci-form-item-list
            :uci-section="s"
            name="addresses"
            :label="$t('IP addresses')"
            :help="$t('Recommended. IP addresses with mask prefix of the WireGuard interface.')"
            :load="s.addresses?.includes('') ? initialIp() : s.addresses"
            :rules="['subnet', validateIp]"
            placeholder="0.0.0.0/24"
            :maxlines="Infinity"
          />
        </template>
        <template #advanced>
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Metric')"
            :help="$t('Metric value is optional.')"
            name="metric"
            placeholder="0"
            rules="range(0,65535)"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Listen port')"
            :help="$t('Required. UDP port used for outgoing and incoming packets.')"
            name="listen_port"
            placeholder="51820"
            rules="port"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('MTU')"
            :help="$t('Optional. Maximum Transmission Unit of tunnel interface. Range [68 to 9200]. If not specified, the MTU is automatically determined by physical interface MTU value.')"
            name="mtu"
            rules="irange(68,9200)"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('DNS servers')"
            :help="$t('DNS servers for interface.')"
            name="dns"
            rules="ipaddr"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Watchdog interval')"
            :help="
              $t('Optional. Interval in minutes to re-resolve hostnames for inactive WireGuard peers if domain is used. If not specified and domain is used, hostnames will be checked every minute.')
            "
            name="watchdog_interval"
            rules="irange(0,60)"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      :type="'wireguard_' + section.id"
      :endpoints="[{ endpoint: `wireguard/${section.id}/peers/config` }]"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('peers'))"
      :help="$t('Here you can add your VPN peers.')"
      :table-actions="['search', 'column-list']"
      :add-validate="maxPeerValidation"
      :columns="peerColumns"
      :edit-form="editModal"
      :add-title="$t('Add new peer instance')"
      data-key="wireguard_peers"
    >
      <template #name="{ s }">
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
      <template #public_key="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="public_key"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Add new instance')"
          prop="id"
          required
          :rules="['uciname', validatePeerName]"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './WireguardPeerEdit'
import { ipv4Utils } from '@/utils/ipUtils'

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
        { name: 'general', title: this.$t('General settings') },
        { name: 'advanced', title: this.$t('Advanced settings') }
      ],
      peerColumns: [
        { name: 'name', label: this.$t('Peer name') },
        { name: 'description', label: this.$t('Description') },
        { name: 'public_key', label: this.$t('Public key') }
      ],
      formData: {},
      initialKeys: {
        private: this.section.private_key,
        public: this.section.public_key
      },
      peerPublicKey: '',
      peerPrivateKey: ''
    }
  },
  computed: {
    mutatableSection() {
      return this.section
    }
  },
  methods: {
    generateKeys() {
      return this.$axios.post('/api/wireguard/actions/generate_keys').then(res => {
        this.mutatableSection.public_key = res.data.public
        this.mutatableSection.private_key = res.data.private
      })
    },
    validatePeerName(val) {
      let result = { isValid: true }
      const duplicateName = this.formData.wireguard_peers.some(peer => peer.id === val)
      if (duplicateName) {
        result = { isValid: false, message: this.$t('Wireguard peer with same name already exists.') }
      }
      return result
    },
    validateIp(self) {
      const networkInterfaces = this.formOptions()
        .interfaceStatus.filter(i => i.ipaddrs?.length && i.id !== this.section.id)
        .flatMap(i => i.ipaddrs)
      if (networkInterfaces.includes(self)) {
        return { isValid: false, message: this.$t('IP address is used for other interface') }
      }
      return { isValid: true }
    },
    maxPeerValidation() {
      const peers = this.formData.wireguard_peers.length
      if (peers >= 253) {
        return { valid: false, message: this.$t("Maximum number of WireGuard '%s' peer instances have been reached.").format(this.section.id) }
      }
      return { valid: true }
    },
    initialIp() {
      const networkInterfacesData = this.formOptions().interfaceStatus
      const initialIP = '10.5.0.1/24'
      const findNextAvailableIP = currentIP => {
        const [ip, mask] = currentIP.split('/')
        const [minIP, maxIP] = ipv4Utils.getIPRange(ip, mask)
        const interfaceWithIP = networkInterfacesData.find(i => i.ipaddrs && i.ipaddrs.includes(currentIP))
        if (interfaceWithIP) {
          const nextOctet = parseInt(ip.split('.')[2]) + 1
          const nextIP = `10.5.${nextOctet}.1/${mask}`
          if (ipv4Utils.checkIfInRange(`10.5.${nextOctet}.1`, minIP, maxIP)) {
            return findNextAvailableIP(nextIP)
          } else {
            return currentIP
          }
        } else {
          return currentIP
        }
      }
      let result = this.section.addresses.filter(address => address !== '')
      const nextAvailableIP = findNextAvailableIP(initialIP)
      if (!result.includes(nextAvailableIP)) {
        result.push(nextAvailableIP)
      }
      return result
    }
  }
}
</script>
