<template>
  <vuci-form
    v-slot="{ uciData }"
    config="wireless"
    editing
    bulk-request
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('profile'), section.description)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'wireless/ppsk/groups/config' }]"
      data-key="wifiPpskGroups"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="description"
        :label="$t('Profile name')"
        :help="$t('Name of the PPSK profile.')"
        :rules="['uciname', () => $utils.validateNoDuplicates(uciData.wifiPpskGroups, 'description', props.section.description, $t('profile name'))]"
        required
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: `wireless/stations/config`, sectionFilter: (s: WifiStation) => s.psk_group === props.section.id }]"
      :before-add="(section: WifiStation) => (section.psk_group = props.section.id)"
      :after-add="(_: WifiStation, { newSection }: { newSection: WifiStation }) => modalData().vuciForm.initialForm.wifiStations.push(newSection)"
      data-key="wifiStations"
      type="wifi-station"
      :title="$t('Users')"
      :columns="stationCols"
      :table-actions="['column-list', 'search']"
    >
      <template #username="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="username"
          :rules="['uciname', () => $utils.validateNoDuplicates(uciData.wifiStations, 'username', s.username, $t('User name'))]"
          required
        />
      </template>
      <template #mac="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="mac"
          rules="macaddr"
          allow-create
          :options="[['', $t('-- No MAC --')], ...$network.getMacOptions(macHints)]"
          :depend="!store.isAccessPoint"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="mac"
          rules="macaddr"
          placeholder="00:11:22:33:44:55"
          :depend="store.isAccessPoint"
        />
      </template>
      <template #key="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="key"
          password
          :rules="['wpakey', () => $utils.validateNoDuplicates(uciData.wifiStations, 'key', s.key, $t('Password'))]"
          :maxlength="null"
          sensitive
          required
          can-randomize
        />
      </template>
      <template #network="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="network"
          :options="[['', $t('-- No Network --')], ...availableNetworks]"
        />
      </template>
      <template #vid="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="vid"
          rules="irange(1,4094)"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, inject, type Ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { wireless } from '@/plugins/wireless'
import type { Interface } from '@/types/networkTypes'
import type { WifiPpskGroup, WifiStation } from '@/types/wirelessTypes'

const modalData = inject('modalData', () => ({ vuciForm: { initialForm: { wifiStations: [] as WifiStation[] } } }))
const macHints = inject<Ref<[string, string][]>>('macHints', ref([]))
const ifaceConfigs = inject<Ref<Interface[]>>('ifaceConfigs', ref([]))

const props = defineProps<{ section: WifiPpskGroup }>()

const $t = useTranslate()
const store = useMainStore()

const stationCols = computed(() => [
  { name: 'username', label: $t('User name'), help: $t('User name of the authenticating station. Used for easier identification.') },
  { width: 'base', name: 'mac', label: $t('MAC Address'), help: $t('MAC address to match authenticating stations against (defaults to any station using this key).') },
  { width: 'base', name: 'key', label: $t('Password'), help: $t('PSK to match authenticating stations against.') },
  ...(store.isRouter
    ? [{ width: 'sm', name: 'network', label: $t('Network'), help: $t('Network that this station will be assigned to.') }]
    : [{ width: 'xs', name: 'vid', label: 'VLAN ID', help: $t('VLAN ID that this station will be assigned to.') }])
])

const availableNetworks = computed(() => wireless.getAvailableNetworks(ifaceConfigs.value as Interface[]))
</script>
