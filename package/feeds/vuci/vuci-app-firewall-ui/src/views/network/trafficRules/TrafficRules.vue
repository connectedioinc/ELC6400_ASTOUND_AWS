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
      :uci-data="uciData"
      data-key="rules"
      :endpoints="[{ endpoint: 'firewall/traffic_rules/config' }]"
      :title="$t('Traffic rules')"
      :help="$t('To change the rule order just drag & drop them.')"
      type="rule"
      :columns="rulesColumns"
      :edit-form="markRaw(EditForm)"
      sort-by="priority"
      :exception-options="['priority']"
      :add="onAdd"
      sortable
      :row-actions="(s: Rule) => (s.owner_type ? ['managed_by'] : [cloneAction, 'edit', 'delete'])"
    >
      <template #before>
        <firewall-page-hints drag-and-drop />
      </template>
      <template #managed_by="{ s }">
        <string-with-links :text="getManagedString(s)" />
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
            :zone="formatedMatches[s.id].srcZone"
            :zones="zones"
            :where="$t('From')"
          />
          <fw-rule
            :values="formatedMatches[s.id].destValues"
            :zone="formatedMatches[s.id].destZone"
            :zones="zones"
            :where="$t('To')"
          />
        </div>
      </template>
      <template #counter="{ s }">
        <iptable-status
          :hints="hints"
          :statuses="parsedStatus?.filter(status => status.id === s.id)"
          :enabled="(formRef?.initialForm as FormModel)?.rules?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="counter"
        />
      </template>
      <template #status="{ s }">
        <iptable-status
          :hints="hints"
          :statuses="parsedStatus?.filter(status => status.id === s.id)"
          :enabled="(formRef?.initialForm as FormModel)?.rules?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="state"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          initial="1"
          :readonly="!!s.owner_type"
          :no-write="!!s.owner_type"
        />
      </template>
      <template
        v-if="zones.length > 0"
        #addForm="{ addModel }"
      >
        <tlt-form-item-select
          v-if="zones.length > 1"
          v-model="addModel.type"
          :label="$t('Add type')"
          prop="type"
          :help="$t('Specify what type of configuration you want to add.')"
          :options="typeOptions"
        />
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          prop="name"
          :help="$t('Name of the rule. This is only used for easier management purposes.')"
          :placeholder="addModel.type === 'port' ? $t('New input rule') : $t('New forward rule')"
          :rules="['fieldvalidation(\'^[a-zA-Z0-9 _-]+$\',0)', () => $utils.validateNoDuplicates([...formData.rules, addModel], 'name', addModel.name, $t('name'))]"
          maxlength="64"
        />
        <tlt-form-item-select
          v-model="addModel.proto"
          :label="$t('Protocol')"
          prop="proto"
          :options="$network.getProtoOptions()"
          :depend="addModel.type === 'port'"
          allow-create
          multiple
          @change="$utils.mutuallyExclusiveValue(addModel, 'proto', 'all')"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Only match traffic using the given internet communication protocol.')"
              :hints="protoHints"
            />
          </template>
        </tlt-form-item-select>
        <tlt-form-item-select
          v-model="addModel.dest_port"
          :label="$t('External port')"
          prop="dest_port"
          :placeholder="$t('Any')"
          rules="neg(portrange)"
          :depend="addModel.type === 'port' && portDepends(addModel)"
          :options="$network.getPortOptions()"
          allow-create
          multiple
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Only match traffic being forwarded to the given port.')"
              :hints="e => [e.any(), e.portrange(), e.neg()]"
            />
          </template>
        </tlt-form-item-select>
        <tlt-form-item-zone-select
          v-model="addModel.src"
          :label="$t('Source zone')"
          prop="src"
          :help="$t('Only match traffic coming to the given firewall zone.')"
          :options="zoneOptions"
          :zones="zones"
          :depend="addModel.type !== 'port'"
        />
        <tlt-form-item-zone-select
          v-model="addModel.dest"
          :label="$t('Destination zone')"
          prop="dest"
          :help="$t('Only match traffic being forwarded to the given firewall zone.')"
          :options="zoneOptions"
          :zones="zones"
          :depend="addModel.type !== 'port'"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, markRaw, provide, ref, useTemplateRef } from 'vue'
import EditForm from './TrafficRuleEdit.vue'
import { formatter } from '@/components/network/firewall/firewallFormatter'
import FwRule from '@/components/network/firewall/FwRule.vue'
import type { FwRuleValue } from '@/components/network/firewall/FwRuleValue.vue'
import type { Rule, Zone } from '@/types/firewallTypes'
import { FormOptionKey, type FormModel, type FormOptions } from './trafficRuleCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import { useCloneRowAction } from '@/composables/useCloneRowAction'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'
import type { IptablesTable } from '@/types/iptablesTypes'
import { useTimer } from '@ui-core/composables/useTimer'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useIptableStatusCommon, type ParsedIptablesRule } from '@/components/network/firewall/IptableStatusCommon'
import firewallPageHints from '@/components/network/firewall/firewallPageHints.vue'
import HintHelper from '@/components/shared/HintHelper.vue'
import type { InterfaceStatus } from '@/types/networkTypes'
import { network } from '@/plugins/network'

type MatchValues = { protoValues?: FwRuleValue[]; srcZone?: string; destZone?: string; srcValues?: FwRuleValue[]; destValues?: FwRuleValue[] }

const $t = useTranslate()
const message = useMessages()
const { protoHints, portDepends } = useFirewallCommon()
const { flattenIptableStatus, displayCounter, displayStatus } = useIptableStatusCommon()

const formData = ref<FormModel>({ rules: [] })
const formRef = useTemplateRef<typeof VuciForm>('form')

const sectionRef = useTemplateRef<InstanceType<typeof VuciTypedSection>>('sectionRef')
const cloneAction = useCloneRowAction<FormModel, 'rules', Rule, 'name'>({
  endpoint: '/api/firewall/traffic_rules/config',
  typedSectionRef: sectionRef,
  formModel: formData,
  sectionKey: 'rules',
  excludeKeys: ['id', 'priority'],
  nameKey: 'name',
  maxNameLength: 64,
  cloneNameOptions: {
    seperator: ' ',
    allowEllipsis: false
  }
})

const hints = ref<FormOptions['hints']['value']>({ ipv4_hints: [], mac_hints: [] })
const zones = ref<Zone[]>([])

provide(FormOptionKey, { hints, zones })

const typeOptions = [
  ['port', $t('Open ports on router')],
  ['forward', $t('Add new forward rule')]
]

const rulesColumns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the rule. This is only used for easier management purposes.')
  },
  { name: 'match', label: $t('Match'), help: $t('Only match traffic using the given rules.'), width: 'md' },
  {
    name: 'target',
    label: $t('Action'),
    help: $t('Take given action when traffic matches all conditions.'),
    displayFn: (_: any, section: Rule) => formatter.fmtTarget(section.target, section.src, section.dest)
  },
  {
    name: 'status',
    label: $t('Status'),
    displayFn: (__: any, s: Rule) => displayStatus(s, parsedStatus.value, (formRef.value?.initialForm as FormModel)?.rules),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    name: 'counter',
    label: $t('Counter'),
    width: 'w-48',
    displayFn: (__: any, s: Rule) => displayCounter(s, parsedStatus.value),
    actions: { sort: true }
  },
  { name: 'enabled', label: $t('Enabled') },
  { name: '__row-actions', width: 'w-48' }
]

const zoneOptions = computed(() => {
  return zones.value.map(zone => zone.name)
})
const formatedMatches = computed(() => {
  return formData.value.rules.reduce<Record<string, MatchValues>>((acc, s) => {
    acc[s.id] = displayMatch(s)
    return acc
  }, {})
})

const ipv4Status = ref<IptablesTable[] | undefined>(undefined)
const ipv6Status = ref<IptablesTable[] | undefined>(undefined)
const interfaceStatus = ref<InterfaceStatus[]>([])
network.statusContext.provider(interfaceStatus)

const parsedStatus = computed<ParsedIptablesRule[] | undefined>(() => flattenIptableStatus(ipv4Status.value, ipv6Status.value, (formRef.value?.initialForm as any as FormModel)?.rules, 'rule'))

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
    .bulkGet(['/api/firewall/zones/config', '/api/routes/status/ipv4_hints', '/api/routes/status/mac_hints', '/api/interfaces/basic/status?include=vpn'])
    .then(([zoneConfig, ipv4Hints, macHints, ifaceStatus]) => {
      if (zoneConfig.success) zones.value = zoneConfig.data
      else message.error($t('Failed to load zones data'))
      if (ipv4Hints.success) hints.value.ipv4_hints = ipv4Hints.data
      else message.error($t('Failed to load IPv4 hints data'))
      if (macHints.success) hints.value.mac_hints = macHints.data
      else message.error($t('Failed to load MAC hints data'))
      if (ifaceStatus.success) interfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load interface data'))
    })
    .catch(() => {
      message.error($t('Failed to load routes data'))
    })
    .finally(() => timer.start())
}

function displayMatch(section: Rule): MatchValues {
  const proto = formatter.fmtProto(section.proto, section.icmp_type, section.family)

  const srcZone = formatter.fmtZone(section.src)
  const srcIp = formatter.fmtIP(section.src_ip, hints.value.ipv4_hints)
  const srcPort = formatter.fmtPort(section.src_port)
  const srcMac = formatter.fmtMac(section.src_mac)
  const destZone = formatter.fmtZone(section.dest)
  const destIp = formatter.fmtIP(section.dest_ip, hints.value.ipv4_hints)
  const destPort = formatter.fmtPort(section.dest_port)

  return {
    protoValues: [proto].filter(value => value).filter(utils.notEmpty),
    srcZone,
    destZone,
    srcValues: [srcIp, srcPort, srcMac].filter(value => value).filter(utils.notEmpty),
    destValues: [destIp, destPort].filter(value => value).filter(utils.notEmpty)
  }
}

function onAdd(form: Rule & { type: string | undefined }) {
  if (form.type === 'port') {
    const wanZone = zoneOptions.value.includes('wan')
    if (wanZone) form.src = 'wan'
  }
  delete form.type
}

const managerLinks: Record<NonNullable<Rule['owner_type']>, Parameters<typeof formatLink>> = {
  iec60870_server: ['/services/iec60870/server', $t('IEC 60870-5 Server')],
  modbusgwd: ['/services/modbus/tcp_over_serial'],
  overip: ['/services/serial_utilities/overip'],
  ulog: ['/services/logging']
}
function getManagedString(s: Rule) {
  const managerLink = managerLinks[s.owner_type!]
  return $t('Managed by %s').format(managerLink ? formatLink(`${managerLink[0]}${s.owner_id ? (`?edit=${s.owner_id}` as const) : ''}`, managerLink[1]) : s.owner_type)
}
</script>
