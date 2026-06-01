import { composeId, getId } from '@ui-core/utils/core-utils'
import { isArray, isNullish } from '@ui-core/utils/inspect'
import { useToggle } from '@vueuse/core'
import type { MaybeRef, MaybeRefOrGetter, Ref, ToRefs } from 'vue'
import { computed, isReactive, reactive, ref, toRef, toRefs, toValue } from 'vue'

export type SelectOption<T = any> = {
  value: T
  textContent: string
  disabled?: boolean
}

export type UseSelectProps<T> = {
  required?: boolean
  readonly?: boolean
  disabled?: boolean
  id?: string
  /**
   * allow selecting multiple values
   * @default false
   */
  multiple?: boolean
  options: SelectOption<T>[]
}

export type UseSelectReturn<T> = ReturnType<typeof useSelect<T>>

export const DATA_LISTBOX_ITEM = 'data-listbox-item'

export function useSelect<T>(model: Ref<T | Array<T>>, props: MaybeRefOrGetter<UseSelectProps<T>>) {
  const parts = reactive({
    trigger: null as null | HTMLElement,
    listbox: null as null | HTMLElement
  })
  const propsRef = toRef(() => toValue(props))
  const [isOpen, setIsOpen] = useToggle(false)
  const options = toRef(() => toValue(props).options)

  const stableId = getId()
  const triggerId = computed(() => propsRef.value.id || stableId)
  const listboxId = computed(() => composeId(triggerId.value, 'listbox'))
  const activeDescendant = ref<HTMLElement | undefined>()

  function setListboxEl(element: HTMLElement | null) {
    parts.listbox = element
  }
  function setTriggerEl(element: HTMLElement | null) {
    parts.trigger = element
  }

  const isEmptyModelValue = computed(() => {
    if (propsRef.value.multiple && isArray(model.value)) return model.value?.length === 0
    return isNullish(model.value)
  })

  const selectedOptions = computed<SelectOption[]>(() => {
    if (isArray(model.value)) {
      return model.value.map(value => options.value.find(ov => ov.value === value)).filter(Boolean) as SelectOption[]
    }
    return [options.value.find(v => v.value === model.value)].filter(Boolean) as SelectOption[]
  })

  function open() {
    setIsOpen(true)
  }
  function close() {
    setIsOpen(false)
  }
  const optionMap = ref(new Map<HTMLElement, SelectOption>())

  function registerOption(element: HTMLElement, option: SelectOption) {
    optionMap.value.set(element, option)
    return () => {
      optionMap.value.delete(element)
    }
  }

  function onValueChange(value: T) {
    if (propsRef.value.multiple) {
      const array = isArray(model.value) ? [...model.value] : []
      const currIndex = array.findIndex(i => i === value)
      if (currIndex !== -1) array.splice(currIndex, 1)
      else array.push(value)
      model.value = array
    } else {
      model.value = value
    }
  }

  function focusTrigger() {
    if (parts.trigger) parts.trigger.focus()
  }

  function focusListbox() {
    if (parts.listbox) parts.listbox.focus()
  }

  function getListboxItems(includeDisabled: boolean = false) {
    const listboxEl = parts.listbox
    if (!listboxEl) {
      console.error('No listbox element is present.')
      return []
    }
    const items = Array.from(listboxEl.querySelectorAll(`[${DATA_LISTBOX_ITEM}]`))
    if (includeDisabled) return items as HTMLElement[]
    return items.filter(i => (i as HTMLElement).dataset.disabled !== '') as HTMLElement[]
  }

  type DeltaOrIndex =
    | {
        index: number
        delta?: never
      }
    | { delta: number; index?: never }
  function focusOption(options: DeltaOrIndex) {
    const tryFocus = (item: HTMLElement) => {
      return handleElementFocus(item)
    }
    const items = getListboxItems()
    if (!items.length) {
      throw new Error('No items retrieved')
    }
    if (options.index !== undefined) {
      const item = items.at(options.index)
      if (!item) return
      return tryFocus(item)
    }
    const currIndex = items.indexOf(activeDescendant.value!)
    if (currIndex < 0) {
      return focusOption({ index: 0 })
    }
    const index = clamp(currIndex + options.delta, 0, items.length - 1)
    tryFocus(items[index])
  }

  function handleElementFocus(el: HTMLElement) {
    el.focus()
    activeDescendant.value = el
    scrollToElement(el)
  }

  function getScrollOptionCandidate() {
    if (multiple.value || !model.value) return activeDescendant.value
    const active = Array.from(optionMap.value.entries()).find(([, option]) => option.value === model.value)
    return active?.[0]
  }

  function scrollToElement(element = activeDescendant.value) {
    if (!element || !getListboxItems().includes(element)) return false
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return true
  }

  function isSelected(value: T) {
    return isArray(model.value) ? model.value.includes(value) : model.value === value
  }

  const { multiple, disabled, readonly, required } = withDefaults<UseSelectProps<any>>(propsRef.value, { required: false, readonly: false, disabled: false, multiple: false, id: getId() })

  return {
    /**
     * scrolls to provided element if present in listbox. Returns true, if scrolled, false if no active element was present.
     */
    scrollToElement,
    getScrollOptionCandidate,
    handleElementFocus,
    focusTrigger,
    focusListbox,
    focusOption,
    /**
     * currently active element
     */
    activeDescendant,
    triggerId,
    listboxId,
    /**
     * whether the select is open.
     */
    isOpen,
    /**
     * function to open select
     */
    open,
    /**
     * function to close select
     */
    close,
    /**
     * current value of the select
     */
    model,
    /**
     * all available options of the select (custom and predefined in one place)
     */
    options,
    /**
     * handler to invoke on value selection
     */
    onValueChange,
    /**
     * function to check if an option is selected
     */
    isSelected,
    /**
     * computed property that returns true if model is empty value
     */
    isEmptyModelValue,
    selectedOptions,
    setListboxEl,
    setTriggerEl,
    multiple,
    disabled,
    readonly,
    required,
    registerOption,
    optionMap,
    ...toRefs(parts)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K
}[keyof T]

// Identify keys that are optional (by excluding required keys from all keys)
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>

// Transform optional properties to be required and allow undefined
type OptionalOnly<T> = {
  [K in OptionalKeys<T>]-?: T[K] | undefined
}

function withDefaults<T extends Record<string, any>>(reactiveObj: MaybeRef<T>, defaults: OptionalOnly<T>): ToRefs<Required<T>> {
  const aRefs = toRefs(isReactive(reactiveObj) ? reactiveObj : reactive(reactiveObj)) as ToRefs<T>
  const aKeys = Object.keys(aRefs)
  const bKeys = Object.keys(defaults).filter(bKey => !aKeys.includes(bKey))
  const refEntries = bKeys.reduce(
    (refs, bKey) => {
      refs[bKey] = ref((defaults as Record<string, any>)[bKey])
      return refs
    },
    aRefs as Record<string, Ref<any>>
  )
  return refEntries as ToRefs<Required<T>>
}
