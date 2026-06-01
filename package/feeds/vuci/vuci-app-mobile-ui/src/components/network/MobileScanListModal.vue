<template>
  <tlt-modal
    :open="props.showModal"
    size="big"
    @close="closeModal"
  >
    <tlt-card :title="$t('Scanned operators')">
      <tlt-tabs
        v-model:selected="modem"
        :tabs="modemTabs"
        @update:selected="loadPreviousScanData"
      >
        <template
          v-for="tab in modemTabs"
          #[tab.name]
          :key="tab.name"
        >
          <tlt-table
            id="mobile_operators"
            :columns="opColumns"
            :data-source="operators"
            :no-value-text="$t('Currently no operators available')"
          >
            <template #status="{ record }">
              <tlt-badge
                :type="record.status.color"
                class="py-1.5"
              >
                {{ record.status.value }}
              </tlt-badge>
            </template>
            <template #actions="{ record }">
              <tlt-hint :hints="opAlreadyAdded(record.numName)">
                <tlt-button
                  button-id="add"
                  icon-left="add-square"
                  color="tertiary"
                  :readonly="!!opAlreadyAdded(record.numName).length"
                  @click="addToList(record)"
                >
                  {{ props.networkSelection ? $t('Select') : $t('Add to operator list') }}
                </tlt-button>
              </tlt-hint>
            </template>
            <template #after>
              <div class="pt-8">
                {{ $t('Last scan: %s').format(scanDate) }}
              </div>
            </template>
          </tlt-table>
        </template>
      </tlt-tabs>
      <div class="w-max ml-auto flex gap-4">
        <tlt-button
          id="scanOp"
          button-id="scan"
          :icon-left="showResults ? 'refresh' : 'mobile'"
          :readonly="!!scanDisabled(currentModem!)"
          @click="performScan(!showResults)"
        >
          {{ showResults ? $t('Repeat scan') : $t('Scan for operators') }}
        </tlt-button>
        <tlt-popover
          v-if="scanDisabled(currentModem!)"
          target="#scanOp"
        >
          {{ scanDisabled(currentModem!) }}
        </tlt-popover>
      </div>
    </tlt-card>
  </tlt-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ModemInfo, OperatorScanList } from '@/types/mobileTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMobileOperatorUtils } from '@/composables/useMobileOperatorUtils'

const $t = useTranslate()

interface Props {
  showModal: boolean
  networkSelection?: boolean
  modemList: ModemInfo[]
  scanList: Array<{ last_scan: string; modem: string; operators: OperatorScanList[] }>
  codeList?: string[]
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'add-operator', operator: { numName: string }): void
  (event: 'close', showPrompt: boolean): void
}>()

const modem = ref('')

const { scanDisabled, getPreviousScan, scanOperators, showScanPrompt, operators, showResults, scanDate } = useMobileOperatorUtils()

const currentModem = computed(() => {
  return modem.value ? props.modemList.find(m => m.id === modem.value) : props.modemList[0]
})

const modemTabs = computed(() => {
  return props.modemList.map(modem => ({
    name: modem.id,
    title: modem.name
  }))
})

const opColumns = computed(() => {
  return [
    { dataIndex: 'opName', title: $t('Operator Name'), help: $t('Operator name.'), actions: { sort: true } },
    { dataIndex: 'shortName', title: $t('Short Name'), help: $t('Shortened name of operator.'), actions: { sort: true } },
    { dataIndex: 'numName', title: $t('Numeric Name'), help: $t('Operator code.'), actions: { sort: true } },
    { dataIndex: 'country', title: $t('Country'), help: $t('Country name.'), actions: { sort: true } },
    { dataIndex: 'netAccessType', title: $t('Network Type'), help: $t('Supported network type by operator.'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
    {
      dataIndex: 'status',
      title: $t('Status'),
      help: $t('Operator status.'),
      displayFn: (status: { value: string; color: string }) => status.value,
      actions: { sort: true, filter: { type: 'uniqueValues' } }
    },
    {
      dataIndex: 'actions',
      title: $t('Actions'),
      help: props.networkSelection ? $t('Select the operator to which you want to connect.') : $t('Add operator to the operator list.'),
      actions: { sort: false }
    }
  ]
})

function opAlreadyAdded(numName: string) {
  if (!props.codeList?.includes(numName)) return ''
  return props.networkSelection ? $t('Operator already selected') : $t('Operator already exists in the list')
}

function loadPreviousScanData() {
  operators.value = getPreviousScan(props.scanList, currentModem.value!)
}

function performScan(showPrompt = false) {
  if (showPrompt) {
    return showScanPrompt(currentModem.value!)
  }
  scanOperators(currentModem.value!)
}

function addToList(operator: { numName: string }) {
  emit('add-operator', operator)
}

function closeModal() {
  emit('close', false)
}
</script>
