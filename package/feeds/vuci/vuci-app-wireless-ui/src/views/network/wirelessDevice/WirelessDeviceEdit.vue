<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    v-model="formData"
    config="wireless"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="wifiDevice"
      :endpoints="[{ endpoint: 'wireless/devices/config' }]"
      :name="section.id"
      :title="$t('&quot;%s&quot; Wifi instance settings').format(status?.band)"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enable')"
            :help="$t('Toggle WiFi device on or off.')"
          />
          <tlt-form-item-inline
            :label="$t('Operating frequency')"
            has-headers
          >
            <div class="md:basis-[23%]">
              <vuci-form-item-select
                :uci-section="s"
                name="hwmode"
                :help="$t('Selects the wireless protocol to use.')"
                :options="hwModeOptions"
                :label="$t('Mode')"
              />
            </div>
            <div class="md:basis-[45%]">
              <vuci-form-item-select
                :uci-section="s"
                name="channel"
                :help="$t('Specifies the wireless channel to use. “auto” defaults to the lowest available channel.')"
                :label="$t('Channel')"
                :options="freqOptions"
                :warnings="channelWarning"
              />
            </div>
            <div
              v-show="s.hwmode"
              class="md:basis-[32%]"
            >
              <vuci-form-item-select
                :uci-section="s"
                name="htmode"
                :help="$t('The Wi-Fi channel width is the range of frequencies i.e. how broad the signal is for transferring data.')"
                :label="$t('Width')"
                :depend="section.hwmode"
                :options="htModeOptions"
              />
            </div>
          </tlt-form-item-inline>
          <vuci-form-item-select
            :uci-section="s"
            name="tx_power"
            :label="$t('Transmit power')"
            :help="
              $t(
                '%s The transmit power of an access point radio is proportional to its effective range – the higher the \
                  transmit power, the farther the signal can travel and/or the more physical materials it can \
                  effectively penetrate and still successfully resolve data at the receiver. %s \
                %s Custom values in dBm can be used. If it is higher than the country allows, the country\'s limit will be used. %s'
              ).format('<p>', '<p>', '<p>', '<p>')
            "
            :options="txPowerOptions"
            allow-create
            :rules="`irange(${status.type === 'qcawifi' ? 1 : 0}, 40)`"
            rawhtml
          />
        </template>
        <template #advance="{ tab: { show = true } }">
          <vuci-form-item-switch
            :uci-section="s"
            name="legacy_rates"
            :label="$t('Allow legacy 802.11b rates')"
            :help="$t('Choose either to allow or not connections that uses legacy 802.11b standard. Enabling it will degrade wireless speed.')"
            :depend="show && status.band === '2.4GHz'"
          />
          <tlt-inline-message
            v-if="s.legacy_rates === '1'"
            type="warning"
          >
            {{ $t('"Allow legacy 802.11b rates" is enabled. This will degrade wireless speed.') }}
          </tlt-inline-message>
          <vuci-form-item-input
            :uci-section="s"
            name="distance"
            :label="$t('Distance optimization')"
            :help="$t('Distance to farthest network member in meters.')"
            placeholder="10"
            rules="irange(0,65535)"
            :depend="show"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="frag"
            :label="$t('Fragmentation threshold')"
            :help="
              $t(
                'The smallest packet size that can be fragmented and transmitted by multiple frames. \
                  In areas where interference is a problem, setting a lower fragment threshold might help reduce \
                  the probability of unsuccessful packet transfers and increase speed'
              )
            "
            placeholder="2346"
            rules="irange(256, 2346)"
            :depend="show"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="rts"
            :label="$t('RTS/CTS threshold')"
            :help="
              $t(
                'RTS/CTS (Request to Send/Clear to Send) are mechanisms used to reduce frame collisions introduced by the hidden node problem. \
                It can help resolve problems that arise when several access points are in the same area and contend with each other'
              )
            "
            placeholder="2347"
            rules="irange(0, 2347)"
            :depend="show"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="noscan"
            :label="$t('Force 40MHz mode')"
            :help="$t('Always use 40MHz channels even if the secondary channel overlaps. Using this option does not comply with IEEE 802.11n-2009!.')"
            :depend="show"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="beacon_int"
            :label="$t('Beacon interval')"
            :help="$t('Beacon signal interval in seconds.')"
            placeholder="100"
            rules="irange(15,65535)"
            :depend="show"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="acs_exclude_dfs"
            :label="$t('ACS exclude DFS')"
            :help="$t('Exclude DFS channels from automatic channel selection.')"
            :depend="show && status.band !== '2.4GHz'"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { WifiDevice, WifiDeviceStatus } from '@/types/wirelessTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { sortCollection } from '@ui-core/plugins/helper'
import { FormOptionKey, type FormOptions, type FormData } from './WirelessDeviceCommon'
import { inject, ref, computed } from 'vue'
import type { Tab } from '@ui-core/components/tabs/TltTabs.vue'

const $t = useTranslate()

export interface Props {
  section: WifiDevice
}
const props = defineProps<Props>()

const { deviceOptions, deviceStatus, wifiInterfaces } = inject(FormOptionKey) as FormOptions
const status = computed(() => deviceStatus.value.find(status => status.id === props.section.id) as WifiDeviceStatus)
const options = computed(() => deviceOptions.value.find(option => option.id === props.section.id)?.options)

const formData = ref<FormData>({ wifiDevice: [], wifiGlobal: [] })

const tabs = computed<Tab<'general' | 'advance'>[]>(() => [
  { name: 'general', title: $t('General Setup') },
  { name: 'advance', title: $t('Advanced Settings'), show: status.value.type !== 'qcawifi' }
])

const maxWidthChannel: Record<string, number> = {
  20: 165,
  40: 161,
  80: 161,
  160: 128,
  320: 128
}
const max5gChannel = computed(() => {
  if (status.value.band !== '5GHz') return 0
  const parsedWidth = props.section.htmode?.match(/\d+/)
  return maxWidthChannel[parsedWidth?.[0] ?? ''] ?? 0
})

const htTypes: Record<string, string> = {
  n: 'HT',
  ac: 'VHT',
  ax: 'HE',
  be: 'EHT'
}
const htModeOptions = computed(() => {
  if (!options.value) return []
  const htmodeList = options.value.htmodelist
  const regex = new RegExp(`^${htTypes[props.section.hwmode]}(\\d+)$`)
  const res = Object.entries(htmodeList)
    .map(([key, value]) => {
      if (!value) return null
      const mhz = regex.exec(key)?.[1]
      if (!mhz) return null
      return [key, `${mhz} MHz`]
    })
    .filter((e): e is [string, string] => e !== null)
  return sortCollection(res, 0)
})

const txPowerOptions = [
  ['', $t('High (max)')],
  ['20', `${$t('Medium')} (20 dBm, 100 mW)`],
  ['14', `${$t('Low')} (14 dBm, 25 mW)`]
]

const dfsChannels = [52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144]
const freqOptions = computed(() => {
  if (!options.value) return []
  const freqList = options.value.freqlist
    .filter(
      freq =>
        !freq.restricted && (formData.value.wifiGlobal[0].location === 'any' || !freq.indoor_only) && (status.value.band === '5GHz' && max5gChannel.value ? freq.channel <= max5gChannel.value : true)
    )
    .map(freq => {
      const dfs = dfsChannels.includes(freq.channel) ? ' DFS' : ''
      return [freq.channel.toString(), '%d (%d MHz)'.format(freq.channel, freq.mhz) + dfs]
    })
  freqList.unshift(['auto', $t('Auto')])
  return freqList
})

const hwModeOptions = computed(() => {
  if (!options.value) return []
  const hwmodeList = options.value.hwmodelist
  const result: [string, string][] = []
  if (hwmodeList.b || hwmodeList.g) result.push(['', $t('Legacy')])
  if (hwmodeList.n) result.push(['n', 'N'])
  if (hwmodeList.ac) result.push(['ac', 'AC'])
  if (hwmodeList.ax) result.push(['ax', 'AX'])
  if (hwmodeList.be) result.push(['be', 'BE'])
  return result
})

function channelWarning(): string | undefined {
  if (props.section.channel === 'auto') return
  const clientExcists = wifiInterfaces.value.some(wifiInterface => (wifiInterface.mode === 'sta' || wifiInterface.mode === 'multi_ap') && wifiInterface.device?.includes(props.section.id))
  return clientExcists
    ? $t('Client configuration detected on the %s radio. When establishing a connection, it will take control of the channel selection, and this setting will be ignored.').format(status.value?.band)
    : undefined
}
</script>
