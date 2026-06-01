import { shallowRef, type Ref } from 'vue'

export type UseGroupToggleReturn<T = unknown> = ReturnType<typeof useGroupToggle<T>>

export function useGroupToggle<T = any>(modelValue: Ref<T[] | undefined> = shallowRef([])) {
  const select = (newValue: T) => {
    const array = modelValue.value ?? []
    modelValue.value = [...array, newValue]
  }
  const deselect = (newValue: T) => {
    if (!modelValue.value) return
    modelValue.value = modelValue.value.filter(v => v !== newValue)
  }
  const isSelected = (value: T) => {
    if (!modelValue.value) return false
    return modelValue.value.includes(value)
  }

  function toggle(value: T) {
    if (!modelValue.value || !modelValue.value.includes(value)) select(value)
    else deselect(value)
  }
  return {
    select,
    deselect,
    toggle,
    /** same model as passed into as the initialValue. Might want to use this, if nothing was passed in */
    model: modelValue,
    isSelected
  }
}
