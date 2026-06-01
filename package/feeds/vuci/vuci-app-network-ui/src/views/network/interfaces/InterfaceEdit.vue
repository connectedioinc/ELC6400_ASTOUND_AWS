<template>
  <vuci-form
    ref="form"
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    editing
    :before-save="beforeSave"
    :after-load="afterLoad"
    bulk-request
  >
    <tlt-card
      :title="$utils.getModalTitle($t('interface'), $network.getName(section))"
      :help="
        $t(
          'On this page you can configure the network interfaces. You can bridge several interfaces by ticking the &quot;bridge \
          interfaces&quot; field and enter the names of several network interfaces separated by spaces. You can also use \
          <abbr title=&quot;Virtual Local Area Network&quot;>VLAN</abbr> notation <samp>INTERFACE.VLANNR</samp> (<abbr title=&quot;for \
          example&quot;>e.g.</abbr>: <samp>eth0.1</samp>)'
        )
      "
      rawhtml
    >
      <vuci-named-section
        v-slot="{ s }"
        :name="section.id"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'interfaces/config', awaitNetwork: awaitForSwitchRestart }]"
        :after-save="afterSave"
        data-key="interfaces"
        :exception-options="proto.mobile ? ['apn', 'force_apn'] : []"
      >
        <tlt-tabs
          v-model:selected="currentTab"
          :tabs="tabs"
        >
          <template #general>
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable')"
              name="enabled"
            />
            <tlt-inline-message
              v-show="showGpsWarning"
              type="warning"
              :message="$t('Mobile data will not work while the GPS is on.')"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Name')"
              :help="$t('Name of the interface.')"
              name="name"
              :rules="v => ['uciname', validateDuplicateNames.bind(v, $network.getName(s), s.id)]"
              required
            />
            <tlt-inline-message
              v-show="isInvalidDhcp"
              type="warning"
              :message="$t('DHCP server is only supported on static interfaces. The DHCP server attached to this interface will be deleted.')"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Protocol')"
              name="proto"
              initial="none"
              :options="protocols.inputOptions.value"
              force-write
              :rules="[validateDuplicateProto]"
              @change="changeProto(s)"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Operation protocol of a network interface.')"
                  :choice-hint="$t('Possible modes')"
                  :hints="protocols.hintHelperOptions.value"
                />
              </template>
            </vuci-form-item-select>
            <ip-fields
              :s="s"
              :extra-condition="proto.static"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IPv4 gateway')"
              :help="$t('The address where the router will send all the outgoing traffic.')"
              name="gateway"
              placeholder="0.0.0.0"
              rules="ip4addr"
              :depend="proto.static && s.area_type === 'wan'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IPv4 broadcast')"
              :help="$t('IP broadcasts are used by BOOTP and DHCP clients to find and send requests to their respective servers.')"
              name="broadcast"
              rules="ip4addr"
              :placeholder="broadcast"
              :depend="proto.static && s.area_type === 'wan'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="username"
              :label="$t('PAP/CHAP username')"
              :help="$t('The username that you use to connect to your carrier’s network.')"
              :depend="proto.pppoe"
              :required="!!s.password"
              maxlength="64"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="password"
              :label="$t('PAP/CHAP password')"
              :help="$t('The password that you use to connect to your carrier’s network.')"
              :depend="proto.pppoe"
              :required="!!s.username"
              maxlength="64"
              password
              sensitive
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ac"
              :label="$t('Access concentrator name')"
              :help="$t('Name of the PPPoE server, also known as the access concentrator. If left empty, the first discovered server will be used.')"
              :placeholder="$t('auto')"
              :placeholder-prefix="false"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="service"
              :label="$t('Service name')"
              :help="$t('Some PPPoE servers offer multiple services to connect to. If left empty, the first discovered service will be used.')"
              :placeholder="$t('auto')"
              :placeholder-prefix="false"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Hostname to send when requesting DHCP')"
              name="hostname"
              :placeholder="hostname"
              rules="hostname"
              :depend="proto.dhcp"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('PDP type')"
              :help="$t('Specifies what type of address is requested from the operator. When IPv4/IPv6 or IPv6 is selected IPv6 DHCP server will be enabled on LAN.')"
              name="pdptype"
              :options="pdpOptions"
              initial="ipv4v6"
              :depend="proto.mobile"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Modem')"
              :help="$t('Specify which modem to use for connection.')"
              name="modem"
              :options="modemList.map(m => [m.id, m.name])"
              :depend="proto.mobile && modemList.length > 1"
              :no-write="modemList.length <= 1"
              @change="modemChanged"
            />
            <vuci-form-item-select
              :uci-section="s"
              label="SIM"
              :help="$t('Specify which SIM card to use for connection.')"
              name="sim"
              :options="simOptions(s.modem)"
              :depend="proto.mobile && simOptions(s.modem).length > 1"
              force-write
              :no-write="!proto.mobile"
              @change="simChanged"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('eSIM profile')"
              :help="$t('Specify which eSIM profile to use for connection.')"
              name="esim_profile"
              :options="eSimOptions(s)"
              :depend="proto.mobile && eSimOptions(s).length > 1"
              force-write
              :no-write="!proto.mobile"
            />
            <mobile-fields
              :uci-data="uciData"
              :s="s"
              :extra-condition="proto.mobile"
              :initial-apn="initialApn"
              :sim-cards="simcards"
              :modem-options="modemOptions"
              :interface-apns="apnList"
              :initial-interfaces="allInterfaces"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Mode')"
              name="method"
              :options="methodOptions"
              initial="nat"
              :depend="proto.mobile && s.pdptype !== 'ipv6'"
              :rules="validateMode"
            />
            <tlt-inline-message
              v-if="(s.method === 'bridge' || s.method === 'passthrough') && proto.mobile"
              id="bridge-passthrough"
              type="info"
              :message="
                $t(
                  'Using Bridge or Passthrough mode will disable most of the device capabilities and \
                you can access your device\'s settings only through its static IP address!'
                )
              "
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Subnet selection')"
              :help="$t('Select method to set subnet.')"
              name="p2p"
              :options="p2pOptions"
              :depend="proto.mobile && ((s.method === 'bridge' && !usingPPP) || s.method === 'passthrough')"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Disable DHCPv4')"
              :help="$t('When disabled, only a single IPv4 address from the mobile provider will be leased. Otherwise, multiple IPv4 addresses will be leased and routed via NAT.')"
              name="passthrough_mode"
              :depend="s.method === 'passthrough' && proto.mobile"
            />
            <vuci-form-item-custom
              :uci-section="s"
              name="leasetime"
              :label="$t('Lease time')"
              :help="$t('Expiry time of leased addresses.') + ' ' + leaseTimeHint"
              inputs="input,select"
              :input-props="leasetimeInputProps"
              :load-parse="loadLeaseTime"
              :write-parse="saveLeaseTime"
              :depend="s.method === 'passthrough' && proto.mobile && (s.passthrough_mode === '0' || !s.passthrough_mode)"
              rawhtml
              @changed-unit="updateProps"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="mac"
              :label="$t('MAC address')"
              :help="
                $t(
                  'Specify the MAC address of the device that should receive the IPv4 address lease from the mobile provider. In bridge or passthrough mode with the DHCPv4 server disabled, this will be the only device assigned an IPv4 address.'
                )
              "
              placeholder="00:11:22:33:44:55"
              :depend="(s.method === 'passthrough' || s.method === 'bridge') && proto.mobile && (s.passthrough_mode === '0' || !s.passthrough_mode)"
              rules="macaddr"
            />
            <vuci-form-item-list
              :uci-section="s"
              :label="$t('DNS servers')"
              name="dns"
              rules="ipaddr"
              :depend="proto.static && s.area_type === 'wan'"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Servers that will be used for matching website hostnames (e.g., example.com) to their corresponding IP addresses.')"
                  :hints="v => v.ipaddr()"
                />
              </template>
            </vuci-form-item-list>
            <vuci-form-item-switch
              v-if="!!defaultWanIfname"
              id="wan_as_lan"
              :uci-section="s"
              :label="$t('Use WAN port as LAN')"
              :help="wanToLanHelp"
              :depend="s.id === 'lan'"
              name="wan_as_lan"
              :no-write="isIfnameModified === 'direct'"
              :readonly="isIfnameModified === 'direct'"
            >
              <template
                v-if="isIfnameModified === 'direct'"
                #after-content="{ controlRef }"
              >
                <tlt-tooltip
                  :target="() => controlRef"
                  placement="bottom-start"
                  fallback-placements="top-start"
                >
                  {{ $t('"%s" was changed. "%s" cannot be modified at the same time.').format($t('Physical Settings'), $t('Use WAN port as LAN')) }}
                </tlt-tooltip>
              </template>
            </vuci-form-item-switch>
            <tlt-form-model-item
              v-if="showWanToLan"
              prop="wantolan"
              :label="$t('Use port as LAN')"
              :help="wanToLanHelp"
              :depend="proto.dhcp"
            >
              <tlt-button
                button-id="wan-to-lan"
                @click="wanToLan"
              >
                {{ $t('WAN to LAN') }}
              </tlt-button>
            </tlt-form-model-item>
            <tlt-form-model-item
              v-if="showLanToWan"
              prop="lantowan"
              :label="$t('Use port as WAN')"
              :help="$t('Use LAN port as a WAN port. You will lose the LAN connection.')"
            >
              <tlt-button
                button-id="lan-to-wan"
                @click="lanToWan"
              >
                {{ $t('LAN to WAN') }}
              </tlt-button>
            </tlt-form-model-item>
          </template>
          <template #ipv6>
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Delegate IPv6 prefixes')"
              :help="$t('Enable downstream delegation of IPv6 prefixes available on this interface.')"
              name="delegate"
              :initial="'1'"
              :depend="showIpv6Tab"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="reqaddress"
              :label="$t('Request IPv6-address')"
              :options="reqAddressOptions"
              :depend="proto.dhcpv6"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Specifies how the interface should obtain an IPv6 address')"
                  :hints="[
                    { option: `${$t('Stateful + Stateless')} (try)`, hint: $t('Attempts to obtain both stateful and stateless addresses.') },
                    {
                      option: `${$t('Stateful')} (force)`,
                      hint: $t('The interface will not go up until it obtains a stateful address, but it will also attempt to get a stateless one.')
                    },
                    {
                      option: `${$t('Stateless-only')} (none)`,
                      hint: $t('The interface will only obtain a stateless address. If the DHCPv6 server does not allow stateless addresses, this may fail.')
                    }
                  ]"
                />
              </template>
            </vuci-form-item-select>
            <vuci-form-item-select
              :uci-section="s"
              name="reqprefix"
              :label="$t('Request IPv6-prefix of length')"
              :options="reqPrefixOptions"
              allow-create
              :depend="proto.dhcpv6 || proto.mobile"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="ipv6"
              :label="$t('Obtain IPv6-Address')"
              :help="$t('Enable IPv6 negotiation on the PPP link.')"
              :options="ipv6Options"
              initial="auto"
              :depend="proto.pppoe"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="ip6assign"
              :label="$t('IPv6 assignment length')"
              :help="$t('Assign a part of given length of every public IPv6-prefix to this interface.')"
              allow-create
              :options="ip6AssignOptions"
              rules="irange(0,64)"
              :depend="proto.static"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ip6hint"
              :label="$t('IPv6 assignment hint')"
              :help="$t('Assign prefix parts using this hexadecimal subprefix ID for this interface.')"
              placeholder="10"
              rules="hexstring"
              :depend="s.ip6assign >= 33 && s.ip6assign <= 64 && proto.static"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ip6addr"
              :label="$t('IPv6 address')"
              :help="$t('Assigns an IPv6 address for this interface. CIDR notation: address/prefix.')"
              placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
              :required="!s.ipaddr"
              rules="ipmask6"
              :depend="!s.ip6assign && proto.static"
              @change="self => self.vuciSection.validate()"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ip6gw"
              :label="$t('IPv6 gateway')"
              :help="$t('IPv6 default gateway.')"
              placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
              rules="ip6addr"
              :depend="!s.ip6assign && proto.static && s.area_type === 'wan'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ip6prefix"
              :label="$t('IPv6 routed prefix')"
              :help="$t('Public prefix routed to this device for distribution to clients.')"
              placeholder="2001:db8::/32"
              :depend="!s.ip6assign && proto.static"
              rules="subnet6"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ip6ifaceid"
              :label="$t('IPv6 suffix')"
              :help="
                $t(
                  'Optional. Allowed values: \'eui64\', \'random\', fixed value like \'::1\' \
              or \'::1:2\'. When IPv6 prefix (like \'a:b:c:d::\') is received from a \
              delegating server, use the suffix (like \'::1\') to form the IPv6 address \
              (\'a:b:c:d::1\') for the interface.'
                )
              "
              placeholder="::1"
              rules="ip6hostid"
              :depend="proto.static"
            />
          </template>
          <template #advanced>
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Force link')"
              name="force_link"
              :initial="proto.static ? '1' : '0'"
              :help="
                $t(
                  'Start and keep the interface running even if the assigned device is not active (e.g., when an Ethernet cable is unplugged or a wireless client disconnects). When enabled short disconnections are handled quicker and without interrupting existing connections (e.g., TCP). Use this option with caution on dynamic interfaces (e.g., DHCP client) because it prevents lease renewal after reconnection.'
                )
              "
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Framed routing')"
              name="framed_routing"
              :help="$t('Allows static routes to be set up for subscribers, enabling connectivity from external networks to IP networks behind a user equipment.')"
              :depend="supportsFramedRouting"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Use broadcast flag')"
              name="broadcast_dhcp"
              :help="$t('Required for certain ISPs, e.g., Charter with DOCSIS3.')"
              :depend="proto.dhcp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Use default gateway')"
              name="defaultroute"
              initial="1"
              :help="$t('If unchecked, no default route is configured.')"
              :depend="proto.dhcp || proto.dhcpv6 || proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Use gateway metric')"
              name="metric"
              :help="
                $t(
                  'The configuration by default generates a routing table entry. \
              In this field you can alter the metric of that entry. Lower metric means higher priority.'
                )
              "
              placeholder="0"
              rules="irange(0,4294967295)"
            />
            <vuci-form-item-list
              :uci-section="s"
              :label="$t('Use custom DNS servers')"
              name="dns"
              :depend="!proto.none && !proto.static"
              :rules="s.proto === 'dhcp' ? 'ip4addr' : s.proto === 'dhcpv6' ? 'ip6addr' : 'ipaddr'"
              force-write
            >
              <template #help>
                <hint-helper
                  :main-hint="`${$t('Servers that will be used for matching website hostnames (e.g., example.com) to their corresponding IP addresses.')} ${$t('If left empty, DNS servers advertised by peer are used.')}`"
                  :hints="v => [s.proto === 'dhcp' ? v.ip4addr() : s.proto === 'dhcpv6' ? v.ip6addr() : v.ipaddr()]"
                />
              </template>
            </vuci-form-item-list>
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Client ID to send when requesting DHCP')"
              name="clientid"
              :help="$t('Client ID which will be sent when requesting a DHCP lease.')"
              placeholder="25"
              :depend="proto.dhcp || proto.dhcpv6"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Vendor class to send when requesting DHCP')"
              name="vendorid"
              :help="$t('Vendor class which will be sent when requesting a DHCP lease.')"
              placeholder="25"
              :depend="proto.dhcp"
            />
            <tlt-form-item-inline
              :label="$t('Map priority')"
              :help="$t('Maps priority from kernel priority to 802.1p. In most cases use 0 for kernel priority as it is the default one.')"
              has-headers
              :depend="proto.pppoe"
            >
              <div class="md:basis-1/2">
                <div class="truncate">{{ $t('Kernel priority') }}</div>
                <vuci-form-item-input
                  :uci-section="s"
                  name="tag"
                  rules="irange(0,15)"
                  placeholder="0"
                  :required="!!s.priority"
                  :depend="proto.pppoe"
                />
              </div>
              <div class="md:basis-1/2">
                <div class="truncate">
                  {{ $t('802.1p priority') }}
                </div>
                <vuci-form-item-input
                  :uci-section="s"
                  name="priority"
                  rules="irange(0,7)"
                  :required="!!s.tag"
                  :depend="proto.pppoe"
                />
              </div>
            </tlt-form-item-inline>
            <vuci-form-item-input
              :uci-section="s"
              name="keepalive_failure"
              :label="$t('LCP echo failure threshold')"
              :help="$t('Presume peer to be dead after given amount of LCP echo failures, use 0 to ignore failures.')"
              placeholder="0"
              rules="uinteger"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="keepalive_interval"
              :label="$t('LCP echo interval')"
              :help="$t('Send LCP echo requests at the given interval in seconds, only effective in conjunction with failure threshold.')"
              placeholder="5"
              rules="min(1)"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="host_uniq"
              :label="$t('Host-Uniq tag content')"
              :help="$t('Raw hex-encoded bytes. Leave empty unless your ISP require this.')"
              rules="hexstring"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="demand"
              :label="$t('Inactivity timeout')"
              :help="$t('Close inactive connection after the given amount of seconds, use 0 to persist connection.')"
              placeholder="0"
              rules="uinteger"
              :depend="proto.pppoe"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Override MAC address')"
              :help="
                $t(
                  'Override MAC address of the interface. For example, your ISP (Internet Service Provider) gives you a static IP address and it \
              might also bind it to your computers MAC address (i.e., that IP will only work with your computer but not with your router). \
              In this field you can select your computer’s MAC address and fool the gateway in to thinking that it is communicating with your computer.\
              You can select the MAC address of a currently connected computer, or use a custom one. \
              When changing MAC address on LAN interface be careful to avoid MAC address collisions.'
                )
              "
              name="macaddr"
              :placeholder="macPlaceholder"
              :rules="v => [validateMacAddress]"
              :depend="proto.dhcp || proto.dhcpv6 || proto.static"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Override MTU')"
              :help="mtuHint"
              name="mtu"
              placeholder="1500"
              :rules="v => [v.irange.bind(v, 68, proto.mobile || bridged ? 65535 : maxMtu)]"
              :depend="s.proto !== 'none'"
            />
            <vuci-form-item-input
              v-bind="ipTable"
              :uci-section="s"
              placeholder="300"
              rules="uinteger"
              :depend="s.proto !== 'none'"
            />
          </template>
          <template #physical>
            <tlt-inline-message
              v-if="isIfnameModified === 'wan_as_lan'"
              type="info"
            >
              {{ $t('"%s" was changed. "%s" cannot be modified at the same time.').format($t('Use WAN port as LAN'), $t('Physical Settings')) }}
            </tlt-inline-message>
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Bridge interfaces')"
              name="bridge"
              :help="$t('Creates a bridge over specified interface(s).')"
              :depend="!proto.mobile"
              :no-write="isIfnameModified === 'wan_as_lan'"
              :readonly="isIfnameModified === 'wan_as_lan'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable STP')"
              name="stp"
              :help="$t('Enables the Spanning Tree Protocol on this bridge.')"
              :depend="s.bridge === '1'"
              :no-write="isIfnameModified === 'wan_as_lan'"
              :readonly="isIfnameModified === 'wan_as_lan'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable IGMP')"
              name="igmp_snooping"
              :help="$t('Enables IGMP snooping on this bridge.')"
              :depend="s.bridge === '1'"
              :no-write="isIfnameModified === 'wan_as_lan'"
              :readonly="isIfnameModified === 'wan_as_lan'"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="ifname"
              :label="$t('Interface')"
              :help="$t('Physical interface name to assign to this section, list of interfaces if type bridge is set.')"
              :options="ifDevices"
              :multiple="bridged"
              :load="loadIfname"
              :save="saveIfname"
              :placeholder="$t('-- Please select --')"
              force-write
              :rules="['fieldvalidation(\'^[A-Za-z0-9._@-]*$\')', validateIfname, validateUsedLanNames]"
              maxlength="15"
              allow-create
              :depend="!proto.mobile"
              :no-write="isIfnameModified === 'wan_as_lan'"
              :readonly="isIfnameModified === 'wan_as_lan'"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="fiber_priority"
              :label="$t('Port priority')"
              :help="$t('Port priority option allows to change physical port priority (SFP or Ethernet). This option is uniform between all eth1 interfaces.')"
              :options="fiberOptions"
              :depend="
                hasSfpSwitch &&
                s.ifname != null &&
                s.ifname !== '' &&
                s.ifname.includes(defaultWanIfname) &&
                (s.proto !== 'static' || s.proto !== 'dhcp' || s.proto !== 'dhcpv6' || s.proto !== 'pppoe')
              "
              :initial="initialFiberPriority"
              force-write
            />
          </template>
          <template #firewall>
            <zone
              :uci-section="s"
              :protocol="s.proto"
              :zones="fwZones"
              @update-zone="value => (s.fwzone = value)"
            />
          </template>
        </tlt-tabs>
      </vuci-named-section>
      <ListLayout
        v-if="section.area_type === 'lan' || proto.mobile"
        v-show="currentTab === 'general'"
        gap="md"
      >
        <vuci-named-section
          v-slot="{ s }"
          :name="section.id"
          :uci-data="uciData"
          :endpoints="[{ endpoint: 'dhcp/servers/ipv4/config' }]"
          data-key="dhcpv4"
          :exception-options="['.new_section']"
          :visible="section.proto === 'static' || section.method === 'bridge'"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable DHCPv4 server')"
            name="enable_dhcpv4"
            :depend="!proto.mobile"
          >
            <template #help>
              <string-with-links :text="$t('More detailed configuration can be found in %s page.').format(formatLink(`/network/dhcp_servers/general/ipv4?edit=${s.id}`, $t('DHCPv4 server')))" />
            </template>
          </vuci-form-item-switch>
          <tlt-inline-message
            v-if="!proto.mobile && multiDeviceDhcpMsg"
            id="dhcp-conflict"
            type="warning"
            :message="multiDeviceDhcpMsg"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="dynamicdhcp"
            :label="$t('Local DHCPv4 leases')"
            :help="$t('Provides local DHCPv4 leases until a mobile connection is established or a mobile IP address is leased.')"
            :depend="proto.mobile && s.mode === 'server'"
          />
        </vuci-named-section>
      </ListLayout>
      <ListLayout
        v-if="section.area_type === 'lan'"
        v-show="currentTab === 'general'"
        gap="md"
      >
        <vuci-named-section
          v-slot="{ s }"
          :name="section.id"
          :uci-data="uciData"
          :endpoints="[{ endpoint: 'dhcp/servers/ipv6/config' }]"
          data-key="dhcpv6"
          :visible="section.proto === 'static'"
          :exception-options="['ra', 'dhcpv6']"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable DHCPv6 server')"
            name="enable_dhcpv6"
            @change="$network.validateDhcpV6Enable(s, true)"
          >
            <template #help>
              <string-with-links :text="$t('More detailed configuration can be found in %s page.').format(formatLink(`/network/dhcp_servers/general/ipv6?edit=${s.id}`, $t('DHCPv6 server')))" />
            </template>
          </vuci-form-item-switch>
        </vuci-named-section>
      </ListLayout>
    </tlt-card>
  </vuci-form>
</template>
<script>
/** @typedef {import('@/types/firewallTypes').Zone} Zone */
/** @typedef {import('@/types/networkTypes').Interface} Interface */
/** @typedef {import('@/types/dhcpTypes').DhcpV4Config} DhcpV4Config */
/** @typedef {import('@/types/dhcpTypes').DhcpV6Config} DhcpV6Config */

import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import Zone from './Zone.vue'
import MobileFields from '@/components/network/MobileFields.vue'
import commonFunctions from '@/components/network/commonFunctions'
import { reconnectHelper } from '@/utils/reconnectHelper'
import IpFields from '@/components/network/IpFields.vue'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'
import HintHelper from '@/components/shared/HintHelper.vue'

export default {
  name: 'InterfaceEdit',
  components: {
    Zone,
    MobileFields,
    IpFields,
    StringWithLinks,
    HintHelper
  },
  inject: {
    formOptions: {},
    initialOverviewForm: {},
    getModemApnList: {
      default: () => () => []
    },
    setSection: {
      default: () => {}
    },
    refreshConfig: {}
  },
  props: {
    section: {
      type: Object,
      required: true
    },
    allInterfaces: {
      type: Array,
      default: () => []
    },
    validateDuplicateNames: {
      type: Function,
      default: () => {}
    }
  },
  data() {
    return {
      formData: {
        /** @type {Interface[]} */
        interfaces: [],
        /** @type {DhcpV4Config[]} */
        dhcpv4: [],
        /** @type {DhcpV6Config[]} */
        dhcpv6: []
      },
      currentTab: 'general',
      physicalTab: false,
      leaseTimeHint: '',
      leasetimePlaceholder: '12',
      leaseTimeRules: 'irange(1,99999)',
      defaultWanIfname: this.$store.board.network.wan?.device,
      defaultLanIfname: this.$store.board.network.lan?.device ? [this.$store.board.network.lan.device] : (this.$store.board.network.lan?.ports ?? []),
      hostname: this.$store.deviceInfo.static.hostname,
      hasSfpSwitch: !!this.$store.board.hwinfo.sfp_switch,
      usingPPP: this.$store.board.modems?.[0]?.type === 'PPP',
      wanToLanHelp: this.$t('Use WAN port as a LAN port. You will lose the WAN connection.'),
      pdpOptions: [
        ['ip', 'IPv4'],
        ['ipv6', 'IPv6'],
        ['ipv4v6', 'IPv4/IPv6']
      ],
      p2pOptions: [
        ['0', 'Auto'],
        ['1', 'P2P']
      ],
      reqAddressOptions: [
        ['try', `${this.$t('Stateful + Stateless')} (try)`],
        ['force', `${this.$t('Stateful')} (force)`],
        ['none', `${this.$t('Stateless-only')} (none)`]
      ],
      reqPrefixOptions: [['auto', this.$t('Automatic')], ['no', this.$t('Disabled')], '64', '60', '56', '52', '48'],
      methodOptions: [
        ['nat', this.$t('NAT')],
        ['bridge', this.$t('Bridge')],
        ['passthrough', this.$t('Passthrough')]
      ],
      unitOptions: [
        ['h', this.$t('Hours')],
        ['m', this.$t('Minutes')],
        ['s', this.$t('Seconds')]
      ],
      ipv6Options: [
        ['auto', this.$t('Automatic')],
        ['0', this.$t('Disabled')],
        ['1', this.$t('Manual')]
      ],
      ip6AssignOptions: [['', this.$t('Disabled')], '64', '60', '56', '52', '48'],
      fiberOptions: [
        ['1', this.$t('SFP')],
        ['0', this.$t('Ethernet')]
      ],
      initialSection: JSON.parse(JSON.stringify(this.section)),
      initialApn: '',
      initialDevice: {
        bridge: '',
        ifname: []
      },
      initialProto: this.section.proto,
      apnPromptShown: false,
      formatLink
    }
  },
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board.hwinfo.dsa,
      maxMtu: state => state.board.network_options.max_mtu
    }),
    dhcpSection() {
      return this.formData.dhcpv4?.find(section => (this.proto.mobile ? 'lan' : this.section.id) === section.id)
    },
    tabs() {
      return [
        { name: 'general', title: this.$t('General Settings') },
        { name: 'ipv6', title: this.$t('IPv6 Settings'), show: this.showIpv6Tab },
        { name: 'advanced', title: this.$t('Advanced Settings') },
        { name: 'physical', title: this.$t('Physical Settings'), show: this.physicalTab },
        { name: 'firewall', title: this.$t('Firewall Settings') }
      ]
    },
    showIpv6Tab() {
      const isIpv6Proto = ['static', 'dhcpv6', 'pppoe', 'mobile'].some(ipv6Proto => this.proto[ipv6Proto])
      return this.isIpv6 && isIpv6Proto
    },
    proto() {
      return {
        none: this.section.proto === 'none',
        static: this.section.proto === 'static',
        dhcp: this.section.proto === 'dhcp',
        dhcpv6: this.section.proto === 'dhcpv6',
        mobile: this.section.proto === 'connm' || this.section.proto === 'wwan',
        pppoe: this.section.proto === 'pppoe'
      }
    },
    bridged() {
      return this.section.bridge === '1'
    },
    simSection() {
      return this.simcards.find(s => s.modem === this.section.modem && s.position === this.section.sim) || this.simcards[0]
    },
    simcards() {
      return this.formOptions().simcards
    },
    modemList() {
      return this.formOptions().modemList
    },
    /** @returns {import('@/types/networkDeviceTypes').DeviceStatus[]} */
    networkDevices() {
      return this.formOptions().networkDevices
    },
    isIpv6() {
      return this.$store.deviceInfo.features.ipv6
    },
    fwZones() {
      /** @type {Zone[]} */
      const zones = JSON.parse(JSON.stringify(this.formOptions().fwZones)).map(zone => ({ ...zone, network: [] }))
      this.allInterfaces.forEach(iface => {
        const zone = zones.find(zone => zone.name === iface.fwzone)
        if (zone) zone.network.push(iface.name)
      })
      return zones
    },
    wirelessNetworks() {
      return this.formOptions().wirelessNetworks
    },
    protocols() {
      return this.$network.getInterfaceProtocols(this.section.area_type, this.modemList?.length > 0)
    },
    ifDevices() {
      const devices = this.networkDevices
        .filter(d => {
          if (!d.name) return false
          const deviceExistInBridge = !this.dsa && this.allInterfaces.some(s => s.id !== this.section.id && s.bridge === '1' && s.ifname?.includes(d.name))
          const bridgeItself = d.name === `br-${this.section.id}`
          const excludedDevices = !d.name.startsWith('wwan') && !d.name.startsWith('wlan')
          const excludeBridgeVlan = !(this.dsa && this.bridged && d.name.match(/^.+\.[0-9]+$/))
          const excludeBridge = !(this.dsa && this.networkDevices.some(s => s.type === 'VLAN' && new RegExp(`^(${d.name})\\.[0-9]+$`).test(s.name)))
          const commonCondition = d.name && !deviceExistInBridge && excludedDevices && !bridgeItself && excludeBridgeVlan && excludeBridge
          if (!commonCondition) return false
          const configurableLanDevices = this.defaultLanIfname.includes(d.name)
          const configurableDevice = d.name === this.defaultWanIfname || configurableLanDevices
          const vlanDevice = d.type === 'VLAN'
          const vxlanDevice = d.type === 'vxlan'
          const bridgeDevice = d.type === 'bridge'
          const loopbackDevice = d.id === 'lo'

          const excludeBridgeDevices = this.section.bridge === '1'
          if (excludeBridgeDevices) {
            return vlanDevice || configurableDevice || vxlanDevice
          }
          return bridgeDevice || vlanDevice || configurableDevice || vxlanDevice || loopbackDevice
        })
        .sort((a, b) => {
          a = a.description || a.name
          b = b.description || b.name
          if (a.startsWith('wan') || a.startsWith('br-') || b.startsWith('br-') || b.startsWith('wan')) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1
          }
          if (a.includes('.') && b.includes('.')) return parseFloat(a.split('.')[1]) - parseFloat(b.split('.')[1])
          return a.localeCompare(b, undefined, { numeric: true })
        })
        .map(d => {
          if (d.type === 'bridge' && d['bridge-members']?.length > 0) {
            return [d.name, `${d.description || d.name} (${d['bridge-members'].join(', ')})`]
          }
          return [d.name, d.description || d.name]
        })
      const commonDevices = devices.concat(this.formOptions().vlanInterfaceDevices.map(s => s.name))
      if (!this.bridged) commonDevices.unshift(['', this.$t('-- No interface --')])
      return commonDevices
    },
    showWanToLan() {
      return (this.section.id === 'wan' || this.section.id === 'lan_to_wan') && !this.proto.mobile && !this.defaultWanIfname
    },
    showLanToWan() {
      const lanToWanExists = this.allInterfaces.some(iface => iface.id === 'lan_to_wan')

      // Need to filter out usb devices as they cannot be used as wan
      const inNetwork = this.$store.lanPortDevices.filter(e => e.startsWith('lan') || e.startsWith('eth')).length === 1
      const inSwitch = !this.$store.board.switch?.switch0 || this.$store.board.switch.switch0.ports.filter(e => e.role === 'lan').length === 1

      const hasSingleEthernetLan = inNetwork && inSwitch

      const defaultLanSection = this.section.area_type === 'lan' && this.section.id === 'lan'

      return defaultLanSection && !lanToWanExists && hasSingleEthernetLan && !this.defaultWanIfname
    },
    broadcast() {
      const ipaddr = this.section.ipaddr || '192.168.1.1'
      const netmask = this.section.netmask || '255.255.255.0'
      const i = ipaddr.split('.')
      const m = netmask.split('.')
      let I = 0
      let M = 0

      for (let n = 0; n < 4; n++) {
        i[n] = parseInt(i[n])
        m[n] = parseInt(m[n])
        if (isNaN(i[n]) || i[n] < 0 || i[n] > 255 || isNaN(m[n]) || m[n] < 0 || m[n] > 255) {
          return
        }
        I |= i[n] << ((3 - n) * 8)
        M |= m[n] << ((3 - n) * 8)
      }
      const B = I | ~M
      return '%s.%s.%s.%s'.format((B >> 24) & 0xff, (B >> 16) & 0xff, (B >> 8) & 0xff, (B >> 0) & 0xff)
    },
    macPlaceholder() {
      const ifname = this.section.bridge === '1' && Array.isArray(this.section.ifname) ? this.section.ifname?.[0] : this.section.ifname
      return this.networkDevices.find(s => s.name === ifname)?.macaddr || ''
    },
    leasetimeInputProps() {
      const leaseTime = {
        prop: 'leaseTime',
        placeholder: this.leasetimePlaceholder,
        rules: this.leaseTimeRules
      }
      const leaseUnit = {
        prop: 'leaseUnit',
        options: this.unitOptions
      }
      return [leaseTime, leaseUnit]
    },
    modemOptions() {
      return this.$mobile.modemsOptions(this.formOptions().modemList)
    },

    initialFiberPriority() {
      return this.formData.interfaces.find(s => s.fiber_priority)?.fiber_priority || ''
    },
    awaitForSwitchRestart() {
      if (this.initialSection.stp !== '1' && this.section.stp === '1') return true
      if (this.section.method === 'passthrough' || this.initialSection.method === 'passthrough') return true
      return this.section.proto === 'static' && this.section.netmask !== this.initialSection.netmask
    },
    usedLansVlan() {
      const bridges = [...new Set(this.networkDevices.filter(s => s.type === 'VLAN').map(s => s.name.match(/^(.+)\.[0-9]+$/)?.[1] || s.name))]
      return this.networkDevices.filter(dev => bridges.includes(dev.name)).flatMap(dev => dev['bridge-members'] ?? [])
    },
    usedIfaces() {
      const usedByIface = this.allInterfaces
        .filter(s => s.id !== this.section.id && (this.section.bridge === '1' || s.bridge === '1') && s.ifname?.some(ifn => this.section.ifname?.includes(ifn)))
        .flatMap(s => s.ifname)
      const usedByBridge = this.networkDevices.filter(dev => dev.type === 'bridge' && dev.name !== `br-${this.section.id}`).flatMap(dev => dev['bridge-members'] ?? [])
      return [...usedByIface, ...usedByBridge]
    },
    mtuHint() {
      const dynamicMtu = this.modemList.find(m => m.id === this.section.modem)?.dynamic_mtu
      if (dynamicMtu) return this.$t('Maximum Transmission Unit (MTU) – specifies the largest possible size of a data packet. If Override MTU field will be left – empty dynamic MTU will be used.')
      return this.$t('Maximum Transmission Unit (MTU) – specifies the largest possible size of a data packet')
    },
    ipTable() {
      return {
        name: this.proto.dhcpv6 ? 'ip6table' : 'ip4table',
        label: this.proto.dhcpv6 ? this.$t('IP6 table') : this.$t('IP4 table'),
        help: this.$t('%s routing table for routes of this interface.').format(this.proto.dhcpv6 ? 'IPv6' : 'IPv4')
      }
    },
    isInvalidDhcp() {
      return this.dhcpSection !== undefined && !this.dhcpSection['.new_section'] && this.section.proto !== 'static' && !this.proto.mobile
    },
    multiDeviceDhcpMsg() {
      return this.$network.getMultiDeviceDhcpMsg(this.formData.interfaces, this.formData.dhcpv4, this.dhcpSection, this.networkDevices)
    },
    supportsFramedRouting() {
      return (this.proto.mobile && (this.formOptions().modemList.find(modem => modem.id === this.section.modem) || this.formOptions().modemList[0])?.framed_routing) ?? false
    },
    showGpsWarning() {
      const modem = this.formOptions().modemList.find(modem => modem.id === this.section.modem) || this.formOptions().modemList[0]
      return this.proto.mobile && this.section.enabled === '1' && this.$mobile.getGnssState(modem)
    },
    apnList() {
      const modem = this.formOptions().modemList.find(modem => modem.id === this.section.modem) || this.formOptions().modemList[0]
      if (!this.proto.mobile || !modem) return []
      const esimCheck = !modem.esim_profile || modem.esim_profile === this.section.esim_profile
      if (modem.active_sim === Number(this.section.sim) && esimCheck) return this.getModemApnList(this.section.modem)
      return []
    },
    /** @return {null | 'direct' | 'wan_as_lan'} */
    isIfnameModified() {
      const isBridgeChanged = (this.section.bridge?.toString() ?? '0') !== (this.initialSection.bridge?.toString() ?? '0')
      const isDirectlyChanged = (this.section.ifname?.toString() ?? '') !== (this.initialSection.ifname?.toString() ?? '') || isBridgeChanged
      const isWanAsLanChanged = (this.section.wan_as_lan ?? '0') !== (this.initialSection.wan_as_lan ?? '0')
      if (!isDirectlyChanged && !isWanAsLanChanged) return null
      return isDirectlyChanged ? 'direct' : 'wan_as_lan'
    }
  },
  watch: {
    bridged() {
      if (!this.bridged && Array.isArray(this.section.ifname)) {
        this.setSection(section => (section.ifname = section.ifname?.[0]))
      } else if (
        this.bridged &&
        (this.section.ifname === '' ||
          this.section.ifname === 'vlan' ||
          this.section.ifname.startsWith('br-') ||
          (this.section.ifname.startsWith('bridge') && this.networkDevices.some(s => s.name === this.section.ifname && ['VLAN', 'bridge'].includes(s.type))))
      ) {
        this.setSection(section => (section.ifname = []))
      }
    }
  },
  mounted() {
    const proto = this.section.proto || 'none'
    this.physicalTab = proto === 'dhcp' || proto === 'dhcpv6' || proto === 'pppoe' || proto === 'static' || proto === 'none'
    // Later on remove these and use initialSection
    this.initialApn = this.section.apn || ''
    this.initialDevice = {
      bridge: this.section.bridge,
      ifname: this.section.ifname
    }
    if (this.section.auto_apn === '1' || (this.section.auto_apn === '0' && this.section.force_apn)) {
      this.setSection(section => {
        section.auth = 'none'
        section.username = ''
        section.password = ''
      })
    }
  },
  methods: {
    afterLoad(form) {
      if (this.section.area_type === 'wan') return
      if (form.dhcpv4.find(section => section.id === this.section.id) === undefined) {
        form.dhcpv4.push({ id: this.section.id, '.new_section': true })
        form.dhcpv6.push({ id: this.section.id, ra: 'server', dhcpv6: 'server' })
      }
    },
    changeProto(s) {
      this.physicalTab = this.proto.dhcp || this.proto.dhcpv6 || this.proto.pppoe || this.proto.static || this.proto.none
      this.$nextTick(() => {
        s.force_link = this.proto.static ? '1' : '0'
        if (this.proto.dhcp) s.defaultroute = '1'
        if (this.proto.mobile) {
          s.sim = '1'
          s.modem = this.modemList[0].id
          s.auto_apn = '1'
          if (this.eSimOptions(s).length === 0) s.esim_profile = undefined
          else if (this.eSimOptions(s).length === 1) s.esim_profile = '1'
        }
      })
    },
    checkMetrics() {
      return new Promise(resolve => {
        if (this.section.area_type === 'lan' || this.section.metric === '4294967295') return resolve()
        const iface = this.initialOverviewForm().interfaces.find(iface => iface.id !== this.section.id && iface.metric === this.section.metric)
        if (!iface) return resolve()
        this.$prompt.show({
          title: this.$t('Metric update'),
          content: this.$t('Provided gateway metric is already used for "%s" interface. Saving the form will shift existing interface metrics in order to maintain "%s" interface metric').format(
            this.$network.getName(iface),
            this.$network.getName(this.section)
          ),
          okText: this.$t('Update'),
          cancelText: this.$t('Cancel'),
          onOk: () => {
            this.updateMetrics()
            resolve()
          }
        })
      })
    },
    updateMetrics() {
      const oldMetric = this.initialSection.metric
      const newMetric = this.section.metric
      this.formData.interfaces.forEach(iface => {
        if (iface.id === this.section.id) return
        if ((iface.metric >= newMetric && iface.metric < oldMetric) || (iface.metric <= newMetric && iface.metric > oldMetric)) {
          const val = newMetric > oldMetric ? -1 : 1
          iface.metric = (parseInt(iface.metric) + val).toString()
        }
      })
    },
    beforeSave() {
      return new Promise((resolve, reject) => {
        this.$refs.form.validate().then(async validationResult => {
          if (this.proto.static) {
            if (!validationResult && !this.validateIpAddress()) return reject(this.$t('One of the IPv4 or IPv6 addresses must be defined.'))
          }
          // if passes other validations but some fields are invalid
          if (!validationResult) return reject(this.$t('Some fields are invalid'))
          if (!this.proto.mobile) return resolve(true)

          const sameMobileIfaces = this.allInterfaces.filter(
            iface =>
              (iface.proto === 'connm' || iface.proto === 'wwan') &&
              iface.id !== this.section.id &&
              iface.modem === this.section.modem &&
              iface.sim === this.section.sim &&
              iface.esim_profile === this.section.esim_profile
          )
          if (sameMobileIfaces.length >= 9) {
            return reject(this.$t('Maximum amount of mobile interfaces reached'))
          }

          const modems = await this.updateModemList()
          if (commonFunctions.modemInUse(this.section, modems)) {
            return reject(this.$t("Instance can't be edited because modem is blocked or disabled"))
          }
          const validationRes = commonFunctions.checkForSingleInterfaceModem(this.section, this.allInterfaces, modems)
          if (!validationRes.isValid) {
            return reject(validationRes.message)
          }
          if (this.section.enabled === '0') return resolve(true)
          if (!this.sameSimModemSections()) {
            const apnValidationRes = commonFunctions.validateDuplicateApns(
              this.section,
              this.apnPromptShown ? this.formData.interfaces : this.allInterfaces,
              this.formOptions().interfaceStatus,
              this.getModemApnList(this.section.modem)
            )
            if (!apnValidationRes.isValid) {
              return reject(apnValidationRes.message)
            }
            return resolve(true)
          }
          // Remove auto apn validation logic with #10358 issue refactor
          const modem = this.modemList.find(s => s.id === this.section.modem)
          const simText = 'SIM%s'.format(this.$mobile.getSimLabel(this.section.sim, this.section.esim_profile, this.section.modem))
          const modemTitle = this.$mobile.shouldShowModemName(modem) ? '%s %s'.format(modem.name, simText) : simText
          return this.$prompt.show({
            title: this.$t('Turn off Auto APN for all %s interfaces?').format(modemTitle),
            content: this.$t('For multi APN to work correctly it needs all interfaces with same SIM to have Auto APN disabled.'),
            okText: this.$t('Yes'),
            cancelText: this.$t('Cancel'),
            onOk: () => {
              const sectionCopy = {
                ...this.section,
                auto_apn: '0',
                apn: this.section.auto_apn === '1' ? this.initialSection.apn : this.section.apn,
                force_apn: this.section.auto_apn === '1' ? this.initialSection.force_apn : this.section.force_apn
              }
              this.updateAutoApn()
              this.apnPromptShown = true
              const apnValidationRes = commonFunctions.validateDuplicateApns(sectionCopy, this.formData.interfaces, this.formOptions().interfaceStatus, this.getModemApnList(this.section.modem))
              if (!apnValidationRes.isValid) {
                return reject(apnValidationRes.message)
              }
              resolve(true)
            }
          })
        })
      })
        .then(this.checkMetrics)
        .then(() => reconnectHelper.openPrompt(this.initialSection, this.section))
    },
    updateAutoApn() {
      this.formData.interfaces.forEach(iface => {
        if (iface.modem === this.section.modem && iface.sim === this.section.sim && iface.esim_profile === this.section.esim_profile) iface.auto_apn = '0'
      })
    },
    sameSimModemSections() {
      return this.formData.interfaces.some(
        s =>
          s.enabled === '1' &&
          (s.auto_apn === '1' || this.section.auto_apn === '1') &&
          s.id !== this.section.id &&
          s.modem === this.section.modem &&
          s.sim === this.section.sim &&
          s.esim_profile === this.section.esim_profile
      )
    },
    updateModemList() {
      this.$spin(true)
      return this.$axios
        .get('/api/modems/status')
        .then(res => {
          return this.$mobile.parseModems(res.data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    deleteDhcp(dhcpSection) {
      return this.$axios
        .delete('/api/dhcp/servers/ipv4/config', {
          data: {
            data: [dhcpSection.id]
          }
        })
        .then(async () => {
          await this.$nextTick()
          await this.$nextTick()
          const index = this.formData.dhcpv4.findIndex(section => section.id === dhcpSection.id)
          if (index > -1) {
            this.formData.dhcpv4[index] = { '.new_section': true, id: dhcpSection.id, enable_dhcpv4: '0' }
            this.formData.dhcpv6[index] = { id: dhcpSection.id, enable_dhcpv6: '0' }
          }
        })
        .catch(() => {
          this.$message.error(this.$t('DHCP section deletion error'))
        })
    },
    afterSave(_, { data }) {
      const promises = []
      if (this.isInvalidDhcp) promises.push(this.deleteDhcp(this.dhcpSection))
      if (this.section.area_type === 'lan' && this.section.proto === 'static') {
        this.formData.dhcpv4.find(section => this.section.id === section.id)['.new_section'] = false
      }
      if (data.fiber_priority) promises.push(this.updateFiberPriority(data))
      if (this.isIfnameModified === 'wan_as_lan') this.refreshConfig()
      return Promise.all(promises).finally(() => {
        reconnectHelper.handleReconnect(this.initialSection, this.section)
      })
    },
    updateFiberPriority(updatedInterface) {
      this.formData.interfaces.forEach(iface => {
        if (!iface.ifname?.includes(this.defaultWanIfname)) return
        iface.fiber_priority = updatedInterface.fiber_priority
      })
    },
    simOptions(modemId) {
      if (!modemId) modemId = this.modemList[0]?.id
      const opts = []
      if (!modemId) return opts
      const modem = this.modemList.find(m => m.id === modemId)
      for (let i = 0; i < modem?.sim_count; i++) {
        opts.push([(i + 1).toString(), 'SIM' + this.$mobile.adjustSimNumber(i + 1, modem.id)])
      }
      return opts
    },
    eSimOptions(s) {
      let modemId = s.modem
      if (!s.modem) modemId = this.modemList[0]?.id
      if (!modemId) return []
      const list =
        this.formOptions()
          .simcards?.filter(simcard => simcard.modem === modemId && simcard.position === s.sim && simcard.esim_profile)
          .map(sim => [sim.esim_profile, `eSIM${sim.esim_profile}`])
          .sort((a, b) => a[0] - b[0]) || []
      return list
    },
    modemChanged() {
      this.$nextTick(() => {
        this.setSection(section => (section.sim = '1'))
        this.simOptions(this.section.modem)
      })
    },
    simChanged() {
      this.$nextTick(() => {
        this.setSection(section => {
          if (this.eSimOptions(section).length === 0) section.esim_profile = undefined
          else if (this.eSimOptions(section).length === 1) section.esim_profile = '1'
        })
      })
    },
    wanToLan() {
      this.$prompt.show({
        title: this.$t('Switch interface?'),
        content: this.$t('You will be redirected to the LAN interface configuration. Remote access will be unchanged.'),
        okText: this.$t('Switch interface'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.switchWanToLan()
        }
      })
    },
    switchWanToLan() {
      this.$spin(true)
      return this.$axios
        .post('/api/interfaces/actions/wan_to_lan')
        .then(() => {
          this.$router.push({ path: '/network/lan', query: { edit: 'lan' } })
        })
        .catch(() => {
          this.$message.error(this.$t('Error WAN to LAN redirect'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    lanToWan() {
      let msg = this.$t('You will be redirected to the WAN interface configuration.')
      msg = this.section.ifname.includes(this.defaultWanIfname)
        ? msg
        : msg + ' ' + this.$t('Remote access will be turned on automatically. Please configure the WAN or any other interface, so you do not lose access to the device.')
      this.$prompt.show({
        title: this.$t('Switch interface?'),
        content: msg,
        okText: this.$t('Switch interface'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.switchLanToWan()
        }
      })
    },
    switchLanToWan() {
      this.$spin(true)
      return this.$axios
        .post('/api/interfaces/actions/lan_to_wan')
        .then(() => {
          this.$router.push({ path: '/network/wan', query: { edit: `${this.section.id}_to_wan` } })
        })
        .catch(() => {
          this.$message.error(this.$t('Error LAN to WAN redirect'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    saveIfname(self) {
      const ifname = self.model
      return Array.isArray(ifname) ? ifname : [ifname]
    },
    loadIfname(self) {
      if (!Array.isArray(self.model)) return self.model
      return this.bridged ? self.model : self.model[0]
    },
    saveLeaseTime(values) {
      return values[0] !== '' ? values.join('') : ''
    },
    loadLeaseTime(leasetime) {
      const lease = leasetime.match(/\d+/g)?.[0] ?? ''
      const unit = leasetime[leasetime.length - 1]
      return [lease, unit]
    },
    updateProps(unit) {
      if (unit === 'h') {
        this.leaseTimeHint = this.$t('Minimum value is 1 hour')
        this.leasetimePlaceholder = '12'
        this.leaseTimeRules = 'irange(1,999999)'
      } else if (unit === 'm') {
        this.leaseTimeHint = this.$t('Minimum value is 2 minutes')
        this.leasetimePlaceholder = '720'
        this.leaseTimeRules = 'irange(2,999999)'
      } else if (unit === 's') {
        this.leaseTimeHint = this.$t('Minimum value is 120 seconds')
        this.leasetimePlaceholder = '43200'
        this.leaseTimeRules = 'irange(120,999999)'
      }
    },
    validateMode(value) {
      if (value !== 'nat' && this.formData.interfaces.some(e => e.id !== this.section.id && (e.method === 'bridge' || e.method === 'passthrough'))) {
        return {
          isValid: false,
          message: this.$t('Only one Bridge or Passthrough mode configuration is possible')
        }
      }
      return { isValid: true }
    },
    validateIfname(self) {
      const isWireless = this.wirelessNetworks.some(s => s.network?.includes(this.section.id))
      if (!isWireless && (self.model === '' || self.model === 0)) {
        return { isValid: false, message: this.$t('Physical interface can not be empty') }
      }
      return { isValid: true }
    },
    validateUsedLanNames(value) {
      const message = this.$t('Physical interface "%s" is already being used by %s')
      const arrayVal = Array.isArray(value) ? value : [value]
      if (this.bridged && arrayVal.includes('lo')) return { isValid: false, message: message.format('lo', 'loopback') }
      if (!this.dsa) {
        const used = this.allInterfaces.find(iface => {
          const ifname = Array.isArray(iface.ifname) ? iface.ifname : [iface.ifname]
          return iface.id !== this.section.id && (iface.bridge === '1' || this.bridged) && ifname.some(name => arrayVal.includes(name))
        })
        if (used) return { isValid: false, message: message.format(used.ifname, used.id) }
        return { isValid: true }
      }
      const missUseVlan = arrayVal.find(val => this.usedLansVlan.includes(val))
      const missUseIface = arrayVal.find(val => this.usedIfaces.includes(val))
      const missUsed = missUseVlan ?? missUseIface
      if (missUsed) {
        const usedBy = missUseVlan ? this.$t('port based vlan') : this.section.bridge === '1' ? this.$t('other interface') : this.$t('bridge interface')
        return {
          isValid: false,
          message: message.format(missUsed, usedBy)
        }
      }
      return { isValid: true }
    },
    validateMacAddress(value) {
      if (!value.match(/^([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}$/)) {
        return {
          isValid: false,
          message: this.$t('Mac address of six groups of two hexadecimal digits are accepted (e.g., 00:23:45:67:89:AB).')
        }
      } else if (parseInt(value.split(':')[0], 16) & 0b00000001) {
        return { isValid: false, message: this.$t('Unicast MAC address is allowed (e.g., 00:23:45:67:89:AB).') }
      }
      return { isValid: true }
    },
    arrayEquals(a, b) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
    },
    validateIpAddress() {
      return !!this.section.ipaddr || !!this.section.ip6addr
    },
    /**
     * @param {string} value
     * @return {{isValid: boolean, message?: string}}
     */
    validateDuplicateProto(value) {
      if (!['dhcp', 'dhcpv6'].includes(value) || this.bridged) return { isValid: true }
      const otherValues = this.formData.interfaces.filter(iface => {
        const ifname = Array.isArray(iface.ifname) ? iface.ifname[0] : iface.ifname
        return iface.id !== this.section.id && ifname === this.section.ifname
      })
      if (otherValues.every(iface => iface.proto !== value)) return { isValid: true }
      const displayValue = this.protocols.getOption(value)?.name
      return {
        isValid: false,
        message: this.$t('Only one %s interface can exist on "%s" physical interface').format(displayValue, this.section.ifname)
      }
    }
  }
}
</script>
