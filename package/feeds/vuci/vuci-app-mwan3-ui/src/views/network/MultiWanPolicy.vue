<template>
  <vuci-form
    v-slot="{ uciData }"
    config="mwan3"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      type="policy"
      :title="$t('Policy')"
      :columns="policyColumns"
      :endpoints="[{ endpoint: `failover/policies/config` }]"
      data-key="mwanPolicy"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          :rules="['uciname', () => $utils.validateNoDuplicates(uciData.mwanPolicy, 'name', s.name, $t('name'))]"
          required
          @change="$utils.validate"
        />
      </template>
      <template #use_member="{ s }">
        <vuci-form-item-select
          name="use_member"
          :uci-section="s"
          :options="memberOptions"
          :disabled-options="dublicateMembers(s.use_member)"
          required
          multiple
        />
      </template>
      <template #last_resort="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="last_resort"
          :options="policyResortOptions"
        />
      </template>
      <template #last_resort-help>
        <hint-helper
          :main-hint="$t('Determine the fallback routing behaviour if all WAN members in the policy are down.')"
          :hints="[
            {
              option: $t('Unreachable'),
              hint: $t('Rejects all traffic.')
            },
            {
              option: $t('Blackhole'),
              hint: $t('Drops all traffic.')
            },
            {
              option: $t('Default'),
              hint: $t('Uses main routing table.')
            }
          ]"
        />
      </template>
      <template #delete="{ s, actions }">
        <vuci-form-item-button
          :uci-section="s"
          name="delete"
          type="text"
          color="error"
          :readonly="isReadOnly(s)"
          @click="actions.delete(s.id)"
        >
          {{ $t('Delete') }}
        </vuci-form-item-button>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import type { MwanMember, MwanPolicy } from '@/types/mwanTypes'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const message = useMessages()

const policyColumns = [
  { width: 'base', name: 'name', label: $t('Name'), help: $t('Name of the policy.') },
  { width: 'base', name: 'use_member', label: $t('Member used'), help: $t('Members assigned to the policy.'), displayFn: (v: string[]) => v?.join(', ') || '-' },
  {
    width: 'sm',
    name: 'last_resort',
    label: $t('Last Resort')
  }
]

const policyResortOptions = [
  ['unreachable', $t('Unreachable')],
  ['blackhole', $t('Blackhole')],
  ['default', $t('Default')]
]

const members = ref<MwanMember[]>([])
function afterLoad() {
  return axios
    .get('/api/failover/members/config')
    .then(({ data }) => {
      members.value = data
    })
    .catch(() => {
      message.error($t('Failed to load failover members'))
    })
}

const memberOptions = computed(() => members.value.map(m => [m.id, m.name]))

function isReadOnly(self: MwanPolicy) {
  return self.id.split('_')[1] === 'default'
}

function dublicateMembers(selectedMembers?: string[]) {
  const usedInterfaces = members.value.filter(member => selectedMembers?.includes(member.id) && member.interface).map(member => member.interface)
  return members.value.filter(member => !selectedMembers?.includes(member.id) && usedInterfaces.includes(member.interface)).map(member => member.id)
}
</script>
