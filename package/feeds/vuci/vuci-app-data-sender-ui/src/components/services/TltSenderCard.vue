<template>
  <div>
    <tlt-horizontal-card
      :test-id="`rowCard-${section.id}`"
      :class="{ 'rounded-b-none!': cardStates?.[section.id] }"
    >
      <card-cell>
        <cell-row :label="$t('Collection name')">
          <template #value>
            <div class="text-theme-text-primary font-semibold">
              <tlt-dummy-value :value="section.name" />
            </div>
          </template>
        </cell-row>
      </card-cell>
      <card-cell>
        <cell-row :label="$t('Server type')">
          <template #value>
            <div class="flex gap-1">
              <span>{{ translateOutput || '-' }}</span>
              <div
                v-if="!includesPlugin(findOutput?.plugin, 'output')"
                ref="warning_server"
              >
                <tlt-icon
                  icon="error"
                  class="text-theme-text-danger size-5"
                />
              </div>
            </div>
            <tlt-popover
              v-if="!includesPlugin(findOutput?.plugin, 'output')"
              :target="() => $refs.warning_server"
              :content="getPackageErrorMessage(findOutput?.plugin, 'output')"
              placement="bottom-start"
            />
          </template>
        </cell-row>
      </card-cell>
      <card-cell>
        <cell-row :label="$t('Enabled')">
          <template #value>
            <div class="lg:min-w-max">
              <slot name="enable" />
            </div>
          </template>
        </cell-row>
      </card-cell>
      <action-cell>
        <cell-row :label="$t('Collection actions')">
          <template #value>
            <div class="lg:min-w-max">
              <slot name="actions" />
            </div>
          </template>
        </cell-row>
      </action-cell>
      <action-cell>
        <slot name="dropdown" />
      </action-cell>
    </tlt-horizontal-card>
    <tlt-collapse-transition>
      <div
        v-show="cardStates?.[section.id]"
        :key="section.id"
        class="border-t-0 border overflow-clip"
        :class="section && 'rounded-bl-md rounded-br-md'"
      >
        <vuci-typed-section
          :uci-data="uciData"
          :endpoints="[{ endpoint: `data_to_server/collections/${section.id}/data/config`, sectionFilter: s => filterSectionData(s, section) }]"
          data-key="inputs"
          type="plugin"
          :edit-form="editModal"
          :after-add="afterAdd"
          :after-delete="afterDelete"
          :form-methods="['edit', 'get']"
          :error-handlers="{ edit: handleEditError }"
          :edit-form-props="{ tltCardUciData: uciData }"
          @edit-modal-closed="modalClosed"
        >
          <template #default="{ dataSource, actions }">
            <tlt-table
              :id="`data-sender-table-${section.id}`"
              class="data-sender-table border-t -m-px"
              :columns="tableColumns"
              :data-source="dataSource"
            >
              <template #plugin="{ record }">
                <div class="flex gap-1">
                  <tlt-dummy-value :value="translateInput(record.plugin)" />
                  <tlt-hint
                    v-if="!includesPlugin(record.plugin, 'input')"
                    :hints="[{ info: getPackageErrorMessage(record.plugin, 'input') }]"
                  >
                    <tlt-icon
                      icon="error"
                      class="text-theme-text-danger"
                    />
                  </tlt-hint>
                </div>
              </template>
              <template #enabled="{ record }">
                <vuci-form-item-switch
                  :uci-section="record"
                  name="enabled"
                  :readonly="!record.plugin"
                />
              </template>
              <template #actions="{ record }">
                <vuci-form-edit-delete
                  :id="record.id"
                  class="lg:min-w-max"
                  :actions="actions"
                >
                  <template #delete="{ delSection }">
                    <tlt-popover
                      v-if="section?.input.length === 1"
                      :target="() => $refs[`delete_${record?.id}`]"
                      placement="bottom-end"
                      :content="$t('At least one input is required for configuration to be valid')"
                    />
                    <div :ref="`delete_${record?.id}`">
                      <tlt-button
                        button-id="delete"
                        type="text"
                        color="error"
                        size="md"
                        :readonly="section?.input.length === 1"
                        @click="delSection(record.id)"
                      >
                        {{ $t('Delete') }}
                      </tlt-button>
                    </div>
                  </template>
                </vuci-form-edit-delete>
              </template>
              <template #add_action>
                <div ref="addBtn">
                  <tlt-button
                    button-id="add"
                    type="text"
                    :readonly="inputAddReadOnly"
                    @click="actions.create"
                  >
                    <tlt-icon
                      icon="add-circle"
                      class="size-5"
                      :solid="false"
                    />
                    {{ $t('Add new') }}
                  </tlt-button>
                </div>
                <tlt-tooltip
                  v-if="inputAddReadOnly"
                  :target="() => $refs.addBtn"
                >
                  {{ $t('Only a total of %s data inputs can be created for each collection instance').format(limitData().max_inputs) }}
                </tlt-tooltip>
              </template>
            </tlt-table>
          </template>
        </vuci-typed-section>
      </div>
    </tlt-collapse-transition>
  </div>
</template>
<script>
import { markRaw } from 'vue'
import EditForm from '../../views/services/InputEdit.vue'
import { formBus } from '@ui-core/vuci-form'

export default {
  inject: ['limitData', 'inputOptions', 'outputOptions'],
  provide() {
    return {
      collectionSection: () => this.section
    }
  },
  props: {
    uciData: {
      type: Object,
      required: true
    },
    section: {
      type: Object,
      required: true
    },
    cardStates: {
      type: Object,
      required: true
    }
  },
  emits: ['update-card-ids'],
  data() {
    return {
      editModal: markRaw(EditForm),
      tableColumns: [
        {
          title: this.$t('Data input name'),
          dataIndex: 'name',
          actions: { sort: true }
        },
        {
          title: this.$t('Data input type'),
          dataIndex: 'plugin',
          actions: { filter: { type: 'uniqueValues' } },
          displayFn: (_, record) => this.translateInput(record?.plugin)
        },
        {
          title: this.$t('Format type'),
          dataIndex: 'format',
          actions: { filter: { type: 'uniqueValues' } },
          displayFn: (_, record) => this.$dataSenderParameters.formatTranslate()[record?.format] || '-'
        },
        {
          title: this.$t('Enabled'),
          dataIndex: 'enabled'
        },
        {
          title: this.$t('Manage actions'),
          dataIndex: 'actions'
        },
        {
          dataIndex: 'add',
          scopedSlots: { customHeader: 'add_action' },
          displayInMobileHeader: true
        }
      ]
    }
  },
  computed: {
    findOutput() {
      return this.uciData?.outputs?.find(output => this.section?.output && this.section.output === output.id)
    },
    translateOutput() {
      return this.$dataSenderParameters.outputPluginTranslate()[this.findOutput?.plugin] || '-'
    },
    inputAddReadOnly() {
      return this.section.input?.length >= this.limitData().max_inputs
    }
  },
  methods: {
    handleEditError(errors) {
      const erroredSectionIds = [
        ...new Set(
          errors.payload
            ?.flatMap(errors => errors.errors)
            .filter(error => error.code === 103)
            .map(error => error.section)
        )
      ]
      const erroredSectionNames = this.uciData.inputs.filter(input => erroredSectionIds.includes(input.id)).map(input => input.name)
      if (erroredSectionNames.length) {
        return this.$t('Configuration(s) (%s) is missing required options.').format(erroredSectionNames.join(', '))
      }
    },
    inputColumns(input) {
      return {
        item: input,
        columns: [[{ customRender: 'data_type' }, { label: this.$t('Format type'), value: this.$dataSenderParameters.formatTranslate()[input?.format] || '-' }]]
      }
    },
    translateInput(input) {
      const inputTranslate = this.$dataSenderParameters.inputPluginTranslate()
      return (inputTranslate[input?.plugin] ?? inputTranslate[input]) || '-'
    },
    includesPlugin(plugin, pluginType) {
      const availablePlugins = pluginType === 'output' ? this.outputOptions() : this.inputOptions()
      if (pluginType === 'output' && !this.findOutput?.plugin) return true
      return availablePlugins.plugins.map(plugin => plugin.name).includes(plugin)
    },
    getPackageErrorMessage(plugin, pluginType) {
      if (!plugin) return this.$t('Please select input plugin type.')
      const isInputPlugin = pluginType === 'input'
      if (this.includesPlugin(plugin, pluginType)) return ''
      return this.$t("Please change the %s or update '%s' package.").format(
        isInputPlugin ? this.$t('data type') : this.$t('server type'),
        isInputPlugin ? this.translateInput(plugin) : this.translateOutput
      )
    },
    filterSectionData(s, section) {
      return section?.input?.includes(s.id)
    },
    afterDelete(deletedInputSection) {
      const collectionSectionChildIds = this.section.input.filter(id => id !== deletedInputSection.id)
      const collection = this.uciData.collection.find(col => col.id === this.section.id)
      collection.input = collectionSectionChildIds
      this.$emit('update-card-ids')
    },
    afterAdd(_, { uciData, newSection }) {
      const inputIds = this.section.input || []
      inputIds.push(newSection.id)
      const collection = uciData.collection.find(col => col.id === this.section.id)
      collection.input = inputIds
    },
    modalClosed(data) {
      data.collection = this.uciData.collection
      data.inputs = this.uciData.inputs
      formBus.emit('uciData-loaded')
    }
  }
}
</script>
<style scoped>
:deep(.data-sender-table) {
  --bg-color: var(--color-theme-bg-secondary-subtle, #f8f8f8);
}
:deep(.data-sender-table table th),
:deep(.data-sender-table table td) {
  background-color: var(--bg-color);
}
:deep([id^='add-data-sender-table-']) {
  margin-left: auto;
}
</style>
