<template>
  <template v-if="isVisible">
    <tlt-card
      v-if="title"
      v-show="show"
      ref="tlt-card"
      :section-name="dataKey"
      :title="title"
      :toggleable="toggleable"
      :help="help"
      :rawhtml="rawhtml"
      :active="active"
      title-space-between
      v-bind="$attrs"
    >
      <template #title-content>
        <slot name="title-content"></slot>
        <template v-if="globalSettingsForm">
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
      </template>
      <ListLayout
        v-if="section && loaded"
        gap="md"
        v-bind="$attrs"
      >
        <slot
          :s="section"
          :sd="dependForm"
        />
        <VuciSectionActions v-if="$slots.buttons">
          <template #buttons="slotProps">
            <slot
              name="buttons"
              v-bind="slotProps"
            />
          </template>
        </VuciSectionActions>
      </ListLayout>
    </tlt-card>
    <template v-else-if="section && loaded">
      <slot
        :s="section"
        :sd="dependForm"
      />
    </template>
    <vuci-edit-modal
      :open="globalSettingsForm && globalSettingsOpen"
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
import { formBus } from '@ui-core/vuci-form'
import { isArray } from '@ui-core/utils/inspect'
import { makeProps, noop } from '@ui-core/utils/props'
import formHelper from '@ui-core/utils/form-helper'

export default {
  name: 'VuciNamedSection',
  components: {
    VuciEditModal
  },
  mixins: [VuciSection],
  provide() {
    return {
      sectionName: this.sectionName,
      setSection: setterFn => setterFn(this.getSection(this.uciData, this.dataKey))
    }
  },
  inheritAttrs: false,
  props: makeProps({
    name: [String, ''],
    toggleable: [Boolean, true],
    help: [String, ''],
    add: [Function, noop]
  }),
  computed: {
    sectionType() {
      return 'named'
    },
    section() {
      return this.getSection(this.uciData, this.dataKey)
    },
    sectionName() {
      const entries = this.uciData[this.dataKey]
      return isArray(entries) && this.uciData[this.dataKey].length > 0 ? this.section?.[this.sectionId] || '' : ''
    }
  },

  created() {
    formBus.on('forms-applied-api', this._updateSection)
  },
  unmounted() {
    formBus.off('forms-applied-api', this._updateSection)
  },
  methods: {
    getSection(data, key) {
      const entries = data[key]
      if (!entries || !entries.length) return null
      return this._filterSections(data[key])
    },
    _filterSections(data) {
      if (this.endpoints[0].sectionFilter) return this.endpoints[0].sectionFilter(data, this)
      return formHelper.deepFind(data, section => section[this.sectionId] === this.name) || data[0]
    },
    getEndpoint(data) {
      return this.endpoints.find(endpoint => {
        return endpoint.sectionFilter ? data.some(endpoint.sectionFilter) : true
      }).endpoint
    },
    _updateSection() {
      this.$nextTick(() => {
        const form = Object.values(this.forms)?.[0]
        if (!form) return

        form.forEach(({ name, model }) => {
          this.dependForm[name] = model
        })
      })
    },
    getData() {
      if (this.uciData[this.dataKey] && this.uciData[this.dataKey].find(section => section[this.sectionId] === this.sectionName)) {
        return []
      }
      return [
        {
          endpoints: this.endpoints.map(endpoint => `/api/${endpoint.endpoint}/${this.sectionName}`),
          dataKey: this.dataKey
        }
      ]
    },

    /**
     * @returns {Promise<Types.MergeObject|Types.UciApiBulkRequest>
     */
    async saveData() {
      if (!this.isVisible) return { data: [] }
      const newSection = !!this.section['.new_section']
      delete this.section['.new_section']
      this.add(this.section)
      const dataToSave = [JSON.parse(JSON.stringify(this.section))]
      this.save(dataToSave)
      this.filterOptions(dataToSave)
      if (!newSection) delete dataToSave[0][this.sectionId]
      const key = this.vuciForm.bulkRequest ? 'endpoint' : 'url'
      const request = {
        method: newSection ? 'POST' : 'PUT',
        data: this.vuciForm.bulkRequest ? dataToSave[0] : { data: dataToSave[0] },
        [key]: newSection ? `/api/${this.endpoints[0].endpoint}` : `/api/${this.endpoints[0].endpoint}/${this.sectionName}`
      }
      /**
       * Return named section requests for bulk call in VuciForm component
       * if bulk-request prop is defined for VuciForm
       */
      await this.beforeSave([request])
      // If edit-multiple prop is defined, return request for multiple instances
      if (this.vuciForm.editMultiple?.length) {
        request[key] = `/api/${this.endpoints[0].endpoint}`
        request.data = { data: this.vuciForm.editMultiple.map(section => ({ ...request.data.data, id: section })) }
      }
      if (this.vuciForm.bulkRequest) return [request]
      try {
        request.awaitNetwork = this.awaitNetwork
        const res = await this.$axios(request)
        return this.getSavedData(res, this.dataKey)
      } catch (e) {
        throw this.handleError('edit', e.response)
      }
    },
    /**
     * Concats given responses and calls afterSave hook, then returs its result. If it's edit-multiple then it returns response of request (multiple instances)
     * @param {{success: boolean, data: any[]}[]} responses - array containing UCI section data
     * @param {string} dataKey - to which dataKey data should be assigned. defaults to section's dataKey.
     * @param {boolean} fromBulk - flag indicating wether saved result was from bulk request. defaults to false.
     * @returns {Promise<Types.MergeObject>}
     */
    async getSavedData(result, dataKey = this.dataKey, formBulk) {
      const res = formBulk ? result[0] : result
      await this.afterSave(this, this.vuciForm.editMultiple?.length ? result : res)
      return { data: { [dataKey]: [res.data] }, overwrite: true }
    },
    getModalProps(component = this.editForm, componentProps = this.editFormProps) {
      return {
        parent: this.title,
        data: {},
        innerComponent: component,
        editFormProps: componentProps,
        formMethods: { dataKey: this.dataKey }
      }
    }
  }
}
</script>
