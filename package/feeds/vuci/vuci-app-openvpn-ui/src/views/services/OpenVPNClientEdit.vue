<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="vpnData"
    config="openvpn"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('TLS client'), section.name)"
      :endpoints="[{ endpoint: `openvpn/${section.id}/clients/config` }]"
      data-key="tlsClients"
      :uci-data="uciData"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="common_name"
        :label="$t('Common name (CN)')"
        rules="nospace"
        :help="$t('Client certificate CN field (e.g.,s name.surname@domain.com).')"
        placeholder="name.surname@domain.com"
        maxlength="64"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="local_ip"
        :label="$t('Virtual local endpoint')"
        rules="ip4addr"
        placeholder="172.16.1.6"
        :required="s.remote_ip !== ''"
        :depend="parent?.topology === 'p2p' || parent?.topology === 'net30'"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="remote_ip"
        :label="remoteIpLabel"
        rules="ip4addr"
        :placeholder="remoteIpPlaceholder"
        :required="s.local_ip !== ''"
        :depend="parent?.topology !== 'subnet'"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="local_net"
        :label="$t('Virtual local subnet')"
        :help="$t('IP address and subnet mask for the client\'s virtual local interface.')"
        rules="ipmask4"
        placeholder="172.16.1.6/24"
        :depend="parent?.topology === 'subnet'"
        required
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="local_ipv6"
        :label="$t('Local tunnel endpoint IPv6')"
        rules="ipmask6"
        placeholder="0000:0000:0000:0000:0000:0000:0000:0000/0"
        :help="$t('IPv6 address of virtual local network interface.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="private_network_ipv6"
        :label="$t('Private network IPv6')"
        :rules="['ipmask6', checkIPv6Range]"
        placeholder="0000:0000:0000:0000:0000:0000:0000:0000/0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="private_network"
        :label="$t('Private network')"
        :rules="['subnet4', validateNetworkRange]"
        placeholder="192.168.1.0/24"
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="covered_network"
        :label="$t('Covered network')"
        :options="interfaceList"
        multiple
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { ipv4Utils, ipv6Utils } from '@/utils/ipUtils'
import { parseIPv6 } from '@/validation-rules'

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
      vpnData: {},
      ifaces: []
    }
  },
  computed: {
    parent() {
      return this.vpnData.openVpn.find(x => x.type === 'server')
    },
    remoteIpLabel() {
      return this.parent.topology === 'p2p' ? this.$t("Server's tunnel IP address") : this.$t('Virtual remote endpoint')
    },
    remoteIpPlaceholder() {
      return this.parent.topology === 'p2p' ? '172.16.1.1' : '172.16.1.5'
    }
  },
  methods: {
    updateValidations(self) {
      self.vuciSection.validate()
    },
    isOneOf(value, allowedValues) {
      return allowedValues.includes(value)
    },
    interfaceList() {
      const isAccessPoint = this.$store.isAccessPoint
      this.ifaces = this.formOptions().interfaces.filter(iface => (isAccessPoint ? iface.id === 'lan' : iface.area_type === 'lan'))
      return this.ifaces.map(this.$network.getName)
    },
    checkIPv6Range(ip) {
      this.$VuciValidator.value = ip
      const expandedIp = ipv6Utils.expandIpv6(ip)
      const ipParsed = parseIPv6(expandedIp)
      const rangeArray = this.formOptions().ip6addresses.map(range => ipv6Utils.cidrToRange(range).map(parseIPv6))
      const res = rangeArray.some(
        ([rangeStart, rangeEnd]) => !rangeStart.some((segment, i) => i !== 7 && segment !== ipParsed[i] && rangeEnd[i] !== ipParsed[i] && (segment > ipParsed[i] || rangeEnd[i] < ipParsed[i]))
      )
      return res ? { isValid: false, message: this.$t('Provided IP cannot be in LAN network range') } : { isValid: true }
    },
    validateNetworkRange(v) {
      const validator = { isValid: true }
      const lanInfoArray = Object.entries(this.ifaces).map(([ip]) => ({ ip: this.ifaces[ip].ipaddr, net: this.ifaces[ip].netmask }))
      lanInfoArray.forEach(item => {
        const ipVal = v.split('/')[0]
        const [lanStart, lanEnd] = ipv4Utils.getIPRange(item.ip, item.net)
        if (ipv4Utils.checkIfInRange(ipVal, lanStart, lanEnd, true)) {
          validator.isValid = false
          validator.message = this.$t('Provided network cannot be in LAN network range.')
        }
      })
      return validator
    }
  }
}
</script>
