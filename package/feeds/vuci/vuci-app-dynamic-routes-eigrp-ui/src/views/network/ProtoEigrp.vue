<template>
  <vuci-form
    v-slot="{ uciData }"
    config="eigrp"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'eigrp/config' }]"
      data-key="eigrp"
      :title="$t('EIGRP - global settings')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Toggles EIGRP network ON or OFF.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="debug"
        :label="$t('Enable logging')"
        :help="$t('Enable logging of EIGRP.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="as"
        :label="$t('AS')"
        :help="
          $t(
            'EIGRP uses this number so that it makes sure it only talks to other EIGRP speakers \
          that are in the same AS. For instance, if you have two routers, one with \'router eigrp 1\' \
          and one with \'router eigrp 2,\' then they would not form an adjacency'
          )
        "
        rules="irange(1,65535)"
        placeholder="1"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        name="router_id"
        :uci-section="s"
        :label="$t('Router ID')"
        :help="$t('EIGRP Router-ID in IP address format.')"
        rules="ip4addr"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="network"
        :label="$t('Network')"
        :help="$t('Add the announcement network.')"
        rules="subnet4"
        :placeholder="$t('any')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="redistribute"
        :label="$t('Redistribution options')"
        :help="$t('Redistribute information from another routing protocol.')"
        :options="redistribute"
        :placeholder="$t('-- Please choose --')"
        maxlength="32"
        allow-create
        multiple
      />
      <vuci-form-item-list
        :uci-section="s"
        name="neighbor"
        :label="$t('Neighbors')"
        :help="$t('Add neighbor IP addresses.')"
        rules="ipmask4"
        :placeholder="$t('any')"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      redistribute: [
        ['connected', this.$t('Connected routes')],
        ['kernel', this.$t('Kernel added routes')],
        ['nhrp', this.$t('NHRP routes')],
        ['ospf', this.$t('OSPF routes')],
        ['static', this.$t('Static routes')]
      ]
    }
  }
}
</script>
