<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="siteman_wireless"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('WiFi Device settings')"
      :endpoints="[{ endpoint: 'site_manager/wireless/devices/config' }]"
      :name="section.id"
      data-key="wifiDevices"
    >
      <div v-if="!deviceOptions">{{ $t('Loading device options...') }}</div>
      <tlt-tabs
        v-else
        :tabs="tabs"
      >
        <!-- General Setup -->
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
            <div>
              <div class="truncate mb-1">{{ $t('Mode') }}</div>
              <vuci-form-item-select
                :uci-section="s"
                name="hwmode"
                :help="$t('Selects the wireless protocol to use.')"
                :options="getHwModeOptions()"
              />
            </div>
            <div>
              <div class="truncate mb-1">{{ $t('Channel') }}</div>
              <vuci-form-item-select
                :uci-section="s"
                name="channel"
                :help="$t('Specifies the wireless channel to use.')"
                :options="getFreqOptions(s)"
                style="width: 140px"
              />
            </div>
            <div v-show="['n', 'ac', 'ax', 'be'].includes(s.hwmode)">
              <div class="truncate mb-1">{{ $t('Width') }}</div>
              <vuci-form-item-select
                :uci-section="s"
                name="htmode"
                :help="$t('Wi-Fi channel width used for data transfer.')"
                :options="getHtModeOptions(s)"
              />
            </div>
          </tlt-form-item-inline>

          <vuci-form-item-select
            :uci-section="s"
            name="txpower"
            :label="$t('Transmit power')"
            :help="$t('Higher transmit power increases range but may cause more interference.')"
            :options="getTxPowerOptions()"
          />

          <vuci-form-item-select
            :uci-section="s"
            name="country"
            :label="$t('Country code')"
            :help="$t('Use ISO/IEC 3166 alpha2 codes.')"
            :options="getCountryOptions()"
          />
        </template>

        <!-- Advanced Settings -->
        <template #advance>
          <vuci-form-item-switch
            :uci-section="s"
            name="legacy_rates"
            :label="$t('Allow legacy 802.11b rates')"
            :help="$t('Enable connections using legacy 802.11b standard. May reduce WiFi speed.')"
            :depend="s.id.includes('radio0')"
          />

          <vuci-form-item-input
            :uci-section="section"
            name="distance"
            :label="$t('Distance optimization')"
            :help="$t('Distance to farthest network member in meters.')"
            placeholder="10"
            rules="range(0,65535)"
          />
          <vuci-form-item-input
            :uci-section="section"
            name="frag"
            :label="$t('Fragmentation threshold')"
            :help="
              $t(
                'The smallest packet size that can be fragmented and transmitted by multiple frames. \
                  In areas where interference is a problem, setting a lower fragment threshold might help reduce \
                  the probability of unsuccessful packet transfers and increase speed.'
              )
            "
            placeholder="2346"
            rules="irange(256, 2346)"
          />
          <vuci-form-item-input
            :uci-section="section"
            name="rts"
            :label="$t('RTS/CTS threshold')"
            :help="
              $t(
                'RTS/CTS (Request to Send/Clear to Send) are mechanisms used to reduce frame collisions introduced by the hidden node problem. \
                It can help resolve problems that arise when several access points are in the same area and contend with each other.'
              )
            "
            placeholder="2347"
            rules="irange(0, 2347)"
          />
          <vuci-form-item-switch
            :uci-section="section"
            name="noscan"
            :label="$t('Force 40MHz mode')"
            :help="$t('Always use 40MHz channels even if the secondary channel overlaps. Using this option does not comply with IEEE 802.11n-2009!.')"
          />
          <vuci-form-item-input
            :uci-section="section"
            name="beacon_int"
            :label="$t('Beacon interval')"
            :help="$t('Beacon signal interval in seconds.')"
            placeholder="100"
            rules="range(15,65535)"
          />
          <vuci-form-item-switch
            :uci-section="section"
            name="acs_exclude_dfs"
            :label="$t('ACS exclude DFS')"
            :help="$t('Exclude DFS channels from automatic channel selection.')"
            :depend="section.id.includes('radio1')"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { WifiDeviceOptions, WifiDevice } from '@/types/wirelessTypes'

const $t = useTranslate()

const props = defineProps<{
  section: WifiDevice
  options: WifiDeviceOptions[]
}>()

const formData = ref({
  wifiDevice: [],
  wifiGlobal: []
})

const tabs = [
  { name: 'general', title: $t('General Setup') },
  { name: 'advance', title: $t('Advanced Settings') }
]

const DFS_CHANNELS = [52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144]

const MAX_CHANNEL_BY_WIDTH: Record<string, number> = {
  '20': 165,
  '40': 161,
  '80': 161,
  '160': 128
}

const HT_MODE_PREFIXES: Record<string, string> = {
  n: 'HT',
  ac: 'VHT',
  ax: 'HE',
  be: 'EHT'
}

const getDefaultTxPowerOptions = () => [
  ['', $t('High (max)')],
  ['20', $t('Medium (20 dBm, 100 mW)')],
  ['14', $t('Low (14 dBm, 25 mW)')]
]

const deviceOptions = computed(() => {
  if (!props.options) return null
  return props.options.find(r => props.section.id.includes(r.id))?.options ?? null
})

const getMaxChannel = (htmode: string, is5GHz: boolean): number | null => {
  if (!is5GHz || !htmode) return null
  const width = htmode.match(/\d+/)?.[0]
  return width ? (MAX_CHANNEL_BY_WIDTH[width] ?? null) : null
}

const getHwModeOptions = () => {
  if (!deviceOptions.value) return []

  const { hwmodelist, hwmode_list } = deviceOptions.value
  const options = []

  if (hwmodelist.b || hwmodelist.g) {
    if (!hwmode_list || hwmode_list.b || hwmode_list.g) {
      options.push(['', $t('Legacy')])
    }
  }

  if (hwmodelist.n && (!hwmode_list || hwmode_list.n)) options.push(['n', $t('N')])
  if (hwmodelist.ac && (!hwmode_list || hwmode_list.ac)) options.push(['ac', $t('AC')])
  if (hwmodelist.ax && (!hwmode_list || hwmode_list.ax)) options.push(['ax', $t('AX')])
  if (hwmodelist.be && (!hwmode_list || hwmode_list.be)) options.push(['be', $t('BE')])

  return options
}

const getFreqOptions = (section: any) => {
  if (!deviceOptions.value) return []

  const is5GHz = props.section.id.includes('radio1')
  const maxChannel = getMaxChannel(section.htmode, is5GHz)
  const { channel_list, freqlist } = deviceOptions.value

  const allowedChannels = channel_list ? new Set(channel_list.map(String)) : null

  const options = freqlist
    .filter(f => {
      if (allowedChannels && !allowedChannels.has(f.channel.toString())) return false
      if (maxChannel !== null && f.channel > maxChannel) return false
      return true
    })
    .map(f => {
      const dfs = DFS_CHANNELS.includes(f.channel) ? ` ${$t('DFS')}` : ''
      return [f.channel.toString(), `${f.channel} (${f.mhz} ${$t('MHz')})${dfs}`]
    })

  options.unshift(['auto', $t('Auto')])
  return options
}

const getHtModeOptions = (section: any) => {
  if (!deviceOptions.value || !section.hwmode) return []

  const prefix = HT_MODE_PREFIXES[section.hwmode]
  if (!prefix) return []

  const { htmodelist, htmode_list } = deviceOptions.value

  return Object.entries(htmodelist)
    .filter(([key, enabled]) => {
      if (!enabled) return false
      if (!key.startsWith(prefix)) return false
      if (htmode_list && !htmode_list[key]) return false
      return true
    })
    .map(([key]) => [key, `${key.match(/\d+/)?.[0]} ${$t('MHz')}`])
}

const getCountryOptions = () => {
  if (!deviceOptions.value) return []

  const { countrylist, country_list } = deviceOptions.value

  if (country_list) {
    const allowedCountries = new Set(country_list)
    return countrylist.filter(c => allowedCountries.has(c.alpha2)).map(c => [c.alpha2, `${c.alpha2} - ${c.name}`])
  }

  return countrylist.map(c => [c.alpha2, `${c.alpha2} - ${c.name}`])
}

const getTxPowerOptions = () => {
  const defaultOptions = getDefaultTxPowerOptions()
  if (!deviceOptions.value) return defaultOptions

  const { txpower_list } = deviceOptions.value
  if (!txpower_list) return defaultOptions

  const allowedPowers = new Set(txpower_list.map(String))
  return defaultOptions.filter(([value]) => value === '' || allowedPowers.has(value))
}
</script>
