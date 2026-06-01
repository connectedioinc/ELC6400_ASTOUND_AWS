import { inject, provide } from 'vue'
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'

export const ACCORDION_VALUE = Symbol('accordion_context') as InjectionKey<MaybeRefOrGetter<string[]>>
const ACCORDION_SET = Symbol('setter_fn') as InjectionKey<(value: string) => void>
export const ITEM_ID = Symbol('item_id') as InjectionKey<string>
export const IS_EXPANDED = Symbol('is_expanded') as InjectionKey<Ref<boolean>>

export function createAccordionContext(value: MaybeRefOrGetter<string[]>, setterFn: (value: string) => void) {
  provide(ACCORDION_VALUE, value)
  provide(ACCORDION_SET, setterFn)
}

export function useAccordionContext() {
  return {
    toggleValue: inject(ACCORDION_SET)!,
    value: inject(ACCORDION_VALUE)!,
    itemId: inject(ITEM_ID, null),
    isExpanded: inject(IS_EXPANDED, null)
  }
}
