<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadInterfaceData"
    config="rip;network"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'rip/global' }]"
      data-key="rip"
      name="rip"
      :title="$t('RIP - global settings')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/Disable RIP protocol.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="debug"
        :label="$t('Enable logging')"
        :help="$t('Enable logging of RIP.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled_vty"
        :label="$t('Enable vty')"
        :help="$t('Enable/Disable vty access from LAN.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="ripd_custom_conf"
        :label="$t('Import config')"
        :help="$t('Use imported RIP configuration.')"
        endpoint="/api/rip/global"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="version"
        :label="$t('Version')"
        :help="$t('Specify the version of RIP.')"
        :options="versions"
        initial="2"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="neighbors"
        :label="$t('Neighbor')"
        :help="$t('Specify RIP neighbor.')"
        :placeholder="$t('any')"
        rules="ipmask4"
      />
    </vuci-named-section>
    <vuci-typed-section
      type="rip_interface"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'rip/interface/config' }]"
      data-key="interface"
      :table-actions="['column-list', 'search']"
      :title="$t('RIP interfaces')"
      :help="$t('List of created interfaces.')"
      :columns="interfaces"
      :after-delete="deleteFiltersWithSameId"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #ifname="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="ifname"
          :options="$network.dynamicRoutesInterfaces(ifaces)"
        />
      </template>
      <template #passive_interface="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="passive_interface"
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
          rules="uciname"
          maxlength="32"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      ref="accessList"
      type="rip_access_list"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'rip/access/config' }]"
      data-key="access"
      :title="$t('Access list filters')"
      :table-actions="['column-list', 'search']"
      :help="$t('List of created filter rules.')"
      :columns="accessList"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #target="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="target"
          :options="target"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="action"
          :options="action"
        />
      </template>
      <template #net="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="net"
          :options="[['any', $t('Any')]]"
          :rules="validateSubnet"
          initial="any"
          allow-create
        />
      </template>
      <template #direction="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="direction"
          :options="direction"
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
          rules="uciname"
          maxlength="32"
          required
        />
        <tlt-form-item-select
          v-model="addModel.target"
          :label="$t('RIP interface')"
          prop="target"
          :options="target"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        interface: []
      },
      versions: [
        ['1', '1'],
        ['2', '2']
      ],
      interfaces: [
        { name: 'id', label: this.$t('Name'), help: this.$t('List of created interfaces.') },
        { name: 'ifname', label: this.$t('Interface'), help: this.$t('Interface name.') },
        {
          name: 'passive_interface',
          label: this.$t('Passive interface'),
          help: this.$t('Specify interface to passive mode.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      accessList: [
        { name: 'id', label: this.$t('Name'), help: this.$t('List.') },
        {
          name: 'target',
          label: this.$t('RIP interface'),
          help: this.$t('Applies the rule for the specified interface.')
        },
        { name: 'action', label: this.$t('Action'), help: this.$t('Denies or permits matched entry.') },
        { name: 'net', label: this.$t('Network'), help: this.$t('Filter network.') },
        {
          name: 'direction',
          label: this.$t('Direction'),
          help: this.$t('If direction is Inbound, the access list is applied to input routes. If direction is Outbound the access list is applied to advertised routes.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ifaces: [],
      action: [
        ['permit', this.$t('Permit')],
        ['deny', this.$t('Deny')]
      ],
      direction: [
        ['in', this.$t('Inbound')],
        ['out', this.$t('Outbound')]
      ]
    }
  },
  computed: {
    target() {
      return this.formData?.interface.map(iface => [iface.id, iface.id])
    }
  },
  methods: {
    deleteFiltersWithSameId(section, uciData) {
      uciData.access = uciData.access.filter(x => x.target !== section.id)
    },
    loadInterfaceData() {
      return this.$axios
        .get('/api/rip/interface/options')
        .then(({ data }) => {
          this.ifaces = data.available_interfaces
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    validateSubnet(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.subnet()
      if (res.isValid || val === 'any') {
        return { isValid: true }
      }
      return { isValid: false, message: this.$t("Network must be 'Any' or IP address with subnet mask") }
    }
  }
}
</script>
