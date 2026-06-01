<template>
  <vuci-form
    v-model="formData"
    config="data_sender"
    bulk-request
    :bulk-save-order="['inputs', 'outputs', 'collection']"
    editing
    :before-save="onBeforeSave"
  >
    <template #default>
      <tlt-card
        v-for="(iSection, index) in inputSectionArray"
        v-show="step === 0"
        :key="iSection.id"
        :ref="`card_${iSection.id}`"
        :title="inputTitles[index]"
        title-space-between
      >
        <template #title-content>
          <tlt-button
            v-if="inputSectionArray[0].id !== iSection.id"
            button-id="add"
            color="error"
            type="text"
            size="md"
            @click="onDelete(iSection.id)"
          >
            {{ $t('Remove data input') }}
          </tlt-button>
        </template>
        <input-section
          :ref="`input_${iSection.id}`"
          :uci-data="updatedUciData"
          :section="iSection"
          is-add-section
          :show-button="iSection.id === inputSectionArray[inputSectionArray.length - 1].id"
          @add-input="addInput"
        />
      </tlt-card>
      <output-section
        ref="output"
        :show="step === 2"
        :uci-data="updatedUciData"
        :section="newOutputSection()"
        is-add-section
      />
      <collection-section
        ref="collection"
        :show="step === 1"
        :uci-data="updatedUciData"
        :section="section"
        is-add-section
      />
    </template>
    <template #form-buttons="{ save }">
      <div class="flex w-full justify-between ml-auto">
        <tlt-button
          v-show="step > 0"
          color="secondary"
          button-id="back"
          @click="back"
        >
          {{ buttonBack[step] || buttonBack.default }}
        </tlt-button>
        <tlt-button
          class="ml-auto!"
          button-id="next"
          @click="onSave(save)"
        >
          {{ buttonNext[step] || buttonNext.default }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import InputSection from './InputSection.vue'
import CollectionSection from './CollectionSection.vue'
import OutputSection from './OutputSection.vue'
import { formBus } from '@ui-core/vuci-form'
import { useAzureConnectionUtils } from '@/composables/useAzureConnectionUtils'

export default {
  components: { InputSection, CollectionSection, OutputSection },
  inject: ['newInputSection', 'newOutputSection', 'collectionSection', 'setSection', 'setUciData', 'azureSections'],
  provide() {
    return {
      editableSections: () => this.inputSectionArray
    }
  },
  props: {
    section: {
      type: Object,
      required: true
    },
    senderUciData: {
      type: Object,
      required: true
    }
  },
  emits: ['add-input'],
  setup() {
    const { validateConnection, generateErrorMessage } = useAzureConnectionUtils()
    return { validateConnection, generateErrorMessage }
  },
  data() {
    return {
      formData: {},
      step: 0,
      inputSectionArray: [this.newInputSection()] || [],
      buttonBack: {
        1: this.$t('Back: %s').format(this.$t('Data configuration')),
        2: this.$t('Back: %s').format(this.$t('Collection edit')),
        default: this.$t('Back')
      },
      buttonNext: {
        0: this.$t('Next: %s').format(this.$t('Collection edit')),
        1: this.$t('Next: %s').format(this.$t('Server configuration')),
        2: this.$t('Save & Apply'),
        default: this.$t('Next')
      },
      fakeInput: {
        name: '',
        plugin: 'base',
        id: 0
      },
      tempInputs: [],
      pluginTypes: {
        bluetooth: 'bl',
        dlms: 'dlms',
        dnp3: 'dnp3',
        gsm: 'gsm',
        mbus: 'mbus',
        mdcollect: 'mdc',
        modbus: 'modbus',
        mqtt: 'mqtt',
        opcua: 'opcua',
        wifiscan: 'wifi',
        http: 'http'
      },
      basicPluginOptions: ['id', 'name', 'plugin', 'format', 'format_str', 'na_str', 'delimiter'],
      mqttDepends: ['mqtt_in_tls_type', 'mqtt_device_files', 'mqtt_in_cafile', 'mqtt_in_certfile', 'mqtt_in_keyfile'],
      inputTitles: [this.$t('Data configuration')]
    }
  },
  computed: {
    updatedUciData() {
      const data = { ...this.formData } || {}
      data.inputs = this.removeDuplicates(data, 'inputs', this.newInputSection())
      data.outputs = this.removeDuplicates(data, 'outputs', this.newOutputSection())
      return data
    }
  },
  mounted() {
    this.onMount()
  },
  beforeUnmount() {
    this.setSection?.(section => {
      section.enable_validate = false
    })
  },
  methods: {
    onMount() {
      this.setSection?.(section => {
        section.enable_validate = true
        section.enabled = undefined
      })
      this.$refs[`card_${this.newInputSection().id}`][0].expanded = true
      this.emitToParent(this.senderUciData, true)
    },
    removeDuplicates(data, key, newSection) {
      data[key] = Array.from(new Set([...(data?.[key] || []), ...(key === 'inputs' ? this.inputSectionArray : [newSection])]))
      if (data[key].filter(section => section.id === newSection.id).length > 1) {
        const duplicateIdx = data[key].findIndex(section => section.id === newSection.id)
        data[key].splice(duplicateIdx, 1)
      }
      return data[key]
    },
    onSave(save) {
      switch (this.step) {
        case 0:
          this.$refs.collection.updateInputValues()
          return this.validateLastInput().then(isValid => {
            return this.afterValidate(isValid, save)
          })
        case 1:
          return this.validateSection(this.$refs.collection).then(isValid => {
            return this.afterValidate(isValid, save)
          })
        case 2:
          return this.validateSection(this.$refs.output).then(isValid => {
            return this.afterValidate(isValid, save)
          })
      }
    },
    back() {
      this.step = this.step - 1
    },
    afterValidate(isValid, save) {
      if (!isValid) return this.$message.error(this.$t('Some fields are invalid'))
      if (this.step < 2) return this.step++
      if (this.step === 2) {
        this.emitToParent(this.formData, false)
        return save()
      }
    },
    onDelete(id, index) {
      this.$spin()
      const collection = this.formData.collection.find(section => section.id === this.section.id)
      const inputIds = this.inputSectionArray.filter(s => s.id !== id).map(s => s.id)
      return this.$axios
        .delete(`/api/data_to_server/data/config/${id}`)
        .then(() => {
          this.updateTitles()
          this.inputTitles.splice(index, 1)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to remove data input'))
        })
        .finally(() => {
          this.finalizeDelete(id, collection, inputIds)
          this.$spin(false)
          this.shrinkSections()
        })
    },
    finalizeDelete(id, collection, inputIds) {
      collection.input = inputIds
      this.formData.inputs = this.formData.inputs.filter(section => section.id !== id)
      this.inputSectionArray = this.inputSectionArray.filter(section => section.id !== id)
      this.tempInputs = this.tempInputs.filter(section => section.id !== id)
      this.setUciData?.(uciData => (uciData.inputs = this.tempInputs))
    },
    addInput(self) {
      return self.vuciSection.validate().then(result => {
        if (!result) return this.$message.error(this.$t('Some fields are invalid'))
        const inputIds = this.inputSectionArray.map(s => s.id)
        if (this.formData.inputs.some(input => inputIds.includes(input.id) && input.mqtt_in_tls === '1' && !input.mqtt_in_cafile)) {
          return this.$message.error(this.$t('Missing required "Certificate authority file"'))
        }
        const collection = this.formData.collection.find(section => section.id === this.section.id)
        this.$spin()
        return this.$axios
          .post(`/api/data_to_server/collections/${this.section.id}/data/config`, {
            data: {}
          })
          .then(({ data }) => {
            this.updateTitles()
            this.inputSectionArray.push(data)
            this.inputTitles.push(this.$t('Data configuration'))
            inputIds.push(data.id)
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to add data input to collection'))
          })
          .finally(() => {
            this.finalizeInputAdd(collection, inputIds)
            this.$spin(false)
            this.shrinkSections()
          })
      })
    },
    finalizeInputAdd(collection, inputIds) {
      this.tempInputs = this.formData.inputs.map(input => (inputIds.includes(input.id) ? this.setFakeInput(input) : input))
      collection.input = inputIds
      this.setUciData?.(uciData => (uciData.inputs = this.tempInputs))
      this.setUciData?.(uciData => (uciData.collection = this.formData.collection))
      this.emitToParent(this.senderUciData, true, collection.id)
      formBus.emit('uciData-loaded')
    },
    shrinkSections() {
      this.inputSectionArray.forEach((section, index) => {
        if (index === this.inputSectionArray.length - 1) {
          this.$refs[`card_${section.id}`][0].expanded = true
          return
        }
        this.$refs[`card_${section.id}`][0].expanded = false
      })
    },
    validateSection(ref) {
      return ref.$refs.section.validate()
    },
    validateLastInput() {
      const inputKeys = Object.keys(this.$refs).filter(key => key.includes('input_') && this.$refs[key].length !== 0)
      const lastKey = inputKeys[inputKeys.length - 1]
      this.updateTitles()
      return this.validateSection(this.$refs[lastKey][0])
    },
    setFakeInput(input) {
      const fakeInput = { ...this.fakeInput }
      fakeInput.id = input.id
      return fakeInput
    },
    emitToParent(uciData, flag, collectionId = '') {
      let vm = this.$parent
      while (vm) {
        vm.$emit('add-input', { uciData, flag, collectionId })
        vm = vm.$parent
      }
    },
    updateTitles() {
      this.inputTitles = this.inputSectionArray.map(input => this.$t('Data "%s" configuration').format(input.name))
    },
    onBeforeSave() {
      const dsOutputs = this.updatedUciData.outputs.filter(section => section.id !== this.section.output)
      const outputSection = this.updatedUciData.outputs.find(section => section.id === this.section.output)
      if (outputSection && Object.keys(outputSection).length > 0) {
        const errorMsg = this.generateErrorMessage(this.validateConnection(outputSection, this.azureSections(), dsOutputs, this.updatedUciData.collection))
        if (errorMsg) {
          return Promise.reject(errorMsg)
        }
      }
      return Promise.resolve(true)
    }
  }
}
</script>
