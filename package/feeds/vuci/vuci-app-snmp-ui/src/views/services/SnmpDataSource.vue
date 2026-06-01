<template>
  <vuci-form
    config="snmpd"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tags-table
        :uci-data="uciData"
        endpoint="snmp/agent/objects/config"
        :edit-form="markRaw(SnmpDataSourceEdit)"
        :title="$t('Objects')"
        :columns="columns"
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
import TagsTable from '@/components/shared/UniversalGatewayUtilities/TagsTable.vue'
import SnmpDataSourceEdit from './SnmpDataSourceEdit.vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { markRaw, provide, ref } from 'vue'
import type { SnmpTagConfig, TagFormData, Tag } from '@/types/tagTypes'

const $t = useTranslate()
const message = useMessages()

const columns = [{ name: 'snmp_tag_oid', label: 'SNMP OID' }]

const snmpData = ref<SnmpTagConfig[]>()
const tagData = ref<Tag[]>([])
provide('tagData', tagData)
provide('snmpData', snmpData)
const canSave = ref(true)

function afterLoad(form: TagFormData) {
  snmpData.value = form.tags
  return axios
    .get('/api/universal_gateway/options')
    .then(({ data }) => {
      tagData.value = data.tags
    })
    .catch(() => {
      message.error($t('Failed to load universal gateway options'))
    })
}

function canToggleEnable(section: SnmpTagConfig) {
  return Boolean(section.snmp_tag_oid)
}
</script>
