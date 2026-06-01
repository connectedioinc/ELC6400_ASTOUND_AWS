<template>
  <vuci-form
    v-slot="{ uciData }"
    config="dnp3_outstation"
  >
    <tlt-card
      :title="$t('Status')"
      :help="$t('This section displays DNP3 Outstation status information.')"
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
                </div>
              </template>
            </cell-row>
          </card-cell>
        </tlt-horizontal-card>
      </div>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('DNP3 outstation'))"
      name="dnp3_outstation"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dnp3/outstation/config' }]"
      data-key="outstation"
      required
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Check to enable this DNP3 outstation.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Local Address')"
        :help="$t('Outstation Link-Layer Address.')"
        name="local_addr"
        rules="irange(0,65519)"
        placeholder="1"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Remote Address')"
        :help="$t('Client Link-Layer address.')"
        name="remote_addr"
        rules="irange(0,65519)"
        placeholder="10"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Unsolicited enabled')"
        :help="$t('Enable the transmission of unsolicited messages.')"
        name="unsolicited_enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="protocol"
        :label="$t('Protocol')"
        :options="[
          ['tcp', 'TCP'],
          ['udp', 'UDP']
        ]"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        name="port"
        placeholder="20000"
        rules="port"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('UDP response address')"
        name="udp_response_ip"
        placeholder="1.1.1.1"
        rules="ipaddr"
        :depend="s.protocol === 'udp'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('UDP response port')"
        name="udp_response_port"
        placeholder="10"
        rules="port"
        :depend="s.protocol === 'udp'"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Allow Remote Access')"
        :help="$t('Allow access through WAN.')"
        name="allow_ra"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      outstationStatusData: {}
    }
  },
  computed: {
    statusData() {
      const statusData = this.outstationStatusData || {}
      const isStatusGood = statusData?.server?.open
      const errorHint = this.getStatusError(statusData?.server?.open_error)

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: errorHint
          }
        ],
        [{ label: this.$t('Uptime'), value: this.displayTime(isStatusGood, statusData?.uptime) }],
        [{ label: this.$t('Connected clients'), value: this.displayNumber(statusData?.server?.client_count) }]
      ]

      return { columns }
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    getStatusError(errorCode) {
      const errorMessages = {
        0: this.$t('Failed to start server'),
        1: this.$t('The TCP port is already in use')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    updateStatus() {
      return this.$axios
        .get('/api/dnp3/outstation/status')
        .then(({ data }) => {
          this.outstationStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayTime(isStatusGood, time) {
      return isStatusGood && (time || time === 0) ? '%t'.format(time) : '-'
    }
  }
}
</script>
