<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="rms_mqtt"
    :after-load="loadData"
    bulk-request
  >
    <template #default="{ uciData }">
      <vuci-named-section
        :uci-data="uciData"
        :title="$t('RMS settings')"
        :help="$t('This section is used to configure the main settings required to connect the device to RMS (Remote Management System).')"
        :endpoints="[{ endpoint: 'rms/config', sectionFilter: section => section[0] }]"
        :after-save="afterSave"
        data-key="rms_mqtt"
      >
        <template #title-content>
          <div class="ml-auto flex gap-3">
            <tlt-button
              :button-id="isConnected ? 'reconnect' : 'connect'"
              color="secondary"
              :readonly="isActionProceeding"
              @click="forceRefresh"
            >
              {{ isConnected ? $t('Reconnect') : $t('Connect') }}
            </tlt-button>
            <tlt-button
              v-if="isConnected"
              id="btnDc"
              color="secondary"
              button-id="disconnect"
              :readonly="isActionProceeding"
              @click="disconnect"
            >
              {{ $t('Reset') }}
            </tlt-button>
            <tlt-popover
              v-if="isConnected"
              target="#btnDc"
              triggers="hover"
              placement="top-end"
              :content="$t('Reset RMS connection')"
            />
          </div>
        </template>
        <template #default="{ s }">
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('Connection type')"
            :help="rmsHelp"
            rawhtml
            initial="2"
            name="enable"
            :options="selectedType"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="remote"
            :label="$t('Hostname')"
            :placeholder="$brand('rmsURL')"
            :initial="$brand('rmsURL')"
            rules="host"
            :required="s.enable === '1' || s.enable === '2'"
            :depend="!wizard"
            :help="$t('RMS server hostname. Unless you are hosting your own RMS server, you should leave the default value.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="port"
            :label="$t('Port')"
            placeholder="15009"
            rules="port"
            :required="s.enable === '1' || s.enable === '2'"
            :depend="!wizard"
            :help="$t('RMS server port. Unless you are hosting your own RMS server, you should leave the default value.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="auth_code"
            :label="$t('Authentication code')"
            :help="$t('Authentication code provided by RMS after adding the device.')"
          />
        </template>
      </vuci-named-section>
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :title="$t('Proxy settings')"
        :endpoints="[{ endpoint: 'rms/proxy/config', sectionFilter: section => section[0] }]"
        :after-save="onAfterSave"
        :visible="!wizard"
        data-key="rms_proxy"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable proxy')"
          :help="$t('Enable RMS connection through proxy.')"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="ip"
          :label="$t('Proxy address')"
          :help="$t('Specify proxy address.')"
          :depend="s.enabled === '1'"
          rules="host"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          name="socks5_port"
          :label="$t('Proxy SOCKS5 port')"
          :help="$t('SOCKS5 proxy server port.')"
          placeholder="1080"
          initial="1080"
          rules="port"
          :depend="s.enabled === '1'"
          required
        />
        <vuci-form-item-switch
          name="use_credentials"
          :uci-section="s"
          :label="$t('Use credentials')"
          :help="$t('Use credentials for SOCKS5 proxy connection.')"
          :depend="s.enabled === '1'"
          no-write
        />
        <vuci-form-item-input
          :uci-section="s"
          name="socks5_username"
          :label="$t('SOCKS5 username')"
          :help="$t('Specify username for SOCKS5 proxy connection.')"
          :depend="s.use_credentials === '1'"
          rules="string"
          required
        />
        <vuci-form-item-input
          ref="socks5_password"
          :uci-section="s"
          name="socks5_password"
          :label="$t('SOCKS5 password')"
          :help="$t('Specify password for SOCKS5 proxy connection.')"
          :depend="s.use_credentials === '1'"
          password
          sensitive
          rules="string"
          required
        />
      </vuci-named-section>
      <tlt-card
        :title="$t('Status')"
        :help="$t('This section displays connection status information between the device and RMS.')"
      >
        <tlt-value-list
          id="current_fw_table"
          :data-source="statusData"
          class="status"
        >
          <template #connection_state_value="{ item }">
            <div>
              <span :class="item.value.connectionState.color">
                {{ item.value.connectionState.text }}
              </span>
              <!-- eslint-disable -->
              <span
                v-if="item.value.fullError"
                v-html="$xss(item.value.fullError)"
              />
            </div>
            <!-- eslint-enable -->
          </template>
          <template #serial_number_value="{ item }">
            <copy-button
              :copy-value="item.value"
              button-id="serialNumberValue"
            />
          </template>
          <template #lan_mac_value="{ item }">
            <copy-button
              :copy-value="item.value"
              button-id="lanMacValue"
            />
          </template>
          <template #mac_value="{ item }">
            <copy-button
              :copy-value="item.value"
              button-id="macValue"
            />
          </template>
          <template #imei_value="{ item }">
            <copy-button
              :copy-value="item.value"
              button-id="imeiValue"
            />
          </template>
        </tlt-value-list>
      </tlt-card>
    </template>
    <template #form-buttons="{ save }">
      <div
        class="ml-auto w-max"
        :class="{ 'flex justify-between w-full!': wizard }"
      >
        <slot name="footerButtons" />
        <tlt-button
          button-id="saveandapply"
          @click="() => save().then(res => wizard && $timer.stop('getStatus'))"
        >
          {{ saveButtonText }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { rms } from '@/utils/rms'
import CopyButton from './RMSCopyButton.vue'

export default {
  components: { CopyButton },
  props: {
    afterSave: {
      type: Function,
      default: () => {}
    },
    loadExtra: {
      type: Function,
      default: () => new Promise(resolve => resolve())
    },
    wizard: {
      type: Boolean,
      default: false
    },
    saveButtonText: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      formData: null,
      showRegisterAlert: false,
      selectedType: [
        {
          name: this.$t('Enabled'),
          value: '1'
        },
        {
          name: this.$t('Standby'),
          value: '2'
        },
        {
          name: this.$t('Disabled'),
          value: '0'
        }
      ],
      rmsData: {},
      rmsStatusData: {},
      rmsHelp: `%s${this.$t('Enabled')}%s - ${this.$t(
        'RMS functionality is always on. When disconnected from RMS, the device will try connecting every 2-5 minutes (every 2 minutes the first hour; then every 5 minutes). If the device is disconnected from RMS for 14 days, it will go into Standby mode. When trying to connect to rms without internet connection, the router will try to reestablish connection every 10 seconds.'
      )}%s
        %s${this.$t('Standby')}%s - ${this.$t(
          "The device tries to establish a connection with the server infrequently (6 hours in-between attempts). This is done in order to reduce mobile traffic. In order to start using RMS, user intervention is not necessary from the device's side. Worst case scenario - RMS connection will be established 6 hours after the device was added to RMS."
        )}%s
        %s${this.$t('Disabled')}%s - ${this.$t(
          "RMS functionality is completely disabled; therefore, no connection attempts are made. In order to start using RMS, the user must enable the service on the device's side."
        )}`.format('<b>', '</b>', '<br>', '<b>', '</b>', '<br>', '<b>', '</b>'),
      isAlertShown: false,
      isPasswordSet: false,
      passSetPlaceholder: this.$t('Password is set'),
      proceedingAction: '',
      proceedingActionCount: 0,
      proceedingInfo: {
        connect: { state: '0', fakeState: 2, retryCount: 5 },
        disconnect: { state: '1', fakeState: 3, retryCount: 1 }
      },
      rmsErrorCodes: Object.keys(rms.errorCodes)
    }
  },

  timers: {
    getStatus: { time: 2000, autostart: true, repeat: true }
  },
  computed: {
    ...mapState(useMainStore, ['device']),
    isTRB1or5() {
      return this.$store.device.startsWith('TRB1') || this.$store.device.startsWith('TRB5')
    },
    isTRB2() {
      return this.$store.device.startsWith('TRB2')
    },
    statusData() {
      return [
        {
          title: this.$t('Management status'),
          value: rms.parseStatus(this.rmsData),
          hint: this.$t('Displays whether connection to RMS is enabled or disabled.')
        },
        {
          title: this.$t('Connection state'),
          value: { connectionState: rms.parseConnectionState(this.rmsData), fullError: rms.getFullError(this.rmsData) },
          hint: this.$t('The current state of the connection.'),
          slotName: 'connection_state'
        },
        {
          title: this.$t('Serial number'),
          value: this.rmsData.serial_nbr,
          hint: this.$t('A unique 10-digit device identifier. It is required that you submit this when adding the device to RMS.'),
          slotName: 'serial_number'
        },
        { ...this.networkData, value: this.rmsData.lan_mac, slotName: 'mac' },
        {
          title: this.$t('Next connection after'),
          value: this.parseTimeLeft,
          hint: this.$t('How much time is left before the device initiates the next connection attempt.')
        }
      ]
    },
    networkData() {
      return this.isTRB1or5 || this.isTRB2
        ? {
            title: this.$t('IMEI'),
            hint: this.$t("Device's IMEI. It is required that you submit this when adding the device to RMS.")
          }
        : {
            title: this.$t('%sMAC').format(this.$store.isSwitch ? '' : 'LAN '),
            hint: this.$t("Device's %s MAC address. It is required that you submit this when adding the device to RMS.").format(this.$store.isSwitch ? '' : 'LAN')
          }
    },
    parseTimeLeft() {
      if (this.rmsData.next_try < 0 || this.rmsData.next_try === undefined) return '00:00:00'
      return new Date(this.rmsData.next_try * 1000).toISOString().substring(11, 19)
    },
    isConnected() {
      return !((this.rmsData.status !== '0' && this.rmsData.error === '1') || this.rmsData.status === '0')
    },
    isActionProceeding() {
      return [2, 3].includes(this.rmsData.connection_state)
    }
  },
  watch: {
    isConnected(value) {
      if (value || this.isAlertShown) return
      this.isAlertShown = true
      this.$notification.info(
        this.$t('The device must be registered on the RMS platform before connecting. %s Register here %s').format('<a href="https://rms.teltonika-networks.com" target="_blank">', '</a>'),
        true
      )
    },
    rmsStatusData(statusData) {
      return this.handleRmsStatusData(statusData)
    }
  },
  methods: {
    loadData() {
      return this.loadExtra()
        .then(() => {
          this.isPasswordSet = this.formData.rms_proxy[0].socks5_password || this.formData.rms_proxy[0]['socks5_password:set'] === '1'
          this.formData.rms_proxy[0].use_credentials = this.isPasswordSet ? '1' : '0'
        })
        .then(this.getStatus)
    },
    getStatus() {
      return this.$axios
        .get('/api/rms/status')
        .then(({ data }) => {
          this.rmsStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get RMS status'))
        })
    },
    updateRadio(option) {
      this.selectedType.forEach(data => (data.name === option ? '1' : '0'))
    },
    forceRefresh() {
      this.setProceedingAction('connect')
      if (this.rmsData.status === '0') return this.$message.error(this.$t('Can not connect while RMS is disabled. Enable RMS and save changes.'))
      return this.$axios
        .post('/api/rms/actions/connect')
        .then(() => {
          this.isConnected ? this.$message.success(this.$t('Reconnection attempt was successful')) : this.$message.success(this.$t('New connection initiation attempt was successful'))
        })
        .catch(() => {
          this.isConnected ? this.$message.error(this.$t('Reconnection attempt failed')) : this.$message.error(this.$t('Attempt to initiate new connection failed'))
        })
    },
    disconnect() {
      // Will be needed if buttons will be seperated
      // if (this.rmsData.status === '0' && this.rmsData.error === '1') return this.$message.error(this.$t('Successful connection is not established can not disconnect'))
      this.$prompt.show({
        title: this.$t('Reset RMS connection?'),
        content: this.$t("Device's RMS connection will be reset."),
        okText: this.$t('Reset'),
        cancelText: this.$t('Cancel'),
        onOk: this.onOk
      })
    },
    onOk() {
      return this.$axios
        .post('/api/rms/actions/unregister')
        .then(() => {
          this.setProceedingAction('disconnect')
          this.$message.success(this.$t('Connection has been successfully reset'))
          this.formData.rms_mqtt[0].auth_code = ''
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to reset the connection'))
        })
    },
    onAfterSave(_, { data }) {
      this.isPasswordSet = data.socks5_password || data['socks5_password:set'] === '1'
      data.use_credentials = this.isPasswordSet ? '1' : '0'
    },
    setProceedingAction(action) {
      this.proceedingAction = action
      this.proceedingActionCount = 0
    },
    handleRmsStatusData(statusData) {
      if (!this.proceedingAction) {
        this.rmsData = statusData
        return
      }
      const proceedingData = this.proceedingInfo[this.proceedingAction]

      // Stop simulating connection state after certain retries or error codes
      if (this.proceedingActionCount > proceedingData.retryCount || this.rmsErrorCodes.includes(statusData.error_code)) {
        this.setProceedingAction('')
        return
      }
      // Simulate connection state while proceeding action is ongoing
      this.rmsData = { ...statusData, connection_state: proceedingData.fakeState, error: 0, error_code: 0, error_text: '' }

      if (statusData.connection_state === proceedingData.state) {
        this.proceedingActionCount += 1
      }
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

td {
  padding: 8px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 500px) {
  td {
    justify-content: center;
  }
}

@media not all and (min-width: theme(--breakpoint-lg)) {
  td {
    justify-content: flex-start;
  }
}
</style>
