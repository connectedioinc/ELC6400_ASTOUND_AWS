<template>
  <vuci-form
    v-slot="{ uciData }"
    config="bgp"
    editing
    :after-load="loadInterfaceData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: `bgp/instance/${section.instance}/peer/config` }]"
      :data-key="`${section.instance}_bgp_peer`"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('BGP peer'), section.id)"
      :help="$t('BGP peer configuration.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/Disable BGP peer.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="allow_vpn"
        :label="$t('Allow VPN')"
        :help="$t('Allow this BGP peer to exchange VPN routes.')"
        :depend="uciData.bgp_instances.find(inst => inst.id === s.instance).vrf === ''"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="update_source"
        :label="$t('Update source')"
        :help="$t('Interface to use as update source.')"
        :options="[['', $t('None')], ...$network.dynamicRoutesInterfaces(ifaces)]"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="as"
        :label="$t('Remote AS')"
        :help="$t('Neighbour\'s remote AS.')"
        :rules="['uinteger', 'range(1,4294967295)']"
        placeholder="10"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ipaddr"
        :label="$t('Remote address')"
        :help="$t('Neighbour\'s remote IPv4 address.')"
        rules="ipaddr"
        placeholder="0.0.0.0"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Remote port')"
        :help="$t('Neighbour\'s remote port.')"
        rules="port"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ebgp_multihop"
        :label="$t('EBGP Multihop')"
        :help="$t('EBGP Multihop value.')"
        placeholder="0-255"
        rules="irange(0, 255)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="weight"
        :label="$t('Weight')"
        :help="$t('Specifies a default weight value for the neighbor’s routes. Higher weight is preferred.')"
        rules="range(0, 65535)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timer_keepalive"
        :label="$t('Keepalive timer')"
        :help="$t('Configures the intervals of keep alive messages.')"
        placeholder="0-65535"
        rules="irange(0, 65535)"
        :required="!!s.timer_holdtime"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timer_holdtime"
        :label="$t('Holdtime')"
        :help="$t('Configures how long to wait for a response from this neighbor before considering the peer unreachable.')"
        placeholder="0-65535"
        rules="irange(0, 65535)"
        :required="!!s.timer_keepalive"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timer_connect"
        :label="$t('Connect timer')"
        :help="$t('The amount of time in seconds, in which a connection to this peer must be established or else it is considered unsuccessful.')"
        placeholder="1-65535"
        rules="irange(1, 65535)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="default_originate"
        :label="$t('Default originate')"
        :help="$t('Announce default routes to the peer.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="description"
        :label="$t('Description')"
        rules="string"
        :help="$t('You can leave notes here.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password for this BGP Neighbor.')"
        rules="credentials_validate"
        maxlength="80"
        password
        sensitive
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      ifaces: []
    }
  },
  methods: {
    loadInterfaceData() {
      return this.$axios
        .get('/api/bgp/instance/general/peer/options')
        .then(({ data }) => {
          this.ifaces = data.available_interfaces
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load interface data'))
        })
    }
  }
}
</script>
