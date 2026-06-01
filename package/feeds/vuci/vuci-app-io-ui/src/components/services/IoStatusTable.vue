<template>
  <tlt-table
    :id="`io_status_${title}`"
    :columns="columnsIO"
    :data-source="ioData"
    :title="title"
    :table-actions="['refresh', 'column-list', 'search']"
    @refresh="handleDataLoad"
  >
    <template #type="{ record }">
      <div class="flex items-center w-full gap-2">
        <div :class="['w-5 h-5 shrink-0 text-center rounded-xs text-white', ioPinData[record?.id as keyof typeof ioPinData].color]" />
        <div class="w-full">
          <tlt-form-model-item :element-id="record?.id + '_type'">
            <tlt-dummy-value
              class="pt-0"
              :value="ioPinData[record?.id as keyof typeof ioPinData].name(record as Io)"
            />
          </tlt-form-model-item>
        </div>
      </div>
    </template>

    <template #custom_name="{ record }">
      <tlt-overflow-hint :test-id="`text-${record?.id}_custom_name`">
        {{ record?.custom_name || '-' }}
      </tlt-overflow-hint>
    </template>

    <template #pin="{ record }">
      <tlt-form-model-item :element-id="record?.id + '_pin'">
        <tlt-dummy-value :value="record?.block_pins.join()" />
      </tlt-form-model-item>
    </template>

    <template #state="{ record }">
      <div class="flex gap-2">
        <tlt-form-model-item
          inline-input
          :element-id="record?.id + '_state'"
        >
          <tlt-overflow-hint :test-id="`text-${record?.id}_state`">
            {{ getIoState(record as Io) }}
          </tlt-overflow-hint>
        </tlt-form-model-item>
        <tlt-popover
          v-if="getStateHint(record as Io)"
          :target="() => $refs[record?.id + '_state']"
        >
          {{ getStateHint(record as Io) }}
        </tlt-popover>
        <div
          v-if="getStateHint(record as Io)"
          :ref="record?.id + '_state'"
          class="truncate"
        >
          <tlt-icon
            icon="warning"
            class="text-theme-text-warning size-5"
          />
        </div>
      </div>
    </template>

    <template #inversion="{ record }">
      <tlt-form-model-item :element-id="record?.id + '_inversion'">
        <tlt-dummy-value :value="getInversionValue(record as Io)" />
      </tlt-form-model-item>
    </template>

    <template #edit="{ record }">
      <tlt-button
        icon-left="edit"
        size="md"
        type="text"
        @click="openEdit(record as Io)"
        >{{ $t('Edit') }}</tlt-button
      >
    </template>
  </tlt-table>

  <io-status-edit
    :open="isEditOpen"
    :initial-section="editSection"
    @close="closeEdit"
  />
</template>

<script setup lang="ts">
import IoStatusEdit from '../../views/services/IoStatusEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useIoPinData } from '@/components/services/io/useIoPinData'
import { useIoStatusContext } from './useIoStatusContext'
import { copy } from '@ui-core/utils/vue-helpers'
import { ref, computed } from 'vue'
import type { Io } from '@/types/ioTypes'

interface IoStatusTableProps {
  title: string
  ioData: Io[]
}

const props = defineProps<IoStatusTableProps>()

const $t = useTranslate()

const { ioPinData, getIoState, getStateHint } = useIoPinData()
const { handleDataLoad } = useIoStatusContext()

const isEditOpen = ref(false)
const editSection = ref<Io | null>(null)

const defaultCols = [
  { dataIndex: 'type', title: $t('Type') },
  { dataIndex: 'pin', title: $t('Associated Pins') },
  { dataIndex: 'state', title: $t('State') },
  { dataIndex: 'inversion', title: $t('Inversion') },
  { dataIndex: 'edit', title: $t('Actions') }
]

const getInversionValue = (io: Io) => {
  if (io.direction !== 'in' && io.type !== 'dwi') return '-'
  return io.invert_input === '1' ? $t('On') : $t('Off')
}

const columnsIO = computed(() => {
  const cols = copy(defaultCols)
  if (props.ioData.some(pin => pin.custom_name)) {
    cols.splice(1, 0, { dataIndex: 'custom_name', title: $t('Custom Name') })
  }
  return cols
})

function closeEdit() {
  isEditOpen.value = false
  editSection.value = null
}

function openEdit(io: Io) {
  editSection.value = io
  isEditOpen.value = true
}
</script>
