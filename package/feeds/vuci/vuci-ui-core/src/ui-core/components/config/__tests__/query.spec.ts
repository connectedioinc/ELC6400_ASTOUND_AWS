import { it, describe, expect } from 'vitest'
import { hashKey } from '../query/utils'

describe('query', () => {
  it('array should be hashed to the same key', () => {
    const array1 = [1, { a: true, b: false }]
    const array2 = [1, { b: false, a: true }]
    expect(hashKey(array1)).toBe(hashKey(array2))
    expect(hashKey(array1)).toBe('[1,{"a":true,"b":false}]')
  })
})
