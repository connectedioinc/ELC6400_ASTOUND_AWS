<template>
  <vuci-form
    config="dnp3_outstation"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tags-table
        :uci-data="uciData"
        :edit-form="markRaw(DNP3OutstationDataSourceEdit)"
        endpoint="dnp3/outstation/objects/config"
        :title="$t('Objects')"
        :columns="columns"
        :validate-tag-instance="(s, uciData) => validateObjectOverlap(s, uciData, formOptions.isTcp, formOptions.dnp3Outstations)"
        :can-toggle-enable="canToggleEnable"
        :remove-tag-size="true"
        @valid-data="v => (canSave = v)"
      />
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
import TagsTable from '@/components/shared/UniversalGatewayUtilities/TagsTable.vue'
import type { Dnp3OutstationTagConfig, Dnp3TagGroup, Tag } from '@/types/tagTypes'
import DNP3OutstationDataSourceEdit from './DNP3OutstationDataSourceEdit.vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { FormOptionKey, useOutstationCommon, type FormOptions } from './Dnp3OutstationCommon'
import { validateObjectOverlap } from './Dnp3CommonFunctionsMixin.vue'

const $t = useTranslate()
const message = useMessages()
const { dnp3GroupNames } = useOutstationCommon()

const columns = [{ name: 'dnp3_group', label: $t('DNP3 data type'), displayFn: (v: Dnp3TagGroup) => dnp3GroupNames[v] || '-' }]

const formOptions = ref<FormOptions>({ dnp3Outstations: [], dnp3SerialOutstations: [], isTcp: true })
provide(FormOptionKey, formOptions)
const tagData = ref<Tag[]>([])
provide('tagData', tagData)
const canSave = ref<boolean>(true)

function afterLoad() {
  return axios
    .bulkGet(['/api/dnp3/outstation/config', '/api/universal_gateway/options'])
    .then(([outstations, tagOptions]) => {
      formOptions.value.dnp3Outstations = outstations.success ? outstations.data : []
      tagData.value = tagOptions.success ? tagOptions.data.tags : []
      if (!outstations.success) message.error($t('Failed to load DNP3 outstation data'))
      if (!tagOptions.success) message.error($t('Failed to load universal gateway options'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function canToggleEnable(section: Dnp3OutstationTagConfig) {
  return [section.dnp3_index, section.dnp3_group, section.dnp3_variation].every(Boolean)
}
</script>
