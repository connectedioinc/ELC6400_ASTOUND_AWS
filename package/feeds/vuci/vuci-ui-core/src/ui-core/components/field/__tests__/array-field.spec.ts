import { describe, it, expect } from 'vitest'
import { useField } from '../use-field'
import { useFieldArray } from '../use-field-array'
import { nextTick, reactive } from 'vue'
import type { ArrayFieldProps } from '../types'

const setupList = <T extends any[]>(props: ArrayFieldProps<T>) => {
  const list = useFieldArray<T>(props)
  const field0 = useField(
    {
      name: 0
    },
    list
  )
  const field1 = useField(
    {
      name: 1
    },
    list
  )
  return [list, field0, field1] as const
}

describe('list field', () => {
  describe('props', () => {
    it.each([
      {
        props: { defaultValue: [55, 60] },
        result: { defaultValue: [55, 60], modelValue: [55, 60] }
      },
      {
        props: { name: 'test' },
        result: { name: 'test', inputName: 'test' }
      },
      {
        props: {},
        result: { readonly: false, disabled: false, required: false, touched: false, changed: false, valid: true, errors: {} }
      }
    ])('%#. should have predicted state on init', ({ props, result }) => {
      const field = useFieldArray(props)
      expect(reactive(field)).toEqual(expect.objectContaining(result))
    })
  })
  describe('changed', () => {
    const cases = [
      { defaultValue: [555, 55], nextValue: [666, 66] },
      { defaultValue: [0, 0], nextValue: [1, 0] },
      { defaultValue: ['aa', 'abc'], nextValue: ['aa', 'cba'] },
      { defaultValue: [true, true], nextValue: [false, false] }
    ]
    it.each(cases)('%#. should be truthy when value has changed', ({ defaultValue, nextValue }) => {
      const [list] = setupList({ defaultValue })
      expect(list.changed.value).toBeFalsy()
      list.setModelValue(nextValue as any)
      expect(list.changed.value).toBeTruthy()
    })
    it.each(cases)('%#. should be falsy when value has changed to the same one', ({ defaultValue, nextValue }) => {
      const [list] = setupList({ defaultValue })
      expect(list.changed.value).toBeFalsy()
      list.setModelValue(nextValue as any)
      expect(list.changed.value).toBeTruthy()
      list.setModelValue(defaultValue as any)
      expect(list.changed.value).toBeFalsy()
    })
    it.each(cases)('%#. should be falsy when value has been reset', ({ defaultValue, nextValue }) => {
      const [list] = setupList({ defaultValue })
      expect(list.changed.value).toBeFalsy()
      list.setModelValue(nextValue as any)
      expect(list.changed.value).toBeTruthy()
      list.setModelValue(defaultValue as any)
    })
  })
  describe('reset', () => {
    it('should reset to default value', async ({ expect }) => {
      const [list, field0] = setupList({ defaultValue: [0, 1] })
      field0.setModelValue(5555)
      expect(field0.modelValue.value).toEqual(5555)
      expect(field0.changed.value).toBeTruthy()
      await nextTick()
      expect(list.changed.value).toBeTruthy()
      expect(list.modelValue.value).toEqual([5555, 1])
      list.reset()
      await nextTick()
      expect(field0.modelValue.value).toEqual(0)
      expect(list.changed.value).toBeFalsy()
      expect(list.modelValue.value).toEqual([0, 1])
    })
    it('should reset to given value', async ({ expect }) => {
      const [list, field0, field1] = setupList({ defaultValue: [0, 1] })
      field0.setModelValue(5555)
      expect(field0.modelValue.value).toEqual(5555)
      expect(field0.changed.value).toBeTruthy()
      await nextTick()
      expect(list.changed.value).toBeTruthy()
      expect(list.modelValue.value).toEqual([5555, 1])
      list.reset([15, 69])
      await nextTick()
      expect(field0.modelValue.value).toEqual(15)
      expect(field1.modelValue.value).toEqual(69)
      expect(list.changed.value).toBeFalsy()
      expect(list.modelValue.value).toEqual([15, 69])
    })
    it('should call reset with current modelValue value', async ({ expect }) => {
      const [list, field0] = setupList({ defaultValue: [0, 15] as [number, number] })
      field0.setModelValue(5555)
      expect(field0.modelValue.value).toEqual(5555)
      expect(list.changed.value).toBeTruthy()
      await nextTick()
      list.reset(prev => (prev ? [prev[0] + 1, prev[1] + 1] : [0, 0]))
      await nextTick()
      expect(list.modelValue.value).toEqual([5556, 16])
      expect(list.changed.value).toBeFalsy()
    })
  })
  describe('setModelValue', () => {
    it('should set model value of list and children correctly (setting from parent)', async ({ expect }) => {
      const [list, field0, field1] = setupList({ defaultValue: [0, 1] })
      list.setModelValue([10, 20])
      await nextTick()
      expect(list.modelValue.value).toEqual([10, 20])
      expect(field0.modelValue.value).toEqual(10)
      expect(field1.modelValue.value).toEqual(20)
    })
    it('should set model value of list and children correctly (setting from child)', async ({ expect }) => {
      const [list, field0, field1] = setupList({ defaultValue: [0, 1] })
      field0.setModelValue(10)
      field1.setModelValue(20)
      await nextTick()
      expect(list.modelValue.value).toEqual([10, 20])
      expect(field0.modelValue.value).toEqual(10)
      expect(field1.modelValue.value).toEqual(20)
    })
  })
  it('child fields should have correct inputName', () => {
    const [list, field0, field2] = setupList({ name: 'list' })
    expect(list.inputName.value).toEqual('list')
    expect(field0.inputName.value).toEqual('list[0]')
    expect(field2.inputName.value).toEqual('list[1]')
  })
  it('should be able to set modelValue to undefined', () => {
    const arrayField = useFieldArray({ defaultValue: [], name: 'array' })
    const field1 = useField({ name: 0, defaultValue: '123' }, arrayField)
    const field2 = useField({ name: 1, defaultValue: '321' }, arrayField)
    const field3 = useField<string>({ name: 2, defaultValue: '999' }, arrayField)
    expect(arrayField.modelValue.value).toEqual(['123', '321', '999'])
    arrayField.setModelValue(undefined)
    expect(arrayField.modelValue.value).toEqual(undefined)
    expect(field1.modelValue.value).toEqual(undefined)
    expect(field2.modelValue.value).toEqual(undefined)
    expect(field3.modelValue.value).toEqual(undefined)
  })
  describe('setFieldValue', () => {
    it('should throw error if key is not a number', () => {
      const arrayField = useFieldArray({ defaultValue: [], name: 'array' })
      expect(() => arrayField.setFieldValue('test', '456')).toThrowError()
    })
    it('should be able to setFieldValue when modelValue is undefined', () => {
      const arrayField = useFieldArray({ defaultValue: [], name: 'array' })
      arrayField.setModelValue(undefined)
      expect(() => arrayField.setFieldValue(1, '456')).not.toThrowError()
      expect(arrayField.modelValue.value).toEqual([undefined, '456'])
    })
    it('should be able to setFieldValue when modelValue is defined', () => {
      const arrayField = useFieldArray({ defaultValue: ['123', '321', '999'], name: 'array' })
      expect(arrayField.modelValue.value).toEqual(['123', '321', '999'])
      expect(() => arrayField.setFieldValue(1, '456')).not.toThrowError()
      expect(arrayField.modelValue.value).toEqual(['123', '456', '999'])
    })
  })
})
