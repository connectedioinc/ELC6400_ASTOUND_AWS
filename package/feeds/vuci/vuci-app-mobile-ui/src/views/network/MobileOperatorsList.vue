<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="operctl"
    :after-load="afterLoad"
    :before-save="beforeSave"
  >
    <vuci-typed-section
      :title="$t('Lists of operators')"
      :help="$t('Section for management and grouping of operators.')"
      type="operlist"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'operator_lists/config' }]"
      data-key="operators"
      :add="beforeAdd"
      :after-save="afterSave"
      :edit-form="MobileOperatorsListEdit"
      :exception-options="['mcc_mnc']"
      @edit-modal-closed="editClosed"
    >
      <template #custom-design="{ s, actions, index }">
        <div class="mb-4">
          <tlt-horizontal-card
            :test-id="`rowCard-${s.id}`"
            :class="{ 'rounded-b-none!': cardStates?.[s.id] }"
          >
            <card-cell>
              <cell-row :label="$t('Operator list name')">
                <template #value>
                  <div class="text-theme-text-primary font-semibold">
                    <tlt-dummy-value :value="s.name" />
                  </div>
                </template>
              </cell-row>
            </card-cell>
            <action-cell>
              <cell-row
                :label="$t('Operator list actions')"
                only-mobile-label
              >
                <template #value>
                  <div class="lg:min-w-max flex flex-wrap gap-2.5">
                    <tlt-hint :hints="!opScanSupported ? $t('Operator scan is not supported on this modem.') : ''">
                      <tlt-button
                        button-id="scan-list"
                        type="text"
                        size="md"
                        :readonly="!opScanSupported"
                        @click="showModal = s.id"
                      >
                        {{ $t('Scan list') }}
                      </tlt-button>
                    </tlt-hint>
                    <slot name="actions">
                      <vuci-form-edit-delete
                        :id="s.id"
                        :actions="actions"
                      >
                        <template #edit="{ openEdit }">
                          <tlt-hint :hints="disableEdit(s)">
                            <tlt-button
                              button-id="edit"
                              type="text"
                              icon-left="edit"
                              :readonly="!!disableEdit(s)"
                              @click="openEdit(s.id)"
                            >
                              {{ $t('Edit') }}
                            </tlt-button>
                          </tlt-hint>
                        </template>
                      </vuci-form-edit-delete>
                    </slot>
                  </div>
                </template>
              </cell-row>
            </action-cell>
            <action-cell>
              <slot name="dropdown">
                <button
                  type="button"
                  @click="() => toggleDropdown(s.id)"
                >
                  <tlt-icon
                    icon="dropdown-arrow"
                    :class="{ 'rotate-180': cardStates[s.id] }"
                  />
                </button>
              </slot>
            </action-cell>
          </tlt-horizontal-card>
          <tlt-collapse-transition>
            <div
              v-show="cardStates?.[s.id]"
              :key="s.id"
              :class="s && 'rounded-bl-md rounded-br-md'"
              class="border-t-0 border overflow-clip"
            >
              <tlt-table
                :id="`operator-code-table-${s.id}`"
                class="operator-code-table border-t -m-px"
                :columns="opCodeColumns"
                :data-source="opCodeList[s.id]"
              >
                <template #code="{ record }">
                  <tlt-form-item-select
                    v-if="record.edit"
                    v-model="record.code"
                    prop="mcc_mnc"
                    :help="$t('3 characters long code will select all operators with the corresponding Mobile Country Code (MCC). 5 or 6 characters long code will select specific operator code.')"
                    :rules="[(v: string) => $utils.validateNoDuplicates(opCodeList[s.id], 'code', v, $t('code')), 'number_leading_zeros', (v: string) => rules.exact_length(v, [3, 5, 6])]"
                    :options="operatorLists"
                    allow-create
                  />
                </template>
                <template #actions="{ record }">
                  <vuci-form-edit-delete
                    :id="record.id"
                    class="lg:min-w-max"
                    :edit="false"
                    :actions="actions"
                  >
                    <template #delete>
                      <tlt-button
                        button-id="delete-code"
                        type="text"
                        color="error"
                        size="md"
                        @click="removeCode(record.pos, s.id)"
                      >
                        {{ $t('Delete') }}
                      </tlt-button>
                    </template>
                  </vuci-form-edit-delete>
                </template>
                <template #add_action>
                  <div ref="addBtn">
                    <tlt-button
                      button-id="add-code"
                      type="text"
                      @click="addNewCode(s.id)"
                    >
                      <tlt-icon
                        icon="add-circle"
                        class="size-5"
                        :solid="false"
                      />
                      {{ $t('Add new code') }}
                    </tlt-button>
                  </div>
                </template>
                <template #action-design>
                  <div class="flex mb-4 mr-4">
                    <tlt-button
                      button-id="add"
                      type="text"
                      size="md"
                      @click="actions.create"
                    >
                      <tlt-icon
                        icon="add-circle"
                        class="size-5"
                        :solid="false"
                      />
                      {{ $t('Add new') }}
                    </tlt-button>
                  </div>
                </template>
              </tlt-table>
            </div>
          </tlt-collapse-transition>
        </div>
        <div v-if="!formData.operators.length && index === 0">
          {{ $t('No operator lists found') }}
        </div>
      </template>
    </vuci-typed-section>
    <MobileScanListModal
      v-if="showModal"
      :show-modal="!!showModal"
      :modem-list="modemList"
      :scan-list="scanList"
      :code-list="codeList"
      @add-operator="addToList"
      @close="showModal = ''"
    />
  </vuci-form>
</template>

<script setup lang="ts">
import { computed, provide, ref, nextTick } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { mobile } from '@/plugins/mobile'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import type { ModemInfo, OperatorListConfig, ApnDbConfig, OperatorScanList } from '@/types/mobileTypes'
import MobileOperatorsListEdit from './MobileOperatorsListEdit.vue'
import MobileScanListModal from '../../components/network/MobileScanListModal.vue'
import { rules } from '@/validation-rules'

const $t = useTranslate()
const message = useMessages()
const prompt = usePrompt()

interface FormData {
  operators: OperatorListConfig[]
}

const formData = ref<FormData>({ operators: [] })

const countries = ref<Array<[string, string]>>([])
const modemList = ref<ModemInfo[]>([])
const apnList = ref<ApnDbConfig[]>([])
const scanList = ref<Array<{ last_scan: string; modem: string; operators: OperatorScanList[] }>>([])

const opList = computed(() => {
  return apnList.value.map(apn => [`${apn.mcc}${apn.mnc}`, `${apn.mcc}${apn.mnc} - ${apn.carrier}`])
})

const showModal = ref('')

provide('countriesList', countries)
provide('modemList', modemList)
provide('opList', opList)
provide('scanList', scanList)

const opScanSupported = computed(() => {
  return !!modemList.value.every(m => m.operators_scan)
})

const operatorLists = computed(() => {
  return [...countries.value, ...opList.value].sort((a, b) => a[0].localeCompare(b[0]))
})

function getTranslatedCode(code: string) {
  const found = operatorLists.value.find(o => o[0] === code)
  return found ? found[1] : code
}

interface OpCodeList {
  pos: number
  code: string
  edit?: boolean
}

const opCodeColumns = [
  { dataIndex: 'pos', title: $t('No'), width: 'w-10' },
  { dataIndex: 'code', title: $t('Operator code'), displayFn: (_: unknown, record: OpCodeList) => getTranslatedCode(record.code), actions: { filter: { type: 'uniqueValues' } } },
  { dataIndex: 'actions', title: $t('Action'), width: 'w-10' },
  {
    dataIndex: 'add',
    scopedSlots: { customHeader: 'add_action' },
    width: 'w-10'
  }
]

const opCodeList = ref<Record<string, OpCodeList[]>>({})
const tempRemoved = ref<string[]>([])

function updateOpCodeList() {
  const newList = formData.value.operators.map(curr => [curr.id, curr.mcc_mnc?.map((code, idx) => ({ pos: idx + 1, code })) || []])
  opCodeList.value = Object.fromEntries(newList)
  tempRemoved.value = []
}

function addNewCode(id: string) {
  const pos = opCodeList.value[id].length + 1
  opCodeList.value[id].push({ pos, code: '', edit: true })
}

const codeList = computed(() => {
  if (!showModal.value) return []
  return opCodeList.value[showModal.value].map(o => o.code) || []
})

function removeCode(codeId: number, sectionId: string) {
  return prompt.show({
    title: $t('Delete this operator code?'),
    content: $t('The operator code will be removed from the list once the changes are saved.'),
    okText: $t('Delete'),
    cancelText: $t('Cancel'),
    onOk: () => {
      const codeIdx = opCodeList.value[sectionId]?.findIndex(c => c.pos === codeId)
      opCodeList.value[sectionId]?.splice(codeIdx!, 1)
      opCodeList.value[sectionId]?.forEach((c, idx) => {
        c.pos = idx + 1
      })
      tempRemoved.value.push(sectionId)
    }
  })
}

const cardStates = ref<Record<string, boolean>>({})

function toggleDropdown(id: string) {
  cardStates.value[id] = !cardStates.value[id]
}

const timer = useTimer({ method: updateModems, time: 3000 })

function operatorExists(val: string) {
  if (formData.value.operators.some(o => o.name === val)) {
    return { isValid: false, message: $t("Operator's list '%s' already exists").format(val) }
  }
  return { isValid: true }
}

function beforeAdd(section: OperatorListConfig) {
  let i = 1
  let name
  do {
    name = `opList${i}`
    i++
  } while (!operatorExists(name).isValid)
  section.name = name
}

function afterLoad() {
  return axios
    .bulkGet(['/api/modems/countries/status', '/api/modems/status', '/api/apn_database/config?group_by=mcc,mnc&limit=50&offset=0', '/api/modems/scan/status'])
    .then(([countriesList, modemListResp, apnListResp, scanListResp]) => {
      if (countriesList.success) countries.value = countriesList.data.map((country: { mcc: any; country: any }) => [country.mcc, `${country.mcc} - ${country.country}`])
      else message.error($t('Failed to load country list'))
      if (modemListResp.success) {
        modemList.value = mobile.parseModems(modemListResp.data)
      } else message.error($t('Failed to load modem status'))
      if (apnListResp.success) {
        apnList.value = apnListResp.data
        const total = apnListResp.metadata?.total || 0
        if (total > 50) {
          loadApns(total - 50)
        }
      } else message.error($t('Failed to load APN data'))
      if (scanListResp.success) {
        scanList.value = scanListResp.data
      } else message.error($t('Failed to load scanned operator list'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      updateOpCodeList()
      if (formData.value.operators[0]) cardStates.value[formData.value.operators[0].id] = true
      timer.start()
    })
}

function loadApns(limit: number) {
  return axios
    .get(`/api/apn_database/config?group_by=mcc,mnc&limit=${limit}&offset=50`)
    .then(res => {
      apnList.value.splice(50, limit, ...res.data)
    })
    .catch(() => {
      message.error($t('Failed to load APN data'))
    })
}

function updateModems() {
  return axios
    .bulkGet(['/api/modems/status', '/api/modems/scan/status'])
    .then(([modemListResp, scanListResp]) => {
      if (modemListResp.success && scanListResp.success) {
        modemList.value = mobile.parseModems(modemListResp.data)
        scanList.value = scanListResp.data
      } else message.error($t('Failed to load modem status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function beforeSave() {
  let hasDuplicates = false
  Object.entries(opCodeList.value).forEach(([, codes]) => {
    const codeArr = codes.map(c => c.code)
    const duplicates = codeArr.filter((code, idx) => codeArr.indexOf(code) !== idx)
    if (duplicates.length > 0) {
      hasDuplicates = true
    }
  })
  if (hasDuplicates) return Promise.reject($t('Configuration could not be saved. Some fields are invalid'))

  formData.value.operators.forEach(section => {
    section.mcc_mnc = opCodeList.value[section.id]?.map(c => c.code) || []
  })
}

function afterSave() {
  updateOpCodeList()
}

const lastList = computed(() => {
  return formData.value.operators[formData.value.operators.length - 1]
})

function editClosed() {
  const last = lastList.value?.id
  if (last && opCodeList.value[last] === undefined) cardStates.value[last] = true
  nextTick(() => updateOpCodeList())
}

function addToList(operator: { numName: string }) {
  if (opCodeList.value[showModal.value].find(op => op.code === operator.numName)) message.error($t('Operator already exists in the list'))
  else {
    opCodeList.value[showModal.value].push({ pos: opCodeList.value[showModal.value].length + 1, code: operator.numName })
    message.success($t('Operator added to the list'))
  }
}

function disableEdit(section: OperatorListConfig) {
  const notSaved = opCodeList.value[section.id]?.some(s => s.edit) || tempRemoved.value.includes(section.id)
  if (notSaved) return $t('The operator list name cannot be edited due to unsaved changes. Save the operator codes first to edit the operator list name.')
  return ''
}
</script>

<style scoped>
:deep(.operator-code-table) {
  --bg-color: var(--color-theme-bg-secondary-subtle, #f8f8f8);
}
:deep(.operator-code-table table th),
:deep(.operator-code-table table td) {
  background-color: var(--bg-color);
}
</style>
