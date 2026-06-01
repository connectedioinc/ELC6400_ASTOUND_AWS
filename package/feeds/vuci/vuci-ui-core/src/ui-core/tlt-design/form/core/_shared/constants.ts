import type { InjectionKey, Ref } from 'vue'

export const KEY_VALID = Symbol('valid') as InjectionKey<Ref<boolean>>
export const KEY_WARNING = Symbol('warning') as InjectionKey<Ref<boolean>>
export const KEY_ITEM_ID = Symbol('item_id') as InjectionKey<string>
export const KEY_ELEMENT_ID = Symbol('element_id') as InjectionKey<string>
export const KEY_MIN_LEN = Symbol('minlength') as InjectionKey<Ref<number>>
export const KEY_MAX_LEN = Symbol('maxlength') as InjectionKey<Ref<number>>
