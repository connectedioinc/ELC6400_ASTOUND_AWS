<template>
  <tlt-table
    id="chains"
    :columns="tableTableColumns(true)"
    :data-source="flatData.chains"
    :no-value-text="$t('No chains found')"
    :title="$t(`Chains`)"
    :table-actions="['reset-counters', 'search', 'column-list']"
    pagination
    :row-actions="[
      {
        id: 'edit',
        label: $t('View'),
        buttonProps: { iconLeft: 'password', disabled: false },
        callback: record => chainModalRef?.openModal(record)
      }
    ]"
  >
    <template #before> <firewall-page-hints /> </template>
    <template #reset-counters>
      <table-action
        id="resetBtn"
        ref="resetBtn"
        :label="$t('Reset counters')"
        icon-left="reset"
        @click="resetCounters"
      />
      <tlt-tooltip
        :target="() => resetBtnRef?.button?.$el"
        placement="top"
        triggers="hover"
      >
        {{ $t('Resets all traffic and packet fields') }}
      </tlt-tooltip>
    </template>
    <template #pkts="{ record }">
      <template v-if="record.pkts">
        {{ $utils.removeOverPrecision('%m'.format(parseInt(record.pkts))) }}
      </template>
      <template v-else>-</template>
    </template>
    <template #bytes="{ record }">
      <template v-if="record.pkts">
        {{ $utils.removeOverPrecision('%mB'.format(parseInt(record.bytes))) }}
      </template>
      <template v-else>-</template>
    </template>
  </tlt-table>
  <tlt-table
    id="rules"
    :columns="chainTableColumns(true)"
    :data-source="flatData.rules"
    :no-value-text="$t('No rules found')"
    :title="$t('Rules')"
    :table-actions="['search', 'column-list']"
    pagination
  >
    <template #chain="{ record }">
      <tlt-button
        button-id="chain"
        :disabled="false"
        type="text"
        size="md"
        class="wrap-normal!"
        @click="chainModalRef?.openModal(record, true)"
      >
        {{ record.chain }}
      </tlt-button>
    </template>
    <template #target="{ record }">
      <tlt-button
        v-if="status.find(table => table.table === record.table)?.chains.find(e => e.chain === record.target)"
        button-id="target"
        :disabled="false"
        type="text"
        size="md"
        class="wrap-normal!"
        @click="chainModalRef?.openModal(record)"
      >
        {{ record.target }}
      </tlt-button>
      <template v-else>
        {{ record.target }}
      </template>
    </template>
    <template #pkts="{ record }">
      <template v-if="record.pkts">
        {{ $utils.removeOverPrecision('%m'.format(parseInt(record.pkts))) }}
      </template>
      <template v-else>-</template>
    </template>
    <template #bytes="{ record }">
      <template v-if="record.pkts">
        {{ $utils.removeOverPrecision('%mB'.format(parseInt(record.bytes))) }}
      </template>
      <template v-else>-</template>
    </template>
    <template #comment="{ record }">
      <string-with-links :text="record.linkToConfig" />
    </template>
  </tlt-table>
  <chain-modal ref="chainModal" />
</template>

<script lang="ts" setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import ChainModal from './ChainModal.vue'
import { computed, provide, ref, useTemplateRef } from 'vue'
import { chainTableColumns, FormOptionKey, tableTableColumns, type ParsedIptablesChain, type ParsedIptablesRule, type ParsedReference } from './IptablesCommon'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { useMainStore } from '@/stores/main'
import type { IptablesChain, IptablesTable, Table } from '@/types/iptablesTypes'
import type { Nat, PortForward, Rule } from '@/types/firewallTypes'
import StringWithLinks from '@/components/shared/StringWithLinks.vue'
import type { JoolConfig } from '@/types/joolTypes'
import { useRoute } from 'vue-router'
import { useIptableStatusCommon } from '@/components/network/firewall/IptableStatusCommon'
import firewallPageHints from '@/components/network/firewall/firewallPageHints.vue'
import { session } from '@ui-core/plugins/session'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

export interface Props {
  ipv: 'ipv4' | 'ipv6'
}
const props = defineProps<Props>()

const resetBtnRef = useTemplateRef('resetBtn')
const chainModalRef = useTemplateRef('chainModal')

const parsedTables = computed(() => {
  return status.value.map(table => ({
    ...table,
    chains: parseChains(table)
  }))
})

provide(FormOptionKey, {
  firewallStatus: parsedTables
})

function parseChains(table: IptablesTable): ParsedIptablesChain[] {
  return table.chains.map<ParsedIptablesChain>(chain => {
    const referencesData = getReferences(table, chain)
    return {
      table: table.table,
      ...chain,
      policy: chain.policy ?? '-',
      ruleCount: chain.rules.length,
      ...referencesData,
      rules: parseRules(chain, table.table)
    }
  })
}
function getReferences(table: IptablesTable, chain: IptablesChain): { references: ParsedReference[]; referenceCount: number } {
  const references = table.chains
    .map(otherChain => {
      const referenceRules = otherChain.rules.filter(e => e.target === chain.chain)
      return {
        chain: otherChain.chain,
        count: referenceRules.length
      }
    })
    .filter(reference => reference.count)
  return {
    references,
    referenceCount: references.reduce((acc, reference) => acc + reference.count, 0)
  }
}

const { getLinkFromStatusToConfig } = useIptableStatusCommon()
function parseRules(chain: IptablesChain, table: Table): ParsedIptablesRule[] {
  return chain.rules.map(rule => {
    return {
      ...rule,
      linkToConfig: getLinkFromStatusToConfig(table, rule, rules.value, portForwards.value, natRules.value, joolConfigs.value, false) ?? rule.comment ?? '-',
      chain: chain.chain,
      table: table,
      source: parseIp(rule.source),
      destination: parseIp(rule.destination),
      in: parseDevice(rule.in),
      out: parseDevice(rule.out),
      prot: parseProto(rule.prot)
    }
  })
}
function parseIp(value: string) {
  return value === 'anywhere' ? '*' : value
}
function parseDevice(value: string) {
  return value === 'any' ? '*' : value
}
function parseProto(value: string) {
  return value === 'any' ? '*' : value
}
const flatData = computed(() => {
  const chains = parsedTables.value.flatMap(e => e.chains)
  const rules = chains.flatMap(e => e.rules)
  return {
    chains,
    rules
  }
})

const timer = useTimer({ method: getStatus, time: 5000, autostart: false, immediate: false, group: 'edit' })
const route = useRoute()
function onMounted() {
  timer.stop()
  store.spin()
  return getStatus().finally(() => {
    timer.start()
    store.spin(false)

    if (!route.hash) return
    const parts = route.hash
      .substring(1)
      .split('&')
      .map(e => e.split('='))
    const table = parts.find(part => part[0] === 'table')?.[1]
    const chain = parts.find(part => part[0] === 'chain')?.[1]
    const rule = parts.find(part => part[0] === 'rule')?.[1]
    if (!table || !chain) return
    const target = parsedTables.value.find(e => e.table === table)?.chains.find(e => e.chain === chain)
    if (!target) return
    const targetRule = rule ? target.rules[Number(rule)] : undefined
    chainModalRef.value?.openModal(targetRule || target, !!targetRule)
  })
}
onMounted()

const status = ref<IptablesTable[]>([])
const rules = ref<Rule[]>([])
const natRules = ref<Nat[]>([])
const portForwards = ref<PortForward[]>([])
const joolConfigs = ref<JoolConfig[]>([])
function getStatus() {
  return axios
    .bulkGet([
      `/api/firewall/iptables/${props.ipv}/status`,
      { endpoint: `/api/firewall/traffic_rules/config`, condition: session.hasAccess('network/firewall/rules', 'read') },
      { endpoint: '/api/firewall/nat_rules/config', condition: session.hasAccess('network/firewall/nat_rules', 'read') },
      { endpoint: '/api/firewall/port_forwards/config', condition: session.hasAccess('network/firewall/forwards', 'read') },
      { endpoint: '/api/jool/rules/config', condition: session.hasAccess('network/jool', 'read') && 'jool.control' }
    ])
    .then(([_status, _rules, _natRules, _portForwards, _joolConfigs]) => {
      if (_status.success) status.value = _status.data
      else message.error($t('Failed to load firewall status'))
      if (_rules.success) rules.value = _rules.data
      else message.error($t('Failed to load rule data'))
      if (_natRules.success) natRules.value = _natRules.data
      else message.error($t('Failed to load NAT rule data'))
      if (_portForwards.success) portForwards.value = _portForwards.data
      else message.error($t('Failed to load port forward data'))
      if (_joolConfigs.success) joolConfigs.value = _joolConfigs.data
      else message.error($t('Failed to load NAT64 data'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
}

function resetCounters() {
  timer.stop()
  return axios
    .post(`/api/firewall/iptables/${props.ipv}/actions/reset`)
    .then(() => message.success($t('Counters reset successfully')))
    .catch(() => message.error($t('Failed to reset counter')))
    .then(onMounted)
}
</script>
