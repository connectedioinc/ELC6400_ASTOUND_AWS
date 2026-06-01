<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mwan3"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      type="rule"
      :title="$t('Rule')"
      :columns="ruleColumns"
      :edit-form="markRaw(EditForm)"
      :endpoints="[{ endpoint: 'failover/rules/config' }]"
      data-key="mwanRules"
      sort-by="priority"
      :exception-options="['priority']"
      sortable
      :table-actions="['column-list', 'search']"
    >
      <template #before>
        <drag-hint :element-name="$t('rules')" />
      </template>
      <template #use_policy="{ s }">{{ parseAssignedPolicy(s) }} </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import EditForm from './MultiWanRuleEdit.vue'
import { mwan } from '@/plugins/mwan'
import type { MwanPolicy, MwanRule } from '@/types/mwanTypes'
import DragHint from '@/components/shared/DragHint.vue'

const $t = useTranslate()
const message = useMessages()

const formData = ref<{ mwanPolicies: MwanPolicy[] }>({
  mwanPolicies: []
})

const ruleColumns = [
  { name: 'priority', label: $t('Priority'), help: $t('Priority of the rule.') },
  { name: 'name', label: $t('Name'), help: $t('Name of the rule.') },
  { name: 'src_ip', label: $t('Source adddress'), help: $t('Matches traffic from the specified source IP address.'), displayFn: (v: string[]) => (v ? v.join(', ') : '-') },
  { name: 'src_port', label: $t('Source port'), help: $t('Matches traffic from the specified source port or port range.'), displayFn: (v: string) => v || '-' },
  { name: 'dest_ip', label: $t('Destination adddress'), help: $t('Matches traffic directed to the specified destination IP address.'), displayFn: (v: string[]) => (v ? v.join(', ') : '-') },
  {
    name: 'dest_port',
    label: $t('Destination port'),
    help: $t('Matches traffic directed at the given destination port or port range.'),
    displayFn: (v: string) => v || '-'
  },
  { name: 'proto', label: $t('Protocol'), help: $t('Matches traffic using the given protocol.'), displayFn: (v: string) => v || '-' },
  {
    name: 'use_policy',
    label: $t('Assigned policy'),
    help: $t('Specifies the policy applied to matching traffic.')
  }
]

function parseAssignedPolicy(s: MwanRule) {
  const policy = formData.value.mwanPolicies?.find(p => p.id === s.use_policy)
  return policy ? policy.name : mwan.staticPolicyOpts().find(([key]) => s.use_policy === key)?.[1] || '-'
}

function afterLoad() {
  return axios
    .get('/api/failover/policies/config')
    .then(({ data }: { data: MwanPolicy[] }) => {
      return { mwanPolicies: data }
    })
    .catch(() => {
      message.error($t('Failed to load policies'))
    })
}
</script>
