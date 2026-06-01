<template>
  <div>
    <tlt-alert
      v-if="displayAlert"
      id="vlan-warning"
      type="warning"
      :text="$t('Please save the general section before configuring VLANs.')"
    />
    <div v-show="!displayAlert">
      <vuci-typed-section
        :title="device ? '' : $t('Port based VLAN')"
        :columns="deviceColumns"
        :type="dsa ? 'bridge-vlan' : 'switch_vlan'"
        :form-methods="formMethods"
        :uci-data="uciData"
        :endpoints="[{ endpoint, sectionFilter }]"
        data-key="switch_vlan"
        :add-validate="onAdd"
        :add="beforeAdd"
        :after-add="afterAdd"
        :after-delete="afterDelete"
        :before-save="beforeSave"
        :error-handlers="{ create: handleCreateErrors }"
        :visible="visible"
        pagination
        :table-actions="['column-list', 'search']"
      >
        <template #vid="{ s }">
          <vuci-form-item-input
            :readonly="checkReadonly(s) || disableSection(s)"
            :uci-section="s"
            name="vid"
            :rules="v => [v.irange.bind(v, vlan0 ? 0 : 1, 4094), validateVID]"
            required
            @change="$utils.validate"
          />
        </template>
        <template
          v-for="port in mainPorts"
          :key="port"
          #[port]="{ s }"
        >
          <vuci-form-item-select
            :uci-section="s"
            :name="port"
            :readonly="usedBy802X(port) || disableSection(s) || isPortDisabled(port)"
            :options="portColumnsUntagged"
            :rules="v => [validatePort, validateUsedLan.bind(v, port)]"
            :warnings="value => getPortWarning(value, port, s)"
            @change="$utils.validate"
          />
        </template>
        <template #delete="{ s, actions }">
          <tlt-hint :hints="usedByDot1xDeleteHint(s)">
            <tlt-button
              button-id="delete"
              :readonly="checkReadonly(s) || vlanUsedByDot1x(s) || disableSection(s)"
              type="text"
              color="error"
              size="md"
              @click="actions.delete(s.id)"
              >{{ $t('Delete') }}
            </tlt-button>
          </tlt-hint>
        </template>
      </vuci-typed-section>
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { makeProps } from '@ui-core/utils/props'
import TltAlert from '@/components/Messenger/TltAlert.vue'

export default {
  components: {
    TltAlert
  },
  inject: {
    modalData: {
      default: () => () => {}
    }
  },
  props: makeProps({
    uciData: [Object, () => []],
    formData: [Object, () => []],
    vuciForm: [Object, null, true],
    device: [Object, null],
    formMethods: [Array, () => ['get', 'edit', 'create', 'delete']],
    ifaces: [Array, () => []],
    dot1xConfig: [Array, () => []],
    portMirroring: [Array, () => []],
    initialPorts: [Array, () => []],
    afterLoad: [Function, () => {}],
    beforeSave: [Function, () => {}],
    visible: [Boolean, true]
  }),
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board.hwinfo.dsa,
      readOnly: state => state.board.network_options.readonly_vlans,
      maxVlans: state => state.board.network_options.vlans,
      vlan0: state => state.board.network_options.vlan0,
      multiTag: state => state.board.hwinfo.multi_tag
    }),
    endpoint() {
      return this.device ? 'devices/port_based_vlan/config' : 'port_based_vlan/config'
    },
    defaultDevice() {
      if (this.device) return 'br-lan'
      return this.formData.switch_vlan.some(vlan => vlan.device === 'vlan') ? 'vlan' : 'br-lan'
    },
    displayAlert() {
      return this.device && (this.device.ports?.length !== this.initialPorts.length || this.device.ports.some(port => !this.initialPorts.includes(port)))
    },
    configData() {
      return this.dot1xConfig.map(x => ({ ...x, name: this.$ports.getPrettyPortId(x.id, false).toLowerCase() }))
    },
    portColumnsUntagged() {
      return [...(this.device && !this.dsa ? [] : [['', this.$t('Off')]]), ['u', this.$t('Untagged')], ['t', this.$t('Tagged')]]
    },
    selectedPorts() {
      return this.formData.devices?.find(dev => dev.id === (this.device?.id || 'br_lan'))?.ports
    },
    mainPorts() {
      return this.device && this.selectedPorts ? this.ports.filter(port => this.selectedPorts.includes(port)) : this.ports
    },
    ports() {
      const vlans = this.formData.switch_vlan || []
      if (vlans.length < 1) return []
      const keys = Object.keys(vlans[0])
      const keysToFilter = ['vid', 'id', 'device_name', 'device', '.type']
      if (this.dsa && !this.selectedPorts?.includes('wan')) keysToFilter.push('wan')
      return keys.filter(key => !keysToFilter.includes(key) && key !== '_md5').sort()
    },
    deviceColumns() {
      return [
        { name: 'vid', label: 'VLAN ID', help: this.$t('VLAN Identification number.'), width: 'w-20' },
        ...this.mainPorts.map(port => {
          const label = port
            .toUpperCase()
            .match(/.{1,3}/g)
            .join(' ')
          const isInUse = this.isPortDisabled(port)
          return {
            name: port,
            label: isInUse ? `${label} (${this.$t('used by port mirroring')})` : label,
            help: isInUse ? this.$t('%s is disabled and cannot be modified because %s is being utilized in port mirroring.').format(label) : null,
            width: 'xs'
          }
        })
      ]
    },
    usedLansIface() {
      return this.ifaces.map(iface => this.ports.filter(port => this.$networkDevices.getPortName({ id: iface.device }) === port)).flat()
    },
    vlansByDevice() {
      return this.dsa ? (this.formData.switch_vlan?.filter(vlan => (this.device ? vlan.device_name === this.device.id : vlan.device === this.defaultDevice)) ?? []) : (this.formData.switch_vlan ?? [])
    }
  },
  methods: {
    sectionFilter(s) {
      if (this.dsa) return this.device ? this.device.id === s.device_name : s.device === this.defaultDevice
      return this.device ? this.device.id === s.device_name : true
    },
    async beforeAdd(data) {
      if (this.dsa && this.device) data.device = this.device.name
      if (!this.dsa || this.formData.switch_vlan?.filter(vlan => (this.device ? this.device.id === vlan.device_name : vlan.device === this.defaultDevice))?.length !== 0) return Promise.resolve()
      await this.updateDevices(data)
    },
    // Resync vlans as some devices add or remove more then one vlan at the time
    afterAdd(_, data) {
      this.updateOverviewVlans(data.uciData?.switch_vlan)
      const switchVlans = data.uciData.switch_vlan?.filter(vlan => (this.device ? this.device.id === vlan.device_name : vlan.device === this.defaultDevice)) ?? []
      const migratedIfaces = this.ifaces.filter(iface => switchVlans.some(vlan => vlan.device_name === iface.device))
      if (!this.dsa || switchVlans.length !== 1) return Promise.resolve()
      if (migratedIfaces.length) {
        this.$notification.info(
          `${this.$t('Interface(s) %s were auto migrated to %s.1.').format(migratedIfaces.map(this.$network.getName).join(', '), this.device?.name || this.defaultDevice)} ${this.$t('Check your interface configuration if there was no side effects.')}`
        )
        migratedIfaces.forEach(iface => {
          iface.device = `${switchVlans[0].device}.1`
        })
      }
      return Promise.all([this.updateVlans(data.uciData), this.afterLoad()]).then(() => null)
    },
    afterDelete(_, uciData, self) {
      this.$nextTick(() => self.vuciForm.validate())
      const switchVlans = uciData.switch_vlan?.filter(vlan => (this.device ? this.device.id === vlan.device_name : vlan.device === this.defaultDevice)) ?? []
      const migratedIfaces = this.ifaces.filter(iface => switchVlans.some(vlan => vlan.device === iface.device?.match(/^(.+)\.[0-9]+$/)?.[1]))
      if (!this.dsa || switchVlans.length !== 2) return Promise.resolve()
      if (migratedIfaces.length) {
        this.$notification.info(
          `${this.$t('Interface(s) %s were auto migrated from %s.1.').format(migratedIfaces.map(this.$network.getName).join(', '), this.device?.name || this.defaultDevice)} ${this.$t('Check your interface configuration if there was no side effects.')}`
        )
        migratedIfaces.forEach(iface => {
          iface.device = switchVlans[0].device_name
        })
      }
      this.$nextTick(() => this.updateVlans(this.formData))
    },
    updateOverviewVlans(data) {
      if (!this.modalData()) return
      this.modalData().uciData.switch_vlan = data ?? []
      this.modalData().vuciForm.initialForm.switch_vlan = data ?? []
    },
    updateVlans(uciData) {
      this.$spin()
      return this.$axios
        .get(`/api/${this.endpoint}`)
        .then(({ data }) => {
          uciData.switch_vlan = data
          this.updateOverviewVlans(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to update vlan data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    async updateDevices() {
      if (!this.device) return Promise.resolve()
      const updatedData = this.formData.devices.find(dev => dev.id === this.device.id)
      return this.$axios.put(`/api/network/devices/bridge/config/${this.device.id}`, { data: { ports: updatedData.ports } }).then(({ data }) => {
        const devIdx = this.formData.devices.findIndex(dev => dev.id === data.id)
        this.formData.devices[devIdx] = data
      })
    },
    validatePort(val, self) {
      if (this.device && !this.dsa) return { isValid: true }
      const portVlan = self.uciSection.vid
      const otherVlans = this.device
        ? this.vlansByDevice.filter(vlan => vlan.vid !== portVlan)
        : this.dsa
          ? this.formData.switch_vlan.filter(vlan => !(vlan.vid === portVlan && vlan.device === self.uciSection.device))
          : this.formData.switch_vlan.filter(vlan => vlan.vid !== portVlan)
      const hasUntagged = otherVlans.some(vlan => vlan[self.name] === 'u')
      const hasTagged = otherVlans.some(vlan => vlan[self.name] === 't')
      const portUsed = this.formData.devices?.find(dev => dev.id !== self.uciSection.device_name && dev.ports?.includes(self.name))
      if (!this.device && ['u', 't'].includes(val) && portUsed) {
        return {
          isValid: false,
          message: this.$t('Port is already used by the "%s" bridge. Remove the port from the bridge before configuring the VLAN.').format(portUsed.name)
        }
      }
      if (val === 'u' && hasUntagged) {
        return {
          isValid: false,
          message: this.$t('Port is untagged in multiple VLANs.')
        }
      }
      if (!this.multiTag && ((val === 'u' && hasTagged) || (val === 't' && hasUntagged))) {
        return {
          isValid: false,
          message: this.$t('Tagged port can not be used together with untagged')
        }
      }
      if (this.vlan0 && self.uciSection.vid === '0' && val == 't') {
        return {
          isValid: false,
          message: this.$t('VLAN 0 cannot be tagged')
        }
      }
      return {
        isValid: true
      }
    },
    usedBy802X(lanName) {
      const instance = this.configData.find(x => x.name === lanName)
      return instance?.role === 'server' && instance?.enabled === '1' && (!this.dsa || (this.dsa && instance.use_vlans === '1'))
    },
    validateUsedLan(lanName, value) {
      return {
        isValid: !this.dsa || value === '' || !this.usedLansIface.includes(lanName) || !!this.device,
        message: this.$t('Physical interface "%s" is already being used by %s').format(lanName, this.$t('interface'))
      }
    },
    disableSection(section) {
      const portMirroringEnabled = this.portMirroring[0]?.mirror_monitor_port !== 'disabled'
      if (!portMirroringEnabled) return false
      const lanPorts = Object.keys(section).filter(key => key.startsWith('lan'))
      const isPortUsed = lanPorts.some(lanPort => this.isPortDisabled(lanPort) && section[lanPort] !== '')
      return isPortUsed && this.$store.hasPackages('software-port-mirroring.control') && !this.$store.board.hwinfo.dsa
    },
    isPortDisabled(port) {
      const portNumber = port.replace('lan', '')
      return this.portMirroring[0]?.mirror_monitor_port === portNumber || this.portMirroring[0]?.mirror_source_port === portNumber
    },
    checkReadonly(section) {
      return this.vlansByDevice.findIndex(vlan => vlan.id === section.id) < this.readOnly
    },
    vlanUsedByDot1x(section) {
      return !!this.configData.some(x => x.use_vlans === '1' && (x.accept_vlan === section.vid || x.reject_vlan === section.vid))
    },
    usedByDot1xDeleteHint(s) {
      return this.vlanUsedByDot1x(s) ? [{ info: this.$t("This VLAN can't be deleted because it is used by 802.1X port(s)") }] : []
    },
    validateVID(val) {
      const sameVIDCount = this.vlansByDevice.filter(vlan => vlan.vid === val).length
      if (sameVIDCount > 1) {
        return {
          isValid: false,
          message: this.$t('Invalid VLAN ID given! Only unique IDs are allowed')
        }
      }
      return { isValid: true }
    },
    handleCreateErrors(e) {
      const messages = {
        116: this.$t('Maximum amount of configurations reached'),
        default: this.$t('Failed to create new configuration')
      }
      const { code } = e.data?.errors?.[0] || ''
      return messages[code] || messages.default
    },
    onAdd(_, sections) {
      if (this.dsa && !this.device) {
        const physicalPorts = this.$networkDevices.getPhysicalPorts()
        const lanIface = this.ifaces.find(iface => iface.id === 'lan')
        if (lanIface) {
          const otherIfaces = this.ifaces.filter(iface => iface.id !== 'lan')
          const portUsedIface = otherIfaces.find(iface => iface.ifname?.some(port => physicalPorts.includes(port) && lanIface.ifname?.includes(port)))
          if (portUsedIface)
            return {
              valid: false,
              message: this.$t('Port "%s" is used in interface "%s", please remove it from the interface before adding a new VLAN.').format(
                portUsedIface.ifname.join(', '),
                this.$network.getName(portUsedIface)
              )
            }
        }
      }
      if (sections.length < this.maxVlans) return { valid: true }
      return {
        valid: false,
        message: this.$t('Maximum amount of configurations reached.')
      }
    },
    getPortWarning(value, port, s) {
      const iface = this.ifaces.find(iface => iface.device === `${s.device}.${s.vid}`)
      const initialVlan = this.vuciForm.initialForm.switch_vlan.find(vlan => vlan.id === s.id)
      if (value === 'u' || !iface || initialVlan[port] === value) return
      return this.$t('VLAN %s untagged ports are used by "%s" interface and should be modified with care').format(s.vid, this.$network.getName(iface))
    }
  }
}
</script>
