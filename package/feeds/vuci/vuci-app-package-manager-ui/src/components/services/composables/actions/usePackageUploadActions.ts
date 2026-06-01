import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { axios, type ApiResponse } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { brand } from '@ui-core/plugins/brand'
import { usePackageFollowUpActions } from './usePackageFollowUpActions'
import type { PackageData, PromptContext, PackageActions } from '@/types/packageTypes'

export function usePackageUploadActions(
  emit: (event: string, ...args: any[]) => void,
  handleModalClose: (success: boolean) => void,
  setPromptContext: (actionName: string, extraData?: Record<string, any>, errorCode?: number) => void
) {
  const $t = useTranslate()
  const store = useMainStore()
  const message = useMessages()

  const { getFollowUpAction } = usePackageFollowUpActions()

  const uploadPackages: PackageActions = {
    upload: () => ({
      prompt: {
        title: $t('Upload package')
      }
    }),
    uploadInstall: promptContext => ({
      prompt: {
        title: $t("Package '%s' was successfully uploaded!").format(promptContext?.packageName),
        submitText: promptContext?.verified ? $t('Install') : $t('Install anyway'),
        installText: promptContext?.verified
          ? $t("Click 'Install' to start the installation process.")
          : $t('This package is not digitally signed and authorized by %s and may not be safe to install.').format(brand.text('company')),
        submitAction: () => handlePackageInstall(promptContext || {})
      }
    }),
    uploadError: promptContext => ({
      prompt: {
        title: $t("Could not install '%s' package.").format(promptContext?.packageName),
        submitText: $t('Back to upload'),
        submitAction: () => emit('update-prompt-context', { actionName: 'upload' }),
        icon: 'error',
        isConfirmCard: true
      }
    })
  }

  function handlePackageInstall(promptContext: PromptContext) {
    store.spin($t('Installing package'))
    return axios
      .post('/api/package_manager/actions/install_package', { data: { package: promptContext?.package || '', custom: '1' } })
      .then(({ data }: ApiResponse<PackageData>) => {
        emit('package-installed', data)
        message.success($t('Package installed successfully'))
        const followUpAction = promptContext ? getFollowUpAction(promptContext) : null
        if (!followUpAction) return handleModalClose(false)
        setPromptContext(followUpAction)
      })
      .catch(err => {
        const errorCode = err?.response?.data?.errors?.[0]?.code || ''
        setPromptContext('uploadError', promptContext, errorCode)
      })
      .finally(() => {
        store.spin(false)
      })
  }

  return {
    uploadPackages,
    handlePackageInstall
  }
}
