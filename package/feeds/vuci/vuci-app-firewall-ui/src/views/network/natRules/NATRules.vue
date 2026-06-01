<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    v-model="formData"
    config="firewall"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      ref="sectionRef"
      :title="$t('NAT Rules')"
      :help="$t('NAT rules allow fine grained control over the source IP to use for outbound or forwarded traffic.')"
      type="nat"
      :columns="rulesColumns"
      :edit-form="markRaw(EditForm)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'firewall/nat_rules/config' }]"
      data-key="natRules"
      sort-by="priority"
      :exception-options="['priority']"
      sortable
      :row-actions="[cloneAction, 'edit', 'delete']"
    >
      <template #before>
        <firewall-page-hints drag-and-drop />
      </template>
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #match="{ s }">
        <div class="flex flex-col gap-1">
          <fw-rule
            :values="formatedMatches[s.id].protoValues"
            :zones="zones"
            :where="$t('Incoming')"
          />
          <fw-rule
            :values="formatedMatches[s.id].srcValues"
            :zones="zones"
            :where="$t('From')"
          />
          <fw-rule
            :values="formatedMatches[s.id].destValues"
            :zone="formatedMatches[s.id].zone"
            :zones="zones"
            :where="$t('To')"
          />
        </div>
      </template>
      <template #via="{ s }">
        <template v-if="formatedActions[s.id].rawText">{{ formatedActions[s.id].rawText }}</template>
        <fw-rule
          v-else
          :values="formatedActions[s.id].values"
          :where="$t('Rewrite to')"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          initial="1"
        />
      </template>
      <template #counter="{ s }">
        <iptable-status
          :hints="{ ipv4_hints: ipv4Hints }"
          :statuses="parsedStatus?.filter(status => status.id === s.id)"
          :enabled="(formRef?.initialForm as FormModel)?.natRules?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="counter"
        />
      </template>
      <template #status="{ s }">
        <iptable-status
          :hints="{ ipv4_hints: ipv4Hints }"
          :statuses="parsedStatus?.filter(status => status.id === s.id)"
          :enabled="(formRef?.initialForm as FormModel)?.natRules?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="state"
        />
      </template>
      <template
        v-if="zones.length > 0"
        #addForm="{ addModel }"
      >
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          prop="name"
          :help="$t('The name of the rule. This is used for easier management purposes.')"
          :placeholder="$t('New NAT rule')"
          :rules="['uciname', () => $utils.validateNoDuplicates([...formData.natRules, addModel], 'name', addModel.name, $t('Name'))]"
          maxlength="64"
        />
        <tlt-form-item-zone-select
          v-model="addModel.src"
          :label="$t('Source zone')"
          prop="src"
          :help="$t('Only match traffic coming to the given firewall zone.')"
          :options="zoneOptions"
          :zones="zones"
        />
        <tlt-form-item-select
          v-model="addModel.src_dip"
          :label="$t('Rewrite IP')"
          prop="src_dip"
          rules="ip4addr"
          :options="$network.getIpOptions(ipv4Hints)"
          allow-create
          required
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Rewrite matched traffic to the given source network address.')"
              :hints="e => [e.ipmask4()]"
            />
          </template>
        </tlt-form-item-select>
        <tlt-form-item-select
          v-model="addModel.src_dport"
          :label="$t('Rewrite port')"
          prop="src_dport"
          :options="$network.getPortOptions(['', $t('No rewrite')])"
          allow-create
          rules="portrange"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Rewrite matched traffic to the given source port.')"
              :hints="e => [e.noRewrite($t('Source port')), e.portrange()]"
            />
          </template>
        </tlt-form-item-select>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, markRaw, provide, ref, useTemplateRef } from 'vue'
import { formatter } from '@/components/network/firewall/firewallFormatter'
import FwRule from '@/components/network/firewall/FwRule.vue'
import EditForm from './NATRuleEdit.vue'
import type { Zone, Nat } from '@/types/firewallTypes'
import type { FwRuleValue } from '@/components/network/firewall/FwRuleValue.vue'
import { FormOptionKey, type FormModel } from './natRulesCommon'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { useTimer } from '@ui-core/composables/useTimer'
import type { IptablesTable } from '@/types/iptablesTypes'
import { useIptableStatusCommon, type ParsedIptablesRule } from '@/components/network/firewall/IptableStatusCommon'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'
import firewallPageHints from '@/components/network/firewall/firewallPageHints.vue'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import { useCloneRowAction } from '@/composables/useCloneRowAction'
import HintHelper from '@/components/shared/HintHelper.vue'
import type { InterfaceStatus } from '@/types/networkTypes'
import { network } from '@/plugins/network'

type ActionValues = { values?: FwRuleValue[]; rawText?: string }
type MatchValues = { protoValues?: FwRuleValue[]; zone?: string; srcValues?: FwRuleValue[]; destValues?: FwRuleValue[] }

const $t = useTranslate()
const message = useMessages()

const rulesColumns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the rule. This is only used for easier management purposes.')
  },
  { name: 'match', label: $t('Match'), help: $t('Only match traffic using the given rules.'), width: 'md' },
  { name: 'via', label: $t('Action'), help: $t('Modify traffic with the given rules.') },
  {
    name: 'status',
    label: $t('Status'),
    displayFn: (__: any, s: Nat) => displayStatus(s, parsedStatus.value, (formRef.value?.initialForm as FormModel)?.natRules),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  { name: 'counter', label: $t('Counter'), width: 'w-48', displayFn: (__: any, s: Nat) => displayCounter(s, parsedStatus.value), actions: { sort: true } },
  { name: 'enabled', label: $t('Enabled') },
  { name: '__row-actions', width: 'w-48' }
]

const zones = ref<Zone[]>([])
const ipv4Hints = ref<[string, string][]>([])
const formData = ref<FormModel>({ natRules: [] })
const formRef = useTemplateRef<typeof VuciForm>('form')

const sectionRef = useTemplateRef<InstanceType<typeof VuciTypedSection>>('sectionRef')
const cloneAction = useCloneRowAction<FormModel, 'natRules', Nat, 'name'>({
  endpoint: '/api/firewall/nat_rules/config',
  typedSectionRef: sectionRef,
  formModel: formData,
  sectionKey: 'natRules',
  excludeKeys: ['id', 'priority'],
  nameKey: 'name',
  maxNameLength: 64,
  cloneNameOptions: {
    seperator: '_',
    allowEllipsis: false
  }
})

const zoneOptions = computed(() => {
  return zones.value.map(zone => zone.name)
})
provide(FormOptionKey, {
  ipv4Hints,
  zones,
  zoneOptions
})

const formatedMatches = computed(() => {
  return formData.value.natRules.reduce<Record<string, MatchValues>>((acc, s) => {
    acc[s.id] = displayMatch(s)
    return acc
  }, {})
})
const formatedActions = computed(() => {
  return formData.value.natRules.reduce<Record<string, ActionValues>>((acc, s) => {
    acc[s.id] = displayAction(s)
    return acc
  }, {})
})

const ipv4Status = ref<IptablesTable[] | undefined>(undefined)
const ipv6Status = ref<IptablesTable[] | undefined>(undefined)
const interfaceStatus = ref<InterfaceStatus[]>([])
network.statusContext.provider(interfaceStatus)
const { flattenIptableStatus, displayCounter, displayStatus } = useIptableStatusCommon()
const parsedStatus = computed<ParsedIptablesRule[] | undefined>(() => flattenIptableStatus(ipv4Status.value, ipv6Status.value, (formRef.value?.initialForm as any as FormModel)?.natRules, 'nat'))

const timer = useTimer({ method: statusLoad, autostart: false, immediate: true, time: 5000 })

function statusLoad() {
  return axios
    .bulkGet(['/api/firewall/iptables/ipv4/status', '/api/firewall/iptables/ipv6/status'])
    .then(([_ipv4Status, _ipv6Status]) => {
      if (_ipv4Status.success) ipv4Status.value = _ipv4Status.data
      else message.error($t('Failed to load IPv4 status'))
      if (_ipv6Status.success) ipv6Status.value = _ipv6Status.data
      else message.error($t('Failed to load IPv6 status'))
    })
    .catch(() => {
      message.error($t('Failed to load firewall status'))
    })
}

function afterLoad() {
  return axios
    .bulkGet(['/api/firewall/zones/config', '/api/routes/status/ipv4_hints', '/api/interfaces/basic/status?include=vpn'])
    .then(([zonesData, routesData, ifaceStatus]) => {
      if (zonesData.success) zones.value = zonesData.data
      else message.error($t('Failed to load zones data'))
      if (routesData.success) ipv4Hints.value = routesData.data
      else message.error($t('Failed to load zones data'))
      if (ifaceStatus.success) interfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load interface data'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => timer.start())
}
function displayMatch(section: Nat): MatchValues {
  const proto = formatter.fmtProto(section.proto, [], 'ipv4')

  const zone = formatter.fmtZone(section.src)
  const srcIp = formatter.fmtIP(section.src_ip, ipv4Hints.value)
  const srcPort = formatter.fmtPort(section.src_port)

  const destIp = formatter.fmtIP(section.dest_ip, ipv4Hints.value)
  const destPort = formatter.fmtPort(section.dest_port)

  return {
    protoValues: [proto].filter(utils.notEmpty),
    zone,
    srcValues: [srcIp, srcPort].filter(utils.notEmpty),
    destValues: [destIp, destPort].filter(utils.notEmpty)
  }
}

function displayAction(section: Nat): ActionValues {
  const ip = formatter.fmtIP(section.src_dip, ipv4Hints.value)
  const port = formatter.fmtPort(section.src_dport)
  const rawTexts: Record<string, string | undefined> = {
    MASQUERADE: $t('Rewrite using MASQUERADE'),
    ACCEPT: $t('Blacklist from rewrite')
  }
  return {
    rawText: rawTexts[section.target],
    values: [ip, port].filter(utils.notEmpty)
  }
}
</script>
