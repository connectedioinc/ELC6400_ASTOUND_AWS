<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="ospf"
  >
    <vuci-named-section
      v-slot="{ s, sd }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/interface/config' }]"
      data-key="interface"
      :name="section.id"
      :title="$utils.getModalTitle($t('OSPF interface'))"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns Proto OSPF instance on and off.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="cost"
        :label="$t('Cost')"
        :help="$t('The cost value is set to router-LSA’s metric field and used for SPF calculation.')"
        rules="irange(1,65535)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="hello_interval"
        :label="$t('Hello Interval')"
        :help="$t('This value controls how frequently (every n seconds) a \'Hello\' packet is sent out on the specified interface.')"
        rules="irange(1,65535)"
        initial="10"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="dead_interval"
        :label="$t('Router Dead Interval')"
        :help="$t('This value must be the same for all routers attached to a common network.')"
        rules="irange(1,65535)"
        initial="40"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="retransmit_interval"
        :label="$t('Retransmit')"
        :help="$t('This value is used when retransmitting Database Description and Link State Request packets.')"
        rules="irange(0,65535)"
        initial="5"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="priority"
        :label="$t('Priority')"
        :help="$t('The router with the highest priority will be more eligible to become Designated Router. Setting the value to 0, makes the router ineligible to become Designated Router.')"
        rules="irange(0,255)"
        initial="1"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="type"
        :label="$t('Type')"
        :help="$t('You can choose different type of configuration.')"
        :options="type"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ptp_dmvpn"
        :label="$t('Enable DMVPN')"
        :help="$t('Enable this if you are using this OSPF point to point interface for DMVPN.')"
        :depend="s.type === 'point-to-point'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="authentication"
        :label="$t('Authentication')"
        :help="$t('Connection authentification methods.')"
        :options="authentication"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="router_id"
        :label="$t('ID')"
        rules="irange(1,100)"
        :depend="sd.authentication == 'md5_hmac'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        rules="credentials_validate"
        maxlength="512"
        :depend="sd.authentication == 'pass' || sd.authentication == 'md5_hmac'"
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
      authentication: [
        ['none', this.$t('None')],
        ['pass', this.$t('Password')],
        ['md5_hmac', this.$t('MD5 HMAC')]
      ],
      type: [
        ['broadcast', this.$t('Broadcast')],
        ['non-broadcast', this.$t('Non-Broadcast')],
        ['point-to-point', this.$t('Point-to-Point')],
        ['point-to-multipoint', this.$t('Point-to-Multipoint')]
      ]
    }
  }
}
</script>
