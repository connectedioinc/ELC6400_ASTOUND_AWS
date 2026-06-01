<template>
  <vuci-form
    ref="form"
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :before-save="onBeforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$t('Interfaces: %s').format(section.id)"
      :help="$t('The network interface can be configured on this page. Protocol and VLAN configuration is feasible for the selected interface.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'site_manager/switch/interfaces/config' }]"
      data-key="switchInterfaces"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Toggle interface on or off')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Protocol')"
        name="proto"
        initial="none"
        :options="protocols"
        :rules="[validateDuplicateProto]"
        force-write
        rawhtml
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Operation protocol of a network interface')"
            :hints="hints"
            :footer="$t('Possible modes')"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('VLAN')"
        :help="t('Logical overlay network that will be used to isolate the traffic for each group of devices that share a physical LAN.')"
        name="vlan_id"
        :options="vlanOptions"
      />
      <ip-fields
        :s="s"
        :extra-condition="proto.static"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('IPv4 gateway')"
        :help="$t('The address where the device will send all the outgoing traffic.')"
        name="gateway"
        placeholder="0.0.0.0"
        rules="ip4addr"
        :depend="proto.static"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ip6addr"
        :label="$t('IPv6 address')"
        :help="$t('Assigns an IPv6 address for this interface. CIDR notation: address/prefix.')"
        placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
        :required="!s.ipaddr"
        rules="ipmask6"
        :depend="proto.static"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ip6gw"
        :label="$t('IPv6 gateway')"
        :help="$t('IPv6 default gateway.')"
        placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
        rules="ip6addr"
        :depend="proto.static"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('DNS servers')"
        :help="$t('Servers that will be used for matching website hostnames (e.g. example.com) to their corresponding Internet Protocol or IP addresses. Both IPv4 and IPv6 addresses may be used.')"
        name="dns"
        rules="ipaddr"
        :depend="proto.static"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup>
import { ref, computed } from 'vue'
import IpFields from '@/components/network/IpFields.vue'
import HintHelper from '@/components/shared/HintHelper.vue'
import { useTranslate } from '@ui-core/composables/useI18n'

const t = useTranslate()

const props = defineProps({
  section: {
    type: Object,
    required: true
  }
})

const formData = ref({})

const protocols = [
  ['static', t('Static')],
  ['dhcp', 'DHCP'],
  ['dhcpv6', 'DHCPv6']
]

const proto = computed(() => ({
  static: props.section.proto === 'static',
  dhcp: props.section.proto === 'dhcp',
  dhcpv6: props.section.proto === 'dhcpv6'
}))

const vlanOptions = computed(() => formData.value.bridge_vlan.map(s => [s.vlan, s.name || s.id]))

const hints = [
  {
    reverse: true,
    name: t('Manually configured device with a constant IP address that never changes'),
    example: t('Static')
  },
  {
    reverse: true,
    name: t('Protocol that automatically provides temporary IP address to the device that could change on a regular basis'),
    example: 'DHCP'
  },
  {
    reverse: true,
    name: t('The primary distinction between DHCPv6 and DHCP is that DHCP uses MAC addresses to identify clients, whereas DHCPv6 uses Unique Identifiers.'),
    example: 'DHCPv6'
  }
]

const onBeforeSave = () => {
  if (props.section.proto === 'static' && !(props.section.ipaddr || props.section.ip6addr)) {
    return Promise.reject(t('One of the IPv4 or IPv6 addresses must be defined.'))
  }
  if (props.section.proto === 'static' && formData.value.interfaces.some(iface => iface.id !== props.section.id && iface.ipaddr === props.section.ipaddr && iface.vlan_id === props.section.vlan_id)) {
    return Promise.reject(t('Same VLAN cannot be used on static interface with identical IP address.'))
  }
}

const validateDuplicateProto = value => {
  if (!['dhcp', 'dhcpv6'].includes(value)) return { isValid: true }
  const otherValues = formData.value.interfaces.filter(iface => iface.id !== props.section.id)
  if (otherValues.every(iface => iface.proto !== value)) return { isValid: true }
  const displayValue = protocols.find(([option]) => option === value)[1]
  return {
    isValid: false,
    message: t('Only one %s interface can exist').format(displayValue)
  }
}
</script>
