<template>
  <vuci-typed-section
    :title="title"
    :table-actions="['column-list', 'search']"
    :columns="columns"
    :uci-data="uciData"
    data-key="tags"
    :type="type"
    :endpoints="[{ endpoint }]"
    :edit-form="editForm"
    :edit-form-props="{
      uciData: uciData,
      endpoint: endpoint
    }"
    :add="beforeAdd"
    pagination
    :initial-per-page="25"
  >
    <template #tag_name="{ s }">
      <div class="flex flex-row items-center gap-2">
        {{ s.tag_name || '-' }}
        <tlt-hint
          v-if="s.enabled === '1' && tagWarningLookup[s.id]"
          :hints="[{ info: tagWarningLookup[s.id] }]"
        >
          <tlt-icon
            icon="error"
            class="text-theme-text-danger size-5"
          />
        </tlt-hint>
      </div>
    </template>
    <template #enabled="{ s }">
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :readonly="getEnableHint(s).length > 0"
        :hints="getEnableHint(s)"
      />
    </template>
    <template #action-design="{ actions }">
      <slot
        name="action-design"
        :actions="actions"
      >
      </slot>
    </template>
  </vuci-typed-section>
</template>

<script lang="ts" setup>
import { computed, inject, watch, type Component, type Ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { TagConfig, Tag, TagFormData } from '@/types/tagTypes'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'

interface TagsTableProps {
  uciData: TagFormData
  editForm: Component
  endpoint: string
  title: string
  columns?: Record<string, string | Object>[]
  validateTagInstance?: (section: TagConfig, uciData: TagFormData) => { isValid: boolean; message?: string }
  canToggleEnable: (section: TagConfig) => boolean
  beforeAdd?: (section: TagConfig) => void
  removeTagSize?: boolean
  type?: string
}

const props = withDefaults(defineProps<TagsTableProps>(), {
  type: 'tag'
})
const tagData = inject('tagData') as Ref<Tag[]>
const emit = defineEmits<{
  (event: 'valid-data', isValid: boolean): void
}>()

const $t = useTranslate()
const { sourceNameTranslations, isTagSizeFixed, isSourceMatchingConfig, findOutdatedConfigOptions } = useUniversalGatewayUtils(props.removeTagSize)

const warningMessages = {
  refMissing: $t("Referenced client's request configuration is missing"),
  outdatedValues: $t("Client's request values were changed")
}

const columns = computed(() => [
  { name: 'tag_name', label: $t('Name'), help: $t('Name of the instance.'), displayFn: (v: string) => v || '-' },
  {
    name: 'tag_source',
    label: $t('Source'),
    help: $t('Client service which will be sending requests.'),
    displayFn: (v: string) => sourceNameTranslations[v] || '-',
    actions: { filter: { type: 'uniqueValues' } }
  },
  ...(props.columns || []),
  { name: 'enabled', label: $t('Enabled') }
])

const tagWarningLookup = computed(() => {
  return props.uciData.tags.reduce(
    (acc, s) => {
      let msg
      if (s.tag_id) {
        const sourceTag = tagData.value.find(t => isSourceMatchingConfig(t, s))
        if (!sourceTag) {
          msg = warningMessages.refMissing
        } else if (findOutdatedConfigOptions(sourceTag, s).length > 0) {
          msg = warningMessages.outdatedValues
        }
      }
      if (!msg && props.validateTagInstance) {
        const { isValid, message } = props.validateTagInstance(s, props.uciData)
        if (!isValid && message) {
          msg = message
        }
      }
      if (msg) acc[s.id] = msg
      return acc
    },
    {} as Record<string, string>
  )
})

function getEnableHint(section: TagConfig) {
  const hints = []
  if (section.enabled !== '1') {
    const missingRequiredValues = ![
      section.tag_name,
      section.tag_id,
      section.tag_source,
      section.tag_type,
      props.removeTagSize || isTagSizeFixed(section) ? true : section.tag_size,
      props.canToggleEnable(section)
    ].every(Boolean)
    if (missingRequiredValues) {
      hints.push({ info: $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values.') })
    }
    if (tagWarningLookup.value[section.id]) {
      hints.push({ info: tagWarningLookup.value[section.id] })
    }
  }
  return hints
}

watch(
  () => props.uciData.tags,
  () => {
    const isValid = !props.uciData.tags.some(s => s.enabled === '1' && tagWarningLookup.value[s.id])
    emit('valid-data', isValid)
  },
  { deep: true }
)
</script>
