<template>
  <vuci-form
    ref="vuciFormRef"
    v-slot="{ uciData }"
    config="system"
    :after-load="getStatus"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="general"
      :endpoints="[{ endpoint: 'troubleshoot/config' }]"
      data-key="troubleshoot_system"
    >
      <tlt-card :title="$t('TCP dump')">
        <vuci-form-item-switch
          :uci-section="s"
          name="tcp_dump"
          :title="$t('TCP dump')"
          :label="$t('Enable TCP dump')"
          :help="$t('Turns TCP dump packet capture on or off.')"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="tcp_dump_interface"
          :label="$t('Select interface')"
          :help="$t('Only captures packets that move through the specified network interface.')"
          :options="interfaceOptions"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="tcp_dump_filter"
          :label="$t('Select protocol filter')"
          :help="$t('Only captures packets that match the specified protocol.')"
          :options="protoOptions"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="tcp_host"
          :label="$t('Host')"
          :help="$t('Only captures packets related to the specified host.')"
          rules="host"
          :options="$network.getIpOptions(ipv4_hints, ['', $t('All')])"
          allow-create
        />
        <vuci-form-item-select
          :uci-section="s"
          name="tcp_port"
          :label="$t('Port')"
          :help="$t('Only captures packets related to the specified port.')"
          rules="port"
          :options="$network.getPortOptions(['', $t('All')])"
          allow-create
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          :label="$t('Select packets direction')"
          :help="$t('Only captures packets coming from the specified direction.')"
          name="tcp_inout"
          initial="inout"
          :options="inoutOptions"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="tcp_mount"
          :label="$t('Select storage')"
          :help="$t('Specifies where the TCP dump file will be stored.')"
          :options="mountOptions"
        />
        <vuci-form-item-button
          :uci-section="s"
          name="getTcpDump"
          :label="$t('TCP dump file')"
          :help="
            $t(`Downloads the device's TCP dump file. TCP dump is a program used to capture packets moving through network interfaces.
                    By default, the device does not store TCP dump information.
                    You must enable TCP dump and save the changes before you can download the file.`)
          "
          :text="$t('Download')"
          :disabled="disableLogs"
          @click="downloadTcpDump"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { utils } from '@/plugins/utils'
import { network } from '@/plugins/network'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import type { InterfaceStatus } from '@/types/networkTypes'
import * as ports from '@/plugins/ports'
import type { DeviceStatus } from '@/types/networkDeviceTypes'

interface InoutOption {
  value: string
  name: string
}

interface Mount {
  mountpoint: string
}

const store = useMainStore()
const $t = useTranslate()
const message = useMessages()

const vuciFormRef = useTemplateRef<typeof VuciForm>('vuciFormRef')
const networkDevices = ref<DeviceStatus[]>([])
const interfaces = ref<InterfaceStatus[]>([])
const mounts = ref<Mount[]>([])
const inoutOptions = ref<InoutOption[]>([
  {
    value: 'inout',
    name: $t('Incoming / Outgoing')
  },
  {
    value: 'in',
    name: $t('Incoming')
  },
  {
    value: 'out',
    name: $t('Outgoing')
  }
])

const protoOptions = [
  ['', $t('All')],
  ['icmp', 'ICMP'],
  ['tcp', 'TCP'],
  ['udp', 'UDP'],
  ['arp', 'ARP']
]

const tcpDumpErrors = {
  1: $t('TCP dump is not enabled'),
  2: $t('No TCP dump file location specified'),
  default: $t('Failed to generate TCP dump file')
}

const mountOptions = computed(() => {
  const options = mounts.value.map(mount => [mount.mountpoint, mount.mountpoint])
  options.unshift(['/tmp', $t('RAM memory')])
  return options
})

const disableLogs = computed(() => {
  return vuciFormRef.value?.initialForm?.troubleshoot_system[0].tcp_dump === '0'
})

const interfaceOptions = computed(() => {
  const separatePorts = filterPorts(networkDevices.value)
  const interfaceOpts = network.interfaceOptions(interfaces.value)
  const interfaceNames = new Set(interfaceOpts?.map((tuple: any) => tuple[0]) || [])
  const uniquePorts = separatePorts.filter(port => !interfaceNames.has(port[0]))
  return [['any', $t('All')], ...interfaceOpts, ...uniquePorts]
})

const ipv4_hints = ref<[string, string][]>([])

function getStatus() {
  const requests = [
    '/api/interfaces/basic/status',
    { endpoint: '/api/basic/network/devices/status', condition: store.board?.hwinfo.dsa || store.isSwitch },
    { endpoint: '/api/usb_tools/mount/options', condition: 'vuci-app-usb-tools-api.control' },
    '/api/routes/status/ipv4_hints'
  ]
  return axios
    .bulkGet(requests)
    .then(([interfaceResponse, networkDevicesResponse, mountResponse, ipv4Hints]) => {
      if (interfaceResponse.success) interfaces.value = interfaceResponse.data
      else message.error($t('Failed to load interfaces'))
      if (networkDevicesResponse.success) networkDevices.value = networkDevicesResponse.data
      else message.error($t('Failed to load network devices'))
      if (mountResponse.success) mounts.value = mountResponse.data
      else message.error($t('Failed to load mounts'))
      if (ipv4Hints.success) ipv4_hints.value = ipv4Hints.data
      else message.error($t('Failed to load IPv4 hints data'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function filterPorts(devices: DeviceStatus[]) {
  return devices
    .filter(port => port.name !== 'lo' && port.name !== 'eth0')
    .map(i => [i.name, store.isSwitch && i.type === 'ethernet' ? ports.getPrettyPortId(i.id) : i.name])
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
}

function parseTcpDumpError(errorCode: number) {
  return tcpDumpErrors[errorCode as keyof typeof tcpDumpErrors] || tcpDumpErrors.default
}

function downloadTcpDump() {
  store.spin($t('Generating file'))
  return utils
    .downloadFileApi('/api/troubleshoot/actions/download', 'application/x-tar', 'POST', { type: 'tcpdump' }, true)
    .catch((error: any) => {
      if (error.response?.data?.errors) {
        message.error(parseTcpDumpError(error.response.data.errors[0].code))
      } else {
        message.error($t('Failed to generate file'))
      }
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
