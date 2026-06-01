<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="sim_idle_protection"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('idle protection'), `SIM${$mobile.getSimLabel(section.position, section.esim_profile, section.modem)}`)"
      :help="$t('Settings for SIM idle protection.')"
      :uci-data="uciData"
      :name="section.id"
      :endpoints="[{ endpoint: 'sim_idle_protection/config' }]"
      data-key="sim_idle_protection"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enable"
        :label="$t('Enable')"
        :help="$t('Turns SIM idle protection on or off.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="period"
        :label="$t('Period')"
        :help="$t('How often SIM idle protection will be performed. Use the two following fields (\'Day\' and \'Time\') to set the exact time of the action.')"
        :options="periodOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Day')"
        :help="$t('Day when the action should occur.')"
        :name="s.period === 'month' ? 'day' : 'weekday'"
        :options="dayOpts"
        rules="uinteger"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="time"
        :label="$t('Time')"
        :help="$t('Time (in 24-hour format) when the action should occur.')"
        rules="time"
        placeholder="12:00"
        initial="12:00"
        :required="s.enable === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('IP type')"
        :help="$t('IP type to be used for ping.')"
        name="ip_type"
        :options="ipTypes"
        @change="utils.validate"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="host"
        :label="$t('Host to ping')"
        :help="$t('IP address of a host that will be pinged during the SIM idle protection action.')"
        :rules="s.ip_type === 'ipv4' ? 'ipv4host' : 'ipv6host'"
        :placeholder="s.ip_type === 'ipv4' ? '127.0.0.1' : '0000:0000:0000:0000:0000:0000:0000:0001'"
        initial="127.0.0.1"
        :required="s.enable === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="packet_size"
        :label="$t('Ping package size')"
        :help="$t('ICMP packet size in bytes.')"
        rules="range(1,1000)"
        placeholder="56"
        :required="s.enable === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="count"
        :label="$t('Ping requests')"
        :help="$t('How many ping requests will be sent.')"
        rules="range(1,30)"
        placeholder="2"
        :required="s.enable === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SimIdleProtectionConfig } from '@/types/mobileTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { utils } from '@/plugins/utils'

const $t = useTranslate()

interface Props {
  section: SimIdleProtectionConfig
}
const props = defineProps<Props>()

interface FormData {
  sim_idle_protection: SimIdleProtectionConfig[]
}

const formData = ref<FormData>({ sim_idle_protection: [] })

const periodOptions = [
  ['month', $t('Month')],
  ['week', $t('Week')]
]

const ipTypes = [
  ['ipv4', 'IPv4'],
  ['ipv6', 'IPv6']
]

const dayOpts = computed(() => {
  if (props.section.period === 'week') {
    return [
      ['1', $t('Monday')],
      ['2', $t('Tuesday')],
      ['3', $t('Wednesday')],
      ['4', $t('Thursday')],
      ['5', $t('Friday')],
      ['6', $t('Saturday')],
      ['0', $t('Sunday')]
    ]
  } else {
    return Array.from({ length: 31 }, (_, i) => [`${i + 1}`, `${i + 1}`])
  }
})
</script>
