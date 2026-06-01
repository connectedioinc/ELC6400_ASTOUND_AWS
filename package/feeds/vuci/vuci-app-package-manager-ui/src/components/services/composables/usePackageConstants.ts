import { useTranslate } from '@ui-core/composables/useI18n'

export function usePackageConstants() {
  const $t = useTranslate()

  const packageTypes = {
    UNKNOWN: 0,
    PENDING: 1,
    AVAILABLE: 2,
    INSTALLED: 3,
    PENDING_ERRORED: 4,
    INSTALLING: 5,
    UPDATING: 6,
    REMOVING: 7,
    ERRORED: 8,
    REMOVED: 9
  } as const

  const runningPackageTypes = [packageTypes.INSTALLING, packageTypes.UPDATING, packageTypes.REMOVING] as const

  const nonUpgradableTypes = [packageTypes.INSTALLED, packageTypes.AVAILABLE] as const

  const statusData = {
    [packageTypes.PENDING]: { text: $t('In queue'), color: 'bg-gray-400' },
    [packageTypes.AVAILABLE]: { text: $t('Available'), color: 'bg-theme-bg-info text-theme-text-on-info' },
    [packageTypes.INSTALLED]: { text: $t('Installed'), color: 'bg-theme-bg-success text-theme-text-on-success' },
    [packageTypes.PENDING_ERRORED]: { text: $t('Failed'), color: 'bg-theme-bg-danger text-theme-text-on-danger' },
    [packageTypes.INSTALLING]: { text: $t('Installing...'), color: 'bg-theme-bg-success-subtle text-theme-text-on-success-subtle' },
    [packageTypes.UPDATING]: { text: $t('Upgrading...'), color: 'bg-theme-bg-info-subtle text-theme-text-on-info-subtle' },
    [packageTypes.REMOVING]: { text: $t('Removing...'), color: 'bg-theme-bg-danger-subtle text-theme-text-on-danger-subtle' },
    [packageTypes.ERRORED]: { text: $t('Failed'), color: 'bg-theme-bg-danger text-theme-text-on-danger' }
  } as const

  return {
    packageTypes,
    runningPackageTypes,
    nonUpgradableTypes,
    statusData
  }
}
