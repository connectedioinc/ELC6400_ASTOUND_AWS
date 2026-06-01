<template>
  <vuci-form
    v-slot="{ uciData }"
    config="modbus_server"
    :after-load="afterLoad"
  >
    <tlt-card
      :title="$t('Status')"
      :help="$t('This section displays Modbus TCP Server status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <div class="flex justify-center gap-1">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :card-props="statusData"
        >
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            class="lg:max-w-fit"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
              :label="row.label"
            >
              <template #value>
                <div class="flex items-center gap-1">
                  <span :class="row.class">{{ row.value }}</span>
                  <tlt-hint
                    v-if="row.errorHint"
                    :hints="[{ info: row.errorHint }]"
                  >
                    <tlt-icon
                      icon="error"
                      class="text-theme-text-danger size-5"
                    />
                  </tlt-hint>
                  <tlt-hint
                    v-if="row.crb_error"
                    :hints="[{ info: row.crb_error }]"
                  >
                    <tlt-icon
                      icon="warning"
                      class="text-theme-text-warning size-5"
                    />
                  </tlt-hint>
                </div>
              </template>
            </cell-row>
          </card-cell>
        </tlt-horizontal-card>
      </div>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="tcpServer"
      :endpoints="[{ endpoint: 'modbus/server/tcp/config' }]"
      name="modbus"
      :title="$t('Modbus TCP server')"
      :error-handlers="{ edit: handleErrors }"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Modbus TCP server.')"
        name="enabled"
        @change="showOverlapWarning(s)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="$t('Port number.')"
        name="port"
        placeholder="502"
        initial="502"
        rules="port"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Device ID')"
        :help="$t('Modbus server ID that this device will respond to (1-255, set 0 to respond to any ID).')"
        name="device_id"
        placeholder="1"
        initial="1"
        rules="irange(0,255)"
        required
      />
      <vuci-form-item-select
        v-if="!$store.isSwitch"
        :uci-section="s"
        :label="$t('Mobile data type')"
        :help="$t('Selects mobile data unit representation type.')"
        name="md_data_type"
        :options="dataTypeOptions"
      />
      <vuci-form-item-switch
        v-if="!$store.isSwitch"
        :uci-section="s"
        :label="$t('Allow remote access')"
        :help="$t('Allow access through WAN.')"
        name="allow_ra"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable broadcasts')"
        :help="$t('Process incoming Modbus broadcast messages.')"
        name="broadcasts"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Keep persistent connection')"
        :help="$t('Do not close the connection after each completed Modbus request.')"
        name="keepconn"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Connection timeout')"
        :help="$t('Timeout in seconds: this parameter specifies the duration after which the connection will be forcefully closed. A value of 0 is considered the same as no timeout.')"
        name="timeout"
        placeholder="0"
        initial="0"
        rules="irange(0,60)"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable custom register block')"
        :help="$t('Allow custom register block.')"
        name="clientregs"
        @change="onRegisterBlockEnable(s)"
      />
      <vuci-form-item-custom
        ref="customRegFile"
        :uci-section="s"
        name="regfile"
        inputs="select,input"
        :label="$t('Register file path')"
        :input-props="[prefixProps, getPathProps(s)]"
        :help="
          $t(`Path to file in which the custom register block will be stored. Files inside /tmp or /var are stored in RAM.
        They vanish after reboot, but do not degrade flash memory. Files elsewhere are stored in flash memory.
        They remain after reboot, but degrade flash memory (severely, if operations are frequent).`)
        "
        :write-parse="writeParseRegFile"
        :load-parse="loadParseRegFile"
        :depend="s.clientregs === '1'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('First register number')"
        :help="$t('First register in custom register block (%s-65536).'.format(getRegFileFirstRegister(s)))"
        name="regfilestart"
        :placeholder="getRegFileFirstRegister(s)"
        :initial="getRegFileFirstRegister(s)"
        :rules="validateRegFileFirstRegister"
        :depend="s.clientregs === '1'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Register count')"
        :help="$t('Register count in custom register block (1-64512).')"
        name="regfilesize"
        placeholder="128"
        initial="128"
        rules="irange(1,64512)"
        :depend="s.clientregs === '1'"
        required
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import commonFunctions from './ModbusCommonFunctionMixin.vue'

export default {
  mixins: [commonFunctions],
  data() {
    return {
      formOptions: {
        serialServers: []
      },
      dataTypeOptions: [
        ['0', this.$t('Bytes')],
        ['1', this.$t('Kilobytes')],
        ['2', this.$t('Megabytes')]
      ],
      prefixProps: {
        prop: 'prefix',
        options: ['/mnt/', '/tmp/', '/var/', '/usr/share/modbus/']
      },
      modbusStatusData: {},
      overlapWarning: this.$t('Enabled custom register block may cause register overlapping in data sources.')
    }
  },
  computed: {
    statusData() {
      const statusData = this.modbusStatusData || {}
      const isStatusGood = statusData?.uptime !== undefined
      const error = this.getStatusError(statusData?.error_code)

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: error,
            crb_error: statusData?.crb_error ? this.$t('Failed to create custom register block: permission denied') : ''
          }
        ],
        [{ label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) }],
        [{ label: this.$t('Connected clients'), value: this.displayNumber(statusData?.connected_tcp_client_count) }],
        [{ label: this.$t('Time since last request'), value: this.displayTime(statusData?.time_since_last_request) }],
        [{ label: this.$t('Successful requests'), value: this.displayNumber(statusData?.successful_request_count) }],
        [{ label: this.$t('Failed requests'), value: this.displayNumber(statusData?.failed_request_count) }]
      ]
      return { columns }
    },
    hasSerial() {
      return this.$store.board.hwinfo.rs232 || this.$store.board.hwinfo.rs485 || this.$store.board.hwinfo.usb || this.$store.board.hwinfo.console
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    afterLoad(uciData) {
      if (!this.hasSerial) {
        return this.showOverlapWarning(uciData?.tcpServer?.[0])
      }
      return this.$axios
        .get('/api/modbus/server/serial/config')
        .then(({ data }) => {
          this.formOptions.serialServers = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load Modbus serial server data'))
        })
        .finally(() => this.showOverlapWarning(uciData?.tcpServer?.[0]))
    },
    updateStatus() {
      return this.$axios
        .get('/api/modbus/server/tcp/status')
        .then(({ data }) => {
          this.modbusStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start server'),
        2: this.$t('The TCP port is already in use'),
        3: this.$t('The TCP address is not available'),
        4: this.$t('Could not open serial port')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayTime(time) {
      return time || time === 0 ? '%t'.format(time) : '-'
    },
    onRegisterBlockEnable(s) {
      if (s.clientregs === '1' && !s.regfile) {
        this.$refs.customRegFile.modelValues[0][1] = '' // sync shown value after option reset
      }
      this.showOverlapWarning(s)
    },
    showOverlapWarning(s) {
      if (this.$store.isSwitch) return
      if (s.clientregs === '1' && s.enabled === '1') this.$notification.warning(this.overlapWarning)
      else this.$notification.remove(this.overlapWarning)
    },
    getPathProps(section) {
      return {
        prop: 'path',
        placeholder: 'regfile',
        required: true,
        maxlength: null,
        rules: v => this.regFileValidate(v, section, this.formOptions.serialServers)
      }
    }
  }
}
</script>
