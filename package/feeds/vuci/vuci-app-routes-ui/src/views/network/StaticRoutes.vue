<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network;xl2tpd;pptpd"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="route"
      :endpoints="[{ endpoint: 'ip_routes/ipv4/config?table=254' }]"
      :form-methods="['get', 'create', 'edit', 'delete']"
      data-key="ipv4"
      :uci-data="uciData"
      :title="$t('Static IPv4 routes')"
      :columns="staticRoutesIPv4"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: isChildOfDMVPN(s) }, hints: deleteHints(s) }]"
      :table-actions="['column-list', 'search']"
    >
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface"
          :options="interfaceOptions"
        />
      </template>
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          rules="ip4addr"
          placeholder="0.0.0.0"
          required
        />
      </template>
      <template #netmask="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="netmask"
          rules="netmask"
          placeholder="255.255.255.255"
        />
      </template>
      <template #gateway="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="gateway"
          rules="ip4addr"
          placeholder="0.0.0.0"
        />
      </template>
      <template #metric="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="metric"
          rules="irange(0,4294967295)"
          placeholder="1"
        />
      </template>
      <template #mtu="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mtu"
          rules="irange(68,9200)"
          placeholder="1500"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="type"
          :options="type"
          initial=""
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      v-if="featureIpv6"
      :endpoints="[{ endpoint: 'ip_routes/ipv6/config?table=254' }]"
      :form-methods="['get', 'create', 'edit', 'delete']"
      data-key="ipv6"
      type="route6"
      :uci-data="uciData"
      :title="$t('Static IPv6 routes')"
      :columns="staticRoutesIPv6"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: isChildOfDMVPN(s) }, hints: deleteHints(s) }]"
      :table-actions="['column-list', 'search']"
    >
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface"
          :options="interfaceOptions"
        />
      </template>
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          rules="ipmask6"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
          required
        />
      </template>
      <template #gateway="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="gateway"
          rules="ip6addr"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
        />
      </template>
      <template #metric="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="metric"
          rules="irange(0,4294967295)"
          placeholder="1"
        />
      </template>
      <template #mtu="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mtu"
          rules="irange(68,9200)"
          placeholder="1500"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="type"
          :options="type"
          initial=""
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'

export default {
  data() {
    return {
      staticRoutesIPv4: [
        { name: 'interface', label: this.$t('Interface'), help: this.$t('The zone where the target network resides.') },
        { name: 'target', label: this.$t('Target'), help: this.$t('Host-IP or Network.') },
        {
          name: 'netmask',
          label: this.$t('IPv4-Netmask'),
          help: this.$t('A Mask that is applied to the Target to determine to what actual IP addresses the routing rule applies.')
        },
        {
          name: 'gateway',
          label: this.$t('IPv4-Gateway'),
          help: this.$t('Defines where the device should send all the traffic that applies to the rule.')
        },
        {
          name: 'metric',
          label: this.$t('Metric'),
          help: this.$t('The metric value is used as a sorting measure. If a packet about to be routed fits two rules, the one with the lower metric is applied.')
        },
        {
          name: 'mtu',
          label: this.$t('MTU'),
          help: this.$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')
        },
        {
          name: 'type',
          label: this.$t('Route type'),
          help: this.$t('Selects route type. Each type specifies a different behavior for the route.')
        }
      ],
      staticRoutesIPv6: [
        { name: 'interface', label: this.$t('Interface'), help: this.$t('The zone where the target network resides.') },
        { name: 'target', label: this.$t('Target'), help: this.$t('Host-IP or Network.') },
        {
          name: 'gateway',
          label: this.$t('IPv6-Gateway'),
          help: this.$t('Defines where the device should send all the traffic that applies to the rule.')
        },
        {
          name: 'metric',
          label: this.$t('Metric'),
          help: this.$t('The metric value is used as a sorting measure. If a packet about to be routed fits two rules, the one with the lower metric is applied.')
        },
        {
          name: 'mtu',
          label: this.$t('MTU'),
          help: this.$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')
        },
        {
          name: 'type',
          label: this.$t('Route type'),
          help: this.$t('Selects route type. Each type specifies a different behavior for the route.')
        }
      ],
      type: [
        ['', this.$t('Unicast')],
        ['local', this.$t('Local')],
        ['broadcast', this.$t('Broadcast')],
        ['multicast', this.$t('Multicast')],
        ['unreachable', this.$t('Unreachable')],
        ['prohibit', this.$t('Prohibit')],
        ['blackhole', this.$t('Blackhole')],
        ['anycast', this.$t('Anycast')]
      ],
      interfaces: []
    }
  },
  computed: {
    ...mapState(useMainStore, { featureIpv6: state => state.deviceInfo.features.ipv6 }),
    interfaceOptions() {
      return this.$network.parseInterfaceAndVpnOptions(this.interfaces)
    }
  },
  methods: {
    async loadData() {
      return this.$axios
        .get('/api/interfaces/basic/status?include=vpn')
        .then(({ data }) => {
          this.interfaces = data
        })
        .catch(() => this.$messages.error($t('Failed to load interface status')))
    },
    isChildOfDMVPN(s) {
      return s.service?.includes('dmvpn')
    },
    deleteHints(s) {
      return this.isChildOfDMVPN(s) ? [{ info: this.$t("This instance can't be deleted because it is part of DMVPN configuration") }] : []
    }
  }
}
</script>
