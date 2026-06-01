import { Measurement, type RawMeasurement, convertRateMeasurement, convertHistoricalMeasurement, convertSimpleMeasurement } from '@/components/shared/Plots/measurement'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

describe('measurement.ts', () => {
  setActivePinia(createTestingPinia())
  describe('Mesurement class', () => {
    it('returns duration', () => {
      expect(new Measurement(100, 150, {}).duration).toEqual(50)
    })
    it('returns midTime', () => {
      expect(new Measurement(100, 150, {}).midTime).toEqual(125)
    })
    it('returns rate when mesurement can be interpolated using time', () => {
      expect(new Measurement(100, 150, { rx: 1000 }, true).getRate('rx', 100, true)).toEqual(2000)
    })
    it('returns rate when mesurement can not be interpolated using time', () => {
      expect(new Measurement(100, 150, { rx: 1000 }).getRate('rx', 100, false)).toEqual(1000)
    })
  })
  it('converts mesurement when mesurement is the change between data points', () => {
    const rawData: RawMeasurement<{ tx_sum: number | null }>[] = [
      { time: 0, value: { tx_sum: 0 } },
      { time: 1500, value: { tx_sum: 175 } },
      { time: 1000, value: { tx_sum: 150 } },
      { time: 1750, value: { tx_sum: 300 } },
      { time: 2000, value: { tx_sum: null } },
      { time: 2400, value: { tx_sum: 100 } },
      { time: 3000, value: { tx_sum: 200 } }
    ]
    expect(convertRateMeasurement(rawData)).toEqual([
      new Measurement(0, 1000, { tx_sum: 150 }),
      new Measurement(1000, 1500, { tx_sum: 25 }),
      new Measurement(1500, 1750, { tx_sum: 125 }),
      new Measurement(1750, 2000, { tx_sum: null }),
      new Measurement(2000, 2400, { tx_sum: null }),
      new Measurement(2400, 3000, { tx_sum: 100 })
    ])
  })
  it('converts mesurement when data already returns mesurement', () => {
    const rawData: RawMeasurement<{ quality: number }>[] = [
      { time: 0, value: { quality: 75 } },
      { time: 1500, value: { quality: 45 } },
      { time: 1000, value: { quality: 13 } },
      { time: 1750, value: { quality: 95 } }
    ]
    expect(convertSimpleMeasurement(rawData)).toEqual([
      new Measurement(0, 0, { quality: 75 }),
      new Measurement(1000, 1000, { quality: 13 }),
      new Measurement(1500, 1500, { quality: 45 }),
      new Measurement(1750, 1750, { quality: 95 })
    ])
  })
  it('converts mesurement when mesurement is from mdcollect', () => {
    const rawData: RawMeasurement<{ tx_rate: number }>[] = [
      { time: 0, value: { tx_rate: 100 } },
      { time: 1500, value: { tx_rate: 175 } },
      { time: 1000, value: { tx_rate: 150 } },
      { time: 2100, value: { tx_rate: 300 } }
    ]
    expect(convertHistoricalMeasurement(rawData, 'second', 3450, { tx_rate: 0 })).toEqual([
      new Measurement(0, 1000, { tx_rate: 100 }, false),
      new Measurement(1000, 2000, { tx_rate: 150 }, false),
      new Measurement(2000, 3000, { tx_rate: 300 }, false),
      new Measurement(3000, 3450, { tx_rate: 0 }, true)
    ])
  })
})
