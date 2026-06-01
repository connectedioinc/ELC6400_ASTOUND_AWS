<template>
  <vuci-form
    ref="formRef"
    v-slot="{ uciData }"
    v-model="formData"
    config="wireless"
    :after-load="afterLoad"
    :extra-load="extraLoad"
    async-load
  >
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: `wireless/interfaces/config` }]"
      data-key="wifiInterfaces"
      type="wifi-iface"
      :edit-form="markRaw(WirelessInterfaceEdit)"
      :add-validate="() => $wireless.validateRadios(formData.wifiInterfaces)"
      :add="onAdd"
      :after-add="afterIfaceAdd"
      :after-delete="afterDelete"
      :title="$t('SSIDs')"
      :edit-form-props="{
        tab: {
          initialTab: initialEditTab,
          revert: () => {
            initialEditTab = 'general'
          }
        }
      }"
    >
      <template #custom-design="{ s, actions, index }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :card-props="cols(s)"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
        >
          <name-cell
            :index="index + 1"
            :value="$wireless.getName(s)"
          />
          <column-splitter
            :column-element="CardCell"
            :breakpoints="{ sm: 2, '2xl': s.device?.length > 1 ? 3 : 4 }"
          >
            <cell-row
              :label="$t('Status')"
              class="flex-nowrap"
              :truncate="false"
            >
              <template #value>
                <wireless-status
                  :status="getStatus(s)"
                  :config="s"
                  :network-status="interfaceStatus.find(e => e.name === s.network)"
                />
              </template>
            </cell-row>
            <cell-row
              :label="$t('Signal')"
              class="flex-nowrap"
            >
              <template #value>
                <div class="flex gap-2 max-lg:ml-auto items-center min-w-0">
                  <tlt-overflow-hint>
                    {{ parseQuality(s) }}
                  </tlt-overflow-hint>
                  <tlt-hint
                    class="signal-bar"
                    :hints="parseSignalHint(s)"
                  >
                    <span class="w-4 h-5">
                      <tlt-signal-bar
                        :signal="!getStatus(s).up ? -1 : Math.max(...(getStatus(s).devices?.map(dev => dev.quality) ?? [-1]))"
                        float="left"
                        :showtext="false"
                        :wireless="true"
                        :disabled="!getStatus(s).up"
                      />
                    </span>
                  </tlt-hint>
                </div>
              </template>
            </cell-row>
            <cell-row
              v-for="(row, rIdx) in columns"
              :key="rIdx"
              :label="row.label"
              :value="row.value"
              class="flex-nowrap"
            />
          </column-splitter>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <div class="flex gap-2">
                  <wifi-qr-code
                    v-if="s"
                    :content="s"
                    :keep-open="showQrCode[s.id]"
                    @toggle="state => (showQrCode[s.id] = state)"
                  />
                  <vuci-form-edit-delete
                    :id="s.id"
                    class="xl:min-w-max"
                    :actions="actions"
                  >
                    <template #delete="{ delSection }">
                      <tlt-hint>
                        <template
                          v-if="!!hotspotInUse(s)"
                          #hintBox
                        >
                          <span>
                            {{ $t('Interface is associated with the Hotspot instance. To delete hotspot instance before removing this interface click') }}
                            <router-link
                              to="/services/hotspot/general"
                              test-id="hotspot-general-route"
                            >
                              {{ $t('here') }} </router-link
                            >.
                          </span>
                        </template>
                        <tlt-button
                          button-id="delete"
                          type="text"
                          color="error"
                          :readonly="!!hotspotInUse(s)"
                          @click="delSection(s.id)"
                          >{{ $t('Delete') }}</tlt-button
                        >
                      </tlt-hint>
                    </template>
                  </vuci-form-edit-delete>
                </div>
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
              class="xl:min-w-max"
            >
              <template #value>
                <vuci-form-item-switch
                  :uci-section="s"
                  name="enabled"
                  :readonly="isIfaceReadonly(s)"
                  :hints="isIfaceReadonly(s) ? [{ info: $t('Due to incomplete configuration, the interface cannot be enabled.') }] : []"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template
        v-if="$store.isRouter && store.device !== 'CAP700'"
        #buttons="{ actions: ifaceActions }"
      >
        <template
          v-for="radio in $wireless.allRadios()"
          :key="radio"
        >
          <div>
            <tlt-button
              class="mr-[10px]"
              :button-id="`scan-${radio}`"
              @click="scanModalOpen[radio] = true"
            >
              {{ $t('Scan %s').format(deviceStatus.find(device => device.id === radio)?.band) }}
            </tlt-button>
            <tlt-modal
              :open="scanModalOpen[radio]"
              :nav-bar="wirelessScanNav"
              @close="onWirelessScanNavClose(radio)"
            >
              <wireless-scan
                :device="radio"
                :uci-data="uciData"
                :navigation="wirelessScanNav"
                :interfaces="interfaceConfigs.filter((iface): iface is Interface => 'name' in iface)"
                @network-select="name => wirelessScanNav.push(name)"
                @network-joined="(iface, network) => onNetworkJoin(iface, radio, ifaceActions, network)"
              />
            </tlt-modal>
          </div>
        </template>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, markRaw, provide, ref, watchEffect } from 'vue'
import { FormDataKey, FormOptionKey, type FormModel } from './WirelessInterfaceCommon'
import { useTimer } from '@ui-core/composables/useTimer'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { wireless } from '@/plugins/wireless'
import NetworkAutoConfig, { type FakeWifiInterface } from '../../../components/NetworkAutoConfig'
import WirelessScan from './WirelessScan.vue'
import WirelessInterfaceEdit from './WirelessInterfaceEdit.vue'
import WirelessStatus from '@/components/shared/WirelessStatus.vue'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import type { Interface, InterfaceStatus, TapInterface } from '@/types/networkTypes'
import type { BridgeConfig, DeviceStatus } from '@/types/networkDeviceTypes'
import type { WifiInterface, WifiDevice, WifiDeviceStatus, WifiInterfaceStatus, WifiDeviceOptions, WifiPpskGroup } from '@/types/wirelessTypes'
import type { GeneratedCert } from '@/types/certTypes'
import type { HotspotInstance } from '@/types/hotspotTypes'
import WifiQrCode from '@/components/network/WifiQrCode.vue'
import ColumnSplitter from '@/components/shared/ColumnSplitter'
import CardCell from '@ui-core/tlt-design/overview/card/CardCell.vue'

const store = useMainStore()
const $t = useTranslate()
const message = useMessages()

const formData = ref<FormModel>({ wifiInterfaces: [], multiAccessPoints: [], wifiVlans: [] })

const macAddresses = ref<[string, string][]>([])
const deviceOptions = ref<WifiDeviceOptions[]>([])
const deviceStatus = ref<WifiDeviceStatus[]>([])
const wifiInterfaceStatus = ref<WifiInterfaceStatus[]>([])
const certData = ref<GeneratedCert[]>([])
const interfaceConfigs = ref<(Interface | TapInterface)[]>([])
const interfaceStatus = ref<InterfaceStatus[]>([])
const bridgeConfigs = ref<BridgeConfig[]>([])
const deviceConfigs = ref<WifiDevice[]>([])
const networkDeviceStatus = ref<DeviceStatus[]>([])
const hotspotInstances = ref<HotspotInstance[]>([])
const wifiPpskGroups = ref<WifiPpskGroup[]>([])

const showQrCode = ref<Record<string, boolean>>({})

function afterLoad() {
  return axios
    .bulkGet([
      '/api/wireless/interfaces/basic/status',
      '/api/wireless/devices/options?exclude=options',
      '/api/wireless/devices/config',
      { endpoint: '/api/routes/status/mac_hints', condition: 'vuci-app-routes-api.control' },
      { endpoint: '/api/certificates/config', condition: 'vuci-app-certificates-api.control' },
      '/api/interfaces/config',
      { endpoint: '/api/interfaces/basic/status', condition: store.isRouter },
      { endpoint: '/api/wireless/multi_ap/config', condition: 'multiple_ap.control' },
      { endpoint: '/api/network/devices/bridge/config', condition: store.isAccessPoint },
      '/api/basic/network/devices/status',
      '/api/wireless/vlans/config',
      '/api/wireless/ppsk/groups/config'
    ])
    .then(([wifiStatus, deviceOption, deviceConfig, macResponse, certResponse, interfaceResponse, ifaceStatus, multiAp, bridgeConfig, networkDeviceStatuses, wifiVlans, ppskGroups]) => {
      if (wifiStatus.success) wifiInterfaceStatus.value = wifiStatus.data
      else message.error($t('Failed to load wireless interface status'))
      if (deviceOption.success) deviceOptions.value = deviceOption.data
      else message.error($t('Failed to load device option data'))
      if (deviceConfig.success) deviceConfigs.value = deviceConfig.data
      else message.error($t('Failed to load wireless device config'))
      if (macResponse.success) macAddresses.value = macResponse.data
      else message.error($t('Failed to load MAC hints'))
      if (certResponse.success) certData.value = certResponse.data?.generated ?? []
      else message.error($t('Failed to load certificates'))
      if (interfaceResponse.success) interfaceConfigs.value = interfaceResponse.data
      else message.error($t('Failed to load network interface data'))
      if (ifaceStatus.success) interfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load network interface status'))
      if (bridgeConfig.success) bridgeConfigs.value = bridgeConfig.data
      else message.error($t('Failed to load network bridge data'))
      if (networkDeviceStatuses.success) networkDeviceStatus.value = networkDeviceStatuses.data
      else message.error($t('Failed to load network bridge status'))

      if (!multiAp.success) message.error($t('Failed to load Multi AP data'))
      if (!wifiVlans.success) message.error($t('Failed to load Wifi VLAN data'))
      if (!ppskGroups.success) message.error($t('Failed to load Wifi PPSK group data'))
      else wifiPpskGroups.value = ppskGroups.data
      return { multiAccessPoints: multiAp.data ?? [], wifiVlans: wifiVlans.data ?? [] }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      timer.start()
    })
}

function extraLoad() {
  return axios
    .bulkGet([
      '/api/wireless/devices/basic/status',
      {
        endpoint: '/api/hotspot/config',
        condition: 'coovachilli-api'
      }
    ])
    .then(([devices, hotspot]) => {
      if (!devices.success) message.error($t('Failed to load device status'))
      else deviceStatus.value = devices.data
      if (!hotspot.success) message.error($t('Failed to load Hotspot data'))
      else hotspotInstances.value = hotspot.data
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function refreshData() {
  return axios
    .bulkGet(['/api/wireless/interfaces/basic/status', { endpoint: '/api/interfaces/basic/status', condition: store.isRouter }])
    .then(([wifiStatus, ifaceStatus]) => {
      if (wifiStatus.success) wifiInterfaceStatus.value = wifiStatus.data
      else message.error($t('Failed to load wireless interface status'))
      if (ifaceStatus.success) interfaceStatus.value = ifaceStatus.data
      else message.error($t('Failed to load network interface status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

const anyMultiAp = computed<boolean>(() => formData.value.wifiInterfaces.some(iface => iface.mode === 'multi_ap'))
watchEffect(() => {
  if (anyMultiAp.value === false) formData.value.multiAccessPoints = []
})

const timer = useTimer({ method: refreshData, time: 5000, autostart: false, immediate: false })

function cols(item: WifiInterface) {
  const status = getStatus(item)
  const columns: { label: string; value: string | number }[] = [
    { label: $t('Radios'), value: parseUsedRadios(item), show: wireless.allRadios().length > 1 },
    { label: $t('Mode'), value: wireless.getMode(status.mode) },
    { label: 'SSID', value: status.ssid || '-', show: item.mode === 'multi_ap' },
    { label: $t('Mesh ID'), value: item.mesh_id || item.ssid || '-', show: item.mode === 'mesh' },
    { label: 'BSSID', value: parseBssid(status), show: item.mode !== 'mesh' },
    { label: $t('Clients'), value: status.num_assoc || '0', show: [undefined, 'ap', 'mesh'].includes(item.mode) },
    { label: $t('Encryption'), value: status.encryption || $t('None') }
  ].filter(e => e.show !== false)

  return {
    item,
    columns
  }
}

function getStatus(config: WifiInterface): Partial<WifiInterfaceStatus> {
  return wifiInterfaceStatus.value.find(e => e.id === config.id) || {}
}

function parseUsedRadios(config: WifiInterface) {
  return config.device
    ?.map(deviceId => deviceStatus.value.find(device => device.id === deviceId)?.band ?? '-')
    ?.sort()
    ?.join(', ')
}

function parseQuality(config: WifiInterface) {
  const status = getStatus(config)
  return status.devices && status.devices.length > 1 ? status.devices.map(dev => `${dev.quality}% (${dev.band})`).join(' | ') : (status.devices?.map(dev => `${dev.quality}%`).join() ?? '-%')
}

function parseBssid(status: Partial<WifiInterfaceStatus>) {
  return status.devices && status.devices.length > 1 ? status.devices.map(dev => `${dev.bssid || '-'} (${dev.band})`).join(', ') : status.devices?.map(dev => dev.bssid).join() || '-'
}

function parseSignalHint(config: WifiInterface) {
  const status = getStatus(config)
  return status.devices && status.devices.length > 1
    ? status.devices.map(dev => ({ info: $t('Signal (%s): %s dBm / Noise: %s dBm.').format(dev.band, dev.signal, dev.noise) }))
    : status.devices?.map(dev => ({ info: $t('Signal: %s dBm / Noise: %s dBm.').format(dev.signal, dev.noise) }))
}

function isIfaceReadonly(s: WifiInterface) {
  const validEncryption = s.mode === 'multi_ap' || s.encryption
  const validSsid = s.mode === 'mesh' || s.mode === 'multi_ap' || s.ssid
  const validMesh = s.mode !== 'mesh' || s.mesh_id
  const validKey = s.mode === 'multi_ap' || !['psk', 'psk2', 'psk+psk2', 'psk-mixed', 'sae', 'sae-mixed'].includes(s.encryption) || s.key || s['key:set'] === '1'
  const validMode = s.mode || store.device === 'CAP700'
  return !validMode || !validEncryption || !validSsid || !validKey || !validMesh
}

function hotspotInUse(s: WifiInterface) {
  return hotspotInstances.value.find(hotspot => hotspot.network === s.wifi_id)
}

function onAdd(form: WifiInterface) {
  if (wireless.allRadios().length === 1) return
  const errors = wireless.getSsidCountErrors(formData.value.wifiInterfaces, wireless.allRadios(), undefined, wireless.getAllRadioMaxSsid())
  form.device = wireless.allRadios().filter(radio => (errors.length > 0 ? errors.some(error => radio !== error.radioId) : true))
}

function afterIfaceAdd(_: unknown, res: { newSection: WifiInterface }) {
  res.newSection.mode = 'ap'
  res.newSection.encryption = store.isRouter ? 'psk2' : 'sae-mixed'
  if (store.isAccessPoint) return
  res.newSection.network = 'lan'
}

const formRef = ref<InstanceType<typeof VuciForm> | null>(null)
const initialEditTab = ref<string>('general')
const wirelessScanNav = ref<string[]>([$t('Wireless scan results')])
function onNetworkJoin(iface: WifiInterface, device: string, { edit }: { edit: (arg0: string) => void }, network: any) {
  if (network?.encryption?.authentication?.includes('802.1x')) initialEditTab.value = 'encryption'
  onWirelessScanNavClose(device)
  onWirelessScanNavClose(device)
  const statusId = wifiInterfaceStatus.value.findIndex(status => status.id === iface.id)
  wifiInterfaceStatus.value.splice(statusId)
  formData.value.wifiInterfaces.push({ ...iface, '.type': 'wifi-iface', device: Array.isArray(iface.device) ? iface.device : [iface.device] })
  formRef.value?.updateUciData(formData.value)
  edit(iface.id)
}

const scanModalOpen = ref<Record<string, boolean>>({})
function onWirelessScanNavClose(device: string) {
  if (wirelessScanNav.value.length > 1) {
    return wirelessScanNav.value.pop()
  }
  scanModalOpen.value[device] = false
}

/** Need to update interfaces and their devices as API has potential to delete them when changing wireless config */
async function updateInterfaces() {
  return axios
    .bulkGet(['/api/interfaces/config', '/api/basic/network/devices/status'])
    .then(([interfaceResponse, networkDeviceStatuses]) => {
      if (interfaceResponse.success) interfaceConfigs.value = interfaceResponse.data
      else message.error($t('Failed to load network interface data'))
      if (networkDeviceStatuses.success) networkDeviceStatus.value = networkDeviceStatuses.data
      else message.error($t('Failed to load network bridge status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

async function afterDelete(section: FakeWifiInterface) {
  if (section.encryption === 'ppsk2') formData.value.wifiVlans = formData.value.wifiVlans?.filter(vlan => vlan.iface !== section.id)
  if (!store.isAccessPoint) return updateInterfaces()
  timer.stop()
  await NetworkAutoConfig.deleteNetwork(section, bridgeConfigs.value, formData.value.wifiInterfaces, interfaceConfigs.value as TapInterface[])
  await NetworkAutoConfig.updateDevices(bridgeConfigs.value, formData.value.wifiInterfaces, store.board!.network.lan!.device!)
  timer.start()
}

provide(FormOptionKey, {
  macAddresses,
  deviceOptions,
  deviceStatus,
  wifiInterfaceStatus,
  certData,
  interfaceStatus,
  interfaceConfigs,
  bridgeConfigs,
  deviceConfigs,
  networkDeviceStatus,
  wifiPpskGroups,
  updateInterfaces
})
provide(FormDataKey, formData)
</script>
