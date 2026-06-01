<template>
  <div
    ref="content"
    class="flex gap-2 flex-nowrap items-center min-w-0 max-w-full"
  >
    <tlt-overflow-hint v-if="ipHint?.length === 0">
      {{ ipDisplay }}
      <span v-if="showIpType && ipDisplay !== '-'">({{ ipUtilsFactory(ipDisplay).getIpType(ipDisplay, false, true) }})</span>
    </tlt-overflow-hint>
    <div
      v-else
      class="truncate"
    >
      {{ ipDisplay }}
      <span v-if="showIpType && ipDisplay !== '-'">({{ ipUtilsFactory(ipDisplay).getIpType(ipDisplay, false, true) }})</span>
    </div>
    <tlt-icon
      v-if="ipHint?.length > 0"
      icon="info"
      class="text-theme-text-info shrink-0 size-5"
    />
    <tlt-popover
      v-if="ipHint?.length > 0"
      :target="() => $refs.content"
      placement="bottom-start"
    >
      <div class="grid grid-flow-row grid-cols-[1fr_auto] gap-2">
        <template
          v-for="hint in ipHint"
          :key="hint.title"
        >
          <strong class="whitespace-nowrap col-auto">{{ hint.title }}</strong>
          <div class="flex flex-col col-span-1">
            <div
              v-for="info in hint.info"
              :key="info"
              class="break-all"
            >
              {{ info }}
              <span
                v-if="showIpType && info !== '-'"
                class="break-normal whitespace-nowrap"
              >
                ({{ ipUtilsFactory(info).getIpType(info, false, true) }})
              </span>
            </div>
          </div>
        </template>
      </div>
    </tlt-popover>
  </div>
</template>

<script lang="ts" setup>
import { utils } from '@/plugins/utils'
import type { InterfaceStatus, GenericInterface, InterfaceAddrStatus } from '@/types/networkTypes'
import { ipUtils, ipUtilsFactory, ipv4Utils } from '@/utils/ipUtils'
import { computed } from 'vue'

export interface Props {
  status: Partial<InterfaceStatus>
  config: Partial<GenericInterface>
  display?: 'ipv4' | 'ipv6' | 'ipv6-pd' | Array<'ipv4' | 'ipv6' | 'ipv6-pd'>
  showIpType?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  display: () => ['ipv4', 'ipv6', 'ipv6-pd'],
  showIpType: false
})

const ip6Delegation = computed<string[]>(() =>
  ([] as Array<InterfaceAddrStatus | undefined>).concat(props.status['ipv6-prefix'], props.status['ipv6-prefix-assignment']).map(ipUtils.composeCIDR).filter(utils.notEmpty)
)

const ipDisplay = computed<string>(() => {
  if (show('ipv4') && props.status.ipaddrs && props.status.ipaddrs.length !== 0) return props.status.ipaddrs[0]
  else if (show('ipv6') && props.status.ip6addrs && props.status.ip6addrs.length !== 0) return props.status.ip6addrs[0]
  else if (show('ipv4') && props.status?.data?.bridge_ipaddr && ['bridge', 'passthrough'].includes(props.status?.data.method)) return props.status.data.bridge_ipaddr
  else if (show('ipv4') && props.config.proto === 'static' && props.config.ipaddr && props.config.netmask) return `${props.config.ipaddr}/${ipv4Utils.netmaskToNumber(props.config.netmask)}`
  else if (props.display === 'ipv6-pd' && ip6Delegation.value.length !== 0) return ip6Delegation.value[0]
  else return '-'
})

const ipHint = computed<{ title: string; info: string[] }[]>(() => {
  const hintData: { title: string; info: string[] }[] = []
  if (show('ipv4') && props.status?.ipaddrs && props.status.ipaddrs.length > 0) {
    hintData.push({ title: 'IPv4', info: props.status.ipaddrs })
  }

  if (show('ipv6') && props.status?.ip6addrs && props.status.ip6addrs.length > 0) {
    hintData.push({ title: 'IPv6', info: props.status.ip6addrs })
  }

  if (show('ipv6-pd') && ip6Delegation.value.length > 0) {
    hintData.push({ title: 'IPv6-PD', info: ip6Delegation.value })
  }

  if (hintData.flatMap(hint => hint.info).length < 2) return []
  return hintData
})

function show(infoType: 'ipv4' | 'ipv6' | 'ipv6-pd'): boolean {
  const normalized = Array.isArray(props.display) ? props.display : [props.display]
  return normalized.includes(infoType)
}
</script>
