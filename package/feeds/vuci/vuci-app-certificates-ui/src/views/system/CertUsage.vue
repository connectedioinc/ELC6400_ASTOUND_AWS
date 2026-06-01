<template>
  <tlt-hint v-if="hasUsages">
    <template #hintBox>
      <div class="flex flex-col">
        <span class="mb-2">
          {{ $t('This file is used in the following services and their instances:') }}
        </span>
        <div
          v-for="group in groupedServices"
          :key="group.service"
        >
          <span class="font-bold">{{ group.service }}:</span>
          <span
            v-for="(instanceItem, index) in group.instances"
            :key="instanceItem.name"
            class="font-semibold ml-1 mb-2"
          >
            <router-link
              v-if="instanceItem.route"
              v-slot="{ href, navigate }"
              :to="instanceItem.route"
              custom
            >
              <a
                :href="href"
                class="no-underline text-theme-text-primary! font-semibold"
                @click="navigate"
              >
                {{ instanceItem.name }}
              </a>
            </router-link>
            <span
              v-else
              class="text-theme-text-primary"
            >
              {{ instanceItem.name }}
            </span>
            <span v-if="index < group.instances.length - 1">, </span>
          </span>
        </div>
      </div>
    </template>
    <tlt-icon
      icon="info"
      class="text-theme-text-primary size-5"
    />
  </tlt-hint>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { capitalize } from '@ui-core/plugins/helper'
import { getPrettyPortId } from '@/plugins/ports'
import { useMainStore } from '@/stores/main'

interface Props {
  record: {
    services?: string[]
  }
}

const props = withDefaults(defineProps<Props>(), {
  record: () => ({ services: [] })
})

const $t = useTranslate()
const store = useMainStore()

const hasUsages = computed(() => {
  return props.record.services && props.record.services.length > 0
})

const serviceMap: { [key: string]: string } = {
  uhttpd: $t('Access Control'),
  openvpn: 'OpenVPN',
  ipsec: 'IPsec',
  openconnect: 'OpenConnect',
  sstp: 'SSTP',
  tinc: 'Tinc',
  chilli: $t('Hotspot'),
  emailrelay: $t('Email relay'),
  stunnel: 'Stunnel',
  user_groups: $t('User groups'),
  dot1x: store.hasPackages('dot1x-client.control') && store.hasPackages(['dsa-dot1x-server.control', 'dot1x-server.control'], false) ? '802.1X' : '802.1X %s'.format($t('client')),
  smpp: 'SMPP',
  io_juggler: $t('I/O Juggler'),
  mqtt: 'MQTT',
  mqtt_bridge: 'MQTT',
  mqtt_pub: 'MQTT',
  event_juggler: $t('Event juggler'),
  data_sender: $t('Data to Server'),
  data_sender_output: $t('Data to Server'),
  canbus_gateway: $t('CAN Bus Gateway'),
  easycwmp: 'TR-069'
}

const instanceMap: { [key: string]: string } = {
  'uhttpd:main': $t('HTTPS configuration'),
  'smpp:smpp': $t('SMPP server configuration'),
  'mqtt:mqtt': $t('MQTT Broker'),
  'mqtt_pub:mqtt_pub': $t('MQTT publisher'),
  'easycwmp:tr069': $t('TR-069 client configuration')
}

const serviceRouteMap: { [key: string]: string } = {
  uhttpd: '/system/admin/access_control/general?edit=HTTPS',
  openvpn: '/services/vpn/openvpn?edit=',
  ipsec: '/services/vpn/ipsec?edit=',
  openconnect: '/services/vpn/openconnect?edit=',
  sstp: '/services/vpn/sstp?edit=',
  tinc: '/services/vpn/tinc?edit=',
  chilli: '/services/hotspot/general?edit=',
  emailrelay: '/services/email_relay?edit=',
  stunnel: '/services/vpn/stunnel?edit=',
  user_groups: '/system/admin/group/email?edit=',
  dot1x: store.board?.hwinfo.access_point
    ? '/network/dot1x_client'
    : `/network/ports/port_security${store.hasPackages('dot1x-client.control') && store.hasPackages(['dsa-dot1x-server.control', 'dot1x-server.control'], false) ? '/general' : '_client'}#`,
  smpp: '/services/mobile_utilities/smpp',
  io_juggler: '/services/io/juggler/action?edit=',
  mqtt: '/services/mqtt/broker',
  mqtt_bridge: '/services/mqtt/broker?edit=',
  mqtt_pub: '/services/mqtt/publisher',
  event_juggler: '/services/event_juggler?edit=',
  data_sender: '/services/data_sender?edit=',
  data_sender_output: '/services/data_sender#output=',
  easycwmp: '/services/tr069',
  canbus_gateway: '/services/canbus/gateway?edit='
}

const groupedServices = computed(() => {
  if (!props.record.services) return []
  const groups: { [key: string]: Array<{ name: string; route?: string }> } = {}
  props.record.services.forEach(serviceInstance => {
    const [service, instance] = serviceInstance.split(':')
    const serviceName = serviceMap[service.toLowerCase()] || capitalize(service)
    if (!groups[serviceName]) groups[serviceName] = []
    const specificInstanceName = instanceMap[serviceInstance]
    const routePattern = serviceRouteMap[service.toLowerCase()]
    let instanceName = specificInstanceName || instance
    const prefixes = ['_wan', '_lan', 'port', 'sfp']
    if (!specificInstanceName && prefixes.some(prefix => instance?.startsWith(prefix))) {
      instanceName = getPrettyPortId(instance)
    }
    const needsInstanceAppend = !specificInstanceName && !store.board?.hwinfo.access_point
    const route = routePattern && needsInstanceAppend ? `${routePattern}${instance}` : routePattern
    groups[serviceName].push({ name: instanceName, route })
  })
  return Object.entries(groups).map(([service, instances]) => ({ service, instances }))
})
</script>
