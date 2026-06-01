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
      :endpoints="[{ endpoint: 'firewall/port_forwards/config' }]"
      data-key="forwards"
      :name="section.id"
      :title="$utils.getModalTitle($t('port forward'), props.section.name)"
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
            :rules="['fieldvalidation(\'^[a-zA-Z0-9_ -]+$\')', () => $utils.validateNoDuplicates(formData.forwards, 'name', s.name, $t('Name'))]"
            maxlength="2048"
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
            :label="$t('Source zone')"
            :help="$t('Only match traffic coming to the given firewall zone.')"
            :zones="zones"
            :options="zoneOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="src_dport"
            :label="$t('External port')"
            rules="neg(portrange)"
            :options="$network.getPortOptions(['', $t('Any')])"
            :depend="portDepends(s) && !s.proto?.includes('all')"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming to the given port.')"
                :hints="e => [e.any(), e.portrange(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dest_ip"
            :label="$t('Internal IP address')"
            :options="$network.getIpOptions(hints, ['', $t('Any')])"
            rules="ipmask4"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Forward traffic to the given network address.')"
                :hints="e => [e.any(), e.ipmask4()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dest_port"
            :label="$t('Internal port')"
            rules="neg(portrange)"
            :depend="portDepends(s) && !s.proto?.includes('all')"
            :options="$network.getPortOptions(['', $t('No rewrite')])"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Forward traffic to the given port.')"
                :hints="e => [e.noRewrite($t('External port')), e.portrange(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
        </template>
        <template #advanced>
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
            name="src_ip"
            :label="$t('Source IP address')"
            :placeholder="$t('Any')"
            :options="$network.getIpOptions(hints)"
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
            :placeholder="$t('Any')"
            rules="neg(portrange)"
            :depend="portDepends(s)"
            :options="$network.getPortOptions()"
            allow-create
            multiple
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
            name="src_dip"
            :label="$t('External IP address')"
            :placeholder="$t('Any')"
            :options="$network.getIpOptions(hints, ['', $t('Any')])"
            rules="neg(ipmask4)"
            allow-create
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Only match traffic coming to the given network address.')"
                :hints="e => [e.any(), e.ipmask4(), e.neg()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-switch
            :uci-section="s"
            name="reflection"
            :label="$t('Enable NAT Loopback')"
            :help="
              $t(
                'NAT loopback a.k.a. NAT reflection a.k.a. NAT hairpinning is a method of accessing an internal server using a public IP. \
                    NAT loopback enables your local network (i.e., behind your NAT device) to connect to a forward-facing IP address of a machine that it also on your local network.'
              )
            "
            initial="1"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="helper"
            :label="$t('Conntrack helpers')"
            :help="$t('Explicitly choose connection tracking helper for port forward rule. It is needed if both external and internal ports are non-standard or auto helpers are turned off.')"
            :options="[['', zonesGlobal?.auto_helper === '1' ? $t('Auto') : $t('None')], ...helpers]"
          />
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
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, inject, ref } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './portForwardCommon'
import type { PortForward } from '@/types/firewallTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import { network } from '@/plugins/network'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const { portDepends, protoHints, helpers } = useFirewallCommon()

const { hints, zones, zonesGlobal } = inject(FormOptionKey) as FormOptions

export interface Props {
  section: PortForward
}
const props = defineProps<Props>()
const formData = ref<FormModel>({ forwards: [] })

const tabs = [
  { name: 'general', title: $t('General Settings') },
  { name: 'advanced', title: $t('Advanced Settings') }
]

const zoneOptions = computed(() => {
  return [['', network.zoneNames().other.unspecified], ...zones.value.map(zone => zone.name)]
})
</script>
