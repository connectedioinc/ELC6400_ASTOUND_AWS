<template>
  <vuci-form
    config="dnp3_outstation"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tags-table
        :uci-data="uciData"
        :edit-form="markRaw(DNP3OutstationDataSourceEdit)"
        endpoint="dnp3/serial_outstation/objects/config"
        :title="$t('Objects')"
        :columns="columns"
        :before-add="beforeTagAdd"
        :validate-tag-instance="validateTagInstance"
        :can-toggle-enable="canToggleEnable"
        :remove-tag-size="true"
        @valid-data="v => (canSave = v)"
      >
        <template
          v-if="!formOptions.dnp3SerialOutstations.length"
          #action-design="{ actions }"
        >
          <tlt-button
            id="add-button"
            button-id="add"
            readonly
            @click="actions.create"
          >
            {{ $t('Add') }}
          </tlt-button>
          <tlt-popover
            target="#add-button"
            placement="left"
            fallback-placements="top-start"
          >
            {{ $t('DNP3 serial outstation instance is required when creating a new instance. New configuration can be created') }}
            <router-link to="/services/dnp3/dnp_serial_outstation/general">{{ $t('here') }}</router-link
            >.
          </tlt-popover>
        </template>
      </tags-table>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!canSave"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script lang="ts" setup>
import { markRaw, provide, ref } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import DNP3OutstationDataSourceEdit from './DNP3OutstationDataSourceEdit.vue'
import TagsTable from '@/components/shared/UniversalGatewayUtilities/TagsTable.vue'
import { FormOptionKey, type FormOptions, type Dnp3SerialOutstationConfig, useOutstationCommon } from './Dnp3OutstationCommon'
import type { Dnp3OutstationTagConfig, Dnp3TagGroup, Tag } from '@/types/tagTypes'
import { validateObjectOverlap } from './Dnp3CommonFunctionsMixin.vue'

const $t = useTranslate()
const message = useMessages()
const { dnp3GroupNames } = useOutstationCommon()

const columns = [
  { name: 'dnp3_group', label: $t('DNP3 data type'), displayFn: (v: Dnp3TagGroup) => dnp3GroupNames[v] || '-' },
  { name: 'outstation_dev_id', label: $t('DNP3 outstation instance'), help: $t('DNP3 serial outstation instance name or ID.'), displayFn: displayOutstation }
]

const formOptions = ref<FormOptions>({ dnp3SerialOutstations: [], dnp3Outstations: [], isTcp: false })
provide(FormOptionKey, formOptions)
const tagData = ref<Tag[]>([])
provide('tagData', tagData)
const canSave = ref<boolean>(true)

function afterLoad() {
  return axios
    .bulkGet(['/api/dnp3/serial_outstation/config', '/api/universal_gateway/options'])
    .then(([serialOutstations, tagOptions]) => {
      formOptions.value.dnp3SerialOutstations = serialOutstations.success ? serialOutstations.data : []
      tagData.value = tagOptions.success ? tagOptions.data.tags : []
      if (!serialOutstations.success) message.error($t('Failed to load DNP3 serial outstation data'))
      if (!tagOptions.success) message.error($t('Failed to load universal gateway options'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function displayOutstation(outstationId: string) {
  const sectionOutstation = formOptions.value.dnp3SerialOutstations.find((s: Dnp3SerialOutstationConfig) => s.id === outstationId)
  return sectionOutstation?.name || sectionOutstation?.id || outstationId
}

function beforeTagAdd(section: Dnp3OutstationTagConfig) {
  section.outstation_dev_id = formOptions.value.dnp3SerialOutstations[0].id
}

function canToggleEnable(section: Dnp3OutstationTagConfig) {
  return [section.dnp3_index, section.dnp3_group, section.dnp3_variation].every(Boolean)
}

function validateTagInstance(section: Dnp3OutstationTagConfig, uciData: { tags: Dnp3OutstationTagConfig[]; [key: string]: any }) {
  const overlapValidation = validateObjectOverlap(section, uciData, formOptions.value.isTcp, formOptions.value.dnp3SerialOutstations)
  if (!overlapValidation.isValid) return overlapValidation

  const outstationExists = formOptions.value.dnp3SerialOutstations.some((s: Dnp3SerialOutstationConfig) => s.id === section.outstation_dev_id)
  if (!outstationExists) {
    return {
      isValid: false,
      message: $t('Referenced server configuration is missing')
    }
  }

  return { isValid: true }
}
</script>
