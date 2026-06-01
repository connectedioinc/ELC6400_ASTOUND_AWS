<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mwan3"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      type="member"
      :title="$t('Member')"
      :endpoints="[{ endpoint: 'failover/members/config' }]"
      :columns="memberColumns"
      data-key="mwanMembers"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          :placeholder="s.interface"
          :rules="['uciname', () => $utils.validateNoDuplicates(uciData.mwanMembers, 'name', s.name, $t('name'))]"
          required
          @change="$utils.validate"
        />
      </template>
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface"
          :options="ifaceOptions"
          :rules="validateUsedInterface"
          @change="$utils.validate"
        />
      </template>
      <template #metric="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="metric"
          rules="integer"
          required
        />
      </template>
      <template #weight="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="weight"
          placeholder="1"
          :placeholder-prefix="false"
          rules="irange(1,99)"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import type { MwanInterface, MwanMember, MwanPolicy } from '@/types/mwanTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import { network } from '@/plugins/network'

const $t = useTranslate()
const message = useMessages()

const memberColumns = [
  { name: 'name', label: $t('Name'), help: $t('Name of the member.'), width: 'md', actions: { sort: true } },
  { name: 'interface', label: $t('Interface'), width: 'md', help: $t('Name of the interface.'), actions: { sort: true } },
  {
    name: 'metric',
    label: $t('Metric'),
    help: $t('Members within one policy with a lower metric have precedence over higher metric members. Members with the same metric within a policy will perform load balancing.'),
    width: 'xs'
  },
  {
    name: 'weight',
    label: $t('Weight'),
    help: $t('The weight values represent a percentage of load that will go through an interface. The default value is 1, if unspecified.'),
    width: 'xs'
  }
]

const formData = ref<{ mwanMembers: MwanMember[] }>({
  mwanMembers: []
})

const ifaces = ref<MwanInterface[]>([])
const networkIfaceStatus = ref<InterfaceStatus[]>([])
const policies = ref<MwanPolicy[]>([])
function afterLoad() {
  return axios
    .bulkGet(['/failover/interfaces/config', '/failover/policies/config', '/interfaces/basic/status?include=vpn'])
    .then(([ifacesConfig, policiesConfig, ifaceStatus]) => {
      if (ifacesConfig.success) ifaces.value = ifacesConfig.data
      else message.error($t('Failed to load interfaces'))
      if (policiesConfig.success) policies.value = policiesConfig.data
      else message.error($t('Failed to load policies'))
      if (ifaceStatus.success) networkIfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load interface status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function validateUsedInterface(value: string, { uciSection }: { uciSection: MwanMember }) {
  const policyMap: Record<string, Record<string, string>> = {}
  let policyInstance: Partial<MwanPolicy> = {}
  for (const policy of policies.value) {
    policyMap[policy.id] = {}
    for (const member of policy.use_member ?? []) {
      if (member === uciSection.id) policyInstance = policy
      const member_iface = formData.value.mwanMembers.find(m => m.id === member)?.interface
      if (!member_iface) continue
      policyMap[policy.id][member] = member_iface ?? member
    }
  }
  const usedInPolicy = Object.values(policyMap[policyInstance.id ?? ''] ?? {}).filter(iface => iface === value).length > 1 ? policyInstance : null
  return {
    isValid: !usedInPolicy,
    message: usedInPolicy ? $t('This interface is already used in the "%s" policy').format(usedInPolicy.name) : ''
  }
}

const rawIfaceOptions = computed(() => {
  const options = network.parseInterfaceAndVpnOptions(networkIfaceStatus.value)
  return options.filter(([id]) => ifaces.value.some(mwanIface => id === mwanIface.name))
})

const ifaceOptions = computed(() => [['', $t('-- Select an interface --')], ...rawIfaceOptions.value])
</script>
