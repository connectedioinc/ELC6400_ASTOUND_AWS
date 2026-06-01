<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    v-model="formData"
    config="firewall"
    :after-load="afterLoad"
    async-load
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('DMZ')"
      :endpoints="[{ endpoint: 'dmz/config', sectionFilter: (section: [DMZ]) => section[0] }]"
      data-key="firewallDmz"
    >
      <firewall-page-hints />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enables the DMZ configuration.')"
        name="enabled"
      />
      <tlt-form-model-item :label="$t('Status')">
        <iptable-status
          :hints="{ ipv4_hints: ipv4Hints }"
          :statuses="parsedStatus?.filter(status => status.id === 'dmz_fw')"
          :enabled="(formRef?.initialForm as FormModel)?.firewallDmz?.[0]?.enabled ?? '0'"
          type="state"
        />
      </tlt-form-model-item>
      <tlt-form-model-item :label="$t('Counter')">
        <iptable-status
          :hints="{ ipv4_hints: ipv4Hints }"
          :statuses="parsedStatus?.filter(status => status.id === 'dmz_fw')"
          :enabled="(formRef?.initialForm as FormModel)?.firewallDmz?.[0]?.enabled ?? '0'"
          type="counter"
        />
      </tlt-form-model-item>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Host IP')"
        name="host_ip"
        placeholder="192.168.10.2"
        rules="ip4addr"
        :options="$network.getIpOptions(ipv4Hints, ['', $t('-- Please choose --')])"
        allow-create
        :required="s.enabled === '1'"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('IP address of the DMZ host.')"
            :hints="e => [e.ip4addr()]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Protocol')"
        :options="$network.getProtoOptions()"
        name="proto"
        multiple
        :required="s.enabled === '1'"
        @change="$utils.mutuallyExclusiveValue(s, 'proto', 'all')"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Specifies for which protocols the DMZ will be used.')"
            :hints="protoHints"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        :depend="portDepends(s)"
        :label="$t('Ports')"
        name="port_range"
        :options="$network.getPortOptions(['', $t('Any')])"
        rules="neg(portrange)"
        allow-create
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Match incoming traffic directed at the given destination port or port range on DMZ host IP.')"
            :hints="e => [e.any(), e.portrange(), e.neg()]"
          />
        </template>
      </vuci-form-item-select>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { computed, ref, useTemplateRef } from 'vue'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import IptableStatus from '@/components/network/firewall/IptableStatus.vue'
import { useTimer } from '@ui-core/composables/useTimer'
import type { IptablesTable } from '@/types/iptablesTypes'
import { useIptableStatusCommon, type ParsedIptablesRule } from '@/components/network/firewall/IptableStatusCommon'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import type { PortForward } from '@/types/firewallTypes'
import firewallPageHints from '@/components/network/firewall/firewallPageHints.vue'
import HintHelper from '@/components/shared/HintHelper.vue'

export interface DMZ {
  enabled: '1' | '0'
  proto: string[]
  port_range: string
}

interface FormModel {
  firewallDmz: DMZ[]
}

const formData = ref<FormModel>({ firewallDmz: [] })
const formRef = useTemplateRef<typeof VuciForm>('form')

const $t = useTranslate()
const message = useMessages()
const { portDepends, protoHints } = useFirewallCommon()

const ipv4Status = ref<IptablesTable[] | undefined>(undefined)
const ipv6Status = ref<IptablesTable[] | undefined>(undefined)
const { flattenIptableStatus } = useIptableStatusCommon()
// Best to pull forward configs and get dmz one although names are very hardcoded in API so dont need atm
const parsedStatus = computed<ParsedIptablesRule[] | undefined>(() =>
  flattenIptableStatus(
    ipv4Status.value,
    ipv6Status.value,
    [{ id: 'dmz_fw', name: 'dmz_fw', enabled: (formRef.value?.initialForm as FormModel)?.firewallDmz?.[0]?.enabled ?? '0' } as PortForward],
    'forward'
  )
)

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

const ipv4Hints = ref<[string, string][]>([])
function afterLoad() {
  return axios
    .get('/api/routes/status/ipv4_hints')
    .then(({ data }) => {
      ipv4Hints.value = data
    })
    .catch(() => {
      message.error($t('Failed to load routes data'))
    })
    .finally(() => timer.start())
}
</script>
