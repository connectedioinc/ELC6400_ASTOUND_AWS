<template>
  <vuci-form
    v-slot="{ uciData }"
    config="bgp"
    editing
  >
    <vuci-named-section
      v-slot="{ s, sd }"
      :uci-data="uciData"
      :name="section.id"
      :endpoints="[{ endpoint: `bgp/instance/${section.instance}/peer_group/config` }]"
      :data-key="`${section.instance}_bgp_peer_group`"
      :title="$utils.getModalTitle($t('BGP peer-group'), section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/Disable BGP peer.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="as"
        :label="$t('Remote AS')"
        :help="$t('Neighbour\'s remote AS.')"
        :rules="['uinteger', 'range(1,4294967295)']"
        placeholder="10"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="neighbor"
        :label="$t('Neighbor address')"
        :help="$t('Neighbour\'s remote IPv4 address.')"
        rules="ipaddr"
        placeholder="0.0.0.0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="listen_range"
        :label="$t('Listen Range')"
        :help="$t('Accept connections from any peers in the specified prefix.')"
        rules="subnet"
        placeholder="0.0.0.0/0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="adv_int"
        :label="$t('Advertisement interval')"
        :help="$t('Delay between updates for a neighbor session.')"
        rules="irange(0,600)"
        placeholder="10"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="cl_config_type"
        :label="$t('Neighbor configuration')"
        :help="$t('Configure a neighbor as Route Reflector or Route Server client.')"
        :options="clConfigType"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="next_hop_self"
        :label="$t('Disable next hop calculation')"
        :help="$t('Disable the next hop calculation for this group.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="next_hop_self_all"
        :label="$t('Apply also to ibgp-learned routes')"
        :help="$t('Apply also to ibgp-learned routes when acting as a route reflector.')"
        :depend="!!sd.next_hop_self"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="soft_rec_inbound"
        :label="$t('Inbound soft-reconfiguration')"
        :help="$t('Allow inbound soft reconfiguration for this neighbor.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="con_check"
        :label="$t('Disable connected check')"
        :help="$t('One-hop away EBGP peer using loopback address.')"
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
      clConfigType: [
        ['none', this.$t('None')],
        ['route-reflector-client', this.$t('Route Reflector client')],
        ['route-server-client', this.$t('Route Server client')]
      ]
    }
  }
}
</script>
