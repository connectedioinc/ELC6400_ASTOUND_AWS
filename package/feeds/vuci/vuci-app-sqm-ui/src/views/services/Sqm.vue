<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formModel"
    config="sqm"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('Smart queue management')"
      :columns="sqmColumns"
      type="queue"
      :uci-data="uciData"
      :edit-form="markRaw(sqmEdit)"
      :endpoints="[{ endpoint: 'sqm/config' }]"
      data-key="sqm"
      :help="$t('With SQM (smart queue management) you can enable traffic shaping.')"
      :error-handlers="{
        edit: handleErrors
      }"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #interface="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="interface"
        />
      </template>
      <template #download="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="download"
        />
      </template>
      <template #upload="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="upload"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('SQM Name')"
          prop="id"
          required
          :help="$t('Name of the new sqm.')"
          maxlength="16"
          rules="uciname"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { markRaw, provide, ref } from 'vue'
import sqmEdit from './SqmEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import type { DeviceStatus } from '@/types/networkDeviceTypes'
import type { WifiInterfaceStatus } from '@/types/wirelessTypes'
import type { Interface, InterfaceStatus } from '@/types/networkTypes'
import { FormOptionKey, type FormData } from './SqmCommon'
import type { NatOffloadingConfig } from '@/types/natOffloadingTypes'
import { useNatOffloadingAlert } from '@/composables/useNatOffloadingAlert'

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()

const formModel = ref<FormData>({ sqm: [] })

const sqmColumns = [
  {
    name: 'name',
    label: $t('SQM Name'),
    help: $t('Name of the SQM configuration. Used for easier management purpose only.')
  },
  {
    name: 'interface',
    label: $t('Interface Name')
  },
  {
    name: 'download',
    label: $t('Download speed (kbit/s)')
  },
  {
    name: 'upload',
    label: $t('Upload speed (kbit/s)')
  },
  {
    name: 'enabled',
    label: $t('Enabled')
  }
]

const offloadingConfig = ref<Partial<NatOffloadingConfig>>({})
useNatOffloadingAlert(offloadingConfig, 'SQM')

function handleErrors(error: any) {
  const failedSections: string[] = []
  error.payload.forEach((e: any) => {
    failedSections.push(e.errors[0].section)
  })
  if (failedSections.length === 1) {
    return $t("Saving failed: SQM instance '%s' cannot be enabled due to invalid configuration").format(failedSections[0])
  }
  return $t("Saving failed: SQM instances: '%s' cannot be enabled due to invalid configuration").format(failedSections.join(', '))
}

function showErr(subject: string) {
  message.error($t('Failed to load %s data').format(subject))
  return []
}

const deviceData = ref<DeviceStatus[]>([])
const wirelessData = ref<WifiInterfaceStatus[]>([])
const interfacesConfig = ref<Interface[]>([])
const interfaceStatus = ref<InterfaceStatus[]>([])
const fqCodel = ref<string[]>([])
const cake = ref<string[]>([])
const ipv4Hints = ref<[string, string][]>([])
function loadData() {
  return axios
    .bulkGet([
      { endpoint: '/api/wireless/interfaces/basic/status', condition: 'vuci-app-wireless-api.control' },
      '/api/sqm/options',
      '/api/interfaces/config',
      '/api/interfaces/basic/status',
      '/api/basic/network/devices/status',
      { endpoint: '/api/nat_offloading/global', condition: !!store.board!.hwinfo.nat_offloading },
      '/api/routes/status/ipv4_hints'
    ])
    .then(([wireless, sqm, ifaceConfig, iface, device, offloading, hints]) => {
      deviceData.value = device.success ? device.data : showErr($t('device'))
      wirelessData.value = wireless.success ? wireless.data : showErr($t('wireless'))
      fqCodel.value = sqm.success ? sqm.data.fq_codel : showErr($t('SQM options'))
      cake.value = sqm.success ? sqm.data.cake || [] : showErr($t('SQM options'))
      interfacesConfig.value = ifaceConfig.success ? ifaceConfig.data : showErr($t('interfaces config'))
      interfaceStatus.value = iface.success ? iface.data : showErr($t('interfaces status'))
      offloadingConfig.value = offloading.success ? offloading.data : showErr($t('NAT offloading'))
      ipv4Hints.value = hints.success ? hints.data : showErr($t('host hints'))
    })
}
provide(FormOptionKey, {
  deviceData,
  wirelessData,
  interfacesConfig,
  interfaceStatus,
  fqCodel,
  cake,
  ipv4Hints
})
</script>
