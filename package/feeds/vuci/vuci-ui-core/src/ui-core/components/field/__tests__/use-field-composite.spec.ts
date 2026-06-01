import { it, describe, expect } from 'vitest'
import { useFieldComposite } from '../use-field-composite'
import { useField } from '../use-field'
import { createTestingPinia } from '@pinia/testing'
import { useFieldArray } from '../use-field-array'

describe('useFieldComposite', () => {
  it('should validate all fields', () => {
    createTestingPinia()
    const composite = useFieldComposite()
    const field1 = useField<string>({ name: 'field1', required: true, defaultValue: '' })
    const field2 = useField<string>({ name: 'field2', required: true, defaultValue: '' })
    const field3 = useField<string>({ name: 'field3', required: true, defaultValue: '' })
    composite.add(field1)
    composite.add(field2)
    composite.add(field3)
    expect(composite.valid.value).toBeTruthy()
    const validateSpies = [vi.spyOn(field1, 'validate'), vi.spyOn(field2, 'validate'), vi.spyOn(field3, 'validate')]
    expect(composite.validate()).toBeFalsy()
    expect(composite.valid.value).toBeFalsy()
    validateSpies.forEach(spy => expect(spy).toHaveBeenCalledOnce())
  })
  it('should return error messages in predicted structure', () => {
    createTestingPinia()
    const composite = useFieldComposite()
    const array = useFieldArray({ name: 'array' })
    const a0 = useField<string>({ name: 0, required: true, defaultValue: '' })
    const a1 = useField<string>({ name: 1, required: true, defaultValue: '' })
    array.add(a0)
    array.add(a1)
    const field1 = useField<string>({ name: 'field1', required: true, defaultValue: '' })
    const field2 = useField<string>({ name: 'field2', required: true, defaultValue: '' })
    const field3 = useField<string>({ name: 'field3', required: true, defaultValue: '' })
    composite.add(field1)
    composite.add(field2)
    composite.add(field3)
    composite.add(array)
    expect(composite.valid.value).toBeTruthy()
    const validateSpies = [vi.spyOn(field1, 'validate'), vi.spyOn(field2, 'validate'), vi.spyOn(field3, 'validate')]
    expect(composite.validate()).toBeFalsy()
    expect(composite.valid.value).toBeFalsy()
    validateSpies.forEach(spy => expect(spy).toHaveBeenCalledOnce())
    expect(composite.errors.value).toEqual({
      field1: ['Value is required'],
      field2: ['Value is required'],
      field3: ['Value is required'],
      array: {
        0: ['Value is required'],
        1: ['Value is required']
      }
    })
  })
})
