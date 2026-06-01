<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="mwan3"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="props.section.id"
      :title="$utils.getModalTitle($t('rule'), props.section.name)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'failover/rules/config' }]"
      data-key="mwanRules"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the rule.')"
        :rules="['uciname', () => $utils.validateNoDuplicates(uciData.mwanRules, 'name', s.name, $t('name'))]"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="proto"
        :label="$t('Protocol')"
        :help="$t('Match traffic using the given protocol. View the content of /etc/protocols for protocol description.')"
        :rmempty="false"
        initial="all"
        :options="protocolOptions"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="src_ip"
        :label="$t('Source address')"
        :help="$t('Supports CIDR notation, (e.g., 192.168.100.0/24).')"
        placeholder="192.168.100.0/24"
        rules="ipmask4"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="src_port"
        :label="$t('Source port')"
        :help="$t('May be entered as a single port or as portrange (e.g., 1024-2048).')"
        placeholder="80"
        rules="portrange"
        :depend="s.proto === 'tcp' || s.proto === 'udp'"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="dest_ip"
        :label="$t('Destination address')"
        :help="$t('Supports CIDR notation (e.g., 192.168.100.0/24).')"
        placeholder="192.168.100.0/24"
        rules="ipmask4"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="dest_port"
        :label="$t('Destination port')"
        :help="$t('May be entered as a single port or as portrange (e.g., 1024-2048).')"
        placeholder="80"
        rules="portrange"
        :depend="s.proto === 'tcp' || s.proto === 'udp'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="sticky"
        :label="$t('Sticky')"
        :help="$t('Traffic from the same source IP address that previously matched this rule within the sticky timeout period will use the same WAN interface.')"
        initial="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timeout"
        :label="$t('Sticky timeout')"
        :help="$t('Seconds. Acceptable values: 1-1000000. Defaults to 600 if not set.')"
        placeholder="600"
        rules="irange(1, 1000000)"
        :depend="s.sticky === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="use_policy"
        :label="$t('Policy assigned')"
        :help="$t('Specifies the policy applied to matching traffic.')"
        :options="policyOptions"
        :rules="checkPolicyMembers"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { ref, computed } from 'vue'
import type { MwanPolicy, MwanRule } from '@/types/mwanTypes'
import { mwan } from '@/plugins/mwan'

const $t = useTranslate()

const props = defineProps<{ section: MwanRule }>()

const formData = ref<{ mwanPolicies: MwanPolicy[] }>({ mwanPolicies: [] })
const protocolOptions = [
  ['all', $t('All')],
  ['tcp', 'TCP'],
  ['udp', 'UDP'],
  ['icmp', 'ICMP'],
  ['esp', 'ESP']
]

const policyOptions = computed(() => [...formData.value.mwanPolicies.map(policy => [policy.id, policy.name]), ...mwan.staticPolicyOpts()])

function checkPolicyMembers(value: string) {
  if (mwan.staticPolicyOpts().some(([opt]) => opt === value)) return { isValid: true }
  const policy = formData.value.mwanPolicies.find(p => p.id === value) ?? { use_member: [] }
  return {
    isValid: policy.use_member?.length > 0,
    message: $t('Specified policy should have at least one member before being assigned to the rule')
  }
}
</script>
