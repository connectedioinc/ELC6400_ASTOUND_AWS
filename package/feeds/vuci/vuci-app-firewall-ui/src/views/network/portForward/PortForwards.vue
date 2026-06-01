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
      :title="$t('Port forwards')"
      :help="$t('To change the rule order just drag & drop them.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'firewall/port_forwards/config' }]"
      data-key="forwards"
      type="redirect"
      :columns="columns"
      :edit-form="markRaw(EditForm)"
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
            :where="$t('Incoming')"
            :zones="zones"
          />
          <fw-rule
            :values="formatedMatches[s.id].srcValues"
            :zone="formatedMatches[s.id].srcZone"
            :zones="zones"
            :where="$t('From')"
          />
          <fw-rule
            :values="formatedMatches[s.id].destValues"
            :zones="zones"
            :where="$t('Via')"
          />
        </div>
      </template>
      <template #dest="{ s }">
        <fw-rule
          :values="formatedDestinations[s.id].values"
          :zone="formatedDestinations[s.id].zone"
          :zones="zones"
          :where="$t('To')"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          initial="1"
          :rmempty="false"
        />
      </template>
      <template #counter="{ s }">
        <iptable-status
          :hints="hints"
          :statuses="parsedStatus?.filter(status => status.id === s.id && !PosfixRegex.test(status.comment))"
          :enabled="(formRef?.initialForm as FormModel)?.forwards?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="counter"
        />
      </template>
      <template #status="{ s }">
        <iptable-status
          :hints="hints"
          :statuses="parsedStatus?.filter(status => status.id === s.id && !PosfixRegex.test(status.comment))"
          :enabled="(formRef?.initialForm as FormModel)?.forwards?.find(e => e.id === s.id)?.enabled ?? '0'"
          type="state"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          prop="name"
          :help="$t('Name of the rule. This is only used for easier management purposes.')"
          :placeholder="$t('New port forward')"
          :rules="['fieldvalidation(\'^[a-zA-Z0-9 _-]+$\')', () => $utils.validateNoDuplicates([...formData.forwards, addModel], 'name', addModel.name, $t('Name'))]"
          maxlength="2048"
        />
        <!-- WebUI required validation is intended so that the user wouldn't
        accidentally create a rule which would allow forwarding of all ports -->
        <tlt-form-item-select
          v-model="addModel.src_dport"
          :label="$t('External port')"
          prop="src_dport"
          :rules="addModel.src_dport === 'any' ? undefined : 'neg(portrange)'"
          :options="$network.getPortOptions(['', $t('-- Please choose --')], ['any', $t('Any')])"
          required
          allow-create
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Only match traffic coming to the given port.')"
              :hints="e => [e.any(), e.portrange(), e.neg()]"
            />
          </template>
        </tlt-form-item-select>
        <tlt-form-item-select
          v-model="addModel.dest_ip"
          :label="$t('Internal IP address')"
          prop="dest_ip"
          :options="$network.getIpOptions(hints)"
          rules="ipmask4"
          allow-create
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Forward traffic to the given network address.')"
              :hints="e => [e.ipmask4()]"
            />
          </template>
        </tlt-form-item-select>
        <tlt-form-item-select
          v-model="addModel.dest_port"
          :label="$t('Internal port')"
          prop="dest_port"
          rules="neg(portrange)"
          :options="$network.getPortOptions(['', $t('No rewrite')])"
          allow-create
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Forward traffic to the given port.')"
              :hints="e => [e.noRewrite($t('External port')), e.portrange(), e.neg()]"
            />
          </template>
        </tlt-form-item-select>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { FwRuleValue } from '@/components/network/firewall/FwRuleValue.vue'
import type { PortForward, Zone, ZoneGlobal } from '@/types/firewallTypes'

type MatchValues = { protoValues?: FwRuleValue[]; srcZone?: string; srcValues?: FwRuleValue[]; destValues?: FwRuleValue[] }
type DestinationValues = { values?: FwRuleValue[]; zone?: string }

import { formatter } from '@/components/network/firewall/firewallFormatter'
import EditForm from './PortForwardEdit.vue'
import FwRule from '@/components/network/firewall/FwRule.vue'
import { computed, provide, ref, markRaw, useTemplateRef } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './portForwardCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { axios } from '@ui-core/plugins/axios'
import { network } from '@/plugins/network'
import { useTimer } from '@ui-core/composables/useTimer'
import type { IptablesTable } from '@/types/iptablesTypes'
import { PosfixRegex, useIptableStatusCommon, type ParsedIptablesRule } from '@/components/network/firewall/IptableStatusCommon'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'
import firewallPageHints from '@/components/network/firewall/firewallPageHints.vue'
import { useCloneRowAction } from '@/composables/useCloneRowAction'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import HintHelper from '@/components/shared/HintHelper.vue'
import type { InterfaceStatus } from '@/types/networkTypes'

const $t = useTranslate()
const message = useMessages()

const columns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the rule. This is only used for easier management purposes.')
  },
  {
    name: 'match',
    label: $t('Match'),
    help: $t('Only match traffic using the given rules.'),
    width: 'md'
  },
  { name: 'dest', label: $t('Forward'), help: $t('Forward traffic to the given location.') },
  {
    name: 'status',
    label: $t('Status'),
    displayFn: (__: any, s: PortForward) => displayStatus(s, parsedStatus.value, (formRef.value?.initialForm as FormModel)?.forwards),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  { name: 'counter', label: $t('Counter'), width: 'w-48', displayFn: (__: any, s: PortForward) => displayCounter(s, parsedStatus.value), actions: { sort: true } },
  { name: 'enabled', label: $t('Enabled') },
  { name: '__row-actions', width: 'w-48' }
]

const formData = ref<FormModel>({ forwards: [] })
const formRef = useTemplateRef<typeof VuciForm>('form')

const sectionRef = useTemplateRef<InstanceType<typeof VuciTypedSection>>('sectionRef')
const cloneAction = useCloneRowAction<FormModel, 'forwards', PortForward, 'name'>({
  endpoint: '/api/firewall/port_forwards/config',
  typedSectionRef: sectionRef,
  formModel: formData,
  sectionKey: 'forwards',
  excludeKeys: ['id', 'priority'],
  nameKey: 'name',
  maxNameLength: 2048,
  cloneNameOptions: {
    seperator: ' ',
    allowEllipsis: false
  }
})

const hints = ref<FormOptions['hints']['value']>({ ipv4_hints: [], mac_hints: [] })
const zones = ref<Zone[]>([])
const zonesGlobal = ref<ZoneGlobal | null>(null)

provide(FormOptionKey, { hints, zones, zonesGlobal })

const formatedMatches = computed(() => {
  return formData.value.forwards.reduce<Record<string, MatchValues>>((acc, s) => {
    acc[s.id] = displayMatch(s)
    return acc
  }, {})
})
const formatedDestinations = computed(() => {
  return formData.value.forwards.reduce<Record<string, DestinationValues>>((acc, s) => {
    acc[s.id] = displayDestination(s)
    return acc
  }, {})
})

const ipv4Status = ref<IptablesTable[] | undefined>(undefined)
const ipv6Status = ref<IptablesTable[] | undefined>(undefined)
const { flattenIptableStatus, displayCounter, displayStatus } = useIptableStatusCommon()
const parsedStatus = computed<ParsedIptablesRule[] | undefined>(() => flattenIptableStatus(ipv4Status.value, ipv6Status.value, (formRef.value?.initialForm as any as FormModel)?.forwards, 'forward'))
const interfaceStatus = ref<InterfaceStatus[]>([])
network.statusContext.provider(interfaceStatus)

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
    .bulkGet(['/api/routes/status/ipv4_hints', '/api/routes/status/mac_hints', '/api/firewall/zones/config', '/api/firewall/global', '/api/interfaces/basic/status?include=vpn'])
    .then(([ipv4Hints, macHints, zonesConfig, zonesGlobalConfig, ifaceStatus]) => {
      if (ipv4Hints.success) hints.value.ipv4_hints = ipv4Hints.data
      else message.error($t('Failed to load IPv4 hints data'))
      if (macHints.success) hints.value.mac_hints = macHints.data
      else message.error($t('Failed to load MAC hints data'))
      if (zonesConfig.success) zones.value = zonesConfig.data
      else message.error($t('Failed to load zones data'))
      if (zonesGlobalConfig.success) zonesGlobal.value = zonesGlobalConfig.data
      else message.error($t('Failed to load global zone data'))
      if (ifaceStatus.success) interfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load interface data'))
    })
    .catch(() => {
      return message.error($t('An unexpected error occurred'))
    })
    .finally(() => timer.start())
}

function displayMatch(section: PortForward): MatchValues {
  const proto = formatter.fmtProto(section.proto, section.icmp_type, 'ipv4')

  const zone = formatter.fmtZone(section.src, network.zoneNames().other.unspecified)
  const ip = formatter.fmtIP(section.src_ip, hints.value.ipv4_hints)
  const port = formatter.fmtPort(section.src_port)
  const mac = formatter.fmtMac(section.src_mac)
  const dport = formatter.fmtPort(section.src_dport)
  const dip = formatter.fmtIP(section.src_dip, hints.value.ipv4_hints)

  return {
    protoValues: [proto].filter(utils.notEmpty),
    srcZone: zone,
    srcValues: [ip, port, mac].filter(utils.notEmpty),
    destValues: [dip, dport].filter(utils.notEmpty)
  }
}

function displayDestination(section: PortForward): DestinationValues {
  const zone = formatter.fmtZone(section.dest, network.zoneNames().other.unspecified)
  const ip = formatter.fmtIP(section.dest_ip, hints.value.ipv4_hints)
  const port = formatter.fmtPort(section.dest_port)
  return {
    zone,
    values: [ip, port].filter((value): value is FwRuleValue => value !== undefined)
  }
}
</script>
