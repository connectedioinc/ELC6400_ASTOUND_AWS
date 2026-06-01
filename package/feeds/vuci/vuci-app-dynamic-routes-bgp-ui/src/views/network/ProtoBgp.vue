<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="bgp"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'bgp/global' }]"
      data-key="bgp"
      name="bgp"
      :title="$t('BGP - global settings')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/Disable BGP protocol.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="debug"
        :label="$t('Enable logging')"
        :help="$t('Enable logging of BGP.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled_vty"
        :label="$t('Enable vty')"
        :help="$t('Enable/Disable vty access from LAN.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="bgpd_custom_conf"
        :label="$t('Import config')"
        :help="$t('Use imported BGP configuration.')"
        endpoint="/api/bgp/global"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="bgp_instance"
      :form-methods="!hasVrf ? ['get', 'edit'] : undefined"
      :endpoints="[{ endpoint: 'bgp/instance/config' }]"
      data-key="bgp_instances"
      :title="!hasVrf ? $t('BGP instance') : $t('BGP instances')"
      :table-actions="['column-list', 'search']"
      :help="$t('List of created BGP instances.')"
      :after-delete="deleteChildInstances"
      :columns="bgpInstances"
      :edit-form="ProtoBgpEdit"
      :add-validate="(_, sections) => addValidateInstance(sections, $t('BGP'))"
      :error-handlers="{
        create: handleErrors(createErrors)
      }"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #as="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="as"
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
      type="bgp_access_list"
      :title="$t('Access list filters')"
      :columns="accessList"
      data-key="access"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'bgp/access/config' }]"
      :table-actions="['column-list', 'search']"
      :add-validate="(_, sections) => addValidateInstance(sections, $t('Access list filters'))"
    >
      <template #target="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="target"
          :options="target"
          required
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
    </vuci-typed-section>
    <vuci-typed-section
      type="bgp_route_maps"
      :title="$t('Route maps')"
      :columns="routeMaps"
      data-key="route_maps"
      :uci-data="uciData"
      sortable
      sort-by="sequence"
      :exception-options="['sequence']"
      :endpoints="[{ endpoint: 'bgp/maps/config' }]"
      :add-validate="(_, sections) => addValidateInstance(sections, $t('Route maps'))"
      :edit-form="ProtoBgpRouteMapsEdit"
      :error-handlers="{ delete: handleErrors(deleteErrors) }"
      :table-actions="['column-list', 'search']"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: !!deleteHints(s.id) }, hints: deleteHints(s.id) }]"
      @drag-change="onDragChange"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="action"
          :options="action"
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
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import ProtoBgpRouteMapsEdit from './ProtoBgpRouteMapsEdit'
import ProtoBgpEdit from './ProtoBgpEdit'

export default {
  provide() {
    return {
      formOptions: () => this.formOptions
    }
  },
  data() {
    return {
      ProtoBgpRouteMapsEdit: markRaw(ProtoBgpRouteMapsEdit),
      ProtoBgpEdit: markRaw(ProtoBgpEdit),
      formData: {},
      formOptions: {
        gre: []
      },
      bgpInstances: [
        { name: 'id', label: this.$t('Name'), help: this.$t('List of created interfaces.') },
        { name: 'as', label: this.$t('Autonomous system') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      accessList: [
        { name: 'target', label: this.$t('Peer'), help: this.$t('Applies the rule for the specified peer.') },
        { name: 'action', label: this.$t('Action'), help: this.$t('Denies or permits matched entry.') },
        {
          name: 'net',
          label: this.$t('Filter network'),
          help: this.$t('Applies filter rule for this source network.')
        },
        {
          name: 'direction',
          label: this.$t('Direction'),
          help: this.$t('If direction is Inbound, the access list is applied to input routes. If direction is Outbound the access list is applied to advertised routes.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      direction: [
        ['in', this.$t('Inbound')],
        ['out', this.$t('Outbound')]
      ],
      routeMaps: [
        { name: 'id', label: this.$t('Name'), help: this.$t('Applies the rule for the specified peer.') },
        { name: 'action', label: this.$t('Action'), help: this.$t('Denies or permits matched entry.') },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Enable/Disable BGP route map.') }
      ],
      action: [
        ['permit', this.$t('Permit')],
        ['deny', this.$t('Deny')]
      ],
      deleteErrors: {
        103: this.$t('This instance is used by a route map filter'),
        default: this.$t('Failed to delete configuration')
      },
      createErrors: {
        103: this.$t('To create a new BGP instance, make sure you have at least one unused VRF instance available.'),
        default: this.$t('Failed to create configuration')
      }
    }
  },
  computed: {
    hasVrf() {
      return this.$store.hasPackages('vuci-app-vrf-api.control')
    },
    target() {
      const items = Object.values(this.formData).flat()
      return items.filter(item => item['.type'] === 'bgp_peer' || item['.type'] === 'bgp_peer_group').map(x => x.id)
    }
  },
  mounted() {
    return this.showVrfHint()
  },
  methods: {
    showVrfHint() {
      if (!this.hasVrf) {
        return this.$notification.info({
          id: 'install_vrf',
          title: this.$t('Multiple BGP instances'),
          text: this.$t('For multiple BGP instances VRF package must be installed, you can do this using Package Manager.'),
          action: {
            text: this.$t('Install package'),
            to: '/system/package_manager?search=VRF'
          }
        })
      }
    },
    afterLoad(form) {
      const bgpPeersRequests = form.bgp_instances.map(instance => `/api/bgp/instance/${instance.id}/peer/config`)
      const bgpPeerGroups = form.bgp_instances.map(instance => `/api/bgp/instance/${instance.id}/peer_group/config`)
      const bgpMapFilters = form.bgp_instances.map(instance => `/api/bgp/instance/${instance.id}/map_filters/config`)
      const requests = [{ endpoint: '/vrf/config', condition: this.hasVrf }, ...bgpPeersRequests, ...bgpPeerGroups, ...bgpMapFilters]
      return this.$axios
        .bulkGet(requests)
        .then(responses => {
          const uciData = {}
          const vrf = responses.shift()
          if (!vrf.success) this.$message.error(this.$t('Failed to load VRF interfaces data'))
          else this.formOptions.vrfInterfaces = vrf.data
          for (const response of responses) {
            for (const instanceData of response.data) {
              const dataKey = `${instanceData.instance}_${instanceData['.type']}`
              if (!uciData[dataKey]) uciData[dataKey] = []
              uciData[dataKey].push(instanceData)
            }
          }

          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    addValidateInstance(sections, name) {
      const numberOfInstances = sections.length
      return { valid: numberOfInstances < 30, message: this.$t("Maximum number (30) of '%s' instances has been reached").format(name) }
    },
    deleteChildInstances(deletedSection, uciData) {
      delete uciData[`${deletedSection.id}_bgp_peer`]
      delete uciData[`${deletedSection.id}_bgp_peer_group`]
      delete uciData[`${deletedSection.id}_bgp_route_map_filters`]
    },
    validateSubnet(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.subnet()
      if (res.isValid || val === 'any') {
        return { isValid: true }
      }
      return { isValid: false, message: this.$t("Network must be 'Any' or IP address with subnet mask") }
    },
    deleteHints(s) {
      const routeMapFilterKeys = Object.keys(this.formData).filter(i => i.endsWith('_bgp_route_map_filters'))
      const instancesWithRouteMaps = routeMapFilterKeys.reduce((instances, key) => {
        const filteredInstances = this.formData[key].filter(item => item.route_map === s).map(item => item.instance)
        return instances.concat(filteredInstances)
      }, [])
      if (instancesWithRouteMaps.length !== 0)
        return [{ info: this.$t("Can't delete due to existing Route Map Filters using this Route Map in instance:%s.").format(instancesWithRouteMaps.map(i => ` ${i}`)) }]
    },
    handleErrors(errors) {
      return res => {
        const errorCode = res.data.errors[0].code
        return errors[errorCode] || errors.default
      }
    },
    onDragChange(data) {
      data.forEach(item => (item.sequence = (item.sequence * 10).toString()))
    }
  }
}
</script>
