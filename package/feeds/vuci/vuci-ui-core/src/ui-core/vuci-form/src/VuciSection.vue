<template>
  <tlt-card :title="title">
    <slot
      v-if="section"
      :s="section"
    />
  </tlt-card>
</template>

<script>
import { makeProps, noop } from '@ui-core/utils/props'
// eslint-disable-next-line
import * as Types from '@ui-core/types'
import { insertMapKey } from '@ui-core/vuci-form'

export default {
  inject: ['configName', 'vuciForm', 'emitTitle', 'loaded'],
  provide() {
    return {
      vuciSection: this
    }
  },
  props: makeProps({
    beforeSave: [Function, noop],
    columns: [Array, () => []],
    config: [String, null],
    title: [String, ''],
    editForm: [Object, null],
    active: [Boolean, true],
    uciData: [Object, () => ({})],
    dataKey: [String, null, true],
    // After save hook, used after save reuqest. Provides two arguments:
    // self - section component instance, response - response from API
    afterSave: [Function, noop],
    errorHandlers: [Object, null],
    // List of options that should NOT be filtered before sending request to API
    exceptionOptions: [Array, () => []],
    // Prop used as custom identifier for editable section instead of .name
    sectionId: [String, 'id'],
    endpoints: [Array, true],
    formMethods: [Array, ['create', 'edit', 'delete', 'get']],
    visible: [Boolean, true],
    /** Hides section with display: none */
    show: [Boolean, true],
    rawhtml: [Boolean, false],
    globalSettingsForm: [Object],
    globalSettingsProps: [Object, () => ({})]
  }),
  data() {
    return {
      /** @type {Record<string, Set<any>>} */
      forms: {},
      sid: this.$utils.getUniqueId(),
      defaultErrorHandlers: {
        get: () => this.$t('Failed to load data'),
        create: () => this.$t('Failed to create configuration'),
        edit: () => this.$t('Failed to edit configuration'),
        delete: () => this.$t('Failed to delete configuration')
      },
      isEditing: false,
      globalSettingsOpen: false,
      globalSettingsData: {}
    }
  },
  computed: {
    sectionType() {
      return ''
    },
    callMethod() {
      const methods = {
        create: this.formMethods.includes('create') ? this.createSection : () => ({ promises: Promise.resolve({ success: true }), createdSectionsNames: [] }),
        edit: this.formMethods.includes('edit') ? this.saveData : () => Promise.resolve({ data: {} }),
        delete: this.formMethods.includes('delete') ? this.delSection : () => Promise.resolve(),
        get: this.formMethods.includes('get') ? this.getData : () => {}
      }
      return methods
    },
    dependForm() {
      return this.section
    },
    availableOptions() {
      const options = []
      let keysFound = false
      Object.values(this.forms).forEach(form => {
        form.forEach(item => {
          keysFound = true
          if (!item.noWrite && !options.includes(item.name)) options.push(item.name)
        })
      })
      if (!keysFound) {
        options.push(...(this.columns?.map?.(columnData => columnData.name) || []))
      }
      return options
    },
    data() {
      if (this.uciData[this.dataKey]) {
        return this.uciData[this.dataKey]
      }
      return []
    },
    awaitNetwork() {
      return this.endpoints?.some(endpoint => endpoint.awaitNetwork) || false
    },
    isVisible() {
      return this.visible
    },
    isSaveable() {
      return this.formMethods.includes('edit')
    },
    exposedProperties() {
      // exposing only the properties that are used by vuciForm instead of whole instance
      return {
        sectionId: this.sectionId,
        load: this.load,
        saveable: this.isSaveable,
        formMethods: this.formMethods,
        updateAfterSave: this.updateAfterSave,
        validate: this.validate,
        callMethod: this.callMethod,
        dataKey: this.dataKey,
        getSavedData: this.getSavedData,
        handleError: this.handleError,
        visible: this.isVisible,
        awaitNetwork: this.awaitNetwork,
        isEditing: () => this.isEditing,
        invalidInputs: this.invalidInputs
      }
    },
    invalidInputs() {
      return Object.values(this.forms).flatMap(form => Array.from(form).filter(item => !item.valid))
    }
  },
  watch: {
    exposedProperties: {
      immediate: true,
      handler(newValue) {
        this.vuciForm.vuciSections[`${this.configName}_${this.sid}`] = newValue
      }
    }
  },
  mounted() {
    if (this.vuciForm.editing) {
      this.emitTitle(this.title)
    }
  },
  created() {
    if (!this.uciData[this.dataKey]) {
      this.uciData[this.dataKey] = []
    }
    insertMapKey(this.sectionId, this.dataKey)
  },
  unmounted() {
    delete this.vuciForm.vuciSections[`${this.configName}_${this.sid}`]
  },
  methods: {
    /**
     * @description forcefully reloads uciData for present sections in vuciForm.
     * @example IMPORTANT - it will reload data and overwrite current data in uciData[dataKey],
     * so if any additional data is attached to uciData[key] - it will not be present after reload.
     */
    async reloadData() {
      this.$spin()
      await this.vuciForm._loadData(true)
      this._syncForms()
      this.$spin(false)
    },
    /**
     * @description synchronises this.forms object keys with items that sets section values. This method should always be
     * called when section is deleted, changed it's position (because .name changes for unnamed sections and bad data is set during sections saving and etc.)
     */
    _syncForms() {
      const allItems = Object.values(this.forms).flatMap(form => Array.from(form))
      const newForms = {}
      allItems.forEach(component => {
        this.registerInput(component.sectionTarget, component, newForms)
      })
      this.forms = newForms
    },
    /**
     * @description assigns vuciItem to provided _target object. Creates object entry for sectionName if it is not present on _target object
     * @param {string} sectionName - form identifier. Might be dataSections identifier. basically property to which vuciItem compoent will be assigned in _target object
     * @param {import('vue').ComponentInstance} vuciItem - Vue component instance
     * @param {{[key:string]: Record<string, import('vue').ComponentInstance> }} _target - target object to which vuciItem will be assigned.
     */
    registerInput(sectionName, vuciItem, _target = this.forms) {
      if (!_target[sectionName]) _target[sectionName] = new Set()
      _target[sectionName].add(vuciItem)
    },
    unregisterInput(sectionName, vuciItem, _target = this.forms) {
      if (!_target[sectionName]) return

      _target[sectionName].delete(vuciItem)
      if (!_target[sectionName].size) {
        delete _target[sectionName]
      }
    },
    /**
     * Invokes all section input's validations
     * @returns {Promise<boolean>} resolves true if all input's validation returned true, false otherwise
     */
    async validate() {
      const promises = Object.values(this.forms).flatMap(form => Array.from(form).map(({ submit }) => submit()))
      const result = await Promise.all(promises)

      return !result.includes(false)
    },

    /**
     * @description invokes all REGISTERED form items _save function to corresponding UCISection.
     * There might be cases where data array is longer than form. that is because not visible forms are not registered to forms object.
     * @param {Types.UCISection[]} data - data that will be modified and sent to back-end
     */

    save(data) {
      // doing synchronisation only on save, to synchronise form item targets only on save
      this._syncForms()
      data.forEach(dataSection => {
        const id = dataSection[this.sectionId]
        const form = this.forms[id]
        // might be less registered forms than there is data sections.
        // situation occurs in some pages, also in pages where pagination is applied.
        if (!form) return
        Array.from(form).forEach(item => {
          const { name, uciSection, _save, showOption, changed } = item
          if (!(name in dataSection)) return
          const value = _save(dataSection)

          if (uciSection[`${name}:set`] === '1' && !changed) {
            delete dataSection[name]
          } else if (changed || showOption) {
            dataSection[name] = value
          }

          item.changed = false
        })
      })
    },
    /**
     * @description when invoked, function iterates through all registered form inputs
     * and calls their load function and assigns it's value to the input if it's not null
     */
    load() {
      Object.values(this.forms).forEach(form => {
        form.forEach(item => {
          const { load, uciSection, name } = item

          if (typeof load === 'function') {
            uciSection[name] = load(item)
          } else if (load) {
            uciSection[name] = load
          }
        })
      })
    },
    /**
     * @description Checks if objects in data array has any unallowed properties, if so, those properties are deleted from object.
     * @param {Object[]} data - array containg uci section objects
     */
    filterOptions(data) {
      const allowedKeys = [...this.availableOptions, ...this.exceptionOptions, this.sectionId, '.type']
      data.forEach(dataSection => {
        Object.keys(dataSection).forEach(key => !allowedKeys.includes(key) && delete dataSection[key])
      })
    },
    updateAfterSave() {
      if (this.dataSource) {
        this.dataSource = this.getDataSource()
      }
    },
    /**
     * @param {Types.FormActions} type - type of the error
     * @param {{type: string, payload: any[]}} error - action and data, which caused the error
     * @returns {string} message to address the error
     */
    handleError(type, error) {
      return this.errorHandlers && this.errorHandlers[type] ? this.errorHandlers[type](error) : this.defaultErrorHandlers[type]()
    },
    openGlobalSettingsModal() {
      this.globalSettingsData = this.getModalProps(this.globalSettingsForm, this.globalSettingsProps)
      this.globalSettingsOpen = true
    },
    /** Methods that are overriden in VuciNamed and Typed section implementations! */
    getData() {},
    createSection() {},
    delSection() {},
    saveData() {},
    getDataSource() {},
    getModalProps() {}
  }
}
</script>
