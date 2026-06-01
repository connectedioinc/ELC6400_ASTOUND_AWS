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
      :endpoints="[{ endpoint: 'firewall/traffic_rules/config' }]"
      data-key="rules"
      :name="section.id"
      :title="$utils.getModalTitle($t('traffic rule'), props.section.name)"
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
            :rules="['fieldvalidation(\'^[a-zA-Z0-9_ -]+$\',0)', () => $utils.validateNoDuplicates(formData.rules, 'name', s.name, $t('Name'))]"
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
          <vuci-form-item-select
            :uci-section="s"
            name="icmp_type"
            :label="$t('Match ICMP type')"
            :help="$t('Only match traffic having the given ICMP type.')"
            :placeholder="$t('Any')"
            :options="icmpTypes"
            multiple
            allow-create
            :depend="s.proto?.length === 1 && s.proto?.includes('icmp')"
          />
          <vuci-form-item-zone-select
            :uci-section="s"
            name="src"
            :label="$t('Source zone')"
            :help="$t('Only match traffic coming to the given firewall zone.')"
            :options="srcZones"
            :zones="zones"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="src_ip"
            :label="$t('Source IP address')"
            :placeholder="$t('Any')"
            :options="$network.getIpOptions(hints)"
            rules="list(neg(ipmask))"
            maxlength="64"
            multiple
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming from the given network address.')"
                :hints="e => [e.any(), e.ipmask(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="src_port"
            :label="$t('Source port')"
            :placeholder="$t('Any')"
            rules="neg(portrange)"
            :options="$network.getPortOptions()"
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
          <vuci-form-item-zone-select
            :uci-section="s"
            name="dest"
            :label="!s.src ? $t('Output zone') : $t('Destination zone')"
            :help="$t('Only match traffic being forwarded to to the given firewall zone.')"
            :options="!s.src ? outZones : destZones"
            :zones="zones"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="dest_ip"
            :label="$t('Destination address')"
            :placeholder="$t('Any')"
            :options="$network.getIpOptions(hints)"
            rules="list(neg(ipmask))"
            maxlength="64"
            multiple
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic being forwarded to the given network address.')"
                :hints="e => [e.any(), e.ipmask(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dest_port"
            :label="$t('Destination port')"
            :placeholder="$t('Any')"
            :options="$network.getPortOptions()"
            rules="neg(portrange)"
            allow-create
            multiple
            :depend="portDepends(s)"
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
            :options="targets"
            initial="ACCEPT"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Take given action when traffic matches all conditions.')"
                :hints="getActionHint(true)"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-input
            :uci-section="s"
            name="set_mss"
            :label="$t('Maximum MMS')"
            :help="$t('Clamp MSS to specified value.')"
            rules="irange(0, 65515)"
            :depend="s.target === 'TCPMSS'"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ttl_action"
            :label="$t('TTL action')"
            :help="$t('TTL action to apply to packets.')"
            :options="ttlActionOptions"
            :depend="s.target === 'TTL'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="ttl_value"
            :label="$t('TTL value')"
            :help="$t('TTL value to use for actions.')"
            rules="irange(1,255)"
            :depend="s.target === 'TTL'"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="set_dscp"
            :label="$t('DSCP value')"
            :options="dscpOptions"
            :depend="s.target === 'DSCP'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="set_mark"
            :label="$t('Mark value')"
            placeholder="FF"
            rules="hexstring"
            :depend="s.target === 'MARK'"
            maxlength="7"
            required
          />
        </template>
        <template #advanced>
          <vuci-form-item-select
            :uci-section="s"
            name="family"
            :label="$t('Restrict to address family')"
            :help="$t('Only match traffic using the given IP family.')"
            :options="families"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="src_mac"
            :label="$t('Source MAC address')"
            rules="neg(macaddr)"
            :options="$network.getMacOptions(hints)"
            :placeholder="$t('Any')"
            multiple
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming from the given MAC address.')"
                :hints="e => [e.any(), e.macaddr(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="match"
            :label="$t('Match')"
            :help="$t('Match traffic against the given DSCP value or firewall mark.')"
            :options="matchOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="dscp"
            :label="$t('Set Match value')"
            :options="dscpOptions"
            :depend="s.match === 'DSCP'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="mark"
            :label="$t('Set Match value')"
            placeholder="FF"
            rules="hexstring"
            :depend="s.match === 'FWMARK'"
            maxlength="7"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="extra"
            :label="$t('Extra arguments')"
            :help="$t('Passes additional arguments to iptables. Use with care!')"
            rules="fieldvalidation('^[a-zA-Z0-9-\/!:.\, ]+$',0)"
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
import { computed, inject, ref } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './trafficRuleCommon'
import type { Rule } from '@/types/firewallTypes'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const { portDepends, weekdays, families, monthdays, checkDates, getActionHint, protoHints } = useFirewallCommon()

const { hints, zones } = inject(FormOptionKey) as FormOptions

export interface Props {
  section: Rule
}
const props = defineProps<Props>()
const formData = ref<FormModel>({ rules: [] })

const icmpTypes = [
  'echo-reply',
  'destination-unreachable',
  'network-unreachable',
  'host-unreachable',
  'protocol-unreachable',
  'port-unreachable',
  'fragmentation-needed',
  'source-route-failed',
  'network-unknown',
  'host-unknown',
  'network-prohibited',
  'host-prohibited',
  'TOS-network-unreachable',
  'TOS-host-unreachable',
  'communication-prohibited',
  'host-precedence-violation',
  'precedence-cutoff',
  'source-quench',
  'redirect',
  'network-redirect',
  'host-redirect',
  'TOS-network-redirect',
  'TOS-host-redirect',
  'echo-request',
  'router-advertisement',
  'router-solicitation',
  'time-exceeded',
  'ttl-zero-during-transit',
  'ttl-zero-during-reassembly',
  'parameter-problem',
  'ip-header-bad',
  'required-option-missing',
  'timestamp-request',
  'timestamp-reply',
  'address-mask-request',
  'address-mask-reply'
]
const dscpOptions = [
  ['0', $t('Default')],
  ['8', 'CS1'],
  ['10', 'AF11'],
  ['12', 'AF12'],
  ['14', 'AF13'],
  ['16', 'CS2'],
  ['18', 'AF21'],
  ['20', 'AF22'],
  ['22', 'AF23'],
  ['24', 'CS3'],
  ['26', 'AF31'],
  ['28', 'AF32'],
  ['30', 'AF33'],
  ['32', 'CS4'],
  ['34', 'AF41'],
  ['36', 'AF42'],
  ['38', 'AF43'],
  ['40', 'CS5'],
  ['46', 'EF'],
  ['48', 'CS6'],
  ['56', 'CS7']
]
const targets = [
  ['DROP', $t('Drop')],
  ['ACCEPT', $t('Accept')],
  ['REJECT', $t('Reject')],
  ['NOTRACK', $t('Do not track')],
  ['DSCP', $t('Change DSCP')],
  ['MARK', $t('Mark')],
  ['TTL', $t('Change TTL')],
  ['TCPMSS', $t('Clamp MSS'), () => props.section.proto?.length === 1 && props.section.proto?.[0] === 'tcp']
]
const matchOptions = [['', $t('-- Please choose --')], 'DSCP', ['FWMARK', $t('Mark')]]
const ttlActionOptions = [
  ['set', $t('Set')],
  ['increment', $t('Increment')],
  ['decrement', $t('Decrement')]
]
const tabs = [
  { name: 'general', title: $t('General Settings') },
  { name: 'advanced', title: $t('Advanced Settings') },
  { name: 'time', title: $t('Time Restrictions') }
]

const zoneOptions = computed(() => zones.value.map(zone => zone.name))
const srcZones = computed(() => [['', $t('Device (output)')], ['*', $t('Any zone (forward)')], ...zoneOptions.value])
const outZones = computed(() => [['', $t('Unspecified')], ['*', $t('Any zone')], ...zoneOptions.value])
const destZones = computed(() => [['', $t('Device (input)')], ['*', $t('Any zone (forward)')], ...zoneOptions.value])
</script>
