<template>
  <vuci-form
    v-model="formData"
    config="modbus_server"
    editing
  >
    <template #default="{ uciData }">
      <tag-edit-section
        v-model="formData"
        :uci-data="uciData"
        :section="section"
        :validate-tag-size="validateTagSize"
        :endpoint="endpoint"
        :title="$utils.getModalTitle($t('register'), section.tag_name)"
        :labels="tagFieldLabels"
        @size-change="triggerRelatedFieldValidations"
        @valid-data="v => (canSave = v)"
      >
        <template #default="{ s }">
          <vuci-form-item-select
            v-if="!formOptionsRef.isTcp"
            :uci-section="s"
            name="modbus_dev_config"
            :label="$t('Modbus serial server')"
            :help="$t('Modbus serial server instance name or ID.')"
            :options="serialServerOptions"
            @change="triggerRelatedFieldValidations"
          />
          <tlt-form-item-inline
            :label="$t('Modbus register range')"
            :help="$t('Start and calculated end of the register numbers.')"
            :required="s.enabled === '1'"
            has-headers
          >
            <div>
              <span> {{ $t('Start') }} </span>
              <vuci-form-item-input
                :uci-section="s"
                name="modbus_reg_num"
                :rules="[validateRegisterRange, () => validateOverlap(s, uciData)]"
                placeholder="1025"
                :required="s.enabled === '1'"
              />
            </div>
            <div>
              <span>{{ $t('End') }}</span>
              <tlt-form-item-input
                v-model="registerNumberEnd"
                readonly
              />
            </div>
          </tlt-form-item-inline>
          <vuci-form-item-select
            :uci-section="s"
            name="modbus_type"
            :label="$t('Modbus data type')"
            :help="$t('Modbus function code to be used for this request.')"
            :options="functionOptions"
            @change="triggerRelatedFieldValidations"
          />
        </template>
      </tag-edit-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!canSave || isMissingSerialServerSelected"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script lang="ts" setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import TagEditSection from '@/components/shared/UniversalGatewayUtilities/TagEditSection.vue'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { computed, inject, ref, type Ref } from 'vue'
import { rules } from '@/validation-rules'
import { FormOptionKey, type FormOptions, type ModbusSerialServerConfig } from './ModbusServerCommon'
import type { ModbusReadFunctionType } from '@/types/modbusTypes'
import type { ModbusServerTagConfig } from '@/types/tagTypes'
import { getModbusDataBytes, getOccupiedRegisterRange, validateRegisterOverlap } from '@/components/shared/ModbusUtils.vue'
import { useNotifications } from '@/stores/messages'

interface DataSourceEditProps {
  uciData: { tags: ModbusServerTagConfig[]; [key: string]: any }
  section: ModbusServerTagConfig
  endpoint: string
}

const props = defineProps<DataSourceEditProps>()
const formOptionsRef = inject(FormOptionKey) as Ref<FormOptions>
const formData = ref<{ tags: ModbusServerTagConfig[]; [key: string]: any }>({ ...props.uciData })
const canSave = ref(true)

const $t = useTranslate()
const { getTagSize } = useUniversalGatewayUtils()
const notification = useNotifications()

const REGISTER_RANGE_LIMITS: readonly number[] = [1025, 65536]
const relatedFields: (keyof ModbusServerTagConfig)[] = ['tag_size', 'modbus_reg_num']
const initialSection: ModbusServerTagConfig = { ...props.section }
const tagFieldLabels = {
  tag_name: $t('Register name'),
  tag_source: $t('Register source'),
  tag_value: $t('Register value'),
  tag_range: $t('Register range'),
  tag_type: $t('Register type'),
  tag_size: $t('Register size')
}

const isMissingSerialServerSelected = computed<boolean>(() => {
  return !!initialSection.modbus_dev_config && !formOptionsRef.value.serialServers.some((s: ModbusSerialServerConfig) => s.id === props.section.modbus_dev_config)
})
if (isMissingSerialServerSelected.value) {
  notification.error($t('Referenced server configuration is missing.'))
}
const serialServerOptions = computed<[string, string][]>(() => {
  let serverSectionExists = false
  const options: [string, string][] = formOptionsRef.value.serialServers.map((s: ModbusSerialServerConfig) => {
    if (s.id === initialSection.modbus_dev_config) serverSectionExists = true
    return [s.id, s.name]
  })
  if (!serverSectionExists) {
    options.push([initialSection.modbus_dev_config!, initialSection.modbus_dev_config!])
  }
  return options
})
const registerNumberEnd = computed<string>(() => {
  const registerRange = getOccupiedRegisterRange(props.section.modbus_reg_num, props.section.modbus_type, getTagSize(props.section))
  if (registerRange && REGISTER_RANGE_LIMITS[0] <= registerRange[1] && registerRange[1] <= REGISTER_RANGE_LIMITS[1]) {
    return registerRange[1].toString()
  }
  return '-'
})
const functionOptions: [ModbusReadFunctionType, string][] = [
  ['1', $t('Coils (1)')],
  ['2', $t('Input coils (2)')],
  ['3', $t('Holding registers (3)')],
  ['4', $t('Input registers (4)')]
]

function validateTagSize(value: string) {
  if (!props.section.modbus_type) return { isValid: true }
  const totalSizeOfRegisters = getModbusDataBytes(props.section.modbus_type) * (REGISTER_RANGE_LIMITS[1] - REGISTER_RANGE_LIMITS[0] + 1)
  return rules.irange(value, 1, totalSizeOfRegisters)
}

function validateRegisterRange(value: string) {
  const tagSize = getTagSize(props.section)
  if (!tagSize || !props.section.modbus_type) return { isValid: true }
  const regNumbers = Math.ceil(tagSize / getModbusDataBytes(props.section.modbus_type)) - 1
  return rules.irange(value, REGISTER_RANGE_LIMITS[0], Math.max(REGISTER_RANGE_LIMITS[1] - regNumbers, REGISTER_RANGE_LIMITS[0]))
}

function validateOverlap(section: ModbusServerTagConfig, uciData: { tags: ModbusServerTagConfig[]; [key: string]: any }) {
  if (section.enabled !== '1') return { isValid: true }

  const servers = formOptionsRef.value.isTcp ? formOptionsRef.value.tcpServers : formOptionsRef.value.serialServers
  return validateRegisterOverlap(section, uciData, formOptionsRef.value.isTcp, servers)
}

function triggerRelatedFieldValidations(self: { uciSection: ModbusServerTagConfig; vuciSection: any }) {
  const name = self.uciSection.id
  Array.from(self.vuciSection.forms[name]).forEach(inputRef => relatedFields.includes(inputRef.name) && inputRef.validate())
}
</script>
