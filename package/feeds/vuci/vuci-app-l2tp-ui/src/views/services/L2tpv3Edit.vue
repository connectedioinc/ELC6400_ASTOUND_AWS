<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="tunnelData"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'l2tpv3/config' }]"
      :name="section.id"
      :uci-data="uciData"
      data-key="l2tpdv3"
    >
      <tlt-card :title="$utils.getModalTitle($t('L2TPv3 instance'), section.id)">
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the L2TPv3 instance on or off.')"
          name="enabled"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Local address')"
          :help="$t('WAN or LAN interface IPv4 or IPv6 address.')"
          name="localaddr"
          placeholder="0.0.0.0"
          rules="ipaddr"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Tunnel ID')"
          :help="$t('ID of tunnel is specified from 1 to 4294967295. The value used must be unique between instances and match the peer tunnel ID value being used at the peer.')"
          name="tunnel_id"
          placeholder="30"
          :rules="['range(1,4294967295)', validateTunnelId]"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Session ID')"
          :help="$t('ID of peer\'s session is specified from 1 to 4294967295. The value used must be unique between instances match the tunnel ID value being used at the peer.')"
          name="session_id"
          placeholder="40"
          :rules="['range(1,4294967295)', validateSessionId]"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Cookie')"
          :help="$t('Must be specified in hexidecimal form and be length of 8 or 16 (eg.: 89ABCDEF).')"
          name="cookie"
          placeholder="89ABCDEF"
          rules="hexstring"
          maxlength="16"
        />
      </tlt-card>
      <tlt-card :title="$t('Peer settings')">
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Peer address')"
          :help="$t('Peer endpoint IP address or domain name.')"
          name="peeraddr"
          placeholder="0.0.0.0"
          rules="host"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Peer tunnel ID')"
          :help="$t('ID of peer\'s tunnel is specified from 1 to 4294967295. It must match other end tunnel ID.')"
          name="peer_tunnel_id"
          placeholder="30"
          rules="range(1,4294967295)"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Peer session ID')"
          :help="$t('ID of peer\'s session is specified from 1 to 4294967295. It must match other end session ID.')"
          name="peer_session_id"
          placeholder="40"
          rules="range(1,4294967295)"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Peer cookie')"
          :help="$t('Must be specified in hexidecimal form and be length of 8 or 16. eg.: 89ABCDEF. It must match other end Cookie.')"
          name="peer_cookie"
          placeholder="89ABCDEF"
          rules="hexstring"
          maxlength="16"
        />
      </tlt-card>
      <tlt-card
        :initial-active="false"
        :title="$t('Instance settings')"
      >
        <vuci-form-item-select
          :uci-section="s"
          name="bridge_to"
          :label="$t('Bridge to')"
          :help="$t('Specify which interface to use when establishing pseudowire.')"
          :options="mapBridgedNetworkOptions()"
          initial="none"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('IPv4 address')"
          :help="$t('IP address of standalone L2TPv3 interface.')"
          name="ipaddr"
          placeholder="0.0.0.0"
          rules="ip4addr"
          :depend="s.bridge_to === 'none'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('IPv6 address')"
          :help="$t('IPv6 address of standalone L2TPv3 interface. CIDR notation: address/prefix.')"
          name="ip6addr"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000/0"
          rules="subnet6"
          :depend="s.bridge_to === 'none'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Netmask')"
          :help="$t('Netmask of standalone L2TPv3 interface.')"
          name="netmask"
          placeholder="255.255.255.0"
          rules="netmask"
          :depend="s.bridge_to === 'none'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('MTU')"
          :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
          name="mtu"
          placeholder="1500"
          rules="irange(68,9200)"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="encap"
          :label="$t('Encapsulation')"
          :help="$t('Specify technology to use when connecting to other end.')"
          :options="encapOptions"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('UDP source port')"
          name="udp_sport"
          placeholder="80"
          rules="port"
          required
          :depend="s.encap === 'udp'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('UDP destination port')"
          name="udp_dport"
          placeholder="80"
          rules="port"
          required
          :depend="s.encap === 'udp'"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="l2spec_type"
          :label="$t('Layer 2 specific header type')"
          :help="$t('It might be neccessary to set this option to none when using other hardware.')"
          :options="typeOptions"
          initial="default"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
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
      tunnelData: {},
      encapOptions: [
        ['ip', this.$t('IP')],
        ['udp', this.$t('UDP')]
      ],
      typeOptions: [
        ['none', this.$t('None')],
        ['default', this.$t('Linux default')]
      ]
    }
  },
  methods: {
    mapBridgedNetworkOptions() {
      const bridgeOptions = [['none', this.$t('None')]]
      const filteredIfaces = this.formOptions().interfaces.filter(iface => iface['.type'] === 'interface' && iface.bridge === '1')
      return bridgeOptions.concat(filteredIfaces.map(iface => [iface.id, iface.name]))
    },
    validateTunnelId(s) {
      const sameTunnelID = this.tunnelData.l2tpdv3.some(i => i.id !== this.section.id && i.tunnel_id === s)
      if (sameTunnelID) {
        return { isValid: false, message: this.$t('The Tunnel ID is already being used by another instance.') }
      }
      return { isValid: true }
    },
    validateSessionId(s) {
      const sameSessionlID = this.tunnelData.l2tpdv3.some(i => i.id !== this.section.id && i.session_id === s)
      if (sameSessionlID) {
        return { isValid: false, message: this.$t('The Session ID is already being used by another instance.') }
      }
      return { isValid: true }
    }
  }
}
</script>
