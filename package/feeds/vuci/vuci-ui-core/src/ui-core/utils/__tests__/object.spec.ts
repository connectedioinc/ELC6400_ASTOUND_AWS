import { it, describe, expect } from 'vitest'
import { pick, omit, dereference, isSuperset, isSubset } from '../object'

describe('object.ts', () => {
  describe('pick', () => {
    let obj: Record<string, any>
    beforeEach(() => {
      obj = { a: 1, b: 2, c: 3, d: 4 }
    })
    it('should pick properties provided as an array', () => {
      const picked = pick(obj, ['a', 'c'])
      expect(picked).toEqual({ a: 1, c: 3 })
    })
    it('should pick properties provided as a string', () => {
      const picked = pick(obj, 'a')
      expect(picked).toEqual({ a: 1 })
    })
    it('should pick properties that only match predicate function', () => {
      const picked = pick(obj, (_, value) => value % 2 === 0)
      expect(picked).toEqual({ b: 2, d: 4 })
    })
  })
  describe('omit', () => {
    let obj: Record<string, any>
    beforeEach(() => {
      obj = { a: 1, b: 2, c: 3, d: 4 }
    })
    it('should omit properties provided as an array', () => {
      const result = omit(obj, ['a', 'c'])
      expect(result).toEqual({ b: 2, d: 4 })
    })
    it('should omit properties provided as a string', () => {
      const result = omit(obj, 'a')
      expect(result).toEqual({ b: 2, c: 3, d: 4 })
    })
    it('should omit properties that only match predicate function', () => {
      const result = omit(obj, (_, value) => value % 2 === 0)
      expect(result).toEqual({ a: 1, c: 3 })
    })
  })
  describe('dereference', () => {
    it('should dereference object with complex properties', () => {
      const object = {
        a: new File([new Uint16Array(16)], 'test'),
        b: new Date(),
        c: 'adasd',
        d: 55,
        e: ['abc', 'def'],
        f: {
          a: '123',
          b: {
            c: '456'
          }
        }
      }
      const result = dereference(object)
      expect(result).toEqual(object)
      expect(result).not.toBe(object)
      expect(result.a).not.toBe(object.a)
      expect(result.b).not.toBe(object.b)
      expect(result.c).not.toBe(object.d)
      expect(result.e).not.toBe(object.e)
      expect(result.f).not.toBe(object.f)
      expect(result.f.b).not.toBe(object.f.b)
    })
  })
  describe('isSuperset', () => {
    it('should return true if the first object is a superset of the second', () => {
      expect(isSuperset([1, 2, 3, 4], [1, 2])).toBeTruthy()
    })
    it('should return false if the first object is not a superset of the second', () => {
      expect(isSuperset([1, 2], [1, 2, 3, 4])).toBeFalsy()
    })
  })
  describe('isSubset', () => {
    it('should return true if the first object is a subset of the second', () => {
      expect(isSubset({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 })).toBeTruthy() // true
      expect(isSubset([1, 2], [1, 2, 3, 4])).toBeTruthy() // true
    })
    it('should return false if the first object is not a subset of the second', () => {
      expect(isSubset({ a: 1, b: 2 }, { a: 1, b: 3 })).toBeFalsy()
      expect(isSubset([1, 2, 6], [1, 2, 3, 4])).toBeFalsy()
    })
  })
})
