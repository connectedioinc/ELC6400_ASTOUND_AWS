<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="network"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('&quot;%s&quot; device settings').format(section.name)"
      :help="$t('This is the configuration for the Q-in-Q device.')"
      :endpoints="[{ endpoint: 'interface_based_vlan/config' }]"
      :name="section.id"
      :uci-data="uciData"
      data-key="device"
    >
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Tag')"
        :help="$t('802.1 tag.')"
        name="vid"
        required
        placeholder="1"
        rules="irange(1,4094)"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Type')"
        :help="$t('Device type.')"
        :options="typeOptions"
        name="type"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Parent interface')"
        :help="$t('Name of parent/base interface. To assign created instance to the interface, you need to do it manually in interfaces page.')"
        name="ifname"
        :options="physicalInterfaces"
      />
    </vuci-named-section>
    <vuci-typed-section
      :title="$t('Q-in-Q devices')"
      :help="
        $t(
          'Q-in-Q VLAN tunnel enables a possibility to segregate the traffic of different users in their infrastructure, \
                while still giving a full range of VLANs for their internal use by adding a second tag to an already tagged frame.'
        )
      "
      :columns="deviceColumns"
      :uci-data="uciData"
      type="device"
      :endpoints="[{ endpoint: `interface_based_vlan/${section.id}/devices/config` }]"
      :data-key="section.id + '_qDevices'"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #vid="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          required
          name="vid"
          rules="irange(1,4094)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel['name']"
          :label="$t('New Device Name')"
          :help="$t('Name of the new VLAN device.')"
          prop="name"
          required
          maxlength="8"
          :rules="v => ['defaulttype', validateName.bind(v.value)]"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['formOptions', 'validateName'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      blackList: [],
      deviceColumns: [
        { name: 'name', label: this.$t('Device name') },
        { name: 'vid', label: this.$t('802.1q tag') }
      ],
      typeOptions: [
        ['8021ad', '802.1AD'],
        ['8021q', '802.1Q']
      ],
      dsa: this.$store.board?.hwinfo?.dsa
    }
  },
  computed: {
    physicalInterfaces() {
      // Separate filters used for full DSA support devices and not.
      const filteredDevices = this.dsa ? this.filterDsaPhyDevices(this.networkDevices) : this.filterPhyDevices(this.networkDevices)
      const formatedDevices = filteredDevices
        .filter(d => !d.virtual)
        .map(d => d.name)
        .sort()
      const L2tpv3Options = this.L2tpv3Devices.map(iface => ['l2v3-' + iface.id, 'L2TPv3-' + iface.id])
      return formatedDevices.concat(L2tpv3Options)
    },
    /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
    networkDevices() {
      return this.formOptions().networkDevices
    },
    L2tpv3Devices() {
      return this.formOptions().L2tpv3Data
    },
    portBasedVlans() {
      return this.formOptions().portBasedVlans
    }
  },
  methods: {
    /**
     * @param {import('@/types/networkDeviceTypes').DeviceStatus[]} devices
     */
    filterDsaPhyDevices(devices) {
      return devices.filter(d => {
        if (!d.name) return false
        const freeDevice = d.type === 'ethernet' && !this.portBasedVlans?.some(vlan => vlan[d.name] !== '') && d.name !== 'lo'
        return freeDevice
      })
    },
    /**
     * @param {import('@/types/networkDeviceTypes').DeviceStatus[]} devices
     */
    filterPhyDevices(devices) {
      return devices.filter(d => {
        if (!d.name) return false
        const excludedDevices = d.name.startsWith('wwan') || d.name.startsWith('wlan') || d.name === 'lo'
        if (excludedDevices) return false

        return ['VLAN', 'ethernet'].includes(d.type)
      })
    }
  }
}
</script>
