<template>
  <tlt-form-model-item
    :label="$t('Status')"
    element-id="mobile_status"
    inline-input
  >
    <span class="flex gap-2">
      <template v-if="statuses.includes('sim')">
        <tlt-icon
          :id="`simstatus_${modemStatus.id}`"
          :test-id="`simstatus_${modemStatus.id}`"
          icon="sim"
          :class="[statusHints.simcard.class]"
          class="size-5"
        />
        <tlt-popover
          :target="`#simstatus_${modemStatus.id}`"
          placement="bottom-start"
          :close-delay="0"
        >
          <b>{{ statusHints.simcard.title }}:</b> {{ statusHints.simcard.info }}
        </tlt-popover>
      </template>
      <template v-if="statuses.includes('operator')">
        <tlt-icon
          :id="`operatorstatus_${modemStatus.id}`"
          :test-id="`operatorstatus_${modemStatus.id}`"
          icon="mobile"
          :class="[statusHints.operator?.[0]?.class]"
          class="size-5"
        />
        <tlt-popover
          :target="`#operatorstatus_${modemStatus.id}`"
          placement="bottom-start"
          :close-delay="0"
        >
          <ul
            v-for="(hint, idx) in statusHints.operator"
            :key="idx"
          >
            <li>
              <b>{{ hint.title }}:</b> {{ hint.info }}
            </li>
          </ul>
        </tlt-popover>
      </template>
      <template v-if="statuses.includes('connection')">
        <tlt-icon
          :id="`connectionstatus_${modemStatus.id}`"
          :test-id="`connectionstatus_${modemStatus.id}`"
          icon="network"
          :class="[statusHints.connection.class]"
          class="size-5"
        />
        <tlt-popover
          :target="`#connectionstatus_${modemStatus.id}`"
          placement="bottom-start"
          :close-delay="0"
        >
          <b>{{ statusHints.connection.title }}:</b> {{ statusHints.connection.info }}
        </tlt-popover>
      </template>
    </span>
  </tlt-form-model-item>
</template>
<script>
export default {
  props: {
    modemStatus: {
      type: Object,
      required: true
    },
    simSection: {
      type: Object,
      required: true
    },
    statuses: {
      type: Array,
      default: () => ['sim', 'operator', 'connection']
    }
  },
  computed: {
    statusHints() {
      const toLowerCase = string => {
        return string === this.$t('N/A') ? this.$t('N/A') : string[0].toLowerCase() + string.slice(1)
      }
      const esimCheck = !this.simSection?.esim_profile || this.modemStatus.esim_profile === this.simSection?.esim_profile
      const activeSim = this.modemStatus.active_sim === parseInt(this.simSection?.position) && esimCheck
      const denyRoaming = this.simSection?.deny_roaming === '1'
      let simState = this.$t('N/A')
      let simStateClass = 'text-theme-text-subtle'
      if (activeSim) {
        simState = toLowerCase(this.$mobile.getSimstate(this.modemStatus, true))
        simStateClass = this.modemStatus.pinstate?.includes('Inserted') ? 'success' : 'error'
      } else if (!this.modemStatus.offline) simState = this.$t('not active SIM')

      let operator = this.$t('N/A')
      let operatorState = this.$t('N/A')
      let networkType = this.$t('N/A')
      let operatorClass = 'error'
      if (activeSim) {
        operator = this.modemStatus.operator || this.$t('N/A')
        operatorState = this.$mobile.getOperatorState(this.modemStatus.operator_state)
        operatorState = operatorState.startsWith('SMS') ? operatorState : toLowerCase(operatorState)
        networkType = this.modemStatus.conntype
        if (['No service', 'Auto', 'Unknown', 'N/A'].some(s => this.modemStatus.conntype?.includes(s))) networkType = toLowerCase(this.$mobile.getConntype(this.modemStatus.conntype))
        operatorClass = ['Registered', 'Roaming'].some(s => this.modemStatus.operator_state?.includes(s)) ? 'success' : 'text-theme-text-warning'
      }

      let connectionState = this.$t('N/A')
      let connectionStateClass = 'error'
      if (activeSim && this.modemStatus.data_conn_state) {
        if (this.modemStatus.data_conn_state === 'Connected') {
          connectionStateClass = 'success'
          connectionState = this.$t('connected')
        } else if (this.modemStatus.data_conn_state === 'Disconnected') connectionState = this.$t('disconnected')
        else connectionState = toLowerCase(this.modemStatus.data_conn_state)
        const connectionOff = []
        if (this.modemStatus.data_off) {
          connectionOff.push(this.$t('Mobile data is turned off by an external application'))
        }
        if (denyRoaming && this.modemStatus.operator_state?.toLowerCase() === 'roaming') {
          connectionOff.push(this.$t('Mobile data is not allowed when roaming'))
        }
        if (this.$mobile.getGnssState(this.modemStatus)) {
          connectionOff.push(this.$t('Mobile data is not working because the GPS is on'))
        }
        if (connectionOff.length > 0) connectionState = '%s (%s)'.format(connectionState, connectionOff.join(', '))
      }

      return {
        simcard: { title: this.$mobile.getSimstateLabel(this.modemStatus), info: simState, class: simStateClass },
        operator: [
          { title: this.$t('Operator'), info: operator, class: operatorClass },
          { title: this.$t('Operator state'), info: operatorState },
          { title: this.$t('Network type'), info: networkType }
        ],
        connection: { title: this.$t('Data connection state'), info: connectionState, class: connectionStateClass }
      }
    }
  }
}
</script>
