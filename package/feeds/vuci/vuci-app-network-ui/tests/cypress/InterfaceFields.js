export const fields = {
  // Interfaces General section inputs,
  mwan3: {
    on: { type: 'switch', inputName: 'testIface', value: 'true' },
    off: { type: 'switch', inputName: 'testIface', value: 'false' }
  },
  enabled: {
    on: { type: 'switch', inputName: 'enabled', value: 'true' },
    off: { type: 'switch', inputName: 'enabled', value: 'false' }
  },
  proto: {
    none: { type: 'select', inputName: 'proto', options: 'none', value: 'None' },
    static: { type: 'select', inputName: 'proto', options: 'static', value: 'Static' },
    dhcp: { type: 'select', inputName: 'proto', options: 'dhcp', value: 'DHCP' },
    dhcpv6: { type: 'select', inputName: 'proto', options: 'dhcpv6', value: 'DHCPv6' },
    pppoe: { type: 'select', inputName: 'proto', options: 'pppoe', value: 'PPPoE' }
  },
  ipaddr: { type: 'input', inputName: 'ipaddr', value: '1.1.1.1' },
  netmask: { type: 'select', inputName: 'netmask', options: '255.255.0.0', value: '255.255.0.0' },
  gateway: { type: 'input', inputName: 'gateway', value: '1.1.1.0' },
  broadcast: { type: 'input', inputName: 'broadcast', value: '1.1.1.255' },
  username: { type: 'input', inputName: 'username', value: 'test20' },
  password: { type: 'input', inputName: 'password', value: 'testpsswd' },
  ac: { type: 'input', inputName: 'ac', value: 'auto' },
  service: { type: 'input', inputName: 'service', value: 'auto' },
  reqaddress: { type: 'select', inputName: 'reqaddress', options: 'none', value: 'Disabled' },
  reqprefix: { type: 'select', inputName: 'reqprefix', options: 'no', value: 'Disabled' },
  hostname: { type: 'input', inputName: 'hostname', value: 'testHostname' },
  method: { type: 'select', inputName: 'method' }, // [['nat', this.$t('NAT')],['bridge', this.$t('Bridge')],['passthrough', this.$t('Passthrough')]],
  p2p: { type: 'select', inputName: 'p2p', options: '1', value: 'P2P' }, // [['0', 'Auto'],['1', 'P2P']],
  pdptype: { type: 'select', inputName: 'pdptype', options: 'ipv6', value: 'IPv6' }, // [['ip', 'IPv4'],['ipv6', 'IPv6'],['ipv4v6', 'IPv4/IPv6']],
  mac: { type: 'input', inputName: 'mac', value: '00:11:22:33:44:55' },
  dns: { type: 'list', inputName: 'dns', value: ['6.6.6.6', '9.9.9.9'] },

  // Interfaces Advanced section inputs,
  delegate: { type: 'switch', inputName: 'delegate', value: 'true' },
  force_link: { type: 'switch', inputName: 'force_link', value: 'true' },
  broadcast_dhcp: { type: 'switch', inputName: 'broadcast_dhcp', value: 'true' },
  ipv6: { type: 'select', inputName: 'ipv6', options: '0', value: 'Disabled' }, // [['auto', this.$t('Automatic')],['0', this.$t('Disabled')],['1', this.$t('Manual')]],,
  defaultroute: { type: 'switch', inputName: 'defaultroute', value: 'true' },
  metric: { type: 'input', inputName: 'metric', value: '10' },
  ip6prefix: { type: 'input', inputName: 'ip6prefix', value: '2001:db8::/32' },
  clientid: { type: 'input', inputName: 'clientid', value: '25' },
  vendorid: { type: 'input', inputName: 'vendorid', value: '25' },
  tag: { type: 'input', inputName: 'tag', value: '200' },
  priority: { type: 'input', inputName: 'priority', value: '5' },
  keepalive_failure: { type: 'input', inputName: 'keepalive_failure', value: '0' },
  keepalive_interval: { type: 'input', inputName: 'keepalive_interval', value: '5' },
  host_uniq: { type: 'input', inputName: 'host_uniq', value: '100' },
  demand: { type: 'input', inputName: 'demand', value: '0' },
  macaddr: { type: 'input', inputName: 'macaddr', value: '00:11:22:33:44:55' },
  mtu: { type: 'input', inputName: 'mtu', value: '1000' },
  ip4table: { type: 'input', inputName: 'ip4table', value: '300' },
  ip6table: { type: 'input', inputName: 'ip6table', value: '300' },
  ip6assign: { type: 'select', inputName: 'ip6assign', options: '', value: 'Disabled' }, // [['', this.$t('Disabled')],'64'],
  ip6assign64: { type: 'select', inputName: 'ip6assign', options: '64', value: '64' }, // [['', this.$t('Disabled')],'64'],
  ip6hint: { type: 'input', inputName: 'ip6hint', value: '20' },
  ip6addr: { type: 'input', inputName: 'ip6addr', value: '0000:0000:0000:0000:0000:0000:0000:0000' },
  ip6gw: { type: 'input', inputName: 'ip6gw', value: '0000:0000:0000:0000:0000:0000:0000:0000' },
  ip6ifaceid: { type: 'input', inputName: 'ip6ifaceid', value: '::1' },

  // Interfaces Physical section inputs,
  bridge: { type: 'switch', inputName: 'bridge', value: 'false' },
  igmp_snooping: { type: 'switch', inputName: 'igmp_snooping', value: 'false' },
  lanIfname: { type: 'select', inputName: 'ifname', options: 'br-lan', value: 'br-lan' },
  noIfname: { type: 'select', inputName: 'ifname', options: '', value: '-- No interface --' },
  fiber_priority: { type: 'select', inputName: 'fiber_priority', options: '0', value: 'Ethernet' }, // [['1', this.$t('SFP')],['0', this.$t('Ethernet')]]

  // Interfaces Firewall section inputs
  unspecifiedFwZone: { type: 'zoneSelect', inputName: 'fwzone', options: '', value: 'Unspecified' },
  lanFwZone: { type: 'zoneSelect', inputName: 'fwzone', options: 'lan', value: 'lan' },
  wanFwZone: { type: 'zoneSelect', inputName: 'fwzone', options: 'wan', value: 'wan' },

  // DHCP General setup section inputs
  ignore: { type: 'select', inputName: 'ignore', options: 'enable', value: 'Enable' },
  ignoreDisable: { type: 'select', inputName: 'ignore', options: 'disable', value: 'Disable' },
  ignoreRelay: { type: 'select', inputName: 'ignore', options: 'relay', value: 'Relay' },
  server_relay: { type: 'input', inputName: 'server_relay', value: '5.5.5.5' },
  start_ip: { type: 'input', inputName: 'start_ip', value: '1.1.1.150' },
  end_ip: { type: 'input', inputName: 'end_ip', value: '1.1.1.200' },
  leaseUnit: { type: 'select', inputName: 'leaseUnit', options: 'm', value: 'Minutes' },
  leaseTime: { type: 'input', inputName: 'leaseTime', value: '800' },

  // DHCP Advanced settings section inputs
  dynamicdhcp: { type: 'switch', inputName: 'dynamicdhcp', value: 'true' },
  force: { type: 'switch', inputName: 'force', value: 'true' },
  dhcpNetmask: { type: 'input', inputName: 'netmask', value: '255.255.255.0' },
  dhcpOptions: {
    key: {
      dns: { type: 'select', inputName: 'key', options: '6' }
    },
    value: { type: 'input', inputName: 'value' }
  },
  force_options: { type: 'switch', inputName: 'force_options', value: 'true' },

  // DHCP IPv6 settings section inputs
  ra: { type: 'select', inputName: 'ra' },
  dhcpv6: { type: 'select', inputName: 'dhcpv6' },
  ndp: { type: 'select', inputName: 'ndp' },
  ra_default: { type: 'switch', inputName: 'ra_default', value: 'true' },
  ra_management: { type: 'select', inputName: 'ra_management' },
  dhcpDns: { type: 'list', inputName: 'dns', value: ['6.6.6.6', '9.9.9.9'] },
  domain: { type: 'list', inputName: 'domain', value: ['6.6.6.6', '9.9.9.9'] }
}
