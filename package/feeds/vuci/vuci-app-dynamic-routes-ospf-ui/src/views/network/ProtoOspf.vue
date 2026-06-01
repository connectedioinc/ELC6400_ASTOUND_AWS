<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    bulk-request
    config="ospf;network"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/global' }]"
      data-key="ospf"
      name="ospf"
      :title="$t('OSPF - global settings')"
      :table-actions="['search', 'column-list']"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable service')"
        :help="$t('Enable/Disable OSPF protocol.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="debug"
        :label="$t('Enable logging')"
        :help="$t('Enable logging of OSPF.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled_vty"
        :label="$t('Enable vty')"
        :help="$t('Enable/Disable vty access from LAN.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="ospfd_custom_conf"
        :label="$t('Import config')"
        :help="$t('Use imported OSPF configuration.')"
        endpoint="/api/ospf/global"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="router_id"
        :label="$t('Router ID')"
        :help="$t('OSPF router ID in IPv4 address format.')"
        rules="ip4addr"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="passive_ifname"
        :label="$t('Passive interfaces')"
        :help="$t('OSPF hello packets are not sent on these interfaces.')"
        :options="$network.dynamicRoutesInterfaces(ifaces)"
        multiple
      />
      <vuci-form-item-select
        :uci-section="s"
        name="originate"
        :label="$t('Generate a default external route')"
        :help="`<b>${$t('Default')}</b> - ${$t('Advertises the default route if the route is in the route table.')}<br>\
                <b>${$t('Always')}</b> - ${$t('Specifies to always advertise the default route regardless of whether the route table has a default route.')}`"
        :options="originate"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        name="redistribute"
        :label="$t('Redistribution options')"
        :help="$t('Route redistribution is a process that allows a network to use a routing protocol to dynamically route traffic based on information learned from a different routing protocol.')"
        :options="redistributeOptions"
        maxlength="32"
        multiple
        allow-create
      />
    </vuci-named-section>
    <vuci-typed-section
      type="ospf_interface"
      :title="$t('OSPF interfaces')"
      :table-actions="['column-list', 'search']"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/interface/config' }]"
      data-key="interface"
      :columns="ospfInterface"
      :edit-form="protoOspfInterfaceEdit"
    >
      <template #ifname="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="ifname"
          :options="$network.dynamicRoutesInterfaces(ifaces)"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      type="ospf_neighbor"
      :title="$t('OSPF neighbors')"
      :table-actions="['column-list', 'search']"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/neighbor/config' }]"
      data-key="neighbor"
      :columns="ospfNeighbors"
      :edit-form="ospfNeighborsEdit"
    >
      <template #neighbor="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="neighbor"
        />
      </template>
      <template #priority="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="priority"
        />
      </template>
      <template #polling_interval="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="polling_interval"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      ref="ospfArea"
      type="ospf_area"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/area/config' }]"
      data-key="area"
      :title="$t('OSPF area')"
      :table-actions="['column-list', 'search']"
      :columns="ospfArea"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #area="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="area"
          :rules="[v => areaValidation(v, s)]"
          placeholder="32156"
          required
        />
      </template>
      <template #stub="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="stub"
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
          :label="$t('Name')"
          prop="id"
          maxlength="32"
          rules="uciname"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      type="ospf_network"
      :title="$t('OSPF networks')"
      :table-actions="['column-list', 'search']"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/network/config' }]"
      data-key="network"
      :columns="ospfNetwork"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #net="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="net"
          placeholder="0.0.0.0/24"
          rules="subnet4"
        />
      </template>
      <template #area="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="area"
          :options="area"
          force-write
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
          :label="$t('Name')"
          prop="id"
          maxlength="32"
          rules="uciname"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import protoOspfInterfaceEdit from './ProtoOspfInterfaceEdit'
import protoOspfNeighborsEdit from './ProtoOspfNeighbors'

export default {
  data() {
    return {
      formData: {
        area: [],
        interface: [],
        neighbor: [],
        network: [],
        ospf: []
      },
      protoOspfInterfaceEdit: markRaw(protoOspfInterfaceEdit),
      ospfNeighborsEdit: markRaw(protoOspfNeighborsEdit),
      ospfInterface: [
        {
          name: 'ifname',
          label: this.$t('Interface'),
          help: this.$t('Indicates whether a configuration is active or not.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ospfArea: [
        { name: 'id', label: this.$t('Name') },
        { name: 'area', label: this.$t('Area'), help: this.$t('Area code. IPv4 address or 32bit integer.') },
        { name: 'stub', label: this.$t('Stub'), help: this.$t('Toggle area to be stub.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ospfNetwork: [
        { name: 'id', label: this.$t('Name') },
        { name: 'net', label: this.$t('Network'), help: this.$t('Network address and netmask.') },
        { name: 'area', label: this.$t('Area'), help: this.$t('Selection from created areas.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ospfNeighbors: [
        { name: 'neighbor', label: this.$t('Neighbor') },
        { name: 'priority', label: this.$t('Neighbor priority') },
        { name: 'polling_interval', label: this.$t('Polling interval') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      redistributeOptions: [
        ['connected', this.$t('Connected')],
        ['kernel', this.$t('Kernel')],
        ['nhrp', 'NHRP'],
        ['bgp', 'BGP'],
        ['rip', 'RIP'],
        ['eigrp', 'EIGRP'],
        ['static', this.$t('Static')]
      ],
      /** @type {import('@/types/networkTypes').InterfaceStatus[]} */
      ifaces: [],
      originate: [
        ['off', this.$t('Off')],
        ['default', this.$t('Default')],
        ['always', this.$t('Always')]
      ]
    }
  },
  computed: {
    area() {
      return this.formData.area.map(el => [el.id, el.id])
    }
  },
  methods: {
    afterLoad(data) {
      this.loadNeighborsInfo(data)
      return this.$axios
        .get('/api/ospf/interface/options')
        .then(({ data }) => {
          this.ifaces = data.available_interfaces
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    loadNeighborsInfo(data) {
      if (data.interface.some(iface => ['point-to-multipoint', 'non-broadcast'].includes(iface.typ))) return
      this.$notification.info(this.$t("OSPF neighbors works only when an interface with type 'Non-Broadcast' or 'Point-to-Multipoint' is configured"))
    },
    areaValidation(val, s) {
      this.$VuciValidator.value = val
      const ip4addrRes = this.$VuciValidator.ip4addr()
      if ((val >= 0 && val <= 4294967295) || ip4addrRes.isValid) return { isValid: true }
      const isAreaUnique = !this.formData.area.some(ospfArea => ospfArea.id !== s.id && ospfArea.area === val)
      if (!isAreaUnique) return { isValid: false, message: this.$t('Area value must be unique') }
      return { isValid: false, message: this.$t('Area must have value of IPv4 address or number from 0 to 4294967295') }
    }
  }
}
</script>
