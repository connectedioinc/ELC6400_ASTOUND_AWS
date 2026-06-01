import { inject, ref, computed, toValue } from 'vue'
import { KEY_ITEM_ID, KEY_VALID, KEY_WARNING, KEY_ELEMENT_ID, KEY_MIN_LEN, KEY_MAX_LEN } from './constants'

export const useCommonInjects = () => {
  const minlength = inject(KEY_MIN_LEN, ref(0))
  const maxlength = inject(KEY_MAX_LEN, ref(0))
  const valid = inject(KEY_VALID, ref(true))
  const warning = inject(KEY_WARNING, ref(false))
  const itemId = inject(KEY_ITEM_ID, undefined)
  const elementId = inject(KEY_ELEMENT_ID, undefined)
  const inputState = computed(() => (toValue(valid) ? (toValue(warning) ? 'warning' : 'valid') : 'error'))
  return { valid, warning, itemId, elementId, inputState, minlength, maxlength }
}
