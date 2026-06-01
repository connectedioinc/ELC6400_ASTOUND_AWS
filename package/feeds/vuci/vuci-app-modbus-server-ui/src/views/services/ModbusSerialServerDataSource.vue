<template>
  <vuci-form
    config="modbus_server"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tags-table
        :uci-data="uciData"
        :edit-form="markRaw(ModbusServerDataSourceEdit)"
        endpoint="modbus/server/serial/registers/config"
        :title="$t('Registers')"
        :columns="columns"
        :before-add="beforeTagAdd"
        :validate-tag-instance="validateTagInstance"
        :can-toggle-enable="canToggleEnable"
        @valid-data="v => (canSave = v)"
      >
        <template
          v-if="!formOptions.serialServers.length"
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
            {{ $t('Modbus serial server instance is required when creating a new instance. New configuration can be created') }}
            <router-link to="/services/modbus/modbus_serial_server/general">{{ $t('here') }}</router-link>
            .
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
import ModbusServerDataSourceEdit from './ModbusServerDataSourceEdit.vue'
import TagsTable from '@/components/shared/UniversalGatewayUtilities/TagsTable.vue'
import { FormOptionKey, type FormOptions, type ModbusSerialServerConfig } from './ModbusServerCommon'
import type { ModbusServerTagConfig, Tag } from '@/types/tagTypes'
import { validateRegisterOverlap } from '@/components/shared/ModbusUtils.vue'

const $t = useTranslate()
const message = useMessages()

const columns = [
  { name: 'modbus_reg_num', label: $t('Modbus register number'), help: $t('Start Register/Coil/Input number.'), displayFn: (v: string) => v || '-' },
  { name: 'modbus_dev_config', label: $t('Modbus server instance'), help: $t('Modbus serial server instance name or ID.'), displayFn: displayModbusServer }
]

const formOptions = ref<FormOptions>({ serialServers: [], tcpServers: [], isTcp: false })
provide(FormOptionKey, formOptions)
const tagData = ref<Tag[]>([])
provide('tagData', tagData)
const canSave = ref<boolean>(true)

function afterLoad() {
  return axios
    .bulkGet(['/api/modbus/server/serial/config', '/api/universal_gateway/options'])
    .then(([serialServers, tagOptions]) => {
      formOptions.value.serialServers = serialServers.success ? serialServers.data : []
      tagData.value = tagOptions.success ? tagOptions.data.tags : []
      if (!serialServers.success) message.error($t('Failed to load Modbus serial server data'))
      if (!tagOptions.success) message.error($t('Failed to load universal gateway options'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function displayModbusServer(serverId: string) {
  const sectionServer = formOptions.value.serialServers.find((s: ModbusSerialServerConfig) => s.id === serverId)
  return sectionServer?.name || serverId
}

function beforeTagAdd(section: ModbusServerTagConfig) {
  section.modbus_dev_config = formOptions.value.serialServers[0].id
}

function validateTagInstance(section: ModbusServerTagConfig, uciData: { tags: ModbusServerTagConfig[]; [key: string]: any }) {
  const overlapValidation = validateRegisterOverlap(section, uciData, formOptions.value.isTcp, formOptions.value.serialServers)
  if (!overlapValidation.isValid) return overlapValidation

  const serverExists = formOptions.value.serialServers.some((s: ModbusSerialServerConfig) => s.id === section.modbus_dev_config)
  if (!serverExists) {
    return {
      isValid: false,
      message: $t('Referenced server configuration is missing')
    }
  }

  return { isValid: true }
}

function canToggleEnable(section: ModbusServerTagConfig) {
  return [section.modbus_type, section.modbus_reg_num].every(Boolean)
}
</script>
