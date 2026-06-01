<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle('VRF', section.name)"
      :name="section.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'vrf/config' }]"
      :error-handlers="{
        edit: handleErrors
      }"
      data-key="vrf"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Name of the interface.')"
        name="name"
        :rules="['uciname', () => $utils.validateNoDuplicates(uciData.vrf, 'name', s.name, $t('name'))]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="table"
        :label="$t('Table')"
        :help="$t('Unique routing table.')"
        :rules="['irange(1,4294967295)', checkReservedRange]"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="link"
        :label="$t('Link')"
        :help="$t('Devices which will be used for routing and forwarding.')"
        :options="devicesOptions"
        :rules="validateLink"
        :warnings="getLinkWarning"
        multiple
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useContext, type Vrf } from './VrfCommon'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { ApiError } from '@ui-core/plugins/axios'

export interface Props {
  section: Vrf
}
defineProps<Props>()
const { devices, getLinkNames } = useContext()

const store = useMainStore()
const $t = useTranslate()

const devicesOptions = computed(() =>
  devices.value
    .filter(dev => store.allPortDevices.includes(dev.name) || ['VLAN', 'bridge', 'VPN'].includes(dev.type))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(dev => [dev.name, dev.type === 'bridge' && dev['bridge-members']?.length ? `${dev.description || dev.name} (${dev['bridge-members'].join(', ')})` : dev.description || dev.name])
)

function checkReservedRange(val: number) {
  return {
    isValid: val < 253 || val > 255,
    message: $t('253-255 range is reserved for the default routing tables.')
  }
}

function getLinkWarning(val: string[] = []) {
  const vlanUnassigned = val.filter(vlan => devices.value.some(d => d.name === vlan && d.type === 'VLAN' && !d.up))
  if (vlanUnassigned.length) return $t('VLAN(s) "%s" must be assigned to an active interface to operate correctly.').format(getLinkNames(vlanUnassigned))
  return ''
}

function validateLink(val: string[] = []) {
  const usedPorts = val.filter(port => devices.value.some(d => d.type === 'bridge' && d['bridge-members']?.includes(port)))
  const isBridge = (device: string) => devices.value.some(d => d.name === device && d.type === 'bridge')
  const bridgeVlan = val.filter(dev => isBridge(dev) && devices.value.some(d => d.type === 'VLAN' && new RegExp(`^(${dev})\\.[0-9]+$`).test(d.name)))
  if (bridgeVlan.length) {
    return {
      isValid: false,
      message: $t('Bridge(s) "%s" cannot be used because bridge VLAN(s) are created.').format(getLinkNames(bridgeVlan))
    }
  }
  return {
    isValid: !usedPorts.length,
    message: $t('Port(s) "%s" already used in a bridge device.').format(getLinkNames(usedPorts))
  }
}

function handleErrors(res: { data: { errors: ApiError[] } }) {
  const errorCode = res.data.errors?.[0]
  if (errorCode?.source === 'name' && errorCode?.code === 103) return $t('Dublicate VRF and interface names are not allowed')
  return $t('Failed to edit configuration')
}
</script>
