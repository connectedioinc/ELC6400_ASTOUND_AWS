<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="impulse_counter"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      data-key="input"
      :endpoints="[{ endpoint: 'impulse_counter/config' }]"
      :title="$utils.getModalTitle($t('input'), section.name)"
      :help="$t('Settings for inputs configuration.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable input configuration.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Name of input configuration.')"
        maxlength="200"
        rules="string"
        required
        name="name"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('GPIO pin')"
        :help="$t('Select GPIO pin for input configuration.')"
        name="gpio"
        :options="returnGpioValues"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Edge')"
        :help="$t('Select the edge option to have the impulse counter increment on the signal`s transition from low to high, high to low, or both.')"
        name="edge"
        :options="formOptions().edge"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="debounce"
        rules="irange(0, 1000)"
        initial="0"
        :label="$t('Debounce')"
        :help="$t('Debounce filters out rapid, unintended signals. Set between 0-1000 ms to ensure only stable inputs are registered.')"
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
      formData: {},
      initialGpio: this.section.gpio
    }
  },
  methods: {
    /**
     * Returns an array of GPIO values.
     *
     * @returns {Array} An array containing the GPIO value for the current section and all available GPIO values.
     */
    returnGpioValues() {
      return [[this.initialGpio, this.formOptions()?.displayValues.find(input => input.key === this.initialGpio)?.value || this.initialGpio], ...this.formOptions().gpio]
    }
  }
}
</script>
