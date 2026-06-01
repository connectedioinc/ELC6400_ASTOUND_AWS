export interface MemoryStatus {
  flash_free: number
  flash_total: number
  flash_used: number
  flash_percentage: number
  ram_free: number
  ram_total: number
  ram_used: number
  ram_percentage: number
  ram_shared: number
  ram_buffered: number
}

export type FlashStatus = Pick<MemoryStatus, 'flash_free' | 'flash_total' | 'flash_used' | 'flash_percentage'>
