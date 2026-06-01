<template>
  <slot
    :uci-data="uciData"
    v-bind="$attrs"
  />
  <slot name="footer" />
  <div
    v-if="modalLevel() > 0 || isSaveable || $slots['form-buttons']"
    class="flex items-center list-layout--ignore"
  >
    <slot
      name="form-buttons"
      :save="save"
      :back="back"
    >
      <tlt-button
        v-if="modalLevel() > 0"
        color="secondary"
        button-id="back"
        @click="back()"
      >
        {{ $t('Back') }}
      </tlt-button>
      <tlt-button
        v-if="isSaveable"
        class="ml-auto"
        button-id="saveandapply"
        @click="save()"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </slot>
  </div>
</template>

<script>
import { computed } from 'vue'
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import * as Types from '@ui-core/types'
import { formBus, getMap } from './form-bus'
import formHelper from '@ui-core/utils/form-helper'
import { makeProps, noop } from '@ui-core/utils/props'
import { isArray } from '@ui-core/utils/inspect'

export default {
  inject: {
    editableSection: {
      default: () => []
    },
    currentSections: {
      default: () => false
    },
    modalData: {
      default: []
    },
    modalLevel: {
      type: Function,
      default() {
        return () => 0
      }
    },
    back: {
      default: () => {}
    },
    setModalTitle: {
      default: () => noop
    },
    modalSaveAndApply: {
      default: () => noop
    }
  },
  provide() {
    return {
      inlineForm: false,
      emitTitle: this.emitTitle,
      vuciForm: this,
      configName: this.config,
      initialForm: () => this.initialForm,
      setUciData: setterFn => setterFn(this.uciData),
      loadData: this.loadData,
      loaded: computed(() => this.loaded)
    }
  },
  inheritAttrs: false,
  props: makeProps({
    beforeSend: [Function, noop],
    config: [String, undefined, true],
    editing: [Boolean, false],
    afterLoad: [Function, noop],
    extraLoad: [Function, noop],
    asyncLoad: [Boolean, false],
    beforeSave: [Function, () => Promise.resolve(true)],
    bulkRequest: [Boolean, false],
    successSaveMessage: [String, undefined],
    editMultiple: [Array, []],
    /*
     ** The 'bulkSaveOrder' prop should have a 'dataKey' associated with it to enable sorting based on the provided array.
     ** If not all 'dataKey's are provided, they should be prioritized and moved to the top.
     */
    bulkSaveOrder: [Array, []],
    modelValue: [Object, () => ({})]
  }),
  emits: ['update:modelValue'],
  data() {
    return {
      emitted: false,
      dependForm: {},
      uciData: {},
      vuciSections: {},
      initialForm: {},
      editableData: {},
      fileUploads: {},
      uid: Math.floor(Math.random() * 1000),
      loaded: false
    }
  },
  computed: {
    isSaveable() {
      return Object.values(this.vuciSections).some(section => section.saveable)
    },
    invalidTabs() {
      return Array.from(
        new Set(
          Object.values(this.vuciSections)
            .flatMap(section => section.invalidInputs)
            .map(input => input.tab?.title)
            .filter(v => !!v)
        )
      )
    }
  },
  watch: {
    uciData: {
      deep: true,
      handler() {
        this.$emit('update:modelValue', this.uciData)
      }
    }
  },
  created() {
    if (typeof this.editableSection === 'function' && this.editableSection()) {
      const dataKey = this.modalData().vuciForm.dataKey
      if (!this.uciData[dataKey]) {
        this.uciData = { ...this.uciData, [dataKey]: [] }
      }
      const index = this.uciData[dataKey].push(this.editableSection()) - 1
      this.editableData = this.uciData[dataKey][index]
    }
    // TODO: bad magic happening here because merging is done without identifier
    if (typeof this.modalData === 'function') {
      this.uciData = formHelper.mergeSections(this.modalData().uciData, this.uciData)
    }
    formBus.on(`add-upload-to-form-${this.uid}`, upload => {
      this.fileUploads[upload.prop] = upload
    })
    formBus.on(`remove-upload-from-form-${this.uid}`, upload => {
      delete this.fileUploads[upload.prop]
    })
  },
  async mounted() {
    await this.loadData()
  },
  beforeUnmount() {
    formBus.off(`add-upload-to-form-${this.uid}`)
    formBus.off(`remove-upload-from-form-${this.uid}`)
  },
  methods: {
    async loadData(overwrite = false) {
      this.$store.setFormLoading(true)
      this.$spin(this.$t('Loading'))
      try {
        const { data, responses } = await this._loadData(overwrite)
        const res = await this.extraLoad(data)
        this.uciData = { ...data, ...res }
        if (this.asyncLoad && !this.$route.hash) {
          this._loadSections()
          await this._afterLoad(this.uciData, responses)
        } else {
          await this._afterLoad(this.uciData, responses)
          this._loadSections()
        }
      } catch (e) {
        this.$log(e, true)
        this.$spin(false)
        this.$message.error(this.$t('An unexpected error occurred'))
      } finally {
        this.initialForm = JSON.parse(JSON.stringify(this.uciData))
        this.$store.setFormLoading(false)
      }
    },
    async _afterLoad(data, responses) {
      const res = await this.afterLoad(data, responses)
      this.uciData = { ...data, ...res }
    },
    /**
     * invokes every registered section's load method.
     */
    _loadSections() {
      this.loaded = true
      this.$nextTick(() => {
        Object.values(this.vuciSections).forEach(section => section.load(this.uciData))
        this.$spin(false)
      })
    },
    /**
     * @param {string} title - through formBus emits edit form title if it hasn't emmited it yet.
     */
    emitTitle(title) {
      if (!this.emitted) {
        this.setModalTitle(title)
        this.emitted = true
      }
    },
    async save() {
      try {
        const isValid = await this.validate()
        if (!isValid) {
          this.$utils.showThrownError(
            this.invalidTabs.length
              ? this.$t('Configuration could not be saved. Some fields in %s are invalid'.format(this.invalidTabs.map(title => `"${title}"`).join(', ')))
              : this.$t('Configuration could not be saved. Some fields are invalid')
          )

          return false
        }

        await this.beforeSave()

        if (this.editing) {
          this.modalSaveAndApply(this)
          return true
        }

        const res = await this.saveData()
        if (!res) return false

        this.updateUciData(res)
        await this.$nextTick()
        Object.values(this.vuciSections).forEach(section => {
          section.updateAfterSave()
        })

        formBus.emit('forms-applied-api')

        return true
      } catch (error) {
        this.$utils.showThrownError(error)
        return false
      }
    },
    /**
     * calls given sections validate method and resolves true if all validations returned true
     * @param {Record<string, Types.VuciSection>} sections
     * @returns {Promise<boolean>} true - all validations passed, false if any failed
     */
    async validate(sections = this.vuciSections) {
      const vuciSections = sections || this.vuciSections

      const res = await Promise.all(Object.values(vuciSections).map(section => (section.visible ? section.validate() : true)))

      return !res.includes(false)
    },
    /**
     * @param {boolean = true} validate - flag indicate whether the VuciSections validate methods should be invoked before saving
     * @param {Record<string,Types.UCISection>} sections
     * @returns {Promise<Record<string, any[]>>}
     */
    async saveData(sections) {
      sections = sections || this.vuciSections
      this.$spin(this.$t('Waiting for configuration to be applied...'))
      try {
        // thrown error will stop code from processing further in try block
        if (!(await this.handleFileUpload())) return false
        if (await this.handleSave(sections)) this.$message.success(this.successSaveMessage || this.$t('Configuration has been applied'))
      } catch (e) {
        if (e instanceof Error && !import.meta.env.PROD) console.error(e)
        this.$message.error(e)
        return false
      } finally {
        this.$spin(false)
      }
      return { ...this.uciData }
    },
    /**
     * @param {Types.MergeObject[]} mergeObj
     * @param {string[]} idKeys - array containing mergeable object identifier which will be used to determine to which object data needs to merge
     */
    mergeToUci(mergeObj, idKeys) {
      mergeObj.forEach((merge, index) => {
        this.uciData = formHelper.mergeSections(this.uciData, merge.data, {
          identifier: idKeys[index],
          overwrite: !!merge.overwrite
        })
      })
    },
    sortByOrder(array, orderArray, key) {
      const orderedItems = []
      const remainingItems = []
      array.forEach(item => {
        if (orderArray.includes(item[key])) {
          orderedItems.push(item)
        } else {
          remainingItems.push(item)
        }
      })
      orderedItems.sort((a, b) => {
        const indexA = orderArray.indexOf(a[key])
        const indexB = orderArray.indexOf(b[key])
        if (indexA < indexB) return -1
        if (indexA > indexB) return 1
        return 0
      })
      return [...orderedItems, ...remainingItems]
    },
    /**
     * @param {Record<string, Types.VuciSection>} sections
     */
    async handleSave(sections) {
      let saveableSections = Object.values(sections).filter(val => val.saveable && val.visible)
      if (this.bulkRequest && this.bulkSaveOrder && this.bulkSaveOrder.length) {
        saveableSections = this.sortByOrder(saveableSections, this.bulkSaveOrder, 'dataKey')
      }
      const requests = saveableSections.map(s => s.callMethod.edit())
      await this.beforeSend(requests)
      let allGood = true
      try {
        const res = await Promise.all(requests)
        if (this.bulkRequest) {
          allGood = await this.handleBulkSave(saveableSections, res)
        } else {
          this.mergeToUci(
            res,
            saveableSections.map(s => s.sectionId)
          )
        }
      } catch (error) {
        this.$log(error)
        allGood = false
        this.$message.error(error)
      }
      return allGood
    },
    /**
     * @description bulk save logic. Sends all requests and then merges responses to uciData
     * @param {Types.VuciSection[]} sections array of only saveable vuci sections
     * @param {Types.UciApiBulkRequest<Types.UCISection>[][]} req  requests array
     * @returns {Promise<boolean>} the state of bulk save
     */
    async handleBulkSave(sections, req) {
      const awaitNetwork = sections.some(s => s.awaitNetwork)
      let successful = true
      const saveState = { responses: [], ids: [] }
      // TODO this seems quite questionable. Is it possible for one section
      // to send more than one request at single VuciSection.saveData() method call?
      sections.forEach((section, index) => {
        section.requestCount = req[index].length
      })
      const bulkRequests = req.reduce((data, current) => data.concat(current), [])
      const bulkResponse = await this.$axios.bulk(bulkRequests, { awaitNetwork })
      sections.forEach(section => {
        const requestResponse = bulkResponse.splice(0, section.requestCount)
        const errorObject = { type: 'edit', payload: [] }
        errorObject.payload = requestResponse.filter(res => !res.success)
        if (errorObject.payload.length > 0) {
          successful = false
          return this.$message.error(section.handleError('edit', errorObject))
        }
        // getSavedData returns { data: { [key:string]: any[]}, overwrite: boolean }
        saveState.responses.push(section.getSavedData(requestResponse, section.dataKey, true))
        saveState.ids.push(section.sectionId)
      })
      const results = await Promise.all(saveState.responses)
      this.mergeToUci(results, saveState.ids)
      return successful
    },
    /**
     * @returns {Promise<boolean>} status of file uploads. If any of uploads fail, false is returned, true otherwise
     */
    async handleFileUpload() {
      const results = await this._uploadFiles()
      const failedFiles = results.filter(result => !result.success)
      if (results.length < 1 || failedFiles.length < 1) return true
      failedFiles.forEach(failed => this.$message.error(`${failed.handler}: ${failed.name}`))
      return false
    },
    /**
     * @description loads uci data from endpoints provided in Vuci Sections
     * @param {boolean} overwrite - flag indicates if loaded data should override current uci data for registered VuciSection data keys
     * @returns {Promise<{[key:string]: Types.UCISection[]}>} loaded data from vuci section provided endpoints
     */
    async _loadData(overwrite) {
      let data = this.uciData
      const responses = []
      /** @type {[string[], string[]]} */
      const [getRequests, dataKeys] = this._getEndpoints()
      if (getRequests.length === 0) return { data, responses }
      const res = await this.$axios.bulkGet(getRequests)
      const dataKeyMap = getMap()
      res.forEach((response, idx) => {
        responses.push(response)
        if (!response.data) return
        const currKey = dataKeys[idx]
        const resData = isArray(response.data) ? response.data : [response.data]
        if (overwrite) return (data[currKey] = resData)
        data = formHelper.mergeSections(data, { [currKey]: resData }, { identifier: dataKeyMap[currKey] || 'id' })
      })
      // Removing duplicate sections (depending on type & name)
      Object.keys(data).forEach(key => {
        data[key] = data[key].filter((section, index, self) => index === self.findIndex(foundSection => this._compareEntries(section, foundSection)))
      })
      return { data, responses }
    },
    /**
     * gets endpoints and their data keys thats provided to vuci sections
     * @returns {[endpoints: string[], dataKeys: string[]]} - first array contains endpoints, second contains dataKeys
     */
    _getEndpoints() {
      return Object.values(this.vuciSections).reduce(
        (sum, section) => {
          section.callMethod.get().forEach(value => {
            sum[0].push(...value.endpoints)
            sum[1].push(...value.endpoints.map(() => value.dataKey))
          })
          return sum
        },
        [[], []]
      )
    },
    /**
     * Compares two objects. If id & .type props are present - compares them as uci object, otherwise just like objects
     * @param {(Types.UCISection)} firstItem
     * @param {(Types.UCISection)} secondItem
     * @returns {boolean} - true if objects are equal, false otherwise
     */
    _compareEntries(firstItem, secondItem) {
      if (firstItem.id && firstItem['.type'] && secondItem.id && secondItem['.type']) {
        return secondItem.id === firstItem.id && secondItem['.type'] === firstItem['.type']
      }
      return secondItem === firstItem
    },
    /**
     * invokes all registered file upload components uploadFile method and returns its result array
     * @returns {Promise<Types.XHRUploadResponse[]>} uploaded files responses
     */
    async _uploadFiles() {
      const promises = Object.values(this.fileUploads).map(upload => upload.uploadFile)
      const res = []
      for (const promise of promises) {
        res.push(await promise())
      }
      return res
    },
    /**
     * Update specified uciData and initialForm. If key is provided, only specified key is updated.
     * @param {any[] | object} newData - data to override
     * @param {string} [key] - key to update.
     */
    updateUciData(newData, key) {
      const unreferenced = JSON.parse(JSON.stringify(newData))
      if (key) {
        this.uciData[key] = newData
        this.initialForm[key] = unreferenced
      } else {
        this.uciData = newData
        this.initialForm = unreferenced
      }
    }
  }
}
</script>
