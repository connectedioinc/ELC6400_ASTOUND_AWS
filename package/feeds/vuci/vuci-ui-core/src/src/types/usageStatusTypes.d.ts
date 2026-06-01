export type SystemMemory = {
  ram_buffered: number
  ram_total: number
  ram_used: number
  flash_total: number
  ram_free: number
  flash_free: number
  flash_percentage: number
  flash_used: number
  ram_percentage: number
  ram_shared: number
}

export type SystemLoad = {
  min5: number
  min15: number
  min1: number
}

export type SystemMetrics = {
  memory: SystemMemory
  uptime: string
  loadavg: number
  localtime: number
  load: SystemLoad
  uptime_seconds: number
}
