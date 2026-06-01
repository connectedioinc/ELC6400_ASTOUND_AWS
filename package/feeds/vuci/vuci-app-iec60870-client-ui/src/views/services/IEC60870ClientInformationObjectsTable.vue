<template>
  <tlt-card>
    <tlt-form-item-input
      ref="scan_common_address"
      v-model="scanCommonAddress"
      prop="scan_common_address"
      :label="$t('Scanning common address')"
      :help="$t('Address from which information objects will be scanned.')"
      rules="irange(1, 65535)"
      initial="1"
      placeholder="1"
      required
    />

    <vuci-form-item-button
      :uci-section="uciSection"
      name="scan"
      type="button"
      size="sm"
      label=" "
      :readonly="isScanRunning"
      :loading="isScanRunning"
      :text="$t('Scan')"
      @click="onScanClick"
    />

    <tlt-card :title="$t('Selected information objects')">
      <tlt-table
        id="information-objects-table"
        v-model:current-page="currentPage"
        v-model:per-page="perPage"
        :columns="tableColumns"
        :data-source="toggleableInformationObjects"
        :pagination="toggleableInformationObjects.length > 10"
        id-key="id"
      >
        <template #keep="{ record }">
          <tlt-switch
            v-model="record.enabled"
            custom-id="keep"
          />
        </template>
        <template #name="{ record }">
          <tlt-form-item-input
            v-if="isRowEditActive(record)"
            v-model="editRow.name"
            prop="name"
            :rules="['no_control_codes', validateName]"
            maxlength="256"
          />
          <div v-else>
            {{ record.name || '-' }}
          </div>
        </template>
        <template #objectAddress="{ record }">
          <tlt-form-item-input
            v-if="isRowEditActive(record)"
            ref="objectAddress"
            v-model="editRow.objectAddress"
            prop="objectAddress"
            required
            :rules="['irange(0, 16777215)', validateDuplicateAddress]"
          />
          <div v-else>
            {{ record.objectAddress }}
          </div>
        </template>
        <template #commonAddress="{ record }">
          <tlt-form-item-input
            v-if="isRowEditActive(record)"
            ref="commonAddress"
            v-model="editRow.commonAddress"
            prop="commonAddress"
            required
            :rules="['irange(1, 65535)', validateDuplicateAddress]"
          />
          <div v-else>
            {{ record.commonAddress }}
          </div>
        </template>
        <template #actions="{ record }">
          <div class="flex flex-row gap-2">
            <tlt-button
              :disabled="editRow.id && !isRowEditActive(record)"
              button-id="edit"
              type="text"
              :icon-left="isRowEditActive(record) ? undefined : 'edit'"
              @click="isRowEditActive(record) ? saveRowEdit(record) : startRowEdit(record)"
            >
              {{ isRowEditActive(record) ? $t('Save') : $t('Edit') }}
            </tlt-button>
            <tlt-button
              v-if="isRowEditActive(record)"
              button-id="cancel"
              type="text"
              color="error"
              @click="cancelRowEdit(record)"
            >
              {{ $t('Cancel') }}
            </tlt-button>
          </div>
        </template>
      </tlt-table>

      <tlt-button
        class="ml-auto"
        button-id="add"
        @click="onAddClick"
      >
        {{ $t('Add') }}
      </tlt-button>
    </tlt-card>
  </tlt-card>
</template>

<script setup lang="ts">
import { watch, useTemplateRef, ref } from 'vue'
import { type InstanceConfiguration, type FormData, showInformationObjectErrors } from './IEC60870ClientCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

interface ToggleableInformationObject {
  enabled: bool
  name: string
  commonAddress: string
  objectAddress: string
  id: number
}

interface EditRow {
  id?: string
  name?: string
  objectAddress?: string
  commonAddress?: string
}

const commonAddressInput = useTemplateRef('commonAddress')
const objectAddressInput = useTemplateRef('objectAddress')

const $t = useTranslate()
const message = useMessages()
const props = defineProps<{
  uciSection: InstanceConfiguration
  informationObjects: string[] | undefined
  uciData: FormData
}>()
const emit = defineEmits<{
  (e: 'update:informationObjects', value: string[]): void
}>()

const lastRowId = ref<number>(0)
const editRow = ref<EditRow>({})

const currentPage = ref<number>()
const perPage = ref<number>()

const toggleableInformationObjects = ref<ToggleableInformationObject[]>([])
for (const ioTriplet of props.informationObjects || []) {
  const parts = ioTriplet.split(':')
  const io = addInformationObject()
  io.name = parts[0]
  io.objectAddress = parts[1]
  io.commonAddress = parts[2]
  io.enabled = true
}

watch(
  toggleableInformationObjects,
  newToggleableInformationObjects => {
    const triplets = []
    for (const io of newToggleableInformationObjects) {
      if (io.enabled) {
        triplets.push(`${io.name}:${io.objectAddress}:${io.commonAddress}`)
      }
    }
    emit('update:informationObjects', triplets)
  },
  { deep: true }
)

const tableColumns = [
  {
    dataIndex: 'name',
    title: $t('Name'),
    width: 'auto'
  },
  {
    dataIndex: 'objectAddress',
    title: $t('Object address'),
    width: 'auto'
  },
  {
    dataIndex: 'commonAddress',
    title: $t('Common address'),
    width: 'auto',
    actions: { filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'keep',
    title: $t('Keep'),
    help: $t('Which rows should be saved, if disabled then it will be removed.'),
    width: 'xs'
  },
  {
    dataIndex: 'actions',
    title: $t('Actions'),
    width: 'xs'
  }
]

function findInformationObject(commonAddress, objectAddress): ToggleableInformationObject | undefined {
  return toggleableInformationObjects.value.find(io => io.commonAddress === commonAddress && io.objectAddress === objectAddress)
}

function addInformationObject(): ToggleableInformationObject {
  const io = {
    id: `${lastRowId.value++}`,
    enabled: false,
    name: '',
    commonAddress: '',
    objectAddress: ''
  }
  toggleableInformationObjects.value.push(io)
  return io
}

function removeInformationObject(id: string) {
  let index = toggleableInformationObjects.value.findIndex(io => io.id === id)
  if (index !== -1) {
    toggleableInformationObjects.value.splice(index, 1)
  }
}

function findOrAddInformationObject(commonAddress, objectAddress): ToggleableInformationObject {
  let io = findInformationObject(commonAddress, objectAddress)
  if (io) {
    return io
  }

  io = addInformationObject()
  io.commonAddress = commonAddress
  io.objectAddress = objectAddress

  return io
}

async function onAddClick() {
  const io = addInformationObject()
  io.enabled = true
  startRowEdit(io)

  // Jump to last page, because that is where the new row will appear
  const totalPages = Math.ceil(toggleableInformationObjects.value.length / perPage.value)
  currentPage.value = totalPages
}

function validateName(v) {
  if (v.includes(':')) {
    return { isValid: false, message: $t("Name can't contain colon") }
  }

  return { isValid: true }
}

function startRowEdit(informationObject) {
  editRow.value = {
    id: informationObject.id,
    name: informationObject.name,
    objectAddress: informationObject.objectAddress,
    commonAddress: informationObject.commonAddress
  }
}

async function saveRowEdit(informationObject) {
  const results = await Promise.all([commonAddressInput.value.validate(), objectAddressInput.value.validate()])
  if (results.includes(false)) {
    return false
  }

  informationObject.name = editRow.value.name
  informationObject.commonAddress = editRow.value.commonAddress
  informationObject.objectAddress = editRow.value.objectAddress

  editRow.value.id = undefined

  return true
}

function cancelRowEdit(informationObject) {
  editRow.value.id = undefined

  // A row which was added, but was cancelled should be deleted.
  if (informationObject.commonAddress === '' || informationObject.objectAddress === '') {
    removeInformationObject(informationObject.id)
  }
}

function validateDuplicateAddress() {
  const commonAddress = commonAddressInput.value.modelValue
  const objectAddress = objectAddressInput.value.modelValue

  const io = findInformationObject(commonAddress, objectAddress)
  return {
    isValid: !(io && io.id !== editRow.value.id),
    message: $t('This combination of object address and common address already exists.')
  }
}

function isRowEditActive(informationObject) {
  return editRow.value.id === informationObject.id
}

async function validate() {
  if (!editRow.value.id) {
    return { isValid: true }
  }

  const io = toggleableInformationObjects.value.find(io => io.id === editRow.value.id)
  if (!(await saveRowEdit(io))) {
    return { isValid: false, message: $t('Configuration could not be saved. Selected information object is invalid') }
  }

  return { isValid: true }
}

const isScanRunning = ref(false)
const scanCommonAddress = ref('1')
const scanCommonAddressInput = useTemplateRef('scan_common_address')

async function onScanClick(self) {
  if (!(await self.vuciSection.validate())) {
    return
  }
  if (!(await scanCommonAddressInput.value.validate())) {
    return
  }

  const payload = {
    connection_type: props.uciSection.connection_type,
    // TODO: originator_address: props.uciSection.originator_address,
    ip: props.uciSection.ip,
    port: props.uciSection.port,
    common_address: scanCommonAddress.value
  }

  isScanRunning.value = true
  try {
    const response = await axios.post(`/api/iec60870/client/actions/list_information_objects`, { data: payload })

    showInformationObjectErrors(response.data.errors)

    const foundInformationObjects = response.data.information_objects
    if (foundInformationObjects.length > 0) {
      for (const informationObject of foundInformationObjects) {
        findOrAddInformationObject(informationObject.common_address.toString(), informationObject.information_object_address.toString())
      }

      toggleableInformationObjects.value.sort((a, b) => {
        const aCommonAddress = Number(a.commonAddress)
        const bCommonAddress = Number(b.commonAddress)
        if (aCommonAddress !== bCommonAddress) {
          return aCommonAddress > bCommonAddress ? 1 : -1
        }

        const aObjectAddress = Number(a.objectAddress)
        const bObjectAddress = Number(b.objectAddress)
        if (aObjectAddress !== bObjectAddress) {
          return aObjectAddress > bObjectAddress ? 1 : -1
        }

        return 0
      })
    }

    let showInfoMessage = true
    if (response.data.errors.length > 0) {
      // If an error occured and no information objects were found, don't even bother showing the success message.
      showInfoMessage = foundInformationObjects.length > 0
    }

    if (showInfoMessage) {
      message.info($t('Found %s information object(s)').format(foundInformationObjects.length))
    }
  } catch {
    message.error($t('Failed to scan information objects'))
    return
  } finally {
    isScanRunning.value = false
  }
}

defineExpose({
  validate
})
</script>
