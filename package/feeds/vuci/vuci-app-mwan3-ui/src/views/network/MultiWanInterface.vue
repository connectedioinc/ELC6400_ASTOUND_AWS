<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mwan3"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :uci-data="uciData"
      type="interface"
      :title="$t('Interface')"
      :endpoints="[{ endpoint: 'failover/interfaces/config' }]"
      :edit-form="markRaw(EditForm)"
      :columns="ifaceColumns"
      data-key="mwanIfaces"
      :add-title="$t('Add new interface')"
      :table-actions="['column-list', 'search']"
    >
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #track_method-help>
        <hint-helper
          :main-hint="$t('Method of the interface.')"
          :hints="[
            {
              option: 'Ping',
              hint: $t('Uses ICMP ping to monitor connectivity.')
            },
            {
              option: 'Wget',
              hint: $t('Checks connectivity by making HTTP requests.')
            }
          ]"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.id"
          :label="$t('Interface')"
          :options="ifaceOptions"
          prop="id"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import EditForm from './MultiWanInterfaceEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'
import type { MwanInterface } from '@/types/mwanTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { network } from '@/plugins/network'
import { provideContext } from './MultiWanInterfaceCommon'

const $t = useTranslate()
const messages = useMessages()

const ifaceColumns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the interface.'),
    displayFn: (v: string, s: MwanInterface) => network.getInterfaceAndVpnName(interfaceStatus.value, v, 'name', v ?? s.id ?? '-')
  },
  {
    name: 'track_method',
    label: $t('Method'),
    displayFn: (v: string) => v || '-'
  },
  { name: 'enabled', label: $t('Enable'), help: $t('Enable the interface.') }
]

const formData = ref<{ mwanIfaces: MwanInterface[] }>({ mwanIfaces: [] })

const interfaceStatus = ref<InterfaceStatus[]>([])
async function afterLoad() {
  return axios
    .get('/api/interfaces/basic/status?include=vpn')
    .then(({ data }) => {
      interfaceStatus.value = data
    })
    .catch(() => messages.error($t('Failed to load interface status')))
}

provideContext({ interfaceStatus })

const availableIfaces = computed(() => {
  const interfaces = interfaceStatus.value.filter(iface => iface.area_type !== 'lan' && iface.id !== 'wan6')
  const nonDuplicate = interfaces.filter(iface => !formData.value.mwanIfaces.some(mwanIface => mwanIface.id === iface.id))
  return network.parseInterfaceAndVpnOptions(nonDuplicate, { useInterfaceId: true })
})

const ifaceOptions = computed(() => [...(availableIfaces.value.length ? [['', $t('-- Select an interface --')], ...availableIfaces.value] : [])])
</script>
