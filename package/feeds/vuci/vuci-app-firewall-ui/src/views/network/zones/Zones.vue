<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="firewall"
    :after-load="afterLoad"
    async-load
  >
    <vuci-typed-section
      :uci-data="uciData"
      data-key="zones"
      :endpoints="[{ endpoint: 'firewall/zones/config' }]"
      :title="$t('Zones')"
      type="zone"
      :columns="zoneColumns"
      :edit-form="markRaw(EditForm)"
      :after-delete="refreshZones"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <div class="flex flex-wrap gap-1 items-center justify-start">
          <zone-badge
            :name="s.name"
            :zone-networks="s.network ?? undefined"
          />
          ⇒
          <zone-badge
            v-for="name in getForwards(s)"
            :key="name"
            :name="formatter.fmtAction(name)"
            :zone-networks="findZoneNetworks(name)"
          />
        </div>
      </template>
      <template #input="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="input"
          :options="actions"
        />
      </template>
      <template #input-help>
        <hint-helper
          :main-hint="$t('Default policy for traffic entering the zone.')"
          :hints="() => getActionHint(false)"
        />
      </template>
      <template #output="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="output"
          :options="actions"
        />
      </template>
      <template #output-help>
        <hint-helper
          :main-hint="$t('Default policy for traffic originating from and leaving the zone.')"
          :hints="() => getActionHint(false)"
        />
      </template>
      <template #forward="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="forward"
          :options="actions"
        />
      </template>
      <template #forward-help>
        <hint-helper
          :main-hint="$t('Default policy for traffic forwarded between the networks belonging to the zone.')"
          :hints="() => getActionHint(false)"
        />
      </template>
      <template #masq="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="masq"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { markRaw, nextTick, provide, ref } from 'vue'
import EditForm from './ZoneEdit.vue'
import { formatter } from '@/components/network/firewall/firewallFormatter'
import { axios } from '@ui-core/plugins/axios'
import { FormOptionKey, type FormModel } from './ZonesCommon'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { Zone, ZoneGlobal } from '@/types/firewallTypes'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import HintHelper from '@/components/shared/HintHelper.vue'
import { useMainStore } from '@/stores/main'
import type { InterfaceStatus } from '@/types/networkTypes'
import { network } from '@/plugins/network'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const { actions, getActionHint } = useFirewallCommon()

const zoneColumns = [
  { name: 'name', label: $t('Source ⇒ Destination') },
  { name: 'input', label: $t('Input') },
  {
    name: 'output',
    label: $t('Output')
  },
  {
    name: 'forward',
    label: $t('Forwarding inside zone')
  },
  {
    name: 'masq',
    label: $t('Masquerading'),
    help: $t(
      'Turns Masquerading off or on. MASQUERADE is an iptables target that can be used instead of the SNAT (source NAT) target when the external IP of the network interface is not known at the moment of writing the rule (when the interface gets the external IP dynamically).'
    )
  }
]

const formData = ref<FormModel>({ zones: [] })
const interfaceStatus = ref<InterfaceStatus[]>([])
const zoneGlobalConfig = ref<ZoneGlobal | null>(null)
provide(FormOptionKey, { interfaceStatus, refreshZones, zoneGlobalConfig })
network.statusContext.provider(interfaceStatus)

async function refreshZones() {
  store.spin()
  await nextTick()
  try {
    const { data } = await axios.get('/api/firewall/zones/config')
    formData.value.zones = data
  } catch {
    message.error($t('Failed to update zones data'))
  }
  store.spin(false)
}

async function afterLoad() {
  await axios
    .bulkGet(['/api/firewall/global', '/api/interfaces/basic/status?include=vpn&include=vrf'])
    .then(([_zoneGlobalConfig, _interfaceStatus]) => {
      if (_zoneGlobalConfig.success) zoneGlobalConfig.value = _zoneGlobalConfig.data
      else message.error($t('Failed to load firewall general data'))
      if (_interfaceStatus.success) interfaceStatus.value = _interfaceStatus.data
      else message.error($t('Failed to load interface status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function getForwards(zone: Zone): string[] {
  if (zone.out) return zone.out
  if (zone.forward) return [zone.forward]
  return [zoneGlobalConfig.value?.forward ?? 'DROP']
}

function findZoneNetworks(zoneName: string): string[] {
  return formData.value.zones.find(zone => zone.name === zoneName)?.network ?? []
}
</script>
