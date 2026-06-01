<template>
  <tlt-modal
    :open="modelValue"
    size="big"
    :nav-bar="[...modalNavigation(), title]"
    @close="back"
  >
    <tlt-table
      id="dhcp_option"
      ref="table"
      :columns="columns"
      :data-source="currentData"
      :no-value-text="$t('There are no DHCP options set')"
      :title="title"
      section-name="dhcp_options"
      :table-actions="['column-list', 'search']"
    >
      <template #key="{ record }">
        <tlt-form-item-select
          v-model="record.key"
          :uci-section="record"
          prop="key"
          :options="dhcpOptions"
          :rules="['uinteger', () => validateIgnored(record)]"
          allow-create
          @change="validate"
        />
      </template>
      <template #value="{ record }">
        <tlt-form-item-input
          :ref="el => (valueRefs[record.id] = el)"
          v-model="record.value"
          :uci-section="record"
          prop="value"
          :readonly="record.ignore"
          :rules="(v: string) => [validateDuplicate.bind(v, record), v[dhcpValidations[record.key] ?? dhcpValidations.default]]"
          :required="!record.ignore"
          @change="validate"
        />
      </template>
      <template #ignore="{ record }">
        <tlt-form-item-switch
          v-model="record.ignore"
          :uci-section="record"
          prop="ignore"
          @change="
            () => {
              ignoreChange(record)
              validate()
            }
          "
        />
      </template>
      <template #remove="{ record }">
        <tlt-button
          button-id="delete"
          type="text"
          color="error"
          size="md"
          @click="delSection(record.id)"
          >{{ $t('Delete') }}
        </tlt-button>
      </template>
    </tlt-table>
    <div class="flex justify-between list-layout--ignore">
      <tlt-button
        button-id="add"
        @click="add"
      >
        {{ $t('Add') }}
      </tlt-button>
      <tlt-button
        button-id="save"
        @click="save"
      >
        {{ $t('Save') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script lang="ts" setup>
import { useMessages, usePrompt } from '@/stores/messages'
import type { DhcpV4Config } from '@/types/dhcpTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import type TltFormItemInput from '@ui-core/tlt-design/form/tltFormItemInput.vue'
import { inject, ref, watch, type ComponentInstance } from 'vue'

type ExtraOption = { id: number; key: string; value?: string; ignore: boolean }

const props = defineProps<{ section: DhcpV4Config }>()
const model = defineModel<boolean>({ required: true })

const $t = useTranslate()
const prompt = usePrompt()
const message = useMessages()

const setSection = inject('setSection') as (func: (s: DhcpV4Config) => void) => void
const modalNavigation = inject('modalNavigation') as Function

const columns = [
  { dataIndex: 'key', width: '33.333%', title: $t('Option code'), help: $t('Standardized DHCP option code.') },
  { dataIndex: 'value', width: '33.333%', title: $t('Option value'), help: $t('Value that will be set for selected option.') },
  { dataIndex: 'ignore', width: '16.666%', title: $t('Do not send'), help: $t('Force this value to not be sent.') },
  { dataIndex: 'remove', width: '16.666%', title: $t('Actions') }
]
const currentData = ref<ExtraOption[]>([])

const title = $t('DHCP options')
const dhcpOptions = [
  ['2', $t('Time offset (2)')],
  ['3', $t('Router (3)')],
  ['6', $t('DNS (6)')],
  ['15', $t('Domain name (15)')],
  ['42', $t('NTP server (42)')]
]
const dhcpValidations = {
  2: 'integer',
  3: 'ip4addr',
  6: 'ip4addr',
  15: 'string',
  42: 'ip4addr',
  default: 'string'
}

function validateIgnored(s: ExtraOption) {
  const ignoredKey = currentData.value.find(data => data.ignore && data.key === s.key)
  return {
    isValid: !ignoredKey || ignoredKey.id === s.id,
    message: $t('Key "%s" cannot have duplicates because it has a "%s" set').format(s.key, $t('Do not send'))
  }
}
function validateDuplicate(s: ExtraOption) {
  if (currentData.value.some(data => data.id !== s.id && data.key === s.key && data.value === s.value))
    return {
      isValid: false,
      message: $t('Duplicate values with same option code are not allowed.')
    }
  return { isValid: true }
}

function add() {
  currentData.value.push({ id: currentData.value.length, key: dhcpOptions[0][0], ignore: false })
}

function delSection(id: number) {
  const index = currentData.value.findIndex(option => option.id === id)
  currentData.value.splice(index, 1)
  validate()
}

async function save() {
  if ((await validate()) === false) return message.error($t('Some fields are invalid'))
  const parsedData = parseConfigBack(currentData.value)
  setSection(section => (section.dhcp_option = parsedData))
  model.value = false
}

const valueRefs = ref<Record<number, ComponentInstance<typeof TltFormItemInput> | null>>({})
async function validate() {
  const values = Object.values(valueRefs.value).filter(e => e) as Array<ComponentInstance<typeof TltFormItemInput>>
  const validations = await Promise.all(values.map(value => value.validate() as Promise<boolean>))
  return validations.every(validation => validation)
}

function parseConfigBack(config: ExtraOption[]) {
  const groupedOptionSparseArray = config.reduce<string[][]>((arr, { key, value, ignore }) => {
    const keyNumber = Number(key)
    if (ignore || !value) arr[keyNumber] = []
    else if (arr[keyNumber]) arr[keyNumber].push(value)
    else arr[keyNumber] = [value]
    return arr
  }, [])
  const parsedOptionsSparseArray = groupedOptionSparseArray.map((values, key) => {
    return [key.toString()].concat(values).join(',')
  })
  return Object.values(parsedOptionsSparseArray)
}

function back() {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      model.value = false
    }
  })
}

function ignoreChange(record: ExtraOption) {
  if (record.ignore) record.value = ''
}

function parseConfig(config: string[]) {
  let id = 0
  return config.reduce<ExtraOption[]>((arr, optionString) => {
    const [key, ...values] = optionString.split(',')
    const options = values.length === 0 ? [{ key, ignore: true, id: id++ } satisfies ExtraOption] : values.map<ExtraOption>(value => ({ key, value, ignore: false, id: id++ }))
    return arr.concat(options)
  }, [])
}

watch(model, val => {
  if (!val) return
  // When there is no options set ui-core makes it to empty string as default
  const normalizedOptions = props.section.dhcp_option ?? []
  currentData.value = parseConfig(normalizedOptions)
})
</script>
