<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="data_sender"
    bulk-request
    :bulk-save-order="['outputs', 'collection']"
    :before-save="validate"
    editing
  >
    <collection-section
      :uci-data="uciData"
      :section="section"
    />
    <output-section
      :uci-data="uciData"
      :section="section"
    />
  </vuci-form>
</template>

<script>
import CollectionSection from './CollectionSection.vue'
import OutputSection from './OutputSection.vue'
import { useAzureConnectionUtils } from '@/composables/useAzureConnectionUtils'

export default {
  components: { CollectionSection, OutputSection },
  inject: ['azureSections'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  setup() {
    const { validateConnection, generateErrorMessage } = useAzureConnectionUtils()
    return { validateConnection, generateErrorMessage }
  },
  data() {
    return {
      formData: {}
    }
  },
  methods: {
    validate() {
      const dsOutputs = this.formData.outputs.filter(section => section.id !== this.section.output)
      const outputSection = this.formData.outputs.find(section => section.id === this.section.output)
      if (outputSection && Object.keys(outputSection).length > 0) {
        const errorMsg = this.generateErrorMessage(this.validateConnection(outputSection, this.azureSections(), dsOutputs, this.formData.collection))
        if (errorMsg) {
          return Promise.reject(errorMsg)
        }
      }
      const noNameExists = this.formData.inputs.some(input => this.section.input?.includes(input.id) && !input.name)
      if (this.section.enabled === '1' && noNameExists) return Promise.reject(this.$t('All data inputs assigned to this collection should be configured'))
      if (this.section.enabled === '1' && !this.section.input) return Promise.reject(this.$t('To enable collection, it is required to have created at least one data input'))
      // collection needs to be disabled for validations to work correctly in API, because /bulk doesn't see all changes from incoming requests
      return this.$axios.put(`/api/data_to_server/collections/config/${this.section.id}`, { data: { enabled: '0' } })
    }
  }
}
</script>
