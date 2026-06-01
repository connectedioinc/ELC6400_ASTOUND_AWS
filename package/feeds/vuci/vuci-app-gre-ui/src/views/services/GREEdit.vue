<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="gre"
      :endpoints="[{ endpoint: 'gre/config' }]"
      :name="section.id"
    >
      <tlt-card :title="$t('&quot;%s&quot; main settings').format(section.id)">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enabled')"
          :help="$t('Turns the GRE Tunnel instance on or off.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="proto"
          :label="$t('IPv6')"
          :help="$t('Use IPv4 or IPv6 for the GRE tunnel.')"
          false-value="gre"
          true-value="grev6"
          @change="updateTunnelSource"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="ipaddr_tunlink"
          :label="$t('Tunnel source')"
          :help="$t('Network interface used to establish the GRE Tunnel.')"
          :options="tunnelOptions"
          :placeholder="$t('-- Please choose --')"
          :rules="tunnelValidation"
          allow-create
        />
        <vuci-form-item-input
          :uci-section="s"
          name="peeraddr"
          :label="$t('Remote endpoint IP address')"
          :help="$t('IP address or hostname of the remote GRE Tunnel device.')"
          :placeholder="s.proto === 'gre' ? '0.0.0.0' : 'fd10::1/64'"
          :rules="s.proto === 'gre' ? 'ipv4host' : 'ipv6host'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="mtu"
          :label="$t('MTU')"
          :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
          placeholder="1476"
          rules="irange(68,9200)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="okey"
          :label="$t('Outbound key')"
          :help="
            $t(`Key for outgoing packets.
                                This value should match the 'Inbound key' value set on the opposite GRE instance or both key values should be omitted on both sides.
                                Allowed range [0-4294967295]`)
          "
          placeholder="2000000000"
          rules="irange(0, 4294967295)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="ikey"
          :label="$t('Inbound key')"
          :help="
            $t(`Key for incoming packets.
                                This value should match the 'Outbound key' value set on the opposite GRE instance or both key values should be omitted on both sides.
                                Allowed range [0-4294967295]`)
          "
          placeholder="2000000000"
          rules="irange(0, 4294967295)"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="df"
          :label="$t('Path MTU Discovery')"
          :help="$t('When unchecked, sets the nopmtudisc option for tunnel. Can not be used together with the TTL option.')"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="ttl"
          :label="$t('TTL')"
          :help="
            $t(`Sets a custom TTL (Time to Live) value for encapsulated packets.
                                TTL is a field in the IP packet header which is initially set by the sender and decreased by 1 on each hop.
                                When it reaches 0 it is dropped and the last host to receive the packet sends an ICMP 'Time Exceeded' message back to the source.`)
          "
          placeholder="255"
          rules="range(0, 255)"
          :depend="s.df === '0'"
          initial="255"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="keep_alive"
          :label="$t('Keep alive')"
          :help="
            $t(`The 'keep alive' feature sends packets to the remote instance in order to determine the health of the connection.
                                If no response is received for [Keep alive retries] times, the device will mark the tunnel as DOWN.`)
          "
        />
        <vuci-form-item-input
          :uci-section="s"
          name="keep_alive_interval"
          :label="$t('Keep alive interval')"
          :help="$t('Frequency (in seconds) at which \'keep alive\' packets are sent to the remote instance. Range [1-255].')"
          placeholder="200"
          rules="irange(1,255)"
          :depend="s.keep_alive === '1'"
          initial="20"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="keep_alive_retries"
          :label="$t('Keep alive retries')"
          :help="$t('Amount of keep alive packets to lose before marking tunnel as DOWN. Range [1-255].')"
          placeholder="200"
          rules="irange(1,255)"
          :depend="s.keep_alive === '1'"
          initial="3"
        />
      </tlt-card>
      <tlt-card :title="$t('Tunnel settings')">
        <vuci-form-item-input
          :uci-section="s"
          name="tun_ipaddr"
          :label="$t('Local GRE interface IPv4 address')"
          :help="$t('IPv4 address of the local GRE Tunnel instance.')"
          placeholder="172.16.0.1"
          rules="ip4addr"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="tun_netmask"
          :label="$t('Local GRE IPv4 interface netmask')"
          :help="$t('Subnet mask of the local GRE Tunnel instance.')"
          placeholder="255.255.255.0"
          rules="netmask"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="tun_ip6addr"
          :label="$t('Local GRE interface IPv6 address')"
          :help="$t('IPv6 address of the local GRE Tunnel instance.')"
          placeholder="fd01::1/0"
          rules="subnet6"
        />
      </tlt-card>
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :data-key="`${section.id}routes4`"
      :endpoints="[{ endpoint: `gre/${section.id}/routes/config` }]"
      :title="$t('IPv4 Routing settings')"
      :table-actions="['search', 'column-list']"
      :columns="ipv4routeColumns"
      :initial-active="false"
      type="route"
    >
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          placeholder="0.0.0.0"
          :rules="netmaskValidation"
          :required="s.netmask !== ''"
          @change="updateValidations"
        />
      </template>
      <template #netmask="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="netmask"
          placeholder="255.255.255.0"
          :rules="netmaskValidation"
          @change="updateValidations"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :uci-data="uciData"
      :data-key="`${section.id}routes6`"
      :endpoints="[{ endpoint: `gre/${section.id}/routes6/config` }]"
      :title="$t('IPv6 Routing settings')"
      :table-actions="['search', 'column-list']"
      :columns="ipv6routeColumns"
      :initial-active="false"
      type="route6"
    >
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          placeholder="::/0"
          rules="subnet6"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { ipv4Utils } from '@/utils/ipUtils'
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
      formData: {},
      ipv4routeColumns: [
        {
          name: 'target',
          label: this.$t('Remote subnet IPv4 address'),
          help: this.$t('LAN IPv4 address of the device that hosts the remote GRE Tunnel instance.')
        },
        {
          name: 'netmask',
          label: this.$t('Remote subnet netmask'),
          help: this.$t('LAN subnet mask of the device that hosts the remote GRE Tunnel instance.')
        }
      ],
      ipv6routeColumns: [
        {
          name: 'target',
          label: this.$t('Remote subnet IPv6 address'),
          help: this.$t('LAN IPv6 address of the device that hosts the remote GRE Tunnel instance.')
        }
      ]
    }
  },
  computed: {
    interfaceData() {
      return this.formOptions().interfaceData
    },
    tunnelOptions() {
      return this.section.proto === 'grev6'
        ? this.$network.createTunnelOptions(this.interfaceData, { addSuffix: 'ipv6' }).concat([['none', this.$t('None')]])
        : this.$network.createTunnelOptions(this.interfaceData, { addSuffix: 'ipv4' })
    }
  },
  methods: {
    updateTunnelSource(self) {
      const sectionIndex = this.formData.gre.findIndex(x => x.id === this.section.id)
      const ipaddr_tunlink = this.formData.gre[sectionIndex].ipaddr_tunlink
      if (self.model === 'gre' && ipaddr_tunlink === 'none') this.formData.gre[sectionIndex].ipaddr_tunlink = this.tunnelOptions[0][0]
      if (ipaddr_tunlink.endsWith('_4') || ipaddr_tunlink.endsWith('_6')) {
        this.formData.gre[sectionIndex].ipaddr_tunlink = this.formData.gre[sectionIndex].ipaddr_tunlink.replace(/_(4|6)$/, (_, g) => (g === '4' ? '_6' : '_4'))
      }
    },
    tunnelValidation(value) {
      this.$VuciValidator.value = value
      const resIp4addr = this.$VuciValidator.ip4addr()
      const resIp6addr = this.$VuciValidator.ip6addr()
      const resUciname = this.$VuciValidator.uciname()
      if (resIp4addr.isValid || resIp6addr.isValid || (resUciname.isValid && value.length <= 16)) return { isValid: true }
      return {
        isValid: false,
        message: this.$t('A string of a-Z, 0-9 and _ characters (maximum length of 16), IPv4 or IPv6 addresses are accepted (e.g., 192.168.1.1, ::0000:8a2e:0370:7334).')
      }
    },
    updateValidations(self) {
      self.vuciSection.validate()
    },
    netmaskValidation(value, self) {
      const lanData = this.interfaceData.find(iface => iface.id === 'lan').ipaddr
      this.$VuciValidator.value = value
      if (self.name === 'target') {
        const resTarget = this.$VuciValidator.ip4addr()
        if (!resTarget.isValid) return resTarget
      } else {
        const resNetmask = this.$VuciValidator.netmask()
        if (!resNetmask.isValid) return resNetmask
      }
      const target = self.uciSection.target
      const splitedTarget = target.split('.')
      const netmask = self.uciSection.netmask
      const splitedNetmask = netmask.split('.')
      if (splitedTarget.length !== 4 || splitedNetmask.length !== 4) {
        return { isValid: true }
      }
      const [min, max] = ipv4Utils.getIPRange(target, netmask)
      const lanMatch = ipv4Utils.checkIfInRange(lanData, min, max)
      if (target !== min) {
        return {
          isValid: false,
          message: this.$t('To match specified netmask, "Remote subnet IP address" should be %s').format(min)
        }
      } else if (lanMatch) {
        return {
          isValid: false,
          message: this.$t('Remote subnet IP address includes router LAN.')
        }
      }
      return { isValid: true }
    }
  }
}
</script>
