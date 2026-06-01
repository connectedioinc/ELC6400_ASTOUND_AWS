<template>
  <tlt-modal
    :open="showModal"
    size="big"
    :nav-bar="[$t('Configuration')]"
    @close="back"
  >
    <tlt-form
      ref="form"
      sid="port_settings"
      :title="$t('&quot;%&quot; port settings').format(readablePorts.join(', '))"
    >
      <tlt-inline-message
        v-show="configsDiffer"
        id="config-mismatch"
        :message="$t('Selected ports have different configurations. %s settings are used as a template. Saving this configuration will be applied for all selected ports.').format(readablePorts[0])"
        type="warning"
      />
      <tlt-form-item-switch
        v-model="form.enabled"
        :label="$t('Enable')"
        :help="$t('Toggle port on or off.')"
        prop="enabled"
        true-value="1"
        false-value="0"
      />
      <tlt-inline-message
        v-show="isAnyPoe && isAnyNoPoe"
        id="poe-mismatch"
        :message="$t('PoE setting will only be configured on PoE capable ports.')"
        type="info"
      />
      <tlt-form-item-switch
        v-model="form.poe_enable"
        :label="$t('PoE')"
        :help="$t('Enable Power over Ethernet.')"
        :depend="isAnyPoe"
        prop="poe_enable"
        true-value="1"
        false-value="0"
      />
      <tlt-form-item-input
        v-if="dsa"
        v-model="form.mtu"
        :label="$t('MTU')"
        :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
        prop="mtu"
        placeholder="1500"
        :rules="`irange(68,${maxMtu})`"
      />
      <tlt-inline-message
        v-show="isAnyForcedAutoneg && isAnyNoForcedAutoneg"
        id="autoneg-enforced"
        :message="$t('Autonegotiation is enforced on %s port(s) and some options cannot be modified.').format(selectedPorts.filter(isAutonegEnforced).map(convertToReadablePort).join(', '))"
        type="warning"
      />
      <tlt-form-item-switch
        v-model="form.autoneg"
        :label="$t('Auto negotiation')"
        :help="$t('Auto negotiation allows the device to communicate with devices on the other end of the link to determine the optimal duplex mode and speed for the port.')"
        true-value="on"
        false-value="off"
        prop="autoneg"
        :depend="!isAnyForcedAutoneg"
      />
      <tlt-form-item-select
        v-if="formDepends.advert"
        v-model="form.advert"
        :label="$t('Advertisement')"
        :help="$t('Advertises preferred duplex mode and speed for negotiation with other devices.')"
        :options="advertOptions"
        :rules="checkAdvert"
        prop="advert"
        multiple
        required
      />
      <template v-if="formDepends.speed && !isAnyForcedAutoneg">
        <tlt-form-item-select
          v-model="form.speed"
          :label="$t('Link Speed')"
          :help="$t('A measure of how fast ports are able to transmit and receive data.')"
          :options="linkSpeedOptions"
          prop="speed"
        />
        <tlt-form-item-select
          v-model="form.duplex"
          :label="$t('Duplex')"
          :help="
            $t(
              'Bidirectional communication system that allows both end nodes to send and receive communication data or signals. Full - sends and receives simultaneously. Half - sends or receives one path at a time.'
            )
          "
          :options="duplexOptions"
          prop="duplex"
        />
      </template>
    </tlt-form>
    <div class="flex justify-end list-layout--ignore">
      <tlt-button
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script>
/**
 * @typedef PortSetting
 * @property {string} [enabled]
 * @property {string} [poe_enable]
 * @property {string} [mtu]
 * @property {string} [autoneg]
 * @property {string[]} [advert]
 * @property {string} [speed]
 * @property {string} [duplex]
 */
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { checkNetwork } from '@ui-core/plugins/helper'

export default {
  props: {
    modelValue: {
      type: Array,
      required: true
    },
    selectedPorts: {
      type: Array,
      required: true
    },
    boardPorts: {
      type: Array,
      required: true
    },
    portStatus: {
      type: Array,
      required: true
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      linkSpeedOptions: [
        ['10', '10 Mbps (E)'],
        ['100', '100 Mbps (FE)']
      ],
      duplexOptions: [
        ['full', this.$t('Full')],
        ['half', this.$t('Half')]
      ],
      /** @type {PortSetting} */
      form: {},
      showModal: false,
      configsDiffer: false
    }
  },
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board.hwinfo.dsa,
      maxMtu: state => state.board?.network_options?.max_mtu ?? '1500'
    }),
    advertOptions() {
      const adverts = [['10mh'], ['10mf'], ['100mh'], ['100mf'], ['1000mf', !!this.$store.board.hwinfo.gigabit_port], ['2500mf', !!this.$store.board.hwinfo['2_5_gigabit_port']]]
      return adverts.map(([advert, speedSupported = true]) => {
        const isSupported = this.dsa ? this.selectedPorts.some(port => this.getSupportedSpeeds(port).includes(advert)) : speedSupported
        return [advert, (advert.endsWith('f') ? this.$t('%s-Full') : this.$t('%s-Half')).format(advert), isSupported]
      })
    },
    readablePorts() {
      return this.selectedPorts.map(this.convertToReadablePort)
    },
    configSettings() {
      return ['enabled', 'autoneg', 'advert', 'duplex', 'speed', 'poe_enable', ...(this.dsa ? ['mtu'] : [])]
    },
    formDepends() {
      return {
        advert: (this.form.autoneg === 'on' || this.isAnyForcedAutoneg) && !this.autonegMismatch,
        speed: this.form.autoneg === 'off',
        duplex: this.form.autoneg === 'off'
      }
    },
    filteredForm() {
      const clone = JSON.parse(JSON.stringify(this.form))
      Object.entries(this.formDepends).forEach(([key, value]) => {
        if (value === false) clone[key] = ''
      })
      return clone
    },
    isAnyPoe() {
      return this.selectedPorts.some(port => this.$store.isPoe(port))
    },
    isAnyNoPoe() {
      return this.selectedPorts.some(port => !this.$store.isPoe(port))
    },
    isAnyForcedAutoneg() {
      return this.selectedPorts.some(this.isAutonegEnforced)
    },
    isAnyNoForcedAutoneg() {
      return this.selectedPorts.some(port => !this.isAutonegEnforced(port))
    },
    autonegMismatch() {
      const selectedModelValue = this.modelValue.filter(port => this.selectedPorts.includes(port.id))
      const enforcedAutonegPorts = selectedModelValue.filter(port => this.isAutonegEnforced(port.id))
      const otherPorts = selectedModelValue.filter(port => !this.isAutonegEnforced(port.id))
      return enforcedAutonegPorts.some(eport => otherPorts.some(port => port.autoneg !== eport.autoneg))
    }
  },
  watch: {
    showModal(val) {
      if (val === false) return
      const { differs, initialForm } = this.$ports.getPortsConfig(this.selectedPorts, this.modelValue, this.configSettings)
      this.configsDiffer = differs
      this.form = initialForm
    }
  },
  methods: {
    isAutonegEnforced(port) {
      return !!this.portStatus.find(p => p.id === port)?.force_autoneg
    },
    convertToReadablePort(port) {
      return this.boardPorts.find(bport => bport?.name === port)?.custom ?? port
    },
    getSupportedSpeeds(port) {
      const portData = this.portStatus.find(status => status.id === port) ?? {}
      return portData.link_supported ?? []
    },
    checkAdvert(value) {
      const invalidPorts = this.selectedPorts.filter(port => {
        const speeds = this.getSupportedSpeeds(port)
        if (!speeds.length) return false
        const validSelectedSpeeds = value.filter(v => speeds.includes(v))
        return !validSelectedSpeeds.length
      })
      return {
        isValid: !invalidPorts.length,
        message: this.$t('Selected port(s) "%s" are not compatible with the selected advertisement(s). Please adjust your selection.').format(invalidPorts.map(this.convertToReadablePort).join(', '))
      }
    },
    async save() {
      const validationRes = await this.$refs.form.validate()
      if (!validationRes.valid) return this.$message.error(validationRes.message)
      this.$spin('Waiting for configuration to be applied...')
      const data = this.selectedPorts.map(port => {
        const supportedSpeeds = this.getSupportedSpeeds(port)
        const isPoe = this.$store.isPoe(port)
        const isAutonegEnforced = this.portStatus.find(p => p.id === port)?.force_autoneg ?? false
        return {
          ...this.filteredForm,
          id: port,
          poe_enable: isPoe ? this.form.poe_enable : undefined,
          autoneg: isAutonegEnforced ? undefined : this.form.autoneg,
          advert:
            isAutonegEnforced && this.autonegMismatch
              ? undefined
              : this.dsa && this.filteredForm.advert
                ? this.filteredForm.advert.filter(adv => supportedSpeeds.includes(adv))
                : this.filteredForm.advert,
          speed: this.autonegMismatch ? undefined : this.filteredForm.speed,
          duplex: this.autonegMismatch ? undefined : this.filteredForm.duplex
        }
      })
      return this.$axios
        .put('/api/ports_settings/config', { data })
        .then(async res => {
          const newValues = this.modelValue.map(original => {
            const edited = res.data.find(editSection => editSection.id === original.id)
            return edited ?? original
          })
          // increase timeout to handle STP case
          await checkNetwork({ timeout: 80 * 10000 })
          this.$message.success(this.$t('Configuration has been applied'))
          this.$emit('update:modelValue', newValues)
        })
        .catch(() => this.$message.error(this.$t('Failed to edit configuration')))
        .finally(() => {
          this.showModal = false
          this.$store.openModal(false)
          this.$spin(false)
        })
    },
    back() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('Unsaved changes will be discarded'),
        okText: this.$t('Discard'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.showModal = false
        }
      })
    }
  }
}
</script>
