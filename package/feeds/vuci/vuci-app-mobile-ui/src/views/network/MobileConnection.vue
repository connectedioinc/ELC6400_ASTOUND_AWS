<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="sectionName"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sim_cards/config' }]"
      data-key="simcards"
      :exception-options="exceptionOptions"
    >
      <tlt-card
        :title="$t('Connection')"
        :help="$t('Connection settings for the inserted SIM card.')"
      >
        <template #title-content>
          <span
            id="warning"
            class="flex items-center h-8 ml-2"
          >
            <tlt-icon
              v-if="!hasServiceModes || !sectionModem.builtin"
              icon="warning"
              class="text-theme-text-warning size-5"
            />
            <tlt-popover target="#warning">
              {{ sectionModem.builtin ? $t(`Instance can't be edited because modem is blocked or disabled`) : $t(`Instance can't be edited because external modem is used`) }}
            </tlt-popover>
          </span>
        </template>
        <vuci-form-item-select
          :uci-section="s"
          label="VoLTE"
          :help="$t('VoLTE (Voice over LTE) is a digital packet technology that uses 4G LTE networks to route voice traffic and transmit data.')"
          name="volte"
          :options="volteOptions"
          :depend="has4G && sectionModem.builtin && sectionModem.volte_supported"
          :no-write="!has4G"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="service"
          :label="$t('Preferred network type')"
          :help="serviceModeHint"
          :options="serviceModes"
          :depend="hasServiceModes && sectionModem.builtin && serviceModes.length > 1"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="category_lte"
          :label="$t('Network category')"
          :help="$t('Specify network category.')"
          :depend="hasServiceModes && (s.service === 'lte_pref' || s.service === 'lte' || (serviceModes.length === 1 && has4G)) && lowPowerModem && sectionModem.builtin"
          :options="categoryOptions"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="nr5g_mode"
          :label="$t('5G mode')"
          :help="$t('Specify 5G mode.')"
          :depend="hasServiceModes && s.service?.includes('nr5g') && sectionModem.builtin && !sectionModem.auto_5g_mode && !sectionModem.nr5g_sa_disabled && !hide5gMode"
          :options="nr5gOptions"
          :no-write="hide5gMode"
          @change="reset5gBands(s)"
        />
        <template v-if="hasServiceModes">
          <vuci-form-item-select
            :uci-section="s"
            name="band"
            :options="bandOptions"
            :disabled-options="disabledOptions"
            :label="$t('Band selection')"
            :help="$t('Network band selection.')"
            initial="auto"
            :depend="sectionModem.builtin"
          />
          <vuci-form-item-select
            v-if="fiveGBandsOptions"
            :uci-section="s"
            name="fiveG"
            :label="$t('%s bands').format('5G')"
            :help="$t('Manual 5G band selection.')"
            :options="fiveGBandsOptions"
            :depend="s.band == 'manual' && s.service?.includes('nr5g') && sectionModem.builtin"
            multiple
            required
            has-select-all
            no-write
            @change="update5gBands(s)"
          >
            <template #option="{ option }">
              <mobile-band-badges
                :value="option.value"
                :info-list="bandInfoList(option.key, sectionModem.nr5gInfo)"
                :colors="badgeColors"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            v-if="sectionModem?.lteBands"
            :uci-section="s"
            name="lte"
            :label="$t('%s bands').format(lowPowerModem ? 'CAT-M1' : 'LTE')"
            :help="$t('Manual %s band selection.').format(lowPowerModem ? 'CAT-M1' : '4G')"
            :options="sectionModem.lteBands"
            :depend="
              s.band == 'manual' &&
              sectionModem.builtin &&
              (((s.service?.includes('lte') || s.service?.includes('nr5g_pref')) && !lowPowerModem) || (lowPowerModem && (s.category_lte === 'm1_nb' || s.category_lte === 'm1')))
            "
            has-select-all
            multiple
            required
          >
            <template #option="{ option }">
              <mobile-band-badges
                :value="option.value"
                :info-list="bandInfoList(option.key, sectionModem.lteInfo)"
                :colors="badgeColors"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            v-if="sectionModem?.nbBands"
            :uci-section="s"
            name="lte_nb"
            :label="$t('%s bands').format('CAT-NB')"
            :help="$t('Manual CAT-NB band selection.')"
            :options="sectionModem.nbBands"
            :depend="s.band == 'manual' && lowPowerModem && (s.category_lte === 'm1_nb' || s.category_lte === 'nb') && sectionModem.builtin"
            multiple
            required
            has-select-all
          >
            <template #option="{ option }">
              <mobile-band-badges
                :value="option.value"
                :info-list="bandInfoList(option.key, sectionModem.nbInfo)"
                :colors="badgeColors"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            v-if="sectionModem?.umtsBands"
            :uci-section="s"
            name="umts"
            :label="$t('%s bands').format('UMTS')"
            :help="$t('Manual 3G band selection.')"
            :options="sectionModem.umtsBands"
            :depend="s.band == 'manual' && (s.service?.includes('_pref') || s.service?.includes('3g')) && sectionModem.builtin && !sectionModem.auto_3g_bands"
            multiple
            required
            has-select-all
          >
            <template #option="{ option }">
              <mobile-band-badges
                :value="option.value"
                :info-list="bandInfoList(option.key, sectionModem.umtsInfo)"
                :colors="badgeColors"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            v-if="sectionModem?.gsmBands"
            :uci-section="s"
            name="gsm"
            :label="$t('%s bands').format('GSM')"
            :help="$t('Manual 2G band selection.')"
            :options="sectionModem.gsmBands"
            :depend="s.band == 'manual' && (s.service?.includes('_pref') || s.service?.includes('2g')) && sectionModem.builtin && !sectionModem.auto_2g_bands"
            multiple
            required
            has-select-all
          >
            <template #option="{ option }">
              <mobile-band-badges
                :value="option.value"
                :info-list="bandInfoList(option.key, sectionModem.gsmInfo)"
                :colors="badgeColors"
              />
            </template>
          </vuci-form-item-select>
        </template>
      </tlt-card>
      <tlt-card
        v-if="sectionModem.builtin && sectionModem.low_signal_reconnect"
        :title="$t('Low signal reconnect')"
        :help="$t('Low signal reconnect configuration section.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Enables modem operator connection resetting based on signal threshold.')"
          name="signal_reset_enabled"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Reset threshold')"
          :help="
            $t('Signal threshold in dBm for the connection. When signal is under this value modem resets connection. %s More information %s').format(
              '<a target=\'_blank\' href=\'' + $brand('mobileRSSIWikiURL') + '\'>',
              '</a>'
            )
          "
          name="signal_reset_threshold"
          initial="-90"
          rules="irange(-120,-50)"
          :required="s.signal_reset_enabled === '1'"
          rawhtml
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Reset timeout')"
          :help="$t('Wait this long in seconds before trying to reset the connection again.')"
          name="signal_reset_timeout"
          initial="600"
          :rules="['uinteger', 'range(15,65535)']"
          :required="s.signal_reset_enabled === '1'"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>
<script>
import MobileBandBadges from '../../components/network/MobileBandBadges'

export default {
  components: {
    MobileBandBadges
  },
  data() {
    return {
      formData: { simcards: [] },
      categoryOptions: [
        ['m1_nb', this.$t('%s auto').format('M1+NB')],
        ['m1', this.$t('%s only').format('M1')],
        ['nb', this.$t('%s only').format('NB')]
      ],
      nr5gOptions: [
        ['auto', this.$t('Auto')],
        ['nsa', 'NSA'],
        ['sa', 'SA']
      ],
      bandOptions: [
        ['auto', this.$t('Auto')],
        ['manual', this.$t('Manual')]
      ],
      volteOptions: [
        ['auto', this.$t('Auto')],
        ['on', this.$t('On')],
        ['off', this.$t('Off')]
      ],
      modemList: [],
      hide5gMode: false,
      badgeColors: ['bg-theme-bg-success text-theme-text-on-success', 'bg-theme-bg-primary-2 text-theme-text-on-primary', 'bg-theme-bg-primary-1 text-theme-text-on-primary']
    }
  },

  computed: {
    sectionName() {
      return this.$route.path.substring(this.$route.path.lastIndexOf('/') + 1)
    },
    sectionModem() {
      return this.modemList.find(m => m.id === this.currentSection.modem) || {}
    },
    currentSection() {
      return this.formData.simcards.find(sim => sim.id === this.sectionName) || this.formData.simcards[0] || {}
    },
    serviceModeHint() {
      return this.$t(
        'Specify your preferred network type. If your mobile network is compatible with %s standards, you may choose the preferred network type to which the device should attempt to connect.'
      ).format(this.supportedModes.join(', '))
    },
    serviceModes() {
      function newMode(mode) {
        if (mode === '4G') return 'lte'
        if (mode === '5G') return 'nr5g'
        return mode.toLowerCase()
      }
      const autoModes = this.supportedModes
        .slice(0, -1)
        .map(mode => ['%s_pref'.format(newMode(mode)), this.$t('%s/%s auto').format(mode, this.supportedModes.filter(val => val !== mode && val < mode).join('/'))])
      const onlyModes = this.supportedModes.filter(mode => mode !== '5G').map(mode => [newMode(mode), this.$t('%s only').format(mode)])
      return [...autoModes, ...onlyModes]
    },
    supportedModes() {
      if (!this.sectionModem.service_modes) return []
      const modes = Object.keys(this.sectionModem.service_modes).sort().reverse()
      const mode5gNsa = modes.findIndex(mode => mode === '5G_NSA')
      const mode5gSa = modes.findIndex(mode => mode === '5G_SA')
      if (mode5gNsa !== -1) modes[mode5gNsa] = '5G'
      else if (mode5gSa !== -1) modes[mode5gSa] = '5G'
      return modes.filter(mode => mode !== 'NB' && mode !== '5G_SA')
    },
    has4G() {
      return this.supportedModes.includes('4G')
    },
    hasServiceModes() {
      return this.sectionModem.service_modes ? Object.keys(this.sectionModem.service_modes).length > 0 : false
    },
    has5gSaBands() {
      return this.sectionModem.service_modes && Object.keys(this.sectionModem.service_modes).includes('5G_SA')
    },
    disabledOptions() {
      const threeG = this.currentSection.service?.includes('3g') && this.sectionModem.auto_3g_bands
      const twoG = this.currentSection.service?.includes('2g') && this.sectionModem.auto_2g_bands
      return threeG || twoG ? [['manual', this.$t('Manual')]] : []
    },
    exceptionOptions() {
      return this.supportedModes.includes('5G') && this.currentSection.service?.includes('nr5g') ? ['nr5g', 'nr5g_sa'] : []
    },
    lowPowerModem() {
      return this.$mobile.modemLowPower(this.sectionModem)
    }
  },
  mounted() {
    this.$bus.on('nr5g_network_mode', this.nr5gModeEvent)
    this.$bus.on('mbn_settings_changed', this.reloadConfig)
  },
  beforeUnmount() {
    this.$bus.off('nr5g_network_mode', this.nr5gModeEvent)
    this.$bus.off('mbn_settings_changed', this.reloadConfig)
  },
  methods: {
    afterLoad() {
      return this.$axios
        .get('/api/modems/status')
        .then(res => {
          this.modemList = this.$mobile.parseModems(res.data).map(modem => (modem.service_modes && Object.keys(modem.service_modes).length ? this.loadBands(modem) : modem))
          this.updateSection()
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem options'))
        })
    },
    updateSection() {
      const section = this.formData.simcards.find(sim => sim.id === this.sectionName) || this.formData.simcards[0]
      if (section) section.fiveG = [...new Set([...(section.nr5g ?? []), ...(section.nr5g_sa ?? [])])]
    },
    loadBands(modem) {
      const duplexFor4G = val => {
        val = Number(val)
        if (val >= 33 && val <= 54) return 'TDD'
        else if ([29, 32, 67, 69, 75, 76].includes(val)) return 'SDL'
        else return 'FDD'
      }
      const duplexFor5G = val => {
        val = Number(val)
        if ([29, 67, 75, 76].includes(val)) return 'SDL'
        else if ((val >= 80 && val <= 89 && val !== 85) || (val >= 95 && val <= 99 && val !== 96)) return 'SUL'
        else if ((val >= 34 && val <= 54) || (val >= 77 && val <= 90 && val !== 85) || (val >= 96 && val <= 104 && val !== 100) || (val >= 257 && val <= 262)) return 'TDD'
        else return 'FDD'
      }

      if (modem.service_modes['2G']) {
        modem.gsmBands = []
        modem.gsmInfo = []
        modem.service_modes['2G'].forEach(v => {
          modem.gsmBands.push([v, v.toUpperCase().replace('_', '-')])
          modem.gsmInfo.push({ name: v, frequency: `${v.split('_')[1]} MHz` })
        })
      }
      if (modem.service_modes['3G']) {
        modem.umtsBands = []
        modem.umtsInfo = []
        modem.service_modes['3G'].forEach(v => {
          const frequency = v.split('_')[1].toUpperCase()
          modem.umtsBands.push([v, `B${this.$mobile.umtsFrequencyToBand(frequency)}`])
          modem.umtsInfo.push({ name: v, frequency: `${frequency} MHz` })
        })
        modem.umtsBands.sort((a, b) => parseInt(a[1].slice(1)) - parseInt(b[1].slice(1)))
      }
      if (modem.service_modes['4G']) {
        modem.lteBands = []
        modem.lteInfo = []
        modem.service_modes['4G'].forEach(v => {
          const band = v.split('_b')[1]
          modem.lteBands.push([v, `B${band}`])
          modem.lteInfo.push({ name: v, frequency: `${this.$mobile.lte5gBandToFrequency(Number(band))} MHz`, bandMode: duplexFor4G(band) })
        })
      }
      if (modem.service_modes.NB) {
        modem.nbBands = []
        modem.nbInfo = []
        modem.service_modes.NB.forEach(v => {
          const band = v.split('_nb')[1]
          modem.nbBands.push([v, `NB${band}`])
          modem.nbInfo.push({ name: v, frequency: `${this.$mobile.lte5gBandToFrequency(Number(band))} MHz`, bandMode: duplexFor4G(band) })
        })
      }
      modem.nr5gInfo = []
      if (Object.keys(modem.service_modes).includes('5G_NSA')) {
        const bands = modem.service_modes['5G_NSA'].map(v => v.split('_n').pop())
        modem.nr5gNsaBands = [...new Set(bands)].sort((a, b) => a - b).map(v => [v, `n${v}`])
        modem.nr5gInfo = [...bands.map(v => ({ name: v, frequency: `${this.$mobile.lte5gBandToFrequency(Number(v), true)} MHz`, bandMode: duplexFor5G(v), nsa: true }))]
        modem.nr5gBands = [...modem.nr5gNsaBands]
      }
      if (Object.keys(modem.service_modes).includes('5G_SA')) {
        const bands = modem.service_modes['5G_SA'].map(v => v.split('_n').pop())
        modem.nr5gSaBands = [...new Set(bands)].sort((a, b) => a - b).map(v => [v, `n${v}`])
        bands.forEach(band => {
          const found = modem.nr5gInfo.findIndex(v => v.name === band)
          if (found !== -1) modem.nr5gInfo[found].sa = true
          else modem.nr5gInfo.push({ name: band, frequency: `${this.$mobile.lte5gBandToFrequency(Number(band), true)} MHz`, bandMode: duplexFor5G(band), sa: true })
        })
        const nsaBands = modem.nr5gNsaBands ? modem.nr5gNsaBands.map(JSON.stringify) : []
        const saBands = modem.nr5gSaBands ? modem.nr5gSaBands.map(JSON.stringify) : []
        modem.nr5gBands = [...new Set([...nsaBands, ...saBands])].map(JSON.parse).sort((a, b) => a[0] - b[0])
      }
      return modem
    },
    fiveGBandsOptions(s) {
      if (s.nr5g_mode === 'nsa') return this.sectionModem.nr5gNsaBands
      if (s.nr5g_mode === 'sa') return this.sectionModem.nr5gSaBands
      return this.sectionModem.nr5gBands
    },
    reset5gBands(s) {
      if (s.band === 'manual') {
        s.fiveG = []
        s.nr5g = []
        s.nr5g_sa = []
      }
    },
    update5gBands(s) {
      if (s.fiveG === '') s.fiveG = []
      if (this.has5gSaBands && s.nr5g_mode === 'sa') s.nr5g_sa = s.fiveG
      else if (s.nr5g_mode === 'nsa') s.nr5g = s.fiveG
      else {
        s.nr5g = s.fiveG.filter(band => this.sectionModem.nr5gInfo.find(v => v.name === band).nsa)
        if (!this.has5gSaBands) return
        s.nr5g_sa = s.fiveG.filter(band => this.sectionModem.nr5gInfo.find(v => v.name === band).sa)
      }
    },
    nr5gModeEvent(modemId) {
      if (this.sectionModem.id === modemId) this.hide5gMode = true
    },
    bandInfoList(key, list) {
      const band = list.find(v => v.name === key)
      if (!band) return []
      const array = [band.frequency]
      if (band.bandMode) array.push(band.bandMode)
      if (band.sa || band.nsa) {
        if (this.currentSection.nr5g_mode === 'sa') array.push('SA')
        else if (this.currentSection.nr5g_mode === 'nsa') array.push('NSA')
        else {
          if (band.nsa && band.sa) array.push('SA + NSA')
          else array.push(band.sa ? 'SA' : 'NSA')
        }
      }
      return array
    },
    reloadConfig() {
      this.formData.simcards = []
      this.$refs.vuciForm.loadData(true)
    }
  }
}
</script>
