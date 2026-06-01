import { axios } from '@ui-core/plugins/axios'
import { isNumber } from '@ui-core/utils/inspect'

type FileDragEvent = DragEvent & { dataTransfer: DataTransfer }

export function isFileDragEvent(event: DragEvent): event is FileDragEvent {
  const target = event.target as Element | undefined
  if (!event.dataTransfer) return !!target && 'files' in target
  return event.dataTransfer.types.some(t => t === 'Files' || t === 'application/x-moz-file')
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

export type SizeUnit = (typeof SIZE_UNITS)[number]

export type ConvertFileSizeOptions = {
  /**
   * to what size unit the size number should be converted to.
   * If auto, the size will be converted to the largest unit that is more than 1 and less than given precision.
   * @default 'auto'
   */
  unit?: SizeUnit | 'auto'
  /**
   * The unit system to use for calculations.
   * - "binary": Uses 1024 as the base (e.g., 1 KiB = 1024 bytes)
   * - "decimal": Uses 1000 as the base (e.g., 1 KB = 1000 bytes)
   * @default 'binary'
   */
  unitSystem?: 'binary' | 'decimal'
}

/**
 * converts given byte size to a given unit size and returns the final value and unit that it was converted to.
 */
export function convertFileSize(sizeBytes: number, options: ConvertFileSizeOptions = {}) {
  const { unit = 'auto', unitSystem = 'binary' } = options
  if (sizeBytes <= 0) return { unit: unit === 'auto' ? 'B' : unit, value: 0 }
  const factor = unitSystem === 'binary' ? 1024 : 1000
  const unitIndex = unit === 'auto' ? Math.floor(Math.log(sizeBytes) / Math.log(factor)) : SIZE_UNITS.indexOf(unit)
  const unitMultiplier = Math.pow(factor, unitIndex)
  return {
    unit: SIZE_UNITS[unitIndex],
    value: sizeBytes / unitMultiplier
  }
}
const stringSizeRE = /^(\d+)(B|KB|MB|GB)?$/
const matchSizeUnits = ['B', 'KB', 'MB', 'GB']

export const convertStringToBytes = (value: string): number => {
  const match = value.match(stringSizeRE)
  if (!match) throw new Error(`Invalid size string: ${value}`)
  const [, size, unit] = match
  const power = unit ? Math.pow(1024, matchSizeUnits.indexOf(unit)) : 1
  return parseInt(size) * power
}

export function createFormData(data: Record<string, any>): FormData {
  const formData = new FormData()
  Object.entries(data)
    // make sure file is the last item, it's just a limitation of our API
    .sort((a, b) => {
      if (a[1] instanceof File) return 1
      if (b[1] instanceof File) return -1
      return 0
    })
    .forEach(([key, value]) => {
      formData.append(key, value)
    })
  return formData
}

export type UploadController = {
  /**
   * executes the upload request
   */
  execute: (options: ExecuteOptions) => Promise<{ data: { path: string } }>
  /**
   * cancels currently active upload
   */
  cancel: () => void
  /**
   * returns the current upload abort controller which can be used to cancel the upload
   */
  controller: () => AbortController | undefined
  /**
   * indicates whether the last upload request has been cancelled
   */
  isCancelled: () => boolean
}

type ExecuteOptions = {
  url: string
  data: FormData
  onProgress: (event: { progress: number }) => void
}

export function createUploadController(): UploadController {
  let controller: AbortController | undefined
  async function execute(options: ExecuteOptions) {
    controller = new AbortController()
    return axios
      .post(options.url, options.data, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'json',
        onUploadProgress: event => {
          if (!isNumber(event.progress)) return
          options.onProgress({ progress: Math.floor(event.progress * 100) })
        }
      })
      .finally(() => {
        controller = undefined
      })
  }
  return {
    execute,
    cancel: () => {
      if (!controller) return
      controller.abort('Cancelled by user')
    },
    controller: () => controller,
    isCancelled: () => controller?.signal.aborted ?? false
  }
}
