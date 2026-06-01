import { usePrompt } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { getCurrentScope } from 'vue'

export function checkIfInScope(name: string) {
  if (import.meta.env.DEV) {
    if (!getCurrentScope()) {
      console.warn(`${name} should only be used inside a running effect scope or "setup()" function. Otherwise the usage might lead to memory leaks.`)
    }
  }
}

export function showUnsavedPrompt(): Promise<boolean> {
  const $t = useTranslate()
  return usePrompt().show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => true,
    onCancel: () => false
  }) as Promise<boolean>
}

export function showDeletePrompt() {
  const $t = useTranslate()
  return usePrompt().show({
    title: $t('Delete this configuration?'),
    content: $t('This process cannot be undone.'),
    okText: $t('Delete'),
    cancelText: $t('Cancel'),
    onOk: () => true,
    onCancel: () => false
  }) as Promise<boolean>
}
