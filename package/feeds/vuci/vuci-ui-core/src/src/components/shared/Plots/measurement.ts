import { type ManipulateType } from 'dayjs'
import { localDayjs } from './timeAndDateExtras'

export type MeasurementGeneric = Record<string, number | null>

export type RawMeasurement<T extends MeasurementGeneric> = { time: number; value: T }

export class Measurement<T extends MeasurementGeneric> {
  startTime: number
  endTime: number
  value: T
  isNow: boolean | undefined
  constructor(startTime: number, endTime: number, value: T, isNow?: boolean) {
    this.startTime = startTime
    this.endTime = endTime
    this.value = value
    this.isNow = isNow
  }
  get duration(): number {
    // Relative time goes in reverse
    return Math.abs(this.endTime - this.startTime)
  }
  get midTime(): number {
    return Math.round((this.startTime + this.endTime) / 2)
  }
  /**
   * @param isInteroperableMeasurement - use function isInteroperableMeasurement() to get it
   * @param period - period for interpolation.
   */
  getRate(key: keyof T, period: number | undefined, interpolate?: boolean): number | null {
    if (!interpolate || period === undefined || this.duration === 0) return this.value[key]
    const currValue = this.value[key]
    if (currValue === null) return currValue
    return (currValue / this.duration) * period
  }
}

/**
 * Used when mesurement is the change between data points
 */
export function convertRateMeasurement<T extends MeasurementGeneric>(data: RawMeasurement<T>[]): Measurement<T>[] {
  // Data must be sorted for successfull conversion
  const sortedData = data.sort((a, b) => a.time - b.time)
  function nullishSubstraction(a: number | null, b: number | null): number | null {
    if (a === null || b === null) return null
    return a - b
  }
  return Array.from({ length: sortedData.length - 1 }, (a, index) => {
    const start = sortedData[index]
    const end = sortedData[index + 1]
    const res = (Object.keys(start.value) as Array<keyof T>).map<[keyof T, number | null]>(key => [key, nullishSubstraction(end.value[key], start.value[key])])
    return new Measurement(start.time, end.time, Object.fromEntries(res) as T)
  })
}

/**
 * Used for data that already returns mesurement
 */
export function convertSimpleMeasurement<T extends MeasurementGeneric>(data: RawMeasurement<T>[]): Measurement<T>[] {
  // Data must be sorted for successfull conversion
  const sortedData = data.sort((a, b) => a.time - b.time)
  return sortedData.map(data => {
    const res = (Object.keys(data.value) as Array<keyof T>).map<[keyof T, number | null]>(key => [key, data.value[key]])
    return new Measurement(data.time, data.time, Object.fromEntries(res) as T)
  })
}

/**
 * Used for consistent tick data that can have gaps in data
 */
export function convertHistoricalMeasurement<T extends MeasurementGeneric>(data: RawMeasurement<T>[], tickUnit: ManipulateType, localTime: number, emptyValue: T): Measurement<T>[] {
  // Data must be sorted for successfull conversion
  const sortedData = data.sort((a, b) => a.time - b.time)
  const filledData: RawMeasurement<T>[] = []
  for (let i = localDayjs(sortedData[0].time).startOf(tickUnit); i <= localDayjs(localTime).startOf(tickUnit); i = i.add(1, tickUnit)) {
    // In teory there could be few data points for one tick but in practice it should never happen or only happen if mdcollect is turn off/on
    const existingMeasurement = sortedData.find(e => localDayjs(e.time).startOf(tickUnit).valueOf() === i.valueOf())
    filledData.push(existingMeasurement ?? { time: i.valueOf(), value: emptyValue })
  }
  return filledData.map((e, index, arr) => {
    const last = index + 1 === arr.length
    return new Measurement(localDayjs(e.time).startOf(tickUnit).valueOf(), last ? localTime : localDayjs(e.time).add(1, tickUnit).startOf(tickUnit).valueOf(), e.value, last)
  })
}
