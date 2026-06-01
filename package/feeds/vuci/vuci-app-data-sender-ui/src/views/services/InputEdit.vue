<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="data_sender"
    :after-load="afterLoad"
    :before-save="validate"
    editing
  >
    <input-section
      :uci-data="uciData"
      :section="section"
      new-input
    />
  </vuci-form>
</template>

<script>
import InputSection from './InputSection.vue'

export default {
  components: { InputSection },
  inject: {
    setSection: {
      default: () => () => {}
    },
    setUciData: {
      default: () => () => {}
    }
  },
  props: {
    section: {
      type: Object,
      required: true
    },
    tltCardUciData: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      initialName: this.section.name,
      mqttCerts: true
    }
  },
  methods: {
    afterLoad(uciData) {
      if (this.section.mqtt_in_tls === '0') this.mqttCerts = false
      return uciData
    },
    validate() {
      return new Promise((resolve, reject) => {
        const collection = this.formData.collection.find(section => section.input?.includes(this.section.id))
        const pattern = new RegExp(`%${this.initialName}%`)
        if (!this.mqttCerts) {
          this.setSection(section => {
            section.mqtt_in_cafile = ''
          })
          this.mqttCerts = true
        }
        if (pattern.test(collection.format_str) && this.section?.name !== this.initialName) return reject(this.$t('Cannot modify data input name when it is used in collection "Format String" field'))
        const sectionIdx = this.tltCardUciData.inputs.findIndex(input => input.id === this.section.id)
        this.setUciData(uciData => (uciData.inputs[sectionIdx] = this.section))
        return resolve()
      })
    }
  }
}
</script>
