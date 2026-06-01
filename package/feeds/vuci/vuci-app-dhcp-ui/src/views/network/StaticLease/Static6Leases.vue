<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dhcp"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="host"
      :title="$t('Static lease')"
      :help="$t('A list of IP addresses that are assigned to specified devices by their DUID.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/static_leases/ipv6/config' }]"
      data-key="staticLeases"
      :columns="cols"
      :table-actions="['column-list', 'search']"
    >
      <template #duid="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="duid"
          placeholder="000456789asdf123456789"
          :rules="['hexstring', (v: string) => $utils.validateNoDuplicates(formData.staticLeases, 'duid', v, 'DUID', true)]"
          minlength="6"
          maxlength="130"
          required
          :options="$network.getMacOptions(duidOptions, ['', $t('-- Please choose --')])"
          allow-create
          @change="setHostId(s)"
        />
      </template>
      <template #hostid="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="hostid"
          minlength="1"
          maxlength="16"
          placeholder="1234FFFF"
          :rules="['hexstring', (v: string) => $utils.validateNoDuplicates(formData.staticLeases, 'hostid', v, 'Host ID', true)]"
          required
        >
          <template
            v-if="getHostId(s)"
            #after
          >
            <tlt-button
              :id="`btnRefresh-${s.id}`"
              type="icon"
              color="tertiary"
              icon="refresh"
              size="md"
              :disabled="getHostId(s) === s.hostid"
              class="p-0!"
              @click="setHostId(s, true)"
            />
            <tlt-popover
              :target="`#btnRefresh-${s.id}`"
              placement="right"
              :fallback-placements="['bottom-start', 'bottom-end', 'top-start', 'top-end']"
              :content="$t('Set host id to currently leased one')"
              triggers="hover"
            />
          </template>
        </vuci-form-item-input>
      </template>
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          placeholder="example"
          rules="hostname"
          maxlength="512"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { useMessages } from '@/stores/messages'
import type { LeaseIpv6Config, LeaseIpv6Status } from '@/types/leaseTypes'
import { ipv6Utils } from '@/utils/ipUtils'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'

const $t = useTranslate()
const message = useMessages()

interface FormModel {
  staticLeases: LeaseIpv6Config[]
}

const formData = ref<FormModel>({ staticLeases: [] })
const leaseStatus = ref<LeaseIpv6Status[]>([])
const duidOptions = ref<[string, string][]>([])
const cols = [
  { name: 'duid', label: $t('DUID'), help: $t('DHCP unique identifier is used by DHCPv6 to identify device. Similar to MAC that is used by DHCPv4.') },
  {
    name: 'hostid',
    label: $t('Host ID'),
    help: $t('Used to define IPv6 address that will be statically leased. To get it from the IPv6 address remove the IPv6 prefix and all semicolons.')
  },
  { name: 'name', label: $t('Hostname') }
]
function afterLoad() {
  return axios.bulkGet(['/api/dhcp/leases/ipv6/status', '/api/routes/status/duid_hints']).then(([leaseStatusRes, duidOptionsRes]) => {
    if (leaseStatusRes.success) leaseStatus.value = leaseStatusRes.data
    else message.error($t('Failed to load lease status'))
    if (duidOptionsRes.success) duidOptions.value = duidOptionsRes.data
    else message.error($t('Failed to load duid options'))
  })
}

function getHostId(section: LeaseIpv6Config) {
  const status = leaseStatus.value.find(lease => lease.duid?.toLowerCase() === section.duid?.toLowerCase())
  if (!status) return null
  return ipv6Utils.getHostId(status.ipv6addr[0])
}
function setHostId(section: LeaseIpv6Config, force?: boolean) {
  if (section.hostid && !force) return // do not change mac if it already exists
  const hostIdFromLease = getHostId(section)
  if (hostIdFromLease) section.hostid = hostIdFromLease
}
</script>
