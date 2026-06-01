<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dhcp"
    async-load
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="dhcp"
      :title="$t('DHCPv6 servers')"
      :help="$t('A list of DHCP servers that manage IP address leasing.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/servers/ipv6/config' }]"
      data-key="dhcpv6"
      :columns="cols"
      :edit-form="markRaw(EditForm)"
      :form-methods="$store.isRouter ? ['get', 'edit'] : undefined"
    >
      <template #enable_dhcpv6="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enable_dhcpv6"
          @change="$network.validateDhcpV6Enable(s)"
        />
      </template>
      <template #prefix="{ s }">
        <array-popover
          :content="getPD(s)"
          :popover-options="{ placement: 'bottom-start' }"
        />
      </template>
      <template #status="{ s }">
        <dhcp-server-status :status-code="getDhcpStatus(s, dhcpStatus)" />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { DhcpV6Config, DhcpStatus } from '@/types/dhcpTypes'
import type { InterfaceStatus } from '@/types/networkTypes'

import { markRaw, ref } from 'vue'
import EditForm from './Dhcp6ServerEdit.vue'
import ArrayPopover from '@/components/shared/ArrayPopover.vue'
import { getDhcpStatus } from '../DhcpServerFunctions'
import DhcpServerStatus from '../DhcpServerStatus.vue'
import type { FormModel } from './Dhcp6ServerCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'

const $t = useTranslate()
const message = useMessages()

const formData = ref<FormModel>({ dhcpv6: [] })

const dhcpStatus = ref<DhcpStatus[]>([])
const interfaceStatus = ref<InterfaceStatus[]>([])

const cols = [
  { name: 'interface', label: $t('Interface'), help: $t('Network interface to which this server is associated.') },
  { name: 'prefix', label: $t('Delegated prefix'), help: $t('Prefix used for leasing addresses if DHCPv6 is running as server.') },
  { name: 'status', label: $t('Status'), displayFn: (_: unknown, row: DhcpV6Config) => getDhcpStatus(row, dhcpStatus.value) },
  { name: 'enable_dhcpv6', label: $t('Enabled') }
]

const timer = useTimer({ method: updateStatus, time: 5000, autostart: false, immediate: false })

function afterLoad() {
  return axios
    .bulkGet(['/api/interfaces/basic/status', '/api/dhcp/servers/ipv6/status'])
    .then(([ifStatus, dhcpStatusResponse]) => {
      if (dhcpStatusResponse.success) dhcpStatus.value = dhcpStatusResponse.data
      else message.error($t('Failed to load DHCP status'))
      if (ifStatus.success) interfaceStatus.value = ifStatus.data
      else message.error($t('Failed to load interface status'))
      timer.start()
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}
function updateStatus() {
  return axios
    .get('/api/dhcp/servers/ipv6/status')
    .then(({ data }) => {
      dhcpStatus.value = data
    })
    .catch(() => {
      message.error($t('Failed to load DHCP status'))
    })
}

function getPD(section: DhcpV6Config) {
  const iface = interfaceStatus.value.find(iface => iface.id === section.id)
  if (!iface || !iface['ipv6-prefix'] || !iface['ipv6-prefix-assignment']) return []
  return iface['ipv6-prefix'].concat(iface['ipv6-prefix-assignment']).map(prefix => `${prefix.address}/${prefix.mask}`)
}
</script>
