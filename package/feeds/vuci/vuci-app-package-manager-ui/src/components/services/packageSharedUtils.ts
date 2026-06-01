import { useTranslate } from '@ui-core/composables/useI18n'
import { usePackageConstants } from './composables/usePackageConstants'
import type { PackageData } from '@/types/packageTypes'

const $t = useTranslate()
const { packageTypes } = usePackageConstants()

export function getActionErrorTranslate(error: number, component: string) {
  const packageErrorTranslates: { [key: number]: string; default: string } = {
    1: $t('Invalid %s.').format(component === 'download' ? $t('package') : $t('file')),
    2: $t('The package is already installed with same or higher version.'),
    3: $t('The package is not compatible with this device.'),
    4: $t('The package is not compatible with this device firmware.'),
    5: $t('Not enough space to install package.'),
    6: $t('Package installation failed.'),
    7: $t('Installation service is busy. Please try again later.'),
    8: $t('Missing uploaded package data.'),
    12: $t('Package upgrade failed.'),
    13: $t('Failed to delete package, because this package is dependent on other packages.'),
    14: $t('Theme is being used in landing page as current theme and cannot be removed.'),
    15: $t('Failed to delete the package.'),
    17: $t('Package already installed.'),
    18: $t('This package update is not available.'),
    19: $t('Unexpected error.'),
    default: component === 'download' ? $t('Package installation failed. Check your internet connection or try to update package list.') : $t('Package installation failed.')
  }
  return packageErrorTranslates[error] || packageErrorTranslates.default
}

export function isUpgradeFailed(pkg: PackageData) {
  return pkg.type === packageTypes.ERRORED && !!pkg.upgrade
}
