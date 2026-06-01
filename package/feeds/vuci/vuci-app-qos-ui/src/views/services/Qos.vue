<template>
  <vuci-form
    v-slot="{ uciData }"
    config="qos"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :after-delete="afterDelete"
      data-key="qos"
      :endpoints="[{ endpoint: 'qos/interfaces/config' }]"
      type="interface"
      :title="$t('Interfaces')"
      :help="
        $t(
          'With QoS you can prioritize network\
        traffic selected by address, ports or services.'
        )
      "
      :columns="interfacesColumns"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #overhead="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="overhead"
        />
      </template>
      <template #download="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="download"
          rules="irange(100,4294967)"
        />
      </template>
      <template #upload="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="upload"
          rules="irange(100,4294967)"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.id"
          prop="id"
          :label="$t('Interface')"
          :options="interfaceOptions"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :uci-data="uciData"
      data-key="classify"
      :endpoints="[{ endpoint: 'qos/rules/config' }]"
      type="classify"
      :title="$t('Classification rules')"
      :columns="classifyColumns"
      :after-delete="afterDelete"
      :table-actions="['column-list', 'search']"
    >
      <template #target="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="target"
          initial="Normal"
          :options="targetOptions"
        />
      </template>
      <template #srchost="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="srchost"
          rules="ipmask4"
          allow-create
          :options="hostOptions"
        />
      </template>
      <template #dsthost="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="dsthost"
          rules="ipmask4"
          allow-create
          :options="hostOptions"
        />
      </template>
      <template #proto="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="proto"
          allow-create
          maxlenght="16"
          :options="protoOpts"
        />
      </template>
      <template #ports="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="ports"
          :options="portOpts"
          :rules="validatePorts"
          allow-create
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import type { Interface } from '@/types/networkTypes'
import type { NatOffloadingConfig } from '@/types/natOffloadingTypes'
import { useNatOffloadingAlert } from '@/composables/useNatOffloadingAlert'
import { network } from '@/plugins/network'

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()

const interfacesColumns = [
  {
    name: 'name',
    label: $t('Interface Name')
  },
  {
    name: 'overhead',
    label: $t('Calculate overhead'),
    help: $t('Check to decrease upload and download ratio to prevent link saturation.')
  },
  {
    name: 'download',
    label: $t('Download speed (kbit/s)'),
    help: $t('Specify maximal download speed.')
  },
  {
    name: 'upload',
    label: $t('Upload speed (kbit/s)'),
    help: $t('Specify maximal upload speed.')
  },
  {
    name: 'enabled',
    label: $t('Enabled')
  }
]
const classifyColumns = [
  {
    name: 'target',
    label: $t('Target'),
    help: $t('Select target for which rule will be applied.')
  },
  {
    name: 'srchost',
    label: $t('Source host'),
    help: $t(`Packets matching this source host(s)
          (single IP or in CIDR notation) belong to the bucket
          defined in target`)
  },
  {
    name: 'dsthost',
    label: $t('Destination host'),
    help: $t(`Packets matching this destination host(s)
          (single IP or in CIDR notation) belong to the
          bucket defined in the target`)
  },
  {
    name: 'proto',
    label: $t('Protocol'),
    help: $t('Select data transmission protocol.')
  },
  {
    name: 'ports',
    label: $t('Ports'),
    help: $t('Select which ports will be used for transmission.')
  }
]
const protoOpts = [
  ['', $t('All')],
  ['tcp', $t('TCP')],
  ['udp', $t('UDP')],
  ['icmp', $t('ICMP')]
]
const portOpts = [['', $t('All')]]

const targetOptions = ref<string[]>([])

const interfaceData = ref<Interface[]>([])
const interfaceOptions = computed<string[]>(() =>
  interfaceData.value.filter(s => ['dhcp', 'static', 'wwan', 'connm'].includes(s.proto) && !s.device?.startsWith('rmnet')).map((e: Interface) => network.getName(e))
)

const offloadingConfig = ref<Partial<NatOffloadingConfig>>({})
useNatOffloadingAlert(offloadingConfig, 'QoS')

const hostData = ref<string[]>([])
const hostOptions = computed(() => [['', $t('All')], ...hostData.value])

function afterDelete(_arg: any, _arg2: any, self: any) {
  self.reloadData()
}

function afterLoad() {
  return axios
    .bulkGet(['/api/interfaces/config', '/api/qos/rules/options', { endpoint: '/api/nat_offloading/global', condition: !!store.board.hwinfo.nat_offloading }])
    .then(([interfaceRequest, qosOptionRequest, offloadingRequest]) => {
      if (interfaceRequest.success) interfaceData.value = interfaceRequest.data
      else message.error($t('Failed to load network interfaces'))
      if (offloadingRequest.success) offloadingConfig.value = offloadingRequest.data
      else message.error($t('Failed to load NAT offloading data'))

      if (qosOptionRequest.success) {
        hostData.value = qosOptionRequest.data.ips
        targetOptions.value = qosOptionRequest.data.classes
      } else {
        message.error($t('Failed to load QoS rules'))
      }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}
/**
 * Validates port range, that must be from 1 to 65535.
 */
function validatePorts(value: string): { isValid: false; message: string } | { isValid: true } {
  const isValid = { isValid: true } as const
  const notValid = {
    isValid: false,
    message: $t(`Port range must be from 1 to 65535 and only positive integers.
        Ports must be separated by commas e.g., 20,30,40...`)
  } as const
  if (value.match(/^\d+$/)) {
    if (Number(value) < 1 || Number(value) > 65535) return notValid
    return isValid
  }
  if (value.match(/^[,\d+]+$/)) {
    for (const splitObj of value.split(',')) {
      if (!splitObj) return notValid
      if (Number(splitObj) < 1 || Number(splitObj) > 65535) return notValid
    }
    return isValid
  }
  return notValid
}
</script>
