<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="relayd"
      :title="$t('Relay configuration')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'relayd/config' }]"
      data-key="relayd"
      :columns="cols"
      :table-actions="['column-list', 'search']"
    >
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="lan_mark"
          :options="ifaceOptions"
          :rules="checkDhcpEnabled"
        />
      </template>
      <template #network="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="network"
          :options="wirelessOptions"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="
            self => {
              utils.validate(self)
              checkSubnetOverlap()
            }
          "
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.lan_mark"
          :label="$t('Interface')"
          prop="lan_mark"
          :options="ifaceOptions"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import type { Interface } from '@/types/networkTypes'
import type { WifiInterface } from '@/types/wirelessTypes'
import type { DhcpV4Config, DhcpV6Config } from '@/types/dhcpTypes'
import type { RelaydConfig } from '@/types/relaydTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useNotifications } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { network } from '@/plugins/network'
import { wireless } from '@/plugins/wireless'
import { ipv4Utils } from '@/utils/ipUtils'
import { utils } from '@/plugins/utils'
import { ref, computed } from 'vue'

const $t = useTranslate()
const message = useMessages()
const notification = useNotifications()

const wirelessNetworks = ref<WifiInterface[]>([])
const ifaces = ref<Interface[]>([])
const cols = [
  { name: 'interface', label: $t('Interface') },
  { name: 'network', label: $t('Wireless interface') },
  { name: 'enabled', label: $t('Enabled') }
]

const ifaceOptions = computed(() => ifaces.value.filter(s => s.proto !== 'wwan' && s.proto !== 'connm' && s.proto !== 'none').map(network.getName))
const wirelessOptions = computed(() => {
  const wifiNets = wirelessNetworks.value.filter(wifi => wifi.mode === 'sta' && wifi.network).map<[string, string]>(wifi => [wifi.network, `${wifi.network} (${wireless.getName(wifi)})`])
  if (wifiNets.length === 0) {
    wifiNets.push(['', $t('-- No WiFi clients configured --')])
  } else {
    wifiNets.unshift(['', $t('-- Please select --')])
  }
  return wifiNets
})

const formData = ref<{ relayd: RelaydConfig[] }>({ relayd: [] })
const dhcpv4 = ref<DhcpV4Config[]>([])
const dhcpv6 = ref<DhcpV6Config[]>([])
function afterLoad() {
  const requests = [
    '/api/interfaces/config',
    {
      endpoint: '/api/wireless/interfaces/config',
      condition: 'vuci-app-wireless-api.control'
    },
    '/api/dhcp/servers/ipv4/config',
    '/api/dhcp/servers/ipv6/config'
  ]
  return axios.bulkGet(requests).then(([interfaces, wifiNetworks, dhcpv4Data, dhcpv6Data]) => {
    if (interfaces.success) ifaces.value = interfaces.data
    else message.error($t('Failed to load interfaces data'))
    if (wifiNetworks.success) wirelessNetworks.value = wifiNetworks.data
    else message.error($t('Failed to load wireless data'))
    if (dhcpv4Data.success) dhcpv4.value = dhcpv4Data.data
    else message.error($t('Failed to load DHCPv4 data'))
    if (dhcpv6Data.success) dhcpv6.value = dhcpv6Data.data
    else message.error($t('Failed to load DHCPv6 data'))
    ifaceStatusTimer.start()
  })
}

const ifaceStatus = ref<InterfaceStatus[]>([])
const ifaceStatusTimer = useTimer({ method: loadIfacesStatus, autostart: false, immediate: true, time: 3000 })
function loadIfacesStatus() {
  return axios
    .get('/api/interfaces/basic/status')
    .then(({ data }) => {
      ifaceStatus.value = data
      checkSubnetOverlap()
    })
    .catch(() => {
      message.error($t('Failed to load interfaces status'))
    })
}

function checkSubnetOverlap() {
  formData.value.relayd.forEach(relay => {
    const lanMarkStatus = ifaceStatus.value.find(s => s.name === relay.lan_mark)
    const wifiNetworkStatus = ifaceStatus.value.find(s => s.name === relay.network)
    const lanMarkDhcpSubnet = lanMarkStatus?.ipaddrs?.[0]
    const wifiNetworkDhcpSubnet = wifiNetworkStatus?.ipaddrs?.[0]
    if (relay.enabled === '1' && lanMarkDhcpSubnet && wifiNetworkDhcpSubnet && ipv4Utils.areSubnetsOverlapping(lanMarkDhcpSubnet, wifiNetworkDhcpSubnet)) {
      notification.warning({
        id: `relayd${relay.id}`,
        title: $t('Relayd DHCP subnet overlap'),
        text: $t("The DHCP subnets of '%s' and '%s' interfaces are overlapping. Please adjust one of the interface's subnets.").format(
          `${relay.lan_mark} (${lanMarkDhcpSubnet})`,
          `${relay.network} (${wifiNetworkDhcpSubnet})`
        )
      })
    }
  })
}

function checkDhcpEnabled(value: string, { uciSection }: { uciSection: RelaydConfig }) {
  const dhcpv4Data = dhcpv4.value.find(d => d.interface === value)
  const dhcpv6Data = dhcpv6.value.find(d => d.interface === value)
  if (uciSection.enabled === '1' && (dhcpv4Data?.enable_dhcpv4 === '1' || dhcpv6Data?.enable_dhcpv6 === '1'))
    return {
      isValid: false,
      message: $t('DHCPv4 or DHCPv6 server is enabled on the interface. Please disable the DHCP server before enabling the configuration')
    }
  return { isValid: true }
}
</script>
