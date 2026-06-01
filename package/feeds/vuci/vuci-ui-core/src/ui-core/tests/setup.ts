import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

interface CustomMatchers<R> {
  /**
   * shorthand of writing
   * ```ts
   * // this
   * expect(some).toEqual(expect.arrayContaining([expect.objectContaining({})]))
   * // is the same as below:
   * expect(some).toContainMatching({})
   * ```
   */
  toContainMatching: (received: any) => R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers<any> {}
}

expect.extend({
  toContainMatching<T>(received: T[], expected: Partial<T>) {
    const { printExpected, printReceived } = this.utils as any
    const expectedKeys = Object.keys(expected) as (keyof T)[]
    return {
      pass: received.some(item => expectedKeys.every(key => item[key] === expected[key])),
      message: () => `Expected\n${printExpected(received)}\nto contain matching item:\n ${printReceived(expected)}`
    }
  }
})
