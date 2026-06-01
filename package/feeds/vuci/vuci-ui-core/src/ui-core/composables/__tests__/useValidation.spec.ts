import { describe, it } from 'vitest'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useValidation, lazyValidator as lv } from '../useValidation'
import { nextTick, ref } from 'vue'

describe('useValidation', () => {
  beforeAll(() => {
    setActivePinia(createTestingPinia())
  })
  describe('Supports undefined values', () => {
    it.each([[null], [undefined], [''], [0], [1], [[undefined]], [[null]], [[0]], [[1]]])('does not fail when value is %s', v => {
      const { valid, errors } = useValidation(v, { rules: [lv.no_prefix('bad')] })
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
  })
  describe('Value is array', () => {
    it('should validate non-reactive value', () => {
      const { valid, errors } = useValidation(['bad-prefix'], { rules: [lv.no_prefix('bad')] })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toContainEqual(expect.objectContaining({ message: expect.any(String) }))
    })
    it('should validate reactive value', async ({ expect }) => {
      const value = ref([''])
      const { valid, errors } = useValidation(value, { rules: [lv.no_prefix('bad')] })
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
      value.value = ['bad-prefix']
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
    })
    it('should work with required:true', async ({ expect }) => {
      const value = ref([''])
      const { valid, errors } = useValidation(value, { required: true })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = ['some-value']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with minlength', async ({ expect }) => {
      const value = ref(['s'])
      const { valid, errors } = useValidation(value, { minlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Minimum length of single value is 3.' }))
      value.value = ['some-value']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with maxlength', async ({ expect }) => {
      const value = ref(['123456'])
      const { valid, errors } = useValidation(value, { maxlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Maximum length of single value is 3.' }))
      value.value = ['123']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with different min and max lengths', async ({ expect }) => {
      const value = ref(['a'])
      const { valid, errors } = useValidation(value, { maxlength: 5, minlength: 2 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Minimum length of single value is 2.' }))
      value.value = ['123456']
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Maximum length of single value is 5.' }))
      value.value = ['12345']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with same min and max lengths', async ({ expect }) => {
      const value = ref(['123456'])
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of single value entry must be 3.' }))
      value.value = ['123']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('validation rules should work with both min/max lengths and required', async ({ expect }) => {
      const value = ref([''])
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3, required: true })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      // required validation bails, meaning it will return only failed required validation message at first.
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = ['1234']
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of single value entry must be 3.' }))
      value.value = ['123']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with min/max lengths, required and validation rules', async ({ expect }) => {
      const value = ref([''])
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3, required: true, rules: [lv.no_prefix('123')] })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      // required validation bails, meaning it will return only failed required validation message at first.
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = ['1234']
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(2)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of single value entry must be 3.' }))
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value with no leading "123" is accepted.' }))
      value.value = ['val']
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
  })
  describe('Value is string', () => {
    it('should validate non-reactive value', () => {
      const { valid, errors } = useValidation('bad-prefix', { rules: [lv.no_prefix('bad')] })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toContainEqual(expect.objectContaining({ message: expect.any(String) }))
    })
    it('should validate reactive value', async ({ expect }) => {
      const value = ref('')
      const { valid, errors } = useValidation(value, { rules: [lv.no_prefix('bad')] })
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
      value.value = 'bad-prefix'
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
    })
    it('should work with required:true', async ({ expect }) => {
      const value = ref('')
      const { valid, errors } = useValidation(value, { required: true })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = 'some-value'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with minlength', async ({ expect }) => {
      const value = ref('a')
      const { valid, errors } = useValidation(value, { minlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Minimum length of value is 3.' }))
      value.value = 'some-value'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with maxlength', async ({ expect }) => {
      const value = ref('123456')
      const { valid, errors } = useValidation(value, { maxlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Maximum length of value is 3.' }))
      value.value = '123'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with different min and max lengths', async ({ expect }) => {
      const value = ref('a')
      const { valid, errors } = useValidation(value, { maxlength: 5, minlength: 2 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Minimum length of value is 2.' }))
      value.value = '123456'
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Maximum length of value is 5.' }))
      value.value = '12345'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with same min and max lengths', async ({ expect }) => {
      const value = ref('123456')
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3 })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of the value must be 3.' }))
      value.value = '123'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('validation rules should work with both min/max lengths and required', async ({ expect }) => {
      const value = ref('')
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3, required: true })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      // required validation bails, meaning it will return only failed required validation message at first.
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = '1234'
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of the value must be 3.' }))
      value.value = '123'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
    it('should work with min/max lengths, required and validation rules', async ({ expect }) => {
      const value = ref('')
      const { valid, errors } = useValidation(value, { maxlength: 3, minlength: 3, required: true, rules: [lv.no_prefix('123')] })
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(1)
      // required validation bails, meaning it will return only failed required validation message at first.
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value is required' }))
      value.value = '1234'
      await nextTick()
      expect(valid.value).toBeFalsy()
      expect(errors.value).toHaveLength(2)
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Length of the value must be 3.' }))
      expect(errors.value).toContainEqual(expect.objectContaining({ message: 'Value with no leading "123" is accepted.' }))
      value.value = 'val'
      await nextTick()
      expect(valid.value).toBeTruthy()
      expect(errors.value).toHaveLength(0)
    })
  })
})
