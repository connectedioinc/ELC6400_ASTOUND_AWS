<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="
      () => {
        timer.start()
      }
    "
    config="network"
  >
    <vuci-typed-section
      :uci-data="uciData"
      data-key="openconnect"
      :endpoints="[{ endpoint: 'openconnect/client/config' }]"
      type="interface"
      :title="$t('OpenConnect configuration')"
      :columns="deviceColumns"
      :edit-form="editModal"
      :table-actions="['column-list', 'search']"
    >
      <template #server="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="server"
          no-write
        />
      </template>
      <template #port="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          no-write
          name="port"
        />
      </template>
      <template #ipv4="{ s }">
        <tlt-dummy-value :value="getIPv(s.id, 4)" />
      </template>
      <template #ipv6="{ s }">
        <tlt-dummy-value :value="getIPv(s.id, 6)" />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          prop="id"
          :label="$t('New configuration name')"
          :help="
            $t(
              'Name of the new OpenConnect configuration. \
             Used for easier configurations management purpose only'
            )
          "
          rules="uciname"
          maxlength="8"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, markRaw, computed, provide } from 'vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import { useCertificatesStore } from '@/stores/certificates'
import { axios } from '@ui-core/plugins/axios'
import EditForm from './OpenConnectEdit'

interface InterfaceData {
  'ipv4-address': string
  'ipv6-address': string
}

interface Interfaces {
  [key: string]: InterfaceData
}

const $t = useTranslate()
const message = useMessages()
const certificatesStore = useCertificatesStore()

const interfaces = ref<Interfaces>({})

const timer = useTimer({
  method: updateInterfaces,
  time: 5000,
  autostart: false,
  immediate: true
})

const editModal = markRaw(EditForm)

const certificates = computed(() => certificatesStore.generatedCertificates)

const deviceColumns = computed(() => [
  {
    name: 'id',
    label: $t('Tunnel name'),
    help: $t('Name of the tunnel. Used for easier tunnels management purpose only.')
  },
  { name: 'server', label: $t('Server address') },
  { name: 'port', label: $t('Port') },
  {
    name: 'ipv4',
    label: 'IPv4'
  },
  {
    name: 'ipv6',
    label: 'IPv6'
  },
  { name: 'enabled', label: $t('Enabled') }
])

function updateInterfaces() {
  return axios
    .get('/api/openconnect/client/status')
    .then(response => {
      if (!response.success) {
        message.error($t('Failed to load OpenConnect data'))
        return
      }
      interfaces.value = response.data
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function getIPv(id: string, ipv: 4 | 6) {
  const item = interfaces.value[id]
  return item?.[`ipv${ipv}-address`] || '-'
}

function validateEnable(self: any) {
  const { uciSection: section } = self
  if (!section.enabled) {
    return true
  }
  const validations = [
    {
      field: 'server',
      messageText: $t('Server address is required')
    },
    {
      field: 'port',
      messageText: $t('Port address is required')
    }
  ]

  for (const { field, messageText } of validations) {
    if (!section[field]) {
      section.enabled = '0'
      return message.error(messageText)
    }
  }
}
provide('certificates', certificates)
</script>
