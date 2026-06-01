<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="sim_idle_protection"
  >
    <vuci-typed-section
      :title="$t('SIM idle protection configuration')"
      :help="$t('Settings for SIM idle protection.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sim_idle_protection/config', sectionFilter: (s: SimIdleProtectionConfig) => s.modem === modem }]"
      data-key="sim_idle_protection"
      type="sim_idle_protection"
      :edit-form="simIdleProtectionEdit"
      :form-methods="['get', 'edit']"
      :table-actions="['column-list']"
      :columns="columns"
    >
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import simIdleProtectionEdit from './SimIdleProtectionEdit.vue'
import type { SimIdleProtectionConfig } from '@/types/mobileTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useRoute } from 'vue-router'
import { mobile } from '@/plugins/mobile'

const $t = useTranslate()
const route = useRoute()

interface FormData {
  sim_idle_protection: SimIdleProtectionConfig[]
}

const formData = ref<FormData>({ sim_idle_protection: [] })

const columns = [
  { name: 'sim', label: $t('SIM slot'), displayFn: (_: unknown, record: SimIdleProtectionConfig) => displaySimSlot(record) },
  { name: 'period', label: $t('Period'), help: $t('How often SIM idle protection will be performed.'), displayFn: (_: unknown, record: SimIdleProtectionConfig) => displayPeriod(record.period) },
  { name: 'day', label: $t('Day'), help: $t('Day when the action should occur.'), displayFn: (_: unknown, record: SimIdleProtectionConfig) => displayDay(record) },
  { name: 'time', label: $t('Time'), help: $t('Time (in 24-hour format) when the action should occur.') },
  { name: 'ip_type', label: $t('IP type'), help: $t('IP type to be used for ping.'), displayFn: (_: unknown, record: SimIdleProtectionConfig) => displayIpType(record.ip_type) },
  { name: 'host', label: $t('Host to ping'), help: $t('IP address of a host that will be pinged during the SIM idle protection action.') },
  { name: 'packet_size', label: $t('Ping package size'), help: $t('ICMP packet size in bytes.') },
  { name: 'count', label: $t('Ping requests'), help: $t('How many ping requests will be sent.') },
  { name: 'enable', label: $t('Enabled'), locked: true }
]

const modem = computed(() => {
  return route.path.split('/').at(-1)
})

function displaySimSlot(s: SimIdleProtectionConfig) {
  return 'SIM%s'.format(mobile.getSimLabel(s.position, s.esim_profile, s.modem))
}

function displayIpType(value: string) {
  return value === 'ipv6' ? 'IPv6' : 'IPv4'
}

function displayPeriod(value: string) {
  return value === 'month' ? $t('Month') : $t('Week')
}

function displayDay(record: SimIdleProtectionConfig) {
  if (record.period === 'week') {
    const weekday: Record<string, string> = {
      '1': $t('Monday'),
      '2': $t('Tuesday'),
      '3': $t('Wednesday'),
      '4': $t('Thursday'),
      '5': $t('Friday'),
      '6': $t('Saturday'),
      '0': $t('Sunday')
    }
    return weekday[record.weekday] || '-'
  } else {
    return record.day || '-'
  }
}
</script>
