<template>
  <basic-status
    v-if="mainConflicts?.length && ifaceStatus"
    :status="{ type: 'warning', status: null }"
  >
    <template #help>
      <div class="flex flex-col gap-2">
        <h3 class="font-bold">
          {{ $t('Network conflict detected') }}
        </h3>
        {{
          $t('This interface shares the same IPv4 subnet with one or more other interfaces: %s. This may cause loss of Internet connectivity via the WAN interface.').format(
            mainConflicts.map(e => `"${e.name}"`).join(', ')
          )
        }}

        <tlt-button
          v-if="ifaceStatus.area_type === 'lan'"
          type="text"
          @click="openPrompt"
        >
          {{ $t('Resolve network conflict') }}
        </tlt-button>
        <tlt-button
          v-else
          type="text"
          @click="openPrompt"
        >
          <link-to-page
            path="/network/lan"
            :custom-name="$t('Resolve conflict in %s page').format('LAN')"
          />
        </tlt-button>
      </div>
    </template>
  </basic-status>
</template>

<script lang="ts" setup>
import type { Interface, InterfaceStatus } from '@/types/networkTypes'
import { computed } from 'vue'
import { useMessages, usePrompt } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { reconnect } from '@ui-core/plugins/helper'
import BasicStatus from './BasicStatus.vue'
import { ipv4Utils } from '@/utils/ipUtils'
import { axios } from '@ui-core/plugins/axios'
import LinkToPage from './LinkToPage.vue'

const prompt = usePrompt()
const $t = useTranslate()
const messages = useMessages()

export interface Props {
  interface: string
  statuses: InterfaceStatus[]
  configs: Interface[]
}

const props = defineProps<Props>()

const ifaceStatus = computed(() => props.statuses.find(e => e.id === props.interface))
const ifaceConfig = computed(() => props.configs.find(e => e.id === props.interface))

const mainConflicts = computed(() => {
  const otherStatuses = props.statuses.filter(e => e.id !== props.interface)
  const ipAddr = ifaceStatus.value?.ipaddrs?.[0]
  if (!ipAddr) return []
  return otherStatuses.filter(otherIface => otherIface.ipaddrs?.[0] && ipv4Utils.areSubnetsOverlapping(otherIface.ipaddrs?.[0], ipAddr) && otherIface.area_type !== ifaceStatus.value?.area_type)
})

function findIp() {
  const configSubnets = props.configs.map(e => (e.ipaddr && e.netmask ? `${e.ipaddr}/${ipv4Utils.netmaskToNumber(e.netmask)}` : undefined))
  const statusSubnets = props.statuses.flatMap(e => e.ipaddrs)
  const allSubnets = [...configSubnets, ...statusSubnets].filter((e): e is string => !!e)
  for (let index = 1; index < 255; index++) {
    const ip = `192.168.${index}.1`
    if (!allSubnets.some(subnet => ipv4Utils.areSubnetsOverlapping(`${ip}/24`, subnet))) {
      return ip
    }
  }
}

async function resolveConflict(ip: string, doReconnect: boolean) {
  await axios.put(`/api/interfaces/config/${props.interface}`, { data: { ipaddr: ip, netmask: '255.255.255.0' } })
  if (!doReconnect) return
  await reconnect($t('Reconnecting...'), { address: ip, params: { ipChanged: 1 }, logout: false })
}

function openPrompt() {
  const ip = findIp()
  if (!ip) return messages.error($t('Fail to resolve conflict. Do it manually.'))
  // Try reconnect only if user is connected via IP that is going to be changed
  const doReconnect = ifaceConfig.value?.ipaddr === document.location.hostname
  const text = $t('The conflict will be resolved by changing this interface’s IP address to %s.').format(ip)
  const reconnectText = $t('You will be reconnected after this change.')
  prompt.show({
    title: $t('Resolve network conflict?'),
    content: `${text}${doReconnect ? ` ${reconnectText}` : ''}`,
    okText: $t('Resolve'),
    cancelText: $t('Cancel'),
    icon: 'info',
    onOk: () => resolveConflict(ip, doReconnect)
  })
}
</script>
