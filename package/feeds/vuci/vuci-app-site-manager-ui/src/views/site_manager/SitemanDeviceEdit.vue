<template>
  <vuci-form
    ref="formRef"
    v-model="formData"
    config="siteman_devices"
    class="mb-3"
    editing
  >
    <template #default="{ uciData }">
      <tlt-tabs :tabs="tabs">
        <template #main>
          <vuci-named-section
            v-slot="{ s }"
            :uci-data="uciData"
            :title="$t('General')"
            name="device"
            :endpoints="[
              {
                endpoint: 'site_manager/devices/config',
                sectionFilter: sec => sec.find(sec => sec.id === section.id)
              }
            ]"
            data-key="devices"
            :after-save="onAfterSave"
          >
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Name')"
              :help="$t('Name of the device. Used for easier device management purpose only.')"
              name="custom_name"
              required
              rules="string"
              :maxlength="200"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Hostname')"
              name="hostname"
              rules="host"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Synchronize NTP settings')"
              name="sync_ntp"
            />
            <vuci-form-item-button
              :uci-section="s"
              name="download"
              :label="$t('Troubleshoot file')"
              :help="$t(`Downloads the device's Troubleshoot file. It contains the device's configuration information, logs and some other files.`)"
              :text="$t('Download')"
              :loading="localDevmanTroubleshoot[s.id]"
              :disabled="localDevmanTroubleshoot[s.id]"
              @click="downloadTroubleshoot(s)"
            />
          </vuci-named-section>
        </template>
        <template #network>
          <vuci-typed-section
            v-if="section.device_type.includes('TSW') || section.device_type.includes('SWM')"
            :title="$t('Network interfaces')"
            :help="$t('To change the interface order just drag & drop them.')"
            type="interface"
            :endpoints="[
              {
                endpoint: 'site_manager/switch/interfaces/config',
                sectionFilter: sec => sec.dm_device_id === section.id
              }
            ]"
            data-key="switchInterfaces"
            :uci-data="uciData"
            :add-validate="onAdd"
            :edit-form="DevmanSwitchInterfaceEditVue"
            :exception-options="['metric']"
            sortable
            sort-by="metric"
            :no-value-text="$t('No interfaces available')"
            :columns="[
              { name: 'proto', label: $t('Protocol') },
              { name: 'enabled', label: $t('Enabled') }
            ]"
            @drag-end="reorderData"
          >
            <template #proto="{ s }">
              <vuci-form-item-dummy
                :uci-section="s"
                name="proto"
              />
            </template>
            <template #enabled="{ s }">
              <vuci-form-item-switch
                :uci-section="s"
                name="enabled"
              />
            </template>
          </vuci-typed-section>
          <vuci-named-section
            v-if="!section.device_type.includes('TSW') && !section.device_type.includes('SWM') && uciData?.interfaces?.find(device => device.dm_device_id === section.id)"
            v-slot="{ s }"
            :uci-data="uciData"
            :title="$t('Network')"
            name="interface"
            :endpoints="[
              {
                endpoint: 'site_manager/interfaces/config',
                sectionFilter: sec => sec.find(sec => sec.dm_device_id === section.id)
              }
            ]"
            data-key="interfaces"
          >
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Mode')"
              name="mode"
              :options="modeOptions"
            />
            <ip-fields
              :s="s"
              :extra-condition="s.mode !== 'dhcp'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IPv4 gateway')"
              name="gateway"
              rules="ip4addr"
              :depend="s.mode !== 'dhcp'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IPv6 address')"
              name="ip6addr"
              rules="ipmask6"
              :depend="s.mode !== 'dhcp'"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IPv6 gateway')"
              name="ip6gw"
              rules="ipmask6"
              :depend="s.mode !== 'dhcp'"
            />
            <vuci-form-item-list
              :uci-section="s"
              :label="$t('DNS servers')"
              name="dns"
              rules="ipaddr"
              :depend="s.mode !== 'dhcp'"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="man_vlan"
              :label="$t('Management VLAN')"
              :options="[[getDefaultManVlan, $t('Default')]]"
              :rules="lanDevices.includes(s.man_vlan) ? undefined : 'irange(1, 4094)'"
              allow-create
            />
          </vuci-named-section>
        </template>
        <template #wireless>
          <vuci-typed-section
            :uci-data="uciData"
            :endpoints="[
              {
                endpoint: 'site_manager/wireless/devices/config',
                sectionFilter: sec => sec.dm_device_id === section.id
              }
            ]"
            data-key="wifiDevices"
            type="wifi-device"
            :form-methods="['edit', 'get']"
            :after-save="onAfterSave"
            :title="$t('Wireless Devices')"
            :columns="[
              { name: 'device', label: $t('Radio'), displayFn: (val, s) => getRadioName(s.id) },
              { name: 'channel', label: $t('Channel'), displayFn: val => getChannelDisplay(val) }
            ]"
            :edit-form="WirelessEdit"
            :edit-form-props="{
              options: wirelessOptions,
              deviceType: section.device_type
            }"
            :no-value-text="$t('No wireless devices available')"
          >
          </vuci-typed-section>
        </template>
        <template #port_settings>
          <div v-if="section.device_type.includes('TSW') || section.device_type.includes('SWM')">
            <devman-port-component
              :uci-data="uciData"
              :section="section"
              :form-data="formData"
              :current-tab="currentTab"
              @update-ports-settings="handlePortsSettingsUpdate"
            />
          </div>
        </template>
      </tlt-tabs>
    </template>
    <template #form-buttons="{ save }">
      <tlt-button
        class="ml-auto"
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Sync') }}
      </tlt-button>
    </template>
  </vuci-form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import WirelessEdit from './WirelessDeviceSection.vue'
import DevmanSwitchInterfaceEditVue from './SitemanSwitchInterfaceEdit.vue'
import DevmanPortComponent from './SitemanPortSettings.vue'
import IpFields from '@/components/network/IpFields.vue'
import { utils } from '@/plugins/utils'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

const t = useTranslate()
const message = useMessages()

const props = defineProps({
  section: { type: Object, required: true },
  devmanTroubleshoot: { type: Object, required: true }
})

const formRef = ref(null)
const formData = ref({})
const currentTab = ref('main')
const localDevmanTroubleshoot = ref({ ...props.devmanTroubleshoot })

const modeOptions = [
  ['static', t('Static')],
  ['dhcp', 'DHCP'],
  ['static+dhcp', t('Static + DHCP')]
]

const tabs = [
  { name: 'main', title: t('Main') },
  { name: 'network', title: t('Network') },
  {
    name: 'port_settings',
    title: t('Port Settings'),
    show: props.section.device_type?.toLowerCase().includes('tsw') || props.section.device_type?.toLowerCase().includes('swm')
  },
  { name: 'wireless', title: t('Wireless'), show: props.section.device_type?.toLowerCase().includes('tap') }
]

const lanDevices = ['eth0', 'eth1']

const getDefaultManVlan = computed(() => {
  const deviceType = props.section?.device_type?.toLowerCase()
  return deviceType?.includes('tap100') ? 'eth0' : 'eth1'
})

const wirelessOptions = ref(null)
const isFetchingWireless = ref(false)

onMounted(async () => {
  const isSwitchDevice = props.section?.device_type?.toLowerCase().includes('tsw') || props.section?.device_type?.toLowerCase().includes('swm')

  if (!props.section?.mac || isFetchingWireless.value || wirelessOptions.value || isSwitchDevice) return

  isFetchingWireless.value = true
  try {
    const response = await axios.post('/api/site_manager/devices/actions/api', {
      data: { mac: props.section.mac, endpoint: '/wireless/devices/options', method: 'GET' }
    })
    wirelessOptions.value = response.data?.resp_data?.data ?? null
  } catch (err) {
    message.error(t('Failed to fetch wireless options'))
  } finally {
    isFetchingWireless.value = false
  }
})

const reorderData = dat => {
  if (!formData.value.switchInterfaces) return
  formData.value.switchInterfaces.splice(0, formData.value.switchInterfaces.length)
  formData.value.switchInterfaces.push(...dat)
  formData.value.switchInterfaces.forEach((o, i) => (o.metric = (i + 1).toString()))
}

const onAdd = s => {
  s.dm_device_id = props.section.id
  return { valid: true }
}

const onAfterSave = ({ vuciForm }, { data }) => {
  if (!data) return data
  data.duplicated = props.section.duplicated
  data.ip = props.section.ip
  data.paired = props.section.paired
  data.online = props.section.online
  data.dm_device_id = props.section.id

  if (formData.value?.wifiDevices && Array.isArray(formData.value.wifiDevices)) {
    formData.value.wifiDevices.forEach(device => {
      if (device) {
        device.dm_device_id = vuciForm?.initialForm?.wifiDevices?.find(initial => initial?.id === device.id)?.dm_device_id || props.section.id
      }
    })
  }

  return data
}

function getRadioName(id) {
  if (!id) return '-'
  const radioId = id.split('_').pop()
  const radioNum = radioId.replace('radio', '')
  return `Radio${radioNum}`
}

function getChannelDisplay(channel) {
  if (!channel) return '-'
  if (channel === 'auto') return t('Auto')
  const label = getChannelLabel(channel)
  return label ? `${channel} (${label})` : channel
}

function getChannelLabel(channel) {
  const ch = parseInt(channel)
  if (isNaN(ch)) return ''
  if (ch >= 1 && ch <= 14) return '2.4 GHz'
  if (ch >= 32 && ch <= 177) return '5 GHz'
  return ''
}

const downloadTroubleshoot = s => {
  localDevmanTroubleshoot.value[s.id] = true
  return utils
    .downloadFileApi(`/api/site_manager/devices/actions/download`, 'application/x-tar', 'POST', {
      type: 'troubleshoot',
      id: s.id
    })
    .then(() => message.success(t('Troubleshoot download for "%s" device was successful').format(s.custom_name)))
    .catch(err => {
      if (err?.response?.data?.errors[0]?.code === 17) {
        message.error(t('Device does not support troubleshoot download. To enable this feature, please update the firmware of the device.'))
      } else {
        message.error(t('Failed to download troubleshoot file for "%s" device').format(s.custom_name || s.device_type))
      }
    })
    .finally(() => (localDevmanTroubleshoot.value[s.id] = false))
}

function handlePortsSettingsUpdate(updatedPortsSettings) {
  if (formRef.value) {
    formRef.value.updateUciData({
      ...formRef.value.uciData,
      portsSettings: updatedPortsSettings
    })
  } else {
    console.error('formRef is not defined or vuci-form instance is not available')
  }
}
</script>
