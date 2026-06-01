import { describe, vi, it, expect } from 'vitest'
import { dedupe } from '../promises'

describe('promises.ts', () => {
  describe('dedupe', () => {
    it('dedupes promises with same primitive', async () => {
      const sleepNR = vi.fn((num: number) => new Promise<number>(resolve => setTimeout(() => resolve(num), 100)))
      const dedupedSleepNr = dedupe(sleepNR)

      const a = dedupedSleepNr(69)
      const b = dedupedSleepNr(69)
      expect(sleepNR).toHaveBeenCalledTimes(1)
      expect(a).toEqual(b)
      dedupedSleepNr(71)
      expect(sleepNR).toHaveBeenCalledTimes(2)
    })
    it('dedupes promises with more arguments', async () => {
      const sleepNR = vi.fn((num: number, num2: number) => new Promise<number>(resolve => setTimeout(() => resolve(num + num2), 100)))
      const dedupedSleepNr = dedupe(sleepNR)

      dedupedSleepNr(69, 6)
      dedupedSleepNr(69, 6)
      expect(sleepNR).toHaveBeenCalledTimes(1)
      dedupedSleepNr(69, 7)
      expect(sleepNR).toHaveBeenCalledTimes(2)
    })
  })
})
