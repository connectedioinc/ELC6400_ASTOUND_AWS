<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="vrrpd"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      data-key="vrrp"
      :endpoints="[{ endpoint: 'vrrp/config' }]"
    >
      <tlt-card
        :title="$t('&quot;%s&quot; VRRP configuration settings').format(section.id)"
        :help="$t('Settings for the current VRRP configuration.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          :help="$t('Enable VRRP (Virtual Router Redundancy Protocol) for interface.')"
          @change="changePingEnabled(s)"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="virtual_mac"
          :label="$t('Virtualize MAC')"
          :help="$t('Allow VRRP to use virtualized MAC for interface.')"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="virtual_id"
          :label="$t('Virtual ID')"
          :help="$t('Routers with same IDs will be grouped in the same VRRP (Virtual Router Redundancy Protocol) cluster, range [1 - 255].')"
          :rules="['irange(1, 255)', isVirtualIdUsed]"
          initial="1"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          name="priority"
          :label="$t('Priority')"
          :help="$t('Router with highest priority value on the same VRRP (Virtual Router Redundancy Protocol) cluster will act as a main one, range [1 - 255].')"
          rules="irange(1,255)"
          initial="100"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          name="delay"
          :label="$t('Advertisement interval')"
          :help="$t('Time interval in seconds between advertisements, range [1 - 255].')"
          rules="irange(1,255)"
          initial="1"
        />
        <vuci-form-item-select
          :depend="interfaceList().length > 0"
          :uci-section="s"
          name="interface"
          :rules="isInterfaceUsed"
          :label="$t('Interface')"
          :help="$t('Select which interface VRRP will operate on.')"
          :options="interfaceList()"
        />
        <vuci-form-item-list
          :uci-section="s"
          name="virtual_ip"
          :label="$t('IP address')"
          :help="$t('Virtual IP address(es) for interface\'s VRRP (Virtual Router Redundancy Protocol) cluster.')"
          placeholder="0.0.0.0"
          rules="ip4addr"
        />
      </tlt-card>
      <tlt-card
        v-show="serviceStatus"
        class="max-md:border-none max-md:px-0!"
        :title="$t('Check connection')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="ping_enabled"
          :label="$t('Enable')"
          :help="$t('Enable connection checking.')"
          initial="0"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="host"
          :label="$t('IP address or hostname')"
          :help="$t('IP address or hostname to ping (e.g., 192.168.1.1 or www.host.com).')"
          placeholder="0.0.0.0"
          rules="host"
          :no-write="s.enabled === '0'"
          :required="s.ping_enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="interval"
          :label="$t('Ping interval')"
          :help="$t('Time interval between two pings (seconds).')"
          rules="irange(0, 99999)"
          initial="10"
          :no-write="s.enabled === '0'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="time_out"
          :label="$t('Ping timeout')"
          :help="$t('Time to receive ping response (seconds).')"
          rules="irange(0, 99999)"
          initial="1"
          :no-write="s.enabled === '0'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="packet_size"
          :label="$t('Ping packet size')"
          :help="$t('Ping packet size (bytes).')"
          rules="irange(0, 65535)"
          initial="56"
          :no-write="s.enabled === '0'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="ping_attempts"
          :label="$t('Ping attempts')"
          :help="$t('Number of ping packets to send.')"
          rules="irange(0, 99999)"
          initial="4"
          :no-write="s.enabled === '0'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="retry"
          :label="$t('Ping retry count')"
          :help="$t('Number of pings to retry, before switching to backup router mode.')"
          rules="irange(0, 99999)"
          initial="5"
          :no-write="s.enabled === '0'"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['interfaces'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {}
    }
  },
  computed: {
    serviceStatus() {
      return this.section?.enabled === '1'
    }
  },
  methods: {
    changePingEnabled(s) {
      s.ping_enabled = s.enabled
    },
    interfaceList() {
      const protocols = ['pppoe', 'static', 'dhcp']
      const lanIfName = this.$store.board.network.lan.device
      const wanIfName = this.$store.board.network.wan?.device
      const filteredIfaces = this.interfaces().filter(iface => {
        if (iface.id === 'loopback') return false
        if (protocols.includes(iface.proto)) {
          return iface.ifname?.some(ifname => ifname.match(/eth0\./) || ifname.match(lanIfName) || ifname.match(wanIfName))
        }
        return false
      })
      return filteredIfaces.map(this.$network.getName)
    },
    isInterfaceUsed() {
      const interfaceUsed = this.formData.vrrp.some(vrrp => vrrp.interface === this.section.interface && vrrp.id !== this.section.id)
      if (interfaceUsed) {
        return { isValid: false, message: this.$t('Instance with the same operating interface already exists') }
      }
      return { isValid: true }
    },
    isVirtualIdUsed() {
      const virtualIdUsed = this.formData.vrrp.some(vrrp => vrrp.virtual_id === this.section.virtual_id && vrrp.id !== this.section.id)
      if (virtualIdUsed) {
        return { isValid: false, message: this.$t('Instance with the same operating virtual ID already exists') }
      }
      return { isValid: true }
    }
  }
}
</script>
