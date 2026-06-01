<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      data-key="vrf"
      type="interface"
      :uci-data="uciData"
      :title="$t('VRF')"
      :endpoints="[{ endpoint: 'vrf/config' }]"
      :columns="columns"
      :edit-form="markRaw(VRFEdit)"
      :row-actions="(s: Vrf) => ['edit', { id: 'delete', buttonProps: { readonly: usedInBgp(s) }, hints: deleteHints(s) }]"
      :table-actions="['column-list', 'search']"
      :global-settings-form="markRaw(VRFGlobalEdit)"
    >
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { markRaw, ref } from 'vue'
import VRFEdit from './VRFEdit.vue'
import { provideContext, type FormModel, type Vrf } from './VrfCommon'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useTimer } from '@ui-core/composables/useTimer'
import VRFGlobalEdit from './VRFGlobalEdit.vue'

const message = useMessages()
const $t = useTranslate()

const formData = ref<FormModel>({ vrf: [], global: {} })

const columns = [
  { name: 'name', label: $t('Name'), help: $t('Name of the interface.') },
  {
    name: 'table',
    label: $t('Table'),
    help: $t('Unique routing table.'),
    displayFn: (v: Vrf['table']) => v || '-'
  },
  {
    name: 'link',
    label: $t('Link'),
    help: $t('Devices which will be used for routing and forwarding.'),
    displayFn: getLinkNames
  },
  { name: 'enabled', label: $t('Enable') }
]

const bgp = ref<any[]>([])
function usedInBgp(s: Vrf) {
  return bgp.value.some(x => x.vrf === s.id)
}
function deleteHints(s: Vrf) {
  return usedInBgp(s) ? [{ info: $t("This instance can't be deleted because it is used in BGP configuration") }] : []
}

const devices = ref<DeviceStatus[]>([])
function getLinkNames(values?: string[]) {
  if (!values?.length) return '-'
  return values.map(v => devices.value.find(d => d.name === v)?.description || v).join(', ')
}

provideContext({ devices, getLinkNames })

function afterLoad(): Promise<Partial<FormModel> | void> {
  return axios
    .bulkGet(['/api/basic/network/devices/status', { endpoint: '/api/bgp/instance/config', condition: 'frr-bgpd.control' }])
    .then(([_devices, _bgp]) => {
      if (!_devices.success) message.error($t('Failed to load devices data'))
      else devices.value = _devices.data
      if (!_bgp.success) message.error($t('Failed to load BGP data'))
      else bgp.value = _bgp.data
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      timer.start()
    })
}

const timer = useTimer({ method: getStatus, autostart: false, immediate: false })
function getStatus() {
  return axios
    .get('/api/basic/network/devices/status')
    .then(({ data }) => {
      devices.value = data
    })
    .catch(() => {
      message.error($t('Failed to load devices data'))
    })
}
</script>
