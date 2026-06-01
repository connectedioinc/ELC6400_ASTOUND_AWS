<template>
  <div class="text-body-secondary">
    <div class="font-semibold text-xl my-4">Regular Ports</div>
    <ports
      v-model="selectedPorts"
      :get-port-data="getPortData"
      :custom-ports="customPorts"
    />
    <div class="font-semibold text-xl my-4">Ports with single select</div>
    <ports
      v-model="selectedPort"
      :get-port-data="getPortData"
      selectable
      :custom-ports="customPorts"
    />

    <div class="font-semibold text-xl my-4">Ports with multi select</div>
    <ports
      v-model="selectedPorts"
      :get-port-data="getPortData"
      selectable
      multiple
      :custom-ports="customPorts"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { PortData } from '@ui-core/tlt-design/form/core/TltPort.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { TswPort } from '@/stores/main'
const $t = useTranslate()
function getPortData(name: string): PortData {
  const portData: Record<string, PortData> = {
    port1: {
      type: 'up',
      poe: 'enabled',
      extraIcon: { icon: 'aggregated', position: 'center', text: '2' }
    },
    port2: {
      type: 'down',
      poe: 'active',
      speed: 100,
      extraIcon: { icon: 'aggregated', position: 'center', text: '1' },
      error: $t('Physical damage was made to the port.')
    },
    port3: {
      type: 'enabled',
      poe: 'disabled',
      speed: 1000
    },
    port4: {
      type: 'disabled'
    },
    port5: {
      type: 't',
      extraIcon: { icon: 'circle', class: 'text-lime-300' },
      speed: 2500
    },
    port6: {
      type: 'u',
      extraIcon: { icon: 'circle', class: 'text-lime-300' }
    },
    port7: {
      type: 'up'
    },
    port8: {
      type: 'down',
      extraIcon: [
        { icon: 'aggregated', position: 'center', text: '1' },
        { icon: 'tooltip', class: 'text-theme-text-primary', legend: { id: 'info', type: 'icon', icon: 'tooltip', class: 'text-theme-text-primary', text: $t('Info'), hint: 'Hint' } }
      ]
    },
    sfp1: {
      type: 'down',
      extraIcon: { icon: 'x-circle', class: 'text-theme-text-danger' },
      dimmed: true
    },
    sfp2: {
      type: 'down',
      readonly: true
    }
  }
  const port = portData[name]
  port.hint = [
    { title: $t('Link speed'), info: 'GbE' },
    { title: $t('TX SUM'), info: '%MB'.format(12000) },
    { title: $t('RX SUM'), info: '%MB'.format(12000) },
    { title: $t('TX RATE'), info: '%MBps'.format(12000) },
    { title: $t('RX RATE'), info: '%MBps'.format(12000) }
  ]
  return port
}
const customPorts: TswPort[] = [
  { type: 'eth', name: 'port1', position: 'up', block: 'eth', num: '1' },
  { type: 'eth', name: 'port3', position: 'up', block: 'eth', num: '3' },
  { type: 'eth', name: 'port5', position: 'up', block: 'eth', num: '5' },
  { type: 'eth', name: 'port7', position: 'up', block: 'eth', num: '7' },
  { type: 'eth', name: 'port2', position: 'down', block: 'eth', num: '2' },
  { type: 'eth', name: 'port4', position: 'down', block: 'eth', num: '4' },
  { type: 'eth', name: 'port6', position: 'down', block: 'eth', num: '6' },
  { type: 'eth', name: 'port8', position: 'down', block: 'eth', num: '8' },
  { type: 'sfp', name: 'sfp1', position: 'down', block: 'sfp', num: '1' },
  { type: 'sfp', name: 'sfp2', position: 'up', block: 'sfp', num: '2' }
]
const selectedPorts = ref<string[]>([])
const selectedPort = ref<string[]>([])
</script>
