<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="bgp"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: `bgp/instance/config` }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('BGP instance'), section.id)"
      :uci-data="uciData"
      data-key="bgp_instances"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turn this network interface on/off.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="as"
        :label="$t('AS')"
        :help="$t('AS number is an identification of an autonomous system. BGP protocol uses the AS number for detecting whether the BGP connection is an internal one or external one.')"
        placeholder="1"
        rules="irange(1,4294967295)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="router_id"
        :label="$t('BGP router ID')"
        :help="$t('The router id is used by BGP to identify the routing device from which a packet originated. Default router ID value is selected as the largest IP Address of the interface.')"
        rules="ip4addr"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="network"
        :label="$t('Network')"
        :help="$t('Add the announcement network.')"
        rules="ipmask4"
        :placeholder="$t('any')"
      />
      <vuci-form-item-select
        :depend="$store.hasPackages('vuci-app-vrf-api.control')"
        :uci-section="s"
        name="vrf"
        :label="$t('VRF interface')"
        :options="vrfInterfaces"
        :placeholder="$t('-- Please choose --')"
        :disabled-options="vrfInterfacesDisabled"
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="rd_export"
        :label="$t('Export route distinguisher')"
        rules="irange"
        inputs="input,input"
        :write-parse="saveCustom"
        separator=":"
        :input-props="customFieldProps(s, 'rd_export')"
        :depend="s.vrf !== '' && $store.hasPackages('vuci-app-vrf-api.control')"
      >
        <template #help>
          {{ $t('Specifies the route distinguisher to be added to a route exported from the current unicast VRF to VPN.') }}
          <br />
          <strong>{{ 'AS/IP' }}</strong> - {{ $t('Value must be an integer between 0 and 2808348671 or a valid IPv4 address.') }}
          <br />
          <strong>{{ 'NN' }}</strong> - {{ $t('Value must be an integer between 0 and 40959.') }}
        </template>
      </vuci-form-item-custom>
      <vuci-form-item-custom
        :uci-section="s"
        name="rt_export"
        :label="$t('Export route targets')"
        inputs="input,input"
        :write-parse="saveCustom"
        :input-props="customFieldProps(s, 'rt_export')"
        separator=":"
        :depend="s.vrf !== '' && $store.hasPackages('vuci-app-vrf-api.control')"
      >
        <template #help>
          {{ $t('Specifies the route-target list to be attached to a route (import) when importing between the current unicast VRF and VPN.') }}
          <br />
          <strong>{{ 'AS/IP' }}</strong> - {{ $t('Value must be an integer between 0 and 2808348671 or a valid IPv4 address.') }}
          <br />
          <strong>{{ 'NN' }}</strong> - {{ $t('Value must be an integer between 0 and 40959.') }}
        </template>
      </vuci-form-item-custom>
      <vuci-form-item-custom
        :uci-section="s"
        name="rt_import"
        :label="$t('Import route targets')"
        inputs="input,input"
        :write-parse="saveCustom"
        :input-props="customFieldProps(s, 'rt_import')"
        separator=":"
        :depend="s.vrf !== '' && $store.hasPackages('vuci-app-vrf-api.control')"
      >
        <template #help>
          {{ $t('Specifies the route-target list to be attached to a route (export) when exporting between the current unicast VRF and VPN.') }}
          <br />
          <strong>{{ 'AS/IP' }}</strong> - {{ $t('Value must be an integer between 0 and 2808348671 or a valid IPv4 address.') }}
          <br />
          <strong>{{ 'NN' }}</strong> - {{ $t('Value must be an integer between 0 and 40959.') }}
        </template>
      </vuci-form-item-custom>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Export to VPN')"
        :help="$t('Enables export of routes between the current unicast VRF and VPN.')"
        name="export_vpn"
        :depend="s.vrf !== '' && $store.hasPackages('vuci-app-vrf-api.control')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Import to VPN')"
        :help="$t('Enables import of routes between the current unicast VRF and VPN.')"
        name="import_vpn"
        :depend="s.vrf !== '' && $store.hasPackages('vuci-app-vrf-api.control')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="redistribute"
        :label="$t('Redistribution options')"
        :help="$t('Route redistribution is a process that allows a network to use a routing protocol to dynamically route traffic based on information learned from a different routing protocol.')"
        :options="redistribute"
        :placeholder="$t('-- Please choose --')"
        allow-create
        multiple
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="deterministic_med"
        :label="$t('Deterministic MED')"
        :help="$t('Compare MED between same AS ignoring their age.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ebgp_requires_policy"
        :label="$t('eBGP Requires Policy')"
        :help="$t('Enable/Disable eBGP Import or Export policy requirement. Enabled by default as per RFC 8212.')"
        initial="1"
      />
    </vuci-named-section>
    <vuci-typed-section
      type="bgp_peer"
      :title="$utils.getModalTitle($t('BGP peers'))"
      :columns="peer"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `bgp/instance/${section.id}/peer/config` }]"
      :edit-form="protoBgpPeersEdit"
      :data-key="`${section.id}_bgp_peer`"
      :table-actions="['search', 'column-list']"
      :add-validate="(_, sections) => addValidateChildInstances(sections, $t('peers'))"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: isBgpPeerUsed(s) }, hints: bgpDeleteHint(s) }]"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #as="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="as"
          rules="irange(1,4294967295)"
          placeholder="1"
        />
      </template>
      <template #ipaddr="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="ipaddr"
          rules="ipaddr"
          placeholder="0.0.0.0"
          required
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('BGP peer name')"
          prop="id"
          rules="uciname"
          maxlength="32"
          required
        />
      </template>
      <template #delete="{ s, actions }">
        <tlt-hint
          :hints="bgpDeleteHint(s)"
          align-right
        >
          <tlt-button
            button-id="delete"
            type="text"
            size="md"
            color="error"
            :readonly="isBgpPeerUsed(s)"
            @click="actions.delete(s.id)"
          >
            {{ $t('Delete') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :type="`bgp_peer_group`"
      :title="$utils.getModalTitle($t('BGP peer groups'))"
      :add-validate="(_, sections) => addValidateChildInstances(sections, $t('peer groups'))"
      :edit-form="ProtoBgpPeersGroupsEdit"
      :columns="peerGroup"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `bgp/instance/${section.id}/peer_group/config` }]"
      :table-actions="['search', 'column-list']"
      :data-key="`${section.id}_bgp_peer_group`"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #as="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="as"
          rules="irange(1,4294967295)"
          placeholder="1"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('BGP peer group name')"
          prop="id"
          rules="uciname"
          maxlength="32"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      type="bgp_route_map_filters"
      :title="$utils.getModalTitle($t('Route map filters'))"
      :columns="routeMapFilters"
      :data-key="`${section.id}_bgp_route_map_filters`"
      :uci-data="uciData"
      :add-validate="(_, sections) => addValidateChildInstances(sections, $t('route map filters'))"
      :table-actions="['search', 'column-list']"
      :endpoints="[{ endpoint: `bgp/instance/${section.id}/map_filters/config` }]"
    >
      <template #target="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="target"
          :options="peerOptions"
          required
        />
      </template>
      <template #route_map="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="route_map"
          :options="routeMapFiltersOptions"
          required
        />
      </template>
      <template #direction="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="direction"
          :options="direction"
          required
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import protoBgpPeersEdit from './ProtoBgpPeersEdit.vue'
import ProtoBgpPeersGroupsEdit from './ProtoBgpPeersGroupsEdit.vue'

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
      protoBgpPeersEdit: markRaw(protoBgpPeersEdit),
      ProtoBgpPeersGroupsEdit: markRaw(ProtoBgpPeersGroupsEdit),
      formData: {},
      redistribute: [
        ['connected', this.$t('Connected routes')],
        ['kernel', this.$t('Kernel added routes')],
        ['nhrp', this.$t('NHRP routes')],
        ['ospf', this.$t('OSPF routes')],
        ['static', this.$t('Static routes')]
      ],
      peer: [
        { name: 'id', label: this.$t('Name') },
        { name: 'as', label: this.$t('Remote AS'), help: this.$t("Neighbour's remote AS.") },
        { name: 'ipaddr', label: this.$t('Remote address'), help: this.$t("Neighbour's remote IPv4 address."), required: true },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      peerGroup: [
        { name: 'id', label: this.$t('Name') },
        { name: 'as', label: this.$t('Remote AS'), help: this.$t("Neighbour's remote AS.") },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      routeMapFilters: [
        { name: 'target', label: this.$t('Peer'), help: this.$t('Applies the filter for the specified peer.') },
        { name: 'route_map', label: this.$t('Route map'), help: this.$t('Route map filter to apply.') },
        {
          name: 'direction',
          label: this.$t('Direction'),
          help: this.$t('If direction is Inbound, the access list is applied to input routes. If direction is Outbound the access list is applied to advertised routes.')
        },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Enable/Disable BGP route map filter.') }
      ],
      action: [
        ['permit', this.$t('Permit')],
        ['deny', this.$t('Deny')]
      ],
      route_map: [
        ['xfh', this.$t('xfh')],
        ['af', this.$t('af')]
      ],
      direction: [
        ['in', this.$t('Inbound')],
        ['out', this.$t('Outbound')]
      ],
      deleteErrors: {
        103: this.$t('This instance is used by a route map filter'),
        default: this.$t('Failed to delete configuration')
      }
    }
  },
  computed: {
    peerOptions() {
      return this.formData[`${[this.section.id]}_bgp_peer`]?.map(x => [x.id, x.id])
    },
    routeMapFiltersOptions() {
      return this.formData.route_maps.map(x => [x.id, x.id])
    },
    vrfInterfaces() {
      const opts = [['', this.$t('Default')]]
      return opts.concat(this.formOptions().vrfInterfaces.map(iface => [iface.id, `${this.$network.getName(iface)}`]))
    },
    vrfInterfacesDisabled() {
      return this.formData.bgp_instances.filter(x => x.id !== this.section.id).map(iface => (iface?.vrf ? [iface.vrf, `${iface.vrf}`] : ['', this.$t('Default')]))
    }
  },
  methods: {
    addValidateChildInstances(sections, name) {
      const error = !this.formData.route_maps.length ? this.$t('Route maps') : !this.formData[`${[this.section.id]}_bgp_peer`].length ? this.$t('BGP peers') : false
      if (name === 'route map filters' && error) return { valid: false, message: this.$t("At least one '%s' instance has to be created to create 'Route map filters' instance").format(error) }
      const numberOfInstances = sections.length
      return { valid: numberOfInstances < 50, message: this.$t("Maximum number (50) of 'BGP %s' has been reached for this BGP instance").format(name) }
    },
    isBgpPeerUsed(s) {
      return this.formData[`${s.instance}_bgp_route_map_filters`]?.some(x => x.target === s.id)
    },
    bgpDeleteHint(s) {
      return this.isBgpPeerUsed(s) ? [{ info: this.$t("This instance can't be deleted because it is used by 'Route map filters' instance(s)") }] : []
    },
    customFieldProps(s, fieldName) {
      const fieldValue = s[fieldName] || ''
      const [asIpValue = '', nnValue = ''] = fieldValue.split(':')
      return [
        {
          prop: `${fieldName}_as_ip`,
          rules: this.validateAsIp,
          placeholder: 'AS/IP',
          required: nnValue !== ''
        },
        {
          prop: `${fieldName}_nn`,
          rules: 'irange(0, 40959)',
          placeholder: 'NN',
          required: asIpValue !== ''
        }
      ]
    },
    validateAsIp(value) {
      this.$VuciValidator.value = value
      const resIp4addr = this.$VuciValidator.ip4addr()
      const resIrange = this.$VuciValidator.irange('0', '2808348671')
      if (resIp4addr.isValid || resIrange.isValid) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('Value must be an integer between 0 and 2808348671 or a valid IPv4 address')
      }
    },
    saveCustom(params) {
      return params ? params.join(':') : ''
    }
  }
}
</script>
