<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="vuciForm"
    v-model="formData"
    config="network"
    :extra-load="extraLoad"
    :after-load="afterLoad"
    async-load
  >
    <vuci-typed-section
      ref="typedSection"
      :title="$t('Device configuration')"
      :add-title="$t('Add new device')"
      :uci-data="uciData"
      :endpoints="[{ endpoint }]"
      :columns="deviceColumns"
      :form-methods="['get', 'create', 'delete']"
      :add="beforeAdd"
      data-key="devices"
      type="device"
      :edit-form="DevicesEdit"
      :edit-form-props="{ groupData }"
      :after-delete="afterDelete"
      rows-initial-expanded
      :row-actions="getRowActions"
      @edit-modal-closed="
        () => {
          $timer.restart('loadStatus')
          groupData()
        }
      "
    >
      <template #name="{ s }">
        <span>{{ $networkDevices.parseDeviceName(s, status) }}</span>
      </template>
      <template #type="{ s }">
        <span>{{ $networkDevices.getDeviceTypes()[s.type] || s.type }}</span>
      </template>
      <template #type-help>
        <hint-helper :hints="typeHint" />
      </template>
      <template #status="{ s }">
        <span :class="getStatus(s).style">{{ getStatus(s).text }}</span>
      </template>
      <template #mtu="{ s }">
        <div class="flex justify-start items-center gap-1">
          <span>{{ getMtu(s) }}</span>
          <tlt-hint
            v-if="getMtuWarning(s).length > 0"
            :hints="getMtuWarning(s)"
          >
            <tlt-icon
              icon="error"
              class="text-theme-text-danger size-5"
            />
          </tlt-hint>
        </div>
      </template>
      <template #macaddr="{ s }">
        <span>{{ getMacaddr(s) }}</span>
      </template>
      <template #refresh>
        <tlt-button
          button-id="refresh-devices"
          :disabled="false"
          color="tertiary"
          icon-left="refresh"
          class="px-3! max-lg:hidden"
          @click="refresh"
        >
          <span>{{ $t('Refresh') }}</span>
        </tlt-button>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.type"
          :label="$t('Type')"
          prop="type"
          :options="$networkDevices.getDeviceTypeOptions()"
          @change="v => (selectedType = v)"
        >
          <template #help><hint-helper :hints="typeHint" /></template>
        </tlt-form-item-select>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import DevicesEdit from './DevicesEdit.vue'
import { markRaw } from 'vue'
import { formBus } from '@ui-core/vuci-form'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import HintHelper from '@/components/shared/HintHelper.vue'
/** @typedef {import('@/types/networkTypes').Interface} Interface */
/** @typedef {import('@/types/networkTypes').DeviceStatus} DeviceStatus */
/** @typedef {import('@/types/networkTypes').DeviceConfig} DeviceConfig */
export default {
  components: { HintHelper },
  provide() {
    return {
      interfaces: () => this.interfaces,
      devices: () => this.status,
      dot1xConfig: () => this.dot1xConfig
    }
  },
  data() {
    return {
      DevicesEdit: markRaw(DevicesEdit),
      /** @type {DeviceStatus[]} */
      status: [],
      /** @type {Interface[]} */
      interfaces: [],
      portStatus: [],
      dot1xConfig: [],
      deviceColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('Name of the device.') },
        { name: 'type', label: this.$t('Type') },
        {
          name: 'mtu',
          label: this.$t('MTU'),
          help: this.$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')
        },
        { name: 'macaddr', label: this.$t('MAC address'), help: this.$t('Override MAC address of the bridge.') },
        { name: 'status', label: this.$t('Status'), help: this.$t('Indicates whether the current device is available.') }
      ],
      formData: {},
      selectedType: '',
      queuedDevices: []
    }
  },
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board.hwinfo.dsa,
      portLink: state => state.board.hwinfo.port_link
    }),
    endpoint() {
      if (!this.dsa && this.$store.hasPackages('vuci-app-vxlan-ui.control')) return 'network/devices/vxlan/config'
      return this.selectedType ? `network/devices/${this.selectedType}/config` : 'network/devices/config'
    },
    typeHint() {
      return [
        { hint: this.$t('Physical or virtual network interface that provides connectivity to an Ethernet network.'), option: this.$t('Ethernet') },
        { hint: this.$t('Allows to connect multiple network interfaces together into a single bridged network segment.'), option: this.$t('Bridge') },
        ...(this.$store.hasPackages('vuci-app-vxlan-ui.control')
          ? [
              {
                hint: this.$t("Virtual Extensible LAN. It's a network virtualization technology used to create virtualized Layer 2 networks over Layer 3 networks."),
                option: 'VXLAN'
              }
            ]
          : [])
      ]
    }
  },
  methods: {
    groupData(formData = this.formData) {
      if (!formData?.devices) return formData
      const defaultDevices = this.$networkDevices.getDeviceNames()
      const bridges = formData.devices.filter(dev => dev.type === 'bridge')
      const bridgesChildren = bridges.flatMap(br => br?._children ?? []).filter(s => s && !s._fake)
      bridgesChildren.forEach(child => {
        const qDevIdx = this.queuedDevices.findIndex(dev => dev.id === child.id)
        if (qDevIdx === -1) return
        this.queuedDevices[qDevIdx] = child
      })
      let restDevices = formData.devices.filter(dev => dev.type !== 'bridge')
      restDevices = [...restDevices, ...this.queuedDevices.filter(dev => !restDevices.some(e => e.id === dev.id))]
      const usedDevices = new Set([])
      bridges.forEach(br => (br._children = []))
      bridges.forEach(br => {
        const members = this.$networkDevices.getBridgeMembers(br, this.status)
        members.forEach(port => {
          const devStatus = this.status.find(e => e.id === port)
          const device = restDevices.find(dev => {
            const portName = this.$networkDevices.getPortName(dev)
            const defaultName = portName ?? defaultDevices[portName]
            return defaultName === port
          }) ?? { _fake: true, name: port, id: port, type: devStatus?.type || 'ethernet' } // imitates physical section's existence for non-configurable device
          usedDevices.add(device.id)
          br._children.push(device)
        })
      })
      this.queuedDevices = restDevices.filter(dev => usedDevices.has(dev.id))
      const unusedDevices = restDevices.filter(dev => !usedDevices.has(dev.id))
      formData.devices = [...bridges, ...unusedDevices]
      this.$refs.vuciForm.initialForm.devices = formData.devices
      return formData
    },
    loadStatus(group = true) {
      return this.$axios
        .get('/api/basic/network/devices/status')
        .then(({ data }) => {
          this.status = data
          if (group) this.groupData()
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get device status'))
        })
    },
    async extraLoad(form) {
      this.groupData(form)
      await this.loadStatus(false)
      return this.$axios
        .bulkGet([
          { endpoint: '/interfaces/config', condition: !!this.dsa },
          { endpoint: '/network/devices/bridge/config', condition: !!this.dsa },
          { endpoint: '/network/devices/vxlan/config', condition: 'vuci-app-vxlan-ui.control' }
        ])
        .then(([ifaceConfig, bridgeConfig, vxlanConfig]) => {
          if (ifaceConfig.success) this.interfaces = ifaceConfig.data
          else this.$message.error(this.$t('Failed to load interfaces data'))
          form.devices.forEach((device, idx) => {
            const bridge = bridgeConfig.data.find(dev => dev.id === device.id)
            if (bridge) form.devices[idx] = bridge
            const vxlan = vxlanConfig.data.find(dev => dev.id === device.id)
            if (vxlan) form.devices[idx] = vxlan
          })
          this.groupData(form)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => this.$timer.start({ method: this.loadStatus, time: 5000, autostart: true, immediate: false }))
    },
    afterLoad() {
      return this.$axios
        .bulkGet([
          {
            endpoint: '/api/devices/port_based_vlan/config',
            condition: !!this.dsa && this.$store.board.model.platform !== 'X86_64'
          },
          {
            endpoint: '/api/ports_settings/status',
            condition: !!this.portLink
          },
          {
            endpoint: '/api/dot1x/ports/config',
            condition: 'dot1x-server.control'
          }
        ])
        .then(([vlanConfig, portsStatus, dot1xConfig]) => {
          if (portsStatus.success) this.portStatus = portsStatus.data
          else this.$message.error(this.$t('Failed to load port status data'))
          if (dot1xConfig.success) this.dot1xConfig = dot1xConfig.data
          else this.$message.error(this.$t('Failed to load VLAN data'))
          if (!vlanConfig.success) this.$message.error(this.$t('Failed to load port based vlan data'))
          return { switch_vlan: vlanConfig.data ?? [] }
        })
    },
    handleEthernetDelete(s) {
      const bridgeConfig = this.formData.devices.find(dev => dev.type === 'bridge' && dev._children.some(child => child.id === s.id))
      if (!bridgeConfig) return Promise.resolve()
      this.$spin(true)
      return this.$axios
        .put(`/api/network/devices/bridge/config/${bridgeConfig.id}`, {
          data: {
            ports: bridgeConfig.ports.filter(port => port !== s.id)
          }
        })
        .then(({ data }) => {
          bridgeConfig.ports = data.ports
          bridgeConfig._children = bridgeConfig._children.filter(child => child.id !== s.id)
          const bridgeStatus = this.status.find(dev => dev.id === bridgeConfig.id)
          if (bridgeStatus) bridgeStatus['bridge-members'] = bridgeStatus['bridge-members'].filter(member => member !== s.id)
          this.$message.success(this.$t('Configuration has been removed'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to remove configuration'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    /**
     * @param {DeviceConfig} section
     */
    getEditHints(section) {
      if (section._fake) return [{ info: this.$t('Device cannot be edited') }]
      if (this.dsa || section.type === 'vxlan') return []
      const deviceNames = this.$networkDevices.getDeviceNames()
      const portName = this.$networkDevices.getPortName(section)
      const devName = deviceNames[portName] ?? portName
      const found =
        this.status.some(dev => dev.id !== section.id && dev.type === 'bridge' && dev['bridge-members']?.includes(devName)) ||
        this.formData.devices.some(dev => dev.id !== section.id && dev.type === 'bridge' && dev.ports?.includes(devName))
      return found ? [{ info: this.$t('This device belongs to bridge. Please remove the device from bridge configuration to be able to edit it.') }] : []
    },
    /**
     * @param {DeviceConfig} section
     */
    getDeleteHints(section) {
      if (section.type === 'wifi') return [{ info: this.$t('Wi-Fi device cannot be deleted') }]
      if (section.type === 'ethernet' && this.$networkDevices.getPhysicalPorts().includes(this.$networkDevices.getPortName(section)))
        return [{ info: this.$t('Default ethernet devices cannot be deleted') }]
      const iface = this.interfaces.find(
        iface => section.type === 'bridge' && (iface.device === section.id || this.formData.switch_vlan?.some(vlan => vlan.device_name === section.id && `${vlan.device}.${vlan.vid}` === iface.device))
      )
      if (iface) return [{ info: this.$t('This bridge is assigned to a "%s" interface. The device can only be deleted when the interface is removed').format(this.$network.getName(iface)) }]
      return []
    },
    getMtuWarning(section) {
      if (section.type !== 'bridge' || !section.mtu) return []
      const isValid = section._children?.every(dev => !dev.mtu || parseInt(section.mtu) <= parseInt(dev.mtu))
      return isValid ? [] : [{ info: this.$t("Bridge device's MTU must be less than or equal to the MTU of the assigned device's lowest value.") }]
    },
    beforeAdd(device) {
      this.selectedType = this.selectedType || this.$networkDevices.getDeviceTypeOptions()[0][0]
      if (this.selectedType === 'vxlan') {
        device.vni = '1'
        device.port = '4789'
      }
      delete device.type
    },
    afterDelete(data) {
      if (data.type === 'vxlan' || (!data._fake && data.type === 'ethernet')) {
        this.formData.devices.forEach(dev => {
          if (dev.type !== 'bridge') return
          dev._children = dev._children?.filter(child => child.id !== data.id) ?? []
          const bridgeStatus = this.status.find(devSt => devSt.id === dev.id)
          if (bridgeStatus) bridgeStatus['bridge-members'] = bridgeStatus['bridge-members'].filter(member => member !== data.id)
          const bridgeConfig = this.formData.devices.find(devConf => devConf.id === dev.id)
          if (bridgeConfig?.ports) bridgeConfig.ports = bridgeConfig.ports.filter(port => port !== data.id)
        })
        return
      }
      if (data.type !== 'bridge') return
      this.formData.devices = [...this.formData.devices, ...(data._children ?? [])]
      this.formData.switch_vlan = this.formData.switch_vlan.filter(vlan => vlan.device_name !== data.id)
    },
    deleteSection(s) {
      if (s._fake) {
        this.$prompt.show({
          title: this.$t('Delete this configuration?'),
          content: this.$t('This process cannot be undone.'),
          okText: this.$t('Delete'),
          cancelText: this.$t('Cancel'),
          onOk: () => this.handleEthernetDelete(s)
        })
        return
      }
      const previousType = this.selectedType
      this.selectedType = s.type
      this.$refs.typedSection.delSection(s.id)
      formBus.once('delete-section', () => {
        this.$timer.restart('loadStatus')
        this.selectedType = previousType
        this.queuedDevices = this.queuedDevices.filter(dev => dev.id !== s.id)
        this.groupData()
      })
    },
    /**
     * @param {DeviceConfig} section
     * @returns {{style: string, text: string}}
     */
    getStatus(section) {
      const statuses = {
        up: {
          text: this.$t('Up'),
          style: 'success'
        },
        down: {
          text: this.$t('Down'),
          style: 'error'
        },
        default: {
          text: '-',
          style: ''
        }
      }
      const portName = this.$networkDevices.getPortName(section)
      const status = this.status.find(e => [e.id, e.name].includes(section.id)) ?? this.portStatus.find(p => `${p.name.toLowerCase()}${p.name === 'LAN' ? (p.position ?? '') : ''}` === portName)
      if (!status) return statuses.default
      if (status.state === 'up' || status.carrier) return statuses.up
      if (status.state === 'down') return statuses.down
      return statuses.down
    },
    getMtu(section) {
      return this.status.find(e => e.id === section.id)?.mtu || section.mtu || '1500'
    },
    getMacaddr(section) {
      return this.status.find(e => e.id === section.id)?.macaddr?.toUpperCase() || section.macaddr || '-'
    },
    refresh() {
      const previousType = this.selectedType
      this.selectedType = ''
      this.$nextTick(async () => {
        await this.$refs.vuciForm.loadData(true)
        this.selectedType = previousType
      })
    },
    getRowActions(s) {
      const editHints = this.getEditHints(s)
      const deleteHints = this.getDeleteHints(s)
      return [
        { id: 'edit', buttonProps: { disabled: editHints.length > 0 }, hints: editHints },
        { id: 'delete', buttonProps: { disabled: deleteHints.length > 0 }, hints: deleteHints, callback: this.deleteSection }
      ]
    }
  }
}
</script>
