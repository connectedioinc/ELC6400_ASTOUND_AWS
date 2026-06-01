<template>
  <vuci-form
    v-slot="{ uciData }"
    config="jool"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'jool/rules/config' }]"
      :name="props.section.id"
      :title="$utils.getModalTitle('NAT64', props.section.name)"
      :uci-data="uciData"
      data-key="jool"
    >
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
        :rules="['fieldvalidation(\'^[a-zA-Z0-9_ -]+$\',0)', (v: string) => utils.validateNoDuplicates(uciData.jool, 'name', v, $t('name'))]"
        maxlength="64"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="proto"
        :label="$t('Protocol')"
        :options="network.getProtoOptions()"
        allow-create
        multiple
        @change="utils.mutuallyExclusiveValue(s, 'proto', 'all')"
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
        :label="$t('Source zone')"
        :help="$t('Only match traffic coming to the given firewall zone.')"
        :options="srcZones"
        :zones="zones"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="src_ipv6"
        :label="$t('Source IPv6 address')"
        :placeholder="$t('Any')"
        :options="hints.ipv6_hints.map(([ip]) => ip)"
        rules="neg(ipmask6)"
        multiple
        allow-create
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Source IPv6 address or network segment from which the traffic will be translated.')"
            :hints="e => [e.any(), e.ipmask6(), e.neg()]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="src_port"
        :label="$t('Source port')"
        :placeholder="$t('Any')"
        rules="neg(portrange)"
        :options="network.getPortOptions()"
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
        name="dest_ipv6"
        :label="$t('Destination IPv6 address')"
        :placeholder="$t('Any')"
        :options="hints.ipv6_hints.map(([ip]) => ip)"
        rules="neg(ipmask6)"
        maxlength="64"
        multiple
        allow-create
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Destination IPv6 address or network segment to which the traffic will be translated.')"
            :hints="e => [e.any(), e.ipmask6(), e.neg()]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="dest_ipv4"
        :label="$t('Destination IPv4 address')"
        :placeholder="$t('Any')"
        :options="hints.ipv4_hints.map(([ip]) => ip)"
        rules="neg(ipmask4)"
        multiple
        allow-create
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Destination IPv4 address or network segment to which the traffic will be translated.')"
            :hints="e => [e.any(), e.ipmask4(), e.neg()]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="dest_port"
        :label="$t('Destination port')"
        :placeholder="$t('Any')"
        :options="network.getPortOptions()"
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
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { JoolConfig } from '@/types/joolTypes'
import type { Zone } from '@/types/firewallTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'
import { network } from '@/plugins/network'
import { utils } from '@/plugins/utils'
import { ref, inject, computed } from 'vue'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'

const $t = useTranslate()
const { protoHints, portDepends } = useFirewallCommon()

const zones = inject('zones', ref<Zone[]>([]))
interface Hints {
  ipv4_hints: [string, string][]
  ipv6_hints: [string, string][]
}
const hints = inject<Hints>('hints', { ipv4_hints: [], ipv6_hints: [] })
const props = defineProps<{ section: JoolConfig }>()

const srcZones = computed(() => [['', $t('Device (output)')], ['*', $t('Any zone (forward)')], ...zones.value.map(zone => zone.name)])
</script>
