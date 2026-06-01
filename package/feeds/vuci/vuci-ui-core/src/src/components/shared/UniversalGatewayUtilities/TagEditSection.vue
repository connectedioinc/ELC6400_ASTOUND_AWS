<template>
  <vuci-named-section
    v-slot="{ s }"
    :uci-data="uciData"
    :name="section.id"
    :title="title"
    :endpoints="[{ endpoint }]"
    data-key="tags"
  >
    <vuci-form-item-switch
      :uci-section="s"
      :label="$t('Enable')"
      name="enabled"
      :readonly="s.enabled !== '1' && isMissingTagSelected"
      :hints="s.enabled !== '1' && isMissingTagSelected ? [{ info: warningMessages.refMissing }] : []"
    />
    <tlt-inline-message
      v-if="!isSaveable"
      id="client-service-request-missing"
      :message="$t('Referenced client\'s request configuration is missing. To resolve this, either disable the instance or select different values for source or value options.')"
      type="error"
    />
    <tlt-inline-message
      v-else-if="outdatedFields.length > 0"
      id="client-service-request-values-changed"
      :message="$t('Referenced client\'s request values were changed. To resolve this, save configuration with the updated fields: %s.').format(outdatedFields.join(','))"
      type="warning"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="tag_name"
      :label="labels.tag_name"
      :help="$t('Name of configuration.')"
      maxlength="128"
      :rules="['uciname', () => $utils.validateNoDuplicates(uciData.tags, 'tag_name', s.tag_name, $t('name'))]"
      :required="s.enabled === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="tag_source"
      :label="labels.tag_source"
      :help="$t('Client service which will be sending requests.')"
      :options="sourceOptions"
      :required="s.enabled === '1'"
    />
    <tlt-inline-message
      v-if="sourceOptions.length === 0"
      id="client-service-not-configured"
      :message="$t('Sources can be configured in supported service clients.')"
      type="info"
    />
    <tlt-form-item-inline
      :label="labels.tag_value"
      :help="$t('Request value and its permissions (Read-Only, Write-Only or Read-Write).')"
      :required="s.enabled === '1'"
      has-headers
    >
      <div class="basis-2/3">
        <span>{{ $t('Value') }}</span>
        <vuci-form-item-select
          :uci-section="s"
          name="tag_id"
          :options="valueOptions"
          :required="s.enabled === '1'"
          @change="updateSize"
        />
      </div>
      <div class="basis-1/3">
        <span> {{ linkedFields.tag_permissions }} </span>
        <tlt-form-item-input
          v-model="shownTagPermissions"
          readonly
        />
      </div>
    </tlt-form-item-inline>
    <tlt-form-item-inline
      :label="labels.tag_range"
      :help="$t('Specify the start index and count for the range.')"
      has-headers
    >
      <div>
        <span>{{ $t('Start') }}</span>
        <vuci-form-item-input
          :uci-section="s"
          name="tag_start"
          initial="0"
          placeholder="0"
          :rules="[validateTagStart]"
          :readonly="selectedSourceTag?.value_count === 1"
        />
      </div>
      <div>
        <span>{{ $t('Count') }}</span>
        <vuci-form-item-input
          :uci-section="s"
          name="tag_count"
          initial="1"
          placeholder="1"
          :rules="[validateTagCount]"
          :readonly="selectedSourceTag?.value_count === 1"
          @change="(self: any) => emit('size-change', self)"
        />
      </div>
      <div>
        <span>{{ $t('Max') }}</span>
        <tlt-form-item-input
          v-model="shownTagMax"
          readonly
        />
      </div>
    </tlt-form-item-inline>
    <vuci-form-item-select
      :uci-section="s"
      name="tag_type"
      :label="labels.tag_type"
      :help="$t('Value data type.')"
      :options="typeOptions"
      :readonly="typeOptions.length === 1"
      @change="updateSize"
    >
      <template
        v-if="typeOptions.length === 1"
        #after-content="{ controlRef }"
      >
        <tlt-popover
          :target="() => controlRef"
          fallback-placements="top-start"
          class="break-all"
        >
          {{ $t("Only '%s' type is available with '%s' value.").format(getTupleArrayPrettyValue(typeOptions, s.tag_type), getTupleArrayPrettyValue(valueOptions, s.tag_id)) }}
        </tlt-popover>
      </template>
    </vuci-form-item-select>
    <vuci-form-item-input
      v-if="!removeTagSize"
      :uci-section="s"
      name="tag_size"
      :label="labels.tag_size"
      :help="$t('Size of the value in bytes.')"
      :rules="[validateTagSize]"
      :depend="!isTagSizeFixed(s)"
      :required="s.enabled === '1'"
      @change="(self: any) => emit('size-change', self)"
    />
    <slot :s="s" />
  </vuci-named-section>
</template>

<script lang="ts" setup>
import type { TagFormData, Tag, TagConfig, TagPermissions, TagConfigType, DynamicTagConfigOption } from '@/types/tagTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { type Ref, computed, inject, ref, watch } from 'vue'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { rules } from '@/validation-rules'

type FieldNames = 'tag_name' | 'tag_source' | 'tag_value' | 'tag_range' | 'tag_type' | 'tag_size'

interface TagEditProps {
  uciData: TagFormData
  endpoint: string
  section: TagConfig
  title: string
  labels: Record<FieldNames, string>
  validateTagSize?: (value: string) => { isValid: boolean; message?: string }
  // Workaroundish props for services which doesn't fully support tags yet
  excludedServices?: string[]
  removeTagSize?: boolean
}

const props = withDefaults(defineProps<TagEditProps>(), {
  validateTagSize: () => ({
    isValid: true
  }),
  excludedServices: () => [],
  removeTagSize: false
})
const tagData = inject<Ref<Tag[]>>('tagData')
const formData = defineModel<TagFormData>({ required: true })
const emit = defineEmits<{
  (event: 'size-change', self: any): void
  (event: 'valid-data', isValid: boolean): void
}>()

const $t = useTranslate()
const { tagTypeOptions, sourceNameTranslations, isTagSizeFixed, isSourceMatchingConfig, findOutdatedConfigOptions } = useUniversalGatewayUtils(props.removeTagSize)

const initialSection: TagConfig = { ...props.section }
const permissionsTranslations: Record<TagPermissions, string> = {
  r: $t('Read-Only'),
  w: $t('Write-Only'),
  rw: $t('Read-Write')
}
const warningMessages = {
  refMissing: $t("Referenced client's request configuration is missing.")
}
// Linked fields which might become outdated when sourced request data changes
const linkedFields = ref<Record<DynamicTagConfigOption, string>>({
  tag_range: props.labels.tag_range,
  tag_type: props.labels.tag_type,
  tag_permissions: $t('Permissions')
})

const tags = computed(() => {
  const fixedTags = tagData?.value || []
  if (props.excludedServices.length === 0) return fixedTags
  return fixedTags.filter(tag => !props.excludedServices.includes(tag.source))
})
const selectedSourceTag = computed<Tag | undefined>(() => {
  return tags.value.find(t => isSourceMatchingConfig(t, props.section))
})
const outdatedFields = computed<string[]>(() => {
  const isSourceSaved = isSourceMatchingConfig(selectedSourceTag.value, initialSection)
  if (!isSourceSaved) return []

  const outdatedOptions = findOutdatedConfigOptions(selectedSourceTag.value, initialSection)
  const outdatedFields = outdatedOptions.map(opt => linkedFields.value[opt])
  return outdatedFields
})
const isSourceTagMissing = computed(() => {
  return !!initialSection.tag_id && !tags.value.some(tag => isSourceMatchingConfig(tag, initialSection))
})
const isMissingTagSelected = computed(() => {
  return isSourceTagMissing.value && props.section.tag_id === initialSection.tag_id
})
const isSaveable = computed(() => {
  return !(props.section.enabled === '1' && isMissingTagSelected.value)
})
const sourceOptions = computed(() => {
  const uniqueSources = [...new Set(tags.value.map(tag => tag.source))]
  if (isSourceTagMissing.value && !uniqueSources.includes(initialSection.tag_source!)) uniqueSources.push(initialSection.tag_source!)
  return uniqueSources.map(src => [src, sourceNameTranslations[src]])
})
const valueOptions = computed(() => {
  const availableValues = tags.value.filter(t => t.source === props.section.tag_source).map(tag => [tag.id, tag.pretty_name])
  if (isSourceTagMissing.value) availableValues.push([initialSection.tag_id!, '-'])
  return availableValues
})
const shownTagPermissions = computed(() => {
  return permissionsTranslations[props.section.tag_permissions as keyof typeof permissionsTranslations] || '-'
})
const shownTagMax = computed(() => {
  return selectedSourceTag.value?.value_count.toString() || '-'
})
const typeOptions = computed(() => {
  const knownType = tagTypeOptions.find(t => t[0] === selectedSourceTag.value?.type)
  if (knownType) return [knownType]
  return tagTypeOptions
})

function updateSize(self: { uciSection: TagConfig }) {
  if (!props.removeTagSize && !isTagSizeFixed(props.section)) {
    if (isSourceMatchingConfig(selectedSourceTag.value, initialSection) && selectedSourceTag.value?.type === initialSection.tag_type) {
      self.uciSection.tag_size = initialSection.tag_size || ''
    } else {
      self.uciSection.tag_size = selectedSourceTag.value?.value_size || ''
    }
  }
  emit('size-change', self)
}
function getTupleArrayPrettyValue(tupleArray: string[][], key: any) {
  return tupleArray.find(t => t[0] === key)?.[1]
}

function validateTagStart(value: string) {
  return rules.irange(value, 0, (selectedSourceTag.value?.value_count || 65536) - 1)
}
function validateTagCount(value: string) {
  const start = Number(props.section.tag_start)
  const startResult = validateTagStart(props.section.tag_start || '')
  if (!startResult.isValid) return { isValid: true }

  const maxCount = selectedSourceTag.value?.value_count || 65536
  return rules.irange(value, 1, maxCount - start)
}

watch(
  () => selectedSourceTag.value,
  () => {
    const currentTag = formData.value.tags.find(t => t.id === props.section.id)!
    if (isSourceMatchingConfig(selectedSourceTag.value, initialSection)) {
      currentTag.tag_permissions = selectedSourceTag.value?.permissions || initialSection.tag_permissions
      if (Number(selectedSourceTag.value?.value_count) >= Number(initialSection.tag_start) + Number(initialSection.tag_count)) {
        currentTag.tag_start = initialSection.tag_start
        currentTag.tag_count = initialSection.tag_count
      } else {
        currentTag.tag_start = '0'
        currentTag.tag_count = '1'
      }
    } else if (selectedSourceTag.value) {
      currentTag.tag_permissions = selectedSourceTag.value?.permissions
      currentTag.tag_start = '0'
      currentTag.tag_count = '1'
    }
  },
  { immediate: true }
)

watch(
  () => isSaveable.value,
  () => {
    emit('valid-data', isSaveable.value)
  },
  { immediate: true }
)
</script>
