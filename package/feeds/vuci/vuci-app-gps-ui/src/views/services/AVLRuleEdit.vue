<template>
  <vuci-form
    v-slot="{ uciData }"
    config="avl_rules"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :data-key="section.id === 'avl_rule_main' ? 'avlMainRule' : 'avlSecondaryRules'"
      :endpoints="[
        {
          endpoint: section.id === 'avl_rule_main' ? 'gps/avl/main_rules/config' : 'gps/avl/secondary_rules/config'
        }
      ]"
      :name="section.id"
      :title="$utils.getModalTitle($t('AVL rule data'))"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns the configuration on or off.')"
        :depend="!mainRule"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="wan_status"
        :label="$t('WAN')"
        :help="$t('Select wan interface for GPS rule.')"
        :options="wanStatuses"
        :depend="!mainRule"
      />

      <!-- Start of I/O related options -->
      <vuci-form-item-switch
        :uci-section="s"
        name="ignore"
        :label="$t('Ignore')"
        :help="$t('Enable to ignore the state of input.')"
        :depend="!mainRule && inputIoList().length > 0"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="io_type"
        :label="$t('IO type')"
        :help="$t('Select input/output type.')"
        :options="ioTypes"
        :depend="isIOConditionEnabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="io_name"
        :label="$t('IO name')"
        :help="$t('Select input/output name.')"
        :options="shownIoList"
        :depend="isIOConditionEnabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Min voltage')"
        :help="$t('Specify minimum voltage range.')"
        name="io_min"
        placeholder="0"
        :rules="['range(0,40)', () => validateMinMax(s.io_min, s.io_max)]"
        required
        :depend="isIOConditionEnabled && s.io_type === 'adc'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Max voltage')"
        :help="$t('Specify maximum voltage range.')"
        name="io_max"
        placeholder="10"
        :rules="['range(0,40)', () => validateMinMax(s.io_min, s.io_max)]"
        required
        :depend="isIOConditionEnabled && s.io_type === 'adc'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="io_acl"
        :label="$t('ACL Property')"
        :help="$t('Select which property - ampere or percentage the condition listens to.')"
        :options="aclOptions"
        initial="current"
        :depend="isIOConditionEnabled && s.io_type === 'acl'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="io_min"
        :label="$t('Min current')"
        :help="$t('Specifies minimum current of the range (values between 4-20mA).')"
        placeholder="4.0"
        :depend="isIOConditionEnabled && s.io_type === 'acl' && s.io_acl === 'current'"
        required
        :rules="['range(4,20)', () => validateMinMax(s.io_min, s.io_max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="io_max"
        :label="$t('Max current')"
        :help="$t('Specifies maximum current of the range (values between minimum-20mA).')"
        placeholder="12.5"
        :depend="isIOConditionEnabled && s.io_type === 'acl' && s.io_acl === 'current'"
        required
        :rules="['range(4,20)', () => validateMinMax(s.io_min, s.io_max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="io_min"
        :label="$t('Min percent')"
        :help="$t('Specifies minimum percent of the range.')"
        placeholder="0"
        :depend="isIOConditionEnabled && s.io_type === 'acl' && s.io_acl === 'percent'"
        required
        :rules="['range(0,100)', () => validateMinMax(s.io_min, s.io_max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="io_max"
        :label="$t('Max percent')"
        :help="$t('Specifies maximum percent of the range.')"
        placeholder="0"
        :rules="['range(0,100)', () => validateMinMax(s.io_min, s.io_max)]"
        :depend="isIOConditionEnabled && s.io_type === 'acl' && s.io_acl === 'percent'"
        required
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="din_status"
        :label="$t('IO level')"
        :help="$t('Select input state for GPS rule.')"
        :options="dinStatuses"
        :depend="isIOConditionEnabled && s.io_type === 'gpio'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="din_status"
        :label="$t('IO trigger')"
        :help="$t('Inside range - Input voltage falls in the specified region, Outside range - Input voltage drops out of the specified region.')"
        :options="triggerOptions"
        :depend="isIOConditionEnabled && (s.io_type === 'acl' || s.io_type === 'adc')"
      />
      <!-- End of I/O related options -->

      <vuci-form-item-select
        :uci-section="s"
        name="priority"
        :label="$t('Rule priority')"
        :help="
          $t(
            'The rule\'s priority. Different priority settings add different flags to event packets, so they can be displayed differently in the receiving system. The router sends data of higher priority first.'
          )
        "
        :options="priorities"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="collect_period"
        :label="$t('Collect period')"
        :help="$t('Period (in seconds) for data collection.')"
        rules="irange(1,999999)"
        required
        placeholder="5"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="distance"
        :label="$t('Min distance')"
        :help="$t('Minimal distance (in meters) change required before saving record.')"
        rules="irange(1,999999)"
        required
        initial="200"
        placeholder="200"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="angle"
        :label="$t('Min angle')"
        :help="$t('Minimal angle (in degrees) change required before saving record.')"
        rules="irange(1,360)"
        required
        initial="30"
        placeholder="30"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="accuracy"
        :label="$t('Min accuracy')"
        :help="$t('Minimum accuracy (in meters) required before saving record. The lower the accuracy value, the better.')"
        rules="irange(1,999999)"
        required
        initial="10"
        placeholder="10"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="saved_records"
        :label="$t('Min saved records')"
        :help="$t('Minimal saved records count to send.')"
        rules="irange(1,32)"
        required
        placeholder="20"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="send_period"
        :label="$t('Send period')"
        :help="$t('Send period (in seconds) for data sending.')"
        rules="irange(1,999999)"
        required
        placeholder="50"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['ioList'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      priorities: [
        ['low', this.$t('Low priority level')],
        ['high', this.$t('High priority level')],
        ['panic', this.$t('Panic priority level')],
        ['security', this.$t('Security priority level')]
      ],
      dinStatuses: [
        ['low', this.$t('Low Level')],
        ['high', this.$t('High Level')],
        ['both', this.$t('Both')]
      ],
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ],
      triggerOptions: [
        ['in', this.$t('Inside range')],
        ['out', this.$t('Outside range')]
      ],
      hasWifi: this.$store.board?.hwinfo?.wifi
    }
  },
  computed: {
    mainRule() {
      return this.section.id === 'avl_rule_main'
    },
    shownIoList() {
      return this.filteredInputIoList(this.section.io_type).map(io => [io.id, io.name_with_pins])
    },
    ioTypes() {
      const availableTypes = []
      if (this.filteredInputIoList('gpio').length > 0) {
        availableTypes.push(['gpio', this.$t('GPIO')])
      }
      if (this.filteredInputIoList('adc').length > 0) {
        availableTypes.push(['adc', this.$t('ADC')])
      }
      if (this.filteredInputIoList('acl').length > 0) {
        availableTypes.push(['acl', this.$t('ACL')])
      }
      return availableTypes
    },
    wanStatuses() {
      const options = [
        ['mobile_both', this.$t('Mobile both')],
        ['mobile_home', this.$t('Mobile home')],
        ['mobile_roaming', this.$t('Mobile roaming')],
        ['wired', this.$t('Wired')]
      ]
      if (this.hasWifi) options.push(['wifi', this.$t('WiFi')])
      return options
    },
    isIOConditionEnabled() {
      return this.section.ignore === '0' && !this.mainRule && this.inputIoList().length > 0
    }
  },
  methods: {
    validateMinMax(min, max) {
      return {
        isValid: parseFloat(min) < parseFloat(max),
        message: this.$t('Max value should be higher than min value')
      }
    },
    inputIoList() {
      return this.ioList().filter(io => (io.type === 'gpio' && io.direction === 'in') || io.type === 'acl' || io.type === 'adc')
    },
    filteredInputIoList(targetType) {
      return this.inputIoList().filter(io => io.type === targetType)
    },
    updateValidations(self) {
      self.vuciSection.validate()
    }
  }
}
</script>
