import type { Icon } from '@ui-core/tlt-design/icons/icon-types'

export interface BaseProps<T> {
  placeholderPrefix?: boolean
  placeholder?: string
  icon?: Icon
  iconRight?: Icon
  disabled?: boolean
  readonly?: boolean
  name?: string
  modelValue: T
}
