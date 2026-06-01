import { reactive, ref } from 'vue'
import { useForm } from '../use-form'
import { describe, it, expect } from 'vitest'
import { useField } from '@ui-core/components/field/use-field'
import { useFieldObject } from '@ui-core/components/field/use-field-object'
import { useFieldArray } from '@ui-core/components/field/use-field-array'
import { createTestingPinia } from '@pinia/testing'

const defaultValues = {
  aa: 'aa',
  bb: 'bb'
}

describe('use-form', () => {
  describe('simple unit tests', () => {
    it('should contain expected properties (no form-context)', () => {
      const form = useForm({
        name: 'test',
        defaultValues,
        onSubmit: vi.fn()
      })
      expect(reactive(form)).toEqual(
        expect.objectContaining({
          modelValue: defaultValues,
          defaultValue: defaultValues,
          name: 'test',
          id: 'test',
          errors: {},
          disabled: false,
          changed: false,
          required: false,
          valid: true,
          touched: false,
          isSubmitting: false,
          isSubmitSuccessful: false
        })
      )
    })
    it('reset should reset to given default values and provided values', () => {
      const form = useForm({
        name: 'test',
        defaultValues,
        onSubmit: vi.fn()
      })
      form.setModelValue(prev => ({ ...prev, aa: 'new_aa' }))
      expect(form.modelValue.value).toEqual({
        aa: 'new_aa',
        bb: 'bb'
      })
      expect(form.defaultValue.value).toEqual(defaultValues)
      form.reset()
      expect(form.modelValue.value).toEqual(defaultValues)
      expect(form.defaultValue.value).toEqual(defaultValues)
      form.reset(currModel => ({ ...currModel, aa: 'new_aa' }))
      expect(form.modelValue.value).toEqual({
        aa: 'new_aa',
        bb: 'bb'
      })
      expect(form.defaultValue.value).toEqual({
        aa: 'new_aa',
        bb: 'bb'
      })
    })
  })
  describe('handleSubmit', () => {
    beforeEach(() => {
      createTestingPinia()
    })
    it('should set isSubmitting flag', async ({ expect }) => {
      const form = useForm({
        defaultValues: {
          enabled: '',
          name: 'test',
          last_name: 'something'
        }
      })
      expect(form.isSubmitting.value).toBeFalsy()
      const promise = form.handleSubmit()
      expect(form.isSubmitting.value).toBeTruthy()
      await promise
      expect(form.isSubmitting.value).toBeFalsy()
    })
    it('should invoke onSubmitInvalid when field validation does not pass', async ({ expect }) => {
      const onInvalid = vi.fn()
      const form = useForm({
        onSubmitInvalid: onInvalid,
        defaultValues: {
          enabled: '',
          name: 'test',
          last_name: 'something'
        }
      })
      useField({ name: 'enabled', required: true }, form)
      await form.handleSubmit()
      expect(form.isSubmitSuccessful.value).toBeFalsy()
      expect(onInvalid).toHaveBeenCalledWith({
        stage: 'field-validation',
        fieldErrors: {
          enabled: [expect.any(String)]
        }
      })
    })
    it('should invoke onSubmitInvalid when form validation does not pass', async ({ expect }) => {
      const validateSubmit = vi.fn(() => ({ form: 'You shall not pass!' }))
      const onSubmitInvalid = vi.fn()
      const form = useForm({
        validateSubmit,
        onSubmitInvalid,
        defaultValues: {
          enabled: true,
          name: 'test',
          last_name: 'something'
        }
      })
      await form.handleSubmit()
      expect(form.isSubmitSuccessful.value).toBeFalsy()
      expect(onSubmitInvalid).toHaveBeenCalledWith({
        stage: 'form-validation',
        formErrors: ['You shall not pass!']
      })
    })
    it('should invoke onSubmitInvalid when onSubmit handler throws an error', async ({ expect }) => {
      const onSubmitInvalid = vi.fn()
      const form = useForm({
        onSubmitInvalid,
        onSubmit: async () => {
          throw new Error('Something went wrong')
        },
        defaultValues: {
          enabled: true,
          name: 'test',
          last_name: 'something'
        }
      })
      try {
        await form.handleSubmit()
      } finally {
        expect(form.isSubmitSuccessful.value).toBeFalsy()
        expect(onSubmitInvalid).toHaveBeenCalledWith({
          stage: 'inflight',
          error: expect.any(Error)
        })
      }
    })
    it('should invoke onSubmit when all hooks pass', async ({ expect }) => {
      const onSubmitInvalid = vi.fn()
      const onSubmit = vi.fn()
      const form = useForm({
        onSubmitInvalid,
        onSubmit,
        defaultValues: {
          enabled: '1',
          name: 'test',
          last_name: 'something'
        }
      })
      useField({ name: 'enabled', required: true }, form)
      await form.handleSubmit()
      expect(onSubmit).toHaveBeenCalledWith({
        value: {
          enabled: '1',
          name: 'test',
          last_name: 'something'
        }
      })
      expect(form.isSubmitSuccessful.value).toBeTruthy()
      expect(onSubmitInvalid).not.toHaveBeenCalled()
    })
  })
  describe('getFormValue', () => {
    it('should include disabled values as emtpy strings', () => {
      const form = useForm({
        name: 'test',
        defaultValues: {},
        onSubmit: () => {}
      })
      useField({ defaultValue: 'hello', name: 'field1', disabled: true }, form)
      expect(form.getFormValue({ includeDisabled: true })).toEqual({ field1: '' })
    })
    it('should include only enabled values', () => {
      const form = useForm({
        name: 'test',
        defaultValues: {},
        onSubmit: () => {}
      })
      useField({ defaultValue: 'hello', name: 'field1', disabled: true }, form)
      useField({ defaultValue: 'field2-value', name: 'field2', disabled: false }, form)
      expect(form.getFormValue({ includeDisabled: false })).toEqual({ field2: 'field2-value' })
    })
    it('should include enabled value when another field of the same name is disabled', () => {
      const form = useForm({
        name: 'test',
        defaultValues: {},
        onSubmit: () => {}
      })
      useField({ defaultValue: 'hello', name: 'field1', disabled: true }, form)
      useField({ defaultValue: '/certificate/enabled', name: 'field1', disabled: false }, form)
      expect(form.getFormValue({ includeDisabled: true })).toEqual({ field1: '/certificate/enabled' })
    })
  })
  describe('reset', () => {
    it('should reset field values to the given output', () => {
      const form = useForm({
        name: 'test',
        defaultValues: {
          field1: 'default-value',
          field2: 'default-value2',
          objectField: { key: 'value' },
          arrayField: ['item1', 'item2']
        },
        onSubmit: () => {}
      })
      const field1 = useField({ name: 'field1', disabled: false }, form)
      const field2 = useField({ name: 'field2', disabled: false }, form)
      const objectField = useFieldObject({ name: 'objectField', disabled: false }, form)
      const arrayField = useFieldArray({ name: 'arrayField', disabled: false }, form)

      expect(field1.modelValue.value).toEqual('default-value')
      expect(field2.modelValue.value).toEqual('default-value2')

      expect(objectField.modelValue.value).toEqual({ key: 'value' })
      expect(arrayField.modelValue.value).toEqual(['item1', 'item2'])

      form.reset({ field1: 'new-value', field2: 'new-value2' })
      expect(form.modelValue.value).toEqual({ field1: 'new-value', field2: 'new-value2' })
      expect(field1.modelValue.value).toEqual('new-value')
      expect(field2.modelValue.value).toEqual('new-value2')
      expect(objectField.modelValue.value).toEqual(undefined)
      expect(arrayField.modelValue.value).toEqual(undefined)
    })
  })
})
