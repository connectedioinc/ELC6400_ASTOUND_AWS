<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    v-model="formData"
    config="jool"
    :after-load="afterLoad"
    :extra-load="extraLoad"
    bulk-request
    async-load
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('NAT64 configuration')"
      :help="$t('NAT64 is an IPv6 transition mechanism that facilitates communication between IPv6 and IPv4 hosts by using a form of network address translation.')"
      data-key="jool_global"
      :endpoints="[{ endpoint: 'jool/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns on NAT64 service.')"
        @change="utils.validate"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('IPv6 interface')"
        :help="$t('IPv6 interface which will be used for the translation.')"
        :required="s.enabled === '1'"
        :options="interfaceOptions"
      />
    </vuci-named-section>
    <vuci-typed-section
      :title="$t('Rules')"
      :columns="joolColumns"
      type="jool"
      :uci-data="uciData"
      :edit-form="markRaw(JoolEdit)"
      :endpoints="[{ endpoint: 'jool/rules/config' }]"
      data-key="jool"
      :add="beforeAdd"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #match="{ s }">
        <div class="flex flex-col gap-1">
          <fw-rule
            :values="formattedMatches[s.id].protoValues"
            :zones="zones"
            :where="$t('Incoming')"
          />
          <fw-rule
            :values="formattedMatches[s.id].srcValues"
            :zone="formattedMatches[s.id].srcZone"
            :zones="zones"
            :where="$t('From')"
          />
          <fw-rule
            :values="formattedMatches[s.id].destIpv6Values"
            :zones="zones"
            :where="$t('To')"
          />
        </div>
      </template>
      <template #translate="{ s }">
        <div class="flex flex-col gap-1">
          <fw-rule
            :values="formattedMatches[s.id].destIpv4Values"
            :zones="zones"
            :where="$t('To')"
          />
        </div>
      </template>
      <template #status="{ s }">
        <div class="flex flex-col gap-1">
          <div class="flex flex-row gap-x-1 flex-wrap">
            IPv4:
            <iptable-status
              :hints="hints"
              :statuses="parsedStatus?.filter(status => status.id === s.id && status.ipv === 'ipv4')"
              :enabled="isEnabled(s)"
              reverse-direction
              type="state"
              no-page-name
            />
          </div>
          <div class="flex flex-row gap-x-1 flex-wrap">
            IPv6:
            <iptable-status
              :hints="hints"
              :statuses="parsedStatus?.filter(status => status.id === s.id && status.ipv === 'ipv6')"
              :enabled="isEnabled(s)"
              type="state"
              no-page-name
            />
          </div>
        </div>
      </template>
      <template #counter="{ s }">
        <div class="flex flex-col gap-1">
          <div class="flex flex-row gap-x-1 flex-wrap">
            IPv4:
            <iptable-status
              :hints="hints"
              :statuses="parsedStatus?.filter(status => status.id === s.id && status.ipv === 'ipv4')"
              :enabled="isEnabled(s)"
              reverse-direction
              type="counter"
            />
          </div>
          <div class="flex flex-row gap-x-1 flex-wrap">
            IPv6:
            <iptable-status
              :hints="hints"
              :statuses="parsedStatus?.filter(status => status.id === s.id && status.ipv === 'ipv6')"
              :enabled="isEnabled(s)"
              type="counter"
            />
          </div>
        </div>
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #action-design="{ actions }">
        <tlt-hint :hints="addHint">
          <tlt-button
            button-id="add"
            :readonly="addHint.length > 0"
            @click="actions.create"
          >
            {{ $t('Add') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import type { InterfaceStatus } from '@/types/networkTypes'
import type { Zone } from '@/types/firewallTypes'
import type { FwRuleValue } from '@/components/network/firewall/FwRuleValue.vue'
import type { JoolGlobal, JoolConfig } from '@/types/joolTypes'
import JoolEdit from './JoolEdit.vue'
import FwRule from '@/components/network/firewall/FwRule.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { formatter } from '@/components/network/firewall/firewallFormatter'
import { utils } from '@/plugins/utils'
import { axios } from '@ui-core/plugins/axios'
import { ref, computed, provide, useTemplateRef, markRaw } from 'vue'
import { useTimer } from '@ui-core/composables/useTimer'
import type { IptablesTable } from '@/types/iptablesTypes'
import { useIptableStatusCommon, type ParsedIptablesRule } from '@/components/network/firewall/IptableStatusCommon'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'
import { network } from '@/plugins/network'

const $t = useTranslate()
const message = useMessages()

const joolColumns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the rule.')
  },
  { name: 'match', width: 'md', label: $t('Match'), help: $t('Only match traffic using the given rules.') },
  { name: 'translate', label: $t('Translate'), help: $t('Translate traffic to the given location.') },
  {
    name: 'status',
    label: $t('Status')
  },
  {
    name: 'counter',
    label: $t('Counter'),
    width: 'w-54'
  },
  {
    name: 'enabled',
    title: $t('Enabled')
  }
]

interface FormModel {
  jool_global: JoolGlobal[]
  jool: JoolConfig[]
}

const formData = ref<FormModel>({ jool_global: [], jool: [] })
const formRef = useTemplateRef<typeof VuciForm>('form')
const interfaceOptions = computed(() => [['', $t('-- No interface --')], ...ifacesStatus.value.filter(iface => !network.isVpnProto(iface)).map(iface => iface.name)])
const addHint = computed(() => (formData.value.jool.length > 0 ? [{ info: $t('Only a single rule can be added at the time.') }] : []))

function isEnabled(s: JoolConfig) {
  const initialForm = formRef.value?.initialForm as any as Partial<FormModel>
  // can be uncommented after #28216
  // if (initialForm.jool_global?.[0]?.enabled !== '1') return '0'
  return initialForm.jool?.find(e => e.id === s.id)?.enabled ?? '0'
}

const ifacesStatus = ref<InterfaceStatus[]>([])
network.statusContext.provider(ifacesStatus)
function extraLoad() {
  return axios
    .get('/api/interfaces/basic/status?include=vpn')
    .then(({ data }) => {
      ifacesStatus.value = data
    })
    .catch(() => message.error($t('Failed to load interface status')))
}

const zones = ref<Zone[]>([])
const hints = ref<{ ipv4_hints: [string, string][]; ipv6_hints: [string, string][] }>({ ipv4_hints: [], ipv6_hints: [] })
function afterLoad() {
  timer.start()
  return axios
    .bulkGet(['/firewall/zones/config', '/api/routes/status/ipv4_hints', '/api/routes/status/ipv6_hints'])
    .then(([zonesConfig, ipv4Hints, ipv6Hints]) => {
      if (zonesConfig.success) zones.value = zonesConfig.data
      else message.error($t('Failed to load zones config'))
      if (ipv4Hints.success) hints.value.ipv4_hints = ipv4Hints.data
      else message.error($t('Failed to load IPv4 hints data'))
      if (ipv6Hints.success) hints.value.ipv6_hints = ipv6Hints.data
      else message.error($t('Failed to load IPv6 hints data'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
}

const ipv4Status = ref<IptablesTable[] | undefined>(undefined)
const ipv6Status = ref<IptablesTable[] | undefined>(undefined)
const { flattenIptableStatus } = useIptableStatusCommon()
const parsedStatus = computed<ParsedIptablesRule[] | undefined>(() => flattenIptableStatus(ipv4Status.value, ipv6Status.value, (formRef.value?.initialForm as any as FormModel)?.jool, 'jool'))

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

function beforeAdd() {
  const jool_global = formData.value.jool_global[0]
  if (jool_global.enabled === '1' && !jool_global.interface) return Promise.resolve()
  return axios.put('/api/jool/global', { data: jool_global }).catch(() => message.error($t('Failed to save global settings')))
}

function displayMatch(section: JoolConfig) {
  const proto = formatter.fmtProto(section.proto, [], 'ipv6')

  const srcZone = formatter.fmtZone(section.src)
  const srcIpv6 = formatter.fmtIP(section.src_ipv6?.filter(s => s)?.length ? section.src_ipv6 : $t('Any'), hints.value.ipv6_hints)
  const srcIp = formatter.fmtIP(section.dest_ipv4?.filter(s => s)?.length ? section.dest_ipv4 : $t('Any'), hints.value.ipv4_hints)
  const srcPort = formatter.fmtPort(section.src_port)
  const destIpv6 = formatter.fmtIP(section.dest_ipv6?.filter(s => s)?.length ? section.dest_ipv6 : $t('Any'), hints.value.ipv6_hints)
  const destPort = formatter.fmtPort(section.dest_port)

  return {
    protoValues: [proto].filter(utils.notEmpty),
    srcZone: srcZone as string,
    srcValues: [srcIpv6, srcPort].filter(utils.notEmpty),
    destIpv6Values: [destIpv6, destPort].filter(utils.notEmpty),
    destIpv4Values: [srcIp, destPort].filter(utils.notEmpty)
  }
}

const formattedMatches = computed(() => {
  return formData.value.jool.reduce<Record<string, { protoValues: FwRuleValue[]; srcValues: FwRuleValue[]; srcZone: string; destIpv4Values: FwRuleValue[]; destIpv6Values: FwRuleValue[] }>>(
    (acc, s) => {
      acc[s.id] = displayMatch(s)
      return acc
    },
    {}
  )
})

provide('zones', zones)
provide('hints', hints)
</script>
