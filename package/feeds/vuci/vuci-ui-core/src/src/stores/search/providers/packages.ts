import { computed, ref } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import type { SearchItem, SearchProvider } from '../'
import type { PackageData } from '@/types/packageTypes'
import { formBus } from '@ui-core/vuci-form'

export interface PackageSearchItem extends SearchItem {
  type: 'package'
  path: string
}

export default function createSearchProvider(): SearchProvider<PackageSearchItem> {
  const $t = useTranslate()
  const store = useMainStore()

  const loading = ref(false)

  const packageData = ref<PackageData[]>([])

  async function loadPackages() {
    if (!store.hasPackages('package-manager-api')) return

    loading.value = true
    packageData.value = []

    try {
      const { data } = await axios.get<PackageData[]>('/api/package_manager/all_packages/status', { preventCancel: true })
      packageData.value = data
    } finally {
      loading.value = false
    }
  }

  loadPackages()

  const items = computed<PackageSearchItem[]>(() => {
    return packageData.value
      .filter(pkg => pkg.type === 2)
      .map(pkg => ({
        id: `package-${pkg.package}`,
        type: 'package' as const,
        title: pkg.tlt_name || pkg.name || pkg.package,
        crumbs: [{ name: $t('System') }, { name: $t('Package Manager') }],
        path: `/system/package_manager?search=${encodeURIComponent(pkg.tlt_name || pkg.name || pkg.package)}`
      }))
  })

  formBus.on('package-event', loadPackages)

  return {
    id: 'packages',
    getItems: () => items.value,
    getItem: id => items.value.find(item => item.id === id) || null,
    options: {
      keys: ['title', obj => obj.crumbs?.map(crumb => crumb.name).join() || '']
    },
    isLoading: () => loading.value,
    cleanup: () => formBus.off('package-event', loadPackages)
  }
}
