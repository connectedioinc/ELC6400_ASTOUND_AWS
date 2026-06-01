<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="network"
    :extra-load="loadZones"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: `wireguard/${parent}/peers/config` }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('WireGuard peer'), section.id)"
      :uci-data="uciData"
      data-key="wireguard_peers"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Public key')"
            :help="$t('Required. Base64-encoded public key of peer.')"
            name="public_key"
            :rules="['base64', validateKey]"
            minlength="44"
            maxlength="44"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Endpoint host')"
            :help="$t('Optional. Host of peer. Names are resolved prior to bringing up the interface.')"
            name="endpoint_host"
            placeholder="vpn.example.com"
            rules="host"
            :required="s.tunlink !== 'any'"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="allowed_ips"
            :label="$t('Allowed IPs')"
            :load="s.allowed_ips?.includes('') ? tunnelAddress : s.allowed_ips"
            :help="
              $t('Required. IP addresses and prefixes that this peer is allowed to use inside the tunnel. Usually the peer\'s tunnel IP addresses and the networks the peer routes through the tunnel.')
            "
            rules="ipmask"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Description')"
            :help="$t('Optional. Description of peer.')"
            name="description"
            :placeholder="$t('My Peer')"
            rules="string"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Route allowed IPs')"
            :help="$t('Optional. Create routes for Allowed IPs for this peer.')"
            name="route_allowed_ips"
          />
        </template>
        <template #advanced>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Tunnel source')"
            :help="$t('Interface to bind this instance to.')"
            name="tunlink"
            rules="uciname"
            maxlength="16"
            allow-create
            :options="tunnelOptions"
          />
          <vuci-form-item-radio-group
            v-if="s.tunlink !== 'any'"
            :uci-section="s"
            :label="$t('Tunnel source mode')"
            :help="$t('Choose whether to persist or prefer the connection on the selected interface.')"
            name="force_tunlink"
            :options="selected"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Pre-shared key')"
            :help="
              $t(
                'Optional. Base64-encoded pre-shared key. \
                        Adds in an additional layer of symmetric-key \
                        cryptography for post-quantum resistance.'
              )
            "
            name="preshared_key"
            password
            sensitive
            rules="base64"
            minlength="0"
            maxlength="44"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Endpoint port')"
            :help="$t('Optional. Port of peer.')"
            name="endpoint_port"
            placeholder="51820"
            rules="port"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Persistent keep alive')"
            :help="$t('Optional. Seconds between keep alive messages. Default is 0 (disabled). Recommended value if this device is behind a NAT is 25. Range [0 to 65535].')"
            name="persistent_keepalive"
            placeholder="0"
            rules="range(0,65535)"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Routing table')"
            :help="$t('Optional. Defines which routing table to use for this peer routes, not necessary to configure for most setups.')"
            name="table"
            rules="string"
          />
        </template>
        <template #qr>
          <vuci-form-item-select
            :uci-section="s"
            name="interface"
            :label="$t('Server IP')"
            :help="$t('Specifies which interface\'s IP address should be bound to the hostname.')"
            :options="getInterfaces"
            allow-create
            no-write
          />
          <vuci-form-item-list
            :uci-section="s"
            name="server_address"
            :label="$t('Tunnel addresses')"
            :help="$t('WireGuard interface IP address for client.')"
            placeholder="10.0.0.1"
            :load="tunnelAddress"
            rules="subnet"
            no-write
          />
          <vuci-form-item-select
            :uci-section="s"
            name="allowedips"
            :label="$t('Peer allowed IPs')"
            :help="
              $t('Required. IP addresses and prefixes that this peer is allowed to use inside the tunnel. Usually the peer\'s tunnel IP addresses and the networks the peer routes through the tunnel.')
            "
            :options="peerAllowedIps"
            :initial="['0.0.0.0/0', '::/0']"
            multiple
            required
            no-write
            :rules="['ipmask', validatePeerAllowedIps]"
            allow-create
          />
          <tlt-form-model-item
            class="flex items-center"
            :label="$t('QR code')"
          >
            <tlt-hint
              :hints="
                getParent().addresses[0] === ''
                  ? [{ info: $t('\'IP Addresses\' value is empty in the \'WireGuard Interface\' configuration. \'IP Addresses\' is required for QR code generation.') }]
                  : []
              "
              class="self-center"
            >
              <tlt-button
                :readonly="getParent().addresses.includes('')"
                type="text"
                no-write
                @click="generateQRAndKeys"
              >
                {{ qr ? $t('Regenerate') : $t('Generate') }}
              </tlt-button>
            </tlt-hint>
          </tlt-form-model-item>
          <tlt-form-model-item v-if="qr">
            <qr-code
              id="qrCode"
              :value="qr"
              :size="qrSize"
            />
          </tlt-form-model-item>
          <tlt-form-model-item v-if="qr">
            <vuci-form-item-button
              v-if="qr"
              :uci-section="s"
              type="text"
              colors="tertiary"
              name="download"
              no-write
              @click="createCard()"
            >
              {{ $t('Download QR code') }}
            </vuci-form-item-button>
          </tlt-form-model-item>
          <tlt-inline-message
            id="generate_warning"
            type="warning"
            :message="$t('QR codes are single-use only. Please note that regenerating a QR code will replace the previous one, making the earlier QR code invalid.')"
          />
          <tlt-inline-message
            v-if="!zones.in.includes('wireguard')"
            id="generate_warning"
            type="info"
          >
            {{ $t('To allow peers to reach the internet over tunnel, you need to permit traffic from the WireGuard zone to the WAN zone.') }}
            {{ $t('Configure it') }}
            <router-link to="/network/firewall/zones?edit=3"> {{ $t('here') }} </router-link>.
          </tlt-inline-message>
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { ipv4Utils, ipv6Utils } from '@/utils/ipUtils'
import { utils } from '@/plugins/utils'
import QrCode, { escapeMecard } from '@/components/QrCode.vue'

export default {
  components: { QrCode },
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      parent: this.section['.type'].replace('wireguard_', ''),
      tabs: [
        { name: 'general', title: this.$t('General settings') },
        { name: 'advanced', title: this.$t('Advanced settings') },
        { name: 'qr', title: this.$t('QR settings') }
      ],
      formData: {},
      peerPrivateKey: '',
      peerPublicKey: '',
      qr: '',
      qrSize: 190,
      selected: [
        { name: this.$t('Prefer'), value: '0' },
        { name: this.$t('Persist'), value: '1' }
      ],
      zones: {}
    }
  },
  computed: {
    tunnelOptions() {
      return this.getTunnelOptions()
    },
    getInterfaces() {
      return this.formOptions()
        .interfaceStatus.filter(o => o.id !== 'loopback' && o.id !== 'ifmirror' && o.area_type === 'wan')
        .flatMap(item => {
          const interfaceName = this.$network.getName(item)?.toUpperCase()
          const ip4Options =
            item.ipaddrs?.map(ipaddr => {
              const ip4 = ipaddr.split('/')[0]
              return [ip4, `${interfaceName} IPv4 (${ip4})`]
            }) || []

          const ip6Options =
            item.ip6addrs?.map(ip6addr => {
              const ip6 = ip6addr.split('/')[0]
              return [ip6, `${interfaceName} IPv6 (${ip6})`]
            }) || []
          return [...ip4Options, ...ip6Options]
        })
    },
    tunnelAddress() {
      const ips = this.getNextAvailableIPs() || []
      return [...ips]
    },
    mutatableSection() {
      return this.section
    }
  },
  methods: {
    loadZones() {
      return this.$axios
        .get('/api/firewall/zones/config')
        .then(res => {
          if (!res.success) return this.$message.error(this.$t('Failed to load firewall zone settings'))
          this.zones = res.data[1]
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    buildConfigString(content) {
      let config = [
        '[Interface]',
        `PrivateKey = ${escapeMecard(content.privateKey)}`,
        `Address = ${content.address || '172.16.0.4/24'}`,
        `DNS = ${content?.dns.length ? content.dns[0].split('/')[0] : '172.16.0.1'}`,
        '',
        '[Peer]',
        `PublicKey = ${escapeMecard(content.publicKey)}`,
        `AllowedIPs = ${content.allowedIps || '0.0.0.0/0'}`
      ]
      if (content.serverIp && content.serverPort) {
        const serverIp = content.serverIp
        config.push(`Endpoint = ${serverIp.includes(':') ? `[${serverIp}]` : serverIp}:${content.serverPort}`)
      }
      config.push(`PersistentKeepalive = ${content.keepAlive || '15'}`)
      if (content.preSharedKey) {
        config.push(`PresharedKey = ${escapeMecard(content.preSharedKey)}`)
      }
      return config.join('\n')
    },
    updateRadio(option) {
      this.selected.forEach(data => (data.checked = data.value === option))
    },
    validateKey(value) {
      const sections = this.formData.wireguard_peers.filter(section => section['.type'] === this.section['.type'] && section.id !== this.section.id)
      const isValid = !sections.some(section => section.public_key === value)
      return {
        isValid,
        message: this.$t('Public key cannot be the same between peers')
      }
    },
    getParent() {
      return this.formData.wireguard.find(item => item.id === this.parent)
    },
    generateQRAndKeys() {
      return this.$axios
        .post('/api/wireguard/actions/generate_keys')
        .then(this.handleGeneratedKeys)
        .then(() => {
          this.qr = this.buildConfigString(this.getPeerQrContent())
          this.$message.success(this.$t('New peer public key successfully configured'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    handleGeneratedKeys(res) {
      this.peerPublicKey = res.data.public
      this.mutatableSection.public_key = this.peerPublicKey
      this.peerPrivateKey = res.data.private
      return this.$axios.put(`/api/wireguard/${this.parent}/peers/config/${this.section.id}`, {
        data: { public_key: this.peerPublicKey }
      })
    },
    getPeerQrContent() {
      const parent = this.getParent()
      return {
        publicKey: parent.public_key,
        peerPublicKey: this.peerPublicKey,
        privateKey: this.peerPrivateKey,
        config: { section: parent.id, peerId: this.section.id },
        serverPort: parent.listen_port,
        address: this.section.server_address,
        allowedIps: this.section.allowedips,
        preSharedKey: this.section.preshared_key,
        keepAlive: this.section.persistent_keepalive,
        dns: parent.addresses,
        serverIp: this.section.interface
      }
    },
    peerAllowedIps() {
      const options = [
        ['0.0.0.0/0', `${this.$t('All IPv4')} (0.0.0.0/0)`],
        ['::/0', `${this.$t('All IPv6')} (::/0 )`]
      ]
      this.formOptions().interfaceStatus.forEach(item => {
        if (item.area_type === 'lan' && item.id !== 'loopback' && !!item.ipaddrs.length) {
          const mask = item.ipaddrs[0].split('/')[1]
          const ipRange = ipv4Utils.cidrToRange(item.ipaddrs[0])[0]
          options.push([`${ipRange}/${mask}`, `${this.$network.getName(item)?.toUpperCase()} IPv4 (${ipRange}/${mask})`])
        }
        if (item.area_type === 'lan' && item.id !== 'loopback' && !!item.ip6addrs && !!item.ip6addrs.length) {
          const mask = item.ip6addrs[0].split('/')[1]
          const ip6Range = ipv6Utils.cidrToRange(item.ip6addrs[0])[0]
          options.push([`${ip6Range}/${mask}`, `${this.$network.getName(item)?.toUpperCase()} IPv6 (${ip6Range}/${mask})`])
        }
      })
      return options
    },
    validatePeerAllowedIps(self) {
      if (self.length > 0 && self.includes('0.0.0.0/0)') && self.includes('::/0)')) {
        return { isValid: false, message: this.$t(`Option "All" already includes LAN interfaces.`) }
      }
      return { isValid: true }
    },
    getNextAvailableIPs() {
      const { addresses } = this.getParent()
      if (!addresses?.length) return []
      const [startIP, endIP] = ipv4Utils.cidrToRange(addresses[0])
      const startIPInt = ipv4Utils.ip2int(startIP)
      const endIPInt = ipv4Utils.ip2int(endIP)
      const usedIPs = new Set(
        this.formData.wireguard_peers
          .filter(peer => peer.id !== this.section.id && peer.allowed_ips && peer.allowed_ips.length)
          .flatMap(peer => peer.allowed_ips)
          .map(ip => ipv4Utils.ip2int(ip.split('/')[0]))
      )
      for (let ipInt = startIPInt + 2; ipInt < endIPInt; ipInt++) {
        if (!usedIPs.has(ipInt)) {
          return [`${ipv4Utils.int2ip(ipInt)}/32`]
        }
      }
      return []
    },
    createCard() {
      const qrCode = document.getElementById('qrCode')
      const canvas = document.createElement('CANVAS')
      const ctx = canvas.getContext('2d')
      const margin = 10
      canvas.height = qrCode.height + margin * 2
      canvas.width = qrCode.width + margin * 2
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(qrCode, margin, margin, qrCode.height, qrCode.width)
      utils.downloadFromDataURL(canvas.toDataURL(), 'QR_Code_Wireguard.png')
    },
    getTunnelOptions() {
      return [['any', this.$t('Any')], ...this.$network.createTunnelOptions(this.formOptions().interfaces)]
    }
  }
}
</script>
