<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="eoip"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'eoip/config' }]"
      :title="$utils.getModalTitle('EoIP', props.section.name)"
      :uci-data="uciData"
      :name="props.section.id"
      data-key="eoip"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable current configuration.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Name of the EoIP instance.')"
        name="name"
        :rules="['fieldvalidation(\'^[a-zA-Z0-9_ ]+$\')', () => utils.validateNoDuplicates(formData.eoip, 'name', s.name, $t('name'))]"
        maxlength="64"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Tunnel ID')"
        :help="$t('Unique tunnel identifier, which must match other side of the tunnel.')"
        name="tun_id"
        placeholder="30"
        rules="irange(1,65536)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Use IPv6')"
        :help="$t('Use IPv6 address to create a tunnel.')"
        name="use_ipv6"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Local IP')"
        :help="$t('The parameter specifies the local IP address used as the source for sending traffic through a tunnel.')"
        name="local_ip"
        :placeholder="useIPv6 ? '0000:0000:0000:0000:0000:0000:0000:0000' : '0.0.0.0'"
        :rules="useIPv6 ? 'ip6addr' : 'ip4addr'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Dynamic')"
        :help="
          $t(
            'Allow the connection. If you enable it, be aware that there is no authorization and it is not secure. Avoid using this feature on a public IP or a network where you do not have full control over all hosts.'
          )
        "
        name="dynamic"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Remote IP')"
        :help="$t('The parameter specifies the IP address of the remote endpoint that the tunnel will connect to.')"
        name="remote_ip"
        :placeholder="useIPv6 ? '0000:0000:0000:0000:0000:0000:0000:0000' : '0.0.0.0'"
        :rules="useIPv6 ? 'ip6addr' : 'ip4addr'"
        :depend="s.dynamic === '0'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Bridge')"
        :help="$t('Assign an EoIP interface to a bridge.')"
        :options="bridgeOptions"
        name="to_bridge"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { inject, computed, ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { utils } from '@/plugins/utils'

const $t = useTranslate()

const bridges = inject('bridges', ref<DeviceStatus[]>([]))

export interface EoipConfig {
  id: string
  enabled?: '0' | '1'
  dynamic?: '0' | '1'
  local_ip?: string
  name: string
  tun_id: string
  use_ipv6: '0' | '1'
}

export interface Props {
  uciData: FormData
  section: EoipConfig
}

const props = defineProps<Props>()
const formData = ref<{ eoip: EoipConfig[] }>({ eoip: [] })

const bridgeOptions = computed(() => {
  const options = bridges.value.map(i => [i.id, i.description || i.name])
  return [['none', $t('None')], ...options]
})

const useIPv6 = computed(() => {
  return props.section.use_ipv6 === '1'
})
</script>
