<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="avlData"
    editing
    config="avl"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :endpoints="[{ endpoint: 'gps/avl/io_rules/config' }]"
      :uci-data="uciData"
      data-key="inputs"
      :title="$utils.getModalTitle($t('AVL input rule data'))"
      :exception-options="['io_type']"
      :error-handlers="{ edit: returnErrorMessage }"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('To enable input configuration.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Input type')"
        :help="$t('Select type on your own intended configuration.')"
        name="io_name"
        :options="displayIoNames"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="acl"
        :label="$t('ACL Property')"
        :help="$t('Select which property - ampere or percentage the condition listens to.')"
        :options="aclOptions"
        initial="current"
        :depend="aclList.length > 0 && aclList.includes(s.io_name)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Min voltage')"
        :help="$t('Specify minimum voltage range.')"
        name="min"
        placeholder="0"
        :rules="['range(0,40)', () => validateMinMax(s.min, s.max)]"
        required
        :depend="adcList.length > 0 && adcList.includes(s.io_name)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Max voltage')"
        :help="$t('Specify maximum voltage range.')"
        name="max"
        placeholder="10"
        :rules="['range(0,40)', () => validateMinMax(s.min, s.max)]"
        required
        :depend="adcList.length > 0 && adcList.includes(s.io_name)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min"
        :label="$t('Min current')"
        :help="$t('Specifies minimum current of the range (values between 4-20mA).')"
        placeholder="4.0"
        :depend="aclList.length > 0 && aclList.includes(s.io_name) && s.acl === 'current'"
        required
        :rules="['range(4,20)', () => validateMinMax(s.min, s.max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max"
        :label="$t('Max current')"
        :help="$t('Specifies maximum current of the range (values between minimum-20mA).')"
        placeholder="12.5"
        :depend="aclList.length > 0 && aclList.includes(s.io_name) && s.acl === 'current'"
        required
        :rules="['range(4,20)', () => validateMinMax(s.min, s.max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="min"
        :label="$t('Min percent')"
        :help="$t('Specifies minimum percent of the range.')"
        placeholder="0"
        :depend="aclList.length > 0 && aclList.includes(s.io_name) && s.acl === 'percent'"
        required
        :rules="['range(0,100)', () => validateMinMax(s.min, s.max)]"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="max"
        :label="$t('Max percent')"
        :help="$t('Specifies maximum percent of the range.')"
        placeholder="0"
        :rules="['range(0,100)', () => validateMinMax(s.min, s.max)]"
        :depend="aclList.length > 0 && aclList.includes(s.io_name) && s.acl === 'percent'"
        required
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Trigger')"
        :help="triggerHelp"
        name="event"
        :options="triggerOptions"
        :depend="ioList().length > 0"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Priority')"
        :help="$t('Select priority.')"
        name="priority"
        :options="priorities"
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
      avlData: {},
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ],
      priorities: [
        ['low', this.$t('Low')],
        ['high', this.$t('High')],
        ['panic', this.$t('Panic')],
        ['security', this.$t('Security')]
      ]
    }
  },
  computed: {
    adcList() {
      if (!this.ioList()) return []
      return this.ioList()
        .filter(io => io.type === 'adc')
        .map(io => io.id)
    },
    aclList() {
      if (!this.ioList()) return []
      return this.ioList()
        .filter(io => io.type === 'acl')
        .map(io => io.id)
    },
    triggerHelp() {
      if (this.inputType === 'gpio') {
        return this.$t('Select trigger event for your own intended configuration')
      } else {
        return this.$t('Inside range - Input voltage falls in the specified region, Outside range - Input voltage drops out of the specified region')
      }
    },
    triggerOptions() {
      if (this.inputType === 'gpio') {
        return [
          ['no', this.$t('Input active')],
          ['nc', this.$t('Input low')],
          ['both', this.$t('Both')]
        ]
      }
      return [
        ['in', this.$t('Inside range')],
        ['out', this.$t('Outside range')]
      ]
    },
    inputType() {
      if (!this.section.io_name) return 'gpio'
      return this.ioList().find(io => io.id === this.section.io_name)?.type
    }
  },
  methods: {
    updateValidations(self) {
      self.vuciSection.validate()
    },
    validateMinMax(min, max) {
      if (parseFloat(min) >= parseFloat(max)) {
        return {
          isValid: false,
          message: this.$t('Max value should be higher than min value')
        }
      }
      return { isValid: true }
    },
    displayIoNames() {
      return this.ioList()
        .filter(io => (io.type === 'gpio' && (io.direction !== 'out' || (io.direction === 'out' && io.bi_dir === '1'))) || io.type === 'dwi' || io.type === 'acl' || io.type === 'adc')
        .map(io => [io.id, io.name_with_pins])
    },
    returnErrorMessage(errors) {
      const pathError = errors.data.errors.find(error => error.source.startsWith('io_name'))
      if (pathError) return this.$t('Selected input type is set as output')
      return this.$t('Failed to edit configuration')
    }
  }
}
</script>
