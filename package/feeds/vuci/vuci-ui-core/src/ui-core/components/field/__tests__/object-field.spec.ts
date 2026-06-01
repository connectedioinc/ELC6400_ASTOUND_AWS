import { describe, it, expect } from 'vitest'
import { useField } from '../use-field'
import { useFieldObject } from '../use-field-object'
import { nextTick, reactive, ref } from 'vue'
import type { ObjectFieldProps } from '../types'

const setupObject = <T extends Record<string, any>>(props: ObjectFieldProps<T>) => {
  const object = useFieldObject(props)
  const name = useField(
    {
      name: 'field0'
    },
    object
  )
  const age = useField(
    {
      name: 'field1'
    },
    object
  )
  return [object, name, age] as const
}

describe('objectControl field', () => {
  describe('props', () => {
    it.each([
      {
        props: { defaultValue: { name: 'test', age: 25 } },
        result: { defaultValue: { name: 'test', age: 25 }, modelValue: { name: 'test', age: 25 } }
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
      const field = useFieldObject(props)
      expect(reactive(field)).toEqual(expect.objectContaining(result))
    })
  })
  describe('changed', () => {
    const cases = [
      { defaultValue: { field0: 555, field1: 55 }, nextValue: { field0: 666, field1: 66 } },
      { defaultValue: { field0: 0, field1: 0 }, nextValue: { field0: 1, field1: 0 } },
      { defaultValue: { field0: 'aa', field1: 'bc' }, nextValue: { field0: 'aa', field1: 'cba' } },
      { defaultValue: { field0: true, field1: true }, nextValue: { field0: false, field1: false } }
    ]
    it.each(cases)('%#. should be truthy when value has changed', ({ defaultValue, nextValue }) => {
      const [objectControl] = setupObject({ defaultValue: defaultValue as any })
      expect(objectControl.changed.value).toBeFalsy()
      objectControl.setModelValue(nextValue as any)
      expect(objectControl.changed.value).toBeTruthy()
    })
    it.each(cases)('%#. should be falsy when value has changed to the same one', ({ defaultValue, nextValue }) => {
      const [objectControl] = setupObject({ defaultValue: defaultValue as any })
      expect(objectControl.changed.value).toBeFalsy()
      objectControl.setModelValue(nextValue as any)
      expect(objectControl.changed.value).toBeTruthy()
      objectControl.setModelValue(defaultValue as any)
      expect(objectControl.changed.value).toBeFalsy()
    })
    it.each(cases)('%#. should be falsy when value has been reset', ({ defaultValue, nextValue }) => {
      const [objectControl] = setupObject({ defaultValue: defaultValue as any })
      expect(objectControl.changed.value).toBeFalsy()
      objectControl.setModelValue(nextValue as any)
      expect(objectControl.changed.value).toBeTruthy()
      objectControl.setModelValue(defaultValue as any)
    })
  })
  describe('reset', () => {
    it('should reset to default value', async ({ expect }) => {
      const [objectControl, field0] = setupObject({ defaultValue: { field0: 'test', field1: 15 } })
      field0.setModelValue('newww_test')
      expect(field0.modelValue.value).toEqual('newww_test')
      expect(field0.changed.value).toBeTruthy()
      await nextTick()
      expect(objectControl.changed.value).toBeTruthy()
      expect(objectControl.modelValue.value).toEqual({ field0: 'newww_test', field1: 15 })
      objectControl.reset()
      await nextTick()
      expect(field0.modelValue.value).toEqual('test')
      expect(objectControl.changed.value).toBeFalsy()
      expect(objectControl.modelValue.value).toEqual({ field0: 'test', field1: 15 })
    })
    it('should reset to given value', async ({ expect }) => {
      const [objectControl, control0, control1] = setupObject({ defaultValue: { field0: 'test', field1: 15 } })
      control0.setModelValue('new_test')
      expect(control0.modelValue.value).toEqual('new_test')
      expect(control0.changed.value).toBeTruthy()
      await nextTick()
      expect(objectControl.changed.value).toBeTruthy()
      expect(objectControl.modelValue.value).toEqual({ field0: 'new_test', field1: 15 })
      objectControl.reset({ field0: 'other', field1: 69 })
      await nextTick()
      expect(control0.modelValue.value).toEqual('other')
      expect(control1.modelValue.value).toEqual(69)
      expect(objectControl.changed.value).toBeFalsy()
      expect(objectControl.modelValue.value).toEqual({ field0: 'other', field1: 69 })
    })
    it('should call reset with current modelValue value', async ({ expect }) => {
      const [objectControl, control0] = setupObject({ defaultValue: { field0: 10, field1: 20 } })
      control0.setModelValue(5555)
      expect(control0.modelValue.value).toEqual(5555)
      expect(objectControl.changed.value).toBeTruthy()
      await nextTick()
      objectControl.reset(prev => (prev ? { field0: prev.field0 + 1, field1: prev.field1 + 1 } : prev))
      await nextTick()
      expect(objectControl.modelValue.value).toEqual({ field0: 5556, field1: 21 })
      expect(objectControl.changed.value).toBeFalsy()
    })
  })
  describe('setModelValue', () => {
    it('should set model value of objectControl and children correctly (setting from parent)', async ({ expect }) => {
      const [objectControl, control0, control1] = setupObject({ defaultValue: { field0: 'test', field1: 15 } })
      objectControl.setModelValue({ field0: 'test', field1: 20 })
      await nextTick()
      expect(objectControl.modelValue.value).toEqual({ field0: 'test', field1: 20 })
      expect(control0.modelValue.value).toEqual('test')
      expect(control1.modelValue.value).toEqual(20)
    })
    it('should set model value of objectControl and children correctly (setting from child)', async ({ expect }) => {
      const [objectControl, control0, control1] = setupObject({ defaultValue: { field0: 'test', field1: 15 } })
      control0.setModelValue('new_test')
      control1.setModelValue(20)
      await nextTick()
      expect(objectControl.modelValue.value).toEqual({ field0: 'new_test', field1: 20 })
      expect(control0.modelValue.value).toEqual('new_test')
      expect(control1.modelValue.value).toEqual(20)
    })
  })
  it('child fields should have correct inputName', () => {
    const [objectControl, field0, field2] = setupObject({ name: 'person' })
    expect(objectControl.inputName.value).toEqual('person')
    expect(field0.inputName.value).toEqual('person.field0')
    expect(field2.inputName.value).toEqual('person.field1')
  })
  describe('setFieldValue', () => {
    it('should update children values as well')
    it('should be able to set field value when modelValue is undefined', () => {
      const objectControl = useFieldObject({
        name: 'person',
        defaultValue: {
          name: 'John',
          age: 30
        }
      })
      const nameField = useField({ name: 'name' }, objectControl)
      const ageField = useField({ name: 'age' }, objectControl)
      expect(nameField.modelValue.value).toEqual('John')
      expect(ageField.modelValue.value).toEqual(30)
    })
  })
})
