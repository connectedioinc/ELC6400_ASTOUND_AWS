import { ref, reactive, computed } from 'vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios, type ApiResponse } from '@ui-core/plugins/axios'
import { useTimer } from '@ui-core/composables/useTimer'
import { usePackageConstants } from './usePackageConstants'
import type { PackageData, PackageActionOptions } from '@/types/packageTypes'
import type { MemoryStatus, FlashStatus } from '@/types/memoryStatusTypes'

export function usePackageStatus() {
  const $t = useTranslate()
  const message = useMessages()

  const { packageTypes, runningPackageTypes, nonUpgradableTypes } = usePackageConstants()

  const packages = ref<PackageData[]>([])
  const flash = reactive<FlashStatus>({
    flash_used: 0,
    flash_total: 0,
    flash_free: 0,
    flash_percentage: 0
  })

  const arePackagesLoading = ref(false)
  const isStatusStarted = ref(false)

  const isActionRunning = computed(() => {
    return packages.value.some(pkg => runningPackageTypes.includes(pkg.type as (typeof runningPackageTypes)[number]))
  })

  const timer = useTimer({
    method: () => handleStatusLoad(),
    time: 4000,
    autostart: false
  })

  function setStatusData(newData: PackageData[]) {
    newData.forEach(newPackageData => {
      const existingPackageIndex = packages.value.findIndex(packageData => packageData.tlt_name === newPackageData.tlt_name)
      if (existingPackageIndex !== -1) packages.value[existingPackageIndex] = newPackageData
      else packages.value.push(newPackageData)
    })
    packages.value = packages.value.filter(packageData => {
      return newData.some(newPackageData => newPackageData.tlt_name === packageData.tlt_name)
    })
  }

  function setPackageTypes(packagesToUpdate: string[], actionOptions: PackageActionOptions) {
    packages.value = packages.value.map(pkg => {
      if (packagesToUpdate.includes(pkg.package)) {
        return {
          ...pkg,
          type: runningPackageTypes.includes(pkg.type as (typeof runningPackageTypes)[number]) ? pkg.type : actionOptions?.packageType || 0
        }
      }
      return pkg
    })
  }

  function handleFlashLoad() {
    return axios
      .get('/api/system/device/usage/status?data=memory')
      .then(({ data }: ApiResponse<{ memory: MemoryStatus }>) => {
        Object.assign(flash, data.memory)
      })
      .catch(() => {
        message.error($t('Failed to load remaining flash data'))
      })
  }

  function handleStatusLoad(refreshPackageList = false) {
    return handleFlashLoad()
      .then(() => {
        return axios.get('/api/package_manager/all_packages/status' + (refreshPackageList ? '?refresh_package_list=1' : '')).then(({ data }: ApiResponse<PackageData[]>) => {
          setStatusData(data)
          packages.value.length === 0 ? timer.start() : timer.stop()
        })
      })
      .catch(() => {
        message.error($t('Failed to load packages'))
      })
  }

  function handlePackageListRefresh(refreshPackageList = false) {
    arePackagesLoading.value = true
    return handleStatusLoad(refreshPackageList).finally(() => {
      arePackagesLoading.value = false
    })
  }

  function handlePackageInstalledEvent(p: PackageData) {
    const pkgIdx = packages.value.findIndex(pkg => pkg.package === p.package)
    if (pkgIdx !== -1) {
      packages.value[pkgIdx] = { ...packages.value[pkgIdx], ...p }
    } else {
      packages.value.push(p)
    }
  }

  function handlePackageEvent(data: { package: PackageData; memory: FlashStatus }) {
    if (!data?.package || !data?.memory) return handleStatusLoad()
    Object.assign(flash, Object.fromEntries(Object.entries(data.memory).map(([key, value]) => [key, Number(value)])))
    const packageInfo = data.package
    packages.value = packages.value
      .filter(pkg => !(pkg.package === packageInfo.package && packageInfo.type === packageTypes.REMOVED))
      .map(pkg =>
        pkg.package === packageInfo.package
          ? {
              ...pkg,
              ...packageInfo,
              installed_version: packageInfo.type === packageTypes.INSTALLED ? pkg.version : undefined,
              upgrade: pkg.upgrade && !nonUpgradableTypes.includes(packageInfo.type as (typeof nonUpgradableTypes)[number])
            }
          : pkg
      )
  }

  return {
    flash,
    packages,
    arePackagesLoading,
    isStatusStarted,
    isActionRunning,
    handleStatusLoad,
    handlePackageInstalledEvent,
    handlePackageListRefresh,
    handlePackageEvent,
    setPackageTypes,
    setStatusData
  }
}
