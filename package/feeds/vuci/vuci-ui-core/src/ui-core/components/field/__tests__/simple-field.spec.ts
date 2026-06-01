import { describe, it, vi, expect } from 'vitest'
import { useField } from '../use-field'
import { reactive } from 'vue'

describe('simple field', () => {
  describe('props', () => {
    it.each([
      {
        props: { defaultValue: 55 },
        result: { defaultValue: 55, modelValue: 55 }
      },
      {
        props: { name: 'test' },
        result: { name: 'test', inputName: 'test' }
      },
      {
        props: {},
        result: { readonly: false, disabled: false, required: false, touched: false, changed: false, valid: true, errors: [] }
      }
    ])('%#. should have predicted state on init', ({ props, result }) => {
      const field = useField(props)
      expect(reactive(field)).toEqual(expect.objectContaining(result))
    })
  })
  describe('setModelValue', () => {
    it('should change modelValue on setModelValue, set touched to true', () => {
      const field = useField<number>({ defaultValue: 555 })
      const validateSpy = vi.spyOn(field, 'validate')
      expect(validateSpy).not.toHaveBeenCalledOnce()
      field.setModelValue(4564)
      expect(field.modelValue.value).toEqual(4564)
      expect(field.touched.value).toBeTruthy()
    })
    it('should change modelValue on setModelValue, but not set touched to true', () => {
      const field = useField<number>({ defaultValue: 555 })
      const validateSpy = vi.spyOn(field, 'validate')
      expect(validateSpy).not.toHaveBeenCalledOnce()
      field.setModelValue(4564, { dontValidate: true })
      expect(field.modelValue.value).toEqual(4564)
      expect(field.touched.value).toBeFalsy()
    })
  })

  describe('changed', () => {
    it.each([
      { defaultValue: 555, nextValue: 666 },
      { defaultValue: 0, nextValue: 1 },
      { defaultValue: 'abc', nextValue: 'cba' },
      { defaultValue: true, nextValue: false }
    ])('%#. should be truthy when value has changed', ({ defaultValue, nextValue }) => {
      const field = useField({ defaultValue })
      expect(field.changed.value).toBeFalsy()
      field.setModelValue(nextValue)
      expect(field.changed.value).toBeTruthy()
    })
    it.each([
      { defaultValue: 555, nextValue: 666 },
      { defaultValue: 0, nextValue: 1 },
      { defaultValue: 'abc', nextValue: 'cba' },
      { defaultValue: true, nextValue: false }
    ])('%#. should be falsy when value has changed to the same one', ({ defaultValue, nextValue }) => {
      const field = useField({ defaultValue })
      expect(field.changed.value).toBeFalsy()
      field.setModelValue(nextValue)
      expect(field.changed.value).toBeTruthy()
      field.setModelValue(defaultValue)
      expect(field.changed.value).toBeFalsy()
    })
    it.each([
      { defaultValue: 555, nextValue: 666 },
      { defaultValue: 0, nextValue: 1 },
      { defaultValue: 'abc', nextValue: 'cba' },
      { defaultValue: true, nextValue: false }
    ])('%#. should be falsy when value has been reset', ({ defaultValue, nextValue }) => {
      const field = useField({ defaultValue })
      expect(field.changed.value).toBeFalsy()
      field.setModelValue(nextValue)
      expect(field.changed.value).toBeTruthy()
      field.setModelValue(defaultValue)
    })
  })
  describe('reset', () => {
    it('should reset to default value', () => {
      const field = useField<number>({ defaultValue: 69 })
      field.setModelValue(5555)
      expect(field.modelValue.value).toEqual(5555)
      expect(field.changed.value).toBeTruthy()
      field.reset()
      expect(field.modelValue.value).toEqual(69)
      expect(field.changed.value).toBeFalsy()
    })
    it('should reset to given value', () => {
      const field = useField<number>({ defaultValue: 69 })
      field.setModelValue(5555)
      expect(field.modelValue.value).toEqual(5555)
      expect(field.changed.value).toBeTruthy()
      field.reset(79)
      expect(field.modelValue.value).toEqual(79)
      expect(field.changed.value).toBeFalsy()
    })
    it('should call reset with current modelValue value', () => {
      const field = useField<number>({ defaultValue: 69 })
      field.setModelValue(5555)
      expect(field.modelValue.value).toEqual(5555)
      expect(field.changed.value).toBeTruthy()
      field.reset(prev => prev! + 1)
      expect(field.modelValue.value).toEqual(5556)
      expect(field.changed.value).toBeFalsy()
    })
  })
})
