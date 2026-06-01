<template>
  <vuci-form
    v-slot="{ uciData }"
    config="wireless"
    :after-load="afterLoad"
    async-load
  >
    <vuci-typed-section
      :uci-data="uciData"
      :edit-form="markRaw(PPSKProfileEdit)"
      type="psk-group"
      :title="$t('PPSK Profiles')"
      :endpoints="[{ endpoint: 'wireless/ppsk/groups/config' }]"
      :columns="profileCols"
      data-key="wifiPpskGroups"
      :table-actions="['column-list', 'search']"
      :after-delete="(section: WifiPpskGroup) => (uciData.wifiStations = uciData.wifiStations.filter((station: WifiStation) => station.psk_group !== section.id))"
    />
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, markRaw, provide } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import PPSKProfileEdit from './PPSKProfileEdit.vue'
import type { WifiPpskGroup, WifiStation } from '@/types/wirelessTypes'
import type { Interface } from '@/types/networkTypes'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const profileCols = [{ name: 'description', label: $t('Group'), help: $t('Group to which the PSK belongs.') }]

const macHints = ref<[string, string][]>([])
const ifaceConfigs = ref<Interface[]>([])
function afterLoad() {
  return axios
    .bulkGet(['/wireless/stations/config', { endpoint: '/routes/status/mac_hints', condition: 'vuci-app-routes-api.control' }, { endpoint: '/interfaces/config', condition: store.isRouter }])
    .then(([stationsConfig, macHintsStatus, interfaceConfig]) => {
      if (!stationsConfig.success) message.error($t('Failed to load wireless stations configuration'))
      if (!macHintsStatus.success) message.error($t('Failed to load MAC address hints'))
      else macHints.value = macHintsStatus.data || []
      if (!interfaceConfig.success) message.error($t('Failed to load interface configuration'))
      else ifaceConfigs.value = interfaceConfig.data || []
      return { wifiStations: stationsConfig.data || [] }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      store.spin(false)
    })
}

provide('macHints', macHints)
provide('ifaceConfigs', ifaceConfigs)
</script>
