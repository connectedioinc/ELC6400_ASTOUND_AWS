import { reactive, ref } from 'vue'
import { useForm } from '../use-form'
import { useFormController } from '../use-form-controller'
import { describe, it, expect, vi } from 'vitest'
import { useField } from '@ui-core/components/field/use-field'
import { createTestingPinia } from '@pinia/testing'

describe('use-form-controller', () => {
  it('should create a form collection', () => {
    const controller = useFormController({
      onSubmit: () => {},
      onSubmitInvalid: () => {}
    })
    const form = useForm({
      name: 'test',
      readonly: false,
      onSubmit: () => {},
      onSubmitInvalid: () => {}
    })
    controller.add(form)
    expect(reactive(controller)).toEqual(
      expect.objectContaining({
        forms: expect.arrayContaining([expect.any(Object)]),
        valid: true,
        changed: false,
        readonly: false,
        touched: false,
        isSubmitting: false,
        isSubmitSuccessful: false
      })
    )
  })
  describe('handleSubmit', () => {
    it('should invoke onSubmitInvalid when at least one form field is not valid', async ({ expect }) => {
      createTestingPinia()
      const onSubmit = vi.fn()
      const onSubmitInvalid = vi.fn()
      const controller = useFormController({
        onSubmit,
        onSubmitInvalid
      })
      const form1 = useForm({ name: '1' })
      useField({ name: 'name', defaultValue: '', required: false }, form1)
      useField({ name: 'age', defaultValue: '', required: true }, form1)
      const form2 = useForm({ name: '2' })
      useField({ name: 'address', defaultValue: '', required: true }, form2)
      controller.add(form1)
      controller.add(form2)
      await controller.handleSubmit()
      expect(onSubmitInvalid).toHaveBeenCalledWith({
        stage: 'field-validation',
        forms: expect.objectContaining({
          1: expect.any(Object),
          2: expect.any(Object)
        })
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("should invoke onSubmitInvalid when controller's validateSubmit returns errors", async ({ expect }) => {
      const validateSubmit = vi.fn(() => 'At least one form must be name "test"')
      const onSubmit = vi.fn()
      const onSubmitInvalid = vi.fn()
      const controller = useFormController({
        onSubmit,
        onSubmitInvalid,
        validateSubmit
      })
      const form1 = useForm({ name: '1' })
      controller.add(form1)
      await controller.handleSubmit()
      expect(onSubmitInvalid).toHaveBeenCalledWith({
        stage: 'controller-validation',
        error: expect.any(String)
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })
    it('should invoke onSubmitInvalid when at least one form validateSubmit returns errors', async ({ expect }) => {
      const onSubmit = vi.fn()
      const onSubmitInvalid = vi.fn()
      const controller = useFormController({
        onSubmit,
        onSubmitInvalid
      })
      controller.add(useForm({ name: 'test', validateSubmit: () => ({ form: 'error' }) }))
      await controller.handleSubmit()
      expect(onSubmitInvalid).toHaveBeenCalledWith({
        stage: 'form-validation',
        forms: {
          test: expect.objectContaining({
            formErrors: ['error']
          })
        }
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })
    it("should invoke onSubmitInvalid when controller's onSubmit throws error", async ({ expect }) => {
      const onSubmitInvalid = vi.fn()
      const controller = useFormController({
        onSubmit: async () => {
          throw new Error('Something went wrong')
        },
        onSubmitInvalid
      })
      controller.add(useForm({ name: 'test', defaultValues: { test: 'value' } }))
      try {
        await controller.handleSubmit()
      } finally {
        expect(onSubmitInvalid).toHaveBeenCalledWith({
          stage: 'inflight',
          error: expect.any(Error)
        })
      }
    })
    it('should invoke onSubmit when nothing is invalid', async ({ expect }) => {
      const validateSubmit = vi.fn()
      const onSubmit = vi.fn()
      const onSubmitInvalid = vi.fn()
      const controller = useFormController({
        onSubmit,
        onSubmitInvalid,
        validateSubmit
      })
      controller.add(useForm({ name: 'test', defaultValues: { test: 'value' } }))
      controller.add(useForm({ name: 'rest', defaultValues: { api: '123' } }))
      await controller.handleSubmit()
      expect(onSubmitInvalid).not.toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledWith([
        expect.objectContaining({
          data: {
            test: 'value'
          },
          form: expect.any(Object)
        }),
        expect.objectContaining({
          data: {
            api: '123'
          },
          form: expect.any(Object)
        })
      ])
    })
  })
  it('sets given form value', () => {
    const onSubmit = vi.fn()
    const onSubmitInvalid = vi.fn()

    const controller = useFormController({
      onSubmit,
      onSubmitInvalid
    })
    const form = useForm({
      name: 'form-name',
      readonly: false,
      defaultValues: { name: 'John Doe', address: '123 Main St' },
      onSubmit: () => {},
      onSubmitInvalid: () => {}
    })
    controller.add(form)
    expect(form.modelValue.value).toEqual({
      name: 'John Doe',
      address: '123 Main St'
    })
    controller.setFormValue('form-name', { name: 'Jane Doe', address: '456 Elm St' })
    expect(form.modelValue.value).toEqual({
      name: 'Jane Doe',
      address: '456 Elm St'
    })
  })
})
