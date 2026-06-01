<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="firewall"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'firewall/nat_rules/config' }]"
      data-key="natRules"
      :name="props.section.id"
      :title="$utils.getModalTitle($t('NAT rule'), props.section.name)"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enable')"
            :help="$t('Turns the rule on or off.')"
            initial="1"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="name"
            :label="$t('Name')"
            :help="$t('Name of the rule. This is only used for easier management purposes.')"
            :placeholder="$t('Name')"
            :rules="['fieldvalidation(\'^[a-zA-Z0-9_-]+$\',0)', () => $utils.validateNoDuplicates(formData.natRules, 'name', s.name, $t('Name'))]"
            maxlength="64"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="proto"
            :label="$t('Protocol')"
            :options="$network.getProtoOptions()"
            allow-create
            multiple
            @change="$utils.mutuallyExclusiveValue(s, 'proto', 'all')"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic using the given internet communication protocol.')"
                :hints="protoHints"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-zone-select
            :uci-section="s"
            name="src"
            :label="$t('Outbound zone')"
            :help="$t('Only match traffic leaving the given firewall zone.')"
            :zones="zones"
            :options="[...(s.target !== 'SNAT' ? [['', $t('Any')]] : []), ...zoneOptions]"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="src_ip"
            :label="$t('Source IP address')"
            :placeholder="$t('Any')"
            :options="$network.getIpOptions(ipv4Hints)"
            rules="neg(ipmask4)"
            multiple
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming from the given network address.')"
                :hints="e => [e.any(), e.ipmask4(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="src_port"
            :label="$t('Source port')"
            :options="$network.getPortOptions()"
            :placeholder="$t('Any')"
            rules="neg(portrange)"
            allow-create
            multiple
            :depend="portDepends(s)"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming from the given port.')"
                :hints="e => [e.any(), e.portrange(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dest_ip"
            :label="$t('Destination IP address')"
            :options="$network.getIpOptions(ipv4Hints, ['', $t('Any')])"
            rules="neg(ipmask4)"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic being forwarded to the given network address.')"
                :hints="e => [e.any(), e.ipmask4(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dest_port"
            :label="$t('Destination port')"
            :options="$network.getPortOptions(['', $t('Any')])"
            rules="neg(portrange)"
            :depend="portDepends(s)"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic being forwarded to the given port.')"
                :hints="e => [e.any(), e.portrange(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="target"
            :label="$t('Action')"
            :options="targetOptions"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('NAT action to use on matched traffic.')"
                :hints="targetHints"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            :depend="s.target === 'SNAT'"
            name="src_dip"
            :label="$t('Rewrite IP address')"
            :options="[...(s.target !== 'SNAT' ? [['', $t('Any')]] : []), ...$network.getIpOptions(ipv4Hints)]"
            rules="ip4addr"
            allow-create
            :required="s.target === 'SNAT'"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Rewrite matched traffic source network address to the given network address.')"
                :hints="e => [e.ipmask4()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="src_dport"
            :label="$t('Rewrite port')"
            :options="$network.getPortOptions(['', $t('No rewrite')])"
            rules="portrange"
            :depend="portDepends(s) && !s.proto?.includes('all') && s.target === 'SNAT'"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Rewrite matched traffic source port to the given port.')"
                :hints="e => [e.noRewrite($t('Source port')), e.portrange()]"
              />
            </template>
          </vuci-form-item-select>
        </template>
        <template #advanced>
          <vuci-form-item-input
            :uci-section="s"
            name="extra"
            :label="$t('Extra arguments')"
            :help="$t('Passes additional arguments to iptables. Use with care!')"
            placeholder="-c"
            rules="fieldvalidation('^[a-zA-Z0-9-\/!:. ]+$',0)"
            maxlength="128"
          />
        </template>
        <template #time>
          <vuci-form-item-select
            :uci-section="s"
            name="weekdays"
            :label="$t('Week Days')"
            :help="$t('Specifies on which days of the week the rule is valid.')"
            :options="weekdays"
            multiple
          />
          <vuci-form-item-select
            :uci-section="s"
            name="monthdays"
            :label="$t('Month Days')"
            :help="$t('Specifies on which days of the month the rule is valid.')"
            :options="monthdays"
            multiple
          />
          <vuci-form-item-input
            :uci-section="s"
            name="start_time"
            :label="$t('Start Time (hh:mm:ss)')"
            :help="$t('Indicates the beginning of the time period during which the rule is valid.')"
            placeholder="12:00:00"
            rules="timehhmmss"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="stop_time"
            :label="$t('Stop Time (hh:mm:ss)')"
            :help="$t('Indicates the end of the time period during which the rule is valid.')"
            placeholder="23:00:00"
            rules="timehhmmss"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="start_date"
            :label="$t('Start Date (yyyy-mm-dd)')"
            :help="$t('Indicates the first day of the date of the period during which the rule is valid (inclusive).')"
            placeholder="0001-01-01"
            :rules="(v: any) => [v.dateyyyymmdd.bind(v, 'pastDate'), checkDates.bind(v, s)]"
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="stop_date"
            :label="$t('Stop Date (yyyy-mm-dd)')"
            :help="$t('Indicates the last day of the date of the period during which the rule is no longer valid (exclusive).')"
            placeholder="9999-01-01"
            :rules="(v: any) => [v.dateyyyymmdd, checkDates.bind(v, s)]"
            @change="$utils.validate"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="utc_time"
            :label="$t('Time in UTC')"
            :help="$t('Specifies whether the device should use UTC time.')"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import type { Nat } from '@/types/firewallTypes'
import { inject, ref } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './natRulesCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import HintHelper, { type OptionHint } from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const { portDepends, monthdays, checkDates, protoHints, weekdays } = useFirewallCommon()

const { ipv4Hints, zoneOptions, zones } = inject(FormOptionKey) as FormOptions

export interface Props {
  section: Nat
}
const props = defineProps<Props>()
const formData = ref<FormModel>({ natRules: [] })

const tabs = [
  { name: 'general', title: $t('General Settings') },
  { name: 'advanced', title: $t('Advanced Settings') },
  { name: 'time', title: $t('Time Restrictions') }
]
const targetOptions = ['SNAT', 'MASQUERADE', 'ACCEPT']

const targetHints = [
  { option: 'SNAT', hint: $t('rewrite to specific source IP or port.') },
  { option: 'MASQUERADE', hint: $t('automatically rewrite to outbound interface IP.') },
  { option: 'ACCEPT', hint: $t('blacklist from having IP or port rewritten.') }
] satisfies OptionHint[]
</script>
