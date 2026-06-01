<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    editing
    bulk-request
  >
    <tlt-card :title="$utils.getModalTitle($networkDevices.getDeviceTypes()[section.type], section.name)">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :endpoints="[{ endpoint: `network/devices/${section.type}/config`, awaitNetwork }]"
        data-key="devices"
        :name="section.id"
        :after-save="afterSave"
      >
        <tlt-tabs :tabs="tabs">
          <template #general>
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Name')"
              :help="$t('Name of the device.')"
              name="name"
              :rules="['defaulttype', v => $utils.validateNoDuplicates(uciData.devices, 'name', v, $t('name'))]"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('MAC address')"
              :help="$t('Override MAC address of the device. If not set, the device\'s MAC address will be used.')"
              name="macaddr"
              placeholder="00:11:22:33:44:55"
              rules="macaddr"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('MTU')"
              :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
              name="mtu"
              placeholder="1500"
              :rules="`irange(68,${section.type === 'bridge' ? '65535' : maxMtu})`"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="ports"
              :label="$t('Ports')"
              :help="$t('Specifies the wired ports to attach to this bridge.')"
              :placeholder="$t('-- Please select --')"
              :rules="['fieldvalidation(\'^[A-Za-z0-9._@-]*$\')', validatePorts]"
              maxlength="15"
              allow-create
              multiple
              :options="bridgeOptions"
              :depend="s.type === 'bridge'"
              @change="onPortsChange"
            />
            <tlt-inline-message
              v-if="s.type === 'bridge' && portsWarning"
              id="ports-used-message"
              type="warning"
            >
              {{ portsWarning }}
            </tlt-inline-message>
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable IGMP')"
              name="igmp_snooping"
              :help="$t('Enables IGMP snooping on this bridge.')"
              :depend="s.type === 'bridge'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable STP')"
              name="stp"
              :help="$t('Enables the Spanning Tree Protocol on this bridge.')"
              :depend="s.type === 'bridge'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Priority')"
              :help="$t('Bridge Priority. Lowest priority bridge becomes the Root of the Spanning Tree; most switches default to 32768.')"
              name="priority"
              placeholder="32768"
              rules="irange(0,65535)"
              :depend="s.type === 'bridge' && s.stp === '1'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Ageing time')"
              :help="$t('Timeout in seconds for learned MAC addresses in the forwarding database.')"
              name="ageing_time"
              placeholder="300"
              rules="irange(10,1000000)"
              :depend="s.type === 'bridge' && s.stp === '1'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Hello time')"
              :help="$t('Number of seconds between transmissions of configuration BPDUs.')"
              name="hello_time"
              placeholder="1"
              rules="irange(1,10)"
              :depend="s.type === 'bridge' && s.stp === '1'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Forward delay')"
              :help="$t('How long an STP bridge port remains in the listening and learning states before transitioning to the forwarding state.')"
              name="forward_delay"
              placeholder="8"
              rules="irange(2,30)"
              :depend="s.type === 'bridge' && s.stp === '1'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Max age')"
              :help="$t('Maximum expected arrival time of hello bridge protocol data units (BPDUs).')"
              name="max_age"
              placeholder="10"
              rules="irange(6, 40)"
              :depend="s.type === 'bridge' && s.stp === '1'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('VNI')"
              :help="$t('VXLAN network identifier.')"
              name="vni"
              rules="irange(1,16777215)"
              :depend="s.type === 'vxlan'"
              required
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Port')"
              :help="$t('Specifies the UDP destination port to communicate to the remote VXLAN tunnel endpoint.')"
              name="port"
              placeholder="4789"
              rules="irange(1,65535)"
              :depend="s.type === 'vxlan'"
              required
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Local address')"
              :help="$t('Sets the local source IP address for VXLAN tunneling.')"
              name="local"
              rules="ipaddr"
              :depend="s.type === 'vxlan'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Remote address')"
              :help="$t('Specifies the multicast group or remote IP address used for VXLAN tunneling.')"
              name="remote"
              rules="ipaddr"
              :depend="s.type === 'vxlan'"
              required
            />
          </template>
          <template
            v-if="section.type === 'vxlan'"
            #vxlan-advanced
          >
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Ageing')"
              :help="$t('Specifies the lifetime in seconds of FDB entries learnt by the kernel.')"
              name="ageing"
              rules="irange(1,4294967295)"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Max FDB entries')"
              :help="$t('Specifies the maximum number of FDB entries.')"
              name="maxaddress"
              rules="irange(1,4294967295)"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('IPv4 checksum')"
              :help="$t('Specifies if UDP checksum is calculated for transmitted packets over IPv4.')"
              name="udpcsum"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Learning')"
              :help="$t('Enables or disables MAC learning for VXLAN.')"
              name="learning"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Proxy')"
              :help="$t('Enables or disables ARP proxy for VXLAN.')"
              name="proxy"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('RSC')"
              :help="$t('Specifies if route short circuit is turned on.')"
              name="rsc"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('L2miss')"
              :help="$t('Specifies if netlink LLADDR miss notifications are generated.')"
              name="l2miss"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('L3miss')"
              :help="$t('Specifies if netlink IP ADDR miss notifications are generated.')"
              name="l3miss"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('IPv6 TX checksum')"
              :help="$t('Enables or disables UDP checksum calculation for transmitted packets over IPv6.')"
              name="udp6zerocsumtx"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('IPv6 RX checksum')"
              :help="$t('Allow incoming UDP packets over IPv6 with zero checksum field.')"
              name="udp6zerocsumrx"
            />
          </template>
          <template #vlan>
            <port-based-vlan
              v-if="vlanConfigAvailable"
              :uci-data="uciData"
              :device="section"
              :ifaces="ifaces"
              :dot1x-config="dot1xConfig()"
              :initial-ports="initialSection.ports"
              :vuci-form="$refs?.vuciForm ?? {}"
              :form-data="formData"
              :form-methods="['get', 'edit', ...(dsa ? ['create', 'delete'] : [])]"
              :before-save="beforeVlanSave"
              :visible="vlanConfigAvailable"
            />
          </template>
        </tlt-tabs>
      </vuci-named-section>
    </tlt-card>
  </vuci-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import PortBasedVlan from '@/components/network/PortBasedVlan.vue'

export default {
  components: { PortBasedVlan },
  inject: ['interfaces', 'devices', 'dot1xConfig'],
  props: {
    section: {
      type: Object,
      default: () => ({})
    },
    groupData: {
      type: Function,
      default: () => {}
    }
  },
  data() {
    return {
      formData: {},
      initialSection: JSON.parse(JSON.stringify(this.section))
    }
  },
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board?.hwinfo?.dsa,
      maxMtu: state => state.board?.network_options?.max_mtu ?? '1500',
      lanPorts: state => state.board.network?.lan?.ports ?? [],
      multiTag: state => state.board.hwinfo.multi_tag
    }),
    awaitNetwork() {
      const reloadParams = ['igmp_snooping', 'stp', 'priority', 'ageing_time', 'hello_time', 'forward_delay', 'max_age']
      return this.dsa && this.section.type === 'bridge' && reloadParams.some(param => (this.initialSection[param] || this.section[param]) && this.initialSection[param] !== this.section[param])
    },
    allDevices() {
      return this.formData.devices?.reduce((acc, dev) => (dev?._children ? [...acc, dev, ...dev._children] : [...acc, dev]), []) ?? []
    },
    portsWarning() {
      return [
        this.$networkDevices.getIfaceBridgeWarning(this.ifaces, this.section),
        this.$networkDevices.getBridgePortsWarning(this.devs, this.section, this.formData.switch_vlan, this.formData.devices)
      ]
        .filter(s => s)
        .join(' ')
    },
    physicalPorts() {
      return this.$networkDevices.getPhysicalPorts()
    },
    switchVlanPorts() {
      return this.dsa ? this.$store.allPortDevices : this.physicalPorts
    },
    vlanDevices() {
      return this.allDevices.filter(dev => ['8021q', '8021ad'].includes(dev.type)).map(dev => [dev.id, this.$networkDevices.parseDeviceName(dev, this.devs)])
    },
    vxlanDevices() {
      return this.allDevices.filter(dev => dev.type === 'vxlan').map(dev => [dev.id, dev.name])
    },
    bridgeOptions() {
      return [...this.physicalPorts, ...this.vlanDevices.filter(([, value]) => !this.physicalPorts.includes(value)), ...this.vxlanDevices]
    },
    ifaces() {
      return this.interfaces()
    },
    devs() {
      return this.devices()
    },
    vlanConfigAvailable() {
      return this.section.type === 'bridge' && this.dsa && this.$store.board.model.platform !== 'X86_64'
    },
    tabs() {
      return [
        { name: 'general', title: this.$t('General') },
        { name: 'vlan', title: this.$t('Bridge VLAN'), show: this.vlanConfigAvailable && this.section.ports?.some(port => this.switchVlanPorts.includes(port)) },
        { name: 'vxlan-advanced', title: this.$t('Advanced'), show: this.section.type === 'vxlan' }
      ]
    }
  },
  methods: {
    beforeVlanSave(requests) {
      requests?.[0]?.data?.forEach(d => {
        const usedPorts = Object.entries(d)
          .filter(([, value]) => (this.multiTag ? value === 'u' : ['u', 't'].includes(value)))
          .map(([port]) => port)
        this.switchVlanPorts.forEach(port => {
          if (!this.section.ports.includes(port)) delete d?.[port]
        })
        this.formData.switch_vlan.forEach(v => {
          if (v.vid === d.vid) {
            this.switchVlanPorts.forEach(port => {
              if (!this.section.ports.includes(port) && v[port]) v[port] = ''
            })
            return
          }
          usedPorts.forEach(port => {
            if (this.multiTag ? v[port] === 'u' : ['u', 't'].includes(v[port])) v[port] = ''
          })
        })
      })
      requests[0].data = this.dsa ? this.formData.switch_vlan.filter(vlan => vlan.device_name === this.section.id) : this.formData.switch_vlan
      return Promise.resolve()
    },
    async afterSave(_, { data }) {
      if (this.section.type !== 'bridge') return
      // Additional port logic handling on after save to avoid requesting API for data
      this.ifaces.forEach(iface => {
        if (data.ports?.includes(this.$networkDevices.getPortName({ id: iface.device }))) delete iface.device
      })
      // Filters ports from bridge devices if they are used in the updated one
      const availableOpts = this.bridgeOptions.map(opt => (Array.isArray(opt) ? opt[0] : opt))
      this.devs
        .filter(dev => dev.type === 'bridge')
        .forEach(dev => {
          if (dev.id !== this.section.id && dev['bridge-members']) dev['bridge-members'] = dev['bridge-members'].filter(port => (availableOpts.includes(port) ? !data.ports?.includes(port) : true))
          if (dev.id === this.section.id && dev['bridge-members'])
            dev['bridge-members'] = [...new Set([...dev['bridge-members'].filter(port => !availableOpts.includes(port)), ...(data?.ports ?? [])])]
        })
      this.formData.devices.forEach(dev => {
        if (dev.id === this.section.id || dev.type !== 'bridge' || !dev.ports) return
        dev.ports = dev.ports.filter(port => !data.ports?.includes(port))
      })
      // Workaround: not sure how else this should be handled. Data isn't grouped immediately after saving
      // if used without the timeout function. Also tried manipulating with the modalData (uciData and initialForm) with no luck.
      setTimeout(this.groupData, 0)
    },
    onPortsChange(_, value = []) {
      if (!this.dsa) return
      const vlan = this.formData.switch_vlan?.find(vlan => vlan.device_name === this.section.id && vlan.vid === '1')
      if (!vlan) return
      value
        .filter(v => this.switchVlanPorts.includes(v) && !this.formData.switch_vlan.some(vlan => vlan.device_name === this.section.id && vlan.vid !== '1' && vlan[v] === 'u'))
        .forEach(v => {
          if (!vlan[v]) vlan[v] = 'u'
        })
    },
    validatePorts(value) {
      if (this.devs.some(dev => dev.type === 'wifi' && value?.includes(dev.name))) {
        return {
          isValid: false,
          message: this.$t('Wireless devices cannot be used in bridge ports configuration')
        }
      }
      return {
        isValid: !this.formData.devices.some(dev => dev.type === 'bridge' && value?.includes(dev.name)),
        message: this.$t('Bridge in bridge configuration is not possible')
      }
    }
  }
}
</script>
