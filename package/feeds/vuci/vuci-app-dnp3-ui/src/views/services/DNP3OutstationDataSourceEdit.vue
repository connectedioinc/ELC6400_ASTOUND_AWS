<template>
  <vuci-form
    v-model="formData"
    config="dnp3_outstation"
    editing
  >
    <template #default="{ uciData }">
      <tag-edit-section
        v-model="formData"
        :uci-data="uciData"
        :section="section"
        :endpoint="endpoint"
        :validate-tag-size="validateTagSize"
        :title="$utils.getModalTitle($t('object'), section.tag_name)"
        :labels="tagFieldLabels"
        :remove-tag-size="true"
        @size-change="triggerRelatedFieldValidations"
        @valid-data="v => (canSave = v)"
      >
        <template #default="{ s }">
          <vuci-form-item-select
            v-if="!formOptionsRef.isTcp"
            :uci-section="s"
            name="outstation_dev_id"
            :label="$t('DNP3 serial outstation')"
            :help="$t('DNP3 serial outstation instance name or ID.')"
            :options="serialOutstationOptions"
            @change="triggerRelatedFieldValidations"
          />
          <tlt-form-item-inline
            :label="$t('DNP3 index range')"
            :help="$t('Start and calculated end index.')"
            has-headers
            :required="s.enabled === '1'"
          >
            <div>
              <span> {{ $t('Start') }} </span>
              <vuci-form-item-input
                :uci-section="s"
                name="dnp3_index"
                :rules="[validateObjectRange, () => validateOverlap(s, uciData)]"
                placeholder="1000"
                :required="s.enabled === '1'"
              />
            </div>
            <div>
              <span> {{ $t('End') }} </span>
              <tlt-form-item-input
                v-model="indexNumberEnd"
                readonly
              />
            </div>
          </tlt-form-item-inline>
          <vuci-form-item-select
            :uci-section="s"
            name="dnp3_group"
            :label="$t('DNP3 data type')"
            :help="$t('Available data types for the selected value.')"
            :options="groupOptions"
            :readonly="groupOptions.length === 1"
            @change="triggerRelatedFieldValidations"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="dnp3_variation"
            :label="$t('DNP3 variation')"
            :help="$t('DNP3 data type variation.')"
            :options="variationOptions"
            :readonly="variationOptions.length === 1"
            @change="triggerRelatedFieldValidations"
          />
        </template>
      </tag-edit-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!canSave || isMissingSerialOutstationSelected"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script lang="ts" setup>
import TagEditSection from '@/components/shared/UniversalGatewayUtilities/TagEditSection.vue'
import type { Dnp3OutstationTagConfig } from '@/types/tagTypes'
import { computed, inject, ref, type Ref } from 'vue'
import { FormOptionKey, useOutstationCommon, type Dnp3SerialOutstationConfig, type FormOptions } from './Dnp3OutstationCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { rules } from '@/validation-rules'
import { getGroupDataBytes, validateObjectOverlap } from './Dnp3CommonFunctionsMixin.vue'
import { useNotifications } from '@/stores/messages'

interface DataSourceEditProps {
  uciData: { tags: Dnp3OutstationTagConfig[]; [key: string]: any }
  section: Dnp3OutstationTagConfig
  endpoint: string
}

const props = defineProps<DataSourceEditProps>()
const formOptionsRef = inject(FormOptionKey) as Ref<FormOptions>

const formData = ref<{ tags: Dnp3OutstationTagConfig[]; [key: string]: any }>({ ...props.uciData })
const canSave = ref(true)

const $t = useTranslate()
const { getTagSize } = useUniversalGatewayUtils(true)
const { dnp3GroupNames, dnp3VariationsByGroup } = useOutstationCommon()
const notification = useNotifications()

const REGISTER_RANGE_LIMITS: readonly number[] = [1000, 65535]
const relatedFields: (keyof Dnp3OutstationTagConfig)[] = [
  // 'tag_size' ,
  'tag_start',
  'tag_count',
  'dnp3_index'
]
const initialSection: Dnp3OutstationTagConfig = { ...props.section }
const tagFieldLabels = {
  tag_name: $t('Object name'),
  tag_source: $t('Object source'),
  tag_value: $t('Object value'),
  tag_range: $t('Object range'),
  tag_type: $t('Object type'),
  tag_size: $t('Object size')
}

const isMissingSerialOutstationSelected = computed<boolean>(() => {
  return !!initialSection.outstation_dev_id && !formOptionsRef.value.dnp3SerialOutstations.some((s: Dnp3SerialOutstationConfig) => s.id === props.section.outstation_dev_id)
})
if (isMissingSerialOutstationSelected.value) {
  notification.error($t('Referenced server configuration is missing.'))
}
const serialOutstationOptions = computed<[string, string][]>(() => {
  let outstationSectionExists = false
  const options: [string, string][] = formOptionsRef?.value.dnp3SerialOutstations.map((s: Dnp3SerialOutstationConfig) => {
    if (s.id === initialSection.outstation_dev_id) outstationSectionExists = true
    return [s.id, s.name || s.id]
  })
  if (!outstationSectionExists) {
    options.push([initialSection.outstation_dev_id!, initialSection.outstation_dev_id!])
  }
  return options
})
const indexNumberEnd = computed<string>(() => {
  const index = Number(props.section.dnp3_index),
    count = Number(props.section.tag_count)
  if (isNaN(index)) return '-'
  if (isNaN(count)) return index.toString()
  return (index + count - 1).toString()
})
const groupOptions = computed<[string, string][]>(() => {
  if (props.section.tag_permissions === 'w' || props.section.tag_permissions === 'rw') {
    return [
      ['40', dnp3GroupNames['40']],
      ['10', dnp3GroupNames['10']]
    ]
  }
  if (props.section.tag_type === 'binary') {
    return [
      ['1', dnp3GroupNames['1']],
      ['3', dnp3GroupNames['3']],
      ['10', dnp3GroupNames['10']],
      ['20', dnp3GroupNames['20']]
    ]
  }
  if (props.section.tag_type === 'string') {
    return [['110', dnp3GroupNames['110']]]
  }
  return Object.entries(dnp3GroupNames).map(([k, v]) => [k, v])
})
const variationOptions = computed<[string, string][]>(() => {
  if (!props.section.dnp3_group) return []

  return dnp3VariationsByGroup[props.section.dnp3_group]
})

function validateTagSize(value: string) {
  if (!props.section.dnp3_group) return { isValid: true }
  const totalSizeOfObjects = getGroupDataBytes(props.section.dnp3_group) * (REGISTER_RANGE_LIMITS[1] - REGISTER_RANGE_LIMITS[0])
  return rules.irange(value, 1, totalSizeOfObjects)
}

function validateObjectRange(value: string) {
  const tagSize = getTagSize(props.section)
  if (!tagSize || !props.section.dnp3_group) return { isValid: true }
  const objectCount = Math.ceil(tagSize / getGroupDataBytes(props.section.dnp3_group)) - 1
  return rules.irange(value, REGISTER_RANGE_LIMITS[0], Math.max(REGISTER_RANGE_LIMITS[1] - objectCount, REGISTER_RANGE_LIMITS[0]))
}

function validateOverlap(section: Dnp3OutstationTagConfig, uciData: { tags: Dnp3OutstationTagConfig[]; [key: string]: any }) {
  if (section.enabled !== '1') return { isValid: true }

  const outstations = formOptionsRef.value.isTcp ? formOptionsRef.value.dnp3Outstations : formOptionsRef.value.dnp3SerialOutstations
  return validateObjectOverlap(section, uciData, formOptionsRef.value.isTcp, outstations)
}

function triggerRelatedFieldValidations(self: { uciSection: Dnp3OutstationTagConfig; vuciSection: any }) {
  const name = self.uciSection.id
  Array.from(self.vuciSection.forms[name]).forEach(inputRef => relatedFields.includes(inputRef.name) && inputRef.validate())
}
</script>
