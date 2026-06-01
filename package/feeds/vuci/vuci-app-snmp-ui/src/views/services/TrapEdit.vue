<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="snmptrap"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('trap rule'))"
      :help="$t('This section is used to configure the settings of the SNMP trap rule. Scroll your mouse pointer over field names in order to see helpful hints.')"
      :uci-data="uciData"
      data-key="rules"
      :endpoints="[{ endpoint: 'snmp/trap/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable SNMP trap rule.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Trap type')"
        name="type"
        :options="trapTypes"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modem')"
        :help="$t('Trap will be set for selected modem.')"
        name="modem"
        :options="modems"
        :depend="modems.length > 1 && s.type === 'gsm'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="name"
        :label="$t('Trigger')"
        :help="$t('The trigger which invokes the rule.')"
        :depend="s.type !== 'eventtrap'"
        :options="nameProps"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Signal strength')"
        :help="$t('GSM signal strength value. If the routers signal strength falls below this threshold it will trigger the SNMP trap.')"
        name="signal"
        rules="irange(-130,0)"
        :required="s.enabled === '1'"
        placeholder="-59"
        :depend="s.name === 'signalstrtrap'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('State change')"
        :help="$t('Selects which pin state will trigger the SNMP trap.')"
        name="state"
        :options="stateChanges"
        :depend="s.type === 'iotrap'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="event"
        :label="$t('Event')"
        :help="$t('The string for which to look for in the event\'s message.')"
        :depend="s.type === 'eventtrap'"
        :options="eventType"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="event_mark"
        :label="$t('Event subtype')"
        :help="$t('The string for which to look for in the event\'s message.')"
        :depend="s.type === 'eventtrap'"
        :options="eventSubtypes"
      />
      <vuci-form-item-input
        v-bind="fromProps"
        :uci-section="s"
        name="from"
        :depend="s.name === 'adc0' || s.name === 'acl0' || s.name == 'pwr0'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        v-bind="toProps"
        :uci-section="s"
        name="to"
        placeholder="12.5"
        :depend="s.name === 'adc0' || s.name === 'acl0' || s.name == 'pwr0'"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      gsmNames: [
        ['signalstrtrap', this.$t('Signal strength')],
        ['conntypetrap', this.$t('Network type')]
      ],
      chilliNames: [
        ['connectedtrap', this.$t('Connected')],
        ['disconnectedtrap', this.$t('Disconnected')]
      ],
      chilliInstalled: this.$store.hasPackages('coova-chilli'),
      formData: {}
    }
  },
  computed: {
    modems() {
      return this.$mobile.modemsOptions(this.formOptions().modems)
    },
    ioPins() {
      return this.formOptions().ioPins
    },
    eventType() {
      return this.$eventsOptions.getTranslatedTypes(this.formOptions().events)
    },
    translatedSubtypes() {
      return this.$eventsOptions.getTranslatedSubtypes(this.formOptions().events)
    },
    eventSubtypes() {
      return this.translatedSubtypes[this.section.event] || []
    },
    trapTypes() {
      const options = [['eventtrap', this.$t('Events log')]]
      if (this.formOptions().modems.length > 0) {
        options.push(['gsm', this.$t('GSM')])
      }
      if (this.$store.board.hwinfo.ios) {
        options.push(['iotrap', this.$t('Input/Output')])
      }
      if (this.chilliInstalled) {
        options.push(['chilli', this.$t('Hotspot client')])
      }
      return options
    },
    nameProps() {
      if (this.section.type === 'iotrap') return this.ioPins
      if (this.section.type === 'gsm') return this.gsmNames
      if (this.section.type === 'chilli') return this.chilliNames
      return []
    },
    fromProps() {
      if (this.section.name?.match('adc') || this.section.name?.match('pwr')) {
        return {
          label: this.$t('Min voltage'),
          help: this.$t('Specifies minimum voltage of the range.'),
          placeholder: '0.0',
          rules: ['ufloat', val => this.lessThan(val, this.section.to)]
        }
      }
      return {
        label: this.$t('Min current'),
        help: this.$t('Specifies minimum current of the range. Values between 4-20mA.'),
        placeholder: '4.5',
        rules: ['ufloat', 'range(4,20)', val => this.lessThan(val, this.section.to)]
      }
    },
    toProps() {
      if (this.section.name?.match('adc') || this.section.name?.match('pwr')) {
        return {
          label: this.$t('Max voltage'),
          help: this.$t('Specifies maximum voltage of the range.'),
          rules: ['ufloat', val => this.moreThan(val, this.section.from)]
        }
      }
      return {
        label: this.$t('Max current'),
        help: this.$t('Specifies maximum current of the range. Values between 4-20mA.'),
        rules: ['ufloat', 'range(4,20)', val => this.moreThan(val, this.section.from)]
      }
    },
    stateChanges() {
      if (this.section.type !== 'iotrap') return []
      const options = [['both', this.$t('Both')]]
      if (['din1', 'din2', 'dout1', 'dout2', 'iio', 'dio0', 'dio1', 'dio2'].includes(this.section.name)) {
        options.push(['active', this.$t('High level')], ['inactive', this.$t('Low level')])
      }
      if (['relay0', 'relay1'].includes(this.section.name)) {
        options.push(['open', this.$t('Open')], ['closed', this.$t('Closed')])
      }
      if (['dwi0', 'dwi1'].includes(this.section.name)) {
        options.push(['rising', this.$t('Rising')], ['falling', this.$t('Falling')])
      }
      if (['adc0', 'acl0', 'pwr0'].includes(this.section.name)) {
        options.push(['in_range', this.$t('In range')], ['out_of_range', this.$t('Out of range')])
      }
      return options
    }
  },
  methods: {
    lessThan(value, bound) {
      if (parseFloat(value) >= parseFloat(bound)) {
        return { isValid: false, message: this.$t('Min value should be less than Max value.') }
      }
      return { isValid: true }
    },
    moreThan(value, bound) {
      if (parseFloat(value) <= parseFloat(bound)) {
        return { isValid: false, message: this.$t('Max value should be more than Min value.') }
      }
      return { isValid: true }
    }
  }
}
</script>
