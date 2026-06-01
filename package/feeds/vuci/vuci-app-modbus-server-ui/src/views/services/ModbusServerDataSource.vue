<template>
  <vuci-form
    config="modbus_server"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tags-table
        :uci-data="uciData"
        :edit-form="markRaw(ModbusServerDataSourceEdit)"
        endpoint="modbus/server/tcp/registers/config"
        :title="$t('Registers')"
        :columns="columns"
        :validate-tag-instance="(s, uciData) => validateRegisterOverlap(s, uciData, formOptions.isTcp, formOptions.tcpServers)"
        :can-toggle-enable="canToggleEnable"
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
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import TagsTable from '@/components/shared/UniversalGatewayUtilities/TagsTable.vue'
import ModbusServerDataSourceEdit from './ModbusServerDataSourceEdit.vue'
import { FormOptionKey, type FormOptions } from './ModbusServerCommon'
import type { ModbusServerTagConfig, Tag } from '@/types/tagTypes'
import { validateRegisterOverlap } from '@/components/shared/ModbusUtils.vue'

const $t = useTranslate()
const message = useMessages()

const columns = [{ name: 'modbus_reg_num', label: $t('Modbus register number'), help: $t('Start Register/Coil/Input number.'), displayFn: (v: string) => v || '-' }]

const formOptions = ref<FormOptions>({ tcpServers: [], serialServers: [], isTcp: true })
provide(FormOptionKey, formOptions)
const tagData = ref<Tag[]>([])
provide('tagData', tagData)
const canSave = ref<boolean>(true)

function afterLoad() {
  return axios
    .bulkGet(['/api/modbus/server/tcp/config', '/api/universal_gateway/options'])
    .then(([tcpServers, tagOptions]) => {
      formOptions.value.tcpServers = tcpServers.success ? tcpServers.data : []
      tagData.value = tagOptions.success ? tagOptions.data.tags : []
      if (!tcpServers.success) message.error($t('Failed to load Modbus TCP server data'))
      if (!tagOptions.success) message.error($t('Failed to load universal gateway options'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function canToggleEnable(section: ModbusServerTagConfig) {
  return [section.modbus_type, section.modbus_reg_num].every(Boolean)
}
</script>
