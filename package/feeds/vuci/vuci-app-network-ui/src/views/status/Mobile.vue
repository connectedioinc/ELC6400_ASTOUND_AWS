<template>
  <NavigationTabs
    :tabs="tabs"
    @update:selected="tabChange"
  >
    <div class="pb-4!">
      <GridLayout
        class="grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4"
        borders
      >
        <tlt-card-new
          v-for="(card, idx) in cards"
          :key="idx"
          class="h-full"
          :item="card"
          borderless
        >
          <template #header="{ item }">
            <tlt-hint
              v-if="connectionHints.length && idx === 'connection'"
              show-icon
            >
              {{ item.title }}
              <template #hintBox>
                <div
                  v-for="(hint, id) in connectionHints"
                  :key="id"
                >
                  * {{ hint.text }}
                  <router-link
                    v-if="hint.to"
                    :to="hint.to"
                  >
                    {{ hint.toText }}
                  </router-link>
                </div>
              </template>
            </tlt-hint>
            <tlt-hint
              v-else-if="pinMessage && idx === 'sim_card'"
              show-icon
            >
              {{ item.title }}
              <template #icon="{ touchShow }">
                <tlt-icon
                  :icon="'warning'"
                  class="size-5 transition-colors"
                  :class="touchShow ? 'text-theme-text-warning' : 'text-theme-text-subtle'"
                />
              </template>
              <template #hintBox>
                {{ pinMessage }}
                <button
                  v-if="unlockText"
                  class="underline text-theme-text-primary"
                  href=""
                  @click="showUnblockModal"
                >
                  {{ unlockText }}
                </button>
              </template>
            </tlt-hint>
            <tlt-hint
              v-else-if="activeDataLimits.length && idx === 'data_card'"
              show-icon
            >
              {{ item.title }}
              <template #hintBox>
                <div class="font-bold">
                  {{ $t('Data limit - used / limit') }}
                </div>
                <div
                  v-for="limit in activeDataLimits"
                  :key="limit.name"
                  class="break-all"
                >
                  * {{ limit.name }} - <span :class="limit.class">{{ limit.value }}</span>
                </div>
              </template>
            </tlt-hint>
          </template>
          <template #sim_card_slot_in_use="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-hint
                :show-icon="option.scoped"
                icon="info"
                class="font-semibold"
              >
                {{ option.value }}
                <template
                  v-if="option.scoped"
                  #hintBox
                >
                  <span>
                    {{ $t('The default SIM and active SIM can be different because SIM switch is enabled.') }}
                    <router-link :to="`/network/mobile/sim_switch/${modemId}`">
                      {{ $t('SIM switch configuration') }}
                    </router-link>
                  </span>
                </template>
              </tlt-hint>
            </tlt-card-row>
          </template>
          <template #operator_state="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-hint
                :show-icon="option.limited"
                icon="info"
                class="font-semibold"
              >
                {{ option.value }}
                <template
                  v-if="option.limited"
                  #hintBox
                >
                  <span>
                    {{ $t('Limited service is displayed when the modem is not registered on the network and is camping on an emergency cell.') }}
                    <router-link to="/network/mobile/operators/scan">
                      {{ $t('Network selection configuration') }}
                    </router-link>
                  </span>
                </template>
              </tlt-hint>
            </tlt-card-row>
          </template>
          <template #ip_address="{ option }">
            <tlt-card-row :children="isSensitive && sensitiveFields.ip_address ? [] : option.children">
              <template #label>{{ option.label }}</template>
              <tlt-button
                v-if="isSensitive"
                :button-id="sensitiveFields.ip_address ? 'visible' : 'hidden'"
                class="mr-2"
                type="text"
                color="secondary"
                :disabled="!hasReadAccess"
                @click="setSensitiveField('ip_address')"
              >
                <tlt-icon
                  icon="password"
                  :hide="sensitiveFields.ip_address"
                  class="size-5"
                  :class="{ 'text-theme-text-subtle': !sensitiveFields.ip_address }"
                />
              </tlt-button>
              <tlt-overflow-hint
                v-if="isSensitive && sensitiveFields.ip_address"
                class="font-semibold"
              >
                {{ $t('Sensitive data') }}
              </tlt-overflow-hint>
              <tlt-overflow-hint
                v-else-if="!option.ip"
                class="font-semibold"
              >
                {{ option.value }}
              </tlt-overflow-hint>
              <ip-details
                v-if="(!isSensitive || (isSensitive && !sensitiveFields.ip_address)) && option.ip"
                class="font-semibold"
                :config="option.ip"
                :status="option.ip"
              />

              <template #child="{ record }">
                <tlt-card-row v-bind="record">
                  <ip-details
                    v-if="record.ip"
                    class="font-semibold"
                    :config="record.ip"
                    :status="record.ip"
                  />
                </tlt-card-row>
              </template>
            </tlt-card-row>
          </template>
          <template #imsi="{ option }">
            <tlt-card-row>
              <template #label>{{ option.label }}</template>
              <tlt-button
                v-if="isSensitive"
                :button-id="sensitiveFields.imsi ? 'visible' : 'hidden'"
                class="mr-2"
                type="text"
                color="secondary"
                :disabled="!hasReadAccess"
                @click="setSensitiveField('imsi')"
              >
                <tlt-icon
                  icon="password"
                  :hide="sensitiveFields.imsi"
                  class="size-5"
                  :class="{ 'text-theme-text-subtle': !sensitiveFields.imsi }"
                />
              </tlt-button>
              <tlt-overflow-hint
                v-if="isSensitive && sensitiveFields.imsi"
                class="font-semibold"
              >
                {{ $t('Sensitive data') }}
              </tlt-overflow-hint>
              <tlt-overflow-hint
                v-else
                class="font-semibold"
              >
                {{ option.value }}
              </tlt-overflow-hint>
            </tlt-card-row>
          </template>
          <template #iccid="{ option }">
            <tlt-card-row>
              <template #label>{{ option.label }}</template>
              <tlt-button
                v-if="isSensitive"
                :button-id="sensitiveFields.iccid ? 'visible' : 'hidden'"
                class="mr-2"
                type="text"
                color="secondary"
                :disabled="!hasReadAccess"
                @click="setSensitiveField('iccid')"
              >
                <tlt-icon
                  icon="password"
                  :hide="sensitiveFields.iccid"
                  class="size-5"
                  :class="{ 'text-theme-text-subtle': !sensitiveFields.iccid }"
                />
              </tlt-button>
              <tlt-overflow-hint
                v-if="isSensitive && sensitiveFields.iccid"
                class="font-semibold"
              >
                {{ $t('Sensitive data') }}
              </tlt-overflow-hint>
              <tlt-overflow-hint
                v-else
                class="font-semibold"
              >
                {{ option.value }}
              </tlt-overflow-hint>
            </tlt-card-row>
          </template>
          <template #uptime="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-overflow-hint class="font-semibold"> {{ option.value }}</tlt-overflow-hint>
              <template #child="{ record }">
                <tlt-card-row v-bind="record">
                  <tlt-overflow-hint class="font-semibold"> {{ record.uptime }}</tlt-overflow-hint>
                </tlt-card-row>
              </template>
            </tlt-card-row>
          </template>
          <template #rssi="{ option }">
            <tlt-card-row v-bind="option">
              <template
                v-if="option.scoped"
                #context
              >
                <span class="pl-1">{{ option.badge.value }}</span>
              </template>
            </tlt-card-row>
          </template>
          <template #apn="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-overflow-hint class="font-semibold"> {{ option.value }}</tlt-overflow-hint>
              <template #child="{ record }">
                <tlt-card-row v-bind="record">
                  <tlt-overflow-hint class="font-semibold"> {{ record.apn }}</tlt-overflow-hint>
                </tlt-card-row>
              </template>
            </tlt-card-row>
          </template>
          <template #mtu="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-overflow-hint class="font-semibold"> {{ option.value }}</tlt-overflow-hint>
              <template #child="{ record }">
                <tlt-card-row v-bind="record">
                  <tlt-overflow-hint class="font-semibold"> {{ record.mtu }}</tlt-overflow-hint>
                </tlt-card-row>
              </template>
            </tlt-card-row>
          </template>
          <template #mobile_country_code="{ option }">
            <tlt-card-row v-bind="option">
              <tlt-hint
                icon="info"
                :show-icon="option.scoped"
                class="font-semibold"
                :hints="option.country"
              >
                {{ option.value }}
              </tlt-hint>
            </tlt-card-row>
          </template>
        </tlt-card-new>
      </GridLayout>
    </div>
    <tlt-table
      id="bands_info"
      :columns="columns"
      :data-source="bands.content"
      :no-value-text="$t('There are no connected bands')"
      :title="bands.name"
      rawhtml
      :table-actions="['column-list', 'search']"
    >
      <template #help>
        {{ $t('Information about connected bands.') }}
        {{ $t('View realtime signal strength chart') }}
        <router-link to="/status/realtime/mobile"> {{ $t('here') }} </router-link>.
      </template>
      <template #name="{ record }">
        <tlt-hint
          show-icon
          icon="info"
          :hints="record.primary ? $t('Primary band') : undefined"
        >
          {{ record.name }}
        </tlt-hint>
      </template>
      <template
        v-for="column in columns.filter(col => col.scopeName)"
        :key="column.dataIndex"
        #[column.dataIndex]="{ record }"
      >
        <tlt-badge
          :custom-color="record[column.dataIndex].value.text.customColor"
          :custom-context-color="record[column.dataIndex].value.text.customContextColor"
          :test-id="record[column.dataIndex].value.text.value"
          class="py-1.5 min-w-fit"
        >
          {{ record[column.dataIndex].value.number }}
          <template
            v-if="record[column.dataIndex].value.text.value"
            #context
          >
            <span class="pl-1">{{ record[column.dataIndex].value.text.value }}</span>
          </template>
        </tlt-badge>
      </template>
    </tlt-table>
    <div class="list-layout--ignore w-full flex flex-wrap justify-end gap-4">
      <tlt-hint
        v-if="simCount > 1"
        :hints="modemOfflineHint"
      >
        <tlt-button
          id="switch-sim"
          button-id="switch-sim"
          color="tertiary"
          :readonly="$mobile.modemOffline(modemStatus)"
          @click="switchSimPrompt"
        >
          {{ $t('Switch to next SIM slot') }}
        </tlt-button>
      </tlt-hint>
      <tlt-hint :hints="modemOfflineHint">
        <tlt-button
          id="reboot"
          button-id="reboot"
          :readonly="$mobile.modemOffline(modemStatus)"
          @click="rebootModem"
        >
          {{ $t('Restart connection') }}
        </tlt-button>
      </tlt-hint>
    </div>
    <sim-card-unblock
      :id="modemId"
      :open="showModal"
      :type="modalType"
      @close="showModal = false"
    />
  </NavigationTabs>
</template>

<script>
import IpDetails from '@/components/shared/IpDetails.vue'
import { loadComponent } from '@/components/package_components/conditional.js'
import { isNumber } from '@ui-core/utils/inspect'

export default {
  components: {
    SimCardUnblock: loadComponent('vuci-app-mobile-ui', 'SimCardUnblock'),
    IpDetails
  },
  layout: 'none',
  data() {
    return {
      rebootErrors: {
        2: this.$t('Failed to restart connection, modem not found'),
        4: this.$t('Failed to restart connection, modem not ready'),
        default: this.$t('An unexpected error occurred')
      },
      statusStarted: false,
      modemId: '',
      modemList: [],
      simStatus: [],
      /** @type {import('@/types/networkTypes').InterfaceStatusMobile[]} */
      ifaceStatus: [],
      dataLimitStatus: [],
      showModal: false,
      modalType: 1,
      unlockText: '',
      pinMessage: '',
      countries: [],
      sensitiveFields: {
        imsi: true,
        iccid: true,
        ip_address: true
      }
    }
  },
  computed: {
    hasReadAccess() {
      return this.$session.hasAccess('status/network/mobile', 'read')
    },
    isSensitive() {
      return this.$session.hideSensitive()
    },
    tabs() {
      return this.modemList.map(s => ({ name: s.id, title: s.name }))
    },
    modemStatus() {
      return this.modemList.find(m => m.id === this.modemId) || {}
    },
    simCount() {
      return this.modemStatus.sim_count || 1
    },
    columns() {
      const columns = [
        { dataIndex: 'name', title: this.$t('Name'), help: this.$t('Currently used mobile frequency band.') },
        { dataIndex: 'frequency', title: this.$mobile.getFrequencyName(this.modemStatus), help: this.$t('Radio frequency channel number.') }
      ]
      if (this.$mobile.connectedTo3g(this.modemStatus)) {
        columns.push(
          {
            dataIndex: 'rscp',
            title: 'RSCP',
            help: this.$t(
              'Received Signal Code Power (RSCP) denotes the power measured by a receiver on a particular physical communication channel, measured in dBm. Values range from -124 to 0 (closer to 0 indicates better signal strength).'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'ecio',
            title: 'EC/IO',
            help: this.$t(
              'The EC/IO is a measure of the quality/cleanliness of the signal from the tower to the modem and indicates the signal-to noise ratio, measured in dB. Values range from -20 to 0 (closer to 0 indicates better signal quality/cleanliness).'
            ),
            scopeName: 'signal_strength'
          }
        )
      } else if (this.$mobile.connectedTo4g5g(this.modemStatus)) {
        columns.push(
          { dataIndex: 'bandwidth', title: this.$t('Bandwidth'), help: this.$t('Currently used bandwidth.') },
          { dataIndex: 'pcid', title: this.$t('Physical cell ID'), help: this.$t('Physical cell ID (PCID) indicates the physical layer identity of the cell.') },
          {
            dataIndex: 'rsrp',
            title: 'RSRP',
            help: this.$t(
              'Reference Signal Received Power (RSRP) is an RSSI type of measurement, measured in dBm. It is the power of the LTE Reference Signals spread over the full bandwidth and narrowband. Values closer to 0 indicate better signal strength.'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'rsrq',
            title: 'RSRQ',
            help: this.$t(
              'Reference Signal Received Quality (RSRQ) is a C/I type of measurement and it indicates the quality of the received reference signal, measured in dB. Values closer to 0 indicate a better rate of information transfer.'
            ),
            scopeName: 'signal_strength'
          },
          {
            dataIndex: 'sinr',
            title: 'SINR',
            help: this.$t(
              'Signal-to-Interference-plus-Noise Ratio (SINR) is a quantity used to give theoretical upper bounds on channel capacity (or the rate of information transfer) in wireless communication systems, measured in dB. Higher values indicate a better rate of information transfer.'
            ),
            scopeName: 'signal_strength'
          }
        )
      }
      return columns
    },
    connectionHints() {
      const hints = []
      const limitStatus = this.dataLimitStatus.find(
        limit => this.ifaceStatus.find(iface => iface.modem_id === this.modemId && iface.id === limit.id && iface.up) && limit.data_used >= limit.data_limit
      )
      if (limitStatus) {
        hints.push({ text: this.$t('Mobile data limit reached'), to: `/network/mobile/limits/data?edit=${limitStatus.id}`, toText: this.$t('Data limit configuration') })
      }
      if (this.modemStatus?.data_off) {
        hints.push({ text: this.$t('Mobile data is turned off by an external application') })
      }
      const status = this.simStatus.find(sim => {
        const checkEsim = !sim.esim_profile || this.modemStatus.esim_profile === sim.esim_profile
        return sim.modem === this.modemStatus.id && Number(sim.sim) === this.modemStatus.active_sim && checkEsim
      })
      if (status?.deny_roaming === '1' && this.modemStatus.operator_state?.toLowerCase() === 'roaming') {
        hints.push({
          text: this.$t('Mobile data is not allowed when roaming'),
          to: `/network/mobile/general/${this.modemStatus.id}?simTab=${status.section_name}`,
          toText: this.$t('Mobile configuration')
        })
      }
      if (this.$mobile.getGnssState(this.modemStatus)) {
        hints.push({ text: this.$t('Mobile data is not working because the GPS is on') })
      }
      if (this.modemStatus.mobile_stage === 23) {
        hints.push({
          text: this.$t('Mobile data is turned off because flight mode is on. To turn off flight mode, go to'),
          to: `/network/mobile/utilities?tab=${this.modemStatus.id}`,
          toText: this.$t('Mobile -> Utilities')
        })
      }
      return hints
    },
    bands() {
      return {
        name: this.$t('Bands'),
        content: this.parseBands(this.modemStatus)
      }
    },
    cards() {
      return {
        sim_card: { name: 'sim_card', title: this.$t('SIM card'), columns: this.parseSimCard(this.modemStatus) },
        connection: { name: 'connection', title: this.$t('Connection'), columns: this.parseConnection(this.modemStatus) },
        data_card: { name: 'data_card', title: this.$t('Data transmission'), columns: this.parseDataTransmission(this.modemStatus) },
        cell_info: { name: 'cell_info', title: this.$t('Cell info'), columns: this.parseCellInfo(this.modemStatus) }
      }
    },
    mobileIfaces() {
      return this.ifaceStatus.filter(iface => iface.modem_id === this.modemId && parseInt(iface.sim) === this.modemStatus.active_sim && iface.is_up)
    },

    mainIface() {
      return this.mobileIfaces.find(s => s.main === '1') || this.mobileIfaces[0]
    },
    mobileIfacesChildren() {
      return this.mobileIfaces.length > 1
        ? this.mobileIfaces.map(iface => ({
            name: this.$network.getName(iface),
            label: this.$network.getName(iface),
            uptime: iface.uptime ? '%t'.format(iface.uptime) : this.$t('N/A'),
            ip: iface,
            apn: this.apnParse(iface),
            mtu: isNumber(iface?.mtu) ? iface.mtu : this.$t('N/A')
          }))
        : []
    },
    activeDataLimits() {
      let dataLimit = []
      this.mobileIfaces.forEach(iface => {
        const limit = this.dataLimitStatus.find(limit => limit.id === iface.id && limit.enabled === '1')
        if (limit) {
          let dataUsed = limit.data_used ? '%MB / %MB'.format(limit.data_used, limit.data_limit) : '-'
          const color = limit.data_used !== 'N/A' ? (limit.data_used < limit.data_limit ? 'success' : 'error') : ''
          if (limit.data_used === 'N/A') {
            dataUsed = '%s / %MB'.format(limit.data_used, limit.data_limit)
          }
          dataLimit.push({ name: this.$network.getName(iface), value: dataUsed, class: color })
        }
      })
      return dataLimit
    },
    modemOfflineHint() {
      return this.$mobile.modemOffline(this.modemStatus) ? this.$t('Disabled because modem is blocked or disabled.') : ''
    }
  },
  mounted() {
    this.$spin()
    return this.getStatus()
      .then(() => {
        this.modemId = this.modemList[0]?.id
        if (this.$route.hash) {
          const [, tab] = this.$route.hash.match(/tab=(.+)/) || []
          if (tab) {
            this.modemId = tab
          }
        }
        this.$timer.start({ method: this.getStatus, time: 2000, autostart: true, immediate: true })
        this.$timer.start({ method: this.getDataLimit, time: 3000, autostart: true, immediate: true })
        this.getCountries()
      })
      .finally(() => {
        this.$spin(false)
      })
  },
  methods: {
    setSensitiveField(field) {
      this.sensitiveFields[field] = !this.sensitiveFields[field]
    },
    pinPukRequired() {
      const simText = this.$mobile.getSimLabel(this.modemStatus.active_sim, this.modemStatus.esim_profile, this.modemStatus.id)
      const pinPukMessage = this.$mobile.getPinPukMessage(this.modemStatus, simText)
      this.unlockText = pinPukMessage.unlockText || ''
      this.pinMessage = pinPukMessage.message || ''
    },
    showUnblockModal() {
      this.showModal = true
      this.modalType = this.$mobile.shouldAllowSimUnlock(this.modemStatus) ? 1 : 2
    },
    getBandwidth(modemStatus, caSignal) {
      if (caSignal.bandwidth !== 'N/A') return this.verbalMeaning(caSignal.bandwidth, 'bandwidth')
      const cellInfo = modemStatus.cell_info.find(obj => {
        const { arfcn, uarfcn, earfcn } = obj
        const frequency = [arfcn, uarfcn, earfcn].find(data => !isNaN(data)) || 'N/A'
        return frequency === caSignal.frequency
      })
      return this.verbalMeaning(cellInfo?.bandwidth, 'bandwidth')
    },
    getCellInfo(obj) {
      return this.modemStatus.cell_info.find(element => element.arfcn === obj.frequency || element['nr-arfcn'] === obj.frequency)
    },
    multipleRow(title, variable) {
      const row = { name: variable, label: title, value: this.$t('N/A') }
      switch (variable) {
        case 'band': {
          row.hint = this.$t('Currently used mobile frequency band.')
          break
        }
        case 'earfcn': {
          row.hint = this.$t('E-UTRA Absolute Radio Frequency Channel Number (EARFCN).')
          break
        }
        case 'pcid': {
          row.hint = this.$t('Physical cell ID (PCID) indicates the physical layer identity of the cell.')
          break
        }
        case 'bandwidth': {
          row.hint = this.$t('Currently used bandwidth.')
          break
        }
      }
      if (this.modemStatus.ca_signal && this.modemStatus.ca_signal.length) {
        if (variable === 'earfcn') variable = 'frequency'
        row.value = this.modemStatus.ca_signal
          .map(element => {
            if (!isNumber(element[variable]) && variable === 'pcid') {
              return this.getCellInfo(element)?.pcid ?? this.$t('N/A')
            } else if (variable === 'bandwidth') return this.getBandwidth(this.modemStatus, element)
            return this.verbalMeaning(element[variable], variable)
          })
          .join(' / ')
      } else {
        const cellInfo = this.modemStatus.cell_info?.[0]
        if (variable === 'earfcn') {
          if (cellInfo?.arfcn !== 'N/A') {
            row.hint = this.$t('Absolute radio-frequency channel number (ARFCN).')
            variable = 'arfcn'
          } else if (cellInfo?.uarfcn !== 'N/A') {
            row.hint = this.$t('UTRA Absolute Radio Frequency Channel Number (UARFCN).')
            variable = 'uarfcn'
          } else if (cellInfo?.['nr-arfcn'] !== undefined && cellInfo?.['nr-arfcn'] !== 'N/A') {
            row.hint = this.$t('New radio absolute radio-frequency channel number (NR ARFCN).')
            variable = 'nr-arfcn'
          }
          row.value = typeof cellInfo?.[variable] === 'number' ? cellInfo?.[variable] : this.$t('N/A')
        } else if (variable === 'pcid') {
          row.value = cellInfo?.pcid || this.$t('N/A')
        } else if (variable === 'bandwidth') {
          row.value = this.verbalMeaning(cellInfo?.[variable], variable)
        } else {
          row.value = this.verbalMeaning(this.modemStatus[variable], variable)
        }
      }
      return row
    },
    getStatus() {
      if (this.statusStarted) return
      this.statusStarted = true
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/sim_cards/status'])
        .then(([modemData, simData]) => {
          if (modemData.success) this.modemList = this.$mobile.parseModems(modemData.data)
          else this.$message.error(this.$t('Failed to load modem data'))
          if (simData.success) this.simStatus = simData.data
          else this.$message.error(this.$t('Failed to load SIM card status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.statusStarted = false
          this.pinPukRequired()
        })
    },
    getDataLimit() {
      return this.$axios
        .bulkGet([
          {
            endpoint: '/api/data_limit/status',
            condition: ['quota_limit', 'mobifd']
          },
          {
            endpoint: '/api/interfaces/basic/status'
          }
        ])
        .then(([dataLimitStatus, ifaceStatus]) => {
          if (dataLimitStatus.success) this.dataLimitStatus = dataLimitStatus.data
          else this.$message.error(this.$t('Failed to load data limit status'))
          if (ifaceStatus.success) this.ifaceStatus = ifaceStatus.data.filter(iface => iface.network_type === 'mobile')
          else this.$message.error(this.$t('Failed to load data interfaces status'))
        })
    },
    getCountries() {
      return this.$axios
        .get('/api/modems/countries/status')
        .then(({ data }) => {
          this.countries = data
        })
        .catch(() => {
          this.$message.error('Failed to load countries list')
        })
    },
    parseSimCard(modem) {
      const simCardRows = [
        {
          name: 'sim_card_state',
          label: this.$mobile.getSimstateLabel(modem),
          value: this.$mobile.getSimstate(modem, true),
          hint: this.$t('The current SIM card state.')
        },
        {
          name: 'provider',
          label: this.$t('Provider'),
          value: modem.provider || this.$t('N/A'),
          hint: this.$t('SIM card provider.')
        },
        {
          name: 'imsi',
          label: 'IMSI',
          value: modem.imsi || this.$t('N/A'),
          hint: this.$t('The IMSI (international mobile subscriber identity) is a unique 15 decimal digit (or less) number used to identify the user of a cellular network.')
        },
        {
          name: 'iccid',
          label: 'ICCID',
          value: modem.iccid || this.$t('N/A'),
          hint: this.$t("SIM card's ICCID is a unique serial number used to identify the SIM chip.")
        }
      ]
      if (this.simCount > 1) {
        simCardRows.unshift({
          name: 'sim_card_slot_in_use',
          label: this.$t('SIM card slot in use'),
          value: modem.active_sim ? 'SIM %s'.format(this.$mobile.getSimLabel(modem.active_sim, modem.esim_profile, modem.id)) : this.$t('N/A'),
          hint: this.$t('Shows which SIM card slot is currently in use.'),
          scoped: modem.active_sim ? modem.sim_switch_enabled : false
        })
      }
      return simCardRows
    },
    apnParse(iface) {
      if (!iface) return this.$t('N/A')
      let apn = iface?.apn
      if (iface?.auto_apn === '1') apn = `${this.$t('Auto')}${apn ? ` (${apn})` : ''}`
      return apn || '-'
    },
    parseDataTransmission(modem) {
      const dataTransmissionRows = [
        this.multipleRow(this.$t('Connected band'), 'band'),
        {
          name: 'rssi',
          label: 'RSSI (dBm)',
          badge: typeof modem.rssi === 'number' ? { text: modem.rssi, ...this.$mobile.rssiValue(modem.rssi, this.$mobile.connectedTo4g5g(modem)) } : undefined,
          value: typeof modem.rssi === 'number' ? undefined : this.$t('N/A'),
          hint: this.$t('Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.'),
          scoped: typeof modem.rssi === 'number'
        },
        {
          name: 'apn',
          label: 'APN',
          value: this.apnParse(this.mainIface),
          children: this.mobileIfacesChildren,
          hint: this.$t('APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.')
        },
        {
          name: 'mtu',
          label: 'MTU',
          value: isNumber(this.mainIface?.mtu) ? this.mainIface.mtu : this.$t('N/A'),
          children: this.mobileIfacesChildren,
          hint: this.$t('MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.')
        }
      ]
      if (this.$mobile.connectedTo4g5g(modem)) {
        dataTransmissionRows.unshift(
          {
            name: 'carrier_aggregation',
            label: this.$t('Carrier aggregation'),
            value: this.$mobile.getCA(modem),
            hint: this.$t(
              'Carrier Aggregation (CA) is one of the key techniques used to enable the very high data rates of 4G/5G to be achieved.\nBy combining more than one carrier together, either in the same or different bands it is possible to increase the bandwidth available and in this way increase the capacity of the link.'
            )
          },
          this.multipleRow(this.$t('Bandwidth'), 'bandwidth')
        )
      }
      if (this.$store.hasPackages('mdcollectd.control')) {
        dataTransmissionRows.push(
          {
            name: 'data_received',
            label: this.$t('Data received'),
            value: isNumber(modem.rxbytes) ? '%mB'.format(modem.rxbytes) : this.$t('N/A'),
            hint: this.$t('Amount of data received through the mobile interface.')
          },
          {
            name: 'data_sent',
            label: this.$t('Data sent'),
            value: isNumber(modem.txbytes) ? '%mB'.format(modem.txbytes) : this.$t('N/A'),
            hint: this.$t('Amount of data sent through the mobile interface.')
          }
        )
      }
      return dataTransmissionRows
    },
    parseBands(modem) {
      if (modem.ca_signal && modem.ca_signal.length) {
        const bands = []
        modem.ca_signal.forEach(obj => {
          const cellInfo = this.getCellInfo(obj) ?? {}
          const combined = {
            ...obj,
            ...cellInfo
          }
          const pcid = combined.pcid ?? obj.pcid
          bands.push({
            name: this.$mobile.getBandName(combined, modem),
            bandwidth: this.getBandwidth(modem, obj),
            pcid: pcid ?? this.$t('N/A'),
            frequency: typeof combined.frequency === 'number' ? combined.frequency : this.$t('N/A'),
            rsrp: this.signalStrength(combined.rsrp, 'rsrp'),
            rsrq: this.signalStrength(combined.rsrq, 'rsrq'),
            sinr: this.signalStrength(combined.sinr, 'sinr'),
            primary: modem.sc_band_av === 'Active' && !!obj.primary
          })
        })
        return bands
      } else if (modem.band && modem.band !== 'N/A') {
        const cellInfo = modem.cell_info?.[0] || {}
        const { arfcn, uarfcn, earfcn, 'nr-arfcn': nrarfcn } = cellInfo
        const frequency = [arfcn, uarfcn, earfcn, nrarfcn].find(data => !isNaN(data))
        const band = {
          name: this.$mobile.getBandName(modem, modem),
          bandwidth: this.verbalMeaning(cellInfo?.bandwidth, 'bandwidth'),
          frequency: frequency !== undefined ? frequency : this.$t('N/A')
        }
        if (this.$mobile.connectedTo4g5g(modem)) {
          band.pcid = cellInfo?.pcid ?? this.$t('N/A')
          band.rsrp = this.signalStrength(modem.rsrp, 'rsrp')
          band.rsrq = this.signalStrength(modem.rsrq, 'rsrq')
          band.sinr = this.signalStrength(modem.sinr, 'sinr')
        } else if (this.$mobile.connectedTo3g(modem)) {
          band.rscp = this.signalStrength(modem.rscp, 'rscp')
          band.ecio = this.signalStrength(modem.ecio, 'ecio')
        }
        return [band]
      } else {
        return []
      }
    },
    parseConnection(modem) {
      const limited = this.$mobile.limitedService(modem)
      const connectionRows = [
        {
          name: 'operator',
          label: this.$t('Operator'),
          value: modem.operator || this.$t('N/A'),
          hint: this.$t("Network operator's name.")
        },
        {
          name: 'operator_state',
          label: this.$t('Operator state'),
          value: this.$mobile.getOperatorState(modem.operator_state),
          hint: this.$t('Shows whether the network has currently indicated the registration of the mobile device.'),
          limited
        }
      ]
      const showBadge = modem.data_conn_state
        ? { badge: { size: 'md', text: this.$mobile.getDataConnState(modem.data_conn_state), type: modem.data_conn_state === 'Connected' ? 'success' : 'error' } }
        : { value: this.$t('N/A') }

      connectionRows.push(
        { name: 'data_connection_state', label: this.$t('Data connection state'), hint: this.$t('Indicates whether the device has a mobile data connection or not.'), ...showBadge },
        {
          name: 'mobile_connection_stage',
          label: this.$t('Connection stage'),
          value: this.$mobile.getMobileStage(modem),
          hint: this.$t('Indicates current mobile connection stage.')
        },
        {
          name: 'network_type',
          label: this.$t('Network type'),
          value: this.$mobile.getConntype(modem.conntype),
          hint: this.$t('Mobile network type.')
        },
        {
          name: 'ip_address',
          label: this.$t('IP address'),
          ip: this.mainIface,
          value: this.$t('N/A'),
          children: this.mobileIfacesChildren,
          hint: this.$t('IP address of mobile interface')
        },
        {
          name: 'uptime',
          label: this.$t('Uptime'),
          value: this.mainIface?.uptime ? '%t'.format(this.mainIface.uptime) : this.$t('N/A'),
          children: this.mobileIfacesChildren,
          hint: this.$t('Uptime of mobile interface')
        }
      )
      return connectionRows
    },
    parseCellInfo(modem) {
      const cellInfoRows = [
        {
          name: 'cell_id',
          label: this.$t('Cell ID'),
          value: modem.cellid || this.$t('N/A'),
          hint: this.$t('The ID of the cell that the modem is currently connected to.')
        }
      ]
      if (modem.lac && modem.lac !== 'N/A') {
        cellInfoRows.push({
          name: 'lac',
          label: 'LAC',
          value: modem.lac,
          hint: this.$t(
            'The Location Area Code (LAC) is the unique number given to each location area within the network. The served area of a cellular radio access network is usually divided into location areas, consisting of one or several radio cells.'
          )
        })
      } else {
        cellInfoRows.push({
          name: 'tac',
          label: 'TAC',
          value: modem.tac || this.$t('N/A'),
          hint: this.$t(
            'The Tracking Area Code (TAC) is a unique number given to each location area within the network. The served area of a cellular radio access network is usually divided into location areas, consisting of one or several radio cells.'
          )
        })
      }
      if (this.$mobile.connectedTo4g5g(modem)) cellInfoRows.push(this.multipleRow(this.$t('Physical cell ID'), 'pcid'))
      let country = this.$t('Other')
      const mcc = modem.cell_info?.[0]?.mcc
      if (mcc) country = this.countries.find(c => c.mcc === mcc)?.country || this.$t('Other')
      cellInfoRows.push(
        this.multipleRow(this.$mobile.getFrequencyName(modem), 'earfcn'),
        {
          name: 'mobile_country_code',
          label: this.$t('Mobile country code'),
          value: mcc || this.$t('N/A'),
          hint: this.$t(
            'Mobile Country Code (MCC) - a mobile code consisting of three digits used to identify GSM networks. MCC is also used along with the International Mobile Subscriber Identity (IMSI) to identify the region from which mobile subscriber belongs.'
          ),
          country,
          scoped: !!mcc
        },
        {
          name: 'mobile_network_code',
          label: this.$t('Mobile network code'),
          value: modem.cell_info?.[0]?.mnc || this.$t('N/A'),
          hint: this.$t('Mobile Network Code (MNC) - a unique two or three digit number used to identify a home Public Land Mobile Network (PLMN). MNC is allocated by the national regulator.')
        }
      )
      return cellInfoRows
    },
    parseRebootError(errorCode) {
      return this.rebootErrors[errorCode] || this.rebootErrors.default
    },
    rebootModem() {
      this.$spin(this.$t('Restarting connection'))
      this.$timer.stop(this.getStatus)
      return this.$axios
        .post(`/api/modems/${this.modemId}/actions/restart_connection`, null, { cancellable: true })
        .then(() => {
          this.$message.success(this.$t('Connection restarted successfully'))
        })
        .catch(e => {
          this.$message.error(this.parseRebootError(e?.response?.data?.errors?.[0]?.code))
        })
        .finally(() => {
          this.$spin(false)
          this.$timer.start(this.getStatus)
        })
    },
    switchSimPrompt() {
      let additionalText = this.$t('After rebooting the device, the default SIM will be used for the connection.')
      if (this.$store.board?.hwinfo?.esim) additionalText = '%s %s'.format(this.$t('On devices with eSIM, it will switch only to the enabled eSIM profile.'), additionalText)
      return this.$prompt.show({
        title: this.$t('Switch to next SIM slot?'),
        content: this.$t('After proceeding, you will lose current mobile connection. A temporary connection will be established with the next SIM slot. %s').format(additionalText),
        okText: this.$t('Proceed'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.switchSim()
        }
      })
    },
    switchSim() {
      this.$spin(this.$t('Switching to next SIM slot'))
      this.$timer.stop(this.getStatus)
      return this.$axios
        .post(`/api/modems/${this.modemId}/actions/switch_sim`)
        .then(() => {
          this.$message.success(this.$t('SIM slot switched successfully'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to switch SIM slot, modem not found'))
        })
        .finally(() => {
          this.$spin(false)
          this.$timer.start(this.getStatus)
        })
    },
    signalStrength(value, variable) {
      return {
        scopeName: 'signal_strength',
        value: typeof value === 'number' ? { number: value, text: this.verbalMeaning(value, variable) } : { number: this.$t('N/A'), text: { customColor: this.$mobile.badgeColors.no_signal } }
      }
    },
    verbalMeaning(value, variable) {
      if (variable === 'rsrp') return this.$mobile.rsrpValue(value)
      if (variable === 'rsrq') return this.$mobile.rsrqValue(value)
      if (variable === 'sinr') return this.$mobile.sinrValue(value)
      if (variable === 'ecio') return this.$mobile.ecioValue(value)
      if (variable === 'rscp') return this.$mobile.rscpValue(value)
      if (variable === 'bandwidth') return value && value !== 'N/A' ? `${value} MHz` : this.$t('N/A')
      if (variable === 'band') return this.$mobile.getBandName(value, this.modemStatus)
      else return value ?? this.$t('N/A')
    },
    tabChange(tab) {
      this.modemId = tab
      this.pinPukRequired()
    }
  }
}
</script>
