import { computed, shallowRef } from 'vue'
import type { CompositeFieldError, FieldError, FieldMeta } from './types'

type UseFieldCompositeOptions = {
  onAdd?: <T extends FieldMeta>(item: T) => void
}

export function useFieldComposite<NameType extends string | number = string | number>(options: UseFieldCompositeOptions = {}) {
  const children = shallowRef<FieldMeta<any, NameType, FieldError | CompositeFieldError<any>>[]>([])
  const changed = computed(() => children.value.some(child => child.changed.value))
  const errors = computed<CompositeFieldError<any>>(() => {
    const invalid = children.value.filter(child => !child.valid.value).map(c => [c.name.value!, c.errors.value])
    return Object.fromEntries(invalid)
  })
  const valid = computed(() => children.value.every(child => child.valid.value))
  const touched = computed(() => children.value.some(child => child.touched.value))

  function add(newChild: FieldMeta<any, any, any>) {
    options.onAdd?.(newChild)
    const sameId = children.value.some(child => child.id === newChild.id)
    if (sameId) {
      console.warn('Child with same ID already exists, it will be replaced')
      remove(newChild.id)
    }
    // TODO implement assertion at type level
    children.value = [...children.value, newChild as any]
    return () => remove(newChild.id)
  }

  function remove(id: string | number) {
    children.value = children.value.filter(child => child.id !== id)
  }

  function validate() {
    for (const child of children.value) {
      child.validate()
    }
    return valid.value
  }

  function clearErrors() {
    children.value.forEach(child => child.clearErrors())
  }
  return {
    children,
    changed,
    touched,
    valid,
    validate,
    clearErrors,
    errors,
    add,
    remove
  }
}
