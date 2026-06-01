import { useTranslate, useI18n } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { usePackageConstants } from '../usePackageConstants'
import { getActionErrorTranslate, isUpgradeFailed } from '../../packageSharedUtils'
import type { PackageData, PackageActions, PackageActionOptions } from '@/types/packageTypes'

export function usePackageTableActions(emit: (event: string, ...args: any[]) => void) {
  const $t = useTranslate()
  const i18n = useI18n()
  const store = useMainStore()
  const message = useMessages()

  const { packageTypes, runningPackageTypes } = usePackageConstants()

  const tableActions: PackageActions = {
    install: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.INSTALLED, packageTypes.INSTALLING],
        endpoint: '/api/package_manager/actions/install_multiple_packages',
        packageType: packageTypes.INSTALLING,
        successMessage: getMessageTemplate('success', $t('install')) || '',
        errorMessage: getMessageTemplate('error', $t('install')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Install '%s' package?").format(promptContext?.packageName),
          subtitle: $t('Once you install the package, it will add additional software on the device. A package can be removed from the device.'),
          submitText: $t('Install'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'info'
        }
      }
    },
    install_bulk: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.INSTALLED, packageTypes.INSTALLING],
        endpoint: '/api/package_manager/actions/install_multiple_packages',
        packageType: packageTypes.INSTALLING,
        successMessage: getMessageTemplate('success', $t('install')) || '',
        errorMessage: getMessageTemplate('error', $t('install')) || ''
      }
      return {
        options,
        prompt: {
          title: $t('Install selected packages?'),
          subtitle: $t('Once you install selected packages, it will add additional software on the device. Packages can be removed from the device.'),
          submitText: $t('Install'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'info'
        }
      }
    },
    retry: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.INSTALLED, packageTypes.INSTALLING],
        endpoint: '/api/package_manager/actions/install_multiple_packages',
        packageType: packageTypes.INSTALLING,
        successMessage: getMessageTemplate('success', $t('retry')) || '',
        errorMessage: getMessageTemplate('error', $t('retry')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Retry to install '%s' package?").format(promptContext?.packageName),
          subtitle: $t('Once you install the package, it will add additional software on the device. A package can be removed from the device.'),
          submitText: $t('Retry'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'info'
        }
      }
    },
    upgrade: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.UPDATING],
        allowException: (packageData: PackageData) => !!packageData.upgrade,
        endpoint: '/api/package_manager/actions/update_multiple_packages',
        packageType: packageTypes.UPDATING,
        successMessage: getMessageTemplate('success', $t('upgrade')) || '',
        errorMessage: getMessageTemplate('error', $t('upgrade')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Upgrade '%s' package?").format(promptContext?.packageName),
          subtitle: $t('Once you upgrade the package, it will promote additional software in the device.'),
          submitText: $t('Upgrade'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'info'
        }
      }
    },
    upgrade_bulk: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.UPDATING],
        allowException: (packageData: PackageData) => !!packageData.upgrade,
        endpoint: '/api/package_manager/actions/update_multiple_packages',
        packageType: packageTypes.UPDATING,
        successMessage: getMessageTemplate('success', $t('upgrade')) || '',
        errorMessage: getMessageTemplate('error', $t('upgrade')) || ''
      }
      return {
        options,
        prompt: {
          title: $t('Upgrade selected packages?'),
          subtitle: $t('Once you upgrade selected packages, it will promote additional software in the device.'),
          submitText: $t('Upgrade'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'info'
        }
      }
    },
    remove: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.AVAILABLE, packageTypes.REMOVING, packageTypes.ERRORED],
        filterException: (packageData: PackageData) => isUpgradeFailed(packageData),
        endpoint: '/api/package_manager/actions/remove_multiple_packages',
        packageType: packageTypes.REMOVING,
        handleCallback: handlePackageRemove,
        successMessage: getMessageTemplate('success', $t('remove')) || '',
        errorMessage: getMessageTemplate('error', $t('remove')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Remove '%s' package?").format(promptContext?.packageName),
          subtitle: $t('Once you remove the package, it will delete additional software from the device. A package can be re-installed to the device.'),
          submitText: $t('Remove'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'warning'
        }
      }
    },
    remove_bulk: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.AVAILABLE, packageTypes.REMOVING, packageTypes.ERRORED],
        endpoint: '/api/package_manager/actions/remove_multiple_packages',
        packageType: packageTypes.REMOVING,
        handleCallback: handlePackageRemove,
        successMessage: getMessageTemplate('success', $t('remove')) || '',
        errorMessage: getMessageTemplate('error', $t('remove')) || ''
      }
      return {
        options,
        prompt: {
          title: $t('Remove selected packages?'),
          subtitle: $t('Once you remove selected packages, it will delete additional software from the device. Packages can be re-installed to the device.'),
          submitText: $t('Remove'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'warning'
        }
      }
    },
    remove_retry: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.AVAILABLE, packageTypes.REMOVING],
        endpoint: '/api/package_manager/actions/remove_multiple_packages',
        packageType: packageTypes.REMOVING,
        handleCallback: handlePackageRemove,
        successMessage: getMessageTemplate('success', $t('retry')) || '',
        errorMessage: getMessageTemplate('error', $t('retry')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Retry to remove '%s' package?").format(promptContext?.packageName),
          subtitle: $t('Once you remove the package, it will delete additional software from the device. A package can be re-installed to the device.'),
          submitText: $t('Retry'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'warning'
        }
      }
    },
    pending: promptContext => {
      const options = {
        filterTypes: [...runningPackageTypes, packageTypes.AVAILABLE, packageTypes.REMOVING],
        endpoint: '/api/package_manager/actions/remove_multiple_packages',
        packageType: packageTypes.PENDING,
        handleCallback: handlePackageRemove,
        successMessage: getMessageTemplate('success', $t('remove')) || '',
        errorMessage: getMessageTemplate('error', $t('remove')) || ''
      }
      return {
        options,
        prompt: {
          title: $t("Remove '%s' package from pending list?").format(promptContext?.packageName),
          subtitle: $t('Once you remove the package, it will delete additional software in pending list from the device. A package can be re-installed to the device.'),
          submitText: $t('Remove'),
          submitAction: () => handleAction(promptContext?.packageData, options),
          icon: 'warning'
        }
      }
    }
  }

  function handleAction(packageData: PackageData[] = [], actionOptions: PackageActionOptions) {
    const { successMessage, errorMessage, endpoint, handleCallback } = actionOptions
    store.spin()
    const packageNames = packageData.map(pkg => pkg.package)
    const endpointData = { data: { packages: packageNames } }
    return axios
      .post(endpoint, endpointData)
      .then(() => handleCallback?.(packageData))
      .then(() => {
        emit('update-packages', packageNames, actionOptions)
        message.success(successMessage || '')
      })
      .catch(response => {
        const requestError = response?.data?.errors?.[0]?.code
        const messageErr = requestError ? message.error(getActionErrorTranslate(requestError, 'download')) : errorMessage
        if (messageErr) message.error(messageErr)
      })
      .finally(() => {
        emit('close-prompt')
        store.spin(false)
      })
  }

  function getMessageTemplate(type: string, action: string) {
    if (type === 'success') return $t('Package %s action started successfully').format(action)
    if (type === 'error') return $t('Package %s action failed').format(action)
  }

  function handlePackageRemove(packageData: PackageData[]) {
    removeSearchItem(packageData.map(pkg => pkg?.url || ''))
    const language = i18n.languages.find(l => l.code === store.lang)
    const isLanguageRemoved = packageData.find(pkg => pkg.package === language?.package)
    if (isLanguageRemoved) i18n.deleteLang(store.lang)
  }

  function removeSearchItem(titlesToRemove: string[]) {
    const recentSearchesJson = localStorage.getItem('recent-searches')
    if (!recentSearchesJson) return
    const recentSearches: Array<{ path: string }> = JSON.parse(recentSearchesJson)
    const pathSet = new Set(titlesToRemove)
    const updatedSearches = recentSearches.filter(item => !pathSet.has(item.path))
    localStorage.setItem('recent-searches', JSON.stringify(updatedSearches))
  }

  return {
    tableActions,
    handleAction,
    getMessageTemplate,
    handlePackageRemove,
    removeSearchItem
  }
}
