<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="enable_dhcpv4"
    :label="$t('Enable DHCPv4')"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="mode"
    :label="$t('DHCPv4 mode')"
    :options="ignoreOptions"
  >
    <template #help>
      <hint-helper
        :main-hint="$t('Specifies DHCPv4 mode.')"
        :hints="[
          {
            hint: $t('This device will be used to handle IP assigning.'),
            option: $t('Server')
          },
          {
            hint: $t('Specified server will be used to handle IP assigning.'),
            option: $t('Relay')
          }
        ]"
      />
    </template>
  </vuci-form-item-select>
  <vuci-form-item-input
    :uci-section="s"
    name="server_relay"
    :label="$t('DHCP server')"
    :help="$t('Specifies DHCP server\'s IP address, which directs any requests into server.')"
    rules="ip4addr"
    placeholder="0.0.0.0"
    :depend="s.mode === 'relay'"
    required
  />
  <vuci-form-item-input
    :uci-section="s"
    name="start_ip"
    :label="$t('Start IP')"
    :help="$t('Type an IP address to serve as the start of the IP range that DHCP will use to assign IP addresses.')"
    :depend="s.mode === 'server'"
    :rules="['ipaddr', validateStartIP, validateIpAddrDepend]"
    :initial="startIpInitial"
    :no-write="wizard"
    :required="isIpv4AddrAvailable"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="end_ip"
    :label="$t('End IP')"
    :help="$t('Type an IP address to serve as the end of the IP range that DHCP will use to assign IP addresses.')"
    :depend="s.mode === 'server'"
    :rules="['ipaddr', validateEndIP, validateIpAddrDepend]"
    :initial="endIpInitial"
    :no-write="wizard"
    :required="isIpv4AddrAvailable"
  />
  <vuci-form-item-custom
    ref="leasetime"
    :uci-section="s"
    name="leasetime"
    inputs="input,select"
    :label="$t('Lease time')"
    :input-props="[leasetimeInputProps, leaseUnit]"
    :help="leasetimeHint"
    :load-parse="getLeaseTime"
    :write-parse="writeLeaseTime"
    :depend="s.mode === 'server'"
    rawhtml
    @changed-unit="changedUnit"
  />
</template>
<script>
import { ipv4Utils } from '@/utils/ipUtils'
import HintHelper from '../shared/HintHelper.vue'
export default {
  components: { HintHelper },
  props: {
    s: {
      type: Object,
      required: true
    },
    interfaceSection: {
      type: Object,
      required: true
    },
    wizard: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      leaseTimeHint: '',
      leasetimePlaceholder: '12',
      leaseTimeRules: 'irange(1,99999)',
      ignoreOptions: [
        ['server', this.$t('Server')],
        ['relay', this.$t('Relay')]
      ],
      leaseHints: {
        h: this.$t('Expiry time of leased addresses. Minimum value is 1 hour'),
        m: this.$t('Expiry time of leased addresses. Minimum value is 2 minutes'),
        s: this.$t('Expiry time of leased addresses. Minimum value is 120 seconds'),
        infinite: this.$t('Expiry time of leased addresses is infinite')
      },
      leaseProps: {
        h: { placeholder: '12', rules: 'irange(1,999999)' },
        m: { placeholder: '720', rules: 'irange(2,999999)' },
        s: { placeholder: '43200', rules: 'irange(120,999999)' }
      },
      leaseUnit: {
        prop: 'leaseUnit',
        options: [
          ['h', this.$t('Hours')],
          ['m', this.$t('Minutes')],
          ['s', this.$t('Seconds')],
          ['infinite', this.$t('Infinite')]
        ]
      },
      unit: 'h'
    }
  },
  computed: {
    isIpv4AddrAvailable() {
      return !!this.interfaceSection.ipaddr
    },
    leasetimeHint() {
      return this.leaseHints[this.unit] || this.leaseHints.h
    },
    leasetimeInputProps() {
      return {
        prop: 'leaseTime',
        required: this.unit !== 'infinite',
        readonly: this.unit === 'infinite',
        initial: '12',
        ...this.leaseProps[this.unit]
      }
    },
    addrAndMask() {
      return {
        nAddr: this.interfaceSection.ipaddr?.split('.'),
        nMask: this.interfaceSection.netmask?.split('.')
      }
    },
    startIpInitial() {
      return this.setInitialIp('100')
    },
    endIpInitial() {
      return this.setInitialIp('150')
    },
    mutatableSection() {
      return this.s
    }
  },
  created() {
    this.unit = this.getLeaseTime(this.s.leasetime)[1]
    this.$nextTick(() => {
      this.$watch('addrAndMask', this.setStartAndEndIpAddresses)
    })
  },
  methods: {
    changedUnit(newVal) {
      const oldVal = this.unit
      this.unit = newVal
      if ([newVal, oldVal].includes('infinite')) {
        this.$refs.leasetime.modelValues[0][0] = newVal === 'infinite' ? '' : '12'
      }
    },
    setDhcpRange(start, end) {
      this.mutatableSection.start_ip = start.join('.')
      this.mutatableSection.end_ip = end.join('.')
    },
    setStartAndEndIpAddresses(val) {
      if (!this.isIpv4AddrAvailable) return this.setDhcpRange([], [])
      const invalidLength = !(val?.nAddr?.length === 4 && val?.nMask?.length === 4)
      const invalidAddr = val?.nAddr?.some(addr => addr > 255 || val?.nMask?.some(addr => addr > 255))
      if (invalidLength || invalidAddr) return
      const networkStartIP = ipv4Utils.subnetID(val.nAddr, val.nMask)
      const networkEndIP = ipv4Utils.broadcast(networkStartIP, ipv4Utils.wildcardMask(val.nMask))
      const addresses = this.octet2dec(networkEndIP) - this.octet2dec(networkStartIP)
      if (addresses < 2) {
        this.setDhcpRange(networkStartIP, networkEndIP)
        return
      }
      // check if there are more than 254 addresses available for start IP offset
      addresses > 254 ? (networkStartIP[3] += 100) : networkStartIP[3]++
      networkEndIP[3]--
      this.setDhcpRange(networkStartIP, networkEndIP)
    },
    setInitialIp(suffix) {
      const ip = this.interfaceSection.ipaddr
      return ip ? ip.slice(0, ip.lastIndexOf('.')) + '.' + suffix : ''
    },
    getLeaseTime(val) {
      const leasetime = Array.isArray(val) ? val[0] : (val ?? '')
      const [, lease, unit] = leasetime.match(/(\d*)(\D*)/)
      return [lease ?? '12', unit ?? 'h']
    },
    writeLeaseTime(values) {
      return values.join('')
    },
    // Convert our array of 4 ints into a decimal (watch out for 16 bit JS integers here)
    octet2dec(a) {
      // poor mans bit shifting (Int32 issue)
      let d = 0
      d = d + parseInt(a[0]) * 16777216 // Math.pow(2,24);
      d = d + parseInt(a[1]) * 65536 // Math.pow(2,16);
      d = d + parseInt(a[2]) * 256 // Math.pow(2,8);
      d = d + parseInt(a[3])
      return d
    },
    getNetworkIps(ip, nAddr, nMask) {
      const decimalIP = this.octet2dec(ip.split('.'))
      const networkStartIP = ipv4Utils.subnetID(nAddr, nMask)
      const networkEndIP = ipv4Utils.broadcast(networkStartIP, ipv4Utils.wildcardMask(nMask))
      const decimalNetworkEndIP = this.octet2dec(networkEndIP)
      return { decimalIP, networkStartIP, networkEndIP, decimalNetworkEndIP }
    },
    validateIpAddrDepend(ip) {
      return {
        isValid: this.isIpv4AddrAvailable || ip === '',
        message: this.$t('"IPv4 address" is required.')
      }
    },
    validateStartIP(ip) {
      if (!this.interfaceSection.ipaddr || !this.interfaceSection.netmask) return { isValid: true }
      const { nAddr, nMask } = this.addrAndMask
      if (nAddr.length !== 4 || nMask.length !== 4) return { isValid: true }
      if (!ip) return { isValid: true }
      const { decimalIP, networkStartIP, networkEndIP, decimalNetworkEndIP } = this.getNetworkIps(ip, nAddr, nMask)
      const decimalNetworkStartIP = this.octet2dec(networkStartIP)
      if (decimalIP <= decimalNetworkStartIP) {
        return {
          isValid: false,
          message: this.$t("Start IP address must be greater than the network's address (%s).").format(networkStartIP.join('.'))
        }
      }
      if (decimalIP >= decimalNetworkEndIP) {
        return {
          isValid: false,
          message: this.$t("Start IP address must be smaller than the network's last address (%s).").format(networkEndIP.join('.'))
        }
      }
      this.validateEndIP(this.s.end_ip)
      return { isValid: true }
    },
    validateEndIP(ip) {
      if (!this.interfaceSection.ipaddr || !this.interfaceSection.netmask) return { isValid: true }
      const { nAddr, nMask } = this.addrAndMask
      if (nAddr.length !== 4 || nMask.length !== 4) return { isValid: true }
      if (!ip || !this.s.start_ip) return { isValid: true }
      const { decimalIP, networkEndIP, decimalNetworkEndIP } = this.getNetworkIps(ip, nAddr, nMask)
      const decimalStartIP = this.octet2dec(this.s.start_ip.split('.'))
      if (decimalStartIP > decimalIP) {
        return {
          isValid: false,
          message: this.$t('End IP address can not be smaller than the Start IP address.')
        }
      }
      if (decimalIP >= decimalNetworkEndIP) {
        return {
          isValid: false,
          message: this.$t("End IP address must be smaller than the network's last address (%s).").format(networkEndIP.join('.'))
        }
      }
      return { isValid: true }
    }
  }
}
</script>
