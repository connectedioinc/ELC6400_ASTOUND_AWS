// @vitest-environment happy-dom
import { convertFileSize, convertStringToBytes, createFormData } from '../upload-utils'

describe('upload-utils', () => {
  it.each([
    { size: 0, unitSystem: 'decimal', expected: { value: 0, unit: 'B' } },
    { size: 1024, unitSystem: 'decimal', expected: { value: 1.024, unit: 'KB' } },
    { size: 1024, unitSystem: 'binary', expected: { value: 1, unit: 'KB' } },
    { size: 1024 ** 2, unitSystem: 'decimal', expected: { value: 1.048576, unit: 'MB' } },
    { size: 1024 ** 2, unitSystem: 'binary', expected: { value: 1, unit: 'MB' } },
    { size: 1024 ** 3, unitSystem: 'decimal', expected: { value: 1.073741824, unit: 'GB' } },
    { size: 1024 ** 3, unitSystem: 'binary', expected: { value: 1, unit: 'GB' } }
  ])('%#. should convert file size to the expected format', ({ size, expected, unitSystem }) => {
    const result = convertFileSize(size, { unit: 'auto', unitSystem: unitSystem as any })
    expect(result).toEqual(expected)
  })
  it.each([
    { size: 0, unitSystem: 'binary', unit: 'auto', expected: { value: 0, unit: 'B' } },
    { size: 0, unitSystem: 'binary', unit: 'KB', expected: { value: 0, unit: 'KB' } },
    { size: 1024, unitSystem: 'binary', unit: 'KB', expected: { value: 1, unit: 'KB' } },
    { size: 1024 ** 2, unitSystem: 'binary', unit: 'KB', expected: { value: 1024, unit: 'KB' } },
    { size: 1024 ** 3, unitSystem: 'binary', unit: 'KB', expected: { value: 1048576, unit: 'KB' } }
  ])('%#. should return the same unit when unit is specified', ({ size, unitSystem, unit, expected }) => {
    const result = convertFileSize(size, { unit: unit as any, unitSystem: unitSystem as any })
    expect(result).toEqual(expected)
  })
  it.each([
    { input: '10KB', output: 10 * 1024 },
    { input: '10MB', output: 10 * 1024 * 1024 },
    { input: '10B', output: 10 },
    { input: '10GB', output: 10 * 1024 * 1024 * 1024 * 1024 }
  ])('%#. should convert string size to bytes', () => {
    const result = convertStringToBytes('10MB')
    expect(result).toEqual(10 * 1024 * 1024)
  })
  it('createFormData should convert object to FormData and the last key is always file', () => {
    const toConvert = { options: ['cba'], file: new File([''], 'test.txt'), option: 'abc' }
    const formData = createFormData(toConvert)
    expect(formData).toBeInstanceOf(FormData)
    // toStrictEqual to match the correct order of keys
    expect([...formData.keys()]).toStrictEqual(['options', 'option', 'file'])
  })
  it('createFormData should not change order of non-file options', () => {
    const toConvert = { c: ['cba'], b: 'abc', a: 6 }
    const formData = createFormData(toConvert)
    // toStrictEqual to match the correct order of keys
    expect([...formData.keys()]).toStrictEqual(['c', 'b', 'a'])
  })
})
