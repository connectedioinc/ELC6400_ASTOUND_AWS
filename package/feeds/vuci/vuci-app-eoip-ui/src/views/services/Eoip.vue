<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="afterLoad"
    config="eoip"
  >
    <vuci-typed-section
      type="eoip"
      :title="$t('EoIP configuration')"
      :columns="eoipColumns"
      :edit-form="editModal"
      data-key="eoip"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'eoip/config' }]"
      :table-actions="['column-list', 'search']"
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
import { ref, provide, markRaw } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import type { DeviceStatus } from '@/types/BridgeConfig'

import EditForm from './EoipEdit'

const $t = useTranslate()
const message = useMessages()
const editModal = markRaw(EditForm)

const bridges = ref<DeviceStatus[]>([])

const eoipColumns = ref([
  { name: 'name', label: $t('Name'), help: $t('Name of the EoIP instance.') },
  { name: 'enabled', label: $t('Enabled') },
  { name: 'tun_id', label: $t('Tunnel ID'), help: $t('Unique tunnel identifier, which must match other side of the tunnel.') },
  { name: 'local_ip', label: $t('Local IP'), help: $t('The parameter specifies the local IP address used as the source for sending traffic through a tunnel.') },
  { name: 'remote_ip', label: $t('Remote IP'), help: $t('The parameter specifies the IP address of the remote endpoint that the tunnel will connect to.') }
])

function afterLoad() {
  return axios
    .get('/api/basic/network/devices/bridge/status')
    .then(({ data }) => {
      bridges.value = data
    })
    .catch(() => {
      message.error($t('Failed to load bridge options'))
    })
}
provide('bridges', bridges)
</script>
