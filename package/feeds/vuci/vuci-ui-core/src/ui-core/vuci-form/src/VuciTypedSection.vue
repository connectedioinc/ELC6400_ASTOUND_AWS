<template>
  <template v-if="isVisible">
    <tlt-table
      v-if="columns.length > 0"
      :id="`${configName}_${type}_${dataKey}`"
      ref="tlt-table"
      :key="key"
      :show="show"
      :selected="selected"
      :section-name="dataKey"
      :title="title"
      :help="help"
      :active="active"
      :rawhtml="rawhtml"
      :columns="tableColumns"
      :row-actions="hasRowActions ? getRowActions : null"
      :no-value-text="noValueText"
      :data-source="loaded ? dataSource : []"
      :sortable="sortable"
      :pagination="pagination"
      :id-key="sectionId"
      :children-key="childrenKey"
      :table-actions="_tableActions"
      v-bind="$attrs"
      @data-change="_dataChange"
      @refresh="refresh"
      @update:selected="$emit('update:selected', $event)"
      @update:selected-row="$emit('update:selectedRow', $event)"
      @update:current-page="$emit('update:currentPage', $event)"
      @update:per-page="$emit('update:perPage', $event)"
    >
      <template
        v-for="(_, name) in $slots"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          :s="slotProps.record"
          :actions="sectionActions"
          v-bind="slotProps || {}"
        />
      </template>
      <template
        v-if="globalSettingsForm"
        #global-settings
      >
        <tlt-button
          :button-id="`global-${dataKey}`"
          :disabled="false"
          color="tertiary"
          icon-left="settings"
          class="ml-auto px-3! max-lg:hidden"
          @click="openGlobalSettingsModal"
        >
          <span>{{ $t('Global settings') }}</span>
        </tlt-button>
        <button
          type="button"
          class="lg:hidden rounded-full p-2 text-theme-text-primary bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover focus:outline-theme-border-strong"
          @click="openGlobalSettingsModal"
        >
          <tlt-icon
            icon="settings"
            class="size-5"
          />
        </button>
      </template>
      <template
        v-for="(c, index) in tableColumns.filter(c => c?.scopedSlots?.customHeader)"
        #[c.scopedSlots.customHeader]="{ column }"
      >
        <slot
          :name="c.scopedSlots.customHeader"
          :column="column"
        >
          <span
            :key="`${column.dataIndex}-${index}`"
            :class="{ required: column.required }"
          >
            {{ column.title }}
          </span>
        </slot>
      </template>
      <template
        v-for="c in tableColumns"
        #[c.dataIndex]="{ record }"
      >
        <slot
          v-if="record"
          :name="c.dataIndex"
          :s="record"
          :actions="sectionActions"
          :sd="dependForm[record[sectionId]] || {}"
        />
      </template>
      <template
        v-for="c in tableColumns.filter(c => $slots[`${c.dataIndex}-help`])"
        #[`${c.dataIndex}-help`]
      >
        <slot :name="`${c.dataIndex}-help`" />
      </template>
      <template
        v-for="col in tableColumns.filter(c => c.actions && c.actions.filter && c.actions.filter.slotName)"
        #[col.actions.filter.slotName]="{ option }"
      >
        <slot
          :name="col.actions.filter.slotName"
          :option="option"
        />
      </template>
      <template
        v-if="$slots.unfolded"
        #unfolded="{ record }"
      >
        <slot
          name="unfolded"
          :s="record"
        />
      </template>
      <template #after>
        <VuciSectionActions
          v-if="formMethods.includes('create') && !Object.keys(addModel).length"
          class="mt-6"
          :actions="sectionActions"
        >
          <template #buttons="slotProps">
            <slot
              name="buttons"
              v-bind="slotProps"
            />
          </template>
          <template #action-design="slotProps">
            <slot
              name="action-design"
              v-bind="slotProps"
            />
          </template>
        </VuciSectionActions>
      </template>
      <template
        v-if="!loaded"
        #emptySection
      >
        <Empty />
      </template>
    </tlt-table>
    <tlt-card
      v-else-if="title"
      v-show="show"
      :section-name="dataKey"
      :title="title"
      :help="help"
      :active="active"
      :rawhtml="rawhtml"
      title-space-between
      v-bind="$attrs"
    >
      <template #title-content>
        <div class="flex gap-2 flex-wrap">
          <template v-if="globalSettingsForm">
            <tlt-button
              ref="globalSettingsButton"
              :button-id="`global-${dataKey}`"
              :disabled="false"
              color="tertiary"
              icon-left="settings"
              class="ml-auto px-3! max-lg:hidden"
              @click="openGlobalSettingsModal"
            >
              <span>{{ $t('Global settings') }}</span>
            </tlt-button>
            <button
              type="button"
              class="lg:hidden rounded-full p-2 text-theme-text-primary bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover focus:outline-theme-border-strong"
              @click="openGlobalSettingsModal"
            >
              <tlt-icon
                icon="settings"
                class="size-5"
              />
            </button>
          </template>
          <slot name="search">
            <tlt-search-form
              v-if="searchable"
              class="max-lg:order-first"
              @submit="$emit('search', $event)"
              @clear="$emit('search', '')"
            />
          </slot>
          <slot name="title-content" />
        </div>
      </template>
      <template
        v-if="$slots.help"
        #help
      >
        <slot name="help" />
      </template>
      <div>
        <div
          v-if="$slots.before"
          class="mb-2"
        >
          <slot name="before" />
        </div>
        <slot
          :data-source="dataSource"
          :actions="sectionActions"
        />
        <tlt-dnd
          v-if="dataSource.length > 0"
          v-slot="{ items, startDrag, swapNext, swapPrev }"
          :items="dataSource"
          :data-key="sectionId"
          restrict-to-container
          drag-class="shadow-lg"
          @drag-end="items => $emit('drag-end', items)"
        >
          <template
            v-for="(item, index) of items"
            :key="item[sectionId]"
          >
            <slot
              name="custom-design"
              :s="item"
              :index="index"
              :actions="{
                ...sectionActions,
                startDrag: event => startDrag(event, index),
                swapNext: () => swapNext(index),
                swapPrev: () => swapPrev(index)
              }"
            />
          </template>
        </tlt-dnd>
        <div v-else-if="loaded">
          {{ emptySectionText }}
        </div>
        <VuciSectionActions
          v-if="formMethods.includes('create') && !Object.keys(addModel).length"
          class="mt-8"
          :actions="sectionActions"
        >
          <template #buttons="slotProps">
            <slot
              name="buttons"
              v-bind="slotProps"
            />
          </template>
          <template #action-design="slotProps">
            <slot
              name="action-design"
              v-bind="slotProps"
            />
          </template>
        </VuciSectionActions>
      </div>
    </tlt-card>
    <template v-else>
      <slot
        :data-source="dataSource"
        :actions="sectionActions"
      />
      <VuciSectionActions
        v-if="formMethods.includes('create') && !Object.keys(addModel).length"
        class="mt-4"
        :actions="sectionActions"
      >
        <template #buttons="slotProps">
          <slot
            name="buttons"
            v-bind="slotProps"
          />
        </template>
        <template #action-design="slotProps">
          <slot
            name="action-design"
            v-bind="slotProps"
          />
        </template>
      </VuciSectionActions>
    </template>
    <template v-if="formMethods.includes('create') || editForm">
      <vuci-edit-modal
        ref="edit-modal"
        :open="editOpen"
        v-bind="modalData"
        :uci-data="JSON.parse(JSON.stringify(vuciForm.uciData))"
        :size="modalSize"
        @close="_closeEdit"
      />
    </template>
    <tlt-form
      v-if="formMethods.includes('create') && ($slots.addForm || Object.keys(addModel).length)"
      ref="add-form"
      :show="show"
      :model="addModel"
      :sid="`${configName}_${type}_${title}_addForm`"
      :title="addSectionTitle"
      inline
      add-form
    >
      <slot
        name="addForm"
        :add-model="addModel"
      />
      <VuciSectionActions
        v-if="Object.keys(addModel).length"
        class="mt-auto"
        :actions="sectionActions"
      >
        <template #buttons="slotProps">
          <slot
            name="buttons"
            v-bind="slotProps"
          />
        </template>
        <template #action-design="slotProps">
          <slot
            name="action-design"
            v-bind="slotProps"
          />
        </template>
      </VuciSectionActions>
    </tlt-form>
    <vuci-edit-modal
      v-if="globalSettingsForm"
      :open="globalSettingsOpen"
      v-bind="globalSettingsData"
      :uci-data="JSON.parse(JSON.stringify(uciData))"
      @close="globalSettingsOpen = false"
    />
  </template>
</template>

<script>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Types from '@ui-core/types'
import VuciSection from './VuciSection.vue'
import VuciEditModal from './VuciEditModal.vue'
import formHelper from '@ui-core/utils/form-helper'
import { checkDuplicates, sortCollection, toChunks, getContentLength } from '@ui-core/plugins/helper'
import { formBus } from '@ui-core/vuci-form'
import { makeProps, noop } from '@ui-core/utils/props'
import { copy } from '@ui-core/utils/vue-helpers'
import { isFunction, isString } from '@ui-core/utils/inspect'
import Empty from '@ui-core/components/layout/Empty.vue'

export default {
  name: 'VuciTypedSection',
  components: {
    VuciEditModal,
    Empty
  },
  mixins: [VuciSection],
  inject: {
    setUciData: {
      default: () => {}
    },
    loadData: {
      default: () => {}
    }
  },
  provide() {
    return {
      editableSection: () => this.editableSection,
      setSection: setterFn => setterFn(this.editableSection),
      currentSections: () => this.dataSource,
      noValidate: () => this.noValidate
    }
  },
  props: makeProps({
    afterAdd: [Function, noop],
    restrictedValues: [Array, () => []],
    sortBy: [String],
    searchable: [Boolean, false],
    pagination: [Boolean, false],
    editForm: [Object],
    editFormProps: [Object, () => ({})],
    type: [String, ''],
    columns: [Array, () => []],
    rowActions: [[Object, Function]],
    tableActions: [Object],
    selected: [Array],
    add: [Function, noop],
    sortable: [Boolean, false],
    addTitle: [String],
    noValueText: [String],
    help: [String],
    customEditButton: [Boolean, false],
    customButtons: [Boolean, false],
    // Prevents edit modal opening when creating new section
    noEditAfterCreate: [Boolean, false],
    // Hook that is executed AFTER removing an entry from the table
    // but BEFORE sending a DELETE request
    afterDelete: [Function, noop],
    beforeAdd: [Function, () => {}],
    addValidate: [Function, () => ({ valid: true })],
    childrenKey: [String, '_children']
  }),
  emits: ['action', 'drag-end', 'drag-change', 'edit-modal-closed', 'page-change', 'refresh', 'search', 'update:selected', 'update:perPage', 'update:currentPage', 'update:selectedRow'],
  data() {
    return {
      addModel: {},
      editOpen: false,
      key: 1,
      sections: [],
      editableSection: Object(),
      deletableSections: [],
      dataSource: [],
      addableSections: [],
      initialAddForm: {},
      modalData: {},
      uniqueId: this.$utils.getUniqueId(),
      modalSize: 'big',
      noValidate: false
    }
  },
  computed: {
    sectionType() {
      return 'typed'
    },
    emptySectionText() {
      return this.noValueText || this.$t('This section contains no values yet')
    },
    addSectionTitle() {
      if (Object.keys(this.addModel).length > 0) {
        return this.addTitle || this.$t('Add new instance')
      }
      return ''
    },
    dependForm() {
      return this.dataSource
    },
    tableColumns() {
      return this.columns.map(c => {
        const column = {
          dataIndex: c.name || c.dataIndex,
          title: c.label,
          help: c.help,
          width: c.width,
          scopedSlots: {
            customHeader: c.scopedSlots?.customHeader || `${c.dataIndex}-header`
          },
          rawhtml: c.rawhtml,
          actions: c.actions || null,
          displayFn: c.displayFn,
          required: c.required || false,
          show: c.show ?? true,
          hidden: c.hidden ?? false,
          locked: c.locked ?? false
        }
        Object.keys(column).forEach(key => column[key] === undefined && delete column[key])
        return column
      })
    },
    _tableActions() {
      const actions = this.tableActions ?? ['refresh', 'column-list', 'search']
      if (this.globalSettingsForm) actions.push('global-settings')
      return actions
    },
    hasRowActions() {
      return this.rowActions || this.editForm || this.formMethods.includes('delete')
    },
    sectionActions() {
      return {
        create: this._addSection,
        edit: this._openEdit,
        delete: this.delSection
      }
    }
  },
  watch: {
    data: {
      deep: true,
      immediate: true,
      handler() {
        this.dataSource = this.getDataSource()
      }
    }
  },
  async created() {
    this.sections.forEach(s => {
      this.dataSource[s[this.sectionId]] = {}
    })
  },
  mounted() {
    this.initialAddForm = copy(this.addModel)
  },
  methods: {
    getRowActions(record) {
      const predefinedActions = {
        edit: {
          id: 'edit',
          label: this.$store.readOnlyPage ? this.$t('View') : this.$t('Edit'),
          buttonProps: {
            iconLeft: this.$store.readOnlyPage ? 'password' : 'edit',
            disabled: false
          },
          callback: record => this._openEdit(record[this.sectionId])
        },
        delete: {
          id: 'delete',
          label: this.$t('Delete'),
          buttonProps: { color: 'error' },
          callback: record => this.delSection(record[this.sectionId])
        }
      }
      const _actions = (isFunction(this.rowActions) ? this.rowActions(record) : this.rowActions) ?? ['edit', 'delete']
      const hasEdit = !!this.editForm
      const hasDelete = this.formMethods.some(m => m === 'delete')
      if (!_actions?.length) return
      const actions = _actions
        .filter(action => {
          const _action = action?.id || action
          if (_action === 'edit' && !hasEdit) return false
          if (_action === 'delete' && !hasDelete) return false
          return !!_action
        })
        .map(action => {
          if (isString(action)) return action in predefinedActions ? predefinedActions[action] : action
          else if (action.id in predefinedActions)
            return {
              ...predefinedActions[action.id],
              ...action,
              buttonProps: {
                ...predefinedActions[action.id].buttonProps,
                ...action.buttonProps
              }
            }
          return action
        })
        .filter(Boolean)
      return actions.length > 0 ? actions : null
    },
    getModalProps(component = this.editForm, componentProps = this.editFormProps, dataKey = this.dataKey) {
      return {
        parent: this.title,
        restrictedValues: this.restrictedValues,
        data: this.editableSection,
        innerComponent: component,
        editFormProps: componentProps,
        formMethods: {
          dataKey,
          validate: this.vuciForm.validate,
          saveData: this.vuciForm.saveData,
          vuciSections: { ...this.vuciForm.vuciSections },
          editableSection: this.editableSection[this.sectionId],
          deletableData: [...this.deletableSections],
          initialForm: this.vuciForm.initialForm,
          sectionId: this.sectionId
        }
      }
    },
    getModalPropsByType(type = 'edit') {
      const modals = {
        edit: this.getModalProps(this.editForm?.onEdit || this.editForm),
        add: this.getModalProps(this.editForm?.onAdd || this.editForm),
        global: this.getModalProps(this.globalSettingsForm, this.globalSettingsProps)
      }
      return modals[type]
    },
    _transitionBind(index) {
      const transitionBind = {
        id: 'section',
        ref: 'interfaceTable',
        name: 'swap-list',
        tag: 'div',
        style: 'position: relative'
      }
      return this.sortable ? transitionBind : { key: index }
    },
    _dataChange(values) {
      if (!this.sortBy) throw new Error('[VuciTypedSecion] No property to sortBy was given, but sortable prop is set to true')
      values.forEach((value, index) => {
        value[this.sortBy] = `${index + 1}`
      })
      this.setUciData(uciData => (uciData[this.dataKey] = values))
      this.$emit('drag-change', this.uciData[this.dataKey])
    },
    /**
     * endpoints according to provided section filters will be assigned for given data
     * @param {any[]} data - array containing UCI sections
     * @returns {{endpoint: string, data: any[]}[]} - array of objects containing endpoint & data that will be sent to that endpoint
     */
    _groupSections(data) {
      return this.endpoints.map(endpoint => ({
        endpoint: endpoint.endpoint,
        data: endpoint.sectionFilter ? data.filter((section, index) => endpoint.sectionFilter(section, index, this)) : data.filter(section => section['.type'] === this.type)
      }))
    },
    /**
     * Gets endpoint for provided data
     * @param {any[]} - array with UCI sections
     * @returns {string} endpoint string
     */
    getEndpoint(data) {
      if (this.endpoints.length === 1) return this.endpoints[0].endpoint
      return this.endpoints.find(endpoint => (endpoint.sectionFilter ? data.some((section, index) => endpoint.sectionFilter(section, index, this)) : true)).endpoint
    },
    _duplicatesErrorMsg() {
      const errorMsg = []
      const duplicateNames = checkDuplicates(this.restrictedValues, this.dataSource, this.addModel)
      const valueNamesWithLabel = []
      if (duplicateNames.length !== 0) {
        this.columns.forEach(colUnit => {
          if (duplicateNames.includes(colUnit.name)) {
            valueNamesWithLabel.push(colUnit.name)
            errorMsg.push(colUnit.label)
          }
        })
        errorMsg.push(...duplicateNames.filter(dvnUnit => !valueNamesWithLabel.includes(dvnUnit)))
      }
      return errorMsg.length !== 0 ? errorMsg : false
    },
    getData() {
      if (this.vuciForm.editing) {
        return []
      }
      const formatEndpoints = (endpoints, dataKey) => {
        return {
          endpoints: endpoints.map(endpoint => `/api/${endpoint.endpoint}`),
          dataKey
        }
      }
      const data = [formatEndpoints(this.endpoints, this.dataKey)]
      return data
    },
    createSection() {
      const promise = new Promise(resolve => resolve({ success: true }))
      if (this.editForm || this.addableSections.length < 1) return { promises: promise, createdSectionsNames: [] }
      const promises = []
      const newSectionsNames = []
      this.addableSections.forEach((section, index) => {
        newSectionsNames.push({
          sectionName: section[this.sectionId],
          index: index++
        })
        // Removing temporary names from data that will be send to endpoint
        // TODO: change checking so only temporary names would be deleted, atm it deletes names that starts with 'new'
        const editedSection = Object.assign({}, section)
        if (editedSection[this.sectionId].startsWith('new')) {
          delete editedSection[this.sectionId]
        }
        promises.push(
          this.$axios.post(`/api/${this.endpoint}`, {
            data: editedSection,
            awaitNetwork: this.awaitNetwork
          })
        )
      })
      this.addableSections = []
      return {
        promises: Promise.all(promises),
        createdSectionsNames: newSectionsNames
      }
    },
    /**
     * Gets and formats PUT requests for given section data that will be send to backend
     * @param {any[]} data - UCI section data array
     * @returns {Types.UciApiBulkRequest<unknown>[]} formatted requests
     */
    _gatherRequests(data) {
      const groupedSections = this._groupSections(data)
      return groupedSections.map(section => ({
        method: 'PUT',
        endpoint: `/api/${section.endpoint}`,
        data: section.data
      }))
    },
    /**
     * function returns either gathered requests if its a bulk request,
     * or executes those requests itself and returns mergeable uci object
     * @returns {Promise<Types.UciApiBulkRequest<unknown>[]|Types.MergeObject>}
     */
    async saveData() {
      if (!this.isVisible) return { data: [] }
      const dataToSave = copy(this.dataSource.filter(section => section[this.sectionId] !== this.editableSection[this.sectionId]))
      /**
       * Return typed section requests for bulk call in VuciForm component
       * if bulk-request prop is defined for VuciForm
       */
      const requests = this._gatherRequests(dataToSave)
      this.save(dataToSave)
      this.filterOptions(dataToSave)
      const { promises, createdSectionsNames } = this.createSection()
      const res = await promises.catch(() => false)
      if (!res) return { data: [] }
      createdSectionsNames.forEach(section => {
        const response = res[section.index]
        if (!response.success) {
          throw this.$t('Configuration create failed')
        }
        // TODO: check maybe we can should only change in one place
        const changedElement = dataToSave.find(element => element[this.sectionId] === section.sectionName)
        changedElement[this.sectionId] = response.data[this.sectionId]
        const changedElement2 = this.uciData[this.dataKey].find(element => element[this.sectionId] === section.sectionName)
        changedElement2[this.sectionId] = response.data[this.sectionId]
      })
      await this.beforeSave(requests)
      if (this.vuciForm.bulkRequest) return requests
      const contentLength = getContentLength(requests)
      const maxKB = 70
      if (contentLength >= maxKB) {
        const chunkCount = Math.ceil(contentLength / maxKB)
        const responses = []
        // simple for is used, because awaiting of each bulk request result is needed
        for (const block of requests) {
          const chunks = block.data.length > 1 ? toChunks(block.data, { chunkCount }) : [block.data]
          const newRequests = chunks.map(chunk => ({
            endpoint: block.endpoint,
            method: block.method,
            data: chunk
          }))
          for (const request of newRequests) {
            try {
              const data = await this.sendBulkRequests('edit', [request])
              responses.push(...data)
            } catch (e) {
              throw isString(e) ? e : this.$t('An unexpected error occurred')
            }
          }
        }
        return this.getSavedData(responses, this.dataKey)
      }
      try {
        const responses = await this.sendBulkRequests('edit', requests)
        return this.getSavedData(responses, this.dataKey)
      } catch (e) {
        throw isString(e) ? e : this.$t('An unexpected error occurred')
      }
    },
    /**
     *
     * @param {'edit'|'delete'|'get'} type
     * @param {any[]} data
     */
    sendBulkRequests(type, requests) {
      return this.$axios.bulk(requests, { awaitNetwork: this.awaitNetwork }).then(responses => {
        const errorObject = {
          type,
          payload: responses.filter(r => !r.success)
        }
        if (errorObject.payload.length > 0) {
          throw this.handleError(type, errorObject)
        }
        return responses
      })
    },
    /**
     * Concats given responses and calls afterSave hook, then returs its result
     * @param {{success: boolean, data: any[]}[]} responses - array containing UCI section data
     * @returns {Promise<{data: { [string]: any[] }}>}
     */
    async getSavedData(responses, dataKey) {
      const allData = responses.reduce((data, current) => data.concat(current.data), [])
      const modifiedAllData = await this.afterSave(this, responses, allData)
      const targetData = Array.isArray(modifiedAllData) ? modifiedAllData : allData
      return { data: { [dataKey]: targetData } }
    },
    delSection(sid) {
      this.$prompt.show({
        title: this.$t('Delete this configuration?'),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          const groupedSections = this._groupSections(this.data)
          const found = groupedSections.find(group => formHelper.deepFind(group.data, section => section[this.sectionId] === sid))
          // TODO: Remove this snippet when full API is released
          this.$spin(this.$t('Deleting configuration'))
          this.$axios
            .delete(`/api/${found.endpoint}`, {
              data: {
                data: [sid]
              },
              awaitNetwork: this.awaitNetwork
            })
            .then(() => {
              const deletableSection = formHelper.deepFind(this.uciData[this.dataKey], section => section[this.sectionId] === sid)
              this.afterDelete(deletableSection, this.uciData, this)
              // Removing sections that use api components doesn't affect
              // uci state and because of that manual uci state reload is
              // required for some non-api pages for state changes to take effect
              this.uciData[this.dataKey] = formHelper.deepFilter(this.uciData[this.dataKey], section => section[this.sectionId] !== sid)
              formHelper.decrementSections(this.vuciForm.uciData[this.dataKey], sid, this.sectionId)
              this.vuciForm.initialForm[this.dataKey] = JSON.parse(JSON.stringify(this.vuciForm.uciData[this.dataKey]))
              delete this.forms[sid]
              this._syncForms()
              formBus.emit('delete-section', {
                sid,
                dataKey: this.dataKey,
                section: deletableSection,
                idKey: this.sectionId
              }) // TODO: Remove after full API support is released
              this.$message.success(this.$t('Configuration has been removed'))
            })
            .catch(e => {
              this.$message.error(this.handleError('delete', e.response))
            })
            .finally(() => {
              this.$spin(false)
            })
        }
      })
    },

    /**
     * searches given validation object for invalid response. If found, that response is returned
     * @param {{valid: boolean, message?: string}[]} validationObject array containing validation result objects
     * @returns {{valid: boolean, message?: string}} message property is returned if invalid response was found
     */
    _parseAddValidation(validationObject) {
      const invalidObject = validationObject.find(val => !val.valid)
      if (invalidObject) return invalidObject
      return { valid: true }
    },
    async _addSection() {
      const duplicates = this._duplicatesErrorMsg()
      if (duplicates) return this.$message.error(duplicates.length > 0 ? this.$t('Duplicate fields found: %s').format(duplicates.join(', ')) : this.$message.error(this.$t('Some fields are invalid')))
      const addFormRef = this.$refs['add-form']
      const addedSection = addFormRef?.getData() ?? {}
      this.beforeAdd(addedSection)
      const validatePromises = [this.formLoadingPromise().then(() => ({ valid: true })), this.addValidate(addedSection, this.dataSource)]
      if (addFormRef) validatePromises.push(addFormRef.validate(true))
      Promise.all(validatePromises)
        .then(async res => {
          const parsedValidation = this._parseAddValidation(res)
          if (!parsedValidation.valid) {
            return Promise.reject(parsedValidation.message)
          }
          this.$spin()
          if (!this.editForm) {
            addedSection['.type'] = this.type
            if (!Object.keys(addedSection).includes(this.sectionId)) {
              addedSection[this.sectionId] = formHelper.createSID(this.vuciForm.uciData[this.dataKey])
            }
          }
          await this.add(addedSection, this)
          this._createSectionTempLogic(addedSection)
            .then(async res => {
              await this.afterAdd(addedSection, res, this)
              formBus.emit('update-initial-form', {
                dataKey: this.dataKey,
                data: res.uciData[this.dataKey]
              })
              this.vuciForm.updateUciData(res.uciData)
              this._resetAddForm()
              if (this.noEditAfterCreate) {
                return
              }
              if (this.editForm) this._openEdit(res.newSection[this.sectionId], null, 'add')
            })
            .catch(e => {
              this.$message.error(e)
            })
            .finally(() => {
              this.$spin(false)
            })
        })
        .catch(e => {
          this.$message.error(e)
        })
    },
    // TODO: Remove this snippet when full API is released
    _createSectionTempLogic(section) {
      return new Promise((resolve, reject) => {
        const dataToSave = [JSON.parse(JSON.stringify(section))]
        const endpoint = this.getEndpoint(dataToSave)
        this.$axios({
          method: 'post',
          url: `/api/${endpoint}`,
          data: {
            data: dataToSave[0]
          },
          awaitNetwork: this.awaitNetwork
        })
          .then(res => {
            if (!res.success) {
              reject(this.handleError('create', res))
            }
            const resData = { [this.dataKey]: [res.data] }
            resolve({
              uciData: {
                ...formHelper.mergeSections(this.uciData, resData, {
                  identifier: this.sectionId
                })
              },
              newSection: res.data
            })
          })
          .catch(e => {
            if (e.response.status === 422 && e.response.data.errors[0].code === 109) {
              reject(this.$t('Name already used for a configuration'))
            } else {
              reject(this.handleError('create', e.response))
            }
          })
      })
    },
    // end of snippet
    async _openEdit(name, addNew, modal = 'edit') {
      if (this.editOpen) return

      const promises = [this.formLoadingPromise()]
      const res = await Promise.all(promises)

      if (res.includes(false)) return this.$message.error(this.$t('Some fields are invalid'))

      if (addNew) {
        this.adding = true
        this.editableSection = JSON.parse(JSON.stringify(this.addModel))
        this.editableSection['.type'] = this.addModel['.type'] ? this.addModel['.type'] : this.type

        if (!Object.keys(this.editableSection).includes(this.sectionId)) {
          this.editableSection[this.sectionId] = formHelper.createSID(this.vuciForm.uciData[this.dataKey])
        }

        this.editableSection['.new_section'] = true
        this.vuciForm.uciData[this.dataKey].push(this.editableSection)
      } else {
        const editableSection = formHelper.deepFind(this.uciData[this.dataKey], section => section[this.sectionId] === name)
        if (editableSection != null) {
          this.editableSection = JSON.parse(JSON.stringify(editableSection))
        }
      }

      this.modalData = this.getModalPropsByType(modal)
      this.emitTitle(this.title)

      this.editOpen = true
    },
    async _closeEdit(data) {
      this.editOpen = false
      this.editableSection = { empty: true }
      this.vuciForm.updateUciData(data)
      this.$emit('edit-modal-closed', data)
      this._resetAddForm()
      this.dataSource = this.getDataSource()
    },
    getDataSource() {
      if (!this.data || this.data.length < 1) return []
      const group = this._groupSections(this.data)
      let allData = group.reduce((data, current) => data.concat(current.data), []).filter(section => !section['.new_section'])
      if (this.sortBy) {
        allData = sortCollection(allData, this.sortBy)
      }
      return allData
    },
    _skipValidation() {
      this.noValidate = true
      this.$nextTick(() => {
        this.noValidate = false
      })
    },
    _resetAddForm() {
      this.addModel = copy(this.initialAddForm)
      this._skipValidation()
    },
    /**
     * Returns a promise that resolves when the form is no longer loading.
     * Useful when you need to wait for the form to finish loading before doing something else.
     * For example, preventing edit modal from opening until the form is done loading.
     */
    formLoadingPromise() {
      if (!this.$store.formLoading) return Promise.resolve()
      return new Promise(resolve => {
        this.$spin(this.$t('Loading'))
        const unwatch = this.$watch(
          () => this.$store.formLoading,
          value => {
            if (value) return
            this.$spin(false)
            unwatch()
            resolve(void 0)
          }
        )
      })
    },
    refresh() {
      this.loadData(true)
      this.$emit('refresh')
    }
  }
}
</script>

<style scoped>
.required::after {
  font-weight: 600;
  color: var(--color-theme-text-danger);
  content: ' *';
}
</style>
