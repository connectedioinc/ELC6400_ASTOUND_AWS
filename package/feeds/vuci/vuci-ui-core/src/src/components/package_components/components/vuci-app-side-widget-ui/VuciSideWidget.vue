<template>
  <div
    ref="side-widget-wrapper"
    class="side-widget-wrapper text-xs"
  >
    <div
      class="px-4 pb-1 mb-2 pt-2 flex gap-2 sticky top-0 z-10 bg-theme-bg-surface transition-shadow"
      :class="{
        'shadow-md': controlsSticky
      }"
    >
      <template
        v-for="button in sideButtons"
        :key="button.id"
      >
        <div
          v-if="button.exist"
          :id="button.id"
        >
          <tlt-button
            type="icon"
            class="w-5"
            :disabled="!hasWriteAccess"
            :color="button.active ? 'primary' : 'secondary'"
            @click.capture="button.active ? toggleServicePrompt(button) : toggleService(button)"
          >
            <tlt-icon :icon="button.icon" />
          </tlt-button>
          <p class="text-center text-caption-sm text-theme-text-secondary-subtle mt-0.5">{{ button.name }}</p>
        </div>
      </template>
    </div>
    <tlt-icon
      v-if="loading"
      icon="spinner"
      class="text-theme-text-primary w-20 h-20 absolute inset-x-1/2 inset-y-1/3"
      animate
    />
    <div
      v-else
      class="side-widget-card-wrapper"
      test-id="side-widget"
    >
      <tlt-dnd
        v-slot="{ items, startDrag }"
        :items="sortedArray"
        direction="both"
        class="flex flex-col gap-4 mb-4"
        drag-class="border-theme-border-primary! shadow-lg"
        restrict-to-container
        placeholder-class="opacity-50"
        :disabled="!hasWriteAccess"
        @drag-end="handleDragEnd"
      >
        <vuci-side-widget-card
          v-for="(widget, index) in items"
          :key="widget.id"
          :title="widget.content.title"
          :type="widget.type"
          :content="widget.content.content"
          :disabled="!hasWriteAccess"
          :path="widget.content.path"
          draggable
          @start-drag="startDrag($event, index)"
        />
      </tlt-dnd>
      <div class="widget pb-4">
        <div class="content-box bg-theme-bg-surface non-drag p-4">
          <div
            id="edit_side_boxes"
            class="edit-boxes"
            :class="{ closed: !settingsOpened }"
            @click="settingsOpened = true"
          >
            <tlt-icon
              v-show="!settingsOpened"
              icon="settings"
              class="size-16 m-auto h-full text-theme-text-subtle"
            ></tlt-icon>
            <div class="side-boxes-form">
              <h3 class="content-title pb-1 text-fish font-semibold">{{ $t('Settings') }}</h3>
              <div class="pt-2 border-t border-theme-border-strong">
                <div
                  v-for="widget in cards"
                  :key="widget.id"
                  class="check-item"
                >
                  <input
                    v-if="widget.content.length !== 0"
                    :id="widget.id"
                    type="checkbox"
                    :disabled="!hasWriteAccess"
                    :checked="widget.enabled === '1'"
                    @change="checkCheckBox(widget)"
                  />
                  <label
                    :for="widget.id"
                    class="label"
                  >
                    {{ widget['content'].title }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <tlt-modal
      :open="showMobilePrompt"
      size="small"
      :title="$t(`Are you sure you want to %s 'Mobile'?`).format(mobileSwitch ? $t('connect') : $t('disconnect'))"
      @close="showMobilePrompt = false"
    >
      <tlt-form
        ref="tltForm"
        class="mb-8"
        sid="sim_pin_change"
      >
        <ListLayout gap="md">
          <div class="text-base">
            {{ $t('Please select the modem(s) to %s from Mobile.').format(mobileSwitch ? $t('connect') : $t('disconnect')) }}
          </div>
          <tlt-form-item-switch
            v-model="mobileSwitch"
            prop="mobile"
            :label="$t('Enable mobile')"
            :help="$t('Enables mobile connection on selected modems.')"
          />
          <tlt-form-model-item :label="$t('Select modem')">
            <div
              test-id="radio-modem-selection"
              class="flex gap-x-4 gap-y-2"
            >
              <div
                v-for="(data, idx) in modemList"
                :key="idx"
              >
                <tlt-check-box
                  v-model="data.checked"
                  class="flex gap-1"
                  type="radio"
                  :text="data.name"
                  :custom-id="`option-${data.name}`"
                  @update:model-value="updateModemRadio(data.id)"
                />
              </div>
            </div>
          </tlt-form-model-item>
        </ListLayout>
      </tlt-form>
      <template #actions>
        <div class="flex gap-8 justify-center lg:justify-end mx-1">
          <tlt-button
            button-id="cancel"
            color="secondary"
            @click="showMobilePrompt = false"
          >
            {{ $t('Cancel') }}
          </tlt-button>
          <tlt-button
            button-id="ok"
            @click="toggleMobileService(mobileSwitch, modemList.find(modem => modem.checked).id || 'both')"
          >
            {{ mobileSwitch ? $t('Connect') : $t('Disconnect') }}
          </tlt-button>
        </div>
      </template>
    </tlt-modal>
  </div>
</template>

<script>
import { computed, useTemplateRef } from 'vue'
import { useScroll } from '@vueuse/core'
import VuciSideWidgetCard from './VuciSideWidgetCard.vue'
import { rms } from '@/utils/rms'

export default {
  components: { VuciSideWidgetCard },
  timers: {
    getStatusData: { time: 5000, autostart: false, immediate: true, repeat: true }
  },
  props: {
    opened: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'data-change'],
  setup() {
    const wrapper = useTemplateRef('side-widget-wrapper')

    const { y } = useScroll(wrapper)

    const controlsSticky = computed(() => y.value > 0)

    return { controlsSticky }
  },
  data() {
    return {
      sideButtons: {
        buttonWifi: {
          id: 'wifi',
          icon: 'wifi',
          name: this.$t('WiFi'),
          exist: false,
          active: false
        },
        buttonRms: {
          id: 'cloud',
          icon: 'cloud',
          name: this.$t('RMS'),
          exist: false,
          active: false
        },
        buttonMobile: {
          id: 'sim',
          icon: 'sim',
          name: this.$t('Mobile'),
          exist: false,
          active: false
        },
        buttonBluetooth: {
          id: 'bluetooth',
          icon: 'bluetooth',
          name: this.$t('Bluetooth'),
          exist: false,
          active: false
        }
      },
      sections: [],
      cards: [],
      settingsOpened: false,
      loading: true,
      firstCpuStatusLoad: true,
      showMobilePrompt: false,
      mobileSwitch: false,
      modemList: []
    }
  },
  computed: {
    sortedArray() {
      const sortedList = this.cards.slice(0).sort((a, b) => a.position - b.position)
      return sortedList.filter(card => card.content.length !== 0 && card.enabled === '1')
    },
    rmsMqttExists() {
      return this.$store.hasPackages('rms_mqtt')
    },
    hasWriteAccess() {
      return this.$session.hasAccess('status/widget', 'write')
    }
  },
  watch: {
    opened(open) {
      if (open) this.fetchData()
      else this.$timer.stop(this.getStatusData)
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    /**
     * @description Formats SIM card state
     * @param {object} modem - modem data
     */
    formatPinState(modem) {
      if (!modem.pinstate) return '-'
      const activeSim = this.$mobile.getSimLabel(modem.active_sim, modem.esim_profile, modem.id, true)
      return 'SIM%s - %s'.format(activeSim, this.$mobile.getSimstate(modem, true))
    },
    /**
     * @description DND related function that is executed after widget card position is changed.
     * @param data - Data structure after element position changed
     */
    handleDragEnd(items) {
      this.savePosition(items)
      this.$emit('data-change', items)
    },
    /**
     * @description Function gets sidewidget data, creates cards from config information, and starts data polling.
     */
    fetchData() {
      return this.$axios
        .get('/api/widget/config')
        .then(res => {
          if (JSON.stringify(res.data) !== JSON.stringify(this.sections)) {
            this.loading = true
            this.sections = res.data
            this.cards = res.data.map(section => ({
              name: section.section_name,
              type: section.card_id,
              id: section.id,
              position: section.position,
              enabled: section.enabled,
              content: []
            }))
          }
          this.$timer.start(this.getStatusData)
          this.initButtons()
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    /**
     * @description: Function check if side widget buttons exist, and loads their data
     */
    initButtons() {
      this.sideButtons.buttonMobile.exist = !!this.$store.board.hwinfo?.mobile
      this.sideButtons.buttonBluetooth.exist = !!this.$store.board.hwinfo?.bluetooth
      this.sideButtons.buttonWifi.exist = !!this.$store.board.hwinfo?.wifi
      this.sideButtons.buttonRms.exist = this.sections.some(widget => widget.card_id === 'rms')
      this.checkIfEnabled()
    },
    /**
     * @description Function check if services are enabled.
     */
    checkIfEnabled() {
      return this.$axios
        .bulkGet([
          {
            endpoint: '/api/bluetooth/config/general',
            condition: this.sideButtons.buttonBluetooth.exist
          },
          { endpoint: '/api/wireless/interfaces/config', condition: this.sideButtons.buttonWifi.exist },
          {
            endpoint: '/api/modems/status',
            condition: this.sideButtons.buttonMobile.exist && !this.$store.isSwitch
          },
          {
            endpoint: '/api/rms/config/rms_connect_mqtt',
            condition: this.sideButtons.buttonRms.exist && this.rmsMqttExists
          }
        ])
        .then(([bluetoothRes, wifiRes, mobileRes, rmsRes]) => {
          if (bluetoothRes.success) this.sideButtons.buttonBluetooth.active = bluetoothRes.data.enabled === '1'
          else this.$message.error(this.$t('Failed to load bluetooth data'))
          if (wifiRes.success) this.sideButtons.buttonWifi.active = wifiRes.data.some(section => section.enabled === '1')
          else this.$message.error(this.$t('Failed to load wireless data'))
          if (mobileRes.success) {
            const parsedMobileData = this.$mobile.parseModems(mobileRes.data).filter(m => m.builtin)
            this.modemList = [
              { id: 'both', name: this.$t('Both'), checked: true },
              ...parsedMobileData.map(modem => ({
                id: modem.id,
                name: modem.shortName,
                checked: false,
                flightMode: modem.mobile_stage === 23
              }))
            ]
            this.sideButtons.buttonMobile.active = mobileRes.data.some(section => section.mobile_stage !== 23)
          } else this.$message.error(this.$t('Failed to load mobile data'))
          if (rmsRes.success) this.sideButtons.buttonRms.active = rmsRes.data.enable === '1'
          else this.$message.error(this.$t('Failed to load RMS data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    getStatusData() {
      return this.$axios
        .bulkGet([
          this.firstCpuStatusLoad ? '/api/system/device/usage/status?exclude=loadavg' : '/api/system/device/usage/status',
          { endpoint: '/api/wireless/interfaces/basic/status', condition: 'vuci-app-wireless-api.control' },
          { endpoint: '/api/modems/status', condition: 'mobifd.control' },
          {
            endpoint: '/api/rms/status',
            condition: this.sections.some(widget => widget.card_id === 'rms')
          },
          { endpoint: '/api/ports_settings/status', condition: !!this.$store.board.hwinfo?.port_link && this.$session.hasAccess('network/ports/ports_settings', 'read') }
        ])
        .then(([systemRes, wifiRes, mobileRes, rmsRes, portsRes]) => {
          if (systemRes.success) this.parseSystemData(systemRes.data)
          else this.$message.error(this.$t('Failed to load system data'))
          if (wifiRes.success) this.parseWifiData(wifiRes.data)
          else this.$message.error(this.$t('Failed to load wireless data'))
          if (mobileRes.success) this.parseMobileData(this.$mobile.parseModems(mobileRes.data))
          else this.$message.error(this.$t('Failed to load mobile data'))
          if (rmsRes.success) this.parseRmsData(rmsRes.data)
          else this.$message.error(this.$t('Failed to load RMS data'))
          if (portsRes.success) this.parsePortData(portsRes.data)
          else this.$message.error(this.$t('Failed to load port data'))
          this.loading = false
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.firstCpuStatusLoad = false
        })
    },
    /**
     * @description Function parse necessary information for widget from mobile data
     * @param {import('@/types/portTypes').RutPortStatus[]} status
     */
    parsePortData(status) {
      if (!status.length) return
      const card = this.cards.find(element => element.type === 'ports')
      if (!card) return
      /** @type {import('@ui-core/tlt-design/customComponents/network/Ports.vue').GetPortData} */
      const getPortData = portId => {
        const portStatus = status.find(e => e.id === portId)
        return {
          type: portStatus?.enabled === '1' ? (portStatus?.state === 'down' ? 'down' : 'up') : 'disabled',
          speed: this.$ports.getPortSpeedIcon(portStatus),
          hint: this.$ports.getRutPortHint(portStatus),
          poe: this.$ports.getPoeState(portStatus)
        }
      }
      card.content = {
        title: this.$t('Port Status'),
        path: '/network/ports/ports_settings',
        content: { getPortData }
      }
    },
    /**
     * @description Function parse necessary information for widget from mobile data
     * @param {object[]} data - Mobile data
     * @return {object[]} - Parsed mobile data with widget card supported structure
     */
    parseMobileData(data) {
      if (!data.length) return
      const onlyOneModem = data.length === 1
      const modems = data.map(modem => ({
        endpoint: `/api/modems/${modem.id}/sim_cards/config`,
        parsedData: {
          id: modem.id,
          name: modem.name,
          sim_count: modem.sim_count,
          simArr: modem.sim_count ? [...Array(modem.sim_count)].map((_, i) => this.$mobile.adjustSimNumber(i + 1, modem.id)) : [],
          connection: this.$mobile.getDataConnState(modem.data_conn_state),
          state: modem.operator_state ? this.$mobile.getOperatorState(modem.operator_state) + '; ' + modem.operator + '; ' + this.$mobile.getConntype(modem.conntype) : '-',
          pinstate: this.formatPinState(modem),
          sim: modem.active_sim,
          esim: modem.esim_profile,
          signal: modem.rssi,
          offline: modem.offline,
          blocked: modem.blocked,
          disabled: modem.disabled,
          flightMode: this.$mobile.getFlightMode(modem)
        }
      }))
      return this.$axios.bulkGet(modems.map(modem => modem.endpoint)).then(response => {
        response.forEach(({ success, data }, index) => {
          if (!success) return this.$message.error(this.$t('Failed to load SIM card data'))
          const modemData = modems[index].parsedData
          const modemCard = this.cards.find(element => element.type === 'mobile' && element.name === modemData.id)
          if (!modemCard) return
          function isPrimarySim(sim, modemData) {
            const esimCheck = !sim?.esim_profile || modemData.esim === sim?.esim_profile
            return parseInt(sim.position) === modemData.sim && esimCheck
          }
          const primarySim = data.find(sim => isPrimarySim(sim, modemData)) || {}
          let title = !onlyOneModem ? this.$t('Mobile status - %s').format(this.$t(modemData.name)) : this.$t('Mobile status')
          if (this.$mobile.modemOffline(modemData)) {
            title = '%s (%s)'.format(title, this.$mobile.getBlockedText(modemData))
            modemData.signal = '-'
          }
          modemCard.content = {
            title,
            path: primarySim.id ? `/network/mobile/general/${modemData.id}?simTab=${primarySim.id}` : `/network/mobile/general/${modemData.id}`,
            content: modemData
          }
        })
      })
    },
    /**
     * @description Function parse necessary information for widget from system data
     * @param {object[]} data - System data
     * @return {object[]} - Parsed system data with widget card supported structure
     */
    parseSystemData(data) {
      if (Array.isArray(data) && !data.length) return
      const parsedData = data
      if (this.firstCpuStatusLoad) parsedData.loadavg = 0.4
      const section = this.cards.find(element => element.type === 'system')
      section.content = {
        title: this.$t('System status'),
        path: '/status/system',
        content: parsedData
      }
    },
    /**
     * @description Function parse necessary information for widget from rms data
     * @param {object[]} data - RMS data
     * @return {object[]} - Parsed RMS data with widget card supported structure
     */
    parseRmsData(data) {
      if (Array.isArray(data) && !data.length) return
      const section = this.cards.find(element => element.type === 'rms')
      if (!section) return []
      const connectionState = rms.parseConnectionState(data)
      const parsedData = {
        connectionStateText: connectionState.text,
        connectionStateColor: connectionState.color,
        status: rms.parseStatus(data)
      }
      section.content = {
        title: this.$t('RMS status'),
        path: '/services/cloud_solutions/rms',
        content: parsedData
      }
    },
    /**
     * @description Function parse necessary information for widget from wireless data
     * @param {object[]} data - WiFi data
     * @return {object[]} - Parsed WiFi data with widget card supported structure
     */
    parseWifiData(data) {
      if (!data.length) return
      data.forEach(wifi => {
        if (wifi.mode !== 'ap') return
        const section = this.cards.find(element => element.type === 'wifi' && (element.name === wifi.id || element.name === wifi.link))
        if (!section) return
        section.content = {
          title: this.$t('WiFi %s (%s) status').format(wifi.ssid, wifi.devices.map(dev => dev.band).join(', ')),
          path: `/network/wireless/ssids?edit=${wifi.id}`,
          content: {
            up: wifi.up,
            ssid: wifi.ssid,
            num_assoc: wifi.num_assoc,
            quality: wifi.devices.map(dev => [dev.quality, dev.band])
          }
        }
      })
    },
    /**
     * @description: function toggles bluetooth service
     * @param active service activation status
     */
    toggleBluetoothService(active) {
      return this.$axios.put('/api/bluetooth/config/general', {
        data: { enabled: active ? '1' : '0' }
      })
    },
    /**
     * @description: function toggles wireless service
     * @param active service activation status
     */
    toggleWirelessService(active) {
      return this.$axios.get('/api/wireless/interfaces/config').then(({ data }) => {
        return this.$axios.put('/api/wireless/interfaces/config', {
          data: data.map(wifi => ({
            id: wifi.id,
            enabled: active ? '1' : '0'
          }))
        })
      })
    },
    /**
     * @description: function toggles mobile service
     * @param active service activation status
     */
    toggleMobileService(active, modem) {
      const previosState = this.sideButtons.buttonMobile.active
      if (!modem) {
        return this.$axios.put(`/api/modems/${this.modemList[1]?.id}/global`, {
          data: { flight_mode: active ? '0' : '1' }
        })
      }
      let modems = []
      if (modem === 'both') {
        this.sideButtons.buttonMobile.active = active
        this.modemList
          .filter(m => m.id !== 'both')
          .forEach(m => {
            modems.push(m.id)
            m.flightMode = !active
            if (active) this.sideButtons.buttonMobile.active = true
          })
      } else {
        modems = [modem]
        this.sideButtons.buttonMobile.active = false
        this.modemList
          .filter(m => m.id !== 'both')
          .forEach(m => {
            if (m.id === modem) {
              m.flightMode = !active
            }
            if (!m.flightMode) this.sideButtons.buttonMobile.active = true
          })
      }
      modems.forEach(modemId => {
        this.$spin()
        return this.$axios
          .put(`/api/modems/${modemId}/global`, {
            data: { flight_mode: active ? '0' : '1' }
          })
          .catch(() => {
            this.sideButtons.buttonMobile.active = previosState
            this.$message.error(this.$t('Failed to toggle %s service').format(this.$t('Mobile')))
          })
          .finally(() => {
            this.$spin(false)
            this.showMobilePrompt = false
          })
      })
    },
    /**
     * @description: function toggles rms service
     * @param active service activation status
     */
    toggleRmsService(active) {
      return this.$axios.put('/api/rms/config/rms_connect_mqtt', {
        data: { enable: active ? '1' : '0' }
      })
    },
    /**
     * @description Function executes toggle function for specified service
     * @param {object} item
     */
    toggleServicePrompt(item) {
      if (item.id === 'sim' && this.modemList.length > 2) {
        this.showMobilePrompt = true
        return
      }
      this.$prompt.show({
        title: this.$t(`Are you sure you want to disconnect '%s'?`).format(item.name),
        content: this.$t(`%s connection will be lost.`).format(item.name),
        okText: this.$t('Disconnect'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.toggleService(item)
      })
    },
    toggleService(item) {
      if (!this.hasWriteAccess) return
      const toggles = {
        sim: { fn: this.toggleMobileService, name: this.$t('Mobile') },
        cloud: { fn: this.toggleRmsService, name: this.$t('RMS') },
        wifi: { fn: this.toggleWirelessService, name: this.$t('Wireless') },
        bluetooth: { fn: this.toggleBluetoothService, name: this.$t('Bluetooth') }
      }
      item.active = !item.active
      const toggle = toggles[item.id]
      return toggle.fn(item.active).catch(() => {
        item.active = !item.active
        this.$message.error(this.$t('Failed to toggle %s service').format(toggle.name))
      })
    },
    /**
     * @description Function saves provided objects positions to config
     * @param {object[]} reorderedData
     */
    savePosition(reorderedData) {
      reorderedData.forEach((card, index) => {
        const cardSection = this.sections.find(section => section.id === card.id)
        card.position = (index + 1).toString()
        cardSection.position = card.position
      })
      return this.$axios.put('/api/widget/config/', {
        data: this.sections.map(section => ({
          id: section.id,
          enabled: section.enabled,
          position: section.position
        }))
      })
    },
    /**
     * @description Function turns on and off widget card
     * @param item Widget which need to be toggled.
     */
    checkCheckBox(item) {
      const itemSection = this.sections.find(section => section.id === item.id)
      item.enabled = item.enabled === '1' ? '0' : '1'
      itemSection.enabled = item.enabled
      return this.$axios.put(`/api/widget/config/${item.id}`, { data: { enabled: item.enabled } }).catch(() => {
        item.enabled = item.enabled === '1' ? '0' : '1'
        itemSection.enabled = item.enabled
        this.$message.error(this.$t('Failed to toggle widget'))
      })
    },
    updateModemRadio(id) {
      this.modemList.forEach(modem => {
        modem.checked = modem.id === id
      })
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.side-widget-wrapper {
  height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
}

.side-widget-card-wrapper {
  padding-inline: 1rem;
}

input[type='checkbox'] {
  background: var(--color-theme-bg-surface);
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 0.8rem;
  height: 0.8rem;
  min-width: 0.8rem;
  min-height: 0.8rem;
  padding: 0;
  cursor: pointer;
  margin-right: 0.5rem;
  &:checked::after {
    background-image: url('/icons/checkbox_tick.svg');
    background-position: 0px -3px;
    background-repeat: no-repeat;
    width: 1rem;
    height: 1rem;
    content: '';
    display: flex;
  }
  & + .label {
    word-break: break-all;
    cursor: pointer;
  }
  &:disabled {
    cursor: auto;
    .label {
      cursor: auto;
    }
  }
}

input {
  border: 1px solid var(--color-theme-border-base);
  border-radius: 0.5rem;
  border-color: var(--color-theme-border-strong);
}

.toggle-btn-container {
  padding: 0.6rem 1rem 0.75rem;
  display: flex;
}

.widget {
  box-sizing: border-box;
  line-height: 1rem;
}

.content-box {
  width: 100%;
  border: 1px solid var(--color-theme-border-base);
  border-radius: 5px;
}
.content-box:has(.content-title.draggable:hover) {
  border-color: var(--color-theme-border-primary);
}

.edit-boxes {
  margin: 0 auto;
}

.edit-boxes.closed {
  height: 5.5rem;
  width: 5.25rem;
  border-radius: 50%;
  cursor: pointer;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
}

.edit-boxes.closed .side-boxes-form {
  display: none;
}

.check-item {
  display: flex;
  align-items: center;
}

.widget-settings {
  cursor: pointer;
}

.card-title {
  flex: 1;
  line-height: 1.25rem;
  word-break: break-all;
}

.content-title {
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Open Sans', sans-serif;
  font-family: var(--font-sans);
  text-transform: uppercase;
}

.heading-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

@media not all and (min-width: theme(--breakpoint-lg)) {
  .side-widget-card-wrapper {
    scroll-behavior: smooth;
  }
}
</style>
