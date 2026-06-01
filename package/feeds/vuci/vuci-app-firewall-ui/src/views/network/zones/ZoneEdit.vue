<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="firewall"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      data-key="zones"
      :endpoints="[{ endpoint: 'firewall/zones/config' }]"
      :after-save="
        () => {
          refreshZones(props.section)
        }
      "
    >
      <tlt-card
        :title="$utils.getModalTitle($t('zone'), props.section.name)"
        :help="
          $t(
            'This section defines common properties of %s. \
      The %s input %s and %s output %s options set the default policies for traffic entering and leaving this zone while the \
      %s forward %s option describes the policy for forwarded traffic between different networks within the zone. \
      %s Covered networks %s specifies which available networks are members of this zone.'
          ).format(section.name, '<em>', '</em>', '<em>', '</em>', '<em>', '</em>', '<em>', '</em>')
        "
        rawhtml
      >
        <tlt-tabs :tabs="tabs">
          <template #general>
            <vuci-form-item-input
              :uci-section="s"
              name="name"
              :label="$t('Name')"
              :help="$t('A custom name for the zone. Used for easier management purposes.')"
              :placeholder="$t('Name')"
              :rules="['uciname', () => $utils.validateNoDuplicates(formData.zones, 'name', s.name, $t('Name'))]"
              maxlength="11"
              required
            />
            <vuci-form-item-select
              :uci-section="s"
              name="input"
              :label="$t('Input')"
              :options="actions"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Default policy for traffic entering the zone.')"
                  :hints="() => getActionHint(false)"
                />
              </template>
            </vuci-form-item-select>
            <vuci-form-item-select
              :uci-section="s"
              name="output"
              :label="$t('Output')"
              :options="actions"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Default policy for traffic originating from and leaving the zone.')"
                  :hints="() => getActionHint(false)"
                />
              </template>
            </vuci-form-item-select>
            <vuci-form-item-select
              :uci-section="s"
              name="forward"
              :label="$t('Forwarding inside zone')"
              :options="actions"
            >
              <template #help>
                <hint-helper
                  :main-hint="$t('Default policy for traffic forwarded between the networks belonging to the zone.')"
                  :hints="() => getActionHint(false)"
                />
              </template>
            </vuci-form-item-select>
            <vuci-form-item-switch
              :uci-section="s"
              name="masq"
              :label="$t('Masquerading')"
              :help="
                $t(
                  'Turns Masquerading off or on. MASQUERADE is an iptables target that can be used instead of the SNAT \
                (source NAT) target when the external IP of the network interface is not known at the moment of writing the rule \
                (when the interface gets the external IP dynamically).'
                )
              "
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="masq6"
              :label="$t('IPv6 Masquerading')"
              :help="$t('Turns IPv6 Masquerading off or on.')"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="mtu_fix"
              :label="$t('MSS clamping')"
              :help="
                $t(
                  'Turns MSS clamping off or on. MSS clamping is a workaround used to change the maximum segment size (MSS) \
                of all TCP connections passing through links with an MTU lower than the Ethernet default of 1500.'
                )
              "
            />
            <vuci-form-item-select
              :uci-section="s"
              name="network"
              :label="$t('Covered networks')"
              :help="$t('Network or networks that belong to the zone.')"
              :options="$network.parseInterfaceAndVpnOptions(interfaceStatus)"
              :placeholder="$t('-- Please select --')"
              :rules="['uciname', validateNetwork]"
              multiple
            />
          </template>
          <template #advanced>
            <vuci-form-item-select
              :uci-section="s"
              name="family"
              :label="$t('Restrict to address family')"
              :help="$t('IP address family to which to zone will apply.')"
              :options="families"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="masq_src"
              :label="$t('Restrict Masquerading to given source subnets')"
              :help="$t('Applies Masquerading only to the specified source network/subnet.')"
              placeholder="0.0.0.0/0"
              :depend="['', 'ipv4'].includes(s.family)"
              rules="ipmask4"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="masq_dest"
              :label="$t('Restrict Masquerading to given destination subnets')"
              :help="$t('Applies Masquerading only to the specified destination network/subnet.')"
              rules="ipmask4"
              placeholder="0.0.0.0/0"
              :depend="['', 'ipv4'].includes(s.family)"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="conntrack"
              :label="$t('Force connection tracking')"
              :help="$t('Always maintains connection state (NEW, ESTABLISHED, RELATED) information.')"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="log"
              :label="$t('Enable logging')"
            >
              <template #help>
                {{ $t('Log dropped and rejected packets.') }}
                <br />
                <br />
                {{ $t('Logged packets can be found in') }}
                <router-link to="/system/maintenance/troubleshoot">{{ $t('System log') }} </router-link>.
              </template>
            </vuci-form-item-switch>
            <vuci-form-item-input
              :uci-section="s"
              name="log_limit"
              :label="$t('Limit log messages')"
              :help="$t('Limit how many messages can be logged in the span of 1 minute. For example, to log 50 packets per minute use: 50/minute.')"
              placeholder="10/minute"
              rules="loglimit"
              :depend="!!parseInt(s.log)"
            />
            <tlt-inline-message type="info">
              {{ $t('"Automatic helper assignment" is %s in').format(zoneGlobalConfig?.auto_helper === '1' ? $t('enabled') : $t('disabled')) }}
              <router-link to="/network/firewall/settings">{{ $t('Firewall Settings') }}</router-link
              >.
              {{ $t('Until "Conntrack helpers" are explicitly specified, %s conntrack helpers are used.').format(zoneGlobalConfig?.auto_helper === '1' ? $t('all') : $t('no')) }}
            </tlt-inline-message>
            <vuci-form-item-select
              id="helper"
              :uci-section="s"
              name="helper"
              :label="$t('Conntrack helpers')"
              :help="$t('Explicitly choses allowed connection tracking helpers for zone traffic.')"
              :placeholder="zoneGlobalConfig?.auto_helper === '1' ? $t('All') : $t('None')"
              :options="helpers"
              multiple
            />
          </template>
        </tlt-tabs>
      </tlt-card>
      <tlt-card
        :title="$t('Forwarding between zones')"
        :help="
          $t(
            'The options below control the forwarding policies between \
          this zone (%s) and other zones. %s Destination zones %s cover forwarded traffic %s originating from %s. \
          %s Source zones %s match forwarded traffic from other zones %s targeted at %s. \
          The forwarding rule is %s unidirectional %s e.g., a forward from lan to wan does %s not %s \
          imply a permission to forwad from wan to lan as well.'
          ).format(section.name, '<em>', '</em>', '<strong>', `${section.name} </strong>`, '<em>', '</em>', '<strong>', `${section.name} </strong>`, '<em>', '</em>', '<em>', '</em>')
        "
        class="max-md:border-none max-md:px-0!"
        rawhtml
      >
        <vuci-form-item-zone-select
          :uci-section="s"
          name="out"
          :label="$t('Allow forward to destination zones')"
          :help="$t('Allows forward traffic to specified destination zones. Destination zones cover forwarded traffic originating from this source zone.')"
          :options="zoneOptions"
          :zones="formData.zones"
          multiple
          rawhtml
        />
        <vuci-form-item-zone-select
          :uci-section="s"
          name="in"
          :label="$t('Allow forward from source zones')"
          :help="$t('Allows forward traffic to specified source zones. Source zones match forwarded traffic originating from other zones that is targeted at this zone.')"
          :options="zoneOptions"
          :zones="formData.zones"
          multiple
          rawhtml
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, inject, ref } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './ZonesCommon'
import type { Zone } from '@/types/firewallTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import HintHelper from '@/components/shared/HintHelper.vue'
import { network } from '@/plugins/network'

const $t = useTranslate()
const { actions, families, getActionHint, helpers } = useFirewallCommon()

const { interfaceStatus, refreshZones, zoneGlobalConfig } = inject(FormOptionKey) as FormOptions

export interface Props {
  section: Zone
}
const props = defineProps<Props>()
const formData = ref<FormModel>({ zones: [] })

const tabs = [
  { name: 'general', title: $t('General Settings') },
  { name: 'advanced', title: $t('Advanced Settings') }
]

const zoneOptions = computed(() => {
  return formData.value.zones.filter(zone => zone.name !== props.section.name).map(zone => zone.name)
})

function validateNetwork(values: string[]): { message: string; isValid: boolean } | { isValid: boolean } {
  for (const val of values) {
    const zone = formData.value.zones.find(zone => zone.id !== props.section.id && zone.network?.includes(val))
    if (zone) return { isValid: false, message: $t('Network "%s" is already used in "%s" zone').format(network.getInterfaceAndVpnName(interfaceStatus.value, val, 'name'), zone.name) }
  }
  return { isValid: true }
}
</script>
