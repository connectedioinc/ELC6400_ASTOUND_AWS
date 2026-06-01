import { i18n } from '@ui-core/plugins/i18n'

export const useTranslate = (): ((text: string) => string) => {
  return i18n.t
}

export const useI18n = () => {
  return i18n
}
