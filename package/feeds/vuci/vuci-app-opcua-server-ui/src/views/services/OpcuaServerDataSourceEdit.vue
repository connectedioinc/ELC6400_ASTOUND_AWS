<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_server"
    :before-save="onBeforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('Server node'), section.name)"
      :name="section.id"
      :endpoints="[{ endpoint: 'opcua/destination_server/nodes/config' }]"
      :uci-data="uciData"
      data-key="server_nodes"
    >
      <tlt-inline-message
        v-if="s.enabled === '1' && !selectedTag"
        id="client-service-request-missing"
        :message="$t('Referenced source value is missing. To resolve this, either disable the instance or select different values for source or value options.')"
        type="error"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        name="enabled"
        :readonly="!canBeEnabled"
      >
        <template
          v-if="!canBeEnabled"
          #after-content="{ controlRef }"
        >
          <tlt-popover
            :target="() => controlRef"
            placement="bottom-start"
            fallback-placements="top-start"
          >
            {{ $t('To use string ID type, default nodes must be disabled. Disable it') }}
            <router-link to="/services/opcua/opcua_server/general"> {{ $t('here') }} </router-link>
          </tlt-popover>
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the server node.')"
        rules="string"
        maxlength="128"
      />
      <vuci-form-item-radio-group
        :uci-section="s"
        name="node_id_type"
        :label="$t('Node ID type')"
        :options="nodeIdTypeOptions"
        initial="numeric"
        @change="onNodeIdTypeChange"
      />
      <vuci-form-item-input
        ref="nodeIdRef"
        :uci-section="s"
        name="node_id"
        :label="$t('Node ID')"
        :rules="validateNodeId"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="source"
        :label="$t('Source')"
        :help="$t('Source service name.')"
        :options="sourceOptions"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Value from source')"
        name="source_value_id"
        :options="valueOptions"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        v-if="selectedTag?.type === 'unknown'"
        :uci-section="s"
        name="source_value_type"
        :label="$t('Value data type')"
        :options="tagTypeOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('I/O type')"
        name="io_type"
        :options="ioTypeOptions"
        :depend="s.source === 'opcua_server' && s.source_value_id === 'io'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('I/O field')"
        name="io_field"
        :options="ioFieldOptions"
        :depend="s.source === 'opcua_server' && s.source_value_id === 'io'"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed, inject, type ComputedRef, type Ref, useTemplateRef } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { rules } from '@/validation-rules'
import type { Tag } from '@/types/tagTypes'
import useOpcuaServerUtils from './useOpcuaServerUtils'
import type { ServerNodeConfig } from './OpcuaServerCommon'

interface Props {
  section: ServerNodeConfig
}

const $t = useTranslate()
const props = defineProps<Props>()
const opcuaServerGeneral = inject<Ref<[]>>('opcuaServerGeneral', [])
const availableTags = inject<ComputedRef<Tag[]>>(
  'availableTags',
  computed(() => [])
)
const availableIOTypes = inject('availableIOTypes', [])
const formData = ref({})
const nodeIdRef = useTemplateRef('nodeIdRef')

const initialSection = ref({ ...props.section })

const { findTag, tagTypeOptions, sourceNameTranslations, listSourceNamesFromTags, listTagsBySource } = useUniversalGatewayUtils()
const { ioFieldsByType, ioTypeDisplayNames, nodeIdTypes, nodeIdTypeDisplayNames, ioFieldDisplayNames } = useOpcuaServerUtils()

const defaultNodesEnabled = computed(() => opcuaServerGeneral.value[0].default_nodes_enabled !== '0')

const nodeIdTypeOptions = nodeIdTypes.map(nodeIdType => ({ value: nodeIdType, name: nodeIdTypeDisplayNames[nodeIdType] }))
const canBeEnabled = computed(() => !(defaultNodesEnabled.value && props.section.node_id_type === 'string'))

const isSourceTagMissing = computed(() => {
  return !!initialSection.value.source_value_id && !findTag(availableTags.value, initialSection.value.source, initialSection.value.source_value_id)
})

const sourceOptions = computed(() => {
  let sources = listSourceNamesFromTags(availableTags.value)
  if (initialSection.value.source && !sources.includes(initialSection.value.source)) {
    sources.push(initialSection.value.source)
  }

  return sources.map(source => [source, sourceNameTranslations[source] || '-'])
})

const valueOptions = computed(() => {
  const tags = listTagsBySource(availableTags.value, props.section.source)
  if (isSourceTagMissing.value) {
    tags.push({ id: initialSection.value.source_value_id, pretty_name: '-' })
  }

  return tags.map(tag => [tag.id, tag.pretty_name])
})

const selectedTag = computed(() => findTag(availableTags.value, props.section.source, props.section.source_value_id))

const ioTypeOptions = computed(() => availableIOTypes.value.map(ioType => [ioType, ioTypeDisplayNames[ioType]]))

const ioFieldOptions = computed(() => {
  const ioFields = ioFieldsByType[props.section.io_type]
  if (!ioFields) {
    return []
  }

  return ioFields.map(field => [field, ioFieldDisplayNames[field]])
})

function validateNodeId(value: string) {
  let result = { isValid: true }
  if (props.section.node_id_type === 'numeric') {
    result = rules.irange(value, 2, 2147483647)
  } else if (props.section.node_id_type === 'string') {
    result = rules.string(value)
  } else if (props.section.node_id_type === 'guid') {
    result = rules.guid(value)
  } else if (props.section.node_id_type === 'bytestring') {
    result = rules.base64(value)
  }
  if (!result.isValid) {
    return result
  }

  for (const serverNode of formData.value.server_nodes) {
    if (serverNode.id === props.section.id) {
      continue
    }

    if (serverNode.node_id === props.section.node_id && serverNode.node_id_type === props.section.node_id_type) {
      return {
        isValid: false,
        message: $t('Duplicate node ID between nodes')
      }
    }
  }

  return { isValid: true }
}

function onBeforeSave() {
  if (props.section.enabled === '1' && selectedTag.value === undefined) {
    return Promise.reject($t('Missing value from source'))
  }
  if (selectedTag.value === undefined) {
    // reset uci section's 'source' and 'source_value_id' by refreshing sourceOptions and valueOptions values
    if (!listTagsBySource(availableTags.value, props.section.source).length) initialSection.value.source = ''
    initialSection.value.source_value_id = ''
  }
  return Promise.resolve()
}

function onNodeIdTypeChange() {
  if (!canBeEnabled.value) {
    const section = formData.value.server_nodes.find(node => node.id === props.section.id)
    section.enabled = '0'
  }
  nodeIdRef.value?.validate()
}
</script>
