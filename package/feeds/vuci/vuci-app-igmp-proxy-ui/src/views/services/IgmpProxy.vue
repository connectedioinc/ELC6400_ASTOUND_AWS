<template>
  <vuci-form
    v-slot="{ uciData }"
    config="igmpproxy"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="igmpproxy_general"
      :title="$t('General IGMP Proxy settings')"
      :endpoints="[{ endpoint: 'igmp_proxy/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="quickleave"
        :label="$t('Quickleave')"
        :help="
          $t(
            'In this mode the daemon will send \
        a Leave IGMP message upstream as soon as it \
        receives a Leave message for any downstream interface.'
          )
        "
        :rmempty="false"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      data-key="igmpproxy"
      type="phyint"
      :title="$t('Routing interfaces configuration')"
      :columns="streamColumns"
      :edit-form="igmpProxy"
      :endpoints="[{ endpoint: 'igmp_proxy/routes/config' }]"
      :table-actions="['column-list', 'search']"
    >
      <template #direction="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="direction"
          :options="[
            ['upstream', $t('Upstream')],
            ['downstream', $t('Downstream')]
          ]"
        />
      </template>
      <template #network="{ s }">
        <template v-if="s.network">
          {{ $network.getInterfaceAndVpnName(interfaceStatus, s.network, 'name') }}
        </template>
        <template v-else> - </template>
      </template>
      <template #zone="{ s }">
        <zone-badge
          v-if="s.zone"
          :name="s.zone"
        />
        <template v-else> - </template>
      </template>
      <template #altnet="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="altnet"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw, computed } from 'vue'
import igmpProxy from './IgmpProxyEdit.vue'
import { network } from '@/plugins/network'

export default {
  provide() {
    return {
      formOptions: this.getFormData,
      [network.statusContext.contextId]: computed(() => this.interfaceStatus)
    }
  },
  data() {
    return {
      interfaceStatus: [],
      zones: [],
      igmpProxy: markRaw(igmpProxy),
      streamColumns: [
        {
          name: 'direction',
          label: this.$t('Direction'),
          rawhtml: true,
          help: this.$t(
            `%sUpstream%s - The upstream network interface is the outgoing
          interface which is responsible for communicating to available multicast
          data sources. There can only be one upstream interface. %s
          %sDownstream%s - Downstream network interfaces are the distribution
          interfaces to the destination networks, where multicast clients can
          join groups and receive multicast data. One or more downstream interfaces
          must be configured.`
          ).format('<b>', '</b>', '<br>', '<b>', '</b>')
        },
        {
          name: 'network',
          label: this.$t('Interface'),
          help: this.$t('The name of the interface the settings are for.')
        },
        {
          name: 'zone',
          label: this.$t('Firewall zone'),
          help: this.$t('Name of a firewall zone this interface belongs to.')
        },
        {
          name: 'altnet',
          label: this.$t('Networks'),
          help: this.$t(`A list of CIDR-masked Network entries
          to control what subnets are allowed to have their
          multicast data proxied. Multiple subnets can be
          configured or 0.0.0.0/0 specified to allow any
          network. Option can be omitted entirely to only
          allow same network as configured on interface.`)
        }
      ]
    }
  },
  computed: {
    interfaceOptions() {
      return this.$network.parseInterfaceAndVpnOptions(this.interfaceStatus.filter(o => o.network_type !== 'mobile'))
    }
  },
  methods: {
    afterLoad() {
      const requests = ['/api/interfaces/basic/status?include=vpn', '/api/firewall/zones/config']
      return this.$axios
        .bulkGet(requests)
        .then(([interfaceResponse, firewallResponse]) => {
          if (interfaceResponse.success) {
            this.interfaceStatus = interfaceResponse.data
          } else {
            this.$message.error(this.$t('Failed to load interface status'))
          }
          if (firewallResponse.success) {
            this.zones = firewallResponse.data.map(zone => zone.name)
          } else {
            this.$message.error(this.$t('Failed to load firewall zone data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    getFormData() {
      return {
        interfaces: this.interfaceOptions,
        zones: this.zones
      }
    }
  }
}
</script>
