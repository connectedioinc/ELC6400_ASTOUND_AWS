import { expect } from 'vitest'
import { arrayAt, structuredClone } from './polyfills'

describe('arrayAt', () => {
  it('should return the element at the given index', () => {
    const array = [1, 2, 3, 4, 5]
    expect(arrayAt.call(array, 2)).toBe(3)
  })

  it('should return the element at the negative index', () => {
    const array = [1, 2, 3, 4, 5]
    expect(arrayAt.call(array, -1)).toBe(5)
  })

  it('should return undefined for out of bounds index', () => {
    const array = [1, 2, 3, 4, 5]
    expect(arrayAt.call(array, 10)).toBeUndefined()
  })
})

describe('structuredClone', () => {
  it('should clone a simple object', () => {
    const obj = { a: 1, b: 2 }
    const clonedObj = structuredClone(obj)
    expect(clonedObj).toEqual(obj)
    expect(clonedObj).not.toBe(obj)
  })

  it('should clone a nested object', () => {
    const obj = { a: 1, b: { c: 2 } }
    const clonedObj = structuredClone(obj)
    expect(clonedObj).toEqual(obj)
    expect(clonedObj.b).toEqual(obj.b)
    expect(clonedObj.b).not.toBe(obj.b)
  })

  it('should clone an array', () => {
    const arr = [1, 2, { a: 3 }]
    const clonedArr = structuredClone(arr)
    expect(clonedArr).toEqual(arr)
    expect(clonedArr).not.toBe(arr)
    expect(clonedArr[2]).toEqual(arr[2])
    expect(clonedArr[2]).not.toBe(arr[2])
  })

  it('should return primitives as is', () => {
    expect(structuredClone(1)).toBe(1)
    expect(structuredClone('string')).toBe('string')
    expect(structuredClone(null)).toBe(null)
  })

  it('should clone an object with functions', () => {
    const obj = {
      a: 1,
      b: function () {
        return 2
      },
      c: () => 3
    }
    const clonedObj = structuredClone(obj)
    expect(clonedObj.a).toBe(obj.a)
    expect(typeof clonedObj.b).toBe('function')
    expect(clonedObj.b()).toBe(obj.b())
    expect(typeof clonedObj.c).toBe('function')
    expect(clonedObj.c()).toBe(obj.c())
  })

  it('should clone an object with nested functions', () => {
    const obj = {
      a: 1,
      b: {
        c: function () {
          return 2
        },
        d: () => 3
      }
    }
    const clonedObj = structuredClone(obj)
    expect(clonedObj.a).toBe(obj.a)
    expect(typeof clonedObj.b.c).toBe('function')
    expect(clonedObj.b.c()).toBe(obj.b.c())
    expect(typeof clonedObj.b.d).toBe('function')
    expect(clonedObj.b.d()).toBe(obj.b.d())
  })
})
