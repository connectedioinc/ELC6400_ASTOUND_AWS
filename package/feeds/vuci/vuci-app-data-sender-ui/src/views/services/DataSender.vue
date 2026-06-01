<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="data_sender"
    :after-load="loadData"
    :extra-load="extraLoad"
    :before-save="validate"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'data_to_server/collections/config' }]"
      :title="$t('Data to server collections')"
      data-key="collection"
      type="collection"
      :edit-form="{ onEdit: editModal, onAdd: addModal }"
      :after-save="afterSave"
      :after-add="afterAdd"
      :after-delete="afterDelete"
      :error-handlers="{ create: addError, edit: handleEditError }"
      :edit-form-props="{ senderUciData: uciData }"
      searchable
      @search="v => (searchValue = v)"
      @add-input="editInputAdd"
      @edit-modal-closed="modalClosed"
    >
      <template #custom-design="{ s, actions, index }">
        <tlt-sender-card
          v-if="filteredCollectionIds.includes(s.id)"
          :key="index"
          :uci-data="uciData"
          :card-ids="filteredCollectionIds"
          :section="s"
          class="mb-4"
          :card-states="cardStates"
          @update-card-ids="handleCardIdUpdate"
        >
          <template #enable>
            <vuci-form-item-switch
              :uci-section="s"
              name="enabled"
              @change="validateCollection(s)"
            />
          </template>
          <template #actions>
            <vuci-form-edit-delete
              :id="s.id"
              :actions="actions"
            />
          </template>
          <template #dropdown>
            <button
              type="button"
              @click="() => toggleDropdown(s.id)"
            >
              <tlt-icon
                icon="dropdown-arrow"
                :class="{ 'rotate-180': cardStates[s.id] }"
              />
            </button>
          </template>
        </tlt-sender-card>
        <div v-if="!filteredCollectionIds.length && index === 0">
          {{ $t('No collections found') }}
        </div>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './CollectionEdit.vue'
import AddForm from './StepEdit.vue'
import TltSenderCard from '../../components/services/TltSenderCard.vue'
import { formBus } from '@ui-core/vuci-form'
import { CERT_WARNINGS } from '@/plugins/certificates'
import { withCertificatesLoaded } from '@/plugins/certificates'

export default {
  components: { TltSenderCard },
  provide() {
    return {
      newInputSection: () => this.inputSection,
      newOutputSection: () => this.outputSection,
      collectionSection: () => this.collectionSection,
      inputOptions: () => this.inputOptions,
      outputOptions: () => this.outputOptions,
      formatOptions: () => this.formatOptions,
      encoderOptions: () => this.encoderOptions,
      limitData: () => this.limitData,
      modemList: () => this.modemList,
      azureSections: () => this.azureSections,
      industrialPlugins: () => this.industrialPlugins,
      warningMessages: () => this.warningMessages,
      ioData: () => this.$io.getFilteredPinsInfo(this.ioData),
      downloadExampleLua: this.downloadExampleLua,
      phoneGroupList: () => this.phoneGroupsData,
      emailUserList: () => this.emailUserList,
      iec60870Clients: () => this.iec60870Clients,
      validateMqttServerAddress: this.validateMqttServerAddress,
      updateCertificateWarnings: this.updateCertificateWarnings,
      getCertificateUploadWarning: this.getCertificateUploadWarning
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      addModal: markRaw(AddForm),
      formData: {},
      updatedUciData: {},
      searchValue: '',
      updateDataAfterClose: false,
      stepEditCollectionId: {},
      inputSection: {},
      outputSection: {},
      collectionSection: {},
      inputOptions: {},
      outputOptions: {},
      warningMessages: [],
      modemList: [],
      azureSections: [],
      industrialPlugins: ['dlms', 'mbus', 'modbus', 'opcua'],
      formatOptions: [],
      limitData: {},
      isAdd: false,
      ioData: [],
      phoneGroupsData: [],
      emailUserList: [],
      iec60870Clients: [],
      dataSenderAdvModExists: this.$store.hasPackages('vuci-app-data-sender-api-mod-advanced.control'),
      inputColumns(input) {
        return {
          item: input,
          columns: [
            [
              { label: this.$t('Data input type'), value: input?.plugin || '-' },
              { label: this.$t('Format type'), value: input?.format || '-' },
              { label: this.$t('Format string'), value: input?.format_str || '-' }
            ]
          ]
        }
      },
      cardStates: {},
      fullOutputTranslates: () => {
        return {
          '': '-',
          ...this.$dataSenderParameters.outputPluginTranslate()
        }
      }
    }
  },
  computed: {
    filteredCollectionIds() {
      if (!this.searchValue) {
        return this.formData.collection.map(collection => collection.id)
      }
      return this.formData.collection.filter(collection => this.matchesCollectionData(collection, this.formData.inputs, this.formData.outputs, this.searchValue)).map(collection => collection.id)
    }
  },
  watch: {
    searchValue(newValue) {
      if (newValue || newValue === '') {
        this.handleCardStateUpdate()
      }
    }
  },
  methods: {
    loadData(form) {
      const requests = ['/api/data_to_server/data/config', '/api/data_to_server/servers/config']
      return this.$axios
        .bulkGet(requests)
        .then(([inputs, outputs]) => {
          if (!inputs.success) this.$message.error(this.$t('Failed to load data inputs'))
          if (!outputs.success) this.$message.error(this.$t('Failed to load servers'))
          this.warningMessages = [...(outputs.messages ?? []), ...(inputs.messages ?? [])]
          this.handleCardStateUpdate(form?.collection?.map(collection => collection.id))
          return { ...form, inputs: inputs.success ? inputs.data : [], outputs: outputs.success ? outputs.data : [] }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    extraLoad() {
      const requests = [
        '/api/data_to_server/data/options',
        '/api/data_to_server/servers/options',
        '/api/data_to_server/format/options',
        '/api/data_to_server/encoder/options',
        '/api/data_to_server/collections/limits',
        { endpoint: '/api/azure/iot_hub/config', condition: 'azure_iothub.control' },
        { endpoint: '/api/io/status', condition: this.$store.board.hwinfo.ios && (this.dataSenderAdvModExists || this.$store.hasPackages('vuci-app-impulse-counter-api.control')) },
        { endpoint: '/api/recipients/phone_groups/config', condition: this.$store.board.hwinfo.mobile && this.dataSenderAdvModExists },
        { endpoint: '/api/recipients/email_users/config', condition: this.dataSenderAdvModExists },
        {
          endpoint: '/iec60870/client/instances/config',
          condition: this.$store.hasPackages('vuci-app-data-sender-api-mod-iec60870.control')
        }
      ]
      return withCertificatesLoaded(
        this.$axios
          .bulkGet(requests)
          .then(([inOptions, outOptions, formatOptions, encoderOptions, limitData, azureData, ioData, phoneGroupsData, emailUsersData, iec60870Clients]) => {
            if (!inOptions.success) this.$message.error(this.$t('Failed to load data input options'))
            if (!outOptions.success) this.$message.error(this.$t('Failed to load server options'))
            if (!formatOptions.success) this.$message.error(this.$t('Failed to load format type options'))
            if (!encoderOptions.success) this.$message.error(this.$t('Failed to load encoder type options'))
            if (!limitData.success) this.$message.error(this.$t('Failed to load instance limit data'))
            if (!azureData.success) this.$message.error(this.$t('Failed to load Azure IoT Hub data'))
            if (!ioData.success) this.$message.error(this.$t('Failed to load I/O data'))
            if (!phoneGroupsData.success) this.$message.error(this.$t('Failed to load phone group data'))
            if (!emailUsersData.success) this.$message.error(this.$t('Failed to load email users'))
            if (!iec60870Clients.success) this.$message.error(this.$t('Failed to load IEC 60870-5 clients'))
            this.inputOptions = inOptions.success ? inOptions.data : {}
            this.outputOptions = outOptions.success ? outOptions.data : {}
            this.formatOptions = formatOptions.success ? formatOptions.data : []
            this.encoderOptions = encoderOptions.success ? encoderOptions.data : []
            this.limitData = limitData.success ? limitData.data : {}
            this.modemList = this.$mobile.parseModems(this.$store.board.modems || [])
            this.azureSections = azureData.success ? azureData.data : []
            this.ioData = ioData.success ? ioData.data : []
            this.phoneGroupsData = phoneGroupsData.success ? phoneGroupsData.data : []
            this.emailUserList = emailUsersData.success ? emailUsersData.data : []
            this.iec60870Clients = iec60870Clients.success ? iec60870Clients.data : []
          })
          .catch(() => {
            this.$message.error(this.$t('An unexpected error occurred'))
          })
      )
    },
    afterSave() {
      this.handleCardStateUpdate()
    },
    afterAdd(_, { uciData, newSection }) {
      this.collectionSection = newSection
      this.$spin()
      const endpoints = [`/api/data_to_server/collections/${newSection.id}/data/config/${newSection.input[0]}`, `/api/data_to_server/collections/${newSection.id}/servers/config/${newSection.output}`]
      return this.$axios
        .bulkGet(endpoints)
        .then(([input, output]) => {
          if (!input.success) this.$message.error(this.$t('Failed to load created data input'))
          if (!output.success) this.$message.error(this.$t('Failed to load created server'))
          this.inputSection = input.success ? input.data : {}
          this.outputSection = output.success ? output.data : {}
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          const updatedInputs = uciData?.inputs || []
          const updatedOutputs = uciData?.outputs || []
          updatedInputs.push(this.inputSection)
          updatedOutputs.push(this.outputSection)
          uciData.inputs = updatedInputs
          uciData.outputs = updatedOutputs
          this.$spin(false)
        })
    },
    afterDelete(collection) {
      const inputIds = collection.input || []
      const outputId = collection.output || ''
      const filteredInputs = this.formData.inputs.filter(input => !inputIds.includes(input.id))
      const filteredOutputs = this.formData.outputs.filter(output => output.id !== outputId)
      this.formData.inputs = filteredInputs
      this.formData.outputs = filteredOutputs
    },
    addError(err) {
      const errorCode = err.data.errors[0].code
      const errors = {
        106: this.$t('Only a total of %s collections can be created').format(this.limitData.max_collections)
      }
      return errors[errorCode] || this.$t('An unexpected error occurred')
    },
    validateCollection(s) {
      if (s.enabled !== '1' || s.enable_validate) return
      const output = this.formData.outputs.find(section => section.id === s.output)
      const inputs = this.formData.inputs.filter(section => s.input?.includes(section.id))
      if (inputs.some(input => !('name' in input))) {
        s.enabled = '0'
        return this.$message.error(this.$t('To enable collection, it is required that all data inputs assigned to this collection are configured'))
      }
      if (!output || !('plugin' in output)) {
        s.enabled = '0'
        return this.$message.error(this.$t('To enable collection, server section assigned to this collection should be configured'))
      }
      if (!inputs || inputs.length === 0) {
        s.enabled = '0'
        return this.$message.error(this.$t('To enable collection, it is required to have created at least one data input'))
      }
    },
    validate() {
      return new Promise((resolve, reject) => {
        const inputErrorColl = this.formData.collection.filter(col => this.formData.inputs.some(input => col.input?.includes(input.id) && (!('name' in input) || !input.name) && col.enabled === '1'))
        const inputEmptyErrorColl = this.formData.collection.filter(col => (!col.input || col.input.length === 0) && col.enabled === '1')
        const outputErrorColl = this.formData.collection.filter(col => this.formData.outputs.find(output => col.output === output.id && !('plugin' in output) && col.enabled === '1'))
        if (inputEmptyErrorColl.length !== 0) {
          return reject(this.$t('Cannot save enabled "%s" collection, it is required to have created at least one data input').format(inputEmptyErrorColl[0].name))
        }
        if (inputErrorColl.length !== 0) {
          return reject(this.$t('Cannot save enabled "%s" collection, it is required that all data inputs assigned to this collection are configured').format(inputErrorColl[0].name))
        }
        if (outputErrorColl.length !== 0) {
          return reject(this.$t('Cannot save enabled "%s" collection, it is required that output assigned to this collection is configured').format(outputErrorColl[0].name))
        }
        if (this.formData.outputs.length > 0) {
          const doesNotExistServerType = this.formData.collection.filter(col => {
            const availableOutput = this.outputOptions.plugins.map(plugin => plugin.name)
            const findOutputPlugin = this.formData.outputs.find(output => col.output === output.id)
            return findOutputPlugin?.plugin ? !availableOutput.includes(findOutputPlugin.plugin) : false
          })
          if (doesNotExistServerType.length !== 0) {
            const serverTypeName = this.$dataSenderParameters.outputPluginTranslate()[this.formData.outputs.find(output => doesNotExistServerType[0].output === output.id)?.plugin]
            return reject(this.$t('Cannot save enabled "%s" collection. Please change the server type or update "%s" package.').format(doesNotExistServerType[0].name, serverTypeName))
          }
        }
        if (this.formData.inputs.length > 0) {
          const doesNotExistDataType = this.formData.inputs.filter(input => !this.inputOptions.plugins.map(plugin => plugin.name).includes(input?.plugin))
          if (doesNotExistDataType.length !== 0) {
            const collectionName = this.formData.collection.find(col => col.input && col.input.includes(doesNotExistDataType[0].id))
            return reject(
              this.$t('Cannot save enabled "%s" collection. Please change "%s" data input type or update "%s" package.').format(
                collectionName.name,
                doesNotExistDataType[0].name,
                this.$dataSenderParameters.inputPluginTranslate()[doesNotExistDataType[0].plugin]
              )
            )
          }
        }
        return resolve()
      })
    },
    editInputAdd(data) {
      this.updatedUciData = data.uciData
      this.updateDataAfterClose = data.flag
      this.stepEditCollectionId = data.collectionId
    },
    modalClosed(data) {
      if (!this.updateDataAfterClose || Object.keys(this.updatedUciData).length === 0) return
      if (this.stepEditCollectionId) {
        const collectionIdx = this.updatedUciData.collection.findIndex(collection => collection.id === this.stepEditCollectionId)
        this.updatedUciData.collection[collectionIdx].enabled = '0'
      }
      data.collection = this.updatedUciData.collection
      data.inputs = this.updatedUciData.inputs
      formBus.emit('uciData-loaded')
    },
    downloadExampleLua(url, name) {
      return this.$utils
        .downloadFileApi('/api/data_to_server' + url, 'text/plain', 'POST')
        .then(() => this.$message.success(this.$t('%s file download was successful').format(this.$capitalize(name))))
        .catch(() => this.$message.error(this.$t('Failed to download %s file').format(name)))
    },
    handleEditError(errors) {
      const errCollections = {}
      // Iterate over all errors and check if it is a required option error
      errors.payload
        ?.flatMap(errors => errors.errors)
        .filter(error => error.code === 103)
        .forEach(error => {
          const col = this.formData.collection.find(collection => (error.error.includes('output') ? collection.output === error.section : collection.id === error.section))
          if (col) errCollections[col.name] = true
        })
      const errCollectionsArr = Object.keys(errCollections)
      if (errCollectionsArr.length) {
        return this.$t('Configuration(s) (%s) is missing required options.').format(errCollectionsArr.join(', '))
      }
    },
    matchesSearchedData(data, lowerCaseSearch, searchKeyMap) {
      return Object.entries(searchKeyMap).some(([searchKey, getPrettyValue]) => {
        const searchKeyValue = getPrettyValue?.()?.[data[searchKey]] || data[searchKey] || '-'
        if (!searchKeyValue) return
        return String(searchKeyValue)?.toLowerCase()?.includes(lowerCaseSearch)
      })
    },
    matchesCollectionData(collection, inputs, outputs, search) {
      const lowerCaseSearchTerm = search.toLowerCase()

      if (this.matchesSearchedData(collection, lowerCaseSearchTerm, { name: null })) {
        return true
      }
      if (outputs.find(output => collection.output === output.id && this.matchesSearchedData(output, lowerCaseSearchTerm, { plugin: this.fullOutputTranslates }))) {
        return true
      }
      if (
        inputs.find(
          input =>
            collection.input.includes(input.id) &&
            this.matchesSearchedData(input, lowerCaseSearchTerm, { name: null, plugin: this.$dataSenderParameters.inputPluginTranslate, format: this.$dataSenderParameters.formatTranslate })
        )
      ) {
        return true
      }

      return false
    },
    validateMqttServerAddress(val, section, uciData) {
      let res
      let type
      if (section['.type'] === 'collection' || section['.type'] === 'output') {
        const coll = section['.type'] === 'collection' ? section : uciData.collection?.find(coll => coll.output === section.id)
        res = uciData.inputs?.find(input => coll.input?.includes(input.id) && input.mqtt_in_host === val)
        type = this.$t('input')
      } else {
        res = uciData.collection?.find(coll => coll.input?.includes(section.id) && uciData.outputs?.find(output => output.id === coll.output && output.mqtt_host === val))
        type = this.$t('output')
      }
      return {
        isValid: !res,
        message: this.$t("Server address '%s' is already used for %s '%s'.").format(val, type, (res && res.name) || '')
      }
    },
    handleCardIdUpdate() {
      const cardStateIds = Object.keys(this.cardStates)
      if (this.filteredCollectionIds.length !== cardStateIds.length) {
        this.handleCardStateUpdate(this.filteredCollectionIds, false)
      }
    },
    handleCardStateUpdate(cardIds = this.filteredCollectionIds, resetStates = true) {
      this.cardStates = Object.fromEntries(cardIds.map((id, index) => [id, resetStates ? index === 0 : index === 0 || this.cardStates[id]]))
    },
    toggleDropdown(id) {
      this.cardStates[id] = !this.cardStates[id]
    },
    updateCertificateWarnings(res) {
      const resMsgs = res?.messages ?? []
      const oldMessages = this.warningMessages.filter(msg => !msg.source?.startsWith(res.data?.id + ':'))
      resMsgs.forEach(msg => {
        if (msg.source?.includes(':') && CERT_WARNINGS[msg.code]) {
          this.$message.info(CERT_WARNINGS[msg.code]())
        }
      })
      this.warningMessages = [...oldMessages, ...resMsgs]
    },
    getCertificateUploadWarning(self) {
      const fileWarning = this.warningMessages.find(message => {
        const [instanceId, fieldName] = message.source?.split(':') ?? []
        return instanceId === self.sectionId && fieldName === self.name
      })
      return fileWarning && CERT_WARNINGS[fileWarning.code]?.()
    }
  }
}
</script>
