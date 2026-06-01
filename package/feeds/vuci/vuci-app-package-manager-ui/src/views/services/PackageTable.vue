<template>
  <tlt-table
    id="packages"
    ref="packagesTable"
    v-model:selected="currentlySelected"
    :search="searchValue"
    id-key="package"
    :title="$t('Package manager')"
    :data-source="arePackagesLoading ? [] : sortedPackages"
    :columns="packageColumns"
    :bulk-actions="bulkActions"
    :table-actions="tableActions"
    :row-actions="getRowActions"
    pagination
  >
    <template #before="{ uniqueEntries }">
      <tlt-content-distributor
        :values="uniqueEntries"
        index="status"
        :color-map="colorMap"
        class="mx-2 mb-5"
      />
    </template>
    <template
      v-if="arePackagesLoading && !formLoading"
      #emptySection
    >
      <div class="flex flex-col items-center w-full my-4">
        <tlt-icon
          icon="spinner"
          class="text-theme-text-primary items-center size-16"
          animate
        />
        <span class="font-bold">{{ $t('Loading packages...') }}</span>
      </div>
    </template>
    <template #tlt_name="{ record }">
      <div
        :ref="`description-${record?.tlt_name}`"
        class="w-fit"
      >
        <router-link
          v-if="record?.url && record?.type === packageTypes.INSTALLED"
          :to="record.url"
          class="text-theme-text-primary visited:text-theme-text-primary"
          test-id="package-service-link"
        >
          {{ record.tlt_name }}
        </router-link>
        <span v-else>
          {{ record?.tlt_name }}
        </span>
      </div>
      <tlt-popover
        v-if="record?.description"
        :target="() => $refs[`description-${record.tlt_name}`]"
        triggers="hover"
        placement="right-start"
        :title="$t('Description')"
        >{{ record.description }}</tlt-popover
      >
    </template>
    <template #status="{ record }">
      <div class="flex items-center gap-2.5">
        <div :ref="`badge-${record?.tlt_name}`">
          <tlt-badge
            :test-id="record?.id"
            :custom-color="getStatus(record?.type)?.color"
            type="primary"
          >
            {{ getStatus(record?.type)?.text }}
          </tlt-badge>
          <tlt-popover
            v-if="record?.type === packageTypes.PENDING_ERRORED || (record?.type === packageTypes.ERRORED && record?.errors?.length !== 0)"
            :target="() => $refs[`badge-${record.tlt_name}`]"
            triggers="hover"
            placement="bottom-start"
            :title="$t('Error')"
            >{{ getActionErrorTranslate(record?.errors?.[0]?.code, 'download') }}</tlt-popover
          >
        </div>
        <div
          v-if="record?.messages && record?.type === packageTypes.INSTALLED"
          :ref="`status-warning-${record.tlt_name}`"
        >
          <tlt-icon
            icon="warning"
            class="text-theme-text-warning"
          />
          <tlt-popover
            :target="() => $refs[`status-warning-${record.tlt_name}`]"
            triggers="hover"
            placement="bottom-end"
            :title="$t('Network restart')"
          >
            {{ messageTranslates[record.messages[0].code as keyof typeof messageTranslates] }}
            <tlt-button
              class="text-theme-text-primary"
              type="text"
              @click="setPackagePrompt('network_restart', record as PackageData)"
            >
              {{ $t('Restart network') }}
            </tlt-button>
          </tlt-popover>
        </div>
      </div>
    </template>
  </tlt-table>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { sortCollection } from '@ui-core/plugins/helper'
import { usePackageConstants } from '../../components/services/composables/usePackageConstants'
import { getActionErrorTranslate, isUpgradeFailed } from '../../components/services/packageSharedUtils'
import { usePackageTableActions } from '../../components/services/composables/actions/usePackageTableActions'
import type { PackageData, PromptContext, PackageActionOptions } from '@/types/packageTypes'
import type { TableColumn, Action } from '@ui-core/components/table/types'

interface PackageTableProps {
  packages: PackageData[]
  searchValue?: string
  arePackagesLoading?: boolean
  isActionRunning?: boolean
  resetSelectedPackages?: boolean
  handlePackageListRefresh: (refreshPackageList: boolean) => Promise<void>
}

const props = defineProps<PackageTableProps>()
const emit = defineEmits<{
  (event: 'open-prompt', promptContext: PromptContext): void
  (event: 'close-prompt'): void
  (event: 'update-packages', packagesToUpdate: Array<string>, actionOptions: PackageActionOptions): void
  (event: 'reset-selected-packages'): void
}>()

const $t = useTranslate()
const store = useMainStore()

watch(
  () => props.resetSelectedPackages,
  newValue => {
    if (newValue) {
      currentlySelected.value = []
      emit('reset-selected-packages')
    }
  }
)

const { tableActions: packageTableActions } = usePackageTableActions(emit as (event: string, ...args: any[]) => void)
const { packageTypes, runningPackageTypes, statusData } = usePackageConstants()

const currentlySelected = ref<string[]>([])

const colorMap = ref(Object.fromEntries(Object.values(statusData).map(v => [v.text, v.color])))

const messageTranslates = {
  11: $t('For service to function correctly it is required to')
}

const packageColumns = [
  { dataIndex: 'tlt_name', title: $t('Package'), actions: { sort: true } },
  {
    dataIndex: 'status',
    title: $t('Status'),
    actions: {
      filter: {
        type: 'uniqueValues'
      }
    }
  }
] as TableColumn[]

const tableActions = computed(
  () =>
    [
      {
        id: 'refresh',
        callback: () => props.handlePackageListRefresh(true),
        buttonProps: { disabled: props.arePackagesLoading || props.isActionRunning, iconLeft: 'refresh' },
        label: $t('Refresh'),
        hints: props.isActionRunning ? { title: $t('Refresh'), info: $t('Package list cannot be refreshed while packages are being installed/removed.') } : null
      },
      {
        id: 'upload',
        callback: () => setPackagePrompt('upload'),
        buttonProps: { disabled: props.isActionRunning, iconLeft: 'upload-export' },
        label: $t('Upload package'),
        hints: props.isActionRunning ? { title: $t('Upload'), info: $t('Packages cannot be uploaded while other packages are being installed/removed.') } : null
      },
      'column-list',
      'search'
    ] as Action[]
)

const bulkActions = computed(() => {
  const values = currentlySelected.value.map(value => props.packages.find(pkg => pkg.package === value))
  return [
    {
      id: 'install',
      label: $t('Install'),
      buttonProps: { iconLeft: 'install', disabled: !values.some(value => !packageTableActions?.install?.()?.options?.filterTypes?.includes(value?.type || 0)) },
      callback: () => setPackagePrompt('install_bulk')
    },
    { id: 'upgrade', label: $t('Upgrade'), buttonProps: { iconLeft: 'renew', disabled: !values.some(value => value?.upgrade) }, callback: () => setPackagePrompt('upgrade_bulk') },
    {
      id: 'remove',
      label: $t('Remove'),
      buttonProps: { iconLeft: 'delete', disabled: !values.some(value => !packageTableActions?.remove?.()?.options?.filterTypes?.includes(value?.type || 0)), color: 'error' },
      callback: () => setPackagePrompt('remove_bulk')
    }
  ] as Action[]
})

const formLoading = computed(() => store.formLoading)

const sortedPackages = computed(() => {
  const sortedByType: PackageData[][] = [[], [], [], [], [], [], [], []]
  const sortedByName = sortCollection(props.packages, 'tlt_name')
  sortedByName.forEach((pkg: PackageData) => {
    pkg.status = statusData[pkg.type as keyof typeof statusData].text
    sortedByType[pkg.type - 1].push(pkg)
  })
  const [pending, available, installed, pendingError, installing, updating, removing, errorPackages] = sortedByType
  return [...installing, ...updating, ...removing, ...installed, ...pending, ...pendingError, ...errorPackages, ...available]
})

function getFilteredPackages(actionName: string) {
  const { filterTypes = [], allowException = () => true, filterException = () => false } = packageTableActions?.[actionName]?.()?.options || {}
  return currentlySelected.value.reduce<PackageData[]>((acc, value) => {
    const pkg = props.packages.find(pkg => pkg.package === value)
    if (pkg && allowException(pkg) && (filterException(pkg) || ![...runningPackageTypes, ...filterTypes].includes(pkg.type))) {
      acc.push(pkg)
    }
    return acc
  }, [])
}

function getRowActions(record: PackageData) {
  const actions = []
  if (record.type === packageTypes.AVAILABLE || record.type === packageTypes.REMOVING)
    actions.push({
      id: 'add',
      buttonProps: { readonly: record.type === packageTypes.REMOVING },
      callback: () => setPackagePrompt('install', record),
      label: $t('Install')
    })
  if (record.type === packageTypes.PENDING || record.type === packageTypes.PENDING_ERRORED)
    actions.push({
      id: 'remove_pending',
      buttonProps: { color: 'error' },
      callback: () => setPackagePrompt('pending', record),
      label: $t('Remove')
    })
  if (record.type === packageTypes.ERRORED && record?.errors?.[0]?.code === 15)
    actions.push({
      id: 'remove_retry',
      callback: () => setPackagePrompt('remove_retry', record),
      label: $t('Retry')
    })
  if (
    (record.type === packageTypes.PENDING_ERRORED || (record.type === packageTypes.ERRORED && record?.errors?.[0]?.code !== 15)) &&
    record.version !== '-' &&
    !record?.upgrade &&
    !isUpgradeFailed(record)
  )
    actions.push({
      id: 'install',
      callback: () => setPackagePrompt('retry', record),
      label: $t('Retry')
    })
  if ((record.upgrade && !([packageTypes.UPDATING, packageTypes.REMOVING] as number[]).includes(record.type)) || isUpgradeFailed(record)) {
    actions.push({
      id: 'upgrade',
      callback: () => setPackagePrompt('upgrade', record),
      label: $t('Upgrade')
    })
  }
  if (record.type === packageTypes.INSTALLED || record.type === packageTypes.INSTALLING || record.type === packageTypes.UPDATING || isUpgradeFailed(record))
    actions.push({
      id: 'remove',
      buttonProps: { color: 'error', readonly: record.type === packageTypes.INSTALLING || record.type === packageTypes.UPDATING },
      callback: () => setPackagePrompt('remove', record),
      label: $t('Remove')
    })
  return actions as Action[]
}

function getStatus(key: number) {
  return statusData[key as keyof typeof statusData]
}

function setPackagePrompt(actionName: string, packageData: PackageData | null = null) {
  if (actionName !== 'upload') {
    return emit('open-prompt', {
      actionName,
      packageName: packageData?.tlt_name || '',
      packageData: packageData ? [packageData] : getFilteredPackages(actionName)
    })
  }
  emit('open-prompt', { actionName })
}
</script>
